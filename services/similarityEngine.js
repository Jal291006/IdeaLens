/**
 * Similarity Detection Engine
 * Separates mathematical calculations from LLM explanations.
 * Combines:
 *  1. Text Vectorization & Cosine Similarity with lightweight stemming
 *  2. Technology & Feature Coverage (What % of proposal tech is in the repo)
 *  3. Title/Objective Key Concept Alignment
 */

const SIMILARITY_CONFIG = {
  SEMANTIC_WEIGHT: 0.50,
  FEATURE_COVERAGE_WEIGHT: 0.35,
  TITLE_ALIGNMENT_WEIGHT: 0.15,
  THRESHOLDS: {
    HIGH_DUPLICATE_RISK: 65,
    MODERATE_OVERLAP: 35
  }
};

/**
 * Lightweight stemmer (strips s, es, ed, ing, tion)
 */
function stem(word) {
  return word
    .replace(/(ing|tion|tions|ness|es|ed|s)$/i, '')
    .trim();
}

/**
 * Tokenizes, removes stopwords, and stems words
 */
function tokenize(text) {
  if (!text || typeof text !== 'string') return [];
  const stopwords = new Set([
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
    'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by', 'can', 'did', 'do',
    'does', 'doing', 'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'has', 'have', 'having',
    'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how', 'i', 'if', 'in', 'into', 'is', 'it',
    'its', 'itself', 'just', 'me', 'more', 'most', 'my', 'myself', 'no', 'nor', 'not', 'now', 'of', 'off', 'on',
    'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 's', 'same', 'she', 'should',
    'so', 'some', 'such', 't', 'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there',
    'these', 'they', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up', 'very', 'was', 'we', 'were',
    'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'will', 'with', 'you', 'your', 'yours'
  ]);

  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 2 && !stopwords.has(token))
    .map(stem);
}

/**
 * Computes Cosine Similarity between two texts (0 to 1)
 */
function calculateCosineSimilarity(textA, textB) {
  const tokensA = tokenize(textA);
  const tokensB = tokenize(textB);

  if (tokensA.length === 0 || tokensB.length === 0) return 0;

  const vocab = new Set([...tokensA, ...tokensB]);
  const freqA = {};
  const freqB = {};

  tokensA.forEach(t => { freqA[t] = (freqA[t] || 0) + 1; });
  tokensB.forEach(t => { freqB[t] = (freqB[t] || 0) + 1; });

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (const term of vocab) {
    const valA = freqA[term] || 0;
    const valB = freqB[term] || 0;
    dotProduct += valA * valB;
    normA += valA * valA;
    normB += valB * valB;
  }

  if (normA === 0 || normB === 0) return 0;
  return dotProduct / (Math.sqrt(normA) * Math.sqrt(normB));
}

/**
 * Computes coverage: how many of proposed features/technologies are present in the target
 */
function calculateCoverage(itemsToMatch = [], targetText = '') {
  if (!itemsToMatch || itemsToMatch.length === 0) return 0;

  const targetTokens = new Set(tokenize(targetText));
  let matchedCount = 0;

  for (const item of itemsToMatch) {
    const stemmedItem = stem(item.toLowerCase().trim());
    if (targetTokens.has(stemmedItem) || targetText.toLowerCase().includes(item.toLowerCase())) {
      matchedCount++;
    }
  }

  return matchedCount / itemsToMatch.length;
}

/**
 * Compares a submitted project with a single candidate repository
 */
function compareProjectWithRepository(project, repo) {
  const repoFullText = `${repo.name} ${repo.description || ''} ${repo.readmeSnippet || ''} ${repo.language || ''}`;
  const projectFullText = `${project.title} ${project.description} ${project.problem || ''} ${project.solution || ''}`;

  // 1. Text Semantic Cosine Similarity (0 - 100)
  const semanticScore = Math.round(calculateCosineSimilarity(projectFullText, repoFullText) * 100);

  // 2. Tech Stack & Feature Coverage (0 - 100)
  const projectTech = project.technologies || [];
  const featureCoverageScore = Math.round(calculateCoverage(projectTech, repoFullText) * 100);

  // 3. Title Concept Alignment (0 - 100)
  const titleCosine = Math.round(calculateCosineSimilarity(project.title, `${repo.name} ${repo.description || ''}`) * 100);

  // Weighted Composite Score (0 - 100)
  const compositeScore = Math.min(
    100,
    Math.round(
      (semanticScore * SIMILARITY_CONFIG.SEMANTIC_WEIGHT) +
      (featureCoverageScore * SIMILARITY_CONFIG.FEATURE_COVERAGE_WEIGHT) +
      (titleCosine * SIMILARITY_CONFIG.TITLE_ALIGNMENT_WEIGHT)
    )
  );

  let riskCategory = 'Low Overlap';
  if (compositeScore >= SIMILARITY_CONFIG.THRESHOLDS.HIGH_DUPLICATE_RISK) {
    riskCategory = 'High Duplicate Risk';
  } else if (compositeScore >= SIMILARITY_CONFIG.THRESHOLDS.MODERATE_OVERLAP) {
    riskCategory = 'Moderate Overlap';
  }

  return {
    repoName: repo.full_name || repo.name,
    repoUrl: repo.html_url,
    description: repo.description,
    metrics: {
      compositeScore,
      semanticScore,
      featureCoverageScore,
      titleCosine
    },
    riskCategory
  };
}

/**
 * Analyzes and ranks all candidate repositories against the proposal
 */
function rankCandidateRepositories(project, candidateRepositories = []) {
  const comparisons = candidateRepositories.map(repo => compareProjectWithRepository(project, repo));

  // Rank by compositeScore descending
  comparisons.sort((a, b) => b.metrics.compositeScore - a.metrics.compositeScore);

  const highestScore = comparisons.length > 0 ? comparisons[0].metrics.compositeScore : 0;
  const topMatch = comparisons.length > 0 ? comparisons[0] : null;

  return {
    comparisons,
    highestSimilarityScore: highestScore,
    topMatch,
    overallRisk: highestScore >= SIMILARITY_CONFIG.THRESHOLDS.HIGH_DUPLICATE_RISK
      ? 'High Duplicate Risk'
      : highestScore >= SIMILARITY_CONFIG.THRESHOLDS.MODERATE_OVERLAP
      ? 'Moderate Overlap'
      : 'Low Overlap'
  };
}

module.exports = {
  SIMILARITY_CONFIG,
  calculateCosineSimilarity,
  calculateCoverage,
  compareProjectWithRepository,
  rankCandidateRepositories
};
