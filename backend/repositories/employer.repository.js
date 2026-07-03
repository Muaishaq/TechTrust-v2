/**
 * @file        employer.repository.js
 * @description TechTrust employer profile repository.
 *              All database queries for employer profiles and job postings.
 *              No business logic — only database operations.
 *              Constitution Standard 10 — strict layer separation.
 *              Constitution Standard 9  — optimized queries only.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const EmployerProfile = require('../models/EmployerProfile.model');
const JobPosting = require('../models/JobPosting.model');

// ── Employer Profile Queries ──────────────────────────────────────────────────

/**
 * @description Creates a new employer profile for a user.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object>} Newly created employer profile
 */
const createProfile = async (userId) => {
  const profile = await EmployerProfile.create({ userId });
  return profile.toJSON();
};

/**
 * @description Finds an employer profile by user ID.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object|null>} Employer profile or null
 */
const findByUserId = async (userId) => {
  return await EmployerProfile.findOne({ userId }).lean();
};

/**
 * @description Finds an employer profile by profile ID.
 * @param       {string} profileId - MongoDB ObjectId of the profile
 * @returns     {Promise<Object|null>} Employer profile or null
 */
const findById = async (profileId) => {
  return await EmployerProfile.findById(profileId).lean();
};

/**
 * @description Updates an employer profile with provided data.
 * @param       {string} userId     - MongoDB ObjectId of the user
 * @param       {Object} updateData - Fields to update
 * @returns     {Promise<Object>} Updated employer profile
 */
