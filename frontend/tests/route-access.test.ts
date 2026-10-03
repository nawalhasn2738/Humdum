import assert from 'node:assert/strict'
import test from 'node:test'
import { decideRouteAccess, homeForRole, safeReturnPath } from '../lib/route-access.ts'

test('logged-out and expired sessions require authentication', () => {
  assert.equal(decideRouteAccess('unauthenticated', null), 'unauthenticated')
  assert.equal(decideRouteAccess('unauthenticated', null, ['admin']), 'unauthenticated')
})

test('tenant cannot enter landlord or admin routes', () => {
  assert.equal(decideRouteAccess('authenticated', 'tenant', ['landlord']), 'forbidden')
  assert.equal(decideRouteAccess('authenticated', 'tenant', ['admin']), 'forbidden')
})

test('landlord cannot enter admin routes', () => {
  assert.equal(decideRouteAccess('authenticated', 'landlord', ['admin']), 'forbidden')
})

test('admin can enter admin routes', () => {
  assert.equal(decideRouteAccess('authenticated', 'admin', ['admin']), 'authorized')
})

test('authenticated-only routes accept each backend-resolved role', () => {
  for (const role of ['tenant', 'landlord', 'admin', 'safety_inspector'] as const) assert.equal(decideRouteAccess('authenticated', role), 'authorized')
})

test('refresh and identity failures never expose protected content', () => {
  assert.equal(decideRouteAccess('loading', undefined, ['admin']), 'loading')
  assert.equal(decideRouteAccess('error', undefined, ['admin']), 'error')
})

test('forbidden users are sent to their backend-role home', () => {
  assert.equal(homeForRole('tenant'), '/profile')
  assert.equal(homeForRole('landlord'), '/landlord/dashboard')
  assert.equal(homeForRole('admin'), '/admin')
  assert.equal(homeForRole('safety_inspector'), '/admin')
})

test('return paths cannot redirect outside Humdum', () => {
  assert.equal(safeReturnPath('/messages'), '/messages')
  assert.equal(safeReturnPath('https://example.com'), '/profile')
  assert.equal(safeReturnPath('//example.com'), '/profile')
})
