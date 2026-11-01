// src/models/Notification.js
const mongoose = require('mongoose');

const retentionDays = parseInt(process.env.RETENTION_DAYS, 10) || 7;
const ttlSeconds = retentionDays * 24 * 60 * 60;

const NotificationSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true, trim: true },
    clientId: { type: String, required: true, trim: true },
    appId: { type: String, required: true }, // package name of app that posted notification
    title: { type: String },
    body: { type: String },
    timestamp: { type: Date, required: true, index: { expires: ttlSeconds } },
    raw: { type: mongoose.Schema.Types.Mixed }, // store full raw notification payload if needed
  },
  { timestamps: true }
);

NotificationSchema.index({ deviceId: 1, clientId: 1, appId: 1, timestamp: 1 }, { unique: true });

module.exports = mongoose.model('Notification', NotificationSchema);
