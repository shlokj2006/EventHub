const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../routes/booking');
const { admin } = require('../middleware/auth');

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