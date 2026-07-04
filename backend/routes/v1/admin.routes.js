/**
 * @file        admin.routes.js
 * @description TechTrust admin panel routes.
 *              Endpoints:
 *              GET  /api/v1/admin/dashboard              - Platform overview
 *              GET  /api/v1/admin/stats                  - Platform statistics
 *              GET  /api/v1/admin/users                  - List all users
 *              GET  /api/v1/admin/users/:id              - Get user details
 *              PUT  /api/v1/admin/users/:id/suspend      - Suspend user
 *              PUT  /api/v1/admin/users/:id/activate     - Activate user
 *              GET  /api/v1/admin/verifications          - Flagged verifications
 *              PUT  /api/v1/admin/verifications/:id      - Override verification
 *              GET  /api/v1/admin/analytics/growth       - Growth analytics
 *              GET  /api/v1/admin/analytics/geographic   - Geographic distribution
 *              GET  /api/v1/admin/audit-logs             - Platform audit logs
 *              ALL routes require admin role — strictest access control.
 *              Constitution Standard 3  — zero open routes, admin only.
 *              Constitution Standard 4  — all admin actions logged.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const express = require('express');
const router = express.Router();
const adminController = require('../../controllers/admin.controller');
const { requireAdmin } = require('../../middleware/auth.middleware');
const { sensitiveActionLimiter } = require('../../middleware/rateLimiter.middleware');

// ── Admin Auth Guard ──────────────────────────────────────────────────────────
// Every single admin route requires admin role
// Constitution Standard 3 — zero open routes
// requireAdmin = [authenticate, requireRole('admin')]
router.use(requireAdmin);

// ── Dashboard ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/dashboard
 * Returns complete platform analytics for admin dashboard.
 * Combines stats, growth, and geographic data in one call.
 */
router.get(
  '/dashboard',
  adminController.getDashboard
);

/**
 * GET /api/v1/admin/stats
 * Returns platform-wide statistics only.
 * Lighter endpoint for quick stat refresh.
 */
router.get(
  '/stats',
  adminController.getPlatformStats
);

// ── User Management ───────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/users
 * Returns paginated list of all platform users.
 * Query: role, isActive, isSuspended, search, page, limit
 */
router.get(
  '/users',
  adminController.getAllUsers
);

/**
 * GET /api/v1/admin/users/:id
 * Returns full details of a single user.
 * Params: id = user MongoDB ObjectId
 */
router.get(
  '/users/:id',
  adminController.getUserDetails
);

/**
 * PUT /api/v1/admin/users/:id/suspend
 * Suspends a user account.
 * Forces immediate logout by revoking refresh token.
 * Body: { reason: 'Reason for suspension' }
 * Strictly rate limited — irreversible immediate action.
 */
router.put(
  '/users/:id/suspend',
  sensitiveActionLimiter,
  adminController.suspendUser
);

/**
 * PUT /api/v1/admin/users/:id/activate
 * Reactivates a suspended user account.
 * Clears failed login attempts and lock status.
 */
router.put(
  '/users/:id/activate',
  sensitiveActionLimiter,
  adminController.activateUser
);

// ── Verification Oversight ────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/verifications
 * Returns all developer profiles flagged for admin review.
 * Flagged when AI confidence score is below 60%.
 * Query: page, limit
 */
router.get(
  '/verifications',
  adminController.getFlaggedVerifications
);

/**
 * PUT /api/v1/admin/verifications/:id
 * Admin override of a developer's verification status.
 * Body: { status: 'verified'|'unverified'|'flagged', trustScore?, note? }
 * Params: id = developer profile MongoDB ObjectId
 */
router.put(
  '/verifications/:id',
  sensitiveActionLimiter,
  adminController.overrideVerification
);

// ── Analytics ─────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/analytics/growth
 * Returns daily user registration data for growth charts.
 * Query: days (1-365, default 30)
 */
router.get(
  '/analytics/growth',
  adminController.getGrowthAnalytics
);

/**
 * GET /api/v1/admin/analytics/geographic
 * Returns geographic distribution of platform users.
 * Shows top 20 countries by user count.
 */
router.get(
  '/analytics/geographic',
  adminController.getGeographicDistribution
);

// ── Audit Logs ────────────────────────────────────────────────────────────────

/**
 * GET /api/v1/admin/audit-logs
 * Returns paginated platform audit logs for security monitoring.
 * Query: action, actorRole, outcome, actorId, page, limit
 */
router.get(
  '/audit-logs',
  adminController.getAuditLogs
);

module.exports = router;