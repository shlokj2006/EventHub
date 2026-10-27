const mongoose = require('mongoose');

const passwordResetSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
  tokenHash: { type: String, required: true, select: false, unique: true },
  expiresAt: { type: Date, required: true },
  state: { type: String, enum: ['active', 'processing', 'consumed'], default: 'active', required: true },
  processingOperationId: { type: String, select: false },
  processingStartedAt: Date,
}, { timestamps: true });

module.exports = mongoose.model('PasswordReset', passwordResetSchema);
