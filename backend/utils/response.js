/**
 * @file        response.js
 * @description TechTrust standardized API response utility.
 *              Every API response across the entire platform must use
 *              these functions — no direct res.json() calls in controllers.
 *              Ensures consistent response structure for all clients.
 *              Constitution Standard 1  — consistent code structure.
 *              Constitution Standard 3  — sanitized error responses.
 *              Constitution Standard 6  — clear feedback on every action.
 * @author      Muaishaq
 * @created     2026-06-30
 * @modified    2026-06-30
 */

'use strict';

/**
 * @description Sends a standardized success response
 * @param       {Object} res        - Express response object
 * @param       {number} statusCode - HTTP status code (200, 201, etc)
 * @param       {string} message    - Human readable success message
 * @param       {*}      data       - Response data payload (optional)
 * @returns     {Object} Express JSON response
 *
 * @example
 * // Simple success with data:
 * return successResponse(res, 200, 'Profile retrieved successfully', profile);
 *
 * // Created resource:
 * return successResponse(res, 201, 'Developer profile created', newProfile);
 *
 * // Success with no data:
 * return successResponse(res, 200, 'Logout successful');
 */
const successResponse = (res, statusCode, message, data = null) => {
  const response = {
    success: true,
    message,
  };

  // Only include data field if data was provided
  if (data !== null && data !== undefined) {
    response.data = data;
  }

  return res.status(statusCode).json(response);
};

/**
 * @description Sends a standardized error response.
 *              Never exposes internal error details to the client.
 *              Constitution Standard 3 — sanitized error responses.
 * @param       {Object} res        - Express response object
 * @param       {number} statusCode - HTTP status code (400, 401, 403, 404, 500)
 * @param       {string} message    - Human readable error message
 * @param       {Array}  errors     - Optional array of validation errors
 * @returns     {Object} Express JSON response
 *
 * @example
 * // Simple error:
 * return errorResponse(res, 404, 'Developer profile not found');
 *
 * // Validation errors:
 * return errorResponse(res, 400, 'Validation failed', [
 *   { field: 'email', message: 'Invalid email address' },
 *   { field: 'name', message: 'Name is required' }
 * ]);
 */
const errorResponse = (res, statusCode, message, errors = []) => {
  const response = {
    success: false,
    message,
  };

  // Only include errors array if validation errors were provided
  if (errors.length > 0) {
    response.errors = errors;
  }

  return res.status(statusCode).json(response);
};

/**
 * @description Sends a standardized paginated list response.
 *              Used by all endpoints that return lists of resources.
 *              Constitution Standard 9 — all lists paginated.
 * @param       {Object} res          - Express response object
 * @param       {number} statusCode   - HTTP status code (usually 200)
 * @param       {string} message      - Human readable success message
 * @param       {Array}  data         - Array of resource items
 * @param       {Object} pagination   - Pagination metadata
 * @param       {number} pagination.page        - Current page number
 * @param       {number} pagination.limit       - Items per page
 * @param       {number} pagination.total       - Total number of items
 * @param       {number} pagination.totalPages  - Total number of pages
 * @returns     {Object} Express JSON response
 *
 * @example
 * return paginatedResponse(res, 200, 'Developers retrieved', developers, {
 *   page: 1,
 *   limit: 20,
 *   total: 450,
 *   totalPages: 23
 * });
 */
const paginatedResponse = (res, statusCode, message, data, pagination) => {
  return res.status(statusCode).json({
    success: true,
    message,
    data,
    pagination: {
      page: pagination.page,
      limit: pagination.limit,
      total: pagination.total,
      totalPages: pagination.totalPages,
      hasNextPage: pagination.page < pagination.totalPages,
      hasPrevPage: pagination.page > 1,
    },
  });
};

/**
 * @description Sends a standardized created response (201).
 *              Shorthand for successResponse with 201 status.
 * @param       {Object} res     - Express response object
 * @param       {string} message - Human readable success message
 * @param       {*}      data    - Created resource data
 * @returns     {Object} Express JSON response
 *
 * @example
 * return createdResponse(res, 'Verification started successfully', verification);
 */
const createdResponse = (res, message, data = null) =>
  successResponse(res, 201, message, data);

/**
 * @description Sends a standardized no content response (204).
 *              Used for successful DELETE operations.
 * @param       {Object} res - Express response object
 * @returns     {Object} Express response with no body
 *
 * @example
 * return noContentResponse(res);
 */
const noContentResponse = (res) => res.status(204).send();

module.exports = {
  successResponse,
  errorResponse,
  paginatedResponse,
  createdResponse,
  noContentResponse,
};