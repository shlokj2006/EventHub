const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../routes/booking');
const { admin, bookingParticipant } = require('../middleware/auth');

test('booking confirmation and payment-status choice are protected by authentication and admin authorization', () => {
  const confirmationRoute = router.stack.find((layer) => layer.route?.path === '/:id/confirm');
  assert.ok(confirmationRoute);
  assert.equal(confirmationRoute.route.methods.put, true);
  assert.deepEqual(confirmationRoute.route.stack.slice(0, 2).map((layer) => layer.handle.name), ['protect', 'admin']);

  let nextCalled = false;
  const res = {
    status(code) { this.code = code; return this; },
    json(body) { this.body = body; return this; },
  };
  admin({ user: { id: 'attendee', role: 'user' } }, res, () => { nextCalled = true; });
  assert.equal(res.code, 403);
  assert.equal(nextCalled, false);

  admin({ user: { id: 'administrator', role: 'admin' } }, res, () => { nextCalled = true; });
  assert.equal(nextCalled, true);
});

test('staff booking OTP, create, and cancellation APIs are protected from Event Staff while users and admins retain access', () => {
  for (const [method, path] of [['post', '/send-otp'], ['post', '/'], ['delete', '/:id']]) {
    const route = router.stack.find((layer) => layer.route?.path === path && layer.route.methods[method]);
    assert.ok(route, `${method.toUpperCase()} ${path} exists`);
    assert.deepEqual(route.route.stack.slice(0, 2).map((layer) => layer.handle.name), ['protect', 'bookingParticipant']);
    assert.equal(route.route.stack.length, 3);
  }

  const invoke = (role) => {
    let nextCalled = false;
    const res = { status(code) { this.code = code; return this; }, json(body) { this.body = body; return this; } };
    bookingParticipant({ user: { role } }, res, () => { nextCalled = true; });
    return { res, nextCalled };
  };
  const staff = invoke('event_staff');
  assert.equal(staff.res.code, 403);
  assert.equal(staff.nextCalled, false);
  assert.equal(invoke('user').nextCalled, true);
  assert.equal(invoke('admin').nextCalled, true);
});
