const test = require('node:test');
const assert = require('node:assert/strict');
const Ticket = require('../models/Ticket');
const Booking = require('../models/Booking');
const { issueTicketsForBooking, invalidateTicketsForBooking } = require('../services/ticketIssuance');

const withTicketStore = async (run) => {
  const originalBookingFindById = Booking.findById;
  const originals = {
    createIndexes: Ticket.createIndexes,
    findOneAndUpdate: Ticket.findOneAndUpdate,
    findOne: Ticket.findOne,
    updateMany: Ticket.updateMany,
  };
  const store = new Map();
  Booking.findById = () => ({ select: async () => ({ status: 'confirmed' }) });
  Ticket.createIndexes = async () => {};
  Ticket.findOneAndUpdate = async (filter, update) => {
    const key = `${filter.bookingId}:${filter.attendeeIndex}`;
    if (!store.has(key)) store.set(key, { _id: key, ...update.$setOnInsert });
    return store.get(key);
  };
  Ticket.findOne = async (filter) => store.get(`${filter.bookingId}:${filter.attendeeIndex}`) || null;
  Ticket.updateMany = async (filter, update) => {
    let modifiedCount = 0;
    for (const ticket of store.values()) {
      if (ticket.bookingId === filter.bookingId && ticket.status === filter.status) {
        Object.assign(ticket, update.$set);
        modifiedCount += 1;
      }
    }
    return { modifiedCount };
  };
  try {
    await run(store);
  } finally {
    Object.assign(Ticket, originals);
    Booking.findById = originalBookingFindById;
  }
};

test('confirmed multi-attendee booking issues one unique public ticket per attendee idempotently', async () => {
  await withTicketStore(async (store) => {
    const booking = {
      _id: 'booking-1',
      userId: 'user-1',
      eventId: 'event-1',
      eventTitle: 'Snapshot Event',
      eventDate: new Date('2030-01-01T00:00:00Z'),
      quantity: 2,
      unitPrice: 12.5,
      amount: 25,
      currency: 'INR',
      status: 'confirmed',
      attendees: [
        { name: 'Attendee One', email: 'one@example.com' },
        { name: 'Attendee Two' },
      ],
    };

    const account = { _id: 'user-1', name: 'Account Holder', email: 'account@example.com' };
    const first = await issueTicketsForBooking(booking, account);
    const second = await issueTicketsForBooking(booking, account);
    assert.equal(store.size, 2);
    assert.equal(first.length, 2);
    assert.deepEqual(second.map((ticket) => ticket.ticketReference), first.map((ticket) => ticket.ticketReference));
    assert.equal(new Set(first.map((ticket) => ticket.ticketReference)).size, 2);
    assert.match(first[0].ticketReference, /^EH-TKT-[A-F0-9]{32}$/);
    assert.equal(first[0].attendee.name, 'Attendee One');
    assert.equal(first[0].eventTitle, 'Snapshot Event');
    assert.equal(first[0].unitPrice, 12.5);
    assert.deepEqual(Ticket.schema.indexes().find(([fields]) => fields.bookingId && fields.attendeeIndex)?.[1], { unique: true });
  });
});

test('pending bookings receive no tickets and cancellation voids issued tickets', async () => {
  await withTicketStore(async (store) => {
    const booking = {
      _id: 'booking-2', userId: 'user-2', eventId: 'event-2', eventTitle: 'Free Event',
      quantity: 1, amount: 0, unitPrice: 0, status: 'pending', attendees: [{ name: 'Free Attendee' }],
    };
    assert.deepEqual(await issueTicketsForBooking(booking), []);
    assert.equal(store.size, 0);
    booking.status = 'confirmed';
    await issueTicketsForBooking(booking, { _id: 'user-2', name: 'Account Holder', email: 'account@example.com' });
    await invalidateTicketsForBooking(booking._id);
    assert.equal([...store.values()][0].status, 'void');
  });
});
