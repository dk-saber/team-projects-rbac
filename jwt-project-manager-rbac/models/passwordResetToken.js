const mongoose = require('mongoose');

const passwordResetTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  tokenHash: { type: String, required: true, unique: true },
  expiresAt: { type: Date, required: true, index: true },
  usedAt: { type: Date, default: null },
  createdAt: { type: Date, default: Date.now },
  ip: String,
  userAgent: String
});

// TTL index: MongoDB automatically deletes the document once `expiresAt` has passed.
// Automatic collection cleanup, no cron job required.
passwordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('PasswordResetToken', passwordResetTokenSchema);
