const test = require('node:test');
const assert = require('node:assert/strict');

process.env.DATABASE_URL ||= 'postgresql://test:test@127.0.0.1:5432/test';
const { authorizeRoles } = require('../middleware/auth');

test('verification decision role guard rejects unauthorized users with 403', () => {
  let statusCode = null;
  let payload = null;
  const middleware = authorizeRoles(['admin', 'safety_inspector']);
  middleware(
    { user: { role: 'landlord' } },
    {
      status(code) { statusCode = code; return this; },
      json(value) { payload = value; return this; },
    },
    () => assert.fail('Unauthorized request called next().')
  );
  assert.equal(statusCode, 403);
  assert.match(payload.error, /permission/i);
});