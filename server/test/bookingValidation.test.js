const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const {
  isValidEventId,
  parseQuantity,
  hasCapacity,
  isValidPrice,
  calculateTotal,
  normalizeAttendees,
  canAccessBooking,
} = require('../utils/bookingValidation');

test('event IDs and ticket quantities are validated, with legacy quantity defaulting to one', () => {
  assert.equal(isValidEventId(new mongoose.Types.ObjectId().toString()), true);
  assert.equal(isValidEventId('bad-id'), false);
  assert.equal(parseQuantity(undefined), 1);
  assert.equal(parseQuantity(1), 1);
  assert.equal(parseQuantity(0), null);
  assert.equal(parseQuantity(-1), null);
  assert.equal(parseQuantity(1.5), null);
  assert.equal(parseQuantity('2'), null);
});

test('capacity accepts only whole-ticket requests within currently available seats', () => {
  assert.equal(hasCapacity(3, 3), true);
  assert.equal(hasCapacity(2, 3), false);
  assert.equal(hasCapacity(0, 1), false);
  assert.equal(hasCapacity(3, 0), false);
  assert.equal(hasCapacity(3, 1.5), false);
});

test('prices are nonnegative two-decimal amounts and totals are calculated safely', () => {
  assert.equal(isValidPrice(0), true);
  assert.equal(isValidPrice(12.34), true);
  assert.equal(isValidPrice(-1), false);
  assert.equal(isValidPrice(1.234), false);
  assert.equal(calculateTotal(12.34, 3), 37.02);
  assert.equal(calculateTotal(1.005, 1), null);
});

test('attendee snapshots match quantity and reject malformed attendee details', () => {
  const user = { name: 'Account Holder', email: 'holder@example.com' };
  assert.deepEqual(normalizeAttendees(undefined, 1, user), [
    { name: 'Account Holder', email: 'holder@example.com' },
  ]);
  assert.equal(normalizeAttendees(undefined, 2, user), null);
  assert.deepEqual(
    normalizeAttendees(
      [{ name: ' Attendee One ', email: 'ONE@example.com' }, { name: 'Attendee Two' }],
      2,
      user,
    ),
    [{ name: 'Attendee One', email: 'one@example.com' }, { name: 'Attendee Two' }],
  );
  assert.equal(normalizeAttendees([{ name: ' ' }], 1, user), null);
  assert.equal(normalizeAttendees([{ name: 'Person', email: 'not-an-email' }], 1, user), null);
});

test('booking owner checks allow the owner and admin, but not another user', () => {
  const booking = { userId: new mongoose.Types.ObjectId('64b000000000000000000001') };
  assert.equal(canAccessBooking({ id: booking.userId.toString(), role: 'user' }, booking), true);
  assert.equal(canAccessBooking({ id: '64b000000000000000000002', role: 'user' }, booking), false);
  assert.equal(canAccessBooking({ id: '64b000000000000000000003', role: 'admin' }, booking), true);
});

test('legacy booking documents retain amount and status and default to one ticket', async () => {
  const legacy = Booking.hydrate({
    _id: new mongoose.Types.ObjectId(),
    userId: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    status: 'confirmed',
    paymentStatus: 'not_paid',
    amount: 25,
  });

  assert.equal(legacy.quantity, 1);
  assert.equal(legacy.amount, 25);
  assert.equal(legacy.status, 'confirmed');
  assert.equal(legacy.bookingReference, undefined);
  await legacy.validate();
});

test('new bookings receive a stable reference without changing their amount', async () => {
  const booking = new Booking({
    userId: new mongoose.Types.ObjectId(),
    eventId: new mongoose.Types.ObjectId(),
    quantity: 2,
    unitPrice: 25,
    currency: 'INR',
    amount: 50,
  });
  await booking.validate();
  const reference = booking.bookingReference;

  assert.match(reference, /^EH-[A-F0-9]{32}$/);
  await booking.validate();
  assert.equal(booking.bookingReference, reference);
  assert.equal(booking.amount, 50);
});
