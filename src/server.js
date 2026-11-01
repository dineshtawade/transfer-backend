require('dotenv').config();
const os = require('os');
const http = require('http');
const { WebSocketServer } = require('ws');
const app = require('./app');
const { connectDB } = require('./config/db');
const syncRoutes = require('./routes/syncRoutes');

const PORT = parseInt(process.env.PORT, 10) || 4000;

function getLocalIpAddresses() {
  const interfaces = os.networkInterfaces();
  const addresses = [];

  for (const name of Object.keys(interfaces)) {
    for (const net of interfaces[name]) {
      if (net.family === 'IPv4' && !net.internal) {
        addresses.push(net.address);
      }
    }
  }

  return addresses;
}

async function start() {
  await connectDB();

  // Create HTTP server from Express app so we can share it with WebSocket
  const server = http.createServer(app);

  // WebSocket server — upgrade requests on /ws path only
  const wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws) => {
    console.log('[WS] Client connected');
    ws.on('close', () => console.log('[WS] Client disconnected'));
    ws.on('error', (err) => console.error('[WS] Error:', err.message));
  });

  // Inject the broadcast function into syncRoutes so it can notify clients
  syncRoutes.setBroadcast((payload) => {
    const data = JSON.stringify(payload);
    wss.clients.forEach((client) => {
      if (client.readyState === 1 /* OPEN */) {
        client.send(data);
      }
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log('========================================================');
    console.log(` Google Transfer Backend is running on port ${PORT}`);
    console.log('========================================================');
    console.log(` Local URL:    http://localhost:${PORT}`);

    const ips = getLocalIpAddresses();
    if (ips.length > 0) {
      console.log(' Network URLs (Use in React Native "Backup & sync"):');
      ips.forEach((ip) => {
        console.log(`   -> http://${ip}:${PORT}`);
      });
    }

    console.log(` Health Check: http://localhost:${PORT}/health`);
    console.log(` WebSocket:    ws://localhost:${PORT}/ws`);
    console.log(` API Token:    ${process.env.API_TOKEN ? `${process.env.API_TOKEN.slice(0, 8)}... (Length: ${process.env.API_TOKEN.length})` : 'NOT SET'}`);
    console.log('========================================================\n');
  });

  const shutdown = async () => {
    console.log('\nShutting down server gracefully...');
    wss.close(() => console.log('WebSocket server closed.'));
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

start();
