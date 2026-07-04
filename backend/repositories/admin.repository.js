/**
 * @file        admin.repository.js
 * @description TechTrust admin repository.
 *              All database queries for admin panel operations.
 *              No business logic — only database operations.
 *              Constitution Standard 10 — strict layer separation.
 *              Constitution Standard 9  — optimized queries only.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const User = require('../models/User.model');
const DeveloperProfile = require('../models/DeveloperProfile.model');
const EmployerProfile = require('../models/EmployerProfile.model');
const JobPosting = require('../models/JobPosting.model');
const AuditLog = require('../models/AuditLog.model');

// ── User Management ───────────────────────────────────────────────────────────

/**
 * @description Returns paginated list of all users on the platform.
 * @param       {Object} filters    - Filter options
 * @param       {Object} pagination - Page and limit values
 * @returns     {Promise<Object>} Users list and total count
 */
const getAllUsers = async (filters = {}, pagination = {}) => {
  const { skip = 0, limit = 20 } = pagination;

  const query = {};
  if (filters.role) query.role = filters.role;
  if (filters.isActive !== undefined) query.isActive = filters.isActive;
  if (filters.isSuspended !== undefined) query.isSuspended = filters.isSuspended;
  if (filters.search) {
    query.$or = [
      { name: { $regex: filters.search, $options: 'i' } },
      { email: { $regex: filters.search, $options: 'i' } },
      { githubUsername: { $regex: filters.search, $options: 'i' } },
    ];
  }

  const [total, users] = await Promise.all([
    User.countDocuments(query),
    User.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { users, total };
};

/**
 * @description Returns a single user with full details for admin review.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object|null>} Full user document or null
 */
const getUserDetails = async (userId) => {
  return await User.findById(userId).lean();
};

/**
 * @description Suspends a user account.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @param       {string} reason - Reason for suspension
 * @param       {string} adminId - MongoDB ObjectId of the admin
 * @returns     {Promise<Object>} Updated user document
 */
const suspendUser = async (userId, reason, adminId) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedReason: reason,
      refreshToken: null,
      refreshTokenExpiresAt: null,
    },
    { new: true }
  ).lean();
};

/**
 * @description Activates a suspended user account.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object>} Updated user document
 */
const activateUser = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      isSuspended: false,
      suspendedAt: null,
      suspendedReason: null,
      isActive: true,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    { new: true }
  ).lean();
};

// ── Verification Oversight ────────────────────────────────────────────────────

/**
 * @description Returns all developer profiles with flagged verifications.
 *              Used for admin review queue.
 * @param       {Object} pagination - Page and limit values
 * @returns     {Promise<Object>} Flagged profiles and total count
 */
const getFlaggedVerifications = async (pagination = {}) => {
  const { skip = 0, limit = 20 } = pagination;

  const [total, profiles] = await Promise.all([
    DeveloperProfile.countDocuments({ verificationStatus: 'flagged' }),
    DeveloperProfile.find({ verificationStatus: 'flagged' })
      .populate('userId', 'name email githubUsername avatarUrl')
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { profiles, total };
};

/**
 * @description Admin override of a developer's verification status.
 * @param       {string} profileId  - MongoDB ObjectId of the developer profile
 * @param       {string} status     - New status to set
 * @param       {number} trustScore - Optional trust score override
 * @returns     {Promise<Object>} Updated developer profile
 */
const overrideVerification = async (profileId, status, trustScore = null) => {
  const updateData = { verificationStatus: status };
  if (trustScore !== null) {
    updateData.trustScore = trustScore;
    updateData.lastVerifiedAt = new Date();
  }

  return await DeveloperProfile.findByIdAndUpdate(
    profileId,
    { $set: updateData },
    { new: true }
  ).lean();
};

// ── Platform Analytics ────────────────────────────────────────────────────────

/**
 * @description Returns comprehensive platform statistics for admin dashboard.
 * @returns     {Promise<Object>} Platform-wide statistics
 */
const getPlatformStats = async () => {
  const [
    totalUsers,
    totalDevelopers,
    verifiedDevelopers,
    totalEmployers,
    totalJobs,
    activeJobs,
    newUsersToday,
    newUsersThisWeek,
  ] = await Promise.all([
    User.countDocuments(),
    User.countDocuments({ role: 'developer' }),
    DeveloperProfile.countDocuments({ verificationStatus: 'verified' }),
    User.countDocuments({ role: 'employer' }),
    JobPosting.countDocuments(),
    JobPosting.countDocuments({ status: 'active' }),
    User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 24 * 60 * 60 * 1000) },
    }),
    User.countDocuments({
      createdAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
    }),
  ]);

  return {
    users: {
      total: totalUsers,
      developers: totalDevelopers,
      employers: totalEmployers,
      newToday: newUsersToday,
      newThisWeek: newUsersThisWeek,
    },
    verifications: {
      verified: verifiedDevelopers,
      verificationRate: totalDevelopers > 0
        ? Math.round((verifiedDevelopers / totalDevelopers) * 100)
        : 0,
    },
    jobs: {
      total: totalJobs,
      active: activeJobs,
    },
  };
};

/**
 * @description Returns user growth data for analytics charts.
 * @param       {number} days - Number of days to look back
 * @returns     {Promise<Array>} Daily user registration counts
 */
const getUserGrowthData = async (days = 30) => {
  const startDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

  return await User.aggregate([
    { $match: { createdAt: { $gte: startDate } } },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        count: { $sum: 1 },
        developers: {
          $sum: { $cond: [{ $eq: ['$role', 'developer'] }, 1, 0] },
        },
        employers: {
          $sum: { $cond: [{ $eq: ['$role', 'employer'] }, 1, 0] },
        },
      },
    },
    { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } },
  ]);
};

/**
 * @description Returns recent audit log entries for admin monitoring.
 * @param       {Object} filters    - Filter options
 * @param       {Object} pagination - Page and limit values
 * @returns     {Promise<Object>} Audit logs and total count
 */
const getAuditLogs = async (filters = {}, pagination = {}) => {
  const { skip = 0, limit = 50 } = pagination;

  const query = {};
  if (filters.action) query.action = filters.action;
  if (filters.actorRole) query.actorRole = filters.actorRole;
  if (filters.outcome) query.outcome = filters.outcome;
  if (filters.actorId) query.actorId = filters.actorId;

  const [total, logs] = await Promise.all([
    AuditLog.countDocuments(query),
    AuditLog.find(query)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { logs, total };
};

/**
 * @description Returns geographic distribution of users.
 * @returns     {Promise<Array>} Country-wise user counts
 */
const getGeographicDistribution = async () => {
  return await User.aggregate([
    { $match: { lastLoginCountry: { $ne: null } } },
    {
      $group: {
        _id: '$lastLoginCountry',
        count: { $sum: 1 },
      },
    },
    { $sort: { count: -1 } },
    { $limit: 20 },
  ]);
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
};