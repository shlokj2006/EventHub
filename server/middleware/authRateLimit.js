const crypto = require('node:crypto');

const WINDOW_MS = 15 * 60 * 1000;
const MAX_BUCKETS = 20_000;

const createRateLimiter = ({ scope, ipLimit, accountLimit, windowMs = WINDOW_MS, now = Date.now }) => {
  const buckets = new Map();

  const consume = (key, limit, currentTime) => {
    let bucket = buckets.get(key);
    if (!bucket || bucket.until <= currentTime) bucket = { count: 0, until: currentTime + windowMs };
    bucket.count += 1;
    buckets.delete(key);
    buckets.set(key, bucket);
    while (buckets.size > MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
    return { allowed: bucket.count <= limit, retryAfter: Math.max(1, Math.ceil((bucket.until - currentTime) / 1000)) };
  };

  const middleware = (req, res, next) => {
    const currentTime = now();
    const ip = req.ip || req.socket?.remoteAddress || 'unknown';
   const rawAccount = req.user
  ? (typeof req.user.email === 'string'
      ? req.user.email.trim().toLowerCase()
      : '')
  : (typeof req.body?.email === 'string'
      ? req.body.email.trim().toLowerCase()
      : '');
    const ipResult = consume(`ip:${scope}:${ip}`, ipLimit, currentTime);
    const accountHash = rawAccount ? crypto.createHash('sha256').update(rawAccount).digest('hex') : null;
    const accountResult = accountHash
      ? consume(`account:${scope}:${accountHash}`, accountLimit, currentTime)
      : { allowed: true, retryAfter: 1 };

    if (!ipResult.allowed || !accountResult.allowed) {
      const retryAfter = Math.max(!ipResult.allowed ? ipResult.retryAfter : 0, !accountResult.allowed ? accountResult.retryAfter : 0);
      res.set?.('Retry-After', String(retryAfter));
      return res.status(429).json({ message: 'Too many requests. Please wait before trying again.' });
    }
    return next();
  };

  middleware._resetForTests = () => buckets.clear();
  return middleware;
};

const loginRateLimit = createRateLimiter({ scope: 'login', ipLimit: 60, accountLimit: 10 });
const signupRateLimit = createRateLimiter({ scope: 'signup', ipLimit: 30, accountLimit: 5 });
const otpSendRateLimit = createRateLimiter({ scope: 'otp-send', ipLimit: 30, accountLimit: 5 });
const otpVerifyRateLimit = createRateLimiter({ scope: 'otp-verify', ipLimit: 60, accountLimit: 10 });

module.exports = { createRateLimiter, loginRateLimit, signupRateLimit, otpSendRateLimit, otpVerifyRateLimit };
