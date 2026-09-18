const pool = require('../db');
const { logComplianceAction } = require('./audit-trail.service');

function serializeAuditState(row) {
  if (!row) {
    return null;
  }

  return {
    id: String(row.id),
    listingId: String(row.listing_id),
    fireSafetyScore: Number(row.fire_safety_score),
    cctvVerified: row.cctv_verified,
    wardenVerified: row.warden_verified,
    auditScore: Number(row.audit_score),
    expiryDate:
      row.expiry_date instanceof Date
        ? row.expiry_date.toISOString().slice(0, 10)
        : row.expiry_date,
    createdAt:
      row.created_at instanceof Date
        ? row.created_at.toISOString()
        : row.created_at,
  };
}

async function upsertLatestAudit(listingId, audit, actorId) {
  let client;

  try {
    client = await pool.connect();
    await client.query('BEGIN');

    const listingResult = await client.query(
      'SELECT id FROM listings WHERE id = $1',
      [listingId]
    );

    if (listingResult.rowCount === 0) {
      const error = new Error('Listing not found.');
      error.code = 'LISTING_NOT_FOUND';
      throw error;
    }

    const existingResult = await client.query(
      `SELECT *
       FROM compliance_audits
       WHERE listing_id = $1
       ORDER BY created_at DESC, id DESC
       LIMIT 1
       FOR UPDATE`,
      [listingId]
    );

    let result;
    let created = false;

    if (existingResult.rowCount > 0) {
      result = await client.query(
        `UPDATE compliance_audits
         SET fire_safety_score = $1,
             cctv_verified = $2,
             warden_verified = $3,
             audit_score = $4,
             expiry_date = $5
         WHERE id = $6
         RETURNING *`,
        [
          audit.fireSafetyScore,
          audit.cctvVerified,
          audit.wardenVerified,
          audit.auditScore,
          audit.expiryDate,
          existingResult.rows[0].id,
        ]
      );
    } else {
      created = true;
      result = await client.query(
        `INSERT INTO compliance_audits (
           listing_id,
           fire_safety_score,
           cctv_verified,
           warden_verified,
           audit_score,
           expiry_date
         )
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`,
        [
          listingId,
          audit.fireSafetyScore,
          audit.cctvVerified,
          audit.wardenVerified,
          audit.auditScore,
          audit.expiryDate,
        ]
      );
    }

    await logComplianceAction(client, {
      actorId,
      actionType: created ? 'compliance_audit.created' : 'compliance_audit.updated',
      targetListingId: listingId,
      previousState: created ? null : serializeAuditState(existingResult.rows[0]),
      newState: serializeAuditState(result.rows[0]),
    });

    await client.query('COMMIT');
    return { audit: result.rows[0], created };
  } catch (error) {
    if (client) {
      await client.query('ROLLBACK');
    }
    throw error;
  } finally {
    client?.release();
  }
}

async function findLatestAudit(listingId) {
  const listingResult = await pool.query(
    `SELECT
       l.id AS listing_id,
       l.title AS listing_title,
       a.id,
       a.fire_safety_score,
       a.cctv_verified,
       a.warden_verified,
       a.audit_score,
       a.expiry_date,
       a.created_at
     FROM listings l
     LEFT JOIN LATERAL (
       SELECT *
       FROM compliance_audits
       WHERE listing_id = l.id
       ORDER BY created_at DESC, id DESC
       LIMIT 1
     ) a ON TRUE
     WHERE l.id = $1`,
    [listingId]
  );

  if (listingResult.rowCount === 0) {
    return { listingFound: false, audit: null };
  }

  return {
    listingFound: true,
    audit: listingResult.rows[0].id ? listingResult.rows[0] : null,
    listing: {
      id: String(listingResult.rows[0].listing_id),
      title: listingResult.rows[0].listing_title,
    },
  };
}

module.exports = { upsertLatestAudit, findLatestAudit };





