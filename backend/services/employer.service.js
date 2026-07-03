/**
 * @file        employer.service.js
 * @description TechTrust employer service.
 *              Contains all business logic for employer features:
 *              profile management, developer search, and job postings.
 *              Constitution Standard 10 — strict layer separation.
 *              Constitution Standard 8  — fault tolerant flows.
 *              SPECIFICATION.md Section 5 — employer features reference.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const EmployerRepository = require('../repositories/employer.repository');
const DeveloperRepository = require('../repositories/developer.repository');
const AuditService = require('./audit.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ── Employer Profile ──────────────────────────────────────────────────────────
/**
 * @description Creates a new employer profile after role selection.
 *              Called automatically when user selects 'employer' role.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object>} Newly created employer profile
 * @throws      {AppError} If profile already exists
 */
const createProfile = async (userId) => {
  const existing = await EmployerRepository.findByUserId(userId);
  if (existing) {
    throw AppError.conflict(
      'An employer profile already exists for this account.'
    );
  }

  const profile = await EmployerRepository.createProfile(userId);

  await AuditService.log({
    actorId: userId,
    actorRole: 'employer',
    action: AuditService.ACTIONS.USER_PROFILE_UPDATED,
    targetId: profile._id,
    targetType: 'EmployerProfile',
    outcome: 'success',
    metadata: { event: 'profile_created' },
  });

  logger.info('Employer profile created', { userId });

  return profile;
};

/**
 * @description Retrieves an employer's own profile.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object>} Employer profile
 * @throws      {AppError} If profile not found
 */
const getOwnProfile = async (userId) => {
  const profile = await EmployerRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound(
      'Employer profile not found. Please complete your profile setup.'
    );
  }

  return profile;
};

/**
 * @description Updates an employer's own profile.
 * @param       {string} userId     - MongoDB ObjectId of the user
 * @param       {Object} updateData - Fields to update
 * @returns     {Promise<Object>} Updated employer profile
 * @throws      {AppError} If profile not found
 */
const updateProfile = async (userId, updateData) => {
  const profile = await EmployerRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound('Employer profile not found.');
  }

  // Only allow updating specific fields
  const allowedFields = {
    companyName: updateData.companyName,
    companySize: updateData.companySize,
    industry: updateData.industry,
    website: updateData.website,
    description: updateData.description,
    location: updateData.location,
  };

  // Remove undefined fields
  Object.keys(allowedFields).forEach((key) => {
    if (allowedFields[key] === undefined) delete allowedFields[key];
  });

  const updatedProfile = await EmployerRepository.updateProfile(
    userId,
    allowedFields
  );

  await AuditService.log({
    actorId: userId,
    actorRole: 'employer',
    action: AuditService.ACTIONS.USER_PROFILE_UPDATED,
    targetId: profile._id,
    targetType: 'EmployerProfile',
    outcome: 'success',
    metadata: { updatedFields: Object.keys(allowedFields) },
  });

  return updatedProfile;
};

// ── Developer Search & Saving ─────────────────────────────────────────────────
/**
 * @description Searches verified developer profiles for employers.
 *              Enforces plan-based monthly view limits.
 * @param       {string} userId     - MongoDB ObjectId of the employer user
 * @param       {Object} filters    - Search filters
 * @param       {Object} pagination - Pagination parameters
 * @returns     {Promise<Object>} Matching profiles with pagination metadata
 * @throws      {AppError} If employer has reached monthly view limit
 */
const searchDevelopers = async (userId, filters = {}, pagination = {}) => {
  const profile = await EmployerRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound('Employer profile not found.');
  }

  // Check monthly view limit for free plan
  if (profile.planType === 'free' && profile.hasReachedViewLimit) {
    throw AppError.tooManyRequests(
      `You have reached your monthly limit of ${profile.monthlyViewLimit} ` +
      `developer profile views on the free plan. ` +
      `Upgrade to Starter or Pro for unlimited access.`
    );
  }

  // Build MongoDB filter
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
  if (filters.skills) {
    mongoFilters.skills = {
      $in: Array.isArray(filters.skills) ? filters.skills : [filters.skills],
    };
  }

  const { profiles, total } = await DeveloperRepository.searchProfiles(
    mongoFilters,
    pagination
  );

  // Increment view counter
  await EmployerRepository.incrementProfileViews(userId);

  return { profiles, total };
};

