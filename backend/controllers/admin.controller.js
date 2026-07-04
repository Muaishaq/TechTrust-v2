/**
 * @file        admin.controller.js
 * @description TechTrust admin panel controller.
 *              Handles HTTP layer for all admin endpoints.
 *              Controllers only handle req/res — all logic in admin.service.js.
 *              Constitution Standard 10 — strict layer separation enforced.
 *              Constitution Standard 3  — sanitized responses only.
 *              SPECIFICATION.md Section 6 — admin features reference.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const AdminService = require('../services/admin.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  successResponse,
  paginatedResponse,
} = require('../utils/response');
const {
  getPaginationParams,
  buildPaginationMeta,
} = require('../utils/pagination');

// ── Dashboard ─────────────────────────────────────────────────────────────────
/**
 * @description Returns complete platform overview for admin dashboard.
 *              Combines stats, growth data, and geographic distribution.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getDashboard = asyncHandler(async (req, res) => {
  const analytics = await AdminService.getAnalytics();

  return successResponse(
    res,
    200,
    'Admin dashboard data retrieved successfully',
    { analytics }
  );
});

/**
 * @description Returns platform-wide statistics only.
 *              Lighter endpoint for quick stat refresh.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getPlatformStats = asyncHandler(async (req, res) => {
  const stats = await AdminService.getPlatformStats();

  return successResponse(
    res,
    200,
    'Platform statistics retrieved successfully',
    { stats }
  );
});

// ── User Management ───────────────────────────────────────────────────────────
/**
 * @description Returns paginated list of all platform users.
 *              Supports filtering by role, status, and search query.
 * @param       {Object} req       - Express request object
 * @param       {Object} req.query - Filter and pagination params
 * @param       {Object} res       - Express response object
 * @returns     {Promise<void>}
 */
const getAllUsers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query, 20);

  const filters = {
    role: req.query.role,
    isActive: req.query.isActive !== undefined
      ? req.query.isActive === 'true'
      : undefined,
    isSuspended: req.query.isSuspended !== undefined
      ? req.query.isSuspended === 'true'
      : undefined,
    search: req.query.search,
  };

  // Remove undefined filters
  Object.keys(filters).forEach((key) => {
    if (filters[key] === undefined) delete filters[key];
  });

  const { users, total } = await AdminService.getAllUsers(
    filters,
    { page, limit, skip }
  );

  const pagination = buildPaginationMeta(total, page, limit);

  return paginatedResponse(
    res,
    200,
    'Users retrieved successfully',
    users,
    pagination
  );
});

/**
 * @description Returns full details of a single user for admin review.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.id  - Target user ID
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const getUserDetails = asyncHandler(async (req, res) => {
  const { id: userId } = req.params;

  if (!userId) {
    throw AppError.badRequest('User ID is required.');
  }

  const user = await AdminService.getUserDetails(req.user.id, userId);

  return successResponse(
    res,
    200,
    'User details retrieved successfully',
    { user }
  );
});

/**
 * @description Suspends a user account.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.id  - Target user ID
 * @param       {Object} req.body       - Request body
 * @param       {string} req.body.reason - Suspension reason
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const suspendUser = asyncHandler(async (req, res) => {
  const { id: userId } = req.params;
  const { reason } = req.body;

  if (!userId) {
    throw AppError.badRequest('User ID is required.');
  }

  if (!reason) {
    throw AppError.badRequest('Suspension reason is required.');
  }

  const updatedUser = await AdminService.suspendUser(
    req.user.id,
    userId,
    reason
  );

  return successResponse(
    res,
    200,
    'User account suspended successfully',
    { user: updatedUser }
  );
});

/**
 * @description Reactivates a suspended user account.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.id  - Target user ID
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const activateUser = asyncHandler(async (req, res) => {
  const { id: userId } = req.params;

  if (!userId) {
    throw AppError.badRequest('User ID is required.');
  }

  const updatedUser = await AdminService.activateUser(req.user.id, userId);

  return successResponse(
    res,
    200,
    'User account activated successfully',
    { user: updatedUser }
  );
});

// ── Verification Oversight ────────────────────────────────────────────────────
/**
 * @description Returns all developer profiles flagged for admin review.
 * @param       {Object} req       - Express request object
 * @param       {Object} req.query - Pagination params
 * @param       {Object} res       - Express response object
 * @returns     {Promise<void>}
 */
