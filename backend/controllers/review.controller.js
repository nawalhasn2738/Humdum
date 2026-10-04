const { createReview, getReviewEligibility, listListingReviews } = require('../services/review.service');
const { validateReviewInput } = require('../services/review-policy.service');

function isPositiveId(value) { return /^[1-9]\d*$/.test(String(value)); }
function serializeReview(row) { return { id: String(row.id), listingId: row.listing_id ? String(row.listing_id) : undefined, tenancyId: row.tenancy_id ? String(row.tenancy_id) : undefined, rating: Number(row.rating), comment: row.comment || null, reviewer: { label: 'Verified resident' }, stay: { startDate: row.start_date || null, endDate: row.end_date || null }, createdAt: row.created_at }; }

async function create(req, res) {
  const tenancyId = req.body.tenancyId ?? req.body.tenancy_id;
  const rating = Number(req.body.rating);
  const comment = req.body.comment;
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered tenant profile is required.' });
  if (!isPositiveId(tenancyId)) return res.status(400).json({ error: 'A valid tenancyId is required.', fields: { tenancyId: 'Select an eligible tenancy.' } });
  const fields = validateReviewInput({ rating, comment });
  if (Object.keys(fields).length) return res.status(400).json({ error: 'Review validation failed.', fields });
  try {
    const review = await createReview({ tenantId: req.user.profileId, tenancyId, rating, comment: typeof comment === 'string' ? comment.trim() : null });
    return res.status(201).json({ review: serializeReview(review) });
  } catch (error) {
    if (error.code === 'TENANCY_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (error.code === 'REVIEW_FORBIDDEN') return res.status(403).json({ error: error.message });
    if (['TENANCY_NOT_COMPLETED', 'LISTING_UNAVAILABLE', 'DUPLICATE_REVIEW'].includes(error.code)) return res.status(409).json({ error: error.message, code: error.code });
    console.error('Review creation failed:', error.message);
    return res.status(500).json({ error: 'Unable to create review.' });
  }
}

async function eligibility(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered tenant profile is required.' });
  if (!isPositiveId(req.params.listingId)) return res.status(400).json({ error: 'A valid listing ID is required.' });
  try { return res.json(await getReviewEligibility({ tenantId: req.user.profileId, listingId: req.params.listingId })); }
  catch (error) { console.error('Review eligibility failed:', error.message); return res.status(500).json({ error: 'Unable to check review eligibility.' }); }
}

async function listingReviews(req, res) {
  if (!isPositiveId(req.params.listingId)) return res.status(400).json({ error: 'A valid listing ID is required.' });
  try {
    const reviews = await listListingReviews(req.params.listingId);
    if (!reviews) return res.status(404).json({ error: 'Listing not found.' });
    return res.json({ reviews: reviews.map(serializeReview) });
  } catch (error) { console.error('Review list failed:', error.message); return res.status(500).json({ error: 'Unable to load reviews.' }); }
}

module.exports = { create, eligibility, listingReviews };
