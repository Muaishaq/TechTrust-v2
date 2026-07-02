/**
 * @file        developer.routes.js
 * @description TechTrust developer profile routes.
 *              Endpoints:
 *              POST /api/v1/developers/profile        - Create developer profile
 *              GET  /api/v1/developers/profile        - Get own profile
 *              PUT  /api/v1/developers/profile        - Update own profile
 *              GET  /api/v1/developers/verify         - Get verification status
 *              POST /api/v1/developers/verify         - Trigger verification
 *              GET  /api/v1/developers/search         - Search developers (employers)
 *              GET  /api/v1/developers/:username      - Get public profile
 *              Constitution Standard 3  — all routes authenticated except public profile.
 *              Constitution Standard 10 — all endpoints documented.
 * @author      Muaishaq
 * @created     2026-07-02
 * @modified    2026-07-02
 */

'use strict';

const express = require('express');
const router = express.Router();
const developerController = require('../../controllers/developer.controller');
const {
  authenticate,
  requireDeveloper,
  requireEmployer,
  optionalAuth,
} = require('../../middleware/auth.middleware');
const {
  verificationLimiter,
  searchLimiter,
} = require('../../middleware/rateLimiter.middleware');

// ── Profile Routes ────────────────────────────────────────────────────────────

/**
 * POST /api/v1/developers/profile
 * Creates a new developer profile for the authenticated user.
 * Requires: developer role.
 */
router.post(
  '/profile',
  requireDeveloper,
  developerController.createProfile
);

/**
 * GET /api/v1/developers/profile
 * Returns the authenticated developer's own full profile.
 * Requires: developer role.
 */
router.get(
  '/profile',
  requireDeveloper,
  developerController.getOwnProfile
);

/**
 * PUT /api/v1/developers/profile
 * Updates the authenticated developer's profile.
 * Requires: developer role.
 * Body: { title, bio, location, skills, experienceLevel, availability, ... }
 */
router.put(
  '/profile',
  requireDeveloper,
  developerController.updateProfile
);

// ── Verification Routes ───────────────────────────────────────────────────────

/**
 * GET /api/v1/developers/verify
 * Returns current verification status and trust score.
 * Requires: developer role.
 */
router.get(
  '/verify',
  requireDeveloper,
  developerController.getVerificationStatus
);

/**
 * POST /api/v1/developers/verify
 * Triggers the full AI verification flow.
 * Requires: developer role.
 * Strictly rate limited — 3 attempts per hour.
 * Verification cooldown: 90 days (free) / 30 days (premium).
 */
router.post(
  '/verify',
  requireDeveloper,
  verificationLimiter,
  developerController.triggerVerification
);

// ── Search Route ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/developers/search
 * Searches verified developer profiles.
 * Requires: employer or admin role.
 * Rate limited — prevents bulk scraping.
 * Query params: minTrustScore, availability, experienceLevel, country, skills, page, limit
 */
router.get(
  '/search',
  requireEmployer,
  searchLimiter,
  developerController.searchDevelopers
);

// ── Public Profile Route ──────────────────────────────────────────────────────

/**
 * GET /api/v1/developers/:username
 * Returns a public developer profile by GitHub username.
 * Public route — no authentication required.
 * Optional auth — authenticated employers see additional data.
 * Must be LAST — catches all :username params.
 */
router.get(
  '/:username',
  optionalAuth,
  developerController.getPublicProfile
);

module.exports = router;