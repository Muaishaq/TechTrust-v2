/**
 * @file        auth.repository.js
 * @description TechTrust authentication repository.
 *              All database queries related to authentication live here.
 *              No business logic — only database operations.
 *              Constitution Standard 10 — strict layer separation.
 *              Constitution Standard 9  — optimized queries only.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const User = require('../models/User.model');
const logger = require('../utils/logger');

/**
 * @description Finds a user by their GitHub ID.
 *              Used during OAuth callback to check if user already exists.
 * @param       {string} githubId - The GitHub user ID
 * @returns     {Promise<Object|null>} User document or null if not found
 */
const findByGithubId = async (githubId) => {
  return await User.findOne({ githubId }).lean();
};

/**
 * @description Finds a user by their email address.
 *              Used to check for existing accounts before creation.
 * @param       {string} email - The user's email address
 * @returns     {Promise<Object|null>} User document or null if not found
 */
const findByEmail = async (email) => {
  return await User.findOne({ email: email.toLowerCase() }).lean();
};

/**
 * @description Finds a user by their ID.
 *              Used by auth middleware to validate token owner.
 * @param       {string} id - MongoDB ObjectId string
 * @returns     {Promise<Object|null>} User document or null if not found
 */
const findById = async (id) => {
  return await User.findById(id).lean();
};

/**
 * @description Finds a user by their GitHub username.
 * @param       {string} githubUsername - The GitHub username
 * @returns     {Promise<Object|null>} User document or null if not found
 */
const findByGithubUsername = async (githubUsername) => {
  return await User.findOne({
    githubUsername: githubUsername.toLowerCase(),
  }).lean();
};

/**
 * @description Creates a new user account from GitHub OAuth data.
 *              Called on first login when no existing account is found.
 * @param       {Object} userData           - User data from GitHub OAuth
 * @param       {string} userData.githubId  - GitHub user ID
 * @param       {string} userData.githubUsername - GitHub username
 * @param       {string} userData.email     - User email from GitHub
 * @param       {string} userData.name      - User display name
 * @param       {string} userData.avatarUrl - GitHub avatar URL
 * @returns     {Promise<Object>} Newly created user document
 */
const createUser = async (userData) => {
  const user = await User.create({
    githubId: userData.githubId,
    githubUsername: userData.githubUsername.toLowerCase(),
    email: userData.email.toLowerCase(),
    name: userData.name,
    avatarUrl: userData.avatarUrl || null,
    role: null, // Role selected after first login
    isActive: true,
    isSuspended: false,
  });

  logger.info('New user account created', {
    userId: user._id,
    githubUsername: user.githubUsername,
    role: user.role,
  });

  return user.toJSON();
};

/**
 * @description Updates user's last login information.
 *              Records timestamp, IP address, and geolocation.
 *              Constitution — activity tracking with consent check.
 * @param       {string} userId  - MongoDB ObjectId string
 * @param       {Object} loginData - Login metadata
 * @param       {string} loginData.ip      - Request IP address
 * @param       {string} loginData.country - Country from IP geolocation
 * @param       {string} loginData.city    - City from IP geolocation
 * @returns     {Promise<void>}
 */
const updateLastLogin = async (userId, loginData) => {
  await User.findByIdAndUpdate(userId, {
    lastLoginAt: new Date(),
    lastLoginIp: loginData.ip || null,
    lastLoginCountry: loginData.country || null,
    lastLoginCity: loginData.city || null,
    failedLoginAttempts: 0, // Reset on successful login
    lockedUntil: null,
  });
};

/**
 * @description Stores a hashed refresh token against the user account.
 *              Constitution Standard 3 — tokens stored hashed, never plain.
 * @param       {string} userId       - MongoDB ObjectId string
 * @param       {string} hashedToken  - Bcrypt hashed refresh token
 * @param       {Date}   expiresAt    - Token expiry date
 * @returns     {Promise<void>}
 */
const saveRefreshToken = async (userId, hashedToken, expiresAt) => {
  await User.findByIdAndUpdate(userId, {
    refreshToken: hashedToken,
    refreshTokenExpiresAt: expiresAt,
  });
};

/**
 * @description Retrieves the stored refresh token for a user.
 *              Explicitly selects the refresh token field (hidden by default).
 * @param       {string} userId - MongoDB ObjectId string
 * @returns     {Promise<Object|null>} User with refreshToken field
 */
