const test = require('node:test');
const assert = require('node:assert/strict');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { createStaff } = require('../controllers/eventStaffController');
const staffRouter = require('../routes/eventStaff');

const invoke = async (req) => {
  let statusCode = 200;
  let body;
  const res = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  await createStaff(req, res);
  return { statusCode, body };
};

test('staff account creation is admin-only and creates a new unverified account without returning its random credential', () => {
  const route = staffRouter.stack.find((layer) => layer.route?.path === '/admin' && layer.route.methods.post);
  assert.ok(route);
  assert.deepEqual(route.route.stack.slice(0, 2).map((layer) => layer.handle.name), ['protect', 'admin']);
});

test('admin staff creation stores a random credential hash and requires the email verification flow', async () => {
  const originalFind = User.find;
  const originalCreate = User.create;
  let created;
  User.find = () => ({ limit: async () => [] });
  User.create = async (record) => {
    created = { _id: 'staff-id', ...record };
    return created;
  };
  try {
    const result = await invoke({ body: { email: ' New.Staff@Example.com ' }, user: { _id: 'admin-id', role: 'admin' } });
    assert.equal(result.statusCode, 201);
    assert.equal(created.email, 'new.staff@example.com');
    assert.equal(created.role, 'event_staff');
    assert.equal(created.isVerified, false);
    assert.match(created.password, /^\$2[aby]\$/);
    assert.equal(await bcrypt.compare('password123', created.password), false);
    assert.equal(result.body.staff.isVerified, false);
    assert.equal(Object.hasOwn(result.body.staff, 'password'), false);
    assert.doesNotMatch(JSON.stringify(result.body), /credential|password123|\$2[aby]\$/i);
    assert.match(result.body.message, /Forgot Password.*email verification/i);
  } finally {
    User.find = originalFind;
    User.create = originalCreate;
  }
});

test('staff creation rejects invalid and existing email addresses without creating accounts', async () => {
  const originalFind = User.find;
  const originalCreate = User.create;
  let createCalls = 0;
  User.find = () => ({ limit: async () => [{ _id: 'existing-user', email: 'taken@example.com' }] });
  User.create = async () => { createCalls += 1; throw new Error('must not create'); };
  try {
    const invalid = await invoke({ body: { email: 'invalid' }, user: { role: 'admin' } });
    assert.equal(invalid.statusCode, 400);
    const duplicate = await invoke({ body: { email: 'taken@example.com' }, user: { role: 'admin' } });
    assert.equal(duplicate.statusCode, 409);
    assert.equal(createCalls, 0);
  } finally {
    User.find = originalFind;
    User.create = originalCreate;
  }
});

test('concurrent normalized duplicate email creation is rejected by the existing unique email index', async () => {
  const originalFind = User.find;
  const originalCreate = User.create;
  User.find = () => ({ limit: async () => [] });
  User.create = async () => { throw Object.assign(new Error('duplicate'), { code: 11000 }); };
  try {
    const result = await invoke({ body: { email: 'same@example.com' }, user: { role: 'admin' } });
    assert.equal(result.statusCode, 409);
    assert.match(result.body.message, /already exists/i);
  } finally {
    User.find = originalFind;
    User.create = originalCreate;
  }
});
