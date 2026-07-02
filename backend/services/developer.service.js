/**
 * @file        developer.service.js
 * @description TechTrust developer profile service.
 *              Contains all business logic for developer features:
 *              profile management, verification flow orchestration,
 *              and coaching insight coordination.
 *              Constitution Standard 10 — strict layer separation.
 *              Constitution Standard 8  — fault tolerant flows.
 *              SPECIFICATION.md Section 4 — developer features.
 * @author      Muaishaq
 * @created     2026-07-02
 * @modified    2026-07-02
 */

'use strict';

const DeveloperRepository = require('../repositories/developer.repository');
const AuthRepository = require('../repositories/auth.repository');
const GitHubService = require('./github.service');
const AuditService = require('./audit.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');
const axios = require('axios');

// ── AI Engine Configuration ───────────────────────────────────────────────────
const AI_ENGINE_URL = process.env.AI_ENGINE_URL || 'http://localhost:8000';
const AI_ENGINE_API_KEY = process.env.AI_ENGINE_API_KEY;
const AI_CONFIDENCE_THRESHOLD = 0.6; // Flag verifications below 60% confidence

/**
 * @description Creates a new developer profile after role selection.
 *              Called automatically when user selects 'developer' role.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object>} Newly created developer profile
 * @throws      {AppError} If profile already exists
 */
const createProfile = async (userId) => {
  // Check if profile already exists
  const existing = await DeveloperRepository.findByUserId(userId);
  if (existing) {
    throw AppError.conflict(
      'A developer profile already exists for this account.'
    );
  }

  const profile = await DeveloperRepository.createProfile(userId);

  await AuditService.log({
    actorId: userId,
    actorRole: 'developer',
    action: AuditService.ACTIONS.USER_PROFILE_UPDATED,
    targetId: profile._id,
    targetType: 'DeveloperProfile',
    outcome: 'success',
    metadata: { event: 'profile_created' },
  });

  logger.info('Developer profile created', { userId });

  return profile;
};

/**
 * @description Retrieves a developer's own profile.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object>} Developer profile with user data
 * @throws      {AppError} If profile not found
 */
const getOwnProfile = async (userId) => {
  const profile = await DeveloperRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound(
      'Developer profile not found. Please complete your profile setup.'
    );
  }

  return profile;
};

/**
 * @description Retrieves a public developer profile by GitHub username.
 *              Used for public profile pages visible to employers.
 * @param       {string} githubUsername - GitHub username of the developer
 * @returns     {Promise<Object>} Public developer profile
 * @throws      {AppError} If profile not found or not public
 */
const getPublicProfile = async (githubUsername) => {
  // Find user by GitHub username first
  const user = await AuthRepository.findByGithubUsername(githubUsername);

  if (!user) {
    throw AppError.notFound(
      `Developer profile for '${githubUsername}' was not found.`
    );
  }

  const profile = await DeveloperRepository.findPublicProfile(user._id);

  if (!profile) {
    throw AppError.notFound(
      `Developer profile for '${githubUsername}' is not publicly available.`
    );
  }

  return profile;
};

/**
 * @description Updates a developer's own profile.
 *              Validates and sanitizes all updateable fields.
 * @param       {string} userId     - MongoDB ObjectId of the user
 * @param       {Object} updateData - Fields to update
 * @returns     {Promise<Object>} Updated developer profile
 * @throws      {AppError} If profile not found or data invalid
 */
const updateProfile = async (userId, updateData) => {
  const profile = await DeveloperRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound('Developer profile not found.');
  }

  // Only allow updating specific fields — never trust raw client data
  const allowedFields = {
    title: updateData.title,
    bio: updateData.bio,
    location: updateData.location,
    skills: updateData.skills,
    experienceLevel: updateData.experienceLevel,
    yearsOfExperience: updateData.yearsOfExperience,
    availability: updateData.availability,
    isPublic: updateData.isPublic,
    linkedinUrl: updateData.linkedinUrl,
    portfolioUrl: updateData.portfolioUrl,
    twitterUrl: updateData.twitterUrl,
  };

  // Remove undefined fields — only update what was provided
  Object.keys(allowedFields).forEach((key) => {
    if (allowedFields[key] === undefined) {
      delete allowedFields[key];
    }
  });

  const updatedProfile = await DeveloperRepository.updateProfile(
    userId,
    allowedFields
  );

  await AuditService.log({
    actorId: userId,
    actorRole: 'developer',
    action: AuditService.ACTIONS.USER_PROFILE_UPDATED,
    targetId: profile._id,
    targetType: 'DeveloperProfile',
    outcome: 'success',
    metadata: { updatedFields: Object.keys(allowedFields) },
  });

  logger.info('Developer profile updated', {
    userId,
    fields: Object.keys(allowedFields),
  });

  return updatedProfile;
};