/**
 * @description Saves a developer profile to employer's saved list.
 * @param       {string} userId      - MongoDB ObjectId of the employer user
 * @param       {string} developerId - MongoDB ObjectId of the developer profile
 * @returns     {Promise<void>}
 * @throws      {AppError} If developer not found or already saved
 */
const saveDeveloper = async (userId, developerId) => {
  // Verify developer exists
  const developer = await DeveloperRepository.findById(developerId);
  if (!developer) {
    throw AppError.notFound('Developer profile not found.');
  }

  await EmployerRepository.saveDeveloper(userId, developerId);

  await AuditService.log({
    actorId: userId,
    actorRole: 'employer',
    action: AuditService.ACTIONS.DEVELOPER_SAVED,
    targetId: developerId,
    targetType: 'DeveloperProfile',
    outcome: 'success',
  });

  logger.info('Developer saved by employer', { userId, developerId });
};

/**
 * @description Removes a developer from employer's saved list.
 * @param       {string} userId      - MongoDB ObjectId of the employer user
 * @param       {string} developerId - MongoDB ObjectId of the developer profile
 * @returns     {Promise<void>}
 */
const unsaveDeveloper = async (userId, developerId) => {
  await EmployerRepository.unsaveDeveloper(userId, developerId);
  logger.info('Developer unsaved by employer', { userId, developerId });
};

/**
 * @description Returns employer's saved developer profiles.
 * @param       {string} userId - MongoDB ObjectId of the employer user
 * @returns     {Promise<Array>} Array of saved developer profiles
 * @throws      {AppError} If employer profile not found
 */
const getSavedDevelopers = async (userId) => {
  const profile = await EmployerRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound('Employer profile not found.');
  }

  return profile.savedDevelopers || [];
};

// ── Job Postings ──────────────────────────────────────────────────────────────
/**
 * @description Creates a new job posting.
 *              Enforces plan-based job posting limits.
 * @param       {string} userId  - MongoDB ObjectId of the employer user
 * @param       {Object} jobData - Job posting data
 * @returns     {Promise<Object>} Created job posting
 * @throws      {AppError} If job posting limit reached
 */
const createJobPosting = async (userId, jobData) => {
  const profile = await EmployerRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound('Employer profile not found.');
  }

  // Check active job posting limit
  const activeJobs = await EmployerRepository.findJobsByEmployer(
    profile._id,
    'active'
  );

  if (activeJobs.length >= profile.jobPostingLimit) {
    throw AppError.tooManyRequests(
      `You have reached your limit of ${profile.jobPostingLimit} active job ` +
      `posting(s) on the ${profile.planType} plan. ` +
      `Upgrade your plan to post more jobs.`
    );
  }

  const job = await EmployerRepository.createJobPosting({
    ...jobData,
    employerId: profile._id,
    userId,
    status: 'active',
  });

  await AuditService.log({
    actorId: userId,
    actorRole: 'employer',
    action: AuditService.ACTIONS.JOB_POSTED,
    targetId: job._id,
    targetType: 'JobPosting',
    outcome: 'success',
    metadata: { title: job.title },
  });

  logger.info('Job posting created', { userId, jobId: job._id });

  return job;
};

/**
 * @description Returns all job postings by an employer.
 * @param       {string} userId  - MongoDB ObjectId of the employer user
 * @param       {string} status  - Optional status filter
 * @returns     {Promise<Array>} Array of job postings
 */
