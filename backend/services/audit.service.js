/**
 * @file        audit.service.js
 * @description TechTrust audit trail service.
 *              Provides a simple interface for logging all significant
 *              platform actions to the immutable AuditLog collection.
 *              Every controller and service that performs a significant
 *              action must call AuditService.log() before returning.
 *              Constitution Standard 4  — all significant events logged.
 *              Architecture.md Section 7 — immutable audit trail.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const AuditLog = require('../models/AuditLog.model');
const logger = require('../utils/logger');

// ── Action Constants ──────────────────────────────────────────────────────────
// All audit actions must use these constants — never raw strings
// Ensures consistency across the entire platform
const ACTIONS = {
  // ── User Actions ──────────────────────────────────────────────────────
  USER_REGISTERED:          'USER_REGISTERED',
  USER_LOGIN:               'USER_LOGIN',
  USER_LOGOUT:              'USER_LOGOUT',
  USER_ROLE_SELECTED:       'USER_ROLE_SELECTED',
  USER_PROFILE_UPDATED:     'USER_PROFILE_UPDATED',
  USER_SUSPENDED:           'USER_SUSPENDED',
  USER_ACTIVATED:           'USER_ACTIVATED',
  USER_DELETED:             'USER_DELETED',

  // ── Auth Actions ──────────────────────────────────────────────────────
  LOGIN_FAILED:             'LOGIN_FAILED',
  TOKEN_REFRESHED:          'TOKEN_REFRESHED',
  ACCOUNT_LOCKED:           'ACCOUNT_LOCKED',

  // ── Consent Actions ───────────────────────────────────────────────────
  CONSENT_GRANTED:          'CONSENT_GRANTED',
  CONSENT_REVOKED:          'CONSENT_REVOKED',

  // ── Verification Actions ──────────────────────────────────────────────
  VERIFICATION_TRIGGERED:   'VERIFICATION_TRIGGERED',
  VERIFICATION_COMPLETED:   'VERIFICATION_COMPLETED',
  VERIFICATION_FAILED:      'VERIFICATION_FAILED',
  VERIFICATION_FLAGGED:     'VERIFICATION_FLAGGED',
  VERIFICATION_OVERRIDDEN:  'VERIFICATION_OVERRIDDEN',

  // ── Developer Actions ─────────────────────────────────────────────────
  BADGE_GENERATED:          'BADGE_GENERATED',
  COACHING_COMPLETED:       'COACHING_COMPLETED',

  // ── Employer Actions ──────────────────────────────────────────────────
  DEVELOPER_SAVED:          'DEVELOPER_SAVED',
  JOB_POSTED:               'JOB_POSTED',
  JOB_CLOSED:               'JOB_CLOSED',

  // ── Admin Actions ─────────────────────────────────────────────────────
  ADMIN_USER_VIEWED:        'ADMIN_USER_VIEWED',
  ADMIN_OVERRIDE:           'ADMIN_OVERRIDE',
  ADMIN_CONTENT_UPDATED:    'ADMIN_CONTENT_UPDATED',

  // ── Payment Actions ───────────────────────────────────────────────────
  PAYMENT_INITIATED:        'PAYMENT_INITIATED',
  PAYMENT_RECEIVED:         'PAYMENT_RECEIVED',
  PAYMENT_FAILED:           'PAYMENT_FAILED',
  SUBSCRIPTION_ACTIVATED:   'SUBSCRIPTION_ACTIVATED',
  SUBSCRIPTION_CANCELLED:   'SUBSCRIPTION_CANCELLED',

  // ── Dispute Actions ───────────────────────────────────────────────────
  DISPUTE_CREATED:          'DISPUTE_CREATED',
  DISPUTE_RESOLVED:         'DISPUTE_RESOLVED',
  DISPUTE_REJECTED:         'DISPUTE_REJECTED',

  // ── Privacy Actions ───────────────────────────────────────────────────
  DATA_EXPORTED:            'DATA_EXPORTED',
  ACCOUNT_DELETION_REQUESTED: 'ACCOUNT_DELETION_REQUESTED',

  // ── Security Actions ──────────────────────────────────────────────────
  SUSPICIOUS_ACTIVITY:      'SUSPICIOUS_ACTIVITY',
  RATE_LIMIT_EXCEEDED:      'RATE_LIMIT_EXCEEDED',
  UNAUTHORIZED_ACCESS:      'UNAUTHORIZED_ACCESS',
};

/**
 * @description Logs a significant platform action to the immutable audit trail.
 *              This is a fire-and-forget operation — it never blocks the main
 *              request flow. Errors are logged but never thrown.
 * @param       {Object} logData              - Audit log entry data
 * @param       {string} logData.action       - Action constant from ACTIONS
 * @param       {string} logData.actorRole    - Role of who performed the action
 * @param       {string} logData.outcome      - Result: success/failed/blocked
 * @param       {string} [logData.actorId]    - MongoDB ID of the actor (optional)
 * @param       {string} [logData.targetId]   - MongoDB ID of the target (optional)
 * @param       {string} [logData.targetType] - Type of target (optional)
 * @param       {string} [logData.ipAddress]  - IP address (optional)
 * @param       {string} [logData.country]    - Country from IP (optional)
 * @param       {string} [logData.city]       - City from IP (optional)
 * @param       {Object} [logData.metadata]   - Additional context (optional)
 * @returns     {Promise<void>}
 */
