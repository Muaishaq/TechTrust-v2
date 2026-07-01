/**
 * @file        notFound.middleware.js
 * @description TechTrust 404 Not Found middleware.
 *              Catches all requests to undefined routes and returns
 *              a clean, consistent 404 response.
 *              Must be registered AFTER all routes in app.js and
 *              BEFORE the global error handler.
 *              Constitution Standard 3  — no internal structure exposed.
 *              Constitution Standard 6  — clear error messages for users.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

/**
 * @description Handles all requests to routes that do not exist.
 *              Logs the attempt and passes a 404 AppError to the
 *              global error handler for consistent response formatting.
 * @param       {Object}   req  - Express request object
 * @param       {Object}   res  - Express response object
 * @param       {Function} next - Express next middleware function
 * @returns     {void}
 *
 * @example
 * // In app.js — registered after all routes, before errorHandler:
 * app.use(notFound);
 * app.use(errorHandler);
 */
const notFound = (req, res, next) => {
  // Log all 404s — helps detect probing attacks or broken client links
  // Constitution Standard 4 — suspicious activity monitoring
  logger.warn('404 — Route not found', {
    method: req.method,
    path: req.originalUrl,
    ip: req.ip,
    userAgent: req.get('User-Agent'),
  });

  // Pass 404 error to global error handler
  next(
    AppError.notFound(
      `The route ${req.method} ${req.originalUrl} does not exist on this server.`
    )
  );
};

module.exports = notFound;