const getOwnJobPostings = async (userId, status = null) => {
  const profile = await EmployerRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound('Employer profile not found.');
  }

  return await EmployerRepository.findJobsByEmployer(profile._id, status);
};

/**
 * @description Updates a job posting.
 *              Only the owning employer can update their job.
 * @param       {string} userId  - MongoDB ObjectId of the employer user
 * @param       {string} jobId   - MongoDB ObjectId of the job posting
 * @param       {Object} updates - Fields to update
 * @returns     {Promise<Object>} Updated job posting
 * @throws      {AppError} If job not found or not owned by employer
 */
const updateJobPosting = async (userId, jobId, updates) => {
  const profile = await EmployerRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound('Employer profile not found.');
  }

  // Only allow updating specific fields
  const allowedFields = {
    title: updates.title,
    description: updates.description,
    requirements: updates.requirements,
    skills: updates.skills,
    salaryRange: updates.salaryRange,
    workType: updates.workType,
    location: updates.location,
    experienceLevel: updates.experienceLevel,
    minimumTrustScore: updates.minimumTrustScore,
    deadline: updates.deadline,
    status: updates.status,
  };

  Object.keys(allowedFields).forEach((key) => {
    if (allowedFields[key] === undefined) delete allowedFields[key];
  });

  // Prevent employers from setting invalid statuses
  if (allowedFields.status && !['active', 'closed', 'draft'].includes(allowedFields.status)) {
    throw AppError.badRequest('Invalid status. Must be active, closed, or draft.');
  }

  const updatedJob = await EmployerRepository.updateJobPosting(
    jobId,
    profile._id,
    allowedFields
  );

  if (!updatedJob) {
    throw AppError.notFound(
      'Job posting not found or you do not have permission to update it.'
    );
  }

  return updatedJob;
};

/**
 * @description Closes a job posting permanently.
 * @param       {string} userId - MongoDB ObjectId of the employer user
 * @param       {string} jobId  - MongoDB ObjectId of the job posting
 * @returns     {Promise<Object>} Closed job posting
 * @throws      {AppError} If job not found or not owned by employer
 */
const closeJobPosting = async (userId, jobId) => {
  const profile = await EmployerRepository.findByUserId(userId);

  if (!profile) {
    throw AppError.notFound('Employer profile not found.');
  }

  const closedJob = await EmployerRepository.closeJobPosting(jobId, profile._id);

  if (!closedJob) {
    throw AppError.notFound(
      'Job posting not found or you do not have permission to close it.'
    );
  }

  await AuditService.log({
    actorId: userId,
    actorRole: 'employer',
    action: AuditService.ACTIONS.JOB_CLOSED,
    targetId: jobId,
    targetType: 'JobPosting',
    outcome: 'success',
  });

  logger.info('Job posting closed', { userId, jobId });

  return closedJob;
};

/**
 * @description Searches public active job postings.
 *              Available to authenticated developers and public users.
 * @param       {Object} filters    - Search filters
 * @param       {Object} pagination - Pagination parameters
 * @returns     {Promise<Object>} Matching jobs with pagination metadata
 */
const searchJobPostings = async (filters = {}, pagination = {}) => {
  const mongoFilters = {};

  if (filters.workType) mongoFilters.workType = filters.workType;
  if (filters.experienceLevel) mongoFilters.experienceLevel = filters.experienceLevel;
  if (filters.country) mongoFilters['location.country'] = filters.country;
  if (filters.skills) {
    mongoFilters.skills = {
      $in: Array.isArray(filters.skills) ? filters.skills : [filters.skills],
    };
  }

  return await EmployerRepository.searchJobPostings(mongoFilters, pagination);
};

module.exports = {
  createProfile,
  getOwnProfile,
  updateProfile,
  searchDevelopers,
  saveDeveloper,
  unsaveDeveloper,
  getSavedDevelopers,
  createJobPosting,
  getOwnJobPostings,
  updateJobPosting,
  closeJobPosting,
  searchJobPostings,
};