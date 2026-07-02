/**
 * @file        account.routes.js
 * @description TechTrust account management routes.
 *              Endpoints:
 *              GET    /api/v1/account/export         - Export all user data
 *              DELETE /api/v1/account                - Delete account permanently
 *              GET    /api/v1/account/consent        - Get consent status
 *              POST   /api/v1/account/consent        - Grant consent
 *              DELETE /api/v1/account/consent        - Revoke consent
 *              All routes require authentication.
 *              Architecture.md Section 6 — NDPR/GDPR user rights endpoints.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const express = require('express');
const router = express.Router();
const accountController = require('../../controllers/account.controller');
const { authenticate } = require('../../middleware/auth.middleware');
const { sensitiveActionLimiter } = require('../../middleware/rateLimiter.middleware');

// All account routes require authentication
// Constitution Standard 3 — zero open routes
router.use(authenticate);

// ── Data Export ───────────────────────────────────────────────────────────────
/**
 * GET /api/v1/account/export
 * Returns all personal data TechTrust holds about the user.
 * NDPR/GDPR right to access — returns structured JSON.
 * Rate limited — prevents abuse of data export feature.
 */
router.get(
  '/export',
  sensitiveActionLimiter,
  accountController.exportData
);

// ── Account Deletion ──────────────────────────────────────────────────────────
/**
 * DELETE /api/v1/account
 * Permanently deletes user account and all personal data.
 * NDPR/GDPR right to erasure.
 * Body: { confirmation: 'DELETE MY ACCOUNT' }
 * Strictly rate limited — irreversible action.
 */
router.delete(
  '/',
  sensitiveActionLimiter,
  accountController.deleteAccount
);

// ── Consent Management ────────────────────────────────────────────────────────
/**
 * GET /api/v1/account/consent
 * Returns user's current consent status for all consent types.
 * Used by privacy settings page.
 */
router.get(
  '/consent',
  accountController.getConsentStatus
);

/**
 * POST /api/v1/account/consent
 * Grants consent for a specific consent type.
 * Body: { consentType: 'activity_tracking' | 'marketing_emails' }
 */
router.post(
  '/consent',
  sensitiveActionLimiter,
  accountController.grantConsent
);

/**
 * DELETE /api/v1/account/consent
 * Revokes consent for a specific consent type.
 * NDPR/GDPR right to withdraw consent.
 * Body: { consentType: '...', reason: '...' }
 */
router.delete(
  '/consent',
  sensitiveActionLimiter,
  accountController.revokeConsent
);

module.exports = router;