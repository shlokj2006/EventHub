const test = require('node:test');
const assert = require('node:assert/strict');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { protect, admin } = require('../middleware/auth');

test('admin authorization uses the current database role, not a JWT role claim', async () => {
  const previousSecret = process.env.JWT_SECRET;
  const previousFindById = User.findById;
  process.env.JWT_SECRET = 'test-only-session-secret';
  User.findById = () => ({
    select: async () => ({ _id: 'user-1', id: 'user-1', name: 'User', email: 'user@example.com', role: 'user', tokenVersion: 0 }),
  });

  try {
    const token = jwt.sign({ id: 'user-1', role: 'admin', tokenVersion: 0 }, process.env.JWT_SECRET);
    const req = { headers: { authorization: `Bearer ${token}` } };
    let status;
    const res = {
      status(code) { status = code; return this; },
      json() { return this; },
    };
    let continued = false;
    await protect(req, res, () => { continued = true; });
    assert.equal(continued, true);
    assert.equal(req.user.role, 'user');
    admin(req, res, () => { continued = true; });
    assert.equal(status, 403);
  } finally {
    User.findById = previousFindById;
    if (previousSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = previousSecret;
  }
});