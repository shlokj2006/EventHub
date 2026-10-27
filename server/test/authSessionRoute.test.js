const test = require('node:test');
const assert = require('node:assert/strict');
const router = require('../routes/auth');

test('session restoration endpoint validates the JWT against the current server user', () => {
  const route = router.stack.find((layer) => layer.route?.path === '/me' && layer.route.methods.get);
  assert.ok(route);
  assert.equal(route.route.stack[0].handle.name, 'protect');
  assert.equal(route.route.stack[1].handle, require('../controllers/authController').getCurrentUser);
});