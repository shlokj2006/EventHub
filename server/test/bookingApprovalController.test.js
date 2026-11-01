const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const state = { booking: null, selectedStatuses: [], issued: 0, emails: [], expired: 0 };
const fakeBookingModel = {
  findById: () => ({
    populate() { return this; },
    then(resolve, reject) { return Promise.resolve(state.booking).then(resolve, reject); },
  }),
  findOneAndUpdate: async () => null,
  findByIdAndDelete: async () => null,
  updateOne: async () => ({ acknowledged: true }),
  find: async () => [],
};
const fakeEventModel = { updateOne: async () => ({ acknowledged: true }) };
const fakeTicketModel = {};
const fakeOtpModel = {};
const fakeEmail = { sendOTPEmail: async () => {} };
const fakeReservations = {
  createCapacityClaim: async () => null,
  setClaimState: async () => {},
  approvePaidBooking: async (_id, _now, paymentStatus) => {
    state.selectedStatuses.push(paymentStatus);
    if (!state.booking || state.booking.status !== 'pending') return null;
    state.booking.status = 'confirmed';
    state.booking.capacityState = 'consumed';
    state.booking.paymentStatus = paymentStatus;
    return state.booking;
  },
  transitionBookingCancellation: async () => null,
  releaseBookingCapacity: async () => false,
  expireBooking: async () => { state.expired += 1; state.booking.status = 'cancelled'; return true; },
  reconcileReservingBooking: async () => false,
  expireAndReconcileReservations: async () => ({}),
};
const fakeTicketIssuance = {
  issueTicketsForBooking: async () => { state.issued += 1; return [{ ticketReference: 'EH-TKT-TEST' }]; },
  invalidateTicketsForBooking: async () => {},
};
const fakeConfirmationEmail = {
  confirmBookingEmail: async (_bookingId, options) => {
    state.emails.push(options || {});
    return { status: 'sent' };
  },
  retryBookingConfirmationEmails: async () => ({ examined: 0, sent: 0, failed: 0, skipped: 0 }),
};

const originalLoad = Module._load;
Module._load = function loadBookingMocks(request, parent, isMain) {
  if (request === '../models/Booking') return fakeBookingModel;
  if (request === '../models/Event') return fakeEventModel;
  if (request === '../models/Ticket') return fakeTicketModel;
  if (request === '../models/OTP') return fakeOtpModel;
  if (request === '../utils/email') return fakeEmail;
  if (request === '../services/bookingReservations') return fakeReservations;
  if (request === '../services/ticketIssuance') return fakeTicketIssuance;
  if (request === '../services/bookingConfirmationEmail') return fakeConfirmationEmail;
  return originalLoad.call(this, request, parent, isMain);
};
const controller = require('../controllers/bookingController');
Module._load = originalLoad;

function invoke(paymentStatus) {
  let status = 200;
  let body;
  const res = {
    status(value) { status = value; return this; },
    json(value) { body = value; return this; },
  };
  return controller.confirmBooking({
    params: { id: '64b000000000000000000001' },
    body: paymentStatus === undefined ? {} : { paymentStatus },
  }, res).then(() => ({ status, body }));
}

function pendingBooking(overrides = {}) {
  return {
    _id: '64b000000000000000000001',
    userId: { _id: '64b000000000000000000002', name: 'Attendee', email: 'attendee@example.com' },
    eventId: { _id: '64b000000000000000000003', title: 'Paid Event', ticketPrice: 20 },
    quantity: 1,
    amount: 20,
    unitPrice: 20,
    currency: 'INR',
    status: 'pending',
    capacityState: 'reserved',
    reservationExpiresAt: new Date(Date.now() + 60_000),
    attendees: [{ name: 'Attendee' }],
    ...overrides,
  };
}

test('admin approval stores each permitted payment choice and issues tickets after confirmation', async () => {
  for (const paymentStatus of ['paid', 'not_paid']) {
    state.booking = pendingBooking();
    state.selectedStatuses = [];
    state.issued = 0;
    state.emails = [];
    const result = await invoke(paymentStatus);
    assert.equal(result.status, 200);
    assert.equal(result.body.booking.status, 'confirmed');
    assert.equal(result.body.booking.paymentStatus, paymentStatus);
    assert.equal(result.body.tickets.length, 1);
    assert.equal(state.selectedStatuses[0], paymentStatus);
    assert.equal(state.issued, 1);
    assert.equal(state.emails.length, 1);
  }
});

test('confirmation requires a valid explicit choice and cannot approve an expired reservation', async () => {
  state.booking = pendingBooking();
  assert.equal((await invoke(undefined)).status, 400);
  assert.equal((await invoke('gateway_verified')).status, 400);

  state.booking = pendingBooking({ reservationExpiresAt: new Date(Date.now() - 1000) });
  const expired = await invoke('paid');
  assert.equal(expired.status, 410);
  assert.equal(state.booking.status, 'cancelled');
  assert.equal(state.expired > 0, true);
});

test('repeated same-status approval is idempotent for ticket issuance and a status change is rejected', async () => {
  state.booking = pendingBooking({ status: 'confirmed', capacityState: 'consumed', paymentStatus: 'paid' });
  state.issued = 0;
  state.emails = [];
  const repeated = await invoke('paid');
  assert.equal(repeated.status, 200);
  assert.equal(state.issued, 1);
  assert.deepEqual(state.emails[0], { forceRetry: true });
  const changed = await invoke('not_paid');
  assert.equal(changed.status, 409);
  assert.equal(state.booking.paymentStatus, 'paid');
});