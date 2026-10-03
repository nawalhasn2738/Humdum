import assert from 'node:assert/strict'
import test from 'node:test'
import type { ManagedListing } from '../lib/api.ts'
import { attachVerificationStatus } from '../lib/landlord-dashboard.ts'

function listing(id: string): ManagedListing {
  return {
    id,
    landlordId: '9',
    title: `Listing ${id}`,
    description: null,
    rent: 25000,
    deposit: 10000,
    curfewRules: null,
    capacity: 2,
    accommodationType: 'room',
    contact: { email: 'landlord@example.com', phone: '+923001234567' },
    reportedSafetyFeatures: ['cctv'],
    location: { latitude: 33.68, longitude: 73.04 },
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    moderationStatus: 'active',
    safetyScore: null,
    bookings: 0,
  }
}

test('supports a landlord with no listings', async () => {
  let calls = 0
  const result = await attachVerificationStatus([], async () => {
    calls += 1
    return 'verified'
  })
  assert.deepEqual(result, [])
  assert.equal(calls, 0)
})

test('attaches verification to one owned listing', async () => {
  const result = await attachVerificationStatus([listing('1')], async () => 'verified')
  assert.equal(result.length, 1)
  assert.equal(result[0].verificationStatus, 'verified')
})

test('preserves multiple owned listings and isolates compliance failures', async () => {
  const result = await attachVerificationStatus(
    [listing('1'), listing('2'), listing('3')],
    async (id) => {
      if (id === '2') throw new Error('backend failure')
      return id === '1' ? 'not_audited' : 'expired'
    },
  )
  assert.deepEqual(result.map((item) => item.id), ['1', '2', '3'])
  assert.deepEqual(result.map((item) => item.verificationStatus), ['not_audited', 'error', 'expired'])
})
