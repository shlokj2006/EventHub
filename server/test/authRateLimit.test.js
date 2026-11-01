const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');
const originalLoad = Module._load;
Module._load = function loadRouteHandlerStubs(request, parent, isMain) {
  if (request === '../controllers/authController') {
    return { register() {}, login() {}, verifyOTP() {}, forgotPassword() {}, resetPassword() {}, getCurrentUser() {} };
  }
  if (request === '../controllers/bookingController') {
    return { bookEvent() {}, confirmBooking() {}, getMyBookings() {}, getAllBookings() {}, cancelBooking() {}, sendBookingOTP() {}, expireReservations() {} };
  }
  return originalLoad.call(this, request, parent, isMain);
};
const router = require('../routes/auth');
const bookingRouter = require('../routes/booking');
Module._load = originalLoad;
const { createRateLimiter, loginRateLimit, signupRateLimit, otpSendRateLimit, otpVerifyRateLimit } = require('../middleware/authRateLimit');

const invoke = (middleware, req) => {
  let nextCalled = false;
  const res = {
    statusCode: 200,
    headers: {},
    status(code) { this.statusCode = code; return this; },
    set(name, value) { this.headers[name] = value; return this; },
    json(body) { this.body = body; return this; },
  };
  middleware(req, res, () => { nextCalled = true; });
  return { res, nextCalled };
};

test('auth and booking routes apply the intended login, signup, OTP send, and OTP verification limiters', () => {
  const route = (stack, path, method) => stack.find((layer) => layer.route?.path === path && layer.route.methods[method]).route.stack.map((item) => item.handle);
  assert.equal(route(router.stack, '/login', 'post')[0], loginRateLimit);
  assert.equal(route(router.stack, '/register', 'post')[0], signupRateLimit);
  assert.equal(route(router.stack, '/verify-otp', 'post')[0], otpVerifyRateLimit);
  assert.equal(route(bookingRouter.stack, '/send-otp', 'post')[2], otpSendRateLimit);
  assert.equal(route(bookingRouter.stack, '/', 'post')[2], otpVerifyRateLimit);
});

test('limiter returns 429 with Retry-After and allows retry after the cooldown', () => {
  let now = 1_000;
  const limiter = createRateLimiter({ scope: 'test', ipLimit: 10, accountLimit: 2, windowMs: 60_000, now: () => now });
  const req = { ip: '198.51.100.4', body: { email: ' USER@example.test ' } };
  assert.equal(invoke(limiter, req).nextCalled, true);
  assert.equal(invoke(limiter, req).nextCalled, true);
  const blocked = invoke(limiter, req);
  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.res.headers['Retry-After'], '60');
  assert.match(blocked.res.body.message, /wait/i);
  now += 60_000;
  assert.equal(invoke(limiter, req).nextCalled, true);
});

test('configured route limiters enforce their account-specific limits', () => {
  const cases = [
    [loginRateLimit, 10, { body: { email: 'login@example.test' } }],
    [signupRateLimit, 5, { body: { email: 'signup@example.test' } }],
    [otpSendRateLimit, 5, { user: { email: 'send@example.test' } }],
    [otpVerifyRateLimit, 10, { body: { email: 'verify@example.test' } }],
  ];
  for (const [middleware, limit, request] of cases) {
    middleware._resetForTests();
    let result;
    for (let attempt = 0; attempt < limit; attempt += 1) {
      result = invoke(middleware, { ip: `192.0.2.${attempt + 1}`, ...request });
      assert.equal(result.nextCalled, true);
    }
    result = invoke(middleware, { ip: '192.0.2.250', ...request });
    assert.equal(result.res.statusCode, 429);
  }
  for (const middleware of [loginRateLimit, signupRateLimit, otpSendRateLimit, otpVerifyRateLimit]) middleware._resetForTests();
});
test('authenticated rate limiting ignores caller-supplied body email', () => {
  const limiter = createRateLimiter({
    scope: 'authenticated-identity-test',
    ipLimit: 100,
    accountLimit: 2,
    windowMs: 60_000,
  });

  const makeRequest = (bodyEmail, ip) => ({
    ip,
    user: { email: 'real-user@example.test' },
    body: { email: bodyEmail },
  });

  // First two requests use different body emails but the same authenticated user.
  assert.equal(
    invoke(limiter, makeRequest('first@example.test', '192.0.2.1')).nextCalled,
    true
  );

  assert.equal(
    invoke(limiter, makeRequest('second@example.test', '192.0.2.2')).nextCalled,
    true
  );

  // Third request must be blocked because the authenticated account limit is reached.
  const blocked = invoke(
    limiter,
    makeRequest('third@example.test', '192.0.2.3')
  );

  assert.equal(blocked.res.statusCode, 429);
  assert.equal(blocked.nextCalled, false);

  limiter._resetForTests();
});