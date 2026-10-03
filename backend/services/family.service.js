const crypto = require('crypto');
const pool = require('../db');
const {
  deriveCheckInState,
  isActiveSosStatus,
  normalizeOverdueHours,
} = require('./family-safety-policy.service');

function serializeProfile(row, includeShareableToken = false) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    listingId: row.listing_id ? String(row.listing_id) : null,
    student: {
      name: row.student_name,
      email: row.student_email,
      phone: row.student_phone,
    },
    emergencyContact: {
      name: row.emergency_contact_name,
      relationship: row.emergency_contact_relationship,
      email: row.guardian_email,
    },
    guardianPhones: {
      primary: row.guardian_phone,
      secondary: row.secondary_guardian_phone,
    },
    checkInPreferences: row.check_in_preferences,
    ...(includeShareableToken
      ? { shareableToken: row.shareable_token }
      : {}),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function resolveActiveTenancy(client, userId, listingId) {
  const values = [userId];
  let listingFilter = '';

  if (listingId) {
    values.push(listingId);
    listingFilter = 'AND tenancies.listing_id = $2';
  }

  const result = await client.query(
    `SELECT tenancies.listing_id
     FROM tenancies
     INNER JOIN listings ON listings.id = tenancies.listing_id
     WHERE tenancies.tenant_id = $1
       AND LOWER(tenancies.status) = 'active'
       ${listingFilter}
     ORDER BY tenancies.start_date DESC, tenancies.id DESC
     LIMIT 1`,
    values
  );

  return result.rows[0]?.listing_id || null;
}

async function upsertFamilyProfile(userId, input) {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const activeListingId = await resolveActiveTenancy(
      client,
      userId,
      input.listingId
    );

    const generatedData = {
      emergencyContactConfigured: true,
      guardianCount: input.secondaryGuardianPhone ? 2 : 1,
      checkInEnabled: input.checkInPreferences.enabled !== false,
      generatedAt: new Date().toISOString(),
    };
    const shareableToken = crypto.randomBytes(32).toString('hex');
    const result = await client.query(
      `INSERT INTO family_profiles (
         user_id,
         listing_id,
         shareable_token,
         generated_data,
         emergency_contact_name,
         emergency_contact_relationship,
         guardian_phone,
         guardian_email,
         secondary_guardian_phone,
         check_in_preferences,
         updated_at
       )
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10::jsonb, NOW())
       ON CONFLICT (user_id) WHERE user_id IS NOT NULL
       DO UPDATE SET
         listing_id = EXCLUDED.listing_id,
         generated_data = EXCLUDED.generated_data,
         emergency_contact_name = EXCLUDED.emergency_contact_name,
         emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
         guardian_phone = EXCLUDED.guardian_phone,
         guardian_email = EXCLUDED.guardian_email,
         secondary_guardian_phone = EXCLUDED.secondary_guardian_phone,
         check_in_preferences = EXCLUDED.check_in_preferences,
         updated_at = NOW()
       RETURNING *`,
      [
        userId,
        activeListingId,
        shareableToken,
        JSON.stringify(generatedData),
        input.emergencyContactName,
        input.emergencyContactRelationship,
        input.guardianPhone,
        input.guardianEmail,
        input.secondaryGuardianPhone,
        JSON.stringify(input.checkInPreferences),
      ]
    );

    const userResult = await client.query(
      'SELECT name, email, phone FROM users WHERE id = $1',
      [userId]
    );
    await client.query('COMMIT');

    return serializeProfile(
      {
        ...result.rows[0],
        student_name: userResult.rows[0].name,
        student_email: userResult.rows[0].email,
        student_phone: userResult.rows[0].phone,
      },
      true
    );
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client?.release();
  }
}

async function getFamilyProfile({ requestedUserId, actorId, actorRole }) {
  const result = await pool.query(
    `SELECT
       family_profiles.*,
       student.name AS student_name,
       student.email AS student_email,
       student.phone AS student_phone,
       listings.landlord_id,
       EXISTS (
         SELECT 1
         FROM tenancies
         WHERE tenancies.tenant_id = family_profiles.user_id
           AND tenancies.listing_id = family_profiles.listing_id
           AND LOWER(tenancies.status) = 'active'
       ) AS verified_tenancy
     FROM family_profiles
     INNER JOIN users student ON student.id = family_profiles.user_id
     LEFT JOIN listings ON listings.id = family_profiles.listing_id
     WHERE family_profiles.user_id = $1`,
    [requestedUserId]
  );

  if (result.rowCount === 0) {
    return { found: false };
  }

  const row = result.rows[0];
  const isSelf = String(actorId) === String(requestedUserId);
  const isAdmin = actorRole === 'admin';
  const isVerifiedLandlord =
    actorRole === 'landlord' &&
    row.verified_tenancy &&
    String(row.landlord_id) === String(actorId);

  if (!isSelf && !isAdmin && !isVerifiedLandlord) {
    return { found: true, authorized: false };
  }

  return {
    found: true,
    authorized: true,
    profile: serializeProfile(row, isSelf),
    accessReason: isSelf
      ? 'profile_owner'
      : isAdmin
        ? 'administrator'
        : 'verified_tenancy_landlord',
  };
}

