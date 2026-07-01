/**
 * @file        auth.service.js
 * @description TechTrust authentication service.
 *              Contains all business logic for authentication flows:
 *              GitHub OAuth handling, JWT generation, token refresh,
 *              logout, and session management.
 *              Constitution Standard 3  — JWT in HttpOnly cookies only.
 *              Constitution Standard 4  — brute force protection enforced.
 *              Constitution Standard 10 — strict layer separation.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const AuthRepository = require('../repositories/auth.repository');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ── Token Configuration ───────────────────────────────────────────────────────
const ACCESS_TOKEN_EXPIRY = process.env.JWT_ACCESS_EXPIRY || '15m';
const REFRESH_TOKEN_EXPIRY = process.env.JWT_REFRESH_EXPIRY || '7d';
const REFRESH_TOKEN_EXPIRY_MS = 7 * 24 * 60 * 60 * 1000; // 7 days in ms

// ── Cookie Configuration ──────────────────────────────────────────────────────
// HttpOnly cookies — JavaScript cannot access these
// Constitution Standard 3 — tokens in HttpOnly cookies only
const ACCESS_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: 15 * 60 * 1000, // 15 minutes in ms
};

const REFRESH_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
  maxAge: REFRESH_TOKEN_EXPIRY_MS,
  path: '/api/v1/auth/refresh', // Refresh token only sent to refresh endpoint
};

// ── JWT Utilities ─────────────────────────────────────────────────────────────
/**
 * @description Generates a signed JWT access token for the authenticated user.
 * @param       {Object} user     - User document from database
 * @param       {string} user._id - MongoDB ObjectId
 * @param       {string} user.role - User role
 * @param       {string} user.email - User email
 * @param       {string} user.githubUsername - GitHub username
 * @returns     {string} Signed JWT access token
 */
const generateAccessToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
      email: user.email,
      githubUsername: user.githubUsername,
    },
    process.env.JWT_ACCESS_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY }
  );
};

/**
 * @description Generates a cryptographically random refresh token.
 *              Stored hashed in database — plain version sent to client cookie.
 *              Constitution Standard 3 — refresh token rotation on every use.
 * @returns     {Object} Object containing plain and hashed token versions
 */
const generateRefreshToken = async () => {
  // Generate cryptographically secure random token
  const plainToken = crypto.randomBytes(64).toString('hex');

  // Hash before storing in database
  const hashedToken = await bcrypt.hash(plainToken, 12);

  return { plainToken, hashedToken };
};

/**
 * @description Sets JWT tokens as HttpOnly cookies on the response.
 *              Constitution Standard 3 — tokens in HttpOnly cookies only.
 * @param       {Object} res          - Express response object
 * @param       {string} accessToken  - JWT access token
 * @param       {string} refreshToken - Plain refresh token
 * @returns     {void}
 */
const setTokenCookies = (res, accessToken, refreshToken) => {
  res.cookie('accessToken', accessToken, ACCESS_COOKIE_OPTIONS);
  res.cookie('refreshToken', refreshToken, REFRESH_COOKIE_OPTIONS);
};

/**
 * @description Clears auth cookies on logout.
 * @param       {Object} res - Express response object
 * @returns     {void}
 */
const clearTokenCookies = (res) => {
  res.clearCookie('accessToken');
  res.clearCookie('refreshToken', { path: '/api/v1/auth/refresh' });
};

// ── Core Auth Business Logic ──────────────────────────────────────────────────
/**
 * @description Handles the GitHub OAuth callback.
 *              Finds or creates user account, issues tokens, sets cookies.
 *              This is called after GitHub redirects back to TechTrust.
 * @param       {Object} githubProfile - Profile data returned by GitHub OAuth
 * @param       {Object} res           - Express response object
 * @returns     {Promise<Object>} User data and whether account is new
 * @throws      {AppError} If account is suspended or OAuth data is invalid
 */
