import assert from 'node:assert/strict'
import test from 'node:test'
import {
  hasSafetyInformation,
  isValidListingId,
  listingSearchValidationError,
  mapPublicVerificationState,
} from '../lib/listing-contract.ts'

test('accepts valid PostGIS radius parameters', () => {
  assert.equal(listingSearchValidationError({ latitude: 33.6844, longitude: 73.0479, radiusKm: 5 }), null)
})

test('rejects invalid search parameters before an API request', () => {
  assert.match(listingSearchValidationError({ latitude: 91, longitude: 73, radiusKm: 5 }) || '', /Latitude/)
  assert.match(listingSearchValidationError({ latitude: 33, longitude: 181, radiusKm: 5 }) || '', /Longitude/)
  assert.match(listingSearchValidationError({ latitude: 33, longitude: 73, radiusKm: 0 }) || '', /radius/)
  assert.match(listingSearchValidationError({ latitude: 33, longitude: 73, radiusKm: 101 }) || '', /radius/)
})

test('validates backend listing identifiers', () => {
  assert.equal(isValidListingId('1'), true)
  assert.equal(isValidListingId('0'), false)
  assert.equal(isValidListingId('not-an-id'), false)
})

test('distinguishes safety data from an unrated listing', () => {
  assert.equal(hasSafetyInformation(70), true)
  assert.equal(hasSafetyInformation(0), false)
})
test('maps every backend compliance status without exposing invalid scores', () => {
  const base = { hasAudit: true, currentAudit: true, dataCompleteness: 70 }
  assert.equal(mapPublicVerificationState({ ...base, safetyStatus: 'verified' }), 'verified')
  assert.equal(mapPublicVerificationState({ ...base, safetyStatus: 'conditional' }), 'pending')
  assert.equal(mapPublicVerificationState({ ...base, safetyStatus: 'pending_verification' }), 'pending')
  assert.equal(mapPublicVerificationState({ ...base, safetyStatus: 'needs_attention' }), 'rejected')
  assert.equal(mapPublicVerificationState({ ...base, safetyStatus: 'expired' }), 'expired')
  assert.equal(mapPublicVerificationState({ ...base, hasAudit: false, safetyStatus: 'not_audited' }), 'unavailable')
})

test('does not accept a verified status without a current, complete safety result', () => {
  assert.equal(mapPublicVerificationState({ safetyStatus: 'verified', hasAudit: true, currentAudit: false, dataCompleteness: 70 }), 'unavailable')
  assert.equal(mapPublicVerificationState({ safetyStatus: 'verified', hasAudit: true, currentAudit: true, dataCompleteness: 0 }), 'unavailable')
})
