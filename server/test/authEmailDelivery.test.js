const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const state = { user: null, otpRecords: [], sent: [], failMail: false, hashCalls: 0 };
const fakeUser = {
  findOne: async ({ email }) => {
    if (!state.user) return null;
    if (typeof email === 'string') return state.user.email === email ? state.user : null;
    if (email?.$regex) return new RegExp(email.$regex, email.$options).test(state.user.email) ? state.user : null;
    return null;
  },
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
  hash: async (password) => { state.hashCalls += 1; return `hash:${password}`; },
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
  state.hashCalls = 0;
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

test('verified users can log in with normalized email input and receive the existing JWT contract', async () => {
  resetState();
  const previousSecret = process.env.JWT_SECRET;
  process.env.JWT_SECRET = 'test-only-login-secret';
  state.user = {
    _id: 'user-verified', id: 'user-verified', email: 'person@example.test', password: 'hash:test-password',
    role: 'user', isVerified: true, tokenVersion: 0,
  };
  try {
    const response = await call(authController.login, { email: ' PERSON@Example.Test ', password: 'test-password' });
    assert.equal(response.status, 200);
    assert.equal(response.body.email, 'person@example.test');
    assert.equal(response.body.role, 'user');
    assert.equal(typeof response.body.token, 'string');
    assert.equal(state.sent.length, 0);
  } finally {
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});

test('an unverified staff account cannot authenticate with its chosen password before inbox OTP verification', async () => {
  resetState();
  state.user = {
    _id: 'staff-2', id: 'staff-2', email: 'staff@example.test', password: 'hash:staff-chosen-password',
    role: 'event_staff', isVerified: false,
  };
  const response = await call(authController.login, { email: 'staff@example.test', password: 'staff-chosen-password' });
  assert.equal(response.status, 403);
  assert.equal(response.body.needsVerification, true);
  assert.equal(Object.hasOwn(response.body, 'token'), false);
  assert.equal(state.sent.length, 1);
  assert.equal(state.sent[0].email, 'staff@example.test');
  assert.equal(state.sent[0].type, 'account_verification');
});

test('signup success sends the verification OTP before returning success', async () => {
  resetState();
  const response = await call(authController.register, {
    name: 'Test User', email: ' PERSON@Example.Test ', password: 'test-password',
  });
  assert.equal(response.status, 201);
  assert.match(response.body.message, /OTP sent/i);
  assert.equal(state.sent.length, 1);
  assert.equal(state.sent[0].email, 'person@example.test');
  assert.equal(state.otpRecords[0].otp, state.sent[0].otp);
  assert.match(state.otpRecords[0].otp, /^\d{6}$/);
  assert.equal(state.user.email, 'person@example.test');
});

test('signup rejects malformed and out-of-range input before creating an account or hashing a password', async () => {
  const invalidBodies = [
    null,
    { name: '  ', email: 'person@example.test', password: 'valid-password' },
    { name: 'x'.repeat(121), email: 'person@example.test', password: 'valid-password' },
    { name: 'Test User', email: 'not-an-email', password: 'valid-password' },
    { name: 'Test User', email: 'person@example.test', password: 'short' },
    { name: 'Test User', email: 'person@example.test', password: 'p'.repeat(129) },
  ];
  for (const body of invalidBodies) {
    resetState();
    const response = await call(authController.register, body);
    assert.equal(response.status, 400);
    assert.equal(state.user, null);
    assert.equal(state.otpRecords.length, 0);
    assert.equal(state.sent.length, 0);
    assert.equal(state.hashCalls, 0);
  }
});

test('signup rejects a case-variant duplicate legacy email after normalizing input', async () => {
  resetState();
  state.user = { _id: 'legacy-user', email: 'Person@Example.Test' };
  const response = await call(authController.register, {
    name: 'Test User', email: 'person@example.test', password: 'valid-password',
  });
  assert.equal(response.status, 400);
  assert.equal(state.user._id, 'legacy-user');
  assert.equal(state.hashCalls, 0);
});
