/**
 * @file        consent.service.js
 * @description TechTrust consent management service.
 *              Handles all NDPR/GDPR consent operations:
 *              recording consent, checking consent status,
 *              and revoking consent on user request.
 *              No personal data is collected or processed without
 *              confirmed consent — this service enforces that rule.
 *              Architecture.md Section 6 — NDPR/GDPR compliance.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const ConsentRecord = require('../models/ConsentRecord.model');
const AuditService = require('./audit.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ── Consent Types ─────────────────────────────────────────────────────────────
const CONSENT_TYPES = {
  TERMS_OF_SERVICE: 'terms_of_service',
  PRIVACY_POLICY: 'privacy_policy',
  ACTIVITY_TRACKING: 'activity_tracking',
  MARKETING_EMAILS: 'marketing_emails',
  DATA_PROCESSING: 'data_processing',
};

// ── Current Policy Version ────────────────────────────────────────────────────
const CURRENT_POLICY_VERSION = '1.0';

/**
 * @description Records user consent for a specific consent type.
 *              Creates an immutable consent record with full evidence.
 *              NDPR Article 24 — consent must be recorded with proof.
 * @param       {string} userId      - MongoDB ObjectId of the user
 * @param       {string} consentType - Type of consent from CONSENT_TYPES
 * @param       {Object} evidence    - Evidence of consent
 * @param       {string} evidence.ipAddress - IP address of consent action
 * @param       {string} evidence.userAgent - Browser/device user agent
 * @param       {string} evidence.country   - Country from IP geolocation
 * @returns     {Promise<Object>} Created consent record
 * @throws      {AppError} If consent type is invalid
 */
const grantConsent = async (userId, consentType, evidence = {}) => {
  // Validate consent type
  const validTypes = Object.values(CONSENT_TYPES);
  if (!validTypes.includes(consentType)) {
    throw AppError.badRequest(
      `Invalid consent type. Must be one of: ${validTypes.join(', ')}`
    );
  }

  // Check if consent already exists and is active
  const existing = await ConsentRecord.findOne({
    userId,
    consentType,
    granted: true,
    revokedAt: null,
  });

  if (existing) {
    logger.info('Consent already granted — skipping duplicate', {
      userId,
      consentType,
    });
    return existing;
  }

  // Create consent record with full evidence
  const consentRecord = await ConsentRecord.create({
    userId,
    consentType,
    granted: true,
    policyVersion: CURRENT_POLICY_VERSION,
    ipAddress: evidence.ipAddress || null,
    country: evidence.country || null,
    userAgent: evidence.userAgent || null,
    grantedAt: new Date(),
    revokedAt: null,
  });

  // Log to audit trail
  await AuditService.log({
    actorId: userId,
    actorRole: 'developer', // Will be updated when role is known
    action: AuditService.ACTIONS.CONSENT_GRANTED,
    targetId: consentRecord._id,
    targetType: 'ConsentRecord',
    ipAddress: evidence.ipAddress || null,
    country: evidence.country || null,
    outcome: 'success',
    metadata: { consentType, policyVersion: CURRENT_POLICY_VERSION },
  });

  logger.info('Consent granted', { userId, consentType });

  return consentRecord;
};

/**
 * @description Records full platform consent — terms and privacy policy together.
 *              Called when user accepts on the consent screen after first login.
 *              NDPR/GDPR — both must be accepted before data collection begins.
 * @param       {string} userId   - MongoDB ObjectId of the user
 * @param       {Object} evidence - Evidence of consent (IP, userAgent, country)
 * @returns     {Promise<void>}
 */
const grantFullConsent = async (userId, evidence = {}) => {
  // Grant both required consent types simultaneously
  await Promise.all([
    grantConsent(userId, CONSENT_TYPES.TERMS_OF_SERVICE, evidence),
    grantConsent(userId, CONSENT_TYPES.PRIVACY_POLICY, evidence),
    grantConsent(userId, CONSENT_TYPES.DATA_PROCESSING, evidence),
  ]);

  logger.info('Full platform consent granted', { userId });
};

/**
 * @description Checks if a user has given consent for a specific type.
 *              Used before any data collection or processing operation.
 * @param       {string} userId      - MongoDB ObjectId of the user
 * @param       {string} consentType - Type of consent to check
 * @returns     {Promise<boolean>} True if consent is active
 */
const hasConsent = async (userId, consentType) => {
  const record = await ConsentRecord.findOne({
    userId,
    consentType,
    granted: true,
    revokedAt: null,
  }).lean();

  return !!record;
};

/**
 * @description Checks if user has given full platform consent.
 *              (terms + privacy policy + data processing)
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<boolean>} True if full consent given
 */
const hasFullConsent = async (userId) => {
  const [hasTerms, hasPrivacy, hasDataProcessing] = await Promise.all([
    hasConsent(userId, CONSENT_TYPES.TERMS_OF_SERVICE),
    hasConsent(userId, CONSENT_TYPES.PRIVACY_POLICY),
    hasConsent(userId, CONSENT_TYPES.DATA_PROCESSING),
  ]);

  return hasTerms && hasPrivacy && hasDataProcessing;
};

/**
 * @description Revokes a specific consent type on user request.
 *              NDPR/GDPR right to withdraw consent at any time.
 * @param       {string} userId      - MongoDB ObjectId of the user
 * @param       {string} consentType - Type of consent to revoke
 * @param       {string} reason      - Reason for revocation (optional)
 * @returns     {Promise<void>}
 * @throws      {AppError} If no active consent found to revoke
 */
const revokeConsent = async (userId, consentType, reason = null) => {
  const record = await ConsentRecord.findOne({
    userId,
    consentType,
    granted: true,
    revokedAt: null,
  });

  if (!record) {
    throw AppError.notFound(
      `No active consent found for type: ${consentType}`
    );
  }

  // Mark consent as revoked — never delete consent records
  await ConsentRecord.findByIdAndUpdate(record._id, {
    granted: false,
    revokedAt: new Date(),
    revocationReason: reason || 'User requested revocation',
  });

  // Log to audit trail
  await AuditService.log({
    actorId: userId,
    actorRole: 'developer',
    action: AuditService.ACTIONS.CONSENT_REVOKED,
    targetId: record._id,
    targetType: 'ConsentRecord',
    outcome: 'success',
    metadata: { consentType, reason },
  });

  logger.info('Consent revoked', { userId, consentType });
};

/**
 * @description Returns all consent records for a user.
 *              Used for data export (NDPR/GDPR right to access)
 *              and the privacy settings page.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Array>} Array of consent records
 */
const getUserConsents = async (userId) => {
  return await ConsentRecord.find({ userId })
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * @description Returns a summary of user's current consent status.
 *              Used by the privacy settings dashboard page.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object>} Consent status summary
 */
const getConsentSummary = async (userId) => {
  const consents = await getUserConsents(userId);

  // Build summary object showing current status of each consent type
  const summary = {};
  Object.values(CONSENT_TYPES).forEach((type) => {
    const active = consents.find(
      (c) => c.consentType === type && c.granted && !c.revokedAt
    );
    summary[type] = {
      granted: !!active,
      grantedAt: active?.grantedAt || null,
      policyVersion: active?.policyVersion || null,
    };
  });

  return summary;
};

module.exports = {
  grantConsent,
  grantFullConsent,
  hasConsent,
  hasFullConsent,
  revokeConsent,
  getUserConsents,
  getConsentSummary,
  CONSENT_TYPES,
  CURRENT_POLICY_VERSION,
};