const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config/env');
const { connectDB } = require('./config/db');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');
const healthRoutes = require('./routes/health');
const projectRoutes = require('./routes/projectRoutes');

const app = express();

// Security and utility middlewares
app.use(cors());
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// Apply rate limiting to all /api/ requests
app.use('/api/', apiLimiter);

// Serve static frontend files
app.use(express.static(path.join(__dirname, 'public')));

// Mount routes
app.use('/api', healthRoutes);
app.use('/api/projects', projectRoutes);

// Central error handler
app.use(errorHandler);

// Connect to MongoDB and start server
async function startServer() {
  await connectDB(config.MONGODB_URI);

  const server = app.listen(config.PORT, () => {
    console.log(`===============================================`);
    console.log(`🛡️  IdeaLens Server listening on port ${config.PORT}`);
    console.log(`🔗 Web Dashboard: http://localhost:${config.PORT}`);
    console.log(`🩺 Health API: http://localhost:${config.PORT}/api/health`);
    console.log(`📡 Projects API: http://localhost:${config.PORT}/api/projects`);
    console.log(`===============================================`);
  });

  const shutdown = () => {
    console.log('Shutting down server gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

if (require.main === module) {
  startServer();
}

module.exports = { app, startServer };
