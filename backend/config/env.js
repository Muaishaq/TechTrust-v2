/**
 * @file        env.js
 * @description TechTrust environment variable validator.
 *              Runs on server startup and crashes immediately if any required
 *              environment variable is missing or invalid.
 *              This prevents the server from starting in a broken/insecure state.
 *              Constitution Standard 3  — secrets in env vars, never in code.
 *              Constitution Standard 5  — deployment checklist enforced at runtime.
 * @author      Muaishaq
 * @created     2026-06-30
 * @modified    2026-06-30
 */

'use strict';

const logger = require('../utils/logger');

// ── Required Environment Variables ────────────────────────────────────────────
// Every variable listed here MUST be present for the server to start.
// Add new variables here as new features are built.
const REQUIRED_VARS = [
  // Server
  'NODE_ENV',
  'PORT',
  'COOKIE_SECRET',

  // Database
  'MONGODB_URI',

  // JWT Authentication
  'JWT_ACCESS_SECRET',
  'JWT_REFRESH_SECRET',
  'JWT_ACCESS_EXPIRY',
  'JWT_REFRESH_EXPIRY',

  // GitHub OAuth
  'GITHUB_CLIENT_ID',
  'GITHUB_CLIENT_SECRET',
  'GITHUB_CALLBACK_URL',

  // AI Engine
  'AI_ENGINE_URL',
  'AI_ENGINE_API_KEY',

  // Frontend
  'FRONTEND_URL',
  'ALLOWED_ORIGINS',
];

// ── Validation Rules ──────────────────────────────────────────────────────────
// Additional validation beyond just presence checks.
// Ensures values are not only present but also valid.
const VALIDATION_RULES = {
  /**
   * @description NODE_ENV must be one of three valid values
   * @param       {string} value - The env var value
   * @returns     {boolean} Whether the value is valid
   */
  NODE_ENV: (value) => ['development', 'staging', 'production'].includes(value),

  /**
   * @description PORT must be a valid port number
   * @param       {string} value - The env var value
   * @returns     {boolean} Whether the value is valid
   */
  PORT: (value) => {
    const port = parseInt(value, 10);
    return !isNaN(port) && port > 0 && port <= 65535;
  },

  /**
   * @description JWT secrets must be at least 32 characters for security
   * @param       {string} value - The env var value
   * @returns     {boolean} Whether the value is valid
   */
  JWT_ACCESS_SECRET: (value) => value.length >= 32,
  JWT_REFRESH_SECRET: (value) => value.length >= 32,

  /**
   * @description Cookie secret must be at least 32 characters
   * @param       {string} value - The env var value
   * @returns     {boolean} Whether the value is valid
   */
  COOKIE_SECRET: (value) => value.length >= 32,

  /**
   * @description MongoDB URI must start with mongodb
   * @param       {string} value - The env var value
   * @returns     {boolean} Whether the value is valid
   */
  MONGODB_URI: (value) => value.startsWith('mongodb'),

  /**
   * @description Frontend URL must be a valid URL
   * @param       {string} value - The env var value
   * @returns     {boolean} Whether the value is valid
   */
  FRONTEND_URL: (value) => value.startsWith('http'),

  /**
   * @description AI Engine URL must be a valid URL
   * @param       {string} value - The env var value
   * @returns     {boolean} Whether the value is valid
   */
  AI_ENGINE_URL: (value) => value.startsWith('http'),

  /**
   * @description AI Engine API key must be at least 16 characters
   * @param       {string} value - The env var value
   * @returns     {boolean} Whether the value is valid
   */
  AI_ENGINE_API_KEY: (value) => value.length >= 16,
};

/**
 * @description Validates all required environment variables on startup.
 *              Crashes the server immediately if any variable is missing
 *              or fails validation — prevents running in a broken state.
 * @returns     {void}
 * @throws      {Error} If any required variable is missing or invalid
 */
const validateEnv = () => {
  const missing = [];
  const invalid = [];

  // ── Check for Missing Variables ─────────────────────────────────────────
  REQUIRED_VARS.forEach((varName) => {
    if (!process.env[varName]) {
      missing.push(varName);
    }
  });

  // ── Check for Invalid Values ────────────────────────────────────────────
  Object.entries(VALIDATION_RULES).forEach(([varName, validator]) => {
    const value = process.env[varName];
    // Only validate if present — missing vars already caught above
    if (value && !validator(value)) {
      invalid.push(varName);
    }
  });

  // ── Report Errors ───────────────────────────────────────────────────────
  if (missing.length > 0) {
    logger.error('Missing required environment variables:', { missing });
  }

  if (invalid.length > 0) {
    logger.error('Invalid environment variable values:', { invalid });
  }

  // ── Crash Server if Any Issues Found ───────────────────────────────────
  // Constitution Standard 5 — never start in broken/insecure state
  if (missing.length > 0 || invalid.length > 0) {
    logger.error('Server startup aborted — fix environment variables and restart');
    process.exit(1);
  }

  logger.info('All environment variables validated successfully');
};

/**
 * @description Returns a safe summary of current environment config.
 *              Never includes actual secret values — only confirms presence.
 * @returns     {Object} Safe environment summary
 */
const getEnvSummary = () => ({
  nodeEnv: process.env.NODE_ENV,
  port: process.env.PORT,
  mongoConnected: !!process.env.MONGODB_URI,
  githubOAuthConfigured: !!(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET),
  jwtConfigured: !!(process.env.JWT_ACCESS_SECRET && process.env.JWT_REFRESH_SECRET),
  aiEngineConfigured: !!(process.env.AI_ENGINE_URL && process.env.AI_ENGINE_API_KEY),
  paymentsConfigured: !!(process.env.FLUTTERWAVE_SECRET_KEY || process.env.STRIPE_SECRET_KEY),
});

module.exports = { validateEnv, getEnvSummary };