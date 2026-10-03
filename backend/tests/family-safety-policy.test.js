const test = require('node:test');
const assert = require('node:assert/strict');
const { deriveCheckInState, isActiveSosStatus, normalizeOverdueHours } = require('../services/family-safety-policy.service');

test('check-in state distinguishes current, overdue, and not started', () => {
  const now = new Date('2026-10-04T12:00:00.000Z');
  assert.equal(deriveCheckInState(null, 24, now), 'not_started');
  assert.equal(deriveCheckInState({ status: 'confirmed', checked_in_at: '2026-10-04T10:00:00.000Z' }, 24, now), 'checked_in');
  assert.equal(deriveCheckInState({ status: 'confirmed', checked_in_at: '2026-10-03T10:00:00.000Z' }, 24, now), 'overdue');
  assert.equal(deriveCheckInState({ status: 'missed', checked_in_at: '2026-10-04T10:00:00.000Z' }, 24, now), 'overdue');
});

test('overdue hours are bounded with a safe default', () => {
  assert.equal(normalizeOverdueHours({ overdueAfterHours: 12 }), 12);
  assert.equal(normalizeOverdueHours({ overdueAfterHours: 0 }), 24);
  assert.equal(normalizeOverdueHours({ overdueAfterHours: 1000 }), 24);
});

test('only triggered and acknowledged SOS alerts are active', () => {
  assert.equal(isActiveSosStatus('triggered'), true);
  assert.equal(isActiveSosStatus('acknowledged'), true);
  assert.equal(isActiveSosStatus('resolved'), false);
});