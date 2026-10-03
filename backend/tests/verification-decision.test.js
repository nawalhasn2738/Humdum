const test = require('node:test');
const assert = require('node:assert/strict');
const { validateDecisionInput, transitionForDecision, isApprovalAuditValid } = require('../services/verification-decision-policy.service');

test('approve and reject transition only a pending listing', () => {
  assert.deepEqual(transitionForDecision('under_review', 'approve'), { nextStatus: 'active' });
  assert.deepEqual(transitionForDecision('under_review', 'reject'), { nextStatus: 'suspended' });
});

test('rejection requires a reason', () => {
  assert.ok(validateDecisionInput({ decision: 'reject', reason: '' }).errors.reason);
  assert.deepEqual(validateDecisionInput({ decision: 'reject', reason: 'Evidence is unreadable.' }).value, {
    decision: 'reject',
    reason: 'Evidence is unreadable.',
  });
});

test('already approved and suspended listings reject duplicate decisions', () => {
  assert.deepEqual(transitionForDecision('active', 'approve'), { error: 'ALREADY_DECIDED' });
  assert.deepEqual(transitionForDecision('suspended', 'reject'), { error: 'SUSPENDED_LISTING' });
});

test('suspension is supported only for an active listing', () => {
  assert.deepEqual(transitionForDecision('active', 'suspend'), { nextStatus: 'suspended' });
  assert.deepEqual(transitionForDecision('under_review', 'suspend'), { error: 'INVALID_TRANSITION' });
});

test('approval requires a current post-edit qualifying audit', () => {
  const now = new Date('2026-10-04T12:00:00.000Z');
  const audit = { audit_score: 90, expiry_date: '2026-12-01', created_at: '2026-10-03T00:00:00.000Z' };
  assert.equal(isApprovalAuditValid(audit, '2026-10-02T00:00:00.000Z', now), true);
  assert.equal(isApprovalAuditValid({ ...audit, audit_score: 79 }, '2026-10-02T00:00:00.000Z', now), false);
  assert.equal(isApprovalAuditValid(audit, '2026-10-04T13:00:00.000Z', now), false);
});

test('a compare-and-set transition is required after locking to reject concurrent decisions', () => {
  const first = transitionForDecision('under_review', 'approve');
  const second = transitionForDecision(first.nextStatus, 'reject');
  assert.deepEqual(second, { error: 'ALREADY_DECIDED' });
});