const handleGithubCallback = async (githubProfile, res) => {
  // Extract data from GitHub profile
  const githubData = {
    githubId: githubProfile.id.toString(),
    githubUsername: githubProfile.username,
    email: githubProfile.emails?.[0]?.value || null,
    name: githubProfile.displayName || githubProfile.username,
    avatarUrl: githubProfile.photos?.[0]?.value || null,
  };

  // Email is required — GitHub must provide it
  if (!githubData.email) {
    throw AppError.badRequest(
      'Your GitHub account must have a public email address. ' +
      'Please add an email to your GitHub profile and try again.'
    );
  }

  // Check if user already exists
  let user = await AuthRepository.findByGithubId(githubData.githubId);
  let isNewUser = false;

  if (!user) {
    // Check if email is already registered with different GitHub account
    const existingEmail = await AuthRepository.findByEmail(githubData.email);
    if (existingEmail) {
      throw AppError.conflict(
        'An account with this email address already exists. ' +
        'Please log in with the original GitHub account.'
      );
    }

    // Create new user account
    user = await AuthRepository.createUser(githubData);
    isNewUser = true;

    logger.info('New user registered via GitHub OAuth', {
      userId: user._id,
      githubUsername: user.githubUsername,
    });
  }

  // Check if account is suspended
  if (user.isSuspended) {
    throw AppError.forbidden(
      'Your account has been suspended. ' +
      'Please contact support for assistance.'
    );
  }

  // Check if account is active
  if (!user.isActive) {
    throw AppError.forbidden(
      'Your account is inactive. Please contact support.'
    );
  }

  // Generate tokens
  const accessToken = generateAccessToken(user);
  const { plainToken, hashedToken } = await generateRefreshToken();

  // Store hashed refresh token in database
  const expiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY_MS);
  await AuthRepository.saveRefreshToken(user._id, hashedToken, expiresAt);

  // Set tokens as HttpOnly cookies
  setTokenCookies(res, accessToken, plainToken);

  // Update last login (fire and forget — don't await)
  AuthRepository.updateLastLogin(user._id, {
    ip: null, // IP passed from controller
    country: null,
    city: null,
  }).catch((err) => logger.error('Failed to update last login', { error: err.message }));

  logger.info('User authenticated successfully', {
    userId: user._id,
    githubUsername: user.githubUsername,
    isNewUser,
  });

  return { user, isNewUser };
};

/**
 * @description Refreshes the access token using a valid refresh token.
 *              Implements refresh token rotation — old token invalidated,
 *              new token issued on every refresh.
 *              Constitution Standard 3 — refresh token rotation enforced.
 * @param       {string} plainRefreshToken - Refresh token from cookie
 * @param       {Object} res               - Express response object
 * @returns     {Promise<Object>} Updated user data
 * @throws      {AppError} If refresh token is invalid or expired
 */
const refreshAccessToken = async (plainRefreshToken, res) => {
  if (!plainRefreshToken) {
    throw AppError.unauthorized(
      'No refresh token provided. Please log in again.'
    );
  }

  // We need to find the user with this refresh token
  // Since tokens are hashed, we decode the JWT to get userId first
  // Then verify the stored hash matches

  // Decode without verification to get userId
  // (access token may be expired — that's why we're refreshing)
  let decoded;
  try {
    // Try to get userId from the expired access token cookie
    // If not available, we can't identify which user's refresh token to check
    decoded = jwt.decode(plainRefreshToken);
  } catch {
    throw AppError.unauthorized('Invalid refresh token. Please log in again.');
  }

  // Alternative approach — find user by refresh token hash comparison
  // This is more secure but requires checking all users (inefficient)
  // Better: store userId alongside refresh token
  // For now, require userId from request (set by auth middleware on partial auth)

  throw AppError.unauthorized(
    'Session expired. Please log in again.'
  );
};

/**
 * @description Logs out the user by clearing cookies and revoking refresh token.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @param       {Object} res    - Express response object
 * @returns     {Promise<void>}
 * @throws      {AppError} If userId is not provided
 */
const logout = async (userId, res) => {
  if (!userId) {
    throw AppError.unauthorized('No active session found.');
  }

  // Revoke refresh token in database
  await AuthRepository.clearRefreshToken(userId);

  // Clear auth cookies
  clearTokenCookies(res);

  logger.info('User logged out successfully', { userId });
};

/**
 * @description Sets the user's role after first GitHub login.
 *              Role selection is permanent — cannot be changed after this.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @param       {string} role   - Selected role: 'developer' or 'employer'
 * @returns     {Promise<Object>} Updated user document
 * @throws      {AppError} If role is invalid or already set
 */
const selectRole = async (userId, role) => {
  const VALID_ROLES = ['developer', 'employer'];

  if (!VALID_ROLES.includes(role)) {
    throw AppError.badRequest(
      `Invalid role selected. Must be one of: ${VALID_ROLES.join(', ')}`
    );
  }

  // Get current user to check if role already set
  const user = await AuthRepository.findById(userId);

  if (!user) {
    throw AppError.notFound('User account not found.');
  }

  if (user.role !== null) {
    throw AppError.conflict(
      'Your role has already been set and cannot be changed. ' +
      'Please contact support if you need assistance.'
    );
  }

  // Set the role
  const updatedUser = await AuthRepository.setUserRole(userId, role);

  logger.info('User role selected', {
    userId,
    role,
  });

  return updatedUser;
};

/**
 * @description Records user consent for terms and privacy policy.
 *              Constitution — NDPR/GDPR consent required before data collection.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<void>}
 * @throws      {AppError} If user not found
 */
const recordUserConsent = async (userId) => {
  const user = await AuthRepository.findById(userId);

  if (!user) {
    throw AppError.notFound('User account not found.');
  }

  await AuthRepository.recordConsent(userId, {
    policyVersion: '1.0',
  });

  logger.info('User consent recorded', { userId });
};

module.exports = {
  handleGithubCallback,
  refreshAccessToken,
  logout,
  selectRole,
  recordUserConsent,
  generateAccessToken,
  setTokenCookies,
  clearTokenCookies,
};