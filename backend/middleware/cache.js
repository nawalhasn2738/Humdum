const { getCachedJson, setCachedJson } = require('../services/cache.service');

function createCacheKey(namespace, originalUrl) {
  const url = new URL(originalUrl, 'http://localhost');
  const sortedParameters = [...url.searchParams.entries()].sort(([a], [b]) =>
    a.localeCompare(b)
  );
  const query = new URLSearchParams(sortedParameters).toString();
  return `cache:${namespace}:${url.pathname}${query ? `?${query}` : ''}`;
}

function cacheResponse({ namespace, ttlSeconds }) {
  return async (req, res, next) => {
    const key = createCacheKey(namespace, req.originalUrl);
    const cached = await getCachedJson(key);

    if (cached !== null) {
      res.set('X-Cache', 'HIT');
      return res.json(cached);
    }

    const originalJson = res.json.bind(res);
    res.json = (body) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        setCachedJson(key, body, ttlSeconds).catch((error) => {
          console.error('Deferred cache write failed:', error.message);
        });
      }

      res.set('X-Cache', 'MISS');
      return originalJson(body);
    };

    return next();
  };
}

module.exports = { cacheResponse, createCacheKey };

