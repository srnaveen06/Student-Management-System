// Simple in-memory sliding-window rate limiter for AI endpoints. Per-user
// limits come from aiConfig (AI_RATE_LIMIT_REQUESTS / AI_RATE_LIMIT_WINDOW).

const aiConfig = require('../ai/config');

const buckets = new Map(); // key -> number[]

function cleanup() {
  const now = Date.now();
  for (const [key, times] of buckets) {
    while (times.length && now - times[0] > aiConfig.rateLimitWindow * 1000) times.shift();
    if (!times.length) buckets.delete(key);
  }
}

function rateLimit(key) {
  cleanup();
  const now = Date.now();
  const times = buckets.get(key) || [];
  if (times.length >= aiConfig.rateLimitRequests) {
    return { limited: true, retryAfterSec: Math.ceil((times[0] + aiConfig.rateLimitWindow * 1000 - now) / 1000) };
  }
  times.push(now);
  buckets.set(key, times);
  return { limited: false };
}

function aiRateLimiter(req, res, next) {
  if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
  const key = `ai:${req.user.id}`;
  const r = rateLimit(key);
  if (r.limited) {
    return res.status(429).json({ error: 'Rate limit exceeded. Please wait a moment.', retryAfterSec: r.retryAfterSec });
  }
  next();
}

module.exports = { aiRateLimiter, rateLimit };
