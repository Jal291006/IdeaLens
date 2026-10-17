const axios = require('axios');
const { app } = require('../server');

async function testProjectShieldAPI() {
  const testPort = 5098;
  const server = app.listen(testPort, async () => {
    try {
      console.log(`Starting API integration test on port ${testPort}...`);
      const baseUrl = `http://localhost:${testPort}/api/projects`;

      // Test 1: Invalid input rejection
      console.log('1. Testing input validation rejection...');
      try {
        await axios.post(`${baseUrl}/analyze`, {
          title: 'Ab', // too short
          description: 'Short'
        });
        console.error('❌ Failed: Invalid payload should have been rejected');
        process.exit(1);
      } catch (err) {
        if (err.response && err.response.status === 400) {
          console.log('✅ Validation correctly rejected invalid input (HTTP 400)');
        } else {
          throw err;
        }
      }

      // Test 2: Live Analysis & Persistence
      console.log('2. Testing POST /api/projects/analyze with full project idea...');
      const payload = {
        title: 'Smart Pothole Detection & Road Quality Assessment',
        description: 'An AI-powered system that uses dashcam cameras to detect road damage and potholes in real-time, recording GPS coordinates to map road maintenance priorities.',
        problem: 'Road hazards and potholes cause thousands of vehicle accidents each year.',
        solution: 'Automated video classification on edge devices alerting city councils.',
        technologies: ['Python', 'OpenCV', 'YOLO', 'React', 'Node.js'],
        category: 'Smart Cities'
      };

      const res = await axios.post(`${baseUrl}/analyze`, payload);
      console.log('Analyze Response Status:', res.status);
      const data = res.data.data;

      console.log('Report ID:', data._id);
      console.log('Highest Similarity Score:', data.similarityResults.highestSimilarityScore, '%');
      console.log('Overall Risk:', data.similarityResults.overallRisk);
      console.log('Discovered Repos:', data.discoveredRepositories.length);
      console.log('Innovation Recommendations:', data.innovationRecommendations.length);

      if (!data._id || typeof data.similarityResults.highestSimilarityScore !== 'number') {
        console.error('❌ Failed: Analysis report missing expected fields');
        process.exit(1);
      }

      // Test 3: GET /api/projects (History)
      console.log('3. Testing GET /api/projects (History)...');
      const historyRes = await axios.get(baseUrl);
      console.log('History total items:', historyRes.data.data.total);
      if (historyRes.data.data.total < 1) {
        console.error('❌ Failed: History should list the analyzed project');
        process.exit(1);
      }

      // Test 4: GET /api/projects/:id (Retrieval)
      console.log('4. Testing GET /api/projects/:id (Reopening saved report)...');
      const getSingleRes = await axios.get(`${baseUrl}/${data._id}`);
      if (getSingleRes.data.data.title !== payload.title) {
        console.error('❌ Failed: Reopened report title mismatch');
        process.exit(1);
      }
      console.log('✅ Reopened report successfully matches title:', getSingleRes.data.data.title);

      // Test 5: DELETE /api/projects/:id (Safe deletion)
      console.log('5. Testing DELETE /api/projects/:id...');
      const delRes = await axios.delete(`${baseUrl}/${data._id}`);
      console.log('Delete status:', delRes.status, delRes.data.message);

      console.log('🎉 ALL BACKEND API & INTEGRATION TESTS PASSED CLEANLY!');
    } catch (err) {
      console.error('API Test Error:', err.response ? err.response.data : err.message);
      process.exit(1);
    } finally {
      server.close();
      process.exit(0);
    }
  });
}

testProjectShieldAPI();
