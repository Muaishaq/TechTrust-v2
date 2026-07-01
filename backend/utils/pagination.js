/**
 * @file        pagination.js
 * @description TechTrust pagination utility.
 *              Handles all pagination logic for list endpoints.
 *              Every list endpoint in TechTrust uses this utility —
 *              no endpoint ever returns an unbounded list of results.
 *              Constitution Standard 9  — all lists paginated.
 *              Constitution Standard 10 — consistent across all endpoints.
 * @author      Muaishaq
 * @created     2026-06-30
 * @modified    2026-06-30
 */

'use strict';

// ── Pagination Constants ───────────────────────────────────────────────────────
const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 100; // No request can ask for more than 100 items at once

/**
 * @description Extracts and validates pagination parameters from request query.
 *              Sanitizes page and limit values — prevents abuse.
 * @param       {Object} query       - Express request query object (req.query)
 * @param       {number} defaultLimit - Default items per page (optional)
 * @returns     {Object} Validated pagination params { page, limit, skip }
 *
 * @example
 * const { page, limit, skip } = getPaginationParams(req.query);
 * const developers = await DeveloperModel.find().skip(skip).limit(limit);
 */
const getPaginationParams = (query, defaultLimit = DEFAULT_LIMIT) => {
  // Parse page — default to 1 if missing or invalid
  let page = parseInt(query.page, 10);
  if (isNaN(page) || page < 1) page = DEFAULT_PAGE;

  // Parse limit — default to defaultLimit if missing or invalid
  let limit = parseInt(query.limit, 10);
  if (isNaN(limit) || limit < 1) limit = defaultLimit;

  // Cap limit at MAX_LIMIT — prevent requests for thousands of records
  if (limit > MAX_LIMIT) limit = MAX_LIMIT;

  // Calculate skip — how many records to skip for this page
  const skip = (page - 1) * limit;

  return { page, limit, skip };
};

/**
 * @description Builds pagination metadata for API responses.
 *              Used with paginatedResponse() from response.js
 * @param       {number} total - Total number of records in the collection
 * @param       {number} page  - Current page number
 * @param       {number} limit - Items per page
 * @returns     {Object} Pagination metadata object
 *
 * @example
 * const total = await DeveloperModel.countDocuments(filter);
 * const pagination = buildPaginationMeta(total, page, limit);
 * return paginatedResponse(res, 200, 'Developers retrieved', developers, pagination);
 */
const buildPaginationMeta = (total, page, limit) => {
  const totalPages = Math.ceil(total / limit);

  return {
    page,
    limit,
    total,
    totalPages,
    hasNextPage: page < totalPages,
    hasPrevPage: page > 1,
  };
};

/**
 * @description Builds a MongoDB sort object from query parameters.
 *              Validates sort fields against an allowed list to prevent
 *              injection attacks via sort parameters.
 * @param       {Object} query         - Express request query object
 * @param       {Array}  allowedFields - Fields that can be sorted on
 * @param       {string} defaultSort   - Default sort field
 * @returns     {Object} MongoDB sort object
 *
 * @example
 * const sort = buildSortParams(req.query, ['trustScore', 'createdAt'], '-createdAt');
 * const developers = await DeveloperModel.find().sort(sort);
 */
const buildSortParams = (query, allowedFields = [], defaultSort = '-createdAt') => {
  if (!query.sort) {
    return parseSortString(defaultSort);
  }

  // Validate sort field is in allowed list — prevent injection
  const sortField = query.sort.replace('-', '');
  if (!allowedFields.includes(sortField)) {
    return parseSortString(defaultSort);
  }

  return parseSortString(query.sort);
};

/**
 * @description Converts a sort string to a MongoDB sort object.
 *              Prefix with '-' for descending order.
 * @param       {string} sortString - Sort string (e.g. '-createdAt' or 'trustScore')
 * @returns     {Object} MongoDB sort object
 *
 * @example
 * parseSortString('-trustScore') // Returns { trustScore: -1 }
 * parseSortString('createdAt')   // Returns { createdAt: 1 }
 */
const parseSortString = (sortString) => {
  if (sortString.startsWith('-')) {
    return { [sortString.slice(1)]: -1 }; // Descending
  }
  return { [sortString]: 1 }; // Ascending
};

module.exports = {
  getPaginationParams,
  buildPaginationMeta,
  buildSortParams,
  DEFAULT_PAGE,
  DEFAULT_LIMIT,
  MAX_LIMIT,
};