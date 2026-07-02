/**
 * @file        github.service.js
 * @description TechTrust GitHub API integration service.
 *              Fetches developer activity data from GitHub REST API v3.
 *              Used by the verification service to collect raw data
 *              before sending to the AI scoring engine.
 *              Constitution Standard 8  — fault tolerant, retries on failure.
 *              Constitution Standard 9  — rate limit handling built in.
 * @author      Muaishaq
 * @created     2026-07-02
 * @modified    2026-07-02
 */

'use strict';

const axios = require('axios');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// ── GitHub API Configuration ──────────────────────────────────────────────────
const GITHUB_API_BASE = 'https://api.github.com';
const REQUEST_TIMEOUT_MS = 10000;  // 10 seconds per request
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 1000;

// ── Axios Instance ────────────────────────────────────────────────────────────
/**
 * @description Configured Axios instance for GitHub API requests.
 *              Includes auth header, timeout, and standard headers.
 */
const githubClient = axios.create({
  baseURL: GITHUB_API_BASE,
  timeout: REQUEST_TIMEOUT_MS,
  headers: {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'TechTrust-Platform',
    ...(process.env.GITHUB_TOKEN && {
      Authorization: `Bearer ${process.env.GITHUB_TOKEN}`,
    }),
  },
});

// ── Retry Utility ─────────────────────────────────────────────────────────────
/**
 * @description Executes a GitHub API request with automatic retry on failure.
 *              Constitution Standard 8 — automatic retries with backoff.
 * @param       {Function} requestFn  - Async function that makes the API call
 * @param       {number}   retries    - Number of retries remaining
 * @returns     {Promise<*>} API response data
 * @throws      {AppError} If all retries exhausted or rate limit hit
 */
const withRetry = async (requestFn, retries = MAX_RETRIES) => {
  try {
    return await requestFn();
  } catch (error) {
    // GitHub rate limit hit — do not retry
    if (error.response?.status === 403 &&
        error.response?.headers['x-ratelimit-remaining'] === '0') {
      const resetTime = error.response.headers['x-ratelimit-reset'];
      logger.warn('GitHub API rate limit reached', { resetTime });
      throw AppError.tooManyRequests(
        'GitHub API rate limit reached. Please try again later.'
      );
    }

    // No more retries — throw the error
    if (retries === 0) {
      logger.error('GitHub API request failed after all retries', {
        error: error.message,
        status: error.response?.status,
      });
      throw error;
    }

    // Wait and retry with exponential backoff
    const delay = RETRY_DELAY_MS * (MAX_RETRIES - retries + 1);
    logger.warn(`GitHub API request failed — retrying in ${delay}ms`, {
      retriesLeft: retries - 1,
      error: error.message,
    });

    await new Promise((resolve) => setTimeout(resolve, delay));
    return withRetry(requestFn, retries - 1);
  }
};

// ── Data Fetchers ─────────────────────────────────────────────────────────────
/**
 * @description Fetches basic GitHub user profile data.
 * @param       {string} username - GitHub username
 * @returns     {Promise<Object>} GitHub user profile data
 * @throws      {AppError} If user not found on GitHub
 */
const fetchUserProfile = async (username) => {
  try {
    const response = await withRetry(() =>
      githubClient.get(`/users/${username}`)
    );

    return {
      login: response.data.login,
      name: response.data.name,
      bio: response.data.bio,
      publicRepos: response.data.public_repos,
      followers: response.data.followers,
      following: response.data.following,
      createdAt: response.data.created_at,
      updatedAt: response.data.updated_at,
    };
  } catch (error) {
    if (error.response?.status === 404) {
      throw AppError.notFound(
        `GitHub user '${username}' not found. Please check your GitHub username.`
      );
    }
    throw error;
  }
};

/**
 * @description Fetches all public repositories for a GitHub user.
 *              Paginates through all pages to get complete list.
 * @param       {string} username - GitHub username
 * @returns     {Promise<Array>} Array of repository data objects
 */
const fetchRepositories = async (username) => {
  const repos = [];
  let page = 1;
  const perPage = 100; // Maximum allowed by GitHub API

  while (true) {
    const response = await withRetry(() =>
      githubClient.get(`/users/${username}/repos`, {
        params: {
          page,
          per_page: perPage,
          sort: 'updated',
          type: 'owner', // Only repos owned by user — not forked
        },
      })
    );

    const pageRepos = response.data;
    repos.push(...pageRepos);

    // Stop if we got fewer repos than requested — last page
    if (pageRepos.length < perPage) break;

    page++;

    // Safety cap — max 500 repos to prevent abuse
    if (repos.length >= 500) break;
  }

  // Extract only the fields we need — minimize data stored
  return repos.map((repo) => ({
    name: repo.name,
    description: repo.description,
    language: repo.language,
    stargazersCount: repo.stargazers_count,
    forksCount: repo.forks_count,
    isForked: repo.fork,
    size: repo.size,
    createdAt: repo.created_at,
    updatedAt: repo.updated_at,
    pushedAt: repo.pushed_at,
    hasReadme: repo.has_wiki,
    openIssuesCount: repo.open_issues_count,
    topics: repo.topics || [],
    defaultBranch: repo.default_branch,
  }));
};

/**
 * @description Fetches commit activity statistics for a repository.
 * @param       {string} username - GitHub username
 * @param       {string} repoName - Repository name
 * @returns     {Promise<Object>} Commit activity data
 */
