const WINDOW_MS = 15 * 60 * 1000;
const IP_LIMIT = 5;
const EMAIL_LIMIT = 3;
const MAX_BUCKETS = 10000;
const buckets = new Map();

function consume(key, limit, now = Date.now()) {
  let bucket = buckets.get(key);
  if (!bucket || bucket.until <= now) bucket = { count: 0, until: now + WINDOW_MS };
  bucket.count += 1;
  buckets.delete(key);
  buckets.set(key, bucket);
  while (buckets.size > MAX_BUCKETS) buckets.delete(buckets.keys().next().value);
  return bucket.count <= limit;
}

function resetRequestRateLimit(req, res, next) {
  const ip = req.ip || req.socket?.remoteAddress || 'unknown';
  const email = typeof req.body?.email === 'string' ? req.body.email.trim().toLowerCase() : '';
  const now = Date.now();
  if (!consume(`ip:${ip}`, IP_LIMIT, now) || (email && !consume(`email:${email}`, EMAIL_LIMIT, now))) {
    return res.status(429).json({ message: 'Too many password reset requests. Please try again later.' });
  }
  next();
}

resetRequestRateLimit._resetForTests = () => buckets.clear();
module.exports = resetRequestRateLimit;
