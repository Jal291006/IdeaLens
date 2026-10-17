const axios = require('axios');
const config = require('../config/env');

// In-memory cache for README content and search results to prevent repeated GitHub requests
const readmeCache = new Map();
const searchCache = new Map();

/**
 * Builds GitHub API request headers, attaching token if provided
 */
function getGithubHeaders() {
  const headers = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'ProjectShield-AI-App'
  };

  if (config.GITHUB_TOKEN && config.GITHUB_TOKEN.trim().length > 0) {
    headers['Authorization'] = `token ${config.GITHUB_TOKEN.trim()}`;
  }

  return headers;
}

/**
 * Generates multiple search queries from project submission
 * Does not rely on a single keyword query
 * @param {string} title
 * @param {string} description
 * @param {string[]} technologies
 * @returns {string[]} List of 2 to 4 diverse query strings
 */
function generateSearchQueries(title, description, technologies = []) {
  const queries = [];
  const cleanTitle = (title || '').replace(/[^\w\s]/gi, '').trim();

  // Query 1: Cleaned title
  if (cleanTitle) {
    queries.push(cleanTitle);
  }

  // Query 2: Extracted keywords from description + technology
  const stopwords = new Set(['the', 'and', 'with', 'using', 'system', 'based', 'for', 'from', 'that', 'this', 'into', 'user', 'project', 'application', 'platform']);
  const words = (description || '')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length > 3 && !stopwords.has(w));

  const topKeywords = words.slice(0, 3).join(' ');
  if (topKeywords && !queries.includes(topKeywords)) {
    queries.push(topKeywords);
  }

  // Query 3: Primary technology + domain keywords
  if (technologies.length > 0) {
    const techKey = technologies[0];
    const domainKey = words.slice(0, 2).join(' ');
    const techQuery = `${domainKey} ${techKey}`.trim();
    if (techQuery && !queries.includes(techQuery)) {
      queries.push(techQuery);
    }
  }

  // Default fallback if queries are empty
  if (queries.length === 0) {
    queries.push('hackathon project');
  }

  return queries.slice(0, 3); // Max 3 queries to respect rate limits
}

/**
 * Searches GitHub repositories across multiple queries and deduplicates results
 * @param {string[]} queries
 * @param {number} maxResultsPerQuery
 * @returns {Promise<{repositories: Array, totalFound: number, rateLimitReached: boolean}>}
 */
async function searchRepositoriesAcrossQueries(queries, maxResultsPerQuery = 4) {
  const repoMap = new Map();
  let rateLimitReached = false;

  for (const q of queries) {
    if (!q || q.trim().length === 0) continue;

    // Check cache
    const cacheKey = `search:${q.toLowerCase()}`;
    if (searchCache.has(cacheKey)) {
      const cached = searchCache.get(cacheKey);
      cached.forEach(r => repoMap.set(r.html_url, r));
      continue;
    }

    try {
      const response = await axios.get('https://api.github.com/search/repositories', {
        params: {
          q: `${q} in:name,description`,
          sort: 'stars',
          order: 'desc',
          per_page: maxResultsPerQuery
        },
        headers: getGithubHeaders(),
        timeout: 5000 // 5s timeout
      });

      const items = response.data.items || [];
      searchCache.set(cacheKey, items);

      for (const item of items) {
        if (!repoMap.has(item.html_url)) {
          repoMap.set(item.html_url, {
            name: item.name,
            full_name: item.full_name,
            html_url: item.html_url,
            description: item.description || 'No description provided.',
            language: item.language || 'Not specified',
            stars: item.stargazers_count || 0,
            forks: item.forks_count || 0,
            updated_at: item.updated_at,
            matched_query: q
          });
        }
      }
    } catch (err) {
      if (err.response && err.response.status === 403) {
        console.warn('⚠️ GitHub API rate limit reached during search query:', q);
        rateLimitReached = true;
        break; // Stop further calls if rate limited
      } else {
        console.warn(`⚠️ GitHub search failed for query "${q}":`, err.message);
      }
    }
  }

  return {
    repositories: Array.from(repoMap.values()),
    totalFound: repoMap.size,
    rateLimitReached
  };
}

/**
 * Retrieves README for a repository (using cache and sanitization)
 * @param {string} fullName e.g. "facebook/react"
 * @returns {Promise<string>}
 */
async function fetchRepoReadme(fullName) {
  if (!fullName) return '';

  if (readmeCache.has(fullName)) {
    return readmeCache.get(fullName);
  }

  try {
    const res = await axios.get(`https://api.github.com/repos/${fullName}/readme`, {
      headers: getGithubHeaders(),
      timeout: 4000
    });

    if (res.data && res.data.content) {
      const decoded = Buffer.from(res.data.content, 'base64').toString('utf-8');
      // Prompt-injection defense & token conservation:
      // Strip markdown links, image tags, HTML tags, and slice to 2000 chars
      const sanitized = decoded
        .replace(/!\[.*?\]\(.*?\)/g, '')
        .replace(/<[^>]*>/g, '')
        .replace(/https?:\/\/[^\s]+/g, '')
        .slice(0, 2000);

      readmeCache.set(fullName, sanitized);
      return sanitized;
    }
  } catch (err) {
    // 404 or other error - gracefully set empty string
    readmeCache.set(fullName, '');
  }

  return '';
}

/**
 * Discovers and enriches relevant repositories for a project proposal
 * @param {object} projectData { title, description, technologies }
 * @returns {Promise<{repositories: Array, queriesUsed: string[], rateLimitReached: boolean}>}
 */
async function discoverRelevantRepositories(projectData) {
  const queries = generateSearchQueries(
    projectData.title,
    projectData.description,
    projectData.technologies
  );

  const searchResult = await searchRepositoriesAcrossQueries(queries, 4);
  const topCandidates = searchResult.repositories.slice(0, 6); // Keep top 6 to prevent slow analysis

  // Fetch READMEs in parallel for top candidates
  const enriched = await Promise.all(
    topCandidates.map(async (repo) => {
      const readme = await fetchRepoReadme(repo.full_name);
      return {
        ...repo,
        readmeSnippet: readme
      };
    })
  );

  return {
    repositories: enriched,
    queriesUsed: queries,
    rateLimitReached: searchResult.rateLimitReached
  };
}

module.exports = {
  generateSearchQueries,
  searchRepositoriesAcrossQueries,
  fetchRepoReadme,
  discoverRelevantRepositories
};