function serializeCheckIn(row) {
  return {
    id: String(row.id),
    status: row.status,
    checkedInAt: row.checked_in_at,
    guardianNotifiedAt: row.guardian_notified_at,
  };
}

async function createCheckIn(userId) {
  const result = await pool.query(
    `INSERT INTO family_check_ins (user_id, status)
     VALUES ($1, 'confirmed')
     RETURNING id, status, checked_in_at, guardian_notified_at`,
    [userId]
  );
  return serializeCheckIn(result.rows[0]);
}

async function getCheckIns(userId) {
  const result = await pool.query(
    `SELECT id, status, checked_in_at, guardian_notified_at
     FROM family_check_ins
     WHERE user_id = $1
     ORDER BY checked_in_at DESC, id DESC
     LIMIT 50`,
    [userId]
  );
  return result.rows.map(serializeCheckIn);
}

function serializeSosAlert(row) {
  return {
    id: String(row.id),
    status: row.status,
    triggeredAt: row.triggered_at,
    acknowledgedAt: row.acknowledged_at || null,
    resolvedAt: row.resolved_at || null,
  };
}

async function getSafetyState(userId) {
  const [profileResult, checkInResult, sosResult] = await Promise.all([
    pool.query('SELECT check_in_preferences FROM family_profiles WHERE user_id = $1', [userId]),
    pool.query(
      `SELECT id, status, checked_in_at, guardian_notified_at
       FROM family_check_ins
       WHERE user_id = $1
       ORDER BY checked_in_at DESC, id DESC
       LIMIT 1`,
      [userId]
    ),
    pool.query(
      `SELECT id, status, triggered_at, acknowledged_at, resolved_at
       FROM sos_alerts
       WHERE user_id = $1 AND status IN ('triggered', 'acknowledged')
       ORDER BY triggered_at DESC, id DESC
       LIMIT 1`,
      [userId]
    ),
  ]);

  const latestRow = checkInResult.rows[0] || null;
  const overdueAfterHours = normalizeOverdueHours(profileResult.rows[0]?.check_in_preferences);
  return {
    latestCheckIn: latestRow ? serializeCheckIn(latestRow) : null,
    checkInState: deriveCheckInState(latestRow, overdueAfterHours),
    overdueAfterHours,
    activeSos: sosResult.rows[0] ? serializeSosAlert(sosResult.rows[0]) : null,
    sosState: sosResult.rows[0] && isActiveSosStatus(sosResult.rows[0].status) ? 'active' : 'none',
  };
}

async function createSosAlert(userId) {
  let client;
  try {
    client = await pool.connect();
    await client.query('BEGIN');
    await client.query(
      "SELECT pg_advisory_xact_lock(hashtextextended('sos:' || $1::text, 0))",
      [userId]
    );

    const profile = await client.query(
      'SELECT id FROM family_profiles WHERE user_id = $1',
      [userId]
    );
    if (profile.rowCount === 0) {
      const error = new Error('A guardian contact is required before sending SOS alerts.');
      error.code = 'GUARDIAN_REQUIRED';
      throw error;
    }

    const existing = await client.query(
      `SELECT id, status, triggered_at, acknowledged_at, resolved_at
       FROM sos_alerts
       WHERE user_id = $1 AND status IN ('triggered', 'acknowledged')
       ORDER BY triggered_at DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [userId]
    );
    if (existing.rowCount > 0) {
      await client.query('COMMIT');
      return { alert: serializeSosAlert(existing.rows[0]), created: false };
    }

    const result = await client.query(
      `INSERT INTO sos_alerts (user_id, status)
       VALUES ($1, 'triggered')
       RETURNING id, status, triggered_at, acknowledged_at, resolved_at`,
      [userId]
    );
    await client.query('COMMIT');
    return { alert: serializeSosAlert(result.rows[0]), created: true };
  } catch (error) {
    if (client) await client.query('ROLLBACK');
    throw error;
  } finally {
    client?.release();
  }
}

module.exports = {
  createCheckIn,
  createSosAlert,
  getCheckIns,
  getFamilyProfile,
  getSafetyState,
  upsertFamilyProfile,
};

