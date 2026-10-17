const axios = require('axios');
const { app } = require('../server');

async function testHealth() {
  const port = 5099;
  const server = app.listen(port, async () => {
    try {
      console.log(`Testing /api/health on port ${port}...`);
      const res = await axios.get(`http://localhost:${port}/api/health`);
      console.log('Health Response Status:', res.status);
      console.log('Health Response Data:', JSON.stringify(res.data, null, 2));

      if (res.data.status === 'online') {
        console.log('✅ Phase 1 Verification PASSED: Server & Health API functioning correctly.');
      } else {
        console.error('❌ Phase 1 Verification FAILED: Unexpected payload');
      }
    } catch (err) {
      console.error('❌ Verification Error:', err.message);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testHealth();
