const mongoose = require('mongoose');

const ProjectAnalysisSchema = new mongoose.Schema({
  title: {
    type: String,
    required: true,
    trim: true,
    maxlength: 200
  },
  description: {
    type: String,
    required: true,
    trim: true,
    maxlength: 3000
  },
  problem: {
    type: String,
    trim: true,
    default: ''
  },
  solution: {
    type: String,
    trim: true,
    default: ''
  },
  technologies: [{
    type: String,
    trim: true
  }],
  category: {
    type: String,
    default: 'General'
  },
  clientId: {
    type: String,
    default: 'anonymous',
    index: true
  },
  // Extracted features via AI
  extractedFeatures: {
    main_objective: String,
    target_users: [String],
    problem_solved: String,
    core_functionalities: [String],
    technical_approach: String,
    hardware_requirements: [String],
    software_components: [String],
    potentially_unique_features: [String]
  },
  // Discovered repositories metadata
  discoveredRepositories: [{
    name: String,
    full_name: String,
    html_url: String,
    description: String,
    language: String,
    stars: Number,
    forks: Number
  }],
  // Similarity measurements
  similarityResults: {
    highestSimilarityScore: Number,
    overallRisk: {
      type: String,
      enum: ['High Duplicate Risk', 'Moderate Overlap', 'Low Overlap']
    },
    topMatch: mongoose.Schema.Types.Mixed,
    comparisons: [mongoose.Schema.Types.Mixed]
  },
  // AI Explanations
  explanation: {
    overlapping_features: [String],
    important_differences: [String],
    distinctive_angles: [String],
    evidence_summary: String,
    confidence_rating: String
  },
  // Innovation Recommendations
  innovationRecommendations: [{
    pivot_title: String,
    reason_for_suggestion: String,
    how_it_differs: String,
    implementation_complexity: String
  }],
  evolutionRoadmap: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  status: {
    type: String,
    enum: ['completed', 'partial', 'failed'],
    default: 'completed'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Create index for fast listing and search
ProjectAnalysisSchema.index({ createdAt: -1 });
ProjectAnalysisSchema.index({ title: 'text', description: 'text' });

const ProjectAnalysis = mongoose.models.ProjectAnalysis || mongoose.model('ProjectAnalysis', ProjectAnalysisSchema, 'project_audits');

// In-memory resilient store when MongoDB is offline
const memoryStore = new Map();

/**
 * Persists an analysis report, gracefully falling back to memory if DB is offline
 */
async function saveAnalysisReport(data) {
  const isMongoReady = mongoose.connection.readyState === 1;

  if (isMongoReady) {
    try {
      const doc = new ProjectAnalysis(data);
      const saved = await doc.save();
      return { report: saved.toObject(), storage: 'mongodb' };
    } catch (err) {
      console.warn('MongoDB save failed, storing in memory store:', err.message);
    }
  }

  // Fallback to in-memory store
  const syntheticId = 'mem_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7);
  const memoryDoc = {
    ...data,
    _id: syntheticId,
    createdAt: new Date().toISOString()
  };
  memoryStore.set(syntheticId, memoryDoc);
  return { report: memoryDoc, storage: 'memory' };
}

/**
 * Retrieves paginated analyses from MongoDB or in-memory store
 */
async function getAnalysisHistory(page = 1, limit = 10, search = '', clientId = '') {
  const isMongoReady = mongoose.connection.readyState === 1;

  if (isMongoReady) {
    try {
      const query = {};
      if (clientId) {
        query.clientId = clientId;
      }
      if (search) {
        query.$text = { $search: search };
      }

      const skip = (page - 1) * limit;
      const [items, total] = await Promise.all([
        ProjectAnalysis.find(query)
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .select('title category clientId similarityResults.highestSimilarityScore similarityResults.overallRisk similarityResults.topMatch status createdAt')
          .lean(),
        ProjectAnalysis.countDocuments(query)
      ]);

      return { items, total, page, totalPages: Math.ceil(total / limit), storage: 'mongodb' };
    } catch (err) {
      console.warn('MongoDB read failed, falling back to memory:', err.message);
    }
  }

  // Read from memory store
  let items = Array.from(memoryStore.values());
  if (clientId) {
    items = items.filter(i => i.clientId === clientId);
  }
  if (search) {
    const s = search.toLowerCase();
    items = items.filter(i => i.title.toLowerCase().includes(s) || i.description.toLowerCase().includes(s));
  }
  items.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  const total = items.length;
  const skip = (page - 1) * limit;
  const paginated = items.slice(skip, skip + limit);

  return {
    items: paginated,
    total,
    page,
    totalPages: Math.ceil(total / limit) || 1,
    storage: 'memory'
  };
}

/**
 * Retrieves a single report by ID
 */
async function getAnalysisById(id) {
  if (id.startsWith('mem_')) {
    return memoryStore.get(id) || null;
  }

  if (mongoose.connection.readyState === 1) {
    try {
      return await ProjectAnalysis.findById(id).lean();
    } catch (err) {
      return null;
    }
  }

  return memoryStore.get(id) || null;
}

/**
 * Safely deletes a report by ID
 */
async function deleteAnalysisById(id) {
  if (id.startsWith('mem_')) {
    return memoryStore.delete(id);
  }

  if (mongoose.connection.readyState === 1) {
    try {
      const res = await ProjectAnalysis.findByIdAndDelete(id);
      return Boolean(res);
    } catch (err) {
      return false;
    }
  }

  return memoryStore.delete(id);
}

module.exports = {
  ProjectAnalysis,
  saveAnalysisReport,
  getAnalysisHistory,
  getAnalysisById,
  deleteAnalysisById
};
