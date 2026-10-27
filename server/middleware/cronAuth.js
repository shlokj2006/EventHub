const { timingSafeEqual } = require('crypto');

const cronAuth = (req, res, next) => {
  const secret = process.env.CRON_SECRET;
  const authorization = req.get('authorization') || '';
  const expected = secret ? `Bearer ${secret}` : '';
  const suppliedBuffer = Buffer.from(authorization);
  const expectedBuffer = Buffer.from(expected);

  if (!secret || secret.length < 16) {
    return res.status(503).json({ message: 'Reservation maintenance is unavailable' });
  }

  if (
    suppliedBuffer.length !== expectedBuffer.length ||
    !timingSafeEqual(suppliedBuffer, expectedBuffer)
  ) {
    return res.status(401).json({ message: 'Reservation maintenance is unavailable' });
  }

  next();
};

module.exports = cronAuth;
