// src/models/CallLog.js
const mongoose = require('mongoose');

const retentionDays = parseInt(process.env.RETENTION_DAYS, 10) || 7;
const ttlSeconds = retentionDays * 24 * 60 * 60;

const CallLogSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true, trim: true },
    clientId: { type: String, required: true, trim: true },
    number: { type: String, required: true },
    type: { type: String, required: true }, // incoming/outgoing/missed
    duration: { type: Number, default: 0 },
    timestamp: { type: Date, required: true, index: { expires: ttlSeconds } },
  },
  { timestamps: true }
);

CallLogSchema.index({ deviceId: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('CallLog', CallLogSchema);
