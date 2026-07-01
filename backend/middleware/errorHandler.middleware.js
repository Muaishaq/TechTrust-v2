/**
 * @file        errorHandler.middleware.js
 * @description TechTrust global error handling middleware.
 *              Catches all errors passed via next(error) throughout the app.
 *              Classifies errors and returns clean, sanitized responses.
 *              Internal error details are NEVER exposed to the client.
 *              Constitution Standard 3  — sanitized error responses.
 *              Constitution Standard 4  — all errors logged server-side.
 *              Constitution Standard 8  — fault tolerant error handling.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// ── Error Classification ───────────────────────────────────────────────────────
/**
 * @description Converts known third-party errors into AppError instances.
 *              Handles Mongoose, JWT, and other library-specific errors.
 * @param       {Error} error - The original error object
 * @returns     {AppError} Classified AppError instance
 */
const classifyError = (error) => {
  // ── Mongoose Errors ────────────────────────────────────────────────────
  // Invalid MongoDB ObjectId format
  if (error.name === 'CastError') {
    return AppError.badRequest('Invalid ID format provided.');
  }

  // Duplicate key violation (unique field already exists)
  if (error.code === 11000) {
    const field = Object.keys(error.keyValue || {})[0] || 'field';
    return AppError.conflict(
      `This ${field} is already registered. Please use a different value.`
    );
  }

  // Mongoose schema validation failure
  if (error.name === 'ValidationError') {
    const messages = Object.values(error.errors).map((e) => e.message);
    return new AppError(messages.join('. '), 400);
  }

  // ── JWT Errors ─────────────────────────────────────────────────────────
  if (error.name === 'JsonWebTokenError') {
    return AppError.unauthorized(
      'Invalid authentication token. Please log in again.'
    );
  }

  if (error.name === 'TokenExpiredError') {
    return AppError.unauthorized(
      'Your session has expired. Please log in again.'
    );
  }

  if (error.name === 'NotBeforeError') {
    return AppError.unauthorized(
      'Authentication token is not yet valid. Please try again.'
    );
  }

  // ── CORS Errors ────────────────────────────────────────────────────────
  if (error.message === 'Not allowed by CORS policy') {
    return AppError.forbidden('Access denied — origin not allowed.');
  }

  // ── Payload Errors ─────────────────────────────────────────────────────
  if (error.type === 'entity.too.large') {
    return AppError.badRequest(
      'Request payload is too large. Maximum size is 10kb.'
    );
  }

  // Unknown error — return as-is for server error handling
  return error;
};

// ── Development Error Response ────────────────────────────────────────────────
/**
 * @description Sends detailed error information in development mode.
 *              Includes stack trace and full error details for debugging.
 *              NEVER used in production.
 * @param       {Error}  error - The error object
 * @param       {Object} res   - Express response object
 */
const sendDevError = (error, res) => {
  res.status(error.statusCode || 500).json({
    success: false,
    message: error.message,
    error: {
      statusCode: error.statusCode,
      status: error.status,
      isOperational: error.isOperational,
      stack: error.stack,
    },
  });
};

// ── Production Error Response ─────────────────────────────────────────────────
/**
 * @description Sends sanitized error response in production.
 *              Operational errors show their message.
 *              Programming errors show a generic message only.
 *              Constitution Standard 3 — internal errors never exposed.
 * @param       {Error}  error - The error object
 * @param       {Object} res   - Express response object
 */
const sendProdError = (error, res) => {
  // Operational errors — safe to send message to client
  if (error.isOperational) {
    return res.status(error.statusCode).json({
      success: false,
      message: error.message,
      ...(error.errors && error.errors.length > 0 && { errors: error.errors }),
    });
  }

  // Programming or unknown errors — never expose details
  // Client gets generic message, full details logged server-side only
  return res.status(500).json({
    success: false,
    message: 'An unexpected error occurred. Please try again.',
  });
};

// ── Global Error Handler ──────────────────────────────────────────────────────
/**
 * @description Express global error handling middleware.
 *              Must be registered LAST in app.js after all routes.
 *              Receives all errors passed via next(error).
 * @param       {Error}    error - The error object
 * @param       {Object}   req   - Express request object
 * @param       {Object}   res   - Express response object
 * @param       {Function} next  - Express next middleware function
 * @returns     {void}
 */
const errorHandler = (error, req, res, next) => {
  // Set defaults if not already set
  error.statusCode = error.statusCode || 500;
  error.status = error.status || 'error';

  // ── Server-Side Logging ────────────────────────────────────────────────
  // Log ALL errors server-side with full context
  // Constitution Standard 4 — all errors logged
  const logData = {
    statusCode: error.statusCode,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
    userId: req.user ? req.user.id : 'unauthenticated',
    userRole: req.user ? req.user.role : null,
  };

  if (error.statusCode >= 500) {
    // Server errors — log as error with stack trace
    logger.error(`${error.statusCode} — ${error.message}`, {
      ...logData,
      stack: error.stack,
    });
  } else if (error.statusCode >= 400) {
    // Client errors — log as warning
    logger.warn(`${error.statusCode} — ${error.message}`, logData);
  }

  // ── Classify Unknown Errors ────────────────────────────────────────────
  const classifiedError = classifyError(error);

  // ── Send Response Based on Environment ────────────────────────────────
  if (process.env.NODE_ENV === 'development') {
    return sendDevError(classifiedError, res);
  }

  return sendProdError(classifiedError, res);
};

module.exports = errorHandler;