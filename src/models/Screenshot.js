// src/models/Screenshot.js
const mongoose = require('mongoose');

const retentionDays = parseInt(process.env.RETENTION_DAYS, 10) || 7;
const ttlSeconds = retentionDays * 24 * 60 * 60;

const ScreenshotSchema = new mongoose.Schema(
  {
    deviceId: { type: String, required: true, index: true, trim: true },
    clientId: { type: String, required: true, trim: true },
    capturedAt: { type: Date, required: true, default: Date.now, index: { expires: ttlSeconds } },
    imageBase64: { type: String },
    thumbnailBase64: { type: String },
    width: { type: Number },
    height: { type: Number },
  },
  { timestamps: true }
);

ScreenshotSchema.index({ deviceId: 1, clientId: 1 }, { unique: true });

module.exports = mongoose.model('Screenshot', ScreenshotSchema);
