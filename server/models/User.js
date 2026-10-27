const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ["user", "event_staff", "admin"], default: "user" },
    isVerified: { type: Boolean, default: false },
    tokenVersion: { type: Number, default: 0 },
    passwordChangedAt: { type: Date },
    passwordResetOperationId: { type: String, select: false },
  },
  { timestamps: true },
);

module.exports = mongoose.model("User", userSchema);
