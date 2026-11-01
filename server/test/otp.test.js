const test = require('node:test');
const assert = require('node:assert/strict');
const { generateOtp } = require('../utils/otp');

test('OTP generation always returns six decimal digits and preserves leading zeroes', () => {
  assert.equal(generateOtp(() => 42), '000042');
  assert.equal(generateOtp(() => 999_999), '999999');
  for (let index = 0; index < 500; index += 1) {
    assert.match(generateOtp(), /^\d{6}$/);
  }
});
