/**
 * @file        auth.routes.js
 * @description TechTrust authentication routes.
 *              Endpoints:
 *              GET  /api/v1/auth/github          - Initiate GitHub OAuth
 *              GET  /api/v1/auth/github/callback - GitHub OAuth callback
 *              GET  /api/v1/auth/me              - Get current user
 *              POST /api/v1/auth/refresh         - Refresh access token
 *              POST /api/v1/auth/logout          - Logout current user
 *              POST /api/v1/auth/role            - Select user role
 *              POST /api/v1/auth/consent         - Record user consent
 *              Constitution Standard 3  — auth routes have strictest rate limits.
 *              Constitution Standard 10 — all routes documented with endpoints list.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const express = require('express');
const router = express.Router();
const { passport } = require('../../config/passport');
const authController = require('../../controllers/auth.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { authLimiter, sensitiveActionLimiter } = require('../../middleware/rateLimiter.middleware');

// ── GitHub OAuth Routes ───────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/github
 * Initiates GitHub OAuth flow.
 * Redirects user to GitHub consent screen.
 * Public route — no authentication required.
 * Rate limited — prevents OAuth abuse.
 */
router.get(
  '/github',
  authLimiter,
  passport.authenticate('github', {
    scope: ['user:email'],
    session: false,
  })
);

/**
 * GET /api/v1/auth/github/callback
 * GitHub OAuth callback — called by GitHub after user approves.
 * Passport verifies the OAuth code and populates req.user.
 * On success — redirects to frontend dashboard.
 * On failure — redirects to frontend login with error.
 * Public route — no authentication required.
 */
router.get(
  '/github/callback',
  passport.authenticate('github', {
    session: false,
    failureRedirect: `${process.env.FRONTEND_URL}/login?error=github_auth_failed`,
  }),
  authController.githubCallback
);

// ── Authenticated Routes ──────────────────────────────────────────────────────

/**
 * GET /api/v1/auth/me
 * Returns the currently authenticated user's data.
 * Used by frontend on app load to verify session.
 * Requires: valid JWT access token in HttpOnly cookie.
 */
router.get(
  '/me',
  authenticate,
  authController.getMe
);

/**
 * POST /api/v1/auth/refresh
 * Issues a new access token using the refresh token cookie.
 * Implements refresh token rotation on every use.
 * Requires: valid refresh token in HttpOnly cookie.
 */
router.post(
  '/refresh',
  sensitiveActionLimiter,
  authController.refresh
);

/**
 * POST /api/v1/auth/logout
 * Logs out the authenticated user.
 * Clears HttpOnly cookies and revokes refresh token.
 * Requires: valid JWT access token in HttpOnly cookie.
 */
router.post(
  '/logout',
  authenticate,
  authController.logout
);

/**
 * POST /api/v1/auth/role
 * Sets the user's role after first GitHub login.
 * Body: { role: 'developer' | 'employer' }
 * Requires: valid JWT access token in HttpOnly cookie.
 * Role cannot be changed after it is set.
 */
router.post(
  '/role',
  authenticate,
  sensitiveActionLimiter,
  authController.selectRole
);

/**
 * POST /api/v1/auth/consent
 * Records user's consent to terms and privacy policy.
 * Constitution — NDPR/GDPR consent must be recorded.
 * Requires: valid JWT access token in HttpOnly cookie.
 */
router.post(
  '/consent',
  authenticate,
  authController.recordConsent
);

module.exports = router;