const crypto = require('crypto');
const { getCachedJson, setCachedJson } = require('./cache.service');
const { createGoogleRoutesProvider } = require('./google-routes.provider');

const ROUTE_CACHE_SECONDS = Number(process.env.ROUTE_CACHE_SECONDS) || 900;
function roundedPoint(point) { return { latitude: Math.round(point.latitude * 1000) / 1000, longitude: Math.round(point.longitude * 1000) / 1000 }; }
function departureBucket(now = new Date()) { return new Date(Math.floor(now.getTime() / 900000) * 900000).toISOString(); }
function routeCacheKey(input) { return 'cache:commute:' + crypto.createHash('sha256').update(JSON.stringify(input)).digest('hex'); }

async function estimateCommute({ origin, destination, modes, now = new Date(), provider = createGoogleRoutesProvider(), cache = { get: getCachedJson, set: setCachedJson } }) {
  const safeOrigin = roundedPoint(origin);
  const bucket = departureBucket(now);
  const cacheInput = { provider: provider.name, origin: safeOrigin, destination, modes: [...modes].sort(), bucket };
  const key = routeCacheKey(cacheInput);
  const cached = await cache.get(key);
  if (cached) return { ...cached, cache: 'hit' };

  const settled = await Promise.allSettled(modes.map((mode) => provider.estimate({ origin: safeOrigin, destination, mode, departureTime: bucket })));
  const estimates = settled.map((result, index) => result.status === 'fulfilled'
    ? result.value
    : { mode: modes[index], status: 'unavailable', reason: result.reason?.code === 'ROUTING_NOT_CONFIGURED' ? 'Commute estimates are not configured.' : 'The routing provider is temporarily unavailable.' });
  if (settled.every((result) => result.status === 'rejected')) {
    const firstError = settled[0].reason;
    const error = new Error(firstError?.code === 'ROUTING_NOT_CONFIGURED' ? 'Commute estimates are not configured.' : 'The routing provider is temporarily unavailable.');
    error.code = firstError?.code === 'ROUTING_NOT_CONFIGURED' ? 'ROUTING_NOT_CONFIGURED' : 'ROUTING_PROVIDER_FAILURE';
    throw error;
  }
  const response = { provider: provider.name, departureTime: bucket, estimates, cache: 'miss', disclaimer: 'Planning estimates only. Transit is schedule-based and is not presented as real-time. Walking routes may omit some pedestrian conditions.' };
  await cache.set(key, response, ROUTE_CACHE_SECONDS);
  return response;
}

module.exports = { ROUTE_CACHE_SECONDS, departureBucket, estimateCommute, routeCacheKey, roundedPoint };
