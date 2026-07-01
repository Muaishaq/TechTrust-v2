/**
 * @file        validate.middleware.js
 * @description TechTrust input validation middleware.
 *              Processes express-validator results after validation chains run.
 *              Every endpoint with a validation chain must use this middleware.
 *              Returns clean, consistent validation error responses.
 *              Constitution Standard 3  — input validation on every endpoint.
 *              Constitution Standard 6  — error messages tell users what to fix.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const { validationResult } = require('express-validator');
const logger = require('../utils/logger');

/**
 * @description Processes express-validator results and returns errors if any.
 *              Must be placed AFTER validation chain middleware and BEFORE
 *              the controller function in any route definition.
 *              If validation passes — calls next() to proceed to controller.
 *              If validation fails — returns 400 with specific field errors.
 * @param       {Object}   req  - Express request object
 * @param       {Object}   res  - Express response object
 * @param       {Function} next - Express next middleware function
 * @returns     {void}
 *
 * @example
 * // Route usage:
 * router.post(
 *   '/profile',
 *   authenticate,
 *   developerValidators.updateProfile,  // validation chain
 *   validate,                           // this middleware
 *   developerController.updateProfile   // controller
 * );
 */
const validate = (req, res, next) => {
  const errors = validationResult(req);

  // No validation errors — proceed to controller
  if (errors.isEmpty()) {
    return next();
  }

  // Format validation errors for clean client response
  // Each error shows which field failed and why
  const formattedErrors = errors.array().map((error) => ({
    field: error.path || error.param,
    message: error.msg,
    value: error.value !== undefined
      ? sanitizeErrorValue(error.value)
      : undefined,
  }));

  // Log validation failures for monitoring
  // Helps detect malformed requests or potential attacks
  logger.warn('Validation failed', {
    path: req.path,
    method: req.method,
    ip: req.ip,
    errorCount: formattedErrors.length,
    fields: formattedErrors.map((e) => e.field),
  });

  // Return 400 with specific field errors
  // Constitution Standard 6 — tell users exactly what to fix
  return res.status(400).json({
    success: false,
    message: 'Validation failed. Please check the fields below and try again.',
    errors: formattedErrors,
  });
};

/**
 * @description Sanitizes error values before including in response.
 *              Prevents sensitive data from appearing in error messages.
 *              Constitution Standard 3 — sanitized error responses.
 * @param       {*}      value - The invalid value from the request
 * @returns     {string} Sanitized value safe for client response
 */
const sanitizeErrorValue = (value) => {
  // Never return password or token values in error responses
  if (typeof value === 'string' && value.length > 50) {
    return '[value too long]';
  }
  if (typeof value === 'object') {
    return '[object]';
  }
  return value;
};

module.exports = validate;