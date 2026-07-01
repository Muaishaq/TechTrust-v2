/**
 * @file        AppError.js
 * @description TechTrust custom error class.
 *              Extends the native Error class with HTTP status codes
 *              and operational error flags.
 *              All intentional errors thrown in services and controllers
 *              must use this class — never throw plain Error objects.
 *              Constitution Standard 3  — sanitized error responses.
 *              Constitution Standard 8  — predictable error handling.
 * @author      Muaishaq
 * @created     2026-06-30
 * @modified    2026-06-30
 */

'use strict';

/**
 * @description Custom error class for all TechTrust operational errors.
 *              Operational errors are expected errors we can handle cleanly
 *              (e.g. invalid input, unauthorized access, resource not found).
 *              Non-operational errors (programming bugs) are handled separately
 *              by the global error handler in app.js.
 *
 * @example
 * // Throw a 404 error when a developer profile is not found:
 * throw new AppError('Developer profile not found', 404);
 *
 * // Throw a 401 error for unauthorized access:
 * throw new AppError('You must be logged in to access this resource', 401);
 *
 * // Throw a 403 error for forbidden access:
 * throw new AppError('You do not have permission to perform this action', 403);
 *
 * // Throw a 400 error for bad request:
 * throw new AppError('Invalid verification request', 400);
 *
 * // Throw a 409 error for conflict:
 * throw new AppError('A developer profile already exists for this account', 409);
 *
 * // Throw a 429 error for too many requests:
 * throw new AppError('Verification cooldown active — try again in 30 days', 429);
 */
class AppError extends Error {
  /**
   * @description Creates a new AppError instance
   * @param       {string} message    - Human readable error message sent to client
   * @param       {number} statusCode - HTTP status code (400, 401, 403, 404, 409, etc)
   * @param       {Array}  errors     - Optional array of validation error details
   */
  constructor(message, statusCode, errors = []) {
    // Call parent Error constructor with the message
    super(message);

    // ── Properties ──────────────────────────────────────────────────────
    this.statusCode = statusCode;
    this.errors = errors;

    // Operational errors are expected — we handle them gracefully
    // Non-operational errors (bugs) are not instances of AppError
    this.isOperational = true;

    // HTTP status classification
    // 4xx = client errors, 5xx = server errors
    this.status = `${statusCode}`.startsWith('4') ? 'fail' : 'error';

    // Capture the stack trace — excludes this constructor from the trace
    // Only used in development — never sent to client
    Error.captureStackTrace(this, this.constructor);
  }
}

// ── Common Error Factory Methods ──────────────────────────────────────────────
// Pre-built errors for the most common TechTrust error scenarios
// Use these for consistency across all controllers and services

/**
 * @description 400 Bad Request — invalid input or missing required data
 * @param       {string} message - Specific error description
 * @param       {Array}  errors  - Optional validation error details
 * @returns     {AppError}
 */
AppError.badRequest = (message = 'Invalid request', errors = []) =>
  new AppError(message, 400, errors);

/**
 * @description 401 Unauthorized — not authenticated
 * @param       {string} message - Specific error description
 * @returns     {AppError}
 */
AppError.unauthorized = (message = 'You must be logged in to access this resource') =>
  new AppError(message, 401);

/**
 * @description 403 Forbidden — authenticated but not authorized
 * @param       {string} message - Specific error description
 * @returns     {AppError}
 */
AppError.forbidden = (message = 'You do not have permission to perform this action') =>
  new AppError(message, 403);

/**
 * @description 404 Not Found — resource does not exist
 * @param       {string} message - Specific error description
 * @returns     {AppError}
 */
AppError.notFound = (message = 'The requested resource was not found') =>
  new AppError(message, 404);

/**
 * @description 409 Conflict — resource already exists
 * @param       {string} message - Specific error description
 * @returns     {AppError}
 */
AppError.conflict = (message = 'A record with this information already exists') =>
  new AppError(message, 409);

/**
 * @description 429 Too Many Requests — rate limit or cooldown active
 * @param       {string} message - Specific error description
 * @returns     {AppError}
 */
AppError.tooManyRequests = (message = 'Too many requests — please try again later') =>
  new AppError(message, 429);

/**
 * @description 500 Internal Server Error — unexpected server failure
 * @param       {string} message - Specific error description
 * @returns     {AppError}
 */
AppError.internal = (message = 'An unexpected error occurred. Please try again.') =>
  new AppError(message, 500);

module.exports = AppError;