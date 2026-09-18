const crypto = require('crypto');
const pool = require('../db');

function canonicalize(value) {
  if (value instanceof Date) {
    return value.toISOString();
  }

  if (Array.isArray(value)) {
    return value.map(canonicalize);
  }

  if (value && typeof value === 'object') {
    return Object.keys(value)
      .sort()
      .reduce((result, key) => {
        result[key] = canonicalize(value[key]);
        return result;
      }, {});
  }

  return value;
}

function calculateRecordHash(entry) {
  const payload = JSON.stringify(canonicalize({
    actorId: String(entry.actorId),
    actionType: entry.actionType,
    targetListingId: String(entry.targetListingId),
    previousState: entry.previousState,
    newState: entry.newState,
    previousHash: entry.previousHash || null,
    createdAt: entry.createdAt,
  }));

  return crypto.createHash('sha256').update(payload, 'utf8').digest('hex');
}

async function logComplianceAction(client, entry) {
  await client.query('SELECT pg_advisory_xact_lock($1::bigint)', [
    entry.targetListingId,
  ]);

  const previousResult = await client.query(
    `SELECT record_hash
     FROM compliance_audit_logs
     WHERE target_listing_id = $1
     ORDER BY id DESC
     LIMIT 1`,
    [entry.targetListingId]
  );
  const previousHash = previousResult.rows[0]?.record_hash || null;
  const createdAt = new Date().toISOString();
  const recordHash = calculateRecordHash({
    ...entry,
    previousHash,
    createdAt,
  });

  const result = await client.query(
    `INSERT INTO compliance_audit_logs (
       admin_id,
       action_type,
       target_listing_id,
       previous_state,
       new_state,
       previous_hash,
       record_hash,
       created_at
     )
     VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6, $7, $8)
     RETURNING *`,
    [
      entry.actorId,
      entry.actionType,
      entry.targetListingId,
      entry.previousState === null ? null : JSON.stringify(entry.previousState),
      JSON.stringify(entry.newState),
      previousHash,
      recordHash,
      createdAt,
    ]
  );

  return result.rows[0];
}

async function getListingAuditTrail(listingId) {
  const listingResult = await pool.query(
    'SELECT id, title FROM listings WHERE id = $1',
    [listingId]
  );

  if (listingResult.rowCount === 0) {
    return null;
  }

  const result = await pool.query(
    `SELECT
       logs.*,
       users.name AS actor_name,
       users.email AS actor_email
     FROM compliance_audit_logs logs
     INNER JOIN users ON users.id = logs.admin_id
     WHERE logs.target_listing_id = $1
     ORDER BY logs.id ASC`,
    [listingId]
  );

  let expectedPreviousHash = null;
  let chainValid = true;

  const logs = result.rows.map((row) => {
    const createdAt = row.created_at.toISOString();
    const expectedHash = calculateRecordHash({
      actorId: row.admin_id,
      actionType: row.action_type,
      targetListingId: row.target_listing_id,
      previousState: row.previous_state,
      newState: row.new_state,
      previousHash: row.previous_hash,
      createdAt,
    });
    const entryValid =
      row.previous_hash === expectedPreviousHash && row.record_hash === expectedHash;

    if (!entryValid) {
      chainValid = false;
    }
    expectedPreviousHash = row.record_hash;

    return {
      id: String(row.id),
      actor: {
        id: String(row.admin_id),
        name: row.actor_name,
        email: row.actor_email,
      },
      actionType: row.action_type,
      targetListingId: String(row.target_listing_id),
      previousState: row.previous_state,
      newState: row.new_state,
      previousHash: row.previous_hash,
      recordHash: row.record_hash,
      createdAt,
      integrityVerified: entryValid,
    };
  });

  return {
    listing: {
      id: String(listingResult.rows[0].id),
      title: listingResult.rows[0].title,
    },
    integrity: {
      algorithm: 'SHA-256',
      chainValid,
      recordCount: logs.length,
    },
    logs,
  };
}

module.exports = {
  calculateRecordHash,
  getListingAuditTrail,
  logComplianceAction,
};
