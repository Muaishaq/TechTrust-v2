/**
 * @file        developer.repository.js
 * @description TechTrust developer profile repository.
 *              All database queries for developer profiles live here.
 *              No business logic — only database operations.
 *              Constitution Standard 10 — strict layer separation.
 *              Constitution Standard 9  — optimized queries only.
 * @author      Muaishaq
 * @created     2026-07-02
 * @modified    2026-07-02
 */

'use strict';

const DeveloperProfile = require('../models/DeveloperProfile.model');

/**
 * @description Creates a new developer profile for a user.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object>} Newly created developer profile
 */
const createProfile = async (userId) => {
  const profile = await DeveloperProfile.create({ userId });
  return profile.toJSON();
};

/**
 * @description Finds a developer profile by user ID.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object|null>} Developer profile or null
 */
const findByUserId = async (userId) => {
  return await DeveloperProfile.findOne({ userId }).lean();
};

/**
 * @description Finds a developer profile by profile ID.
 * @param       {string} profileId - MongoDB ObjectId of the profile
 * @returns     {Promise<Object|null>} Developer profile or null
 */
const findById = async (profileId) => {
  return await DeveloperProfile.findById(profileId).lean();
};

/**
 * @description Finds a public developer profile populated with user data.
 *              Used for public-facing profile pages.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object|null>} Populated developer profile or null
 */
const findPublicProfile = async (userId) => {
  return await DeveloperProfile.findOne({ userId, isPublic: true })
    .populate('userId', 'name githubUsername avatarUrl')
    .lean();
};

/**
 * @description Updates a developer profile with provided data.
 * @param       {string} userId     - MongoDB ObjectId of the user
 * @param       {Object} updateData - Fields to update
 * @returns     {Promise<Object>} Updated developer profile
 */
const updateProfile = async (userId, updateData) => {
  return await DeveloperProfile.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();
};

/**
 * @description Updates the trust score and skill scores after verification.
 * @param       {string} userId      - MongoDB ObjectId of the user
 * @param       {number} trustScore  - New trust score (0-100)
 * @param       {Object} skillScores - Individual dimension scores
 * @returns     {Promise<Object>} Updated developer profile
 */
const updateVerificationResults = async (userId, trustScore, skillScores) => {
  return await DeveloperProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        trustScore,
        skillScores,
        verificationStatus: 'verified',
        lastVerifiedAt: new Date(),
      },
    },
    { new: true, runValidators: true }
  ).lean();
};

/**
 * @description Updates verification status to pending or flagged.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @param       {string} status - New status: pending/flagged/verified
 * @returns     {Promise<Object>} Updated developer profile
 */
const updateVerificationStatus = async (userId, status) => {
  return await DeveloperProfile.findOneAndUpdate(
    { userId },
    { $set: { verificationStatus: status } },
    { new: true }
  ).lean();
};

/**
 * @description Updates badge URL after badge generation.
 * @param       {string} userId    - MongoDB ObjectId of the user
 * @param       {string} badgeUrl  - Generated badge URL
 * @returns     {Promise<Object>} Updated developer profile
 */
const updateBadge = async (userId, badgeUrl) => {
  return await DeveloperProfile.findOneAndUpdate(
    { userId },
    {
      $set: {
        badgeUrl,
        badgeGeneratedAt: new Date(),
      },
    },
    { new: true }
  ).lean();
};

/**
 * @description Updates subscription plan after payment confirmed.
 * @param       {string} userId     - MongoDB ObjectId of the user
 * @param       {string} planType   - New plan: free or premium
 * @param       {Date}   expiresAt  - Plan expiry date
 * @returns     {Promise<Object>} Updated developer profile
 */
const updatePlan = async (userId, planType, expiresAt) => {
  return await DeveloperProfile.findOneAndUpdate(
    { userId },
    { $set: { planType, planExpiresAt: expiresAt } },
    { new: true }
  ).lean();
};

/**
 * @description Increments coaching insight counters.
 * @param       {string}  userId     - MongoDB ObjectId of the user
 * @param       {boolean} completed  - Whether to increment completed count
 * @returns     {Promise<void>}
 */
const incrementCoachingStats = async (userId, completed = false) => {
  const update = { $inc: { totalCoachingInsights: 1 } };
  if (completed) update.$inc.completedCoachingInsights = 1;

  await DeveloperProfile.findOneAndUpdate({ userId }, update);
};

/**
 * @description Searches verified developer profiles with filters.
 *              Used by employer search dashboard.
 *              Constitution Standard 9 — paginated, optimized query.
 * @param       {Object} filters    - Search filters
 * @param       {Object} pagination - Page and limit values
 * @param       {Object} sort       - Sort configuration
 * @returns     {Promise<Object>} Results and total count
 */
const searchProfiles = async (filters = {}, pagination = {}, sort = {}) => {
  const { page = 1, limit = 20, skip = 0 } = pagination;

  // Build query — only verified and public profiles
  const query = {
    isPublic: true,
    verificationStatus: 'verified',
    ...filters,
  };

  // Run count and find in parallel for performance
  const [total, profiles] = await Promise.all([
    DeveloperProfile.countDocuments(query),
    DeveloperProfile.find(query)
      .populate('userId', 'name githubUsername avatarUrl')
      .sort(sort.trustScore ? { trustScore: -1 } : { lastVerifiedAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { profiles, total };
};

/**
 * @description Returns platform-wide developer statistics.
 *              Used by admin dashboard.
 * @returns     {Promise<Object>} Aggregated developer statistics
 */
const getStatistics = async () => {
  const [total, verified, pending, flagged] = await Promise.all([
    DeveloperProfile.countDocuments(),
    DeveloperProfile.countDocuments({ verificationStatus: 'verified' }),
    DeveloperProfile.countDocuments({ verificationStatus: 'pending' }),
    DeveloperProfile.countDocuments({ verificationStatus: 'flagged' }),
  ]);

  return { total, verified, pending, flagged };
};

/**
 * @description Permanently deletes a developer profile.
 *              Called when user exercises NDPR/GDPR right to erasure.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<void>}
 */
const deleteProfile = async (userId) => {
  await DeveloperProfile.findOneAndDelete({ userId });
};

module.exports = {
  createProfile,
  findByUserId,
  findById,
  findPublicProfile,
  updateProfile,
  updateVerificationResults,
  updateVerificationStatus,
  updateBadge,
  updatePlan,
  incrementCoachingStats,
  searchProfiles,
  getStatistics,
  deleteProfile,
};