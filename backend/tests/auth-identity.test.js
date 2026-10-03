const test = require('node:test');
const assert = require('node:assert/strict');
const { buildAuthenticatedIdentity } = require('../services/auth-identity.service');

test('uses the database profile as the application role authority', () => {
  const identity = buildAuthenticatedIdentity(
    {
      sub: 'supabase-user-id',
      email: 'token@example.com',
      role: 'authenticated',
      app_metadata: { role: 'admin' },
      user_metadata: { role: 'admin' },
    },
    {
      id: 42,
      name: 'Ayesha Khan',
      email: 'ayesha@example.com',
      phone: '+923001234567',
      masked_phone: '+92******567',
      role: 'tenant',
    },
  );

  assert.equal(identity.id, 'supabase-user-id');
  assert.equal(identity.profileId, '42');
  assert.equal(identity.role, 'tenant');
  assert.equal(identity.name, 'Ayesha Khan');
  assert.equal(identity.email, 'ayesha@example.com');
});

test('does not grant an application role when the database profile is missing', () => {
  const identity = buildAuthenticatedIdentity(
    {
      sub: 'supabase-user-id',
      email: 'user@example.com',
      role: 'authenticated',
      app_metadata: { role: 'admin' },
      user_metadata: { role: 'admin' },
    },
    null,
  );

  assert.equal(identity.profileId, null);
  assert.equal(identity.role, null);
  assert.equal(identity.email, 'user@example.com');
});
