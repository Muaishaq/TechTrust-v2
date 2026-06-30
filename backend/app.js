/**
 * @file        app.js
 * @description TechTrust Express application setup.
 *              Configures all middleware in the correct security order:
 *              helmet → cors → rateLimiter → morgan → cookieParser → routes
 *              All security standards from CONSTITUTION.md Standard 3 applied here.
 * @author      Muaishaq
 * @created     2026-06-30
 * @modified    2026-06-30
 */

'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
require('dotenv').config();

const logger = require('./utils/logger');

const app = express();

// ── Security Middleware — Helmet ───────────────────────────────────────────────
// Sets secure HTTP headers on every response automatically
// Constitution Standard 3 — helmet on all responses
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'"],
      imgSrc: ["'self'", 'data:', 'https:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: true,
  crossOriginOpenerPolicy: true,
  crossOriginResourcePolicy: { policy: 'same-site' },
  dnsPrefetchControl: { allow: false },
  frameguard: { action: 'deny' },
  hidePoweredBy: true,
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  ieNoOpen: true,
  noSniff: true,
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  xssFilter: true,
}));

// ── CORS Configuration ────────────────────────────────────────────────────────
// Only whitelisted domains can make requests to this API
// Constitution Standard 3 — CORS whitelist only, no wildcard in production
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || process.env.FRONTEND_URL || 'http://localhost:5173')
  .split(',')
  .map(origin => origin.trim());

app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, Postman in dev)
    if (!origin && process.env.NODE_ENV === 'development') {
      return callback(null, true);
    }
    if (ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    logger.warn(`CORS blocked request from origin: ${origin}`);
    return callback(new Error('Not allowed by CORS policy'));
  },
  credentials: true,          // Allow HttpOnly cookies
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  exposedHeaders: ['X-Total-Count'],
  maxAge: 86400,              // Cache preflight for 24 hours
}));

// ── Global Rate Limiter ───────────────────────────────────────────────────────
// Applies to ALL routes — individual routes add stricter limits on top
// Constitution Standard 3 — rate limiting on every endpoint
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 100,                   // 100 requests per window per IP
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again in 15 minutes.',
  },
  handler: (req, res, next, options) => {
    logger.warn(`Rate limit exceeded — IP: ${req.ip} — Path: ${req.path}`);
    res.status(429).json(options.message);
  },
});

app.use(globalLimiter);

// ── Request Logging ───────────────────────────────────────────────────────────
// Logs all incoming requests in development
// Uses winston stream in production for structured logging
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(morgan('combined', {
    stream: {
      write: (message) => logger.info(message.trim()),
    },
  }));
}

// ── Body Parsers ──────────────────────────────────────────────────────────────
// Limits request body size to prevent payload attacks
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// ── Cookie Parser ─────────────────────────────────────────────────────────────
// Required for reading HttpOnly cookies containing JWT tokens
app.use(cookieParser(process.env.COOKIE_SECRET));

// ── Health Check ──────────────────────────────────────────────────────────────
// Public endpoint — no auth required
// Used by uptime monitoring to verify platform is running
// Constitution Standard 8 — health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'TechTrust API is running',
    environment: process.env.NODE_ENV,
    timestamp: new Date().toISOString(),
  });
});

// ── API Routes ────────────────────────────────────────────────────────────────
// All routes versioned under /api/v1/
// Routes are added here as each phase is built
// app.use('/api/v1/auth', require('./routes/v1/auth.routes'));
// app.use('/api/v1/developers', require('./routes/v1/developer.routes'));
// app.use('/api/v1/employers', require('./routes/v1/employer.routes'));
// app.use('/api/v1/admin', require('./routes/v1/admin.routes'));
// app.use('/api/v1/payments', require('./routes/v1/payment.routes'));
// app.use('/api/v1/account', require('./routes/v1/account.routes'));
// app.use('/api/v1/public', require('./routes/v1/public.routes'));

// ── 404 Handler ───────────────────────────────────────────────────────────────
// Catches any request to an undefined route
// Returns clean error — never exposes internal structure
app.use((req, res) => {
  logger.warn(`404 — Route not found: ${req.method} ${req.originalUrl}`);
  res.status(404).json({
    success: false,
    message: 'The requested resource was not found.',
  });
});

// ── Global Error Handler ──────────────────────────────────────────────────────
// Catches all errors passed via next(error)
// Constitution Standard 3 — internal errors never exposed to client
app.use((err, req, res, next) => {
  // Log full error details server-side only
  logger.error('Unhandled error:', {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
    ip: req.ip,
  });

  // CORS errors
  if (err.message === 'Not allowed by CORS policy') {
    return res.status(403).json({
      success: false,
      message: 'Access denied — origin not allowed.',
    });
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({
      success: false,
      message: 'Invalid authentication token.',
    });
  }

  if (err.name === 'TokenExpiredError') {
    return res.status(401).json({
      success: false,
      message: 'Authentication token has expired.',
    });
  }

  // Mongoose validation errors
  if (err.name === 'ValidationError') {
    return res.status(400).json({
      success: false,
      message: 'Validation failed.',
      errors: Object.values(err.errors).map(e => e.message),
    });
  }

  // Mongoose duplicate key errors
  if (err.code === 11000) {
    return res.status(409).json({
      success: false,
      message: 'A record with this information already exists.',
    });
  }

  // Generic server error — never expose details to client
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500
      ? 'An unexpected error occurred. Please try again.'
      : err.message,
  });
});

module.exports = app;