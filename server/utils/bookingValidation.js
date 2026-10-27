const mongoose = require('mongoose');

const isValidEventId = (eventId) =>
  typeof eventId === 'string' && mongoose.Types.ObjectId.isValid(eventId);

const parseQuantity = (quantity) => {
  if (quantity === undefined) return 1;
  if (!Number.isSafeInteger(quantity) || quantity < 1) return null;
  return quantity;
};

const hasCapacity = (availableSeats, quantity) =>
  Number.isSafeInteger(availableSeats) &&
  availableSeats >= 0 &&
  Number.isSafeInteger(quantity) &&
  quantity > 0 &&
  availableSeats >= quantity;

const isValidPrice = (price) =>
  Number.isFinite(price) &&
  price >= 0 &&
  Math.abs(price * 100 - Math.round(price * 100)) < 1e-7;

const calculateTotal = (unitPrice, quantity) => {
  if (!isValidPrice(unitPrice) || !Number.isSafeInteger(quantity) || quantity < 1) {
    return null;
  }

  const totalMinorUnits = Math.round(unitPrice * 100) * quantity;
  if (!Number.isSafeInteger(totalMinorUnits)) return null;
  return totalMinorUnits / 100;
};

const normalizeAttendees = (attendees, quantity, user) => {
  if (attendees === undefined && quantity === 1) {
    return [{ name: user.name, email: user.email }];
  }

  if (!Array.isArray(attendees) || attendees.length !== quantity) return null;

  const normalized = [];
  for (const attendee of attendees) {
    if (!attendee || typeof attendee !== 'object' || Array.isArray(attendee)) return null;
    if (typeof attendee.name !== 'string' || !attendee.name.trim() || attendee.name.trim().length > 120) {
      return null;
    }

    const entry = { name: attendee.name.trim() };
    if (attendee.email !== undefined && attendee.email !== '') {
      if (typeof attendee.email !== 'string' || attendee.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(attendee.email)) {
        return null;
      }
      entry.email = attendee.email.trim().toLowerCase();
    }

    normalized.push(entry);
  }

  return normalized;
};

const canAccessBooking = (user, booking) =>
  user.role === 'admin' || booking.userId.toString() === user.id.toString();

module.exports = {
  isValidEventId,
  parseQuantity,
  hasCapacity,
  isValidPrice,
  calculateTotal,
  normalizeAttendees,
  canAccessBooking,
};