/**
 * @description Triggers the full verification flow for a developer.
 *              Orchestrates: GitHub data collection → AI scoring → results storage.
 *              Constitution Standard 8 — each step has error handling.
 * @param       {string} userId         - MongoDB ObjectId of the user
 * @param       {string} githubUsername - Developer's GitHub username
 * @returns     {Promise<Object>} Verification results
 * @throws      {AppError} If cooldown active or verification fails
 */
const triggerVerification = async (userId, githubUsername) => {
  // Get current profile
  const profile = await DeveloperRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound(
      'Developer profile not found. Please complete your profile first.'
    );
  }

  // Check verification cooldown
  if (!profile.canVerify) {
    throw AppError.tooManyRequests(
      `Verification cooldown active. ` +
      `You can verify again in ${profile.daysUntilNextVerification} days. ` +
      `Upgrade to Premium for a 30-day cooldown instead of 90 days.`
    );
  }

  // Set status to pending
  await DeveloperRepository.updateVerificationStatus(userId, 'pending');

  await AuditService.log({
    actorId: userId,
    actorRole: 'developer',
    action: AuditService.ACTIONS.VERIFICATION_TRIGGERED,
    targetId: profile._id,
    targetType: 'DeveloperProfile',
    outcome: 'success',
    metadata: { githubUsername },
  });

  logger.info('Verification triggered', { userId, githubUsername });

  try {
    // Step 1 — Collect GitHub data
    logger.info('Collecting GitHub data', { githubUsername });
    const githubData = await GitHubService.collectDeveloperData(githubUsername);

    // Step 2 — Send to AI scoring engine
    logger.info('Sending data to AI engine', { userId });
    const scoringResult = await callAIEngine(githubData);

    // Step 3 — Check AI confidence score
    const isFlagged = scoringResult.confidence < AI_CONFIDENCE_THRESHOLD;

    if (isFlagged) {
      await DeveloperRepository.updateVerificationStatus(userId, 'flagged');
      await AuditService.log({
        actorId: userId,
        actorRole: 'developer',
        action: AuditService.ACTIONS.VERIFICATION_FLAGGED,
        targetId: profile._id,
        targetType: 'DeveloperProfile',
        outcome: 'success',
        metadata: {
          confidence: scoringResult.confidence,
          reason: 'Low AI confidence score',
        },
      });

      logger.warn('Verification flagged for admin review', {
        userId,
        confidence: scoringResult.confidence,
      });

      return {
        status: 'flagged',
        message:
          'Your verification is under review. ' +
          'Our team will review it within 48 hours.',
        confidence: scoringResult.confidence,
      };
    }

    // Step 4 — Store verification results
    await DeveloperRepository.updateVerificationResults(
      userId,
      scoringResult.trustScore,
      scoringResult.skillScores
    );

    await AuditService.log({
      actorId: userId,
      actorRole: 'developer',
      action: AuditService.ACTIONS.VERIFICATION_COMPLETED,
      targetId: profile._id,
      targetType: 'DeveloperProfile',
      outcome: 'success',
      metadata: {
        trustScore: scoringResult.trustScore,
        confidence: scoringResult.confidence,
      },
    });

    logger.info('Verification completed successfully', {
      userId,
      trustScore: scoringResult.trustScore,
    });

    return {
      status: 'verified',
      trustScore: scoringResult.trustScore,
      skillScores: scoringResult.skillScores,
      coachingInsights: scoringResult.coachingInsights || [],
      message: 'Verification complete. Your TechTrust profile is now live.',
    };

  } catch (error) {
    // Verification failed — reset status to unverified
    await DeveloperRepository.updateVerificationStatus(userId, 'unverified');

    await AuditService.log({
      actorId: userId,
      actorRole: 'developer',
      action: AuditService.ACTIONS.VERIFICATION_FAILED,
      targetId: profile._id,
      targetType: 'DeveloperProfile',
      outcome: 'failed',
      metadata: { error: error.message },
    });

    logger.error('Verification failed', {
      userId,
      error: error.message,
    });

    throw AppError.internal(
      'Verification failed due to a technical error. Please try again later.'
    );
  }
};

