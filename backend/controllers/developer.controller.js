/**
 * @file        developer.controller.js
 * @description TechTrust developer profile controller.
 *              Handles HTTP layer for all developer endpoints.
 *              Controllers only handle req/res — all logic in developer.service.js.
 *              Constitution Standard 10 — strict layer separation enforced.
 *              Constitution Standard 3  — sanitized responses only.
 *              SPECIFICATION.md Section 4 — developer features reference.
 * @author      Muaishaq
 * @created     2026-07-02
 * @modified    2026-07-02
 */

'use strict';

const DeveloperService = require('../services/developer.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  successResponse,
  createdResponse,
  paginatedResponse,
} = require('../utils/response');
const {
  getPaginationParams,
  buildPaginationMeta,
} = require('../utils/pagination');

// ── Profile Management ────────────────────────────────────────────────────────
/**
 * @description Creates a new developer profile for the authenticated user.
 *              Called automatically after role selection or manually via API.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const createProfile = asyncHandler(async (req, res) => {
  const profile = await DeveloperService.createProfile(req.user.id);

  return createdResponse(
    res,
    'Developer profile created successfully. Complete your profile to get verified.',
    { profile }
  );
});

/**
 * @description Returns the authenticated developer's own profile.
 *              Includes all private fields visible only to the owner.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getOwnProfile = asyncHandler(async (req, res) => {
  const profile = await DeveloperService.getOwnProfile(req.user.id);

  return successResponse(
    res,
    200,
    'Developer profile retrieved successfully',
    { profile }
  );
});

/**
 * @description Returns a public developer profile by GitHub username.
 *              Visible to employers and unauthenticated users.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.username - GitHub username
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const getPublicProfile = asyncHandler(async (req, res) => {
  const { username } = req.params;

  if (!username) {
    throw AppError.badRequest('GitHub username is required.');
  }

  const profile = await DeveloperService.getPublicProfile(username);

  return successResponse(
    res,
    200,
    'Developer profile retrieved successfully',
    { profile }
  );
});

/**
 * @description Updates the authenticated developer's profile.
 *              Only allows updating permitted fields — no trust score manipulation.
 * @param       {Object} req      - Express request object
 * @param       {Object} req.body - Updated profile fields
 * @param       {Object} res      - Express response object
 * @returns     {Promise<void>}
 */
const updateProfile = asyncHandler(async (req, res) => {
  const updatedProfile = await DeveloperService.updateProfile(
    req.user.id,
    req.body
  );

  return successResponse(
    res,
    200,
    'Developer profile updated successfully',
    { profile: updatedProfile }
  );
});

// ── Verification ──────────────────────────────────────────────────────────────
/**
 * @description Triggers the AI verification flow for the authenticated developer.
 *              Collects GitHub data, runs AI scoring, stores results.
 *              Returns immediately with status — processing is synchronous for now.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const triggerVerification = asyncHandler(async (req, res) => {
  // GitHub username comes from the authenticated user's JWT payload
  const githubUsername = req.user.githubUsername;

  if (!githubUsername) {
    throw AppError.badRequest(
      'GitHub username not found. Please log out and log in again.'
    );
  }

  const result = await DeveloperService.triggerVerification(
    req.user.id,
    githubUsername
  );

  // Different response based on verification outcome
  if (result.status === 'flagged') {
    return successResponse(
      res,
      200,
      result.message,
      { status: result.status, confidence: result.confidence }
    );
  }

  return successResponse(
    res,
    200,
    result.message,
    {
      status: result.status,
      trustScore: result.trustScore,
      skillScores: result.skillScores,
      coachingInsights: result.coachingInsights,
    }
  );
});

/**
 * @description Returns the latest verification status and results.
 *              Used by frontend to check verification state on dashboard load.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getVerificationStatus = asyncHandler(async (req, res) => {
  const profile = await DeveloperService.getOwnProfile(req.user.id);

  return successResponse(
    res,
    200,
    'Verification status retrieved successfully',
    {
      verificationStatus: profile.verificationStatus,
      trustScore: profile.trustScore,
      lastVerifiedAt: profile.lastVerifiedAt,
      canVerify: profile.canVerify,
      daysUntilNextVerification: profile.daysUntilNextVerification,
    }
  );
});

// ── Search ────────────────────────────────────────────────────────────────────
/**
 * @description Searches verified developer profiles.
 *              Used by employer search dashboard.
 *              Results are paginated — Constitution Standard 9.
 * @param       {Object} req       - Express request object
 * @param       {Object} req.query - Search filters and pagination params
 * @param       {Object} res       - Express response object
 * @returns     {Promise<void>}
 */
const searchDevelopers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query, 20);

  // Extract search filters from query params
  const filters = {
    minTrustScore: req.query.minTrustScore,
    availability: req.query.availability,
    experienceLevel: req.query.experienceLevel,
    country: req.query.country,
    skills: req.query.skills,
  };

  const { profiles, total } = await DeveloperService.searchDevelopers(
    filters,
    { page, limit, skip }
  );

  const pagination = buildPaginationMeta(total, page, limit);

  return paginatedResponse(
    res,
    200,
    'Developers retrieved successfully',
    profiles,
    pagination
  );
});

module.exports = {
  createProfile,
  getOwnProfile,
  getPublicProfile,
  updateProfile,
  triggerVerification,
  getVerificationStatus,
  searchDevelopers,
};