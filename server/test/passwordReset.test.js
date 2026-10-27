const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const PasswordReset = require('../models/PasswordReset');
const {
  RESET_TOKEN_TTL_MS,
  MIN_PASSWORD_LENGTH,
  normalizeEmail,
  isValidEmail,
  createResetToken,
  hashResetToken,
  isValidResetToken,
  isValidPassword,
} = require('../utils/passwordReset');
const rateLimit = require('../middleware/passwordResetRateLimit');

test('reset tokens are cryptographically generated, format checked, and only hashes are represented by the model', () => {
  const token = createResetToken();
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.notEqual(hashResetToken(token), token);
  assert.equal(hashResetToken(token), hashResetToken(token));
  assert.equal(isValidResetToken(token), true);
  assert.equal(isValidResetToken('bad'), false);
  assert.equal(PasswordReset.schema.path('tokenHash').options.select, false);
  assert.equal(PasswordReset.schema.path('token'), undefined);
  assert.equal(PasswordReset.schema.path('userId').options.unique, true);
  assert.equal(RESET_TOKEN_TTL_MS, 30 * 60 * 1000);
});

test('reset email and password inputs are normalized and validated', () => {
  assert.equal(normalizeEmail('  PERSON@Example.com '), 'person@example.com');
  assert.equal(isValidEmail('person@example.com'), true);
  assert.equal(isValidEmail('bad-address'), false);
  assert.equal(MIN_PASSWORD_LENGTH, 8);
  assert.equal(isValidPassword('12345678'), true);
  assert.equal(isValidPassword('1234567'), false);
  assert.equal(isValidPassword('x'.repeat(129)), false);
});

test('reset rate limit applies separate IP and normalized-email windows', () => {
  rateLimit._resetForTests();
  const invoke = (email, ip = '203.0.113.1') => {
    let status;
    let continued = false;
    const req = { ip, body: { email } };
    const res = { status(value) { status = value; return this; }, json() { return this; } };
    rateLimit(req, res, () => { continued = true; });
    return { status, continued };
  };
  for (let i = 0; i < 3; i += 1) assert.equal(invoke('A@example.com').continued, true);
  assert.equal(invoke(' a@EXAMPLE.com ').status, 429);
  for (let i = 0; i < 2; i += 1) assert.equal(invoke(`person${i}@example.com`, '203.0.113.2').continued, true);
  assert.equal(invoke('person2@example.com', '203.0.113.2').continued, true);
  assert.equal(invoke('person3@example.com', '203.0.113.2').continued, true);
  assert.equal(invoke('person4@example.com', '203.0.113.2').continued, true);
  assert.equal(invoke('person5@example.com', '203.0.113.2').status, 429);
  rateLimit._resetForTests();
});

test('password reset records have explicit expiry and single-use state fields', async () => {
  const reset = new PasswordReset({ userId: new mongoose.Types.ObjectId(), tokenHash: hashResetToken(createResetToken()), expiresAt: new Date(Date.now() + RESET_TOKEN_TTL_MS) });
  await reset.validate();
  assert.equal(reset.state, 'active');
  assert.equal(reset.tokenHash.length, 64);
});

test('JWT middleware keeps legacy version-zero sessions and rejects sessions after a reset', async () => {
  process.env.JWT_SECRET = 'test-only-secret';
  const jwt = require('jsonwebtoken');
  const User = require('../models/User');
  const { protect } = require('../middleware/auth');
  const originalFindById = User.findById;
  const originalVersion = User.schema.path('tokenVersion').options.default;
  try {
    User.findById = () => ({ select: async () => ({ _id: 'user-id', role: 'user', tokenVersion: 0 }) });
    const invoke = async (claims, version) => {
      User.findById = () => ({ select: async () => ({ _id: 'user-id', role: 'user', tokenVersion: version }) });
      const req = { headers: { authorization: `Bearer ${jwt.sign({ id: 'user-id', role: 'user', ...claims }, process.env.JWT_SECRET)}` } };
      let status;
      let continued = false;
      const res = { status(value) { status = value; return this; }, json() { return this; } };
      await protect(req, res, () => { continued = true; });
      return { status, continued };
    };
    assert.equal((await invoke({}, 0)).continued, true);
    assert.equal((await invoke({}, 1)).status, 401);
    assert.equal((await invoke({ tokenVersion: 1 }, 1)).continued, true);
    assert.equal((await invoke({ tokenVersion: 0 }, 1)).status, 401);
  } finally {
    User.findById = originalFindById;
    User.schema.path('tokenVersion').options.default = originalVersion;
  }
});
