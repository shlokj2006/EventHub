const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    title: {
         type: String, required: true },

    description: {
         type: String, required: true },
    date: {
         type: Date, required: true },
    location: {
         type: String, required: true },
    category: {
         type: String, required: true },
    totalSeats: {
         type: Number, required: true, min: 1, validate: Number.isSafeInteger },
    availableSeats: {
         type: Number, required: true, min: 0, validate: Number.isSafeInteger },
    image: { type: String },
    ticketPrice: { 
        type: Number, required: true, default: 0, min: 0,
        validate: (price) => Math.abs(price * 100 - Math.round(price * 100)) < 1e-7,
    },
    currency: { type: String, required: true, uppercase: true, default: "INR", enum: ["INR"] },
    // Active capacity claims are kept on this document so seat reservation and
    // duplicate-user protection happen in one atomic MongoDB update.
    capacityClaims: {
        type: [{
            _id: false,
            bookingId: { type: mongoose.Schema.Types.ObjectId, required: true },
            userId: { type: mongoose.Schema.Types.ObjectId, required: true },
            quantity: { type: Number, required: true, min: 1 },
            state: { type: String, enum: ["reserved", "consumed"], required: true },
            expiresAt: { type: Date },
        }],
        default: [],
    },
    // Idempotency markers for releases of legacy confirmed bookings, which
    // predate capacityClaims and therefore have no embedded claim to remove.
    legacyCapacityReleaseIds: {
        type: [{ type: mongoose.Schema.Types.ObjectId }],
        default: [],
    },
    createdBy: {
         type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Event", eventSchema);
