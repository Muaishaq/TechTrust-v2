/**
 * @file        auth.controller.js
 * @description TechTrust authentication controller.
 *              Handles HTTP layer for all authentication endpoints.
 *              Controllers only handle req/res — all logic in auth.service.js.
 *              Constitution Standard 10 — strict layer separation enforced.
 *              Constitution Standard 3  — sanitized responses only.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const AuthService = require('../services/auth.service');
const AuthRepository = require('../repositories/auth.repository');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse, errorResponse } = require('../utils/response');
const logger = require('../utils/logger');

// ── GitHub OAuth Initiation ───────────────────────────────────────────────────
/**
 * @description Initiates GitHub OAuth flow.
 *              Passport.js handles the redirect to GitHub automatically.
 *              This controller is called before the redirect happens.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {void}
 */
const githubLogin = asyncHandler(async (req, res) => {
  // Passport middleware handles this redirect
  // This function is here for documentation purposes
  // passport.authenticate('github') runs before this controller
  logger.info('GitHub OAuth initiated', { ip: req.ip });
});

// ── GitHub OAuth Callback ─────────────────────────────────────────────────────
/**
 * @description Handles the GitHub OAuth callback after user approves access.
 *              Passport populates req.user with GitHub profile data.
 *              Creates or finds user account, issues JWT tokens in cookies.
 * @param       {Object} req - Express request object (req.user = GitHub profile)
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const githubCallback = asyncHandler(async (req, res) => {
  // Passport populates req.user with GitHub profile after OAuth
  if (!req.user) {
    throw AppError.unauthorized(
      'GitHub authentication failed. Please try again.'
    );
  }

  // Handle the OAuth callback — creates/finds user, issues tokens
  const { user, isNewUser } = await AuthService.handleGithubCallback(
    req.user,
    res
  );

  // Update last login with real IP
  await AuthRepository.updateLastLogin(user._id, {
    ip: req.ip,
    country: null, // Geolocation added in Phase 3
    city: null,
  });

  // Determine redirect based on user state
  const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

  if (isNewUser || !user.role) {
    // New user or user without role → role selection page
    return res.redirect(`${FRONTEND_URL}/select-role`);
  }

  if (!user.hasAcceptedTerms) {
    // User hasn't accepted terms → consent page
    return res.redirect(`${FRONTEND_URL}/consent`);
  }

  // Existing user with role and consent → their dashboard
  const dashboardRoutes = {
    developer: '/developer/dashboard',
    employer: '/employer/dashboard',
    admin: '/admin/dashboard',
  };

  const dashboardPath = dashboardRoutes[user.role] || '/dashboard';
  return res.redirect(`${FRONTEND_URL}${dashboardPath}`);
});

// ── Get Current User ──────────────────────────────────────────────────────────
/**
 * @description Returns the currently authenticated user's data.
 *              Used by frontend to verify session and get user info on load.
 * @param       {Object} req - Express request object (req.user set by authenticate middleware)
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getMe = asyncHandler(async (req, res) => {
  // req.user is set by authenticate middleware
  const user = await AuthRepository.findById(req.user.id);

  if (!user) {
    throw AppError.notFound('User account not found.');
  }

  return successResponse(res, 200, 'User retrieved successfully', { user });
});

// ── Logout ────────────────────────────────────────────────────────────────────
/**
 * @description Logs out the authenticated user.
 *              Clears HttpOnly cookies and revokes refresh token in database.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const logout = asyncHandler(async (req, res) => {
  await AuthService.logout(req.user.id, res);

  return successResponse(res, 200, 'Logged out successfully');
});

// ── Refresh Token ─────────────────────────────────────────────────────────────
/**
 * @description Issues a new access token using a valid refresh token.
 *              Refresh token is read from HttpOnly cookie automatically.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const refresh = asyncHandler(async (req, res) => {
  const refreshToken = req.cookies?.refreshToken;

  if (!refreshToken) {
    throw AppError.unauthorized(
      'No refresh token found. Please log in again.'
    );
  }

  await AuthService.refreshAccessToken(refreshToken, res);

  return successResponse(res, 200, 'Token refreshed successfully');
});

// ── Select Role ───────────────────────────────────────────────────────────────
/**
 * @description Sets the user's role after first GitHub login.
 *              Called when new user selects Developer or Employer on role page.
 * @param       {Object} req      - Express request object
 * @param       {Object} req.body - Request body
 * @param       {string} req.body.role - Selected role: 'developer' or 'employer'
 * @param       {Object} res      - Express response object
 * @returns     {Promise<void>}
 */
const selectRole = asyncHandler(async (req, res) => {
  const { role } = req.body;

  if (!role) {
    throw AppError.badRequest('Role is required. Please select a role.');
  }

  const updatedUser = await AuthService.selectRole(req.user.id, role);

  logger.info('Role selected', {
    userId: req.user.id,
    role,
  });

  return successResponse(
    res,
    200,
    `Role set to ${role} successfully`,
    { user: updatedUser }
  );
});

// ── Record Consent ────────────────────────────────────────────────────────────
/**
 * @description Records user's consent to terms and privacy policy.
 *              Constitution — NDPR/GDPR consent must be recorded before
 *              any personal data is collected or processed.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const recordConsent = asyncHandler(async (req, res) => {
  await AuthService.recordUserConsent(req.user.id);

  return successResponse(
    res,
    200,
    'Consent recorded successfully. Welcome to TechTrust.'
  );
});

module.exports = {
  githubLogin,
  githubCallback,
  getMe,
  logout,
  refresh,
  selectRole,
  recordConsent,
};