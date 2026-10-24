const express = require('express');
const router = express.Router();
const { z } = require('zod');
const { analyzeLimiter } = require('../middleware/rateLimiter');
const { discoverRelevantRepositories, fetchRepoByUrl } = require('../services/githubService');
const { rankCandidateRepositories } = require('../services/similarityEngine');
const {
  extractProjectFeatures,
  explainSimilaritiesAndDifferences,
  generateInnovationRecommendations
} = require('../services/geminiService');
const {
  saveAnalysisReport,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysisById
} = require('../models/ProjectAnalysis');

// Input validation schema
const ProjectSubmissionSchema = z.object({
  title: z.string().min(3, 'Project title must be at least 3 characters').max(200),
  description: z.string().min(20, 'Project description must be at least 20 characters').max(3000),
  problem: z.string().optional().default(''),
  solution: z.string().optional().default(''),
  mainFeatures: z.array(z.string()).optional().default([]),
  technologies: z.array(z.string()).min(1, 'Please provide at least one technology (e.g. Python, React)'),
  category: z.string().optional().default('General'),
  clientId: z.string().optional().default('anonymous')
});

/**
 * POST /api/projects/analyze
 * Comprehensive analysis: GitHub discovery + Mathematical Similarity + Gemini Insights + Persistence
 */
router.post('/analyze', analyzeLimiter, async (req, res, next) => {
  try {
    // 1. Validate request payload
    const parseResult = ProjectSubmissionSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        success: false,
        error: parseResult.error.errors.map(e => e.message).join('. ')
      });
    }

    const project = parseResult.data;

    // 2. Discover relevant repositories from GitHub REST API
    let githubDiscovery = { repositories: [], queriesUsed: [], rateLimitReached: false };
    try {
      githubDiscovery = await discoverRelevantRepositories(project);
    } catch (ghErr) {
      console.warn('GitHub search non-fatal error:', ghErr.message);
    }

    // 3. Mathematical similarity calculation
    const similarityResults = rankCandidateRepositories(project, githubDiscovery.repositories);

    // Gemini steps are independent, so run them concurrently instead of making
    // the user wait for each provider round trip in sequence.
    const [extractedFeatures, explanation, innovation] = await Promise.all([
      extractProjectFeatures(project),
      explainSimilaritiesAndDifferences(project, similarityResults.comparisons),
      generateInnovationRecommendations(project, similarityResults.comparisons)
    ]);

    // Cliché Override: If project is an overdone hackathon cliché, enforce high duplicate risk
    if (explanation.is_critically_cliche && (explanation.cliche_duplicate_penalty || 85) > similarityResults.highestSimilarityScore) {
      similarityResults.highestSimilarityScore = explanation.cliche_duplicate_penalty || 88;
      similarityResults.overallRisk = 'High Duplicate Risk';
    }

    // Compile report
    const reportData = {
      title: project.title,
      description: project.description,
      problem: project.problem,
      solution: project.solution,
      technologies: project.technologies,
      category: project.category,
      clientId: project.clientId || req.headers['x-client-id'] || 'anonymous',
      extractedFeatures,
      discoveredRepositories: githubDiscovery.repositories.map(r => ({
        name: r.name,
        full_name: r.full_name,
        html_url: r.html_url,
        description: r.description,
        language: r.language,
        stars: r.stars,
        forks: r.forks
      })),
      similarityResults: {
        highestSimilarityScore: similarityResults.highestSimilarityScore,
        overallRisk: similarityResults.overallRisk,
        topMatch: similarityResults.topMatch,
        comparisons: similarityResults.comparisons
      },
      explanation,
      innovationRecommendations: innovation.recommendations,
      status: 'completed',
      meta: {
        queriesUsed: githubDiscovery.queriesUsed,
        rateLimitReached: githubDiscovery.rateLimitReached
      }
    };

    // 8. Persist report to MongoDB / fallback store
    const { report, storage } = await saveAnalysisReport(reportData);

    return res.status(201).json({
      success: true,
      data: report,
      storage
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects
 * Retrieves paginated list of previous analyses
 */
router.get('/', async (req, res, next) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 10;
    const search = req.query.search || '';
    const clientId = req.query.clientId || req.headers['x-client-id'] || '';

    const history = await getAnalysisHistory(page, limit, search, clientId);
    res.json({
      success: true,
      data: history
    });
  } catch (err) {
    next(err);
  }
});

/**
 * GET /api/projects/:id
 * Retrieves a single analysis report
 */
router.get('/:id', async (req, res, next) => {
  try {
    const report = await getAnalysisById(req.params.id);
    if (!report) {
      return res.status(404).json({
        success: false,
        error: 'Analysis report not found.'
      });
    }

    res.json({
      success: true,
      data: report
    });
  } catch (err) {
    next(err);
  }
});

/**
 * DELETE /api/projects/:id
 * Safely removes a saved report
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const deleted = await deleteAnalysisById(req.params.id);
    if (!deleted) {
      return res.status(404).json({
        success: false,
        error: 'Report not found or could not be deleted.'
      });
    }

    res.json({
      success: true,
      message: 'Analysis report deleted successfully.'
    });
  } catch (err) {
    next(err);
  }
});

/**
 * POST /api/projects/fetch-repo
 * Fetches repository metadata and README directly from a GitHub URL
 */
router.post('/fetch-repo', async (req, res, next) => {
  try {
    const { repoUrl } = req.body;
    if (!repoUrl) {
      return res.status(400).json({ success: false, error: 'Please provide a repoUrl.' });
    }

    const repoData = await fetchRepoByUrl(repoUrl);
    res.json({
      success: true,
      data: repoData
    });
  } catch (err) {
    res.status(400).json({
      success: false,
      error: err.message
    });
  }
});

module.exports = router;

