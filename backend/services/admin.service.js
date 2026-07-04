/**
 * @file        admin.service.js
 * @description TechTrust admin service.
 *              Contains all business logic for admin panel operations:
 *              user management, verification oversight, platform analytics,
 *              and audit trail access.
 *              Constitution Standard 10 — strict layer separation.
 *              Constitution Standard 4  — all admin actions logged.
 *              SPECIFICATION.md Section 6 — admin features reference.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const AdminRepository = require('../repositories/admin.repository');
const AuthRepository = require('../repositories/auth.repository');
const AuditService = require('./audit.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ── User Management ───────────────────────────────────────────────────────────
/**
 * @description Returns paginated list of all platform users.
 *              Admin only — full user data access.
 * @param       {Object} filters    - Search and filter options
 * @param       {Object} pagination - Page and limit values
 * @returns     {Promise<Object>} Users list with pagination metadata
 */
const getAllUsers = async (filters, pagination) => {
  const { users, total } = await AdminRepository.getAllUsers(
    filters,
    pagination
  );

  logger.info('Admin retrieved user list', {
    total,
    filters,
  });

  return { users, total };
};

/**
 * @description Returns full details of a single user for admin review.
 * @param       {string} adminId - MongoDB ObjectId of the admin
 * @param       {string} userId  - MongoDB ObjectId of the target user
 * @returns     {Promise<Object>} Full user details
 * @throws      {AppError} If user not found
 */
const getUserDetails = async (adminId, userId) => {
  const user = await AdminRepository.getUserDetails(userId);

  if (!user) {
    throw AppError.notFound('User not found.');
  }

  // Log admin viewing user details
  await AuditService.log({
    actorId: adminId,
    actorRole: 'admin',
    action: AuditService.ACTIONS.ADMIN_USER_VIEWED,
    targetId: userId,
    targetType: 'User',
    outcome: 'success',
  });

  return user;
};

/**
 * @description Suspends a user account.
 *              Forces logout by revoking refresh token.
 *              Constitution Standard 4 — admin action logged.
 * @param       {string} adminId - MongoDB ObjectId of the admin
 * @param       {string} userId  - MongoDB ObjectId of the target user
 * @param       {string} reason  - Reason for suspension
 * @returns     {Promise<Object>} Updated user document
 * @throws      {AppError} If user not found or trying to suspend an admin
 */
const suspendUser = async (adminId, userId, reason) => {
  if (!reason || reason.trim().length === 0) {
    throw AppError.badRequest(
      'A reason must be provided when suspending a user account.'
    );
  }

  const user = await AuthRepository.findById(userId);

  if (!user) {
    throw AppError.notFound('User not found.');
  }

  // Prevent suspending other admins
  if (user.role === 'admin') {
    throw AppError.forbidden(
      'Admin accounts cannot be suspended through the panel.'
    );
  }

  // Prevent suspending already suspended users
  if (user.isSuspended) {
    throw AppError.conflict(
      'This account is already suspended.'
    );
  }

  const updatedUser = await AdminRepository.suspendUser(userId, reason, adminId);

  // Log admin action
  await AuditService.log({
    actorId: adminId,
    actorRole: 'admin',
    action: AuditService.ACTIONS.USER_SUSPENDED,
    targetId: userId,
    targetType: 'User',
    outcome: 'success',
    metadata: { reason, targetRole: user.role },
  });

  logger.info('User suspended by admin', {
    adminId,
    userId,
    reason,
  });

  return updatedUser;
};

/**
 * @description Reactivates a suspended user account.
 *              Constitution Standard 4 — admin action logged.
 * @param       {string} adminId - MongoDB ObjectId of the admin
 * @param       {string} userId  - MongoDB ObjectId of the target user
 * @returns     {Promise<Object>} Updated user document
 * @throws      {AppError} If user not found or not suspended
 */
const activateUser = async (adminId, userId) => {
  const user = await AuthRepository.findById(userId);

  if (!user) {
    throw AppError.notFound('User not found.');
  }

  if (!user.isSuspended) {
    throw AppError.conflict('This account is not suspended.');
  }

  const updatedUser = await AdminRepository.activateUser(userId);

  // Log admin action
  await AuditService.log({
    actorId: adminId,
    actorRole: 'admin',
    action: AuditService.ACTIONS.USER_ACTIVATED,
    targetId: userId,
    targetType: 'User',
    outcome: 'success',
    metadata: { targetRole: user.role },
  });

  logger.info('User activated by admin', { adminId, userId });

  return updatedUser;
};

