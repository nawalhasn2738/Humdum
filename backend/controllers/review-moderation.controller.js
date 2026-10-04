const { parseReviewQueueParams, validateReviewDecision } = require('../services/review-moderation-policy.service');
const { decideReviewModeration, listReviewModerationQueue } = require('../services/review-moderation.service');
function isPositiveId(value) { return /^[1-9]\d*$/.test(String(value)); }

async function listReviewQueue(req, res) {
  const parsed = parseReviewQueueParams(req.query);
  if (parsed.errors) return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', fields: parsed.errors });
  try { return res.json(await listReviewModerationQueue(parsed.value)); }
  catch (error) { console.error('Review moderation queue failed:', error.message); return res.status(500).json({ error: 'Unable to load review moderation queue.' }); }
}

async function decideReview(req, res) {
  if (!req.user.profileId) return res.status(403).json({ error: 'A registered administrator profile is required.' });
  if (!isPositiveId(req.params.reviewId)) return res.status(400).json({ error: 'A valid review ID is required.' });
  const parsed = validateReviewDecision(req.body);
  if (parsed.errors) return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', fields: parsed.errors });
  try {
    const review = await decideReviewModeration({ reviewId: req.params.reviewId, adminId: req.user.profileId, ...parsed.value });
    return res.json({ review });
  } catch (error) {
    if (error.code === 'REVIEW_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (['STATUS_CONFLICT', 'CONCURRENT_DECISION'].includes(error.code)) return res.status(409).json({ error: error.message, code: error.code });
    console.error('Review moderation decision failed:', error.message);
    return res.status(500).json({ error: 'Unable to save review moderation decision.' });
  }
}
module.exports = { decideReview, listReviewQueue };
