const mongoose = require('mongoose');

const retentionDays = parseInt(process.env.RETENTION_DAYS, 10) || 7;
const ttlSeconds = retentionDays * 24 * 60 * 60;

const MessageSchema = new mongoose.Schema(
  {
    deviceId: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    clientId: {
      type: String,
      required: true,
      trim: true,
    },
    body: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      required: true,
      default: Date.now,
      index: { expires: ttlSeconds },
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ deviceId: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('Message', MessageSchema);
