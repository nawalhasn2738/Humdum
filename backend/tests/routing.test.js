const test = require('node:test');
const assert = require('node:assert/strict');
const { validateCommuteRequest } = require('../services/routing-policy.service');
const { estimateCommute, roundedPoint } = require('../services/routing.service');
const { summarizeRoute } = require('../services/google-routes.provider');

test('commute request accepts supported modes and rejects bad coordinates or modes', () => {
  assert.deepEqual(validateCommuteRequest({ origin: { latitude: 33.68, longitude: 73.05 }, modes: ['walk', 'walk', 'drive'] }).value.modes, ['walk', 'drive']);
  const invalid = validateCommuteRequest({ origin: { latitude: 100, longitude: 73 }, modes: ['fly'] });
  assert.equal(invalid.errors.latitude.length > 0, true);
  assert.equal(invalid.errors.modes.length > 0, true);
});

test('routing rounds the origin, caches estimates, and reports a cache hit', async () => {
  const store = new Map();
  const calls = [];
  const cache = { get: async (key) => store.get(key) || null, set: async (key, value) => store.set(key, value) };
  const provider = { name: 'test', estimate: async (input) => { calls.push(input); return { mode: input.mode, status: 'available', durationSeconds: 600, distanceMeters: 1200, lastMile: null, realTime: false, basis: 'provider_estimate' }; } };
  const input = { origin: { latitude: 33.684423, longitude: 73.047884 }, destination: { latitude: 33.7, longitude: 73.1 }, modes: ['walk'], now: new Date('2026-10-05T10:07:00Z'), provider, cache };
  const first = await estimateCommute(input);
  const second = await estimateCommute(input);
  assert.deepEqual(calls[0].origin, { latitude: 33.684, longitude: 73.048 });
  assert.equal(first.cache, 'miss');
  assert.equal(second.cache, 'hit');
  assert.equal(calls.length, 1);
});

test('routing keeps a partial provider failure honest', async () => {
  const provider = { name: 'test', estimate: async ({ mode }) => { if (mode === 'transit') throw Object.assign(new Error('down'), { code: 'ROUTING_PROVIDER_FAILURE' }); return { mode, status: 'available' }; } };
  const cache = { get: async () => null, set: async () => {} };
  const result = await estimateCommute({ origin: { latitude: 33, longitude: 73 }, destination: { latitude: 34, longitude: 74 }, modes: ['walk', 'transit'], provider, cache });
  assert.equal(result.estimates[1].status, 'unavailable');
  assert.match(result.disclaimer, /not presented as real-time/);
});

test('routing fails when every requested mode fails', async () => {
  const provider = { name: 'test', estimate: async () => { throw Object.assign(new Error('down'), { code: 'ROUTING_PROVIDER_FAILURE' }); } };
  const cache = { get: async () => null, set: async () => {} };
  await assert.rejects(() => estimateCommute({ origin: { latitude: 33, longitude: 73 }, destination: { latitude: 34, longitude: 74 }, modes: ['drive'], provider, cache }), { code: 'ROUTING_PROVIDER_FAILURE' });
});

test('Google response mapping reports transit walking context without claiming realtime', () => {
  const result = summarizeRoute({ duration: '1800s', distanceMeters: 12000, legs: [{ steps: [{ travelMode: 'WALK', distanceMeters: 700, staticDuration: '600s' }, { travelMode: 'TRANSIT', distanceMeters: 11300, staticDuration: '1200s' }] }] }, 'transit');
  assert.equal(result.durationSeconds, 1800);
  assert.deepEqual(result.lastMile, { walkingDistanceMeters: 700, walkingDurationSeconds: 600 });
  assert.equal(result.realTime, false);
  assert.equal(result.basis, 'schedule_estimate');
});

test('origin rounding limits cache precision', () => {
  assert.deepEqual(roundedPoint({ latitude: 33.12349, longitude: 73.98751 }), { latitude: 33.123, longitude: 73.988 });
});
