const mongoose = require('mongoose');
const dns = require('dns');

// On Windows / some Indian ISPs, default DNS servers refuse SRV lookups for mongodb+srv
// Setting public DNS (Google / Cloudflare) ensures seamless MongoDB Atlas resolution
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) {
  // Ignore if custom servers cannot be set
}

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/google_transfer';
  const maskedUri = uri.replace(/:([^:@]+)@/, ':****@');

  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 10000,
    });
    console.log(`[MongoDB] Connected successfully to ${maskedUri}`);
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.warn('[MongoDB] Server will continue running, but database operations will fail until MongoDB is accessible.');
  }

  mongoose.connection.on('error', (err) => {
    console.error(`[MongoDB] Runtime connection error: ${err.message}`);
  });

  mongoose.connection.on('disconnected', () => {
    console.warn('[MongoDB] Disconnected from database.');
  });

  mongoose.connection.on('reconnected', () => {
    console.log('[MongoDB] Reconnected to database.');
  });
}

module.exports = { connectDB };
