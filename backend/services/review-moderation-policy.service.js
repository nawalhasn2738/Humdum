const REVIEW_MODERATION_STATUSES = Object.freeze(['pending', 'flagged', 'approved', 'hidden', 'rejected']);
const REVIEW_DECISIONS = Object.freeze(['approve', 'hide', 'reject']);

function parseReviewQueueParams(query) {
  const status = query.status || 'pending';
  const page = Number(query.page || 1);
  const limit = Number(query.limit || 20);
  const errors = {};
  if (!REVIEW_MODERATION_STATUSES.includes(status)) errors.status = 'Status must be pending, flagged, approved, hidden, or rejected.';
  if (!Number.isInteger(page) || page < 1) errors.page = 'Page must be a positive integer.';
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) errors.limit = 'Limit must be between 1 and 100.';
  return Object.keys(errors).length ? { errors } : { value: { status, page, limit, offset: (page - 1) * limit } };
}

function validateReviewDecision(body) {
  const decision = typeof body.decision === 'string' ? body.decision.trim().toLowerCase() : '';
  const reason = typeof body.reason === 'string' ? body.reason.trim() : '';
  const errors = {};
  if (!REVIEW_DECISIONS.includes(decision)) errors.decision = 'Decision must be approve, hide, or reject.';
  if (['hide', 'reject'].includes(decision) && !reason) errors.reason = 'A reason is required to hide or reject a review.';
  if (reason.length > 1000) errors.reason = 'Reason must be 1000 characters or fewer.';
  return Object.keys(errors).length ? { errors } : { value: { decision, reason: reason || null } };
}

function canModerateReviews(role) { return role === 'admin'; }
function isReviewPublic(status) { return status === 'approved'; }

function nextReviewStatus(decision) {
  return { approve: 'approved', hide: 'hidden', reject: 'rejected' }[decision] || null;
}

module.exports = { REVIEW_DECISIONS, REVIEW_MODERATION_STATUSES, canModerateReviews, isReviewPublic, nextReviewStatus, parseReviewQueueParams, validateReviewDecision };
