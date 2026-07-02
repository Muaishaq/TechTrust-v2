/**
 * @file        account.controller.js
 * @description TechTrust account management controller.
 *              Handles NDPR/GDPR data rights endpoints:
 *              - Data export (right to access)
 *              - Account deletion (right to erasure)
 *              - Consent management (right to withdraw)
 *              - Consent summary (right to know)
 *              Constitution Standard 3  — sanitized responses only.
 *              Architecture.md Section 6 — NDPR/GDPR user rights.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/response');
const AuditService = require('../services/audit.service');
const ConsentService = require('../services/consent.service');
const AuthRepository = require('../repositories/auth.repository');
const logger = require('../utils/logger');

// ── Data Export ───────────────────────────────────────────────────────────────
/**
 * @description Exports all personal data TechTrust holds about the user.
 *              NDPR Article 18 / GDPR Article 15 — right to access.
 *              Returns structured JSON of all user data across all collections.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const exportData = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  // Get user account data
  const user = await AuthRepository.findById(userId);

  if (!user) {
    throw AppError.notFound('User account not found.');
  }

  // Get consent records
  const consentRecords = await ConsentService.getUserConsents(userId);

  // Get audit logs for this user
  const auditLogs = await AuditService.getLogsForUser(userId, 500);

  // Build complete data export package
  // Only includes data fields — never includes tokens or security fields
  const exportPackage = {
    exportGeneratedAt: new Date().toISOString(),
    exportVersion: '1.0',
    requestedBy: user.githubUsername,

    accountData: {
      githubUsername: user.githubUsername,
      email: user.email,
      name: user.name,
      avatarUrl: user.avatarUrl,
      role: user.role,
      createdAt: user.createdAt,
      lastLoginAt: user.lastLoginAt,
      lastLoginCountry: user.lastLoginCountry,
      lastLoginCity: user.lastLoginCity,
    },

    consentHistory: consentRecords.map((record) => ({
      consentType: record.consentType,
      granted: record.granted,
      policyVersion: record.policyVersion,
      grantedAt: record.grantedAt,
      revokedAt: record.revokedAt,
      country: record.country,
    })),

    activityHistory: auditLogs.map((log) => ({
      action: log.action,
      outcome: log.outcome,
      country: log.country,
      city: log.city,
      timestamp: log.timestamp,
    })),

    dataRetentionPolicy: {
      accountData: 'Retained until account deletion',
      sessionLogs: 'Auto-deleted after 90 days',
      auditLogs: 'Retained for 7 years (legal requirement)',
      consentRecords: 'Retained for 7 years (legal requirement)',
      paymentRecords: 'Retained for 7 years (legal requirement)',
    },
  };

  // Log data export to audit trail
  await AuditService.logRequest(
    req,
    AuditService.ACTIONS.DATA_EXPORTED,
    'success',
    {
      targetId: userId,
      targetType: 'User',
      metadata: { recordCount: auditLogs.length },
    }
  );

  logger.info('User data export generated', { userId });

  return successResponse(
    res,
    200,
    'Your data export is ready. This contains all personal data TechTrust holds about you.',
    exportPackage
  );
});

// ── Account Deletion ──────────────────────────────────────────────────────────
/**
 * @description Permanently deletes the user account and all personal data.
 *              NDPR Article 17 / GDPR Article 17 — right to erasure.
 *              Audit logs and payment records are retained (legal requirement).
 *              All other personal data is permanently removed.
 * @param       {Object} req      - Express request object
 * @param       {Object} req.body - Request body
 * @param       {string} req.body.confirmation - Must equal 'DELETE MY ACCOUNT'
 * @param       {Object} res      - Express response object
 * @returns     {Promise<void>}
 */
const deleteAccount = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { confirmation } = req.body;

  // Require explicit confirmation to prevent accidental deletion
  if (confirmation !== 'DELETE MY ACCOUNT') {
    throw AppError.badRequest(
      'To delete your account, please provide the confirmation text: DELETE MY ACCOUNT'
    );
  }

  // Get user before deletion for audit log
  const user = await AuthRepository.findById(userId);

  if (!user) {
    throw AppError.notFound('User account not found.');
  }

  // Log deletion request BEFORE deleting
  // Audit log is retained even after account deletion (legal requirement)
  await AuditService.logRequest(
    req,
    AuditService.ACTIONS.ACCOUNT_DELETION_REQUESTED,
    'success',
    {
      targetId: userId,
      targetType: 'User',
      metadata: {
        githubUsername: user.githubUsername,
        role: user.role,
        deletedAt: new Date().toISOString(),
      },
    }
  );

  // Clear auth cookies before deletion
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });

  // Permanently delete user account
  // Note: AuditLog and ConsentRecord entries are retained per legal requirements
  await AuthRepository.deleteUser(userId);

  logger.info('User account permanently deleted', {
    userId,
    githubUsername: user.githubUsername,
  });

  return successResponse(
    res,
    200,
    'Your account and all associated personal data have been permanently deleted. ' +
    'Audit and payment records are retained as required by law.'
  );
});

// ── Consent Management ────────────────────────────────────────────────────────
/**
 * @description Returns the user's current consent status for all types.
 *              Used by the privacy settings page in the dashboard.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getConsentStatus = asyncHandler(async (req, res) => {
  const consentSummary = await ConsentService.getConsentSummary(req.user.id);

  return successResponse(
    res,
    200,
    'Consent status retrieved successfully',
    { consents: consentSummary }
  );
});

/**
 * @description Grants consent for a specific consent type.
 *              Used when user enables optional features like marketing emails.
 * @param       {Object} req      - Express request object
 * @param       {Object} req.body - Request body
 * @param       {string} req.body.consentType - Type of consent to grant
 * @param       {Object} res      - Express response object
 * @returns     {Promise<void>}
 */
const grantConsent = asyncHandler(async (req, res) => {
  const { consentType } = req.body;

  if (!consentType) {
    throw AppError.badRequest('Consent type is required.');
  }

  await ConsentService.grantConsent(req.user.id, consentType, {
    ipAddress: req.ip,
    userAgent: req.get('User-Agent'),
    country: req.country || null,
  });

  return successResponse(
    res,
    200,
    `Consent granted for: ${consentType}`
  );
});

/**
 * @description Revokes consent for a specific consent type.
 *              NDPR/GDPR right to withdraw consent at any time.
 * @param       {Object} req      - Express request object
 * @param       {Object} req.body - Request body
 * @param       {string} req.body.consentType - Type of consent to revoke
 * @param       {string} req.body.reason      - Optional reason for revocation
 * @param       {Object} res      - Express response object
 * @returns     {Promise<void>}
 */
const revokeConsent = asyncHandler(async (req, res) => {
  const { consentType, reason } = req.body;

  if (!consentType) {
    throw AppError.badRequest('Consent type is required.');
  }

  await ConsentService.revokeConsent(req.user.id, consentType, reason);

  return successResponse(
    res,
    200,
    `Consent revoked for: ${consentType}. ` +
    'This may affect some platform features.'
  );
});

module.exports = {
  exportData,
  deleteAccount,
  getConsentStatus,
  grantConsent,
  revokeConsent,
};