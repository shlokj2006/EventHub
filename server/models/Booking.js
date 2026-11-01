const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const bookingSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      required: true,
    },
    eventTitle: { type: String, trim: true },
    eventDate: { type: Date },
    bookingReference: { type: String },
    quantity: { type: Number, default: 1, min: 1, validate: Number.isSafeInteger },
    unitPrice: { type: Number, min: 0 },
    currency: { type: String, uppercase: true, default: "INR" },
    capacityState: {
      type: String,
      enum: ["none", "reserving", "reserved", "consumed", "releasing", "legacy_releasing", "released"],
      default: "none",
    },
    reservationExpiresAt: { type: Date },
    cancellationReason: { type: String, enum: ["cancelled", "rejected", "expired"] },
    attendees: {
      type: [
        {
          name: { type: String, required: true, trim: true, maxlength: 120 },
          email: { type: String, trim: true, lowercase: true, maxlength: 254 },
        },
      ],
      default: undefined,
    },
    status: {
      type: String,
      enum: ["confirmed", "cancelled", "pending"],
      default: "pending",
    },
    paymentStatus: {
      type: String,
      enum: ["paid", "not_paid"],
      default: "not_paid",
    },
    confirmationEmail: {
      status: { type: String, enum: ["pending", "sending", "sent", "failed", "skipped"], default: "pending" },
      attempts: { type: Number, min: 0, default: 0 },
      attemptId: { type: String },
      leaseExpiresAt: { type: Date },
      nextAttemptAt: { type: Date },
      lastAttemptAt: { type: Date },
      sentAt: { type: Date },
      lastError: { type: String, maxlength: 40 },
    },
    amount: { type: Number, required: true, min: 0 },
    bookedAt: { type: Date, default: Date.now },
  },
  { timestamps: true },
);

// References are assigned only to new records, leaving legacy bookings intact.
bookingSchema.pre("validate", function assignBookingReference() {
  if (this.isNew && !this.bookingReference) {
    this.bookingReference = `EH-${randomUUID().replace(/-/g, "").toUpperCase()}`;
  }
});

module.exports = mongoose.model("Booking", bookingSchema);
