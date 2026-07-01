/**
 * @file        rateLimiter.middleware.js
 * @description TechTrust rate limiting configurations.
 *              Different endpoints have different limits based on
 *              their sensitivity and expected usage patterns.
 *              Constitution Standard 3 — rate limiting on every endpoint.
 *              Constitution Standard 4 — brute force protection.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const rateLimit = require('express-rate-limit');
const logger = require('../utils/logger');

// ── Rate Limit Response Format ─────────────────────────────────────────────────
// Consistent with TechTrust standard error response format
const buildLimitMessage = (message) => ({
  success: false,
  message,
});

// ── Rate Limit Handler ────────────────────────────────────────────────────────
/**
 * @description Logs rate limit violations and returns standard error response
 * @param       {Object} req     - Express request object
 * @param       {Object} res     - Express response object
 * @param       {Function} next  - Express next function
 * @param       {Object} options - Rate limiter options
 */
const rateLimitHandler = (req, res, next, options) => {
  // Constitution Standard 4 — log all rate limit violations
  logger.warn('Rate limit exceeded', {
    ip: req.ip,
    path: req.path,
    method: req.method,
    limit: options.max,
  });
  res.status(429).json(options.message);
};

// ── Global Rate Limiter ───────────────────────────────────────────────────────
// Applied to ALL routes in app.js
// 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildLimitMessage(
    'Too many requests from this IP. Please try again in 15 minutes.'
  ),
  handler: rateLimitHandler,
});

// ── Auth Rate Limiter ─────────────────────────────────────────────────────────
// Applied to all authentication routes
// Strict limit — 10 attempts per 15 minutes per IP
// Constitution Standard 4 — brute force protection
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildLimitMessage(
    'Too many login attempts. Please try again in 15 minutes.'
  ),
  handler: rateLimitHandler,
});

// ── Verification Rate Limiter ─────────────────────────────────────────────────
// Applied to the verification trigger endpoint
// Very strict — developers can only attempt 3 verifications per hour
// Prevents abuse of the GitHub API and AI engine
const verificationLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildLimitMessage(
    'Too many verification attempts. Please try again in 1 hour.'
  ),
  handler: rateLimitHandler,
});

// ── Password Reset Rate Limiter ───────────────────────────────────────────────
// Applied to any sensitive account action endpoints
// 5 attempts per hour per IP
const sensitiveActionLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildLimitMessage(
    'Too many attempts. Please try again in 1 hour.'
  ),
  handler: rateLimitHandler,
});

// ── Search Rate Limiter ───────────────────────────────────────────────────────
// Applied to employer developer search endpoint
// Prevents bulk scraping of developer profiles
// Constitution Standard 4 — bulk scraping detection
const searchLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildLimitMessage(
    'Too many search requests. Please slow down and try again.'
  ),
  handler: rateLimitHandler,
});

// ── API Rate Limiter ──────────────────────────────────────────────────────────
// Applied to B2B API access endpoints
// Higher limit for legitimate business integrations
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: buildLimitMessage(
    'API rate limit exceeded. Please reduce your request frequency.'
  ),
  handler: rateLimitHandler,
});

module.exports = {
  globalLimiter,
  authLimiter,
  verificationLimiter,
  sensitiveActionLimiter,
  searchLimiter,
  apiLimiter,
};