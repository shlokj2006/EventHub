const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const state = { otp: null, user: null };
const fakeOtp = {
  findOneAndDelete: async (query) => {
    const otp = state.otp;
    if (!otp || otp.email !== query.email || otp.otp !== query.otp || otp.action !== query.action || otp.createdAt <= query.createdAt.$gt) return null;
    state.otp = null;
    return otp;
  },
};
const fakeUser = {
  findOneAndUpdate: async ({ email }, update) => {
    if (!state.user || state.user.email !== email) return null;
    Object.assign(state.user, update.$set || update);
    return state.user;
  },
};
const originalLoad = Module._load;
Module._load = function loadAuthOtpMocks(request, parent, isMain) {
  if (request === '../models/User') return fakeUser;
  if (request === '../models/OTP') return fakeOtp;
  if (request === '../models/PasswordReset') return {};
  if (request === '../utils/email') return {
    sendOTPEmail: async () => {},
    sendPasswordResetEmail: async () => {},
    sendPasswordResetSuccessEmail: async () => {},
    safeEmailErrorCode: () => 'EMAIL_DELIVERY_FAILED',
  };
  return originalLoad.call(this, request, parent, isMain);
};
const controller = require('../controllers/authController');
Module._load = originalLoad;

const invoke = (body) => {
  let status = 200;
  let response;
  const res = { status(code) { status = code; return this; }, json(value) { response = value; return this; } };
  return controller.verifyOTP({ body }, res).then(() => ({ status, body: response }));
};

test('expired account OTPs cannot verify an account', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-auth-otp-secret';
  state.user = { id: 'user-1', email: 'person@example.test', role: 'user', tokenVersion: 0, isVerified: false };
  state.otp = { _id: 'otp-1', email: state.user.email, otp: '123456', action: 'account_verification', createdAt: new Date(Date.now() - 5 * 60 * 1000 - 1) };
  try {
    const result = await invoke({ email: state.user.email, otp: '123456' });
    assert.equal(result.status, 400);
    assert.equal(state.user.isVerified, false);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('one account OTP cannot be consumed successfully twice in concurrent requests', async () => {
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-auth-otp-secret';
  state.user = { id: 'user-2', email: 'person@example.test', role: 'user', tokenVersion: 0, isVerified: false };
  state.otp = { _id: 'otp-2', email: state.user.email, otp: '000042', action: 'account_verification', createdAt: new Date() };
  try {
    const results = await Promise.all([
      invoke({ email: state.user.email, otp: '000042' }),
      invoke({ email: state.user.email, otp: '000042' }),
    ]);
    assert.equal(results.filter((result) => result.status === 200).length, 1);
    assert.equal(results.filter((result) => result.status === 400).length, 1);
    assert.equal(results.filter((result) => result.body?.token).length, 1);
    assert.equal(state.user.isVerified, true);
    assert.equal(state.otp, null);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});
