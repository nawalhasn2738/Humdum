const pool = require('../db');
const { reviewEligibility } = require('./review-policy.service');

function reviewError(code, message) { const error = new Error(message); error.code = code; return error; }

async function getReviewEligibility({ tenantId, listingId }) {
  const result = await pool.query(
    `SELECT tenancies.id, tenancies.tenant_id, tenancies.listing_id, tenancies.status,
            tenancies.start_date, tenancies.end_date, listings.title,
            listings.moderation_status,
            reviews.id AS review_id
     FROM tenancies
     INNER JOIN listings ON listings.id = tenancies.listing_id
     LEFT JOIN reviews ON reviews.tenancy_id = tenancies.id
     WHERE tenancies.tenant_id = $1 AND tenancies.listing_id = $2
     ORDER BY tenancies.end_date DESC NULLS LAST, tenancies.id DESC
     LIMIT 1`,
    [tenantId, listingId]
  );
  if (!result.rowCount) return { eligible: false, reason: 'no_verified_tenancy', tenancy: null };
  const row = result.rows[0];
  const reason = reviewEligibility({ actorRole: 'tenant', actorId: tenantId, tenantId: row.tenant_id, tenancyStatus: row.status, listingStatus: row.moderation_status, existingReview: Boolean(row.review_id) });
  return {
    eligible: reason === 'eligible',
    reason,
    tenancy: { id: String(row.id), listingId: String(row.listing_id), status: row.status, startDate: row.start_date, endDate: row.end_date, reviewed: Boolean(row.review_id) },
  };
}

async function createReview({ tenantId, tenancyId, rating, comment }) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const contextResult = await client.query(
      `SELECT tenancies.id, tenancies.tenant_id, tenancies.listing_id, tenancies.status,
              listings.moderation_status,
              EXISTS (SELECT 1 FROM reviews WHERE reviews.tenancy_id = tenancies.id) AS existing_review
       FROM tenancies
       INNER JOIN listings ON listings.id = tenancies.listing_id
       WHERE tenancies.id = $1
       FOR UPDATE OF tenancies`,
      [tenancyId]
    );
    if (!contextResult.rowCount) throw reviewError('TENANCY_NOT_FOUND', 'Eligible tenancy not found.');
    const context = contextResult.rows[0];
    const eligibility = reviewEligibility({ actorRole: 'tenant', actorId: tenantId, tenantId: context.tenant_id, tenancyStatus: context.status, listingStatus: context.moderation_status, existingReview: context.existing_review });
    if (eligibility === 'forbidden') throw reviewError('REVIEW_FORBIDDEN', 'You cannot review this tenancy.');
    if (eligibility === 'tenancy_not_completed') throw reviewError('TENANCY_NOT_COMPLETED', 'Only a completed or ended tenancy can be reviewed.');
    if (eligibility === 'listing_unavailable') throw reviewError('LISTING_UNAVAILABLE', 'This listing is not available for reviews.');
    if (eligibility === 'duplicate') throw reviewError('DUPLICATE_REVIEW', 'This tenancy has already been reviewed.');
    const result = await client.query(
      `INSERT INTO reviews (tenancy_id, rating, comment)
       VALUES ($1, $2, $3)
       RETURNING id, tenancy_id, rating, comment, created_at`,
      [tenancyId, rating, comment || null]
    );
    await client.query('COMMIT');
    return { ...result.rows[0], listing_id: context.listing_id };
  } catch (error) {
    try { await client.query('ROLLBACK'); } catch {}
    if (error.code === '23505') throw reviewError('DUPLICATE_REVIEW', 'This tenancy has already been reviewed.');
    throw error;
  } finally { client.release(); }
}

async function listListingReviews(listingId) {
  const listing = await pool.query('SELECT id FROM listings WHERE id = $1 AND moderation_status = $2', [listingId, 'active']);
  if (!listing.rowCount) return null;
  const result = await pool.query(
    `SELECT reviews.id, reviews.rating, reviews.comment, reviews.created_at,
            tenancies.start_date, tenancies.end_date
     FROM reviews
     INNER JOIN tenancies ON tenancies.id = reviews.tenancy_id
     WHERE tenancies.listing_id = $1
       AND LOWER(tenancies.status) IN ('completed', 'ended')
       AND reviews.moderation_status = 'approved'
     ORDER BY reviews.created_at DESC, reviews.id DESC`,
    [listingId]
  );
  return result.rows;
}

module.exports = { createReview, getReviewEligibility, listListingReviews };
