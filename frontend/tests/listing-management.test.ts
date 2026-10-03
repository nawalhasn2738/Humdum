import assert from 'node:assert/strict'
import test from 'node:test'
import { validateListingForm, type ListingFormValues } from '../lib/listing-management.ts'

const valid: ListingFormValues = {
  title: 'Room near NUST',
  description: '',
  rent: '25000',
  deposit: '10000',
  curfewRules: '',
  latitude: '33.6844',
  longitude: '73.0479',
  capacity: '2',
  accommodationType: 'room',
  contactEmail: 'landlord@example.com',
  contactPhone: '+92 300 1234567',
  reportedSafetyFeatures: ['cctv'],
}

test('builds the create/edit API payload from valid form values', () => {
  const result = validateListingForm(valid)
  assert.deepEqual(result.fields, {})
  assert.equal(result.payload?.capacity, 2)
  assert.equal(result.payload?.contactPhone, '+923001234567')
})

test('returns field-level errors for invalid listing data', () => {
  const result = validateListingForm({
    ...valid,
    title: '',
    rent: '-1',
    capacity: '0',
    accommodationType: '',
    contactEmail: 'bad',
    contactPhone: '12',
    latitude: '100',
  })
  assert.equal(result.payload, null)
  assert.ok(result.fields.title)
  assert.ok(result.fields.rent)
  assert.ok(result.fields.capacity)
  assert.ok(result.fields.accommodationType)
  assert.ok(result.fields.contactEmail)
  assert.ok(result.fields.contactPhone)
  assert.ok(result.fields.latitude)
})
