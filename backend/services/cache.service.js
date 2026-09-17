const { getRedisClient } = require('../config/redis');

async function getCachedJson(key) {
  try {
    const client = await getRedisClient();
    const value = client ? await client.get(key) : null;
    return value ? JSON.parse(value) : null;
  } catch (error) {
    console.error('Cache read failed:', error.message);
    return null;
  }
}

async function setCachedJson(key, value, ttlSeconds) {
  try {
    const client = await getRedisClient();

    if (client) {
      await client.setEx(key, ttlSeconds, JSON.stringify(value));
    }
  } catch (error) {
    console.error('Cache write failed:', error.message);
  }
}

async function invalidateCachePattern(pattern) {
  try {
    const client = await getRedisClient();

    if (!client) {
      return 0;
    }

    let deleted = 0;
    for await (const result of client.scanIterator({ MATCH: pattern, COUNT: 100 })) {
      const keys = Array.isArray(result) ? result : [result];

      if (keys.length > 0) {
        deleted += await client.del(keys);
      }
    }

    return deleted;
  } catch (error) {
    console.error('Cache invalidation failed:', error.message);
    return 0;
  }
}

module.exports = { getCachedJson, invalidateCachePattern, setCachedJson };
