const {
  parseQueueParams,
  getVerificationQueue,
} = require('../services/admin-verification.service');
const { validateDecisionInput } = require('../services/verification-decision-policy.service');
const { decideListingVerification } = require('../services/verification-decision.service');
const { invalidateCachePattern } = require('../services/cache.service');

function isPositiveId(value) {
  return /^[1-9]\d*$/.test(String(value));
}

async function listVerificationQueue(req, res) {
  const parsed = parseQueueParams(req.query);
  if (parsed.errors) {
    return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', fields: parsed.errors });
  }

  try {
    const result = await getVerificationQueue(parsed.value);
    return res.json(result);
  } catch (error) {
    console.error('Admin verification queue failed:', error.message);
    return res.status(500).json({ error: 'Unable to load the verification queue.' });
  }
}

async function decideVerification(req, res) {
  if (!isPositiveId(req.params.listingId)) {
    return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', fields: { listingId: 'A valid listing ID is required.' } });
  }
  if (!req.user.profileId) {
    return res.status(403).json({ error: 'A registered administrator or safety auditor profile is required.' });
  }

  const parsed = validateDecisionInput(req.body);
  if (parsed.errors) {
    return res.status(400).json({ error: 'Validation failed.', code: 'VALIDATION_ERROR', fields: parsed.errors });
  }

  try {
    const result = await decideListingVerification({
      listingId: req.params.listingId,
      actorId: req.user.profileId,
      ...parsed.value,
    });
    await invalidateCachePattern('cache:listings:*');
    await invalidateCachePattern('cache:safety-score:/api/listings/' + req.params.listingId + '/safety-score*');
    return res.json(result);
  } catch (error) {
    if (error.code === 'LISTING_NOT_FOUND') return res.status(404).json({ error: error.message });
    if (['STATUS_CONFLICT', 'CONCURRENT_DECISION', 'INVALID_APPROVAL_AUDIT'].includes(error.code)) {
      return res.status(409).json({ error: error.message, code: error.code });
    }
    console.error('Verification decision failed:', error.message);
    return res.status(500).json({ error: 'Unable to save the verification decision.' });
  }
}

module.exports = { listVerificationQueue, decideVerification };