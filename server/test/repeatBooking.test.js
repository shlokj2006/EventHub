const test = require('node:test');
const assert = require('node:assert/strict');
const Module = require('node:module');

const state = { bookings: [], event: null, issued: [] };
const fakeBooking = {
  find: () => ({ select: async () => [] }),
  create: async (values) => {
    const record = { _id: `booking-${state.bookings.length + 1}`, ...values };
    state.bookings.push(record);
    return record;
  },
  findOneAndUpdate: async (filter, update) => {
    const booking = state.bookings.find((item) => item._id === filter._id);
    if (!booking || booking.status !== filter.status || booking.capacityState !== filter.capacityState) return null;
    Object.assign(booking, update.$set);
    return booking;
  },
  updateOne: async () => ({ acknowledged: true }),
};
const fakeEvent = { findById: async () => state.event };
const fakeOtp = {
  findOne: async () => ({ _id: 'otp-1' }),
  deleteOne: async () => ({ deletedCount: 1 }),
};
const fakeReservations = {
  createCapacityClaim: async ({ bookingId, userId, quantity }) => {
    if (state.event.availableSeats < quantity) return null;
    state.event.availableSeats -= quantity;
    return { created: true, claim: { bookingId, userId, quantity } };
  },
  expireBooking: async () => {},
  expireAndReconcileReservations: async () => ({}),
};
const fakeTicketIssuance = {
  issueTicketsForBooking: async (booking) => {
    const tickets = booking.attendees.map((attendee, attendeeIndex) => ({
      _id: `${booking._id}-ticket-${attendeeIndex}`,
      bookingId: booking._id,
      attendee,
    }));
    state.issued.push(...tickets);
    return tickets;
  },
  invalidateTicketsForBooking: async () => {},
};
const originalLoad = Module._load;
Module._load = function loadRepeatBookingMocks(request, parent, isMain) {
  if (request === '../models/Booking') return fakeBooking;
  if (request === '../models/Event') return fakeEvent;
  if (request === '../models/Ticket') return {};
  if (request === '../models/OTP') return fakeOtp;
  if (request === '../utils/email') return { sendOTPEmail: async () => {}, safeEmailErrorCode: () => 'EMAIL_DELIVERY_FAILED' };
  if (request === '../services/bookingReservations') return fakeReservations;
  if (request === '../services/ticketIssuance') return fakeTicketIssuance;
  if (request === '../services/bookingConfirmationEmail') return {
    confirmBookingEmail: async () => ({ status: 'sent' }),
    retryBookingConfirmationEmails: async () => ({ examined: 0, sent: 0, failed: 0, skipped: 0 }),
  };
  return originalLoad.call(this, request, parent, isMain);
};
const { bookEvent } = require('../controllers/bookingController');
Module._load = originalLoad;

const invoke = async (req) => {
  let statusCode = 200;
  let body;
  const res = {
    status(code) { statusCode = code; return this; },
    json(value) { body = value; return this; },
  };
  await bookEvent(req, res);
  return { statusCode, body };
};

test('the same user can create separate event bookings with different attendees and one ticket per attendee', async () => {
  state.bookings = [];
  state.issued = [];
  state.event = { _id: '507f1f77bcf86cd799439011', title: 'Community Event', date: new Date(), ticketPrice: 0, currency: 'INR', availableSeats: 2 };
  const user = { _id: 'user-1', id: 'user-1', name: 'Booking Owner', email: 'owner@example.com' };
  for (const name of ['Friend One', 'Family Member Two']) {
    const result = await invoke({
      user,
      body: { eventId: state.event._id, otp: '123456', quantity: 1, attendees: [{ name }] },
    });
    assert.equal(result.statusCode, 201);
    assert.equal(result.body.booking.status, 'confirmed');
  }

  assert.equal(state.bookings.length, 2);
  assert.notEqual(state.bookings[0]._id, state.bookings[1]._id);
  assert.deepEqual(state.bookings.map((booking) => booking.attendees[0].name), ['Friend One', 'Family Member Two']);
  assert.deepEqual(state.issued.map((ticket) => [ticket.bookingId, ticket.attendee.name]), [
    ['booking-1', 'Friend One'],
    ['booking-2', 'Family Member Two'],
  ]);
  assert.equal(state.event.availableSeats, 0);
});
