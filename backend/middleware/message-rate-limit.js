const { checkMessageRateLimit } = require('../services/message-rate-limit.service');

function createMessageRateLimit(checkLimit = checkMessageRateLimit) {
  return async function messageRateLimit(req, res, next) {
    const senderId = req.user?.profileId;
    const listingId = req.body?.listingId ?? req.body?.listing_id;
    const receiverId = req.body?.receiverId ?? req.body?.receiver_id;
    if (!senderId || !listingId || !receiverId) return next();
    try {
      const result = await checkLimit({ senderId, receiverId, listingId });
      if (!result.allowed) {
        res.set('Retry-After', String(result.retryAfterSeconds));
        return res.status(429).json({ error: 'Message rate limit exceeded.', code: 'MESSAGE_RATE_LIMITED', retryAfterSeconds: result.retryAfterSeconds });
      }
      return next();
    } catch (error) {
      console.error('Message rate limiter failed unexpectedly:', error.message);
      return next();
    }
  };
}
const messageRateLimit = createMessageRateLimit();
module.exports = { createMessageRateLimit, messageRateLimit };