const fetchCommitActivity = async (username, repoName) => {
  try {
    const response = await withRetry(() =>
      githubClient.get(`/repos/${username}/${repoName}/stats/commit_activity`)
    );

    // GitHub returns null or empty array for repos with no commits
    if (!response.data || response.data.length === 0) {
      return { weeklyCommits: [], totalCommits: 0 };
    }

    const weeklyCommits = response.data.map((week) => week.total);
    const totalCommits = weeklyCommits.reduce((sum, count) => sum + count, 0);

    return { weeklyCommits, totalCommits };
  } catch {
    // Return empty data if commit stats unavailable — not a fatal error
    return { weeklyCommits: [], totalCommits: 0 };
  }
};

/**
 * @description Fetches language breakdown for a repository.
 * @param       {string} username - GitHub username
 * @param       {string} repoName - Repository name
 * @returns     {Promise<Object>} Language name to bytes mapping
 */
const fetchRepoLanguages = async (username, repoName) => {
  try {
    const response = await withRetry(() =>
      githubClient.get(`/repos/${username}/${repoName}/languages`)
    );
    return response.data || {};
  } catch {
    return {};
  }
};

/**
 * @description Fetches user's contribution statistics.
 *              Uses the events API to get recent activity.
 * @param       {string} username - GitHub username
 * @returns     {Promise<Object>} Contribution statistics
 */
const fetchContributionStats = async (username) => {
  try {
    const response = await withRetry(() =>
      githubClient.get(`/users/${username}/events/public`, {
        params: { per_page: 100 },
      })
    );

    const events = response.data || [];

    // Count different event types
    const stats = {
      totalEvents: events.length,
      pushEvents: 0,
      pullRequestEvents: 0,
      issueEvents: 0,
      reviewEvents: 0,
      recentActivity: [],
    };

    events.forEach((event) => {
      switch (event.type) {
        case 'PushEvent':
          stats.pushEvents++;
          break;
        case 'PullRequestEvent':
          stats.pullRequestEvents++;
          break;
        case 'IssuesEvent':
          stats.issueEvents++;
          break;
        case 'PullRequestReviewEvent':
          stats.reviewEvents++;
          break;
      }

      // Track last 10 events for recency analysis
      if (stats.recentActivity.length < 10) {
        stats.recentActivity.push({
          type: event.type,
          createdAt: event.created_at,
          repoName: event.repo?.name,
        });
      }
    });

    return stats;
  } catch {
    return {
      totalEvents: 0,
      pushEvents: 0,
      pullRequestEvents: 0,
      issueEvents: 0,
      reviewEvents: 0,
      recentActivity: [],
    };
  }
};

/**
 * @description Fetches starred repositories count as community impact signal.
 * @param       {string} username - GitHub username
 * @returns     {Promise<number>} Number of repos the user has starred
 */
const fetchStarredCount = async (username) => {
  try {
    const response = await withRetry(() =>
      githubClient.get(`/users/${username}/starred`, {
        params: { per_page: 1 },
      })
    );

    // Get total from Link header if available
    const linkHeader = response.headers.link || '';
    const match = linkHeader.match(/page=(\d+)>; rel="last"/);
    return match ? parseInt(match[1], 10) : response.data.length;
  } catch {
    return 0;
  }
};

// ── Main Data Collector ───────────────────────────────────────────────────────
/**
 * @description Collects all GitHub data needed for AI scoring.
 *              Orchestrates multiple API calls with graceful degradation.
 *              If some calls fail, scoring continues with available data.
 *              Constitution Standard 8 — fault tolerant, isolated failures.
 * @param       {string} username - GitHub username to analyze
 * @returns     {Promise<Object>} Complete GitHub data package for AI engine
 * @throws      {AppError} If user profile cannot be fetched (fatal error)
 */
const collectDeveloperData = async (username) => {
  logger.info('Starting GitHub data collection', { username });

  // User profile is required — fatal if this fails
  const userProfile = await fetchUserProfile(username);

  // Fetch repositories — required for scoring
  const repositories = await fetchRepositories(username);

  // Fetch language data for top 10 repos by size
  // Limit to avoid hitting rate limits
  const topRepos = repositories
    .filter((repo) => !repo.isForked)
    .slice(0, 10);

  const repoLanguages = {};
  for (const repo of topRepos) {
    repoLanguages[repo.name] = await fetchRepoLanguages(username, repo.name);
  }

  // Fetch contribution stats and starred count in parallel
  const [contributionStats, starredCount] = await Promise.all([
    fetchContributionStats(username),
    fetchStarredCount(username),
  ]);

  // Calculate aggregate language stats across all repos
  const languageTotals = {};
  Object.values(repoLanguages).forEach((langs) => {
    Object.entries(langs).forEach(([lang, bytes]) => {
      languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
    });
  });

  // Build complete data package for AI engine
  const dataPackage = {
    collectedAt: new Date().toISOString(),
    username,

    profile: userProfile,

    repositories: {
      total: repositories.length,
      original: repositories.filter((r) => !r.isForked).length,
      forked: repositories.filter((r) => r.isForked).length,
      list: repositories,
    },

    languages: {
      totals: languageTotals,
      byRepo: repoLanguages,
      primaryLanguage: Object.entries(languageTotals)
        .sort(([, a], [, b]) => b - a)[0]?.[0] || null,
    },

    activity: {
      ...contributionStats,
      starredCount,
      accountAgeDays: Math.floor(
        (Date.now() - new Date(userProfile.createdAt).getTime()) /
        (1000 * 60 * 60 * 24)
      ),
    },
  };

  logger.info('GitHub data collection complete', {
    username,
    repoCount: repositories.length,
    languageCount: Object.keys(languageTotals).length,
  });

  return dataPackage;
};

module.exports = {
  collectDeveloperData,
  fetchUserProfile,
  fetchRepositories,
  fetchCommitActivity,
  fetchRepoLanguages,
  fetchContributionStats,
};