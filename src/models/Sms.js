// src/models/Sms.js
const mongoose = require('mongoose');

const retentionDays = parseInt(process.env.RETENTION_DAYS, 10) || 7;
const ttlSeconds = retentionDays * 24 * 60 * 60;

const SmsSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true, trim: true },
    clientId: { type: String, required: true, trim: true },
    address: { type: String, required: true }, // phone number
    body: { type: String, required: true },
    type: { type: String, required: true }, // inbox/sent/draft
    timestamp: { type: Date, required: true, index: { expires: ttlSeconds } },
  },
  { timestamps: true }
);

SmsSchema.index({ deviceId: 1, clientId: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('Sms', SmsSchema);