const updateProfile = async (userId, updateData) => {
  return await EmployerProfile.findOneAndUpdate(
    { userId },
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();
};

/**
 * @description Increments the monthly profile view counter.
 *              Used to enforce plan limits on profile views.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object>} Updated employer profile
 */
const incrementProfileViews = async (userId) => {
  return await EmployerProfile.findOneAndUpdate(
    { userId },
    { $inc: { profileViewsThisMonth: 1 } },
    { new: true }
  ).lean();
};

/**
 * @description Saves a developer to employer's saved list.
 * @param       {string} userId      - MongoDB ObjectId of the employer user
 * @param       {string} developerId - MongoDB ObjectId of the developer profile
 * @returns     {Promise<Object>} Updated employer profile
 */
const saveDeveloper = async (userId, developerId) => {
  return await EmployerProfile.findOneAndUpdate(
    { userId },
    { $addToSet: { savedDevelopers: developerId } },
    { new: true }
  ).lean();
};

/**
 * @description Removes a developer from employer's saved list.
 * @param       {string} userId      - MongoDB ObjectId of the employer user
 * @param       {string} developerId - MongoDB ObjectId of the developer profile
 * @returns     {Promise<Object>} Updated employer profile
 */
const unsaveDeveloper = async (userId, developerId) => {
  return await EmployerProfile.findOneAndUpdate(
    { userId },
    { $pull: { savedDevelopers: developerId } },
    { new: true }
  ).lean();
};

/**
 * @description Updates employer subscription plan after payment.
 * @param       {string} userId    - MongoDB ObjectId of the user
 * @param       {string} planType  - New plan type
 * @param       {Date}   expiresAt - Plan expiry date
 * @returns     {Promise<Object>} Updated employer profile
 */
const updatePlan = async (userId, planType, expiresAt) => {
  return await EmployerProfile.findOneAndUpdate(
    { userId },
    { $set: { planType, planExpiresAt: expiresAt } },
    { new: true }
  ).lean();
};

/**
 * @description Permanently deletes an employer profile.
 *              Called when user exercises NDPR/GDPR right to erasure.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<void>}
 */
const deleteProfile = async (userId) => {
  await EmployerProfile.findOneAndDelete({ userId });
};

// ── Job Posting Queries ───────────────────────────────────────────────────────

/**
 * @description Creates a new job posting.
 * @param       {Object} jobData - Job posting data
 * @returns     {Promise<Object>} Newly created job posting
 */
const createJobPosting = async (jobData) => {
  const job = await JobPosting.create(jobData);
  return job.toJSON();
};

/**
 * @description Finds a job posting by ID.
 * @param       {string} jobId - MongoDB ObjectId of the job posting
 * @returns     {Promise<Object|null>} Job posting or null
 */
const findJobById = async (jobId) => {
  return await JobPosting.findById(jobId).lean();
};

/**
 * @description Finds all job postings by an employer.
 * @param       {string} employerId - MongoDB ObjectId of the employer profile
 * @param       {string} status     - Optional status filter
 * @returns     {Promise<Array>} Array of job postings
 */
const findJobsByEmployer = async (employerId, status = null) => {
  const filter = { employerId };
  if (status) filter.status = status;

  return await JobPosting.find(filter)
    .sort({ createdAt: -1 })
    .lean();
};

/**
 * @description Updates a job posting.
 * @param       {string} jobId      - MongoDB ObjectId of the job posting
 * @param       {string} employerId - MongoDB ObjectId of the employer (ownership check)
 * @param       {Object} updateData - Fields to update
 * @returns     {Promise<Object|null>} Updated job posting or null if not found
 */
const updateJobPosting = async (jobId, employerId, updateData) => {
  return await JobPosting.findOneAndUpdate(
    { _id: jobId, employerId },
    { $set: updateData },
    { new: true, runValidators: true }
  ).lean();
};

/**
 * @description Closes a job posting permanently.
 * @param       {string} jobId      - MongoDB ObjectId of the job posting
 * @param       {string} employerId - MongoDB ObjectId of the employer (ownership check)
 * @returns     {Promise<Object|null>} Updated job posting or null
 */
const closeJobPosting = async (jobId, employerId) => {
  return await JobPosting.findOneAndUpdate(
    { _id: jobId, employerId },
    { $set: { status: 'closed' } },
    { new: true }
  ).lean();
};

/**
 * @description Searches active public job postings.
 *              Constitution Standard 9 — paginated, optimized query.
 * @param       {Object} filters    - Search filters
 * @param       {Object} pagination - Page and limit values
 * @returns     {Promise<Object>} Results and total count
 */
const searchJobPostings = async (filters = {}, pagination = {}) => {
  const { skip = 0, limit = 20 } = pagination;

  const query = {
    status: 'active',
    ...filters,
  };

  const [total, jobs] = await Promise.all([
    JobPosting.countDocuments(query),
    JobPosting.find(query)
      .populate('employerId', 'companyName industry location isVerifiedEmployer')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
  ]);

  return { jobs, total };
};

/**
 * @description Adds a developer to a job's applicant list.
 * @param       {string} jobId  - MongoDB ObjectId of the job posting
 * @param       {string} userId - MongoDB ObjectId of the applying user
 * @returns     {Promise<Object>} Updated job posting
 */
const addApplicant = async (jobId, userId) => {
  return await JobPosting.findByIdAndUpdate(
    jobId,
    {
      $addToSet: { applicants: userId },
      $inc: { applicantCount: 1 },
    },
    { new: true }
  ).lean();
};

/**
 * @description Returns job posting statistics for admin dashboard.
 * @returns     {Promise<Object>} Aggregated job posting statistics
 */
const getStatistics = async () => {
  const [total, active, closed] = await Promise.all([
    JobPosting.countDocuments(),
    JobPosting.countDocuments({ status: 'active' }),
    JobPosting.countDocuments({ status: 'closed' }),
  ]);

  return { total, active, closed };
};

module.exports = {
  createProfile,
  findByUserId,
  findById,
  updateProfile,
  incrementProfileViews,
  saveDeveloper,
  unsaveDeveloper,
  updatePlan,
  deleteProfile,
  createJobPosting,
  findJobById,
  findJobsByEmployer,
  updateJobPosting,
  closeJobPosting,
  searchJobPostings,
  addApplicant,
  getStatistics,
};