/**
 * @description Sends GitHub data to the Python AI scoring engine.
 *              Constitution Standard 8 — timeout and error handling.
 * @param       {Object} githubData - Collected GitHub data package
 * @returns     {Promise<Object>} Scoring results from AI engine
 * @throws      {AppError} If AI engine is unavailable
 */
const callAIEngine = async (githubData) => {
  try {
    const response = await axios.post(
      `${AI_ENGINE_URL}/score`,
      { githubData },
      {
        timeout: 30000, // 30 seconds for AI processing
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${AI_ENGINE_API_KEY}`,
        },
      }
    );

    return response.data;

  } catch (error) {
    // AI engine unavailable — return mock scores for development
    if (process.env.NODE_ENV === 'development') {
      logger.warn('AI engine unavailable — using development mock scores');
      return getMockScoringResult(githubData);
    }

    throw AppError.internal(
      'Verification service temporarily unavailable. Please try again later.'
    );
  }
};

/**
 * @description Returns mock scoring results for development testing.
 *              Only used when AI engine is unavailable in development.
 *              NEVER used in production.
 * @param       {Object} githubData - GitHub data package
 * @returns     {Object} Mock scoring result
 */
const getMockScoringResult = (githubData) => {
  const repoCount = githubData.repositories?.total || 0;
  const baseScore = Math.min(40 + repoCount * 2, 85);

  return {
    trustScore: baseScore,
    confidence: 0.75,
    skillScores: {
      codeConsistency: baseScore - 5,
      languageProficiency: githubData.languages?.totals || {},
      projectComplexity: baseScore - 10,
      collaborationScore: baseScore - 15,
      documentationQuality: baseScore - 20,
      activityRecency: baseScore,
      originalityScore: baseScore - 8,
      communityImpact: baseScore - 12,
    },
    coachingInsights: [
      {
        category: 'consistency',
        severity: 'important',
        title: 'Build a consistent commit history',
        problem: 'Your commit activity has gaps of several weeks',
        whyItMatters: 'Employers look for developers who code regularly',
        actionSteps: [
          'Commit code at least 3 times per week',
          'Work on personal projects during slow periods',
          'Contribute to open source to fill gaps',
        ],
        scoreImpact: 8,
      },
    ],
  };
};

/**
 * @description Searches verified developer profiles for employers.
 * @param       {Object} filters    - Search filters from query params
 * @param       {Object} pagination - Pagination parameters
 * @returns     {Promise<Object>} Matching profiles with pagination metadata
 */
const searchDevelopers = async (filters = {}, pagination = {}) => {
  // Build MongoDB filter from search params
  const mongoFilters = {};

  if (filters.minTrustScore) {
    mongoFilters.trustScore = { $gte: parseInt(filters.minTrustScore, 10) };
  }

  if (filters.availability) {
    mongoFilters.availability = filters.availability;
  }

  if (filters.experienceLevel) {
    mongoFilters.experienceLevel = filters.experienceLevel;
  }

  if (filters.country) {
    mongoFilters['location.country'] = filters.country;
  }

  if (filters.skills && filters.skills.length > 0) {
    mongoFilters.skills = {
      $in: Array.isArray(filters.skills)
        ? filters.skills
        : [filters.skills],
    };
  }

  const { profiles, total } = await DeveloperRepository.searchProfiles(
    mongoFilters,
    pagination
  );

  return { profiles, total };
};

module.exports = {
  createProfile,
  getOwnProfile,
  getPublicProfile,
  updateProfile,
  triggerVerification,
  searchDevelopers,
};