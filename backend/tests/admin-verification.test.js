const test = require('node:test');
const assert = require('node:assert/strict');
const { parseQueueParams } = require('../services/admin-verification.service');

test('normalizes verification queue pagination and status', () => {
  assert.deepEqual(parseQueueParams({ status: 'approved', page: '2', limit: '25' }), {
    value: { status: 'approved', page: 2, limit: 25, offset: 25 },
  });
});

test('rejects invalid queue filters and unbounded pages', () => {
  const result = parseQueueParams({ status: 'unknown', page: '0', limit: '101' });
  assert.ok(result.errors.status);
  assert.ok(result.errors.page);
  assert.ok(result.errors.limit);
});