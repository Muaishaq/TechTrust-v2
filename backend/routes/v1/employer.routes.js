/**
 * @file        employer.routes.js
 * @description TechTrust employer routes.
 *              Endpoints:
 *              POST   /api/v1/employers/profile         - Create employer profile
 *              GET    /api/v1/employers/profile         - Get own profile
 *              PUT    /api/v1/employers/profile         - Update own profile
 *              GET    /api/v1/employers/search          - Search developers
 *              GET    /api/v1/employers/saved           - Get saved developers
 *              POST   /api/v1/employers/saved/:id       - Save a developer
 *              DELETE /api/v1/employers/saved/:id       - Unsave a developer
 *              GET    /api/v1/employers/jobs            - Get own job postings
 *              POST   /api/v1/employers/jobs            - Create job posting
 *              PUT    /api/v1/employers/jobs/:id        - Update job posting
 *              DELETE /api/v1/employers/jobs/:id        - Close job posting
 *              GET    /api/v1/employers/jobs/search     - Search public jobs
 *              Constitution Standard 3  — all routes authenticated.
 *              Constitution Standard 10 — all endpoints documented.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const express = require('express');
const router = express.Router();
const employerController = require('../../controllers/employer.controller');
const {
  authenticate,
  requireEmployer,
  requireDeveloper,
} = require('../../middleware/auth.middleware');
const { searchLimiter } = require('../../middleware/rateLimiter.middleware');

// ── Profile Routes ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/employers/profile
 * Creates a new employer profile.
 * Requires: employer role.
 */
router.post(
  '/profile',
  requireEmployer,
  employerController.createProfile
);

/**
 * GET /api/v1/employers/profile
 * Returns the authenticated employer's own profile.
 * Requires: employer role.
 */
router.get(
  '/profile',
  requireEmployer,
  employerController.getOwnProfile
);

/**
 * PUT /api/v1/employers/profile
 * Updates the authenticated employer's profile.
 * Requires: employer role.
 * Body: { companyName, companySize, industry, website, description, location }
 */
router.put(
  '/profile',
  requireEmployer,
  employerController.updateProfile
);

// ── Developer Search & Saving ─────────────────────────────────────────────────

/**
 * GET /api/v1/employers/search
 * Searches verified developer profiles.
 * Requires: employer role.
 * Rate limited — prevents bulk scraping.
 * Query: minTrustScore, availability, experienceLevel, country, skills, page, limit
 */
router.get(
  '/search',
  requireEmployer,
  searchLimiter,
  employerController.searchDevelopers
);

/**
 * GET /api/v1/employers/saved
 * Returns employer's saved developer profiles.
 * Requires: employer role.
 */
router.get(
  '/saved',
  requireEmployer,
  employerController.getSavedDevelopers
);

/**
 * POST /api/v1/employers/saved/:id
 * Saves a developer profile to employer's list.
 * Requires: employer role.
 * Params: id = developer profile ID
 */
router.post(
  '/saved/:id',
  requireEmployer,
  employerController.saveDeveloper
);

/**
 * DELETE /api/v1/employers/saved/:id
 * Removes a developer from employer's saved list.
 * Requires: employer role.
 * Params: id = developer profile ID
 */
router.delete(
  '/saved/:id',
  requireEmployer,
  employerController.unsaveDeveloper
);

// ── Job Postings ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/employers/jobs/search
 * Searches public active job postings.
 * Available to authenticated developers.
 * Must be BEFORE /jobs/:id to avoid route conflict.
 * Query: workType, experienceLevel, country, skills, page, limit
 */
router.get(
  '/jobs/search',
  authenticate,
  searchLimiter,
  employerController.searchJobPostings
);

/**
 * GET /api/v1/employers/jobs
 * Returns all job postings by the authenticated employer.
 * Requires: employer role.
 * Query: status (optional filter)
 */
router.get(
  '/jobs',
  requireEmployer,
  employerController.getOwnJobPostings
);

/**
 * POST /api/v1/employers/jobs
 * Creates a new job posting.
 * Requires: employer role.
 * Body: { title, description, requirements, skills, workType, ... }
 */
router.post(
  '/jobs',
  requireEmployer,
  employerController.createJobPosting
);

/**
 * PUT /api/v1/employers/jobs/:id
 * Updates a job posting.
 * Requires: employer role — must own the job posting.
 * Params: id = job posting ID
 */
router.put(
  '/jobs/:id',
  requireEmployer,
  employerController.updateJobPosting
);

/**
 * DELETE /api/v1/employers/jobs/:id
 * Closes a job posting permanently.
 * Requires: employer role — must own the job posting.
 * Params: id = job posting ID
 */
router.delete(
  '/jobs/:id',
  requireEmployer,
  employerController.closeJobPosting
);

module.exports = router;