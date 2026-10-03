const test = require('node:test');
const assert = require('node:assert/strict');
const {
  classifyListingOwnership,
  validateListingInput,
} = require('../services/listing-validation.service');

const valid = {
  title: 'Room near NUST',
  description: 'Private room.',
  rent: 25000,
  deposit: 10000,
  curfewRules: 'Gate closes at 10 PM.',
  latitude: 33.6844,
  longitude: 73.0479,
  capacity: 2,
  accommodationType: 'room',
  contactEmail: 'landlord@example.com',
  contactPhone: '+923001234567',
  reportedSafetyFeatures: ['cctv', 'guarded_entrance'],
};

test('accepts and normalizes a complete listing payload', () => {
  const result = validateListingInput(valid);
  assert.deepEqual(result.errors, {});
  assert.equal(result.value.contactPhone, '+923001234567');
  assert.deepEqual(result.value.reportedSafetyFeatures, ['cctv', 'guarded_entrance']);
});

test('returns predictable field validation errors', () => {
  const result = validateListingInput({
    ...valid,
    title: 'x',
    rent: -1,
    capacity: 0,
    accommodationType: 'hotel',
    latitude: 91,
    contactEmail: 'invalid',
    contactPhone: '123',
    reportedSafetyFeatures: ['fire_certified'],
  });
  assert.deepEqual(Object.keys(result.errors).sort(), [
    'accommodationType',
    'capacity',
    'contactEmail',
    'contactPhone',
    'latitude',
    'rent',
    'reportedSafetyFeatures',
    'title',
  ]);
});

test('rejects missing safety feature arrays instead of trusting arbitrary input', () => {
  const result = validateListingInput({ ...valid, reportedSafetyFeatures: undefined });
  assert.equal(typeof result.errors.reportedSafetyFeatures, 'string');
});
test('classifies owned, unauthorized, and missing listing edits', () => {
  assert.equal(classifyListingOwnership({ landlord_id: 10 }, 10), 'owned');
  assert.equal(classifyListingOwnership({ landlord_id: 10 }, 11), 'forbidden');
  assert.equal(classifyListingOwnership(null, 10), 'missing');
});
