/**
 * @file        logger.js
 * @description TechTrust structured logging utility using Winston.
 *              Provides consistent logging across the entire backend.
 *              - Development: colourised console output
 *              - Production: JSON file logs (error.log + combined.log)
 *              Constitution Standard 3 — internal errors logged server-side only.
 *              Constitution Standard 4 — all significant events logged.
 * @author      Muaishaq
 * @created     2026-06-30
 * @modified    2026-06-30
 */

'use strict';

const { createLogger, format, transports } = require('winston');
const path = require('path');

// ── Log Format — Development ──────────────────────────────────────────────────
// Colourised, readable output for local development
const developmentFormat = format.combine(
  format.colorize(),
  format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  format.printf(({ timestamp, level, message, ...metadata }) => {
    let log = `${timestamp} [${level}]: ${message}`;
    if (Object.keys(metadata).length > 0) {
      log += ` ${JSON.stringify(metadata)}`;
    }
    return log;
  })
);

// ── Log Format — Production ───────────────────────────────────────────────────
// Structured JSON for log aggregation and monitoring systems
// NEVER logs sensitive data — Constitution Standard 3
const productionFormat = format.combine(
  format.timestamp(),
  format.errors({ stack: false }), // Never log stack traces in production
  format.json()
);

// ── Transports ────────────────────────────────────────────────────────────────
// Development: console only
// Production: console + rotating file logs
const buildTransports = () => {
  const transportList = [];

  if (process.env.NODE_ENV === 'production') {
    // Error log — errors only
    transportList.push(new transports.File({
      filename: path.join(__dirname, '../logs/error.log'),
      level: 'error',
      maxsize: 5242880,   // 5MB max per file
      maxFiles: 5,        // Keep last 5 rotated files
    }));

    // Combined log — all levels
    transportList.push(new transports.File({
      filename: path.join(__dirname, '../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    }));

    // Console in production too — for Railway log streaming
    transportList.push(new transports.Console({
      format: productionFormat,
    }));
  } else {
    // Development — console only with colours
    transportList.push(new transports.Console({
      format: developmentFormat,
    }));
  }

  return transportList;
};

// ── Logger Instance ───────────────────────────────────────────────────────────
const logger = createLogger({
  level: process.env.LOG_LEVEL || (process.env.NODE_ENV === 'production' ? 'warn' : 'debug'),
  format: process.env.NODE_ENV === 'production' ? productionFormat : developmentFormat,
  transports: buildTransports(),
  // Never crash the server on a logging failure
  exitOnError: false,
});

// ── Security Rule ─────────────────────────────────────────────────────────────
// These fields must NEVER appear in any log entry
// If detected, they are redacted automatically
const SENSITIVE_FIELDS = ['password', 'token', 'secret', 'authorization', 'cookie'];

/**
 * @description Removes sensitive fields from objects before logging
 * @param       {Object} data - The data object to sanitize
 * @returns     {Object} Sanitized object safe for logging
 */
const sanitizeLogData = (data) => {
  if (!data || typeof data !== 'object') return data;
  const sanitized = { ...data };
  SENSITIVE_FIELDS.forEach(field => {
    if (sanitized[field]) sanitized[field] = '[REDACTED]';
  });
  return sanitized;
};

// ── Wrapped Logger ────────────────────────────────────────────────────────────
// Sanitizes all log data before passing to Winston
// Ensures sensitive fields never reach log files
const secureLogger = {
  /**
   * @description Logs debug level messages (development only)
   * @param       {string} message - Log message
   * @param       {Object} meta - Additional metadata
   */
  debug: (message, meta = {}) => logger.debug(message, sanitizeLogData(meta)),

  /**
   * @description Logs informational messages
   * @param       {string} message - Log message
   * @param       {Object} meta - Additional metadata
   */
  info: (message, meta = {}) => logger.info(message, sanitizeLogData(meta)),

  /**
   * @description Logs warning messages
   * @param       {string} message - Log message
   * @param       {Object} meta - Additional metadata
   */
  warn: (message, meta = {}) => logger.warn(message, sanitizeLogData(meta)),

  /**
   * @description Logs error messages — never includes stack traces in production
   * @param       {string} message - Log message
   * @param       {Object} meta - Additional metadata
   */
  error: (message, meta = {}) => logger.error(message, sanitizeLogData(meta)),
};

module.exports = secureLogger;