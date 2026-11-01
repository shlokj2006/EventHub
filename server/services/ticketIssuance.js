const { randomBytes } = require('node:crypto');
const Booking = require('../models/Booking');
const Ticket = require('../models/Ticket');
const User = require('../models/User');

const idOf = (value) => value?._id || value;

const issueTicketsForBooking = async (booking, fallbackUser) => {
  if (!booking || booking.status !== 'confirmed') return [];
  const currentBooking = await Booking.findById(booking._id).select('status');
  if (!currentBooking || currentBooking.status !== 'confirmed') return [];
  await Ticket.createIndexes();

  const account = fallbackUser || (booking.userId?.name ? booking.userId : await User.findById(idOf(booking.userId)));
  const quantity = Number.isSafeInteger(booking.quantity) && booking.quantity > 0 ? booking.quantity : 1;
  const savedAttendees = Array.isArray(booking.attendees) ? booking.attendees : [];
  const defaultAttendee = {
    name: account?.name || savedAttendees[0]?.name || 'Attendee',
    email: account?.email || savedAttendees[0]?.email,
  };
  const attendees = Array.from({ length: quantity }, (_, index) => savedAttendees[index] || defaultAttendee);
  const event = booking.eventId?.title ? booking.eventId : null;
  const eventTitle = booking.eventTitle || event?.title || 'Event';
  const eventDate = booking.eventDate || event?.date;
  const userId = idOf(booking.userId);
  const eventId = idOf(booking.eventId);
  const issued = [];

  for (let attendeeIndex = 0; attendeeIndex < quantity; attendeeIndex += 1) {
    const attendee = attendees[attendeeIndex];
    const ticket = {
      ticketReference: `EH-TKT-${randomBytes(16).toString('hex').toUpperCase()}`,
      bookingId: booking._id,
      eventId,
      userId,
      attendeeIndex,
      attendee: { name: attendee.name, ...(attendee.email ? { email: attendee.email } : {}) },
      eventTitle,
      ...(eventDate ? { eventDate } : {}),
      unitPrice: booking.unitPrice ?? (booking.amount / quantity),
      currency: booking.currency || 'INR',
      status: 'active',
      issuedAt: new Date(),
    };
    try {
      const saved = await Ticket.findOneAndUpdate(
        { bookingId: booking._id, attendeeIndex },
        { $setOnInsert: ticket },
        { upsert: true, new: true, runValidators: true },
      );
      if (saved) issued.push(saved);
    } catch (error) {
      if (error.code !== 11000) throw error;
      const existing = await Ticket.findOne({ bookingId: booking._id, attendeeIndex });
      if (!existing) throw error;
      issued.push(existing);
    }
  }

  // A cancellation may win while the per-attendee upserts are running.
  const latestBooking = await Booking.findById(booking._id).select('status');
  if (!latestBooking || latestBooking.status !== 'confirmed') {
    await invalidateTicketsForBooking(booking._id);
    return [];
  }

  return issued;
};

const invalidateTicketsForBooking = (bookingId) => Ticket.updateMany(
  { bookingId, status: 'active' },
  { $set: { status: 'void' } },
);

module.exports = { issueTicketsForBooking, invalidateTicketsForBooking };
