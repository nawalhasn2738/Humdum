const test = require('node:test');
const assert = require('node:assert/strict');
const { actorOwnsInquiry, canTransitionInquiry } = require('../services/inquiry-policy.service');

test('landlord can only decide a pending inquiry', () => {
  assert.equal(canTransitionInquiry({ actorRole: 'landlord', currentStatus: 'pending', nextStatus: 'accepted' }), true);
  assert.equal(canTransitionInquiry({ actorRole: 'landlord', currentStatus: 'pending', nextStatus: 'rejected' }), true);
  assert.equal(canTransitionInquiry({ actorRole: 'landlord', currentStatus: 'accepted', nextStatus: 'rejected' }), false);
  assert.equal(canTransitionInquiry({ actorRole: 'landlord', currentStatus: 'pending', nextStatus: 'withdrawn' }), false);
});

test('tenant can withdraw only their active inquiry', () => {
  assert.equal(canTransitionInquiry({ actorRole: 'tenant', currentStatus: 'pending', nextStatus: 'withdrawn' }), true);
  assert.equal(canTransitionInquiry({ actorRole: 'tenant', currentStatus: 'accepted', nextStatus: 'withdrawn' }), true);
  assert.equal(canTransitionInquiry({ actorRole: 'tenant', currentStatus: 'rejected', nextStatus: 'withdrawn' }), false);
  assert.equal(canTransitionInquiry({ actorRole: 'tenant', currentStatus: 'pending', nextStatus: 'accepted' }), false);
});

test('unrelated roles cannot change inquiry status', () => {
  assert.equal(canTransitionInquiry({ actorRole: 'admin', currentStatus: 'pending', nextStatus: 'accepted' }), false);
});
test('ownership is derived from the authenticated actor and listing owner', () => {
  assert.equal(actorOwnsInquiry({ actorRole: 'tenant', actorId: 10, tenantId: 10, landlordId: 20 }), true);
  assert.equal(actorOwnsInquiry({ actorRole: 'tenant', actorId: 11, tenantId: 10, landlordId: 20 }), false);
  assert.equal(actorOwnsInquiry({ actorRole: 'landlord', actorId: 20, tenantId: 10, landlordId: 20 }), true);
  assert.equal(actorOwnsInquiry({ actorRole: 'landlord', actorId: 21, tenantId: 10, landlordId: 20 }), false);
  assert.equal(actorOwnsInquiry({ actorRole: 'admin', actorId: 1, tenantId: 10, landlordId: 20 }), false);
});
