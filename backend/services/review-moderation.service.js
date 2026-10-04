const pool = require('../db');
const { nextReviewStatus } = require('./review-moderation-policy.service');

async function listReviewModerationQueue({ status, page, limit, offset }) {
  const result = await pool.query(
    `SELECT reviews.id, reviews.rating, reviews.comment, reviews.moderation_status,
            reviews.moderation_reason, reviews.created_at, reviews.moderated_at,
            listings.id AS listing_id, listings.title AS listing_title,
            COUNT(*) OVER() AS total_count
     FROM reviews
     INNER JOIN tenancies ON tenancies.id = reviews.tenancy_id
     INNER JOIN listings ON listings.id = tenancies.listing_id
     WHERE reviews.moderation_status = $1
     ORDER BY reviews.created_at DESC, reviews.id DESC
     LIMIT $2 OFFSET $3`,
    [status, limit, offset]
  );
  const total = result.rows[0] ? Number(result.rows[0].total_count) : 0;
  return {
    items: result.rows.map(serializeModeratedReview),
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
}

async function decideReviewModeration({ reviewId, adminId, decision, reason }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const currentResult = await client.query(
      `SELECT reviews.*, listings.id AS listing_id, listings.title AS listing_title
       FROM reviews
       INNER JOIN tenancies ON tenancies.id = reviews.tenancy_id
       INNER JOIN listings ON listings.id = tenancies.listing_id
       WHERE reviews.id = $1
       FOR UPDATE OF reviews`,
      [reviewId]
    );
    if (!currentResult.rowCount) { const error = new Error('Review not found.'); error.code = 'REVIEW_NOT_FOUND'; throw error; }
    const current = currentResult.rows[0];
    const nextStatus = nextReviewStatus(decision);
    if (current.moderation_status === nextStatus) { const error = new Error(`Review is already ${nextStatus}.`); error.code = 'STATUS_CONFLICT'; throw error; }
    const update = await client.query(
      `UPDATE reviews SET moderation_status = $1, moderation_reason = $2,
              moderated_by = $3, moderated_at = NOW()
       WHERE id = $4 AND moderation_status = $5
       RETURNING *`,
      [nextStatus, reason, adminId, reviewId, current.moderation_status]
    );
    if (!update.rowCount) { const error = new Error('Review was changed by another moderator.'); error.code = 'CONCURRENT_DECISION'; throw error; }
    await client.query(
      `INSERT INTO review_moderation_logs
       (review_id, admin_id, previous_status, decision, new_status, reason)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [reviewId, adminId, current.moderation_status, decision, nextStatus, reason]
    );
    await client.query('COMMIT');
    return serializeModeratedReview({ ...update.rows[0], listing_id: current.listing_id, listing_title: current.listing_title });
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    throw error;
  } finally { client.release(); }
}

function serializeModeratedReview(row) {
  return {
    id: String(row.id), rating: Number(row.rating), comment: row.comment || null,
    status: row.moderation_status, reason: row.moderation_reason || null,
    listing: { id: String(row.listing_id), title: row.listing_title },
    reviewer: { label: 'Verified resident' }, createdAt: row.created_at,
    moderatedAt: row.moderated_at || null,
  };
}
module.exports = { decideReviewModeration, listReviewModerationQueue };