const log = async (logData) => {
  try {
    await AuditLog.create({
      actorId: logData.actorId || null,
      actorRole: logData.actorRole || 'system',
      action: logData.action,
      targetId: logData.targetId || null,
      targetType: logData.targetType || null,
      ipAddress: logData.ipAddress || null,
      country: logData.country || null,
      city: logData.city || null,
      outcome: logData.outcome || 'success',
      metadata: logData.metadata || {},
    });
  } catch (error) {
    // Audit logging must NEVER crash the main application
    // Log the error but do not throw it
    logger.error('Failed to write audit log entry', {
      error: error.message,
      action: logData.action,
      actorId: logData.actorId,
    });
  }
};

/**
 * @description Convenience method — logs an action from an Express request.
 *              Automatically extracts IP, actor ID, and role from req object.
 * @param       {Object} req          - Express request object
 * @param       {string} action       - Action constant from ACTIONS
 * @param       {string} outcome      - Result: success/failed/blocked/pending
 * @param       {Object} [options]    - Additional options
 * @param       {string} [options.targetId]   - Target resource ID
 * @param       {string} [options.targetType] - Target resource type
 * @param       {Object} [options.metadata]   - Additional context
 * @returns     {Promise<void>}
 */
const logRequest = async (req, action, outcome, options = {}) => {
  await log({
    actorId: req.user?.id || null,
    actorRole: req.user?.role || 'unauthenticated',
    action,
    outcome,
    ipAddress: req.ip || null,
    country: req.country || null,   // Set by geolocation middleware
    city: req.city || null,         // Set by geolocation middleware
    targetId: options.targetId || null,
    targetType: options.targetType || null,
    metadata: options.metadata || {},
  });
};

/**
 * @description Retrieves audit logs for a specific user.
 *              Used by admin panel and data export feature.
 * @param       {string} userId   - MongoDB ObjectId of the user
 * @param       {number} limit    - Maximum number of records to return
 * @returns     {Promise<Array>}  Array of audit log entries
 */
const getLogsForUser = async (userId, limit = 100) => {
  return await AuditLog.find({ actorId: userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

/**
 * @description Retrieves recent platform-wide audit logs.
 *              Used by admin dashboard for security monitoring.
 * @param       {number} limit  - Maximum number of records to return
 * @param       {string} action - Optional filter by action type
 * @returns     {Promise<Array>} Array of audit log entries
 */
const getRecentLogs = async (limit = 50, action = null) => {
  const filter = action ? { action } : {};
  return await AuditLog.find(filter)
    .sort({ timestamp: -1 })
    .limit(limit)
    .lean();
};

module.exports = {
  log,
  logRequest,
  getLogsForUser,
  getRecentLogs,
  ACTIONS,
};