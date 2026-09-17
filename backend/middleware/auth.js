const pool = require('../db');
const { getSupabaseClient } = require('../services/supabase');

async function authenticate(req, res, next) {
  const authorization = req.get('authorization');
  const match = authorization?.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return res.status(401).json({
      error: 'A Bearer token is required.',
    });
  }

  let claims;

  try {
    const { data, error } = await getSupabaseClient().auth.getClaims(match[1]);
    claims = data?.claims;

    if (error || !claims?.sub) {
      return res.status(401).json({ error: 'Invalid or expired token.' });
    }
  } catch (error) {
    if (error.message.startsWith('SUPABASE_URL')) {
      console.error('Authentication configuration error:', error.message);
      return res.status(500).json({ error: 'Authentication is not configured.' });
    }

    console.error('Token verification failed:', error.message);
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }

  try {
    const profileResult = await pool.query(
      `SELECT id, role
       FROM users
       WHERE ($1::text IS NOT NULL AND email = $1)
          OR ($2::text IS NOT NULL AND phone = $2)
       LIMIT 1`,
      [claims.email || null, claims.phone || null]
    );
    const profile = profileResult.rows[0];

    req.user = {
      id: claims.sub,
      profileId: profile ? String(profile.id) : null,
      role: profile?.role || claims.app_metadata?.role || null,
      supabaseRole: claims.role || null,
      email: claims.email || null,
      phone: claims.phone || null,
    };

    return next();
  } catch (error) {
    console.error('Authentication profile lookup failed:', error.message);
    return res.status(503).json({
      error: 'Authentication profile service is temporarily unavailable.',
    });
  }
}

function authorizeRoles(allowedRoles) {
  if (!Array.isArray(allowedRoles)) {
    throw new TypeError('authorizeRoles requires an array of allowed roles.');
  }

  return (req, res, next) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'You do not have permission to access this resource.',
      });
    }

    return next();
  };
}

module.exports = { authenticate, authorizeRoles };
