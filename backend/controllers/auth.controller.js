const pool = require('../db');
const { getSupabaseClient } = require('../services/supabase');
const {
  isDevLoginEnabled,
  signLocalAccessToken,
} = require('../services/local-auth');

const SELF_SERVICE_ROLES = new Set(['tenant', 'landlord']);
const E164_PHONE_PATTERN = /^\+[1-9]\d{7,14}$/;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function maskPhone(phone) {
  return `${phone.slice(0, 3)}${'*'.repeat(phone.length - 6)}${phone.slice(-3)}`;
}

async function register(req, res) {
  const name = req.body.name?.trim();
  const email = req.body.email?.trim().toLowerCase();
  const role = req.body.role?.trim().toLowerCase();
  const phone = req.body.phone?.trim();

  if (!name || !email || !role || !phone) {
    return res.status(400).json({
      error: 'Name, email, role, and phone are required.',
    });
  }

  if (!EMAIL_PATTERN.test(email)) {
    return res.status(400).json({ error: 'A valid email is required.' });
  }

  if (!E164_PHONE_PATTERN.test(phone)) {
    return res.status(400).json({
      error: 'Phone must use E.164 format, for example +923001234567.',
    });
  }

  if (!SELF_SERVICE_ROLES.has(role)) {
    return res.status(400).json({
      error: 'Role must be either tenant or landlord.',
    });
  }

  try {
    const result = await pool.query(
      `INSERT INTO users (name, email, role, phone, masked_phone)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, name, email, role, phone, masked_phone, created_at`,
      [name, email, role, phone, maskPhone(phone)]
    );
    const user = result.rows[0];

    return res.status(201).json({
      user: {
        id: String(user.id),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        maskedPhone: user.masked_phone,
        phoneVerified: false,
        createdAt: user.created_at,
      },
      nextStep: 'Request and verify an SMS OTP.',
    });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'A user with these details already exists.' });
    }

    console.error('User registration failed:', error.message);
    return res.status(500).json({ error: 'Unable to register user.' });
  }
}

async function requestPhoneOtp(req, res) {
  const phone = req.body.phone?.trim();

  if (!phone || !E164_PHONE_PATTERN.test(phone)) {
    return res.status(400).json({
      error: 'A phone number in E.164 format is required.',
    });
  }

  try {
    const { error } = await getSupabaseClient().auth.signInWithOtp({ phone });

    if (error) {
      console.error('OTP request failed:', error.message);
      return res.status(400).json({ error: 'Unable to send verification code.' });
    }

    return res.status(202).json({
      message: 'If the phone number is eligible, a verification code has been sent.',
    });
  } catch (error) {
    console.error('OTP request failed:', error.message);
    return res.status(500).json({ error: 'Phone verification is unavailable.' });
  }
}

async function verifyPhoneOtp(req, res) {
  const phone = req.body.phone?.trim();
  const token = req.body.token?.trim();

  if (!phone || !E164_PHONE_PATTERN.test(phone) || !token) {
    return res.status(400).json({
      error: 'A valid phone number and verification token are required.',
    });
  }

  try {
    const { data, error } = await getSupabaseClient().auth.verifyOtp({
      phone,
      token,
      type: 'sms',
    });

    if (error || !data.session) {
      return res.status(401).json({ error: 'Invalid or expired verification code.' });
    }

    return res.json({
      message: 'Phone number verified successfully.',
      accessToken: data.session.access_token,
      refreshToken: data.session.refresh_token,
      expiresAt: data.session.expires_at,
      user: {
        id: data.user.id,
        phone: data.user.phone,
      },
    });
  } catch (error) {
    console.error('OTP verification failed:', error.message);
    return res.status(500).json({ error: 'Phone verification is unavailable.' });
  }
}

function serializeRegisteredUser(user) {
  return {
    id: String(user.id),
    name: user.name,
    email: user.email,
    role: user.role,
    phone: user.phone,
    maskedPhone: user.masked_phone,
    createdAt: user.created_at,
  };
}

async function login(req, res) {
  if (!isDevLoginEnabled()) {
    return res.status(404).json({
      error: 'Email login is disabled. Verify a phone OTP to receive a session token.',
    });
  }

  const email = req.body.email?.trim().toLowerCase();
  const phone = req.body.phone?.trim();

  if (!email && !phone) {
    return res.status(400).json({ error: 'Email or phone is required.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, phone, masked_phone, created_at
       FROM users
       WHERE ($1::text IS NOT NULL AND email = $1)
          OR ($2::text IS NOT NULL AND phone = $2)
       LIMIT 1`,
      [email || null, phone || null]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(401).json({ error: 'No matching Humdum profile was found.' });
    }

    const accessToken = signLocalAccessToken({
      sub: `local-${user.id}`,
      email: user.email,
      phone: user.phone,
      role: user.role,
    });

    return res.json({
      message: 'Development login issued a local session token.',
      accessToken,
      user: serializeRegisteredUser(user),
    });
  } catch (error) {
    console.error('Development login failed:', error.message);
    return res.status(500).json({ error: 'Unable to log in.' });
  }
}

async function me(req, res) {
  if (!req.user.profileId) {
    return res.status(404).json({ error: 'No Humdum profile is linked to this session.' });
  }

  try {
    const result = await pool.query(
      `SELECT id, name, email, role, phone, masked_phone, created_at
       FROM users
       WHERE id = $1`,
      [req.user.profileId]
    );
    const user = result.rows[0];

    if (!user) {
      return res.status(404).json({ error: 'User profile not found.' });
    }

    return res.json({ user: serializeRegisteredUser(user) });
  } catch (error) {
    console.error('Current user lookup failed:', error.message);
    return res.status(500).json({ error: 'Unable to load the current user.' });
  }
}

module.exports = { register, requestPhoneOtp, verifyPhoneOtp, login, me };
