const express = require('express');
const router = express.Router();
const { getDbStatus } = require('../config/db');
const config = require('../config/env');

router.get('/health', (req, res) => {
  const db = getDbStatus();

  res.json({
    success: true,
    status: 'online',
    appName: 'IdeaLens',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    services: {
      database: {
        type: 'MongoDB',
        connected: db.connected
      },
      geminiAi: {
        configured: Boolean(config.GEMINI_API_KEY)
      },
      githubApi: {
        authenticated: Boolean(config.GITHUB_TOKEN)
      }
    }
  });
});

module.exports = router;
