const test = require('node:test');
const assert = require('node:assert/strict');
const { calls, resetDatabase, result, startTestServer } = require('./test-server');

let server;
test.before(async () => { server = await startTestServer(); });
test.after(async () => { await server.close(); });
test.beforeEach(() => resetDatabase());

test('authentication: missing and invalid bearer tokens are rejected', async () => {
  assert.equal((await server.request('/api/protected')).status, 401);
  assert.equal((await server.request('/api/protected', { token: 'forged-admin' })).status, 401);
});

test('authentication: identity and role come from the database profile', async () => {
  const response = await server.request('/api/protected', { token: 'tenant-a' });
  assert.equal(response.status, 200);
  assert.equal(response.body.user.role, 'tenant');
  assert.equal(response.body.user.profileId, '101');
});

test('RBAC: tenant cannot access the admin verification queue', async () => {
  const response = await server.request('/api/admin/verifications', { token: 'tenant-a' });
  assert.equal(response.status, 403);
});

test('RBAC: landlord cannot create a tenancy while a tenant reaches validation', async () => {
  assert.equal((await server.request('/api/tenancies', { token: 'landlord-a', method: 'POST', body: {} })).status, 403);
  assert.equal((await server.request('/api/tenancies', { token: 'tenant-a', method: 'POST', body: {} })).status, 400);
});

test('public listing moderation: direct detail requests require active status', async () => {
  resetDatabase(async (sql, values) => {
    if (/FROM listings WHERE id = \$1 AND moderation_status = \$2/i.test(sql)) {
      assert.equal(values[1], 'active');
      return result([]);
    }
    return result([]);
  });
  const response = await server.request('/api/listings/9');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Listing not found.');
});

test('compliance verification: tenant is forbidden while authorized inspector reaches input validation', async () => {
  const path = '/api/listings/9/audit';
  assert.equal((await server.request(path, { token: 'tenant-a', method: 'POST', body: {} })).status, 403);
  assert.equal((await server.request(path, { token: 'inspector', method: 'POST', body: {} })).status, 400);
});

test('safety score: non-public listing is indistinguishable from a missing listing', async () => {
  resetDatabase(async (sql, values) => {
    if (/WHERE l\.id = \$1 AND l\.moderation_status = \$2/i.test(sql)) {
      assert.deepEqual(values, ['9', 'active']);
      return result([]);
    }
    return result([]);
  });
  const response = await server.request('/api/listings/9/safety-score');
  assert.equal(response.status, 404);
  assert.equal(response.body.error, 'Listing not found.');
});

test('tenancy overlap: conflicting active date range returns 409 and rolls back', async () => {
  resetDatabase(async (sql) => {
    if (/^BEGIN|^ROLLBACK|^COMMIT/i.test(sql.trim())) return result([]);
    if (/FROM listings[\s\S]*FOR UPDATE NOWAIT/i.test(sql)) return result([{ id: 9 }]);
    if (/FROM tenancies[\s\S]*daterange/i.test(sql)) return result([{ id: 88, tenant_id: 102 }]);
    throw new Error(`Unexpected query: ${sql}`);
  });
  const response = await server.request('/api/tenancies', { token: 'tenant-a', method: 'POST', body: { listingId: 9, startDate: '2026-11-01', endDate: '2026-11-30' } });
  assert.equal(response.status, 409);
  assert.match(response.body.error, /already occupied/i);
  assert.equal(calls.some(({ sql }) => /^ROLLBACK/i.test(sql.trim())), true);
});

test('inquiry IDOR: landlord cannot decide another landlord\'s inquiry', async () => {
  resetDatabase(async (sql) => {
    if (/^BEGIN|^ROLLBACK|^COMMIT/i.test(sql.trim())) return result([]);
    if (/FROM inquiries[\s\S]*FOR UPDATE OF inquiries/i.test(sql)) return result([{ id: 7, tenant_id: 101, listing_id: 9, listing_title: 'Private home', landlord_id: 202, tenant_name: 'Tenant A', status: 'pending' }]);
    throw new Error(`Unexpected query: ${sql}`);
  });
  const response = await server.request('/api/inquiries/7/status', { token: 'landlord-a', method: 'PATCH', body: { status: 'accepted' } });
  assert.equal(response.status, 403);
  assert.equal(calls.some(({ sql }) => /^ROLLBACK/i.test(sql.trim())), true);
});

test('messaging privacy: preliminary conversations mask contact content and contact fields', async () => {
  resetDatabase(async (sql) => {
    if (/SELECT id, title FROM listings/i.test(sql)) return result([{ id: 9, title: 'Safe room' }]);
    if (/FROM messages[\s\S]*INNER JOIN users sender/i.test(sql)) return result([{
      id: 1, listing_id: 9, sender_id: 101, receiver_id: 201, content: 'Email me tenant@example.com or call +923001234567', is_masked: false,
      sender_name: 'Tenant A', sender_email: 'tenant@example.com', sender_phone: '+923001234567', sender_masked_phone: '+92******4567', sender_role: 'tenant',
      receiver_name: 'Landlord A', receiver_email: 'owner@example.com', receiver_phone: '+923009876543', receiver_masked_phone: '+92******6543', receiver_role: 'landlord',
      verified_contact: false, created_at: new Date('2026-10-05T12:00:00Z'),
    }]);
    return result([]);
  });
  const response = await server.request('/api/messages/9?participantId=201', { token: 'tenant-a' });
  assert.equal(response.status, 200);
  assert.equal(response.body.messages[0].isMasked, true);
  assert.doesNotMatch(response.body.messages[0].content, /tenant@example\.com|\+923001234567/);
  assert.notEqual(response.body.messages[0].receiver.phone, '+923009876543');
});

test('family profile IDOR: another tenant cannot read a family profile', async () => {
  resetDatabase(async (sql) => {
    if (/FROM family_profiles/i.test(sql)) return result([{ id: 1, user_id: 102, listing_id: 9, student_name: 'Tenant B', student_email: 'b@example.test', student_phone: '+923002222222', emergency_contact_name: 'Guardian', emergency_contact_relationship: 'Mother', guardian_phone: '+923007777777', guardian_email: 'guardian@example.test', secondary_guardian_phone: null, check_in_preferences: {}, landlord_id: 202, verified_tenancy: true, created_at: new Date(), updated_at: new Date() }]);
    return result([]);
  });
  const response = await server.request('/api/family-profiles/102', { token: 'tenant-a' });
  assert.equal(response.status, 403);
  assert.equal(response.body.profile, undefined);
});

test('document IDOR: landlord cannot list another landlord\'s evidence', async () => {
  resetDatabase(async (sql) => {
    if (/SELECT landlord_id FROM listings WHERE id = \$1/i.test(sql)) return result([{ landlord_id: 202 }]);
    return result([]);
  });
  const response = await server.request('/api/uploads/listing/9', { token: 'landlord-a' });
  assert.equal(response.status, 403);
  assert.equal(response.body.documents, undefined);
});
