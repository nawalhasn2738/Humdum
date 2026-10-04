const REVIEWABLE_TENANCY_STATUSES = Object.freeze(['completed', 'ended']);

function validateReviewInput({ rating, comment }) {
  const errors = {};
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    errors.rating = 'Rating must be a whole number between 1 and 5.';
  }
  if (comment !== undefined && comment !== null && typeof comment !== 'string') {
    errors.comment = 'Comment must be text.';
  } else if (typeof comment === 'string' && comment.trim().length > 2000) {
    errors.comment = 'Comment must be 2000 characters or fewer.';
  }
  return errors;
}

function reviewEligibility({ actorRole, actorId, tenantId, tenancyStatus, listingStatus, existingReview }) {
  if (actorRole !== 'tenant' || String(actorId) !== String(tenantId)) return 'forbidden';
  if (!REVIEWABLE_TENANCY_STATUSES.includes(String(tenancyStatus).toLowerCase())) return 'tenancy_not_completed';
  if (listingStatus !== 'active') return 'listing_unavailable';
  if (existingReview) return 'duplicate';
  return 'eligible';
}

module.exports = { REVIEWABLE_TENANCY_STATUSES, reviewEligibility, validateReviewInput };
