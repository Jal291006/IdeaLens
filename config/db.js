const mongoose = require('mongoose');

let isConnected = false;

async function connectDB(uri) {
  if (!uri) {
    console.warn('⚠️ MONGODB_URI not provided. Running in disconnected mode.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000 // Timeout after 5s if MongoDB isn't reachable
    });

    isConnected = true;
    console.log(`✅ MongoDB Connected successfully: ${conn.connection.host}`);
    return true;
  } catch (err) {
    isConnected = false;
    console.warn(`⚠️ MongoDB connection failed: ${err.message}`);
    console.warn('ℹ️ System will run with memory/fallback mode for analysis.');
    return false;
  }
}

function getDbStatus() {
  return {
    connected: isConnected && mongoose.connection.readyState === 1,
    readyState: mongoose.connection.readyState
  };
}

module.exports = {
  connectDB,
  getDbStatus
};