const getFlaggedVerifications = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query, 20);

  const { profiles, total } = await AdminService.getFlaggedVerifications(
    { page, limit, skip }
  );

  const pagination = buildPaginationMeta(total, page, limit);

  return paginatedResponse(
    res,
    200,
    'Flagged verifications retrieved successfully',
    profiles,
    pagination
  );
});

/**
 * @description Admin override of a developer's verification status.
 * @param       {Object} req              - Express request object
 * @param       {Object} req.params       - URL parameters
 * @param       {string} req.params.id    - Developer profile ID
 * @param       {Object} req.body         - Request body
 * @param       {string} req.body.status  - New status
 * @param       {number} req.body.trustScore - Optional trust score override
 * @param       {string} req.body.note    - Admin review note
 * @param       {Object} res              - Express response object
 * @returns     {Promise<void>}
 */
const overrideVerification = asyncHandler(async (req, res) => {
  const { id: profileId } = req.params;
  const { status, trustScore, note } = req.body;

  if (!profileId) {
    throw AppError.badRequest('Developer profile ID is required.');
  }

  if (!status) {
    throw AppError.badRequest('New verification status is required.');
  }

  const updatedProfile = await AdminService.overrideVerification(
    req.user.id,
    profileId,
    status,
    trustScore || null,
    note || null
  );

  return successResponse(
    res,
    200,
    'Verification status updated successfully',
    { profile: updatedProfile }
  );
});

// ── Analytics ─────────────────────────────────────────────────────────────────
/**
 * @description Returns user growth analytics data.
 * @param       {Object} req       - Express request object
 * @param       {Object} req.query - days parameter
 * @param       {Object} res       - Express response object
 * @returns     {Promise<void>}
 */
const getGrowthAnalytics = asyncHandler(async (req, res) => {
  const days = parseInt(req.query.days, 10) || 30;
  const growthData = await AdminService.getUserGrowthData(days);

  return successResponse(
    res,
    200,
    'Growth analytics retrieved successfully',
    { growthData, days }
  );
});

/**
 * @description Returns geographic distribution of platform users.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getGeographicDistribution = asyncHandler(async (req, res) => {
  const distribution = await AdminService.getGeographicDistribution();

  return successResponse(
    res,
    200,
    'Geographic distribution retrieved successfully',
    { distribution }
  );
});

/**
 * @description Returns audit logs for platform security monitoring.
 * @param       {Object} req       - Express request object
 * @param       {Object} req.query - Filter and pagination params
 * @param       {Object} res       - Express response object
 * @returns     {Promise<void>}
 */
const getAuditLogs = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query, 50);

  const filters = {
    action: req.query.action,
    actorRole: req.query.actorRole,
    outcome: req.query.outcome,
    actorId: req.query.actorId,
  };

  Object.keys(filters).forEach((key) => {
    if (!filters[key]) delete filters[key];
  });

  const { logs, total } = await AdminService.getAuditLogs(
    filters,
    { page, limit, skip }
  );

  const pagination = buildPaginationMeta(total, page, limit);

  return paginatedResponse(
    res,
    200,
    'Audit logs retrieved successfully',
    logs,
    pagination
  );
});

module.exports = {
  getDashboard,
  getPlatformStats,
  getAllUsers,
  getUserDetails,
  suspendUser,
  activateUser,
  getFlaggedVerifications,
  overrideVerification,
  getGrowthAnalytics,
  getGeographicDistribution,
  getAuditLogs,
};