// ── Verification Oversight ────────────────────────────────────────────────────
/**
 * @description Returns all developer profiles flagged for admin review.
 *              Flagged when AI confidence score is below threshold.
 * @param       {Object} pagination - Page and limit values
 * @returns     {Promise<Object>} Flagged profiles with pagination
 */
const getFlaggedVerifications = async (pagination) => {
  const { profiles, total } = await AdminRepository.getFlaggedVerifications(
    pagination
  );

  return { profiles, total };
};

/**
 * @description Admin override of a developer's verification status.
 *              Used when AI flags a verification for manual review.
 *              Constitution Standard 4 — admin override logged.
 * @param       {string} adminId    - MongoDB ObjectId of the admin
 * @param       {string} profileId  - MongoDB ObjectId of the developer profile
 * @param       {string} status     - New status: verified or unverified
 * @param       {number} trustScore - Optional manual trust score
 * @param       {string} note       - Admin review note
 * @returns     {Promise<Object>} Updated developer profile
 * @throws      {AppError} If invalid status provided
 */
const overrideVerification = async (
  adminId,
  profileId,
  status,
  trustScore = null,
  note = null
) => {
  const validStatuses = ['verified', 'unverified', 'flagged'];
  if (!validStatuses.includes(status)) {
    throw AppError.badRequest(
      `Invalid status. Must be one of: ${validStatuses.join(', ')}`
    );
  }

  if (trustScore !== null && (trustScore < 0 || trustScore > 100)) {
    throw AppError.badRequest('Trust score must be between 0 and 100.');
  }

  const updatedProfile = await AdminRepository.overrideVerification(
    profileId,
    status,
    trustScore
  );

  if (!updatedProfile) {
    throw AppError.notFound('Developer profile not found.');
  }

  // Log admin override
  await AuditService.log({
    actorId: adminId,
    actorRole: 'admin',
    action: AuditService.ACTIONS.VERIFICATION_OVERRIDDEN,
    targetId: profileId,
    targetType: 'DeveloperProfile',
    outcome: 'success',
    metadata: {
      newStatus: status,
      trustScore,
      adminNote: note,
    },
  });

  logger.info('Verification overridden by admin', {
    adminId,
    profileId,
    status,
    trustScore,
  });

  return updatedProfile;
};

// ── Platform Analytics ────────────────────────────────────────────────────────
/**
 * @description Returns comprehensive platform statistics for admin dashboard.
 * @returns     {Promise<Object>} Complete platform statistics
 */
const getPlatformStats = async () => {
  const stats = await AdminRepository.getPlatformStats();
  return stats;
};

/**
 * @description Returns user growth data for analytics charts.
 * @param       {number} days - Number of days to look back (default 30)
 * @returns     {Promise<Array>} Daily registration data
 */
const getUserGrowthData = async (days = 30) => {
  if (days < 1 || days > 365) {
    throw AppError.badRequest('Days parameter must be between 1 and 365.');
  }

  return await AdminRepository.getUserGrowthData(days);
};

/**
 * @description Returns audit logs for admin security monitoring.
 * @param       {Object} filters    - Filter options
 * @param       {Object} pagination - Page and limit values
 * @returns     {Promise<Object>} Audit logs with pagination
 */
const getAuditLogs = async (filters, pagination) => {
  return await AdminRepository.getAuditLogs(filters, pagination);
};

/**
 * @description Returns geographic distribution of platform users.
 * @returns     {Promise<Array>} Country-wise user counts
 */
const getGeographicDistribution = async () => {
  return await AdminRepository.getGeographicDistribution();
};

/**
 * @description Returns complete analytics data package for admin dashboard.
 *              Combines all analytics in one efficient call.
 * @returns     {Promise<Object>} Complete analytics data
 */
const getAnalytics = async () => {
  const [stats, growth, geographic] = await Promise.all([
    AdminRepository.getPlatformStats(),
    AdminRepository.getUserGrowthData(30),
    AdminRepository.getGeographicDistribution(),
  ]);

  return {
    stats,
    growth,
    geographic,
    generatedAt: new Date().toISOString(),
  };
};

module.exports = {
  getAllUsers,
  getUserDetails,
  suspendUser,
  activateUser,
  getFlaggedVerifications,
  overrideVerification,
  getPlatformStats,
  getUserGrowthData,
  getAuditLogs,
  getGeographicDistribution,
  getAnalytics,
};