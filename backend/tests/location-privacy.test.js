const test = require('node:test');
const assert = require('node:assert/strict');
const { PUBLIC_COORDINATE_GRID_DEGREES, approximateCoordinate, approximatePublicLocation } = require('../services/location-privacy.service');

test('public coordinates are snapped to a coarse privacy grid', () => {
  assert.equal(PUBLIC_COORDINATE_GRID_DEGREES, 0.01);
  assert.deepEqual(approximatePublicLocation({ latitude: 33.68443, longitude: 73.04791 }), { latitude: 33.68, longitude: 73.05 });
});

test('different exact residential points in one grid cell expose the same public area', () => {
  const first = approximatePublicLocation({ latitude: 33.681, longitude: 73.051 });
  const second = approximatePublicLocation({ latitude: 33.683, longitude: 73.052 });
  assert.deepEqual(first, second);
});

test('invalid or absent coordinates do not produce a public location', () => {
  assert.equal(approximatePublicLocation(null), null);
  assert.equal(approximateCoordinate('not-a-coordinate'), null);
});
