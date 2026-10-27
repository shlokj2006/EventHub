const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const state = { user: null, otpRecords: [], sent: [], failMail: false };
const fakeUser = {
  findOne: async ({ email }) => state.user?.email === email ? state.user : null,
  create: async (user) => {
    state.user = { ...user, _id: 'user-1', id: 'user-1' };
    return state.user;
  },
};
const fakeOtp = {
  findOneAndDelete: async ({ email, action }) => {
    state.otpRecords = state.otpRecords.filter((entry) => entry.email !== email || entry.action !== action);
  },
  create: async (entry) => { state.otpRecords.push(entry); return entry; },
};
const fakeBcrypt = {
  genSalt: async () => 'test-salt',
  hash: async (password) => `hash:${password}`,
  compare: async (password, hash) => hash === `hash:${password}`,
};
const fakeEmail = {
  sendOTPEmail: async (email, otp, type) => {
    if (state.failMail) throw Object.assign(new Error('provider error with details'), { code: 'EAUTH' });
    state.sent.push({ email, otp, type });
  },
  sendPasswordResetEmail: async () => {},
  sendPasswordResetSuccessEmail: async () => {},
  safeEmailErrorCode: (error) => /^[A-Z0-9_-]{1,40}$/i.test(error?.code || '') ? error.code : 'EMAIL_DELIVERY_FAILED',
};

const originalLoad = Module._load;
Module._load = function mockAuthEmailDependencies(request, parent, isMain) {
  if (request === '../models/User') return fakeUser;
  if (request === '../models/OTP') return fakeOtp;
  if (request === 'bcryptjs') return fakeBcrypt;
  if (request === '../utils/email') return fakeEmail;
  return originalLoad.call(this, request, parent, isMain);
};
const authController = require('../controllers/authController');
Module._load = originalLoad;

const call = async (handler, body) => {
  let status = 200;
  let response;
  const res = {
    status(code) { status = code; return this; },
    json(data) { response = data; return this; },
  };
  await handler({ body }, res);
  return { status, body: response };
};
const resetState = () => {
  state.user = null;
  state.otpRecords = [];
  state.sent = [];
  state.failMail = false;
};

test('signup reports delivery failure without exposing provider details and keeps one retryable account', async () => {
  resetState();
  state.failMail = true;
  const response = await call(authController.register, {
    name: 'Test User', email: 'person@example.test', password: 'test-password', role: 'admin',
  });
  assert.equal(response.status, 503);
  assert.match(response.body.message, /account was created/i);
  assert.doesNotMatch(JSON.stringify(response.body), /EAUTH|provider error|password|person@example/);
  assert.equal(state.user.role, 'user');
  assert.equal(state.user.isVerified, false);
  assert.equal(state.otpRecords.length, 1);
  assert.equal(state.sent.length, 0);

  state.failMail = false;
  const retry = await call(authController.login, { email: 'person@example.test', password: 'test-password' });
  assert.equal(retry.status, 403);
  assert.equal(retry.body.needsVerification, true);
  assert.equal(state.otpRecords.length, 1);
  assert.equal(state.sent.length, 1);
  assert.equal(state.sent[0].type, 'account_verification');
});

test('login does not report an OTP as sent when the mail transport rejects it', async () => {
  resetState();
  state.user = {
    _id: 'user-2', id: 'user-2', email: 'person@example.test', password: 'hash:test-password',
    role: 'user', isVerified: false,
  };
  state.failMail = true;
  const response = await call(authController.login, { email: 'person@example.test', password: 'test-password' });
  assert.equal(response.status, 503);
  assert.match(response.body.message, /could not be sent/i);
  assert.doesNotMatch(JSON.stringify(response.body), /EAUTH|provider error/);
  assert.equal(state.otpRecords.length, 1);
  assert.equal(state.sent.length, 0);
});

test('signup success sends the verification OTP before returning success', async () => {
  resetState();
  const response = await call(authController.register, {
    name: 'Test User', email: 'person@example.test', password: 'test-password',
  });
  assert.equal(response.status, 201);
  assert.match(response.body.message, /OTP sent/i);
  assert.equal(state.sent.length, 1);
  assert.equal(state.sent[0].email, 'person@example.test');
  assert.equal(state.otpRecords[0].otp, state.sent[0].otp);
});