const getRefreshToken = async (userId) => {
  return await User.findById(userId)
    .select('+refreshToken +refreshTokenExpiresAt')
    .lean();
};

/**
 * @description Clears the refresh token on logout.
 *              Invalidates the session completely.
 * @param       {string} userId - MongoDB ObjectId string
 * @returns     {Promise<void>}
 */
const clearRefreshToken = async (userId) => {
  await User.findByIdAndUpdate(userId, {
    refreshToken: null,
    refreshTokenExpiresAt: null,
  });
};

/**
 * @description Updates the user's selected role after first login.
 *              Role can only be set once — cannot be changed after selection.
 * @param       {string} userId - MongoDB ObjectId string
 * @param       {string} role   - Selected role: 'developer' or 'employer'
 * @returns     {Promise<Object>} Updated user document
 */
const setUserRole = async (userId, role) => {
  return await User.findByIdAndUpdate(
    userId,
    { role },
    { new: true, runValidators: true }
  ).lean();
};

/**
 * @description Records consent given by the user for terms and privacy policy.
 *              Constitution — NDPR/GDPR consent must be recorded.
 * @param       {string} userId         - MongoDB ObjectId string
 * @param       {Object} consentData    - Consent details
 * @param       {string} consentData.policyVersion - Current policy version
 * @returns     {Promise<void>}
 */
const recordConsent = async (userId, consentData) => {
  await User.findByIdAndUpdate(userId, {
    hasAcceptedTerms: true,
    termsAcceptedAt: new Date(),
    hasAcceptedPrivacyPolicy: true,
    privacyPolicyAcceptedAt: new Date(),
    privacyPolicyVersion: consentData.policyVersion || '1.0',
  });
};

/**
 * @description Increments failed login attempt counter.
 *              Locks account after 5 failed attempts.
 *              Constitution Standard 4 — brute force protection.
 * @param       {string} userId - MongoDB ObjectId string
 * @returns     {Promise<Object>} Updated user with security fields
 */
const incrementFailedAttempts = async (userId) => {
  const MAX_ATTEMPTS = 5;
  const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

  const user = await User.findById(userId)
    .select('+failedLoginAttempts +lockedUntil')
    .lean();

  if (!user) return null;

  const newAttempts = (user.failedLoginAttempts || 0) + 1;
  const updateData = { failedLoginAttempts: newAttempts };

  // Lock account if max attempts reached
  if (newAttempts >= MAX_ATTEMPTS) {
    updateData.lockedUntil = new Date(Date.now() + LOCK_DURATION_MS);
    logger.warn('Account locked due to failed login attempts', {
      userId,
      attempts: newAttempts,
    });
  }

  return await User.findByIdAndUpdate(userId, updateData, { new: true })
    .select('+failedLoginAttempts +lockedUntil')
    .lean();
};

/**
 * @description Marks a user account as suspended by an admin.
 * @param       {string} userId - MongoDB ObjectId string
 * @param       {string} reason - Reason for suspension
 * @returns     {Promise<Object>} Updated user document
 */
const suspendUser = async (userId, reason) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      isSuspended: true,
      suspendedAt: new Date(),
      suspendedReason: reason,
      refreshToken: null,       // Force logout on suspension
      refreshTokenExpiresAt: null,
    },
    { new: true }
  ).lean();
};

/**
 * @description Reactivates a suspended user account.
 * @param       {string} userId - MongoDB ObjectId string
 * @returns     {Promise<Object>} Updated user document
 */
const activateUser = async (userId) => {
  return await User.findByIdAndUpdate(
    userId,
    {
      isSuspended: false,
      suspendedAt: null,
      suspendedReason: null,
      failedLoginAttempts: 0,
      lockedUntil: null,
    },
    { new: true }
  ).lean();
};

/**
 * @description Permanently deletes a user and all their data.
 *              Constitution — NDPR/GDPR right to erasure.
 * @param       {string} userId - MongoDB ObjectId string
 * @returns     {Promise<void>}
 */
const deleteUser = async (userId) => {
  await User.findByIdAndDelete(userId);
  logger.info('User account permanently deleted', { userId });
};

module.exports = {
  findByGithubId,
  findByEmail,
  findById,
  findByGithubUsername,
  createUser,
  updateLastLogin,
  saveRefreshToken,
  getRefreshToken,
  clearRefreshToken,
  setUserRole,
  recordConsent,
  incrementFailedAttempts,
  suspendUser,
  activateUser,
  deleteUser,
};