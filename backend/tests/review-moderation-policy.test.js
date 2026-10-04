const test = require('node:test');
const assert = require('node:assert/strict');
const { canModerateReviews, isReviewPublic, nextReviewStatus, parseReviewQueueParams, validateReviewDecision } = require('../services/review-moderation-policy.service');

test('only admins can moderate reviews', () => {
  assert.equal(canModerateReviews('admin'), true);
  assert.equal(canModerateReviews('landlord'), false);
  assert.equal(canModerateReviews('tenant'), false);
  assert.equal(canModerateReviews('safety_inspector'), false);
});

test('only approved reviews are publicly visible', () => {
  assert.equal(isReviewPublic('approved'), true);
  for (const status of ['pending', 'flagged', 'hidden', 'rejected']) assert.equal(isReviewPublic(status), false);
});

test('queue accepts supported moderation states and bounded pagination', () => {
  assert.deepEqual(parseReviewQueueParams({ status: 'flagged', page: '2', limit: '10' }).value, { status: 'flagged', page: 2, limit: 10, offset: 10 });
  assert.ok(parseReviewQueueParams({ status: 'deleted', page: '0', limit: '101' }).errors);
});

test('hide and reject require an auditable reason', () => {
  assert.ok(validateReviewDecision({ decision: 'hide' }).errors.reason);
  assert.ok(validateReviewDecision({ decision: 'reject', reason: ' ' }).errors.reason);
  assert.deepEqual(validateReviewDecision({ decision: 'reject', reason: 'Harassment' }).value, { decision: 'reject', reason: 'Harassment' });
});

test('approve, hide, and reject map to one authoritative status', () => {
  assert.equal(nextReviewStatus('approve'), 'approved');
  assert.equal(nextReviewStatus('hide'), 'hidden');
  assert.equal(nextReviewStatus('reject'), 'rejected');
  assert.equal(nextReviewStatus('delete'), null);
});
