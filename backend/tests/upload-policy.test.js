const test = require('node:test');
const assert = require('node:assert/strict');
const { canAccessDocument, canUploadListingEvidence, validateReview } = require('../services/upload-policy.service');


test('upload policy rejects unauthorized and cross-landlord targets', () => {
  const listing = { landlord_id: '12' };
  assert.equal(canUploadListingEvidence({ profileId: '12', role: 'landlord' }, listing), true);
  assert.equal(canUploadListingEvidence({ profileId: '13', role: 'landlord' }, listing), false);
  assert.equal(canUploadListingEvidence({ profileId: '12', role: 'tenant' }, listing), false);
});
test('landlord can access listing evidence only for a listing they own', () => {
  const actor = { profileId: '12', role: 'landlord' };
  assert.equal(canAccessDocument(actor, { document_type: 'listing_verification', landlord_id: '12' }), true);
  assert.equal(canAccessDocument(actor, { document_type: 'listing_verification', landlord_id: '13' }), false);
});

test('tenant and unauthenticated users cannot access listing evidence', () => {
  const document = { document_type: 'listing_verification', landlord_id: '12' };
  assert.equal(canAccessDocument({ profileId: '12', role: 'tenant' }, document), false);
  assert.equal(canAccessDocument(null, document), false);
});

test('review validation requires a reason for rejection', () => {
  assert.deepEqual(validateReview('rejected', ''), { rejectionReason: 'A rejection reason is required.' });
  assert.equal(validateReview('accepted', ''), null);
  assert.deepEqual(validateReview('pending_review', ''), { status: 'Review status must be accepted or rejected.' });
});