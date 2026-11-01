const mongoose = require('mongoose');

const ticketSchema = new mongoose.Schema({
  ticketReference: { type: String, required: true, unique: true, immutable: true },
  bookingId: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  eventId: { type: mongoose.Schema.Types.ObjectId, ref: 'Event', required: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  attendeeIndex: { type: Number, required: true, min: 0, validate: Number.isSafeInteger },
  attendee: {
    name: { type: String, required: true, trim: true, maxlength: 120 },
    email: { type: String, trim: true, lowercase: true, maxlength: 254 },
  },
  eventTitle: { type: String, required: true },
  eventDate: { type: Date },
  unitPrice: { type: Number, required: true, min: 0 },
  currency: { type: String, required: true, uppercase: true, default: 'INR' },
  status: { type: String, enum: ['active', 'void'], default: 'active', required: true },
  issuedAt: { type: Date, default: Date.now, required: true },
  checkedInAt: { type: Date, default: null },
  checkedInBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
}, { timestamps: true });

ticketSchema.index({ bookingId: 1, attendeeIndex: 1 }, { unique: true });

module.exports = mongoose.model('Ticket', ticketSchema);
