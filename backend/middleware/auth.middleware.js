/**
 * @file        auth.middleware.js
 * @description TechTrust authentication and authorization middleware.
 *              Verifies JWT tokens from HttpOnly cookies on every
 *              protected route. Also provides role-based access control.
 *              Constitution Standard 3  — zero open routes, JWT in HttpOnly cookies.
 *              Constitution Standard 4  — brute force and token abuse protection.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// ── Token Extraction ──────────────────────────────────────────────────────────
/**
 * @description Extracts JWT access token from HttpOnly cookie.
 *              Constitution Standard 3 — tokens in HttpOnly cookies only.
 *              Never reads tokens from Authorization header or localStorage.
 * @param       {Object} req - Express request object
 * @returns     {string|null} JWT token string or null if not found
 */
const extractToken = (req) => {
  // Primary source — HttpOnly cookie (production standard)
  if (req.cookies && req.cookies.accessToken) {
    return req.cookies.accessToken;
  }

  // Development fallback — Authorization header (Postman testing only)
  // This fallback is disabled in production
  if (
    process.env.NODE_ENV === 'development' &&
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer ')
  ) {
    return req.headers.authorization.split(' ')[1];
  }

  return null;
};

// ── Authentication Middleware ─────────────────────────────────────────────────
/**
 * @description Verifies the JWT access token on every protected route.
 *              Attaches the decoded user payload to req.user for use
 *              in controllers and services downstream.
 *              Returns 401 if token is missing, invalid, or expired.
 * @param       {Object}   req  - Express request object
 * @param       {Object}   res  - Express response object
 * @param       {Function} next - Express next middleware function
 * @returns     {void}
 */
const authenticate = asyncHandler(async (req, res, next) => {
  // Extract token from HttpOnly cookie
  const token = extractToken(req);

  // No token found — user is not authenticated
  if (!token) {
    throw AppError.unauthorized(
      'You must be logged in to access this resource.'
    );
  }

  // Verify token signature and expiry
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
  } catch (error) {
    // Log suspicious token activity
    logger.warn('Invalid JWT token attempt', {
      ip: req.ip,
      path: req.path,
      error: error.name,
    });

    if (error.name === 'TokenExpiredError') {
      throw AppError.unauthorized(
        'Your session has expired. Please log in again.'
      );
    }

    throw AppError.unauthorized(
      'Invalid authentication token. Please log in again.'
    );
  }

  // Attach decoded user to request for downstream use
  // Controllers access user via req.user.id and req.user.role
  req.user = {
    id: decoded.id,
    role: decoded.role,
    email: decoded.email,
    githubUsername: decoded.githubUsername,
  };

  next();
});

// ── Role Authorization Middleware ─────────────────────────────────────────────
/**
 * @description Restricts route access to specific user roles.
 *              Must be used AFTER authenticate middleware.
 *              Returns 403 if user does not have the required role.
 * @param       {...string} roles - Allowed roles for this route
 * @returns     {Function} Express middleware function
 *
 * @example
 * // Only admins can access:
 * router.get('/users', authenticate, requireRole('admin'), controller);
 *
 * // Developers and admins can access:
 * router.get('/profile', authenticate, requireRole('developer', 'admin'), controller);
 *
 * // Employers and admins can access:
 * router.get('/search', authenticate, requireRole('employer', 'admin'), controller);
 */
const requireRole = (...roles) => {
  return (req, res, next) => {
    // authenticate must run before requireRole
    if (!req.user) {
      throw AppError.unauthorized(
        'You must be logged in to access this resource.'
      );
    }

    // Check if user's role is in the allowed roles list
    if (!roles.includes(req.user.role)) {
      // Log unauthorized access attempts
      logger.warn('Unauthorized role access attempt', {
        userId: req.user.id,
        userRole: req.user.role,
        requiredRoles: roles,
        path: req.path,
        ip: req.ip,
      });

      throw AppError.forbidden(
        'You do not have permission to access this resource.'
      );
    }

    next();
  };
};

// ── Optional Authentication ───────────────────────────────────────────────────
/**
 * @description Attempts to authenticate the user but does not block
 *              the request if no token is present.
 *              Used for public routes that show different content
 *              to authenticated vs unauthenticated users.
 * @param       {Object}   req  - Express request object
 * @param       {Object}   res  - Express response object
 * @param       {Function} next - Express next middleware function
 * @returns     {void}
 *
 * @example
 * // Public profile — shows more data if viewer is authenticated employer
 * router.get('/:username', optionalAuth, developerController.getPublicProfile);
 */
const optionalAuth = (req, res, next) => {
  const token = extractToken(req);

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);
    req.user = {
      id: decoded.id,
      role: decoded.role,
      email: decoded.email,
      githubUsername: decoded.githubUsername,
    };
  } catch {
    // Invalid token on optional auth — treat as unauthenticated
    req.user = null;
  }

  next();
};

// ── Admin Only Shorthand ──────────────────────────────────────────────────────
/**
 * @description Shorthand middleware combining authenticate + requireRole('admin').
 *              Use on all admin panel routes.
 * @param       {Object}   req  - Express request object
 * @param       {Object}   res  - Express response object
 * @param       {Function} next - Express next middleware function
 */
const requireAdmin = [authenticate, requireRole('admin')];

/**
 * @description Shorthand middleware combining authenticate + requireRole('developer').
 *              Use on all developer-only routes.
 */
const requireDeveloper = [authenticate, requireRole('developer', 'admin')];

/**
 * @description Shorthand middleware combining authenticate + requireRole('employer').
 *              Use on all employer-only routes.
 */
const requireEmployer = [authenticate, requireRole('employer', 'admin')];

module.exports = {
  authenticate,
  requireRole,
  optionalAuth,
  requireAdmin,
  requireDeveloper,
  requireEmployer,
};