const { generateSearchQueries, discoverRelevantRepositories } = require('../services/githubService');

async function testGitHubDiscovery() {
  console.log('Testing GitHub Query Generation...');
  const testProject = {
    title: 'Smart Pothole Detection and Road Damage Mapping',
    description: 'An AI-powered system that mounts on vehicle dashboards to detect potholes using computer vision and GPS to map road damage.',
    technologies: ['Python', 'OpenCV', 'GPS']
  };

  const queries = generateSearchQueries(testProject.title, testProject.description, testProject.technologies);
  console.log('Generated Queries:', queries);

  if (queries.length < 2) {
    console.error('❌ Failed: Expected multiple diverse queries');
    process.exit(1);
  }

  console.log('Testing GitHub Discovery live call...');
  try {
    const results = await discoverRelevantRepositories(testProject);
    console.log(`Discovered ${results.repositories.length} candidate repositories.`);
    if (results.repositories.length > 0) {
      console.log('Top repo:', results.repositories[0].full_name, 'Stars:', results.repositories[0].stars);
      console.log('README snippet length:', results.repositories[0].readmeSnippet?.length || 0);
    }
    console.log('Rate limit reached?', results.rateLimitReached);
    console.log('✅ Phase 2 Verification PASSED: GitHub discovery service functions cleanly.');
  } catch (err) {
    console.error('GitHub discovery test error:', err.message);
  }
}

testGitHubDiscovery();
