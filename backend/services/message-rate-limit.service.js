const { getRedisClient } = require('../config/redis');

const USER_LIMIT = Number(process.env.MESSAGE_RATE_LIMIT_USER_MAX) || 30;
const USER_WINDOW_SECONDS = Number(process.env.MESSAGE_RATE_LIMIT_USER_WINDOW_SECONDS) || 60;
const CONVERSATION_LIMIT = Number(process.env.MESSAGE_RATE_LIMIT_CONVERSATION_MAX) || 10;
const CONVERSATION_WINDOW_SECONDS = Number(process.env.MESSAGE_RATE_LIMIT_CONVERSATION_WINDOW_SECONDS) || 10;
const fallbackWindows = new Map();
const MAX_FALLBACK_KEYS = 10000;
let lastFallbackWarningAt = 0;

function canonicalConversationKey({ listingId, senderId, receiverId }) {
  const participants = [String(senderId), String(receiverId)].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
  return `${listingId}:${participants[0]}:${participants[1]}`;
}

function consumeFallback(key, limit, windowSeconds, now = Date.now()) {
  const current = fallbackWindows.get(key);
  if (!current || current.expiresAt <= now) {
    if (fallbackWindows.size >= MAX_FALLBACK_KEYS && !fallbackWindows.has(key)) {
      for (const [storedKey, value] of fallbackWindows) {
        if (value.expiresAt <= now) fallbackWindows.delete(storedKey);
      }
      if (fallbackWindows.size >= MAX_FALLBACK_KEYS) {
        fallbackWindows.delete(fallbackWindows.keys().next().value);
      }
    }
    fallbackWindows.set(key, { count: 1, expiresAt: now + windowSeconds * 1000 });
    return { allowed: true, retryAfterSeconds: windowSeconds };
  }
  current.count += 1;
  return { allowed: current.count <= limit, retryAfterSeconds: Math.max(1, Math.ceil((current.expiresAt - now) / 1000)) };
}

async function consumeRedis(redis, key, limit, windowSeconds) {
  const result = await redis.eval(
    `local count = redis.call('INCR', KEYS[1])
     if count == 1 then redis.call('EXPIRE', KEYS[1], ARGV[1]) end
     local ttl = redis.call('TTL', KEYS[1])
     return {count, ttl}`,
    { keys: [key], arguments: [String(windowSeconds)] }
  );
  return { allowed: Number(result[0]) <= limit, retryAfterSeconds: Math.max(1, Number(result[1])) };
}

async function checkMessageRateLimit({ senderId, receiverId, listingId, redisClient, now }) {
  const checks = [
    { key: `message-rate:user:${senderId}`, limit: USER_LIMIT, window: USER_WINDOW_SECONDS },
    { key: `message-rate:conversation:${canonicalConversationKey({ listingId, senderId, receiverId })}`, limit: CONVERSATION_LIMIT, window: CONVERSATION_WINDOW_SECONDS },
  ];
  let redis = redisClient;
  if (redis === undefined) redis = await getRedisClient();
  let mode = 'redis';
  let results;
  try {
    if (!redis) throw new Error('Redis unavailable');
    results = await Promise.all(checks.map((item) => consumeRedis(redis, item.key, item.limit, item.window)));
  } catch (error) {
    mode = 'memory';
    const warningTime = now ?? Date.now();
    if (warningTime - lastFallbackWarningAt >= 60000) {
      console.warn('Message rate limiter using in-memory fallback:', error.message);
      lastFallbackWarningAt = warningTime;
    }
    results = checks.map((item) => consumeFallback(item.key, item.limit, item.window, now));
  }
  const denied = results.filter((result) => !result.allowed);
  return { allowed: denied.length === 0, retryAfterSeconds: denied.length ? Math.max(...denied.map((result) => result.retryAfterSeconds)) : 0, mode };
}

function resetMessageRateLimitFallback() { fallbackWindows.clear(); lastFallbackWarningAt = 0; }
module.exports = { canonicalConversationKey, checkMessageRateLimit, resetMessageRateLimitFallback };
