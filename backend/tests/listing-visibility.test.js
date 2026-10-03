const test = require('node:test');
const assert = require('node:assert/strict');
const { isListingPublic, canAccessManagedListing } = require('../services/listing-visibility.service');

test('only an approved active listing is public', () => {
  assert.equal(isListingPublic({ moderation_status: 'active' }), true);
  assert.equal(isListingPublic({ moderation_status: 'under_review' }), false);
});

test('rejected and suspended listings are not public', () => {
  assert.equal(isListingPublic({ moderation_status: 'suspended', decision: 'rejected' }), false);
  assert.equal(isListingPublic({ moderation_status: 'suspended' }), false);
});

test('owner can access their own non-public listing without making it public', () => {
  const listing = { landlord_id: '12', moderation_status: 'under_review' };
  assert.equal(canAccessManagedListing({ profileId: '12', role: 'landlord' }, listing), true);
  assert.equal(isListingPublic(listing), false);
});

test('admin and safety auditor can access non-public listings privately', () => {
  const listing = { landlord_id: '12', moderation_status: 'suspended' };
  assert.equal(canAccessManagedListing({ profileId: '99', role: 'admin' }, listing), true);
  assert.equal(canAccessManagedListing({ profileId: '98', role: 'safety_inspector' }, listing), true);
});

test('another landlord cannot access a non-public listing through management access', () => {
  const listing = { landlord_id: '12', moderation_status: 'under_review' };
  assert.equal(canAccessManagedListing({ profileId: '13', role: 'landlord' }, listing), false);
});