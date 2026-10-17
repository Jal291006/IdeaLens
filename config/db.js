const mongoose = require('mongoose');
const dns = require('dns');

// Fix for Windows / ISP DNS resolvers failing on mongodb+srv:// SRV lookups
try {
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (dnsErr) {
  // Ignore if permissions or platform prevent changing DNS servers
}

let isConnected = false;

async function connectDB(uri) {
  if (!uri) {
    console.warn('⚠️ MONGODB_URI not provided. Running in disconnected mode.');
    return false;
  }

  try {
    const conn = await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 8000 // 8s timeout
    });

    isConnected = true;
    console.log(`✅ MongoDB Atlas Connected successfully: ${conn.connection.host}`);
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
