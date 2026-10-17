const { rankCandidateRepositories, calculateCosineSimilarity } = require('../services/similarityEngine');

function testSimilarityEngine() {
  console.log('Testing Mathematical Similarity Engine...');

  const projectA = {
    title: 'Smart Pothole Detection Using Computer Vision',
    description: 'Detects potholes and road cracks using dashboard camera video feed and alerts drivers in real time.',
    technologies: ['Python', 'OpenCV', 'YOLO']
  };

  // 1. Identical/Very Similar Repo
  const repoIdentical = {
    name: 'pothole-detector-yolo',
    full_name: 'dev/pothole-detector-yolo',
    description: 'Real-time pothole detection system using YOLO and OpenCV from dashcam video feeds.',
    readmeSnippet: 'An automated computer vision solution to detect road hazards and potholes.',
    language: 'Python'
  };

  // 2. Different domain
  const repoDifferent = {
    name: 'crypto-arbitrage-bot',
    full_name: 'trader/crypto-arbitrage-bot',
    description: 'High frequency trading bot for cryptocurrency exchanges on Solana and Ethereum.',
    readmeSnippet: 'Automated decentralized trading using flash loans and smart contracts.',
    language: 'Rust'
  };

  const analysis = rankCandidateRepositories(projectA, [repoIdentical, repoDifferent]);

  console.log('Top match:', analysis.topMatch.repoName);
  console.log('Top match composite score:', analysis.topMatch.metrics.compositeScore, '%');
  console.log('Second match composite score:', analysis.comparisons[1].metrics.compositeScore, '%');
  console.log('Overall risk:', analysis.overallRisk);

  if (analysis.topMatch.metrics.compositeScore > 50 && analysis.comparisons[1].metrics.compositeScore < 20) {
    console.log('✅ Phase 4 Verification PASSED: Mathematical similarity ranks duplicates high and unrelated projects low.');
  } else {
    console.error('❌ Phase 4 Verification FAILED: Scoring calibration anomaly.');
    process.exit(1);
  }
}

testSimilarityEngine();
