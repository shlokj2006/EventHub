const crypto = require('node:crypto');

const generateOtp = (randomInt = crypto.randomInt) =>
  randomInt(1_000_000).toString().padStart(6, '0');

module.exports = { generateOtp };
