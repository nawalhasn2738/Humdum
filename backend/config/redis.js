const { createClient } = require('redis');

let client;
let connectPromise;
let warnedMissingUrl = false;

function createRedisClient() {
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    if (!warnedMissingUrl) {
      console.warn('REDIS_URL is not configured; caching is disabled.');
      warnedMissingUrl = true;
    }
    return null;
  }

  const redisClient = createClient({
    url: redisUrl,
    socket: {
      connectTimeout: 1500,
      reconnectStrategy(retries) {
        if (retries >= 3) {
          return false;
        }

        return Math.min(100 * 2 ** retries, 1000) + Math.floor(Math.random() * 100);
      },
    },
  });

  redisClient.on('error', (error) => {
    console.error('Redis cache error:', error.message);
  });
  redisClient.on('reconnecting', () => {
    console.warn('Redis cache connection is reconnecting.');
  });

  return redisClient;
}

async function getRedisClient() {
  if (!client) {
    client = createRedisClient();
  }

  if (!client) {
    return null;
  }

  if (client.isReady) {
    return client;
  }

  if (client.isOpen) {
    return null;
  }

  if (!connectPromise) {
    connectPromise = client.connect().finally(() => {
      connectPromise = null;
    });
  }

  try {
    await connectPromise;
    return client.isReady ? client : null;
  } catch (error) {
    console.error('Redis cache connection failed:', error.message);
    return null;
  }
}

async function closeRedis() {
  if (client?.isOpen) {
    await client.close();
  }
}

module.exports = { closeRedis, getRedisClient };

