const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const captured = { users: [], resetRecords: [], sent: [], shouldFailEmail: false, account: null, resetRecord: null };
const fakeUser = {
  find: () => ({ limit: async () => captured.users }),
  findById: async (id) => captured.account && String(captured.account._id) === String(id) ? captured.account : null,
  findOne: async (query) => captured.account && captured.account.passwordResetOperationId === query.passwordResetOperationId ? captured.account : null,
  findOneAndUpdate: async (_query, update) => {
    if (!captured.account) return null;
    Object.assign(captured.account, update.$set || {});
    if (update.$inc?.tokenVersion) captured.account.tokenVersion = (captured.account.tokenVersion || 0) + update.$inc.tokenVersion;
    return captured.account;
  },
  exists: async (query) => captured.account && captured.account.passwordResetOperationId === query.passwordResetOperationId ? captured.account : null,
};
const fakeReset = {
  createIndexes: async () => {},
  findOneAndUpdate: (query, update) => {
    if (query.tokenHash) {
      if (!captured.resetRecord || captured.resetRecord.tokenHash !== query.tokenHash || captured.resetRecord.state !== 'active' || captured.resetRecord.expiresAt <= query.expiresAt.$gt) {
        return { select: async () => null };
      }
      Object.assign(captured.resetRecord, update.$set);
      return { select: async () => captured.resetRecord };
    }
    const record = { ...update.$set };
    captured.resetRecords.push(record);
    captured.resetRecord = { userId: 'user-1', ...record, state: 'active' };
    return { select: async () => record };
  },
  findOne: (query) => ({ select: async () => captured.resetRecord?.tokenHash === query.tokenHash && captured.resetRecord.state === query.state ? captured.resetRecord : null }),
  updateMany: async () => ({}),
  updateOne: async () => ({}),
};
const fakeEmail = {
  sendOTPEmail: async () => {},
  safeEmailErrorCode: (error) => /^[A-Z0-9_-]{1,40}$/i.test(error?.code || '') ? error.code : 'EMAIL_DELIVERY_FAILED',
  sendPasswordResetEmail: async (email, url) => {
    if (captured.shouldFailEmail) throw new Error('mail unavailable');
    captured.sent.push({ email, url });
  },
  sendPasswordResetSuccessEmail: async () => {},
};

const originalLoad = Module._load;
Module._load = function loadWithAuthMocks(request, parent, isMain) {
  if (request === '../models/User') return fakeUser;
  if (request === '../models/OTP') return {};
  if (request === '../models/PasswordReset') return fakeReset;
  if (request === '../utils/email') return fakeEmail;
  return originalLoad.call(this, request, parent, isMain);
};
const authController = require('../controllers/authController');
Module._load = originalLoad;

function request(email) {
  let status = 200;
  let body;
  const res = {
    status(value) { status = value; return this; },
    json(value) { body = value; return this; },
  };
  return authController.forgotPassword({ body: { email } }, res).then(() => ({ status, body }));
}

function resetRequest(body) {
  let status = 200;
  let responseBody;
  const res = { status(value) { status = value; return this; }, json(value) { responseBody = value; return this; } };
  return authController.resetPassword({ body }, res).then(() => ({ status, body: responseBody }));
}

function installResetRecord({ expiresAt = new Date(Date.now() + 60_000), state = 'active' } = {}) {
  const { createResetToken, hashResetToken } = require('../utils/passwordReset');
  const token = createResetToken();
  captured.account = { _id: 'account-1', email: 'person@example.com', password: 'old-password-hash', tokenVersion: 0 };
  captured.resetRecord = {
    _id: 'reset-1', userId: 'account-1', tokenHash: hashResetToken(token), expiresAt, state,
    save: async function save() { return this; },
  };
  return token;
}

test('forgot-password gives matching generic replies for unknown and existing addresses and persists no raw token', async () => {
  captured.users = [];
  captured.resetRecords = [];
  captured.sent = [];
  captured.shouldFailEmail = false;
  const unknown = await request('missing@example.com');

  captured.users = [{ _id: 'user-1', email: 'person@example.com' }];
  const existing = await request(' PERSON@example.com ');

  assert.deepEqual(existing, unknown);
  assert.equal(captured.sent.length, 1);
  assert.equal(captured.resetRecords.length, 1);
  const token = new URLSearchParams(new URL(captured.sent[0].url).hash.slice(1)).get('token');
  assert.match(token, /^[a-f0-9]{64}$/);
  assert.equal(captured.resetRecords[0].tokenHash.length, 64);
  assert.notEqual(captured.resetRecords[0].tokenHash, token);
  assert.equal(Object.hasOwn(captured.resetRecords[0], 'token'), false);
});

test('forgot-password reports a generic failure when reset email delivery fails', async () => {
  captured.users = [{ _id: 'user-2', email: 'person@example.com' }];
  captured.shouldFailEmail = true;
  const result = await request('person@example.com');
  assert.equal(result.status, 503);
  assert.doesNotMatch(JSON.stringify(result.body), /person@example.com|user-2/);
  captured.shouldFailEmail = false;
});

test('reset rejects malformed, expired, consumed, and mismatched requests without claiming a token', async () => {
  const token = installResetRecord();
  assert.equal((await resetRequest({ token: 'bad', password: 'long-enough', confirmPassword: 'long-enough' })).status, 400);
  assert.equal((await resetRequest({ token, password: 'short', confirmPassword: 'short' })).status, 400);
  assert.equal((await resetRequest({ token, password: 'long-enough', confirmPassword: 'different' })).status, 400);
  assert.equal(captured.resetRecord.state, 'active');
  const expiredToken = installResetRecord({ expiresAt: new Date(Date.now() - 1000) });
  assert.equal((await resetRequest({ token: expiredToken, password: 'long-enough', confirmPassword: 'long-enough' })).status, 400);
  const consumedToken = installResetRecord({ state: 'consumed' });
  assert.equal((await resetRequest({ token: consumedToken, password: 'long-enough', confirmPassword: 'long-enough' })).status, 400);
});

test('a successful reset changes the bcrypt password, consumes the token, and invalidates old JWT versions', async () => {
  const bcrypt = require('bcryptjs');
  const token = installResetRecord();
  captured.account.password = await bcrypt.hash('old-password', 10);
  const result = await resetRequest({ token, password: 'new-password-8', confirmPassword: 'new-password-8' });
  assert.equal(result.status, 200);
  assert.equal(captured.resetRecord.state, 'consumed');
  assert.equal(await bcrypt.compare('new-password-8', captured.account.password), true);
  assert.equal(await bcrypt.compare('old-password', captured.account.password), false);
  assert.equal(captured.account.tokenVersion, 1);
  assert.equal((await resetRequest({ token, password: 'another-password-8', confirmPassword: 'another-password-8' })).status, 400);
});

test('only one simultaneous reset request can claim a token', async () => {
  const token = installResetRecord();
  const responses = await Promise.all([
    resetRequest({ token, password: 'one-password-8', confirmPassword: 'one-password-8' }),
    resetRequest({ token, password: 'two-password-8', confirmPassword: 'two-password-8' }),
  ]);
  assert.equal(responses.filter((response) => response.status === 200).length, 1);
  assert.equal(responses.filter((response) => response.status === 400).length, 1);
  assert.equal(captured.account.tokenVersion, 1);
});
