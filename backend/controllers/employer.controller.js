/**
 * @file        employer.controller.js
 * @description TechTrust employer controller.
 *              Handles HTTP layer for all employer endpoints.
 *              Controllers only handle req/res — all logic in employer.service.js.
 *              Constitution Standard 10 — strict layer separation enforced.
 *              Constitution Standard 3  — sanitized responses only.
 *              SPECIFICATION.md Section 5 — employer features reference.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const EmployerService = require('../services/employer.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  successResponse,
  createdResponse,
  paginatedResponse,
  noContentResponse,
} = require('../utils/response');
const {
  getPaginationParams,
  buildPaginationMeta,
} = require('../utils/pagination');

// ── Profile Management ────────────────────────────────────────────────────────
/**
 * @description Creates a new employer profile for the authenticated user.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const createProfile = asyncHandler(async (req, res) => {
  const profile = await EmployerService.createProfile(req.user.id);

  return createdResponse(
    res,
    'Employer profile created successfully.',
    { profile }
  );
});

/**
 * @description Returns the authenticated employer's own profile.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getOwnProfile = asyncHandler(async (req, res) => {
  const profile = await EmployerService.getOwnProfile(req.user.id);

  return successResponse(
    res,
    200,
    'Employer profile retrieved successfully',
    { profile }
  );
});

/**
 * @description Updates the authenticated employer's profile.
 * @param       {Object} req      - Express request object
 * @param       {Object} req.body - Updated profile fields
 * @param       {Object} res      - Express response object
 * @returns     {Promise<void>}
 */
const updateProfile = asyncHandler(async (req, res) => {
  const updatedProfile = await EmployerService.updateProfile(
    req.user.id,
    req.body
  );

  return successResponse(
    res,
    200,
    'Employer profile updated successfully',
    { profile: updatedProfile }
  );
});

// ── Developer Search & Saving ─────────────────────────────────────────────────
/**
 * @description Searches verified developer profiles.
 *              Enforces plan-based monthly view limits.
 * @param       {Object} req       - Express request object
 * @param       {Object} req.query - Search filters and pagination
 * @param       {Object} res       - Express response object
 * @returns     {Promise<void>}
 */
const searchDevelopers = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query, 20);

  const filters = {
    minTrustScore: req.query.minTrustScore,
    availability: req.query.availability,
    experienceLevel: req.query.experienceLevel,
    country: req.query.country,
    skills: req.query.skills,
  };

  const { profiles, total } = await EmployerService.searchDevelopers(
    req.user.id,
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

/**
 * @description Returns employer's saved developer profiles.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getSavedDevelopers = asyncHandler(async (req, res) => {
  const savedDevelopers = await EmployerService.getSavedDevelopers(req.user.id);

  return successResponse(
    res,
    200,
    'Saved developers retrieved successfully',
    { savedDevelopers }
  );
});

/**
 * @description Saves a developer profile to employer's saved list.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.id  - Developer profile ID
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const saveDeveloper = asyncHandler(async (req, res) => {
  const { id: developerId } = req.params;

  if (!developerId) {
    throw AppError.badRequest('Developer ID is required.');
  }

  await EmployerService.saveDeveloper(req.user.id, developerId);

  return successResponse(
    res,
    200,
    'Developer saved successfully'
  );
});

/**
 * @description Removes a developer from employer's saved list.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.id  - Developer profile ID
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const unsaveDeveloper = asyncHandler(async (req, res) => {
  const { id: developerId } = req.params;

  if (!developerId) {
    throw AppError.badRequest('Developer ID is required.');
  }

  await EmployerService.unsaveDeveloper(req.user.id, developerId);

  return noContentResponse(res);
});

// ── Job Postings ──────────────────────────────────────────────────────────────
/**
 * @description Returns all job postings by the authenticated employer.
 * @param       {Object} req       - Express request object
 * @param       {Object} req.query - Optional status filter
 * @param       {Object} res       - Express response object
 * @returns     {Promise<void>}
 */
const getOwnJobPostings = asyncHandler(async (req, res) => {
  const { status } = req.query;

  const jobs = await EmployerService.getOwnJobPostings(req.user.id, status);

  return successResponse(
    res,
    200,
    'Job postings retrieved successfully',
    { jobs, total: jobs.length }
  );
});

/**
 * @description Creates a new job posting.
 * @param       {Object} req      - Express request object
 * @param       {Object} req.body - Job posting data
 * @param       {Object} res      - Express response object
 * @returns     {Promise<void>}
 */
const createJobPosting = asyncHandler(async (req, res) => {
  const {
    title,
    description,
    requirements,
    skills,
    salaryRange,
    workType,
    location,
    experienceLevel,
    minimumTrustScore,
    deadline,
  } = req.body;

  if (!title || !description || !workType) {
    throw AppError.badRequest(
      'Job title, description, and work type are required.'
    );
  }

  const job = await EmployerService.createJobPosting(req.user.id, {
    title,
    description,
    requirements,
    skills,
    salaryRange,
    workType,
    location,
    experienceLevel,
    minimumTrustScore,
    deadline,
  });

  return createdResponse(
    res,
    'Job posting created successfully',
    { job }
  );
});

/**
 * @description Updates a job posting.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.id  - Job posting ID
 * @param       {Object} req.body       - Updated fields
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const updateJobPosting = asyncHandler(async (req, res) => {
  const { id: jobId } = req.params;

  if (!jobId) {
    throw AppError.badRequest('Job posting ID is required.');
  }

  const updatedJob = await EmployerService.updateJobPosting(
    req.user.id,
    jobId,
    req.body
  );

  return successResponse(
    res,
    200,
    'Job posting updated successfully',
    { job: updatedJob }
  );
});

/**
 * @description Closes a job posting permanently.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.id  - Job posting ID
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const closeJobPosting = asyncHandler(async (req, res) => {
  const { id: jobId } = req.params;

  if (!jobId) {
    throw AppError.badRequest('Job posting ID is required.');
  }

  const closedJob = await EmployerService.closeJobPosting(req.user.id, jobId);

  return successResponse(
    res,
    200,
    'Job posting closed successfully',
    { job: closedJob }
  );
});

/**
 * @description Searches public active job postings.
 *              Available to authenticated developers.
 * @param       {Object} req       - Express request object
 * @param       {Object} req.query - Search filters and pagination
 * @param       {Object} res       - Express response object
 * @returns     {Promise<void>}
 */
const searchJobPostings = asyncHandler(async (req, res) => {
  const { page, limit, skip } = getPaginationParams(req.query, 20);

  const filters = {
    workType: req.query.workType,
    experienceLevel: req.query.experienceLevel,
    country: req.query.country,
    skills: req.query.skills,
  };

  const { jobs, total } = await EmployerService.searchJobPostings(
    filters,
    { page, limit, skip }
  );

  const pagination = buildPaginationMeta(total, page, limit);

  return paginatedResponse(
    res,
    200,
    'Job postings retrieved successfully',
    jobs,
    pagination
  );
});

module.exports = {
  createProfile,
  getOwnProfile,
  updateProfile,
  searchDevelopers,
  getSavedDevelopers,
  saveDeveloper,
  unsaveDeveloper,
  getOwnJobPostings,
  createJobPosting,
  updateJobPosting,
  closeJobPosting,
  searchJobPostings,
};