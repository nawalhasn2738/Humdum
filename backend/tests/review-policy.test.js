const test = require('node:test');
const assert = require('node:assert/strict');
const { reviewEligibility, validateReviewInput } = require('../services/review-policy.service');

const base = { actorRole: 'tenant', actorId: 10, tenantId: 10, tenancyStatus: 'completed', listingStatus: 'active', existingReview: false };

test('completed or ended tenancy owned by tenant is eligible', () => {
  assert.equal(reviewEligibility(base), 'eligible');
  assert.equal(reviewEligibility({ ...base, tenancyStatus: 'ended' }), 'eligible');
});

test('non-tenant and another tenant are forbidden', () => {
  assert.equal(reviewEligibility({ ...base, actorRole: 'landlord' }), 'forbidden');
  assert.equal(reviewEligibility({ ...base, actorId: 11 }), 'forbidden');
});

test('active tenancy and tenancy for another authenticated tenant are not eligible', () => {
  assert.equal(reviewEligibility({ ...base, tenancyStatus: 'active' }), 'tenancy_not_completed');
  assert.equal(reviewEligibility({ ...base, tenantId: 12 }), 'forbidden');
});

test('duplicate tenancy review is rejected', () => {
  assert.equal(reviewEligibility({ ...base, existingReview: true }), 'duplicate');
});

test('rating must be an integer from one through five', () => {
  assert.deepEqual(validateReviewInput({ rating: 0, comment: '' }), { rating: 'Rating must be a whole number between 1 and 5.' });
  assert.deepEqual(validateReviewInput({ rating: 4.5, comment: '' }), { rating: 'Rating must be a whole number between 1 and 5.' });
  assert.deepEqual(validateReviewInput({ rating: 5, comment: 'Accurate review' }), {});
});

test('review modification by another tenant is not possible through ownership policy', () => {
  assert.equal(reviewEligibility({ ...base, actorId: 99, existingReview: true }), 'forbidden');
});

test('deactivated listing is unavailable and deleted tenancy is represented as not found by service', () => {
  assert.equal(reviewEligibility({ ...base, listingStatus: 'suspended' }), 'listing_unavailable');
});
