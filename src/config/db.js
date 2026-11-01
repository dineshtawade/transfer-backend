const mongoose = require('mongoose');

async function connectDB() {
  const uri = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/google_transfer';
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully to ${uri}`);
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
