const test = require('node:test');
const assert = require('node:assert/strict');
const { createMessageRateLimit } = require('../middleware/message-rate-limit');
const { canSendMessage } = require('../services/conversation-policy.service');
const { canonicalConversationKey, checkMessageRateLimit, resetMessageRateLimitFallback } = require('../services/message-rate-limit.service');

function fakeRedis() {
  const counts = new Map();
  return { async eval(_script, options) { const key = options.keys[0]; const count = (counts.get(key) || 0) + 1; counts.set(key, count); return [count, Number(options.arguments[0])]; } };
}

test('normal messages remain below both limits', async () => {
  const result = await checkMessageRateLimit({ senderId: 1, receiverId: 2, listingId: 3, redisClient: fakeRedis() });
  assert.equal(result.allowed, true);
  assert.equal(result.mode, 'redis');
});

test('rapid repeated messages exceed the per-conversation limit', async () => {
  const redisClient = fakeRedis();
  let result;
  for (let index = 0; index < 11; index += 1) result = await checkMessageRateLimit({ senderId: 1, receiverId: 2, listingId: 3, redisClient });
  assert.equal(result.allowed, false);
  assert.equal(result.retryAfterSeconds, 10);
});

test('participant order cannot create a different conversation bucket', () => {
  assert.equal(canonicalConversationKey({ listingId: 9, senderId: 2, receiverId: 1 }), canonicalConversationKey({ listingId: 9, senderId: 1, receiverId: 2 }));
});

test('rate limit middleware returns predictable 429 response', async () => {
  const middleware = createMessageRateLimit(async () => ({ allowed: false, retryAfterSeconds: 7 }));
  const response = { headers: {}, set(name, value) { this.headers[name] = value; }, status(value) { this.statusCode = value; return this; }, json(value) { this.body = value; return this; } };
  await middleware({ user: { profileId: '5' }, body: { listingId: '8', receiverId: '9' } }, response, () => assert.fail('next must not run'));
  assert.equal(response.statusCode, 429);
  assert.equal(response.headers['Retry-After'], '7');
  assert.deepEqual(response.body, { error: 'Message rate limit exceeded.', code: 'MESSAGE_RATE_LIMITED', retryAfterSeconds: 7 });
});

test('Redis unavailable uses process-local fallback and still limits', async () => {
  resetMessageRateLimitFallback();
  let result;
  for (let index = 0; index < 11; index += 1) result = await checkMessageRateLimit({ senderId: 11, receiverId: 12, listingId: 13, redisClient: null, now: 1000 });
  assert.equal(result.allowed, false);
  assert.equal(result.mode, 'memory');
});

test('unrelated users cannot start an unauthorized conversation', () => {
  assert.equal(canSendMessage({ actorRole: 'tenant', existingConversation: false, activeInquiry: false, verifiedRelationship: false }), false);
  assert.equal(canSendMessage({ actorRole: 'tenant', existingConversation: false, activeInquiry: true, verifiedRelationship: false }), true);
  assert.equal(canSendMessage({ actorRole: 'landlord', existingConversation: true, activeInquiry: false, verifiedRelationship: false }), true);
});
