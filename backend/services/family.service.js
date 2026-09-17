const crypto = require('crypto');
const pool = require('../db');

function serializeProfile(row, includeShareableToken = false) {
  return {
    id: String(row.id),
    userId: String(row.user_id),
    listingId: String(row.listing_id),
    student: {
      name: row.student_name,
      email: row.student_email,
      phone: row.student_phone,
    },
    emergencyContact: {
      name: row.emergency_contact_name,
      relationship: row.emergency_contact_relationship,
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

    if (!activeListingId) {
      const error = new Error('An active tenancy is required.');
      error.code = 'ACTIVE_TENANCY_REQUIRED';
      throw error;
    }

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
         secondary_guardian_phone,
         check_in_preferences,
         updated_at
       )
       VALUES ($1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9::jsonb, NOW())
       ON CONFLICT (user_id) WHERE user_id IS NOT NULL
       DO UPDATE SET
         listing_id = EXCLUDED.listing_id,
         generated_data = EXCLUDED.generated_data,
         emergency_contact_name = EXCLUDED.emergency_contact_name,
         emergency_contact_relationship = EXCLUDED.emergency_contact_relationship,
         guardian_phone = EXCLUDED.guardian_phone,
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
     INNER JOIN listings ON listings.id = family_profiles.listing_id
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

module.exports = { getFamilyProfile, upsertFamilyProfile };

