const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const mongoose = require('mongoose');
const path = require('path');

const syncRoutes = require('./routes/syncRoutes');
const dataRoutes = require('./routes/dataRoutes');
const { errorHandler } = require('./middleware/errorHandler');

const app = express();

// Middlewares
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Static frontend serving
const frontendPath = path.resolve(__dirname, '../../frontend');
app.use('/dashboard', express.static(frontendPath));
app.use(express.static(frontendPath)); // Also serve directly at root for convenience

// Health check endpoint (used by React Native checkBackend)
app.get('/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const dbStatus = ['disconnected', 'connected', 'connecting', 'disconnecting'][dbState] || 'unknown';

  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'google-transfer-backend',
    database: dbStatus,
  });
});

// API info endpoint
app.get('/api', (req, res) => {
  res.status(200).json({
    name: 'Google Transfer Local Backup Backend',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: 'GET /health',
      sync: 'POST /api/v1/sync (Authorization: Bearer <API_TOKEN>)',
      overview: 'GET /api/v1/data/overview (Authorization: Bearer <API_TOKEN>)',
      devices: 'GET /api/v1/data/devices (Authorization: Bearer <API_TOKEN>)',
      locations: 'GET /api/v1/data/:deviceId/locations (Authorization: Bearer <API_TOKEN>)',
      messages: 'GET /api/v1/data/:deviceId/messages (Authorization: Bearer <API_TOKEN>)',
      deleteLocations: 'DELETE /api/v1/data/:deviceId/locations (Authorization: Bearer <API_TOKEN>)',
      deleteMessages: 'DELETE /api/v1/data/:deviceId/messages (Authorization: Bearer <API_TOKEN>)',
    },
  });
});

// Mount API routes
app.use('/api/v1', syncRoutes);
app.use('/api/v1/data', dataRoutes);

// Global error handler
app.use(errorHandler);

module.exports = app;
