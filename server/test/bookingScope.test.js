const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const capturedQueries = [];
const capturedOtpRecords = [];
let failOtpMail = false;
let reservationFailure = null;
let adminBookings = [];
let activeTicketsForBooking = [];
const makeQuery = (result) => ({
  select() { return this; },
  limit() { return Promise.resolve(result); },
  populate() { return this; },
  sort() { return Promise.resolve(result); },
});
const fakeBooking = { find: (query) => { capturedQueries.push(query); return makeQuery(adminBookings); } };
const fakeTicket = {
  find: (query) => ({ sort: async () => query.status === 'active' ? activeTicketsForBooking : [] }),
};
const fakeOtp = {
  findOneAndDelete: async ({ email, action }) => {
    const index = capturedOtpRecords.findIndex((entry) => entry.email === email && entry.action === action);
    if (index >= 0) capturedOtpRecords.splice(index, 1);
  },
  create: async (entry) => { capturedOtpRecords.push(entry); return entry; },
};
const fakeEvent = {};
const fakeReservations = {
  expireBooking: async () => {},
  expireAndReconcileReservations: async () => {
    if (reservationFailure) throw reservationFailure;
    return {};
  },
};
const fakeTicketIssuance = {
  issueTicketsForBooking: async () => [],
  invalidateTicketsForBooking: async () => {},
};

const originalLoad = Module._load;
Module._load = function loadBookingScopeMocks(request, parent, isMain) {
  if (request === '../models/Booking') return fakeBooking;
  if (request === '../models/Event') return fakeEvent;
  if (request === '../models/Ticket') return fakeTicket;
  if (request === '../models/OTP') return fakeOtp;
  if (request === '../utils/email') return {
    sendOTPEmail: async () => {
      if (failOtpMail) throw Object.assign(new Error('provider rejected credentials'), { code: 'EAUTH' });
    },
    safeEmailErrorCode: (error) => error?.code || 'EMAIL_DELIVERY_FAILED',
  };
  if (request === '../services/bookingReservations') return fakeReservations;
  if (request === '../services/ticketIssuance') return fakeTicketIssuance;
  if (request === '../services/bookingConfirmationEmail') return {
    confirmBookingEmail: async () => ({ status: 'sent' }),
    retryBookingConfirmationEmails: async () => ({ examined: 0, sent: 0, failed: 0, skipped: 0 }),
  };
  return originalLoad.call(this, request, parent, isMain);
};
const controller = require('../controllers/bookingController');
Module._load = originalLoad;

const invoke = (handler, req) => {
  let status = 200;
  let body;
  const res = {
    status(code) { status = code; return this; },
    json(value) { body = value; return this; },
  };
  return handler(req, res).then(() => ({ status, body }));
};

test('personal booking history always scopes by authenticated principal, ignoring supplied IDs', async () => {
  for (const role of ['user', 'admin']) {
    capturedQueries.length = 0;
    const result = await invoke(controller.getMyBookings, {
      user: { _id: 'authenticated-user', id: 'authenticated-user', role },
      query: { userId: 'attacker-selected-user' },
    });
    assert.equal(result.status, 200);
    assert.equal(capturedQueries.length, 2);
    for (const query of capturedQueries) assert.equal(query.userId, 'authenticated-user');
  }
});

test('admin-wide booking history is on a separately guarded route', () => {
  const router = require('../routes/booking');
  const route = router.stack.find((layer) => layer.route?.path === '/admin' && layer.route.methods.get);
  assert.ok(route);
  assert.deepEqual(route.route.stack.slice(0, 2).map((layer) => layer.handle.name), ['protect', 'admin']);

  const myRoute = router.stack.find((layer) => layer.route?.path === '/my' && layer.route.methods.get);
  assert.ok(myRoute);
  assert.equal(myRoute.route.stack[0].handle.name, 'protect');
  assert.equal(myRoute.route.stack[1].handle, controller.getMyBookings);
});

test('admin booking failures log a stage and redact sensitive error details', async () => {
  const originalError = console.error;
  const logLines = [];
  console.error = (line) => logLines.push(line);
  reservationFailure = new Error(
    'Mongo failed mongodb+srv://dbuser:dbsecret@cluster.example/db Bearer jwt-secret password=pass-secret EMAIL_PASSWORD=mail-secret attendee: "Jane Doe" email: jane@example.test',
  );

  let result;
  try {
    result = await invoke(controller.getAllBookings, {
      method: 'GET',
      user: { role: 'admin' },
      get: () => undefined,
    });
  } finally {
    reservationFailure = null;
    console.error = originalError;
  }

  assert.equal(result.status, 500);
  assert.deepEqual(result.body, { message: 'Unable to load all bookings' });
  assert.equal(logLines.length, 1);

  const diagnostic = JSON.parse(logLines[0]);
  assert.equal(diagnostic.event, 'admin_bookings_request_failed');
  assert.equal(diagnostic.method, 'GET');
  assert.equal(diagnostic.route, '/api/bookings/admin');
  assert.equal(diagnostic.stage, 'reservation_reconciliation');
  assert.equal(diagnostic.errorName, 'Error');
  assert.equal(diagnostic.userRole, 'admin');
  assert.ok(Number.isFinite(Date.parse(diagnostic.timestamp)));
  assert.match(diagnostic.requestId, /^[0-9a-f-]{36}$/i);
  assert.match(diagnostic.stack, /Error: Mongo failed/);

  const serialized = JSON.stringify(diagnostic);
  for (const sensitiveValue of [
    'dbuser', 'dbsecret', 'jwt-secret', 'pass-secret', 'mail-secret',
    'Jane Doe', 'jane@example.test',
  ]) {
    assert.doesNotMatch(serialized, new RegExp(sensitiveValue));
  }
});

test('admin booking list still attaches existing active tickets when issuance returns none', async () => {
  const booking = {
    _id: 'booking-without-event',
    status: 'confirmed',
    eventId: null,
    toObject() { return { _id: this._id, status: this.status, eventId: this.eventId }; },
  };
  const existingTicket = { _id: 'existing-ticket', status: 'active' };
  adminBookings = [booking];
  activeTicketsForBooking = [existingTicket];

  let result;
  try {
    result = await invoke(controller.getAllBookings, {
      method: 'GET',
      user: { role: 'admin' },
      get: () => undefined,
    });
  } finally {
    adminBookings = [];
    activeTicketsForBooking = [];
  }

  assert.equal(result.status, 200);
  assert.deepEqual(result.body[0].tickets, [existingTicket]);
});

test('booking OTP endpoint returns failure when the SMTP transport rejects the message', async () => {
  capturedOtpRecords.length = 0;
  failOtpMail = true;
  const originalError = console.error;
  console.error = () => {};
  try {
    const result = await invoke(controller.sendBookingOTP, { user: { email: 'owner@example.test' } });
    assert.equal(result.status, 503);
    assert.match(result.body.message, /could not be sent/i);
    assert.doesNotMatch(JSON.stringify(result.body), /EAUTH|credentials|owner@example/);
    assert.equal(capturedOtpRecords.length, 1);
  } finally {
    console.error = originalError;
    failOtpMail = false;
  }
});
