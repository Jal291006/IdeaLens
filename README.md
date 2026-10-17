# 🛡️ IdeaLens AI

> **AI-Powered Duplicate Project & Idea Detection with Innovation Advisory**  
> Developed for college hackathons to validate project proposals against real public codebases, detect overlapping features, explain similarities, and recommend unique technical pivots to stand out to judges.

---

## 🌟 Key Features

1. **Live GitHub REST API Discovery:**
   - Dynamically searches public repositories across multiple diverse queries.
   - Extracts repository metadata, stargazers, topics, and README snippets.
   - In-memory caching and rate-limit protection.

2. **Dedicated Mathematical Similarity Engine:**
   - Separates algorithmic calculations from LLM hallucination.
   - Computes text cosine similarity with lightweight word stemming.
   - Evaluates technology coverage and title alignment.

3. **Gemini AI Feature Extraction & Innovation Advisor:**
   - Transforms project descriptions into structured technical representations using **Gemini 1.5 Flash**.
   - Generates project-specific innovation recommendations (with Low, Medium, High complexity ratings) to differentiate your project.

4. **Zero-Friction Resilience:**
   - Resilient database layer: seamlessly connects to **MongoDB Atlas** or falls back to in-memory mode so demos never crash.
   - Fast, clean single-page Bootstrap 5 dashboard with 1-click test presets.

---

## 🚀 Quick Setup & Installation

### 1. Prerequisites
- **Node.js** (v18 or higher)
- **npm** (v9 or higher)

### 2. Clone and Install
```bash
git clone <YOUR_REPO_URL>
cd projectshield-ai
npm install
```

### 3. Configure Environment Variables
Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```
Update your `.env` file:
```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/projectshield
GITHUB_TOKEN=your_github_personal_access_token_optional
GEMINI_API_KEY=your_gemini_api_key_from_google_ai_studio
```

> **Note:** 
> - `GEMINI_API_KEY`: Free key available at [Google AI Studio](https://aistudio.google.com/).
> - `GITHUB_TOKEN`: Optional. Increases your GitHub API rate limit from 60 to 5,000 requests/hour.

### 4. Run the Application
```bash
npm start
```
Open your browser at: **`http://localhost:5000`**

---

## 🧪 Testing
Run the automated test suite for similarity calibration:
```bash
npm test
```

---

## 📂 Project Architecture

```
├── config/
│   ├── env.js                # Zod environment validation
│   └── db.js                 # Resilient MongoDB connector
├── data/
│   └── seed_projects.json    # Curated benchmark projects
├── middleware/
│   ├── errorHandler.js       # Safe error handler without secret leaks
│   └── rateLimiter.js        # Express rate limiting
├── models/
│   └── ProjectAnalysis.js    # Mongoose schema + in-memory store
├── public/
│   └── index.html            # Single-page UI with real-time feedback
├── routes/
│   ├── health.js             # GET /api/health
│   └── projectRoutes.js      # REST API for project analysis
├── services/
│   ├── geminiService.js      # Gemini feature extraction & innovation advisor
│   ├── githubService.js      # Multi-query GitHub search & README fetcher
│   └── similarityEngine.js   # Cosine similarity & feature coverage engine
├── tests/
│   └── similarity.test.js    # Mathematical similarity calibration tests
├── .env.example              # Environment variable template
├── .gitignore                # Protects secrets & node_modules
├── package.json              # Dependencies and scripts
└── server.js                 # Express application entry point
```

---

## 🛡️ License
ISC
