/**
 * @file        User.model.js
 * @description TechTrust User model.
 *              Represents all platform users — developers, employers, and admins.
 *              This is the base identity record for every account on TechTrust.
 *              Role determines which additional profile document exists:
 *              - developer → DeveloperProfile document
 *              - employer  → EmployerProfile document
 *              - admin     → no additional profile needed
 *              Constitution Standard 3  — no sensitive data exposed in responses.
 *              Constitution Standard 9  — indexes on all queried fields.
 *              Constitution Standard 10 — designed for millions of records.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const mongoose = require('mongoose');

// ── User Schema ───────────────────────────────────────────────────────────────
const userSchema = new mongoose.Schema(
  {
    // ── GitHub Identity ──────────────────────────────────────────────────
    // All users authenticate via GitHub OAuth — no passwords stored
    githubId: {
      type: String,
      required: [true, 'GitHub ID is required'],
      unique: true,
      index: true,
    },

    githubUsername: {
      type: String,
      required: [true, 'GitHub username is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
    },

    // ── Personal Information ─────────────────────────────────────────────
    email: {
      type: String,
      required: [true, 'Email address is required'],
      unique: true,
      trim: true,
      lowercase: true,
      index: true,
      match: [
        /^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/,
        'Please provide a valid email address',
      ],
    },

    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters'],
    },

    avatarUrl: {
      type: String,
      default: null,
    },

    // ── Platform Role ────────────────────────────────────────────────────
    // Determines access level and which dashboard is shown
    role: {
      type: String,
      enum: {
        values: ['developer', 'employer', 'admin'],
        message: 'Role must be developer, employer, or admin',
      },
      default: null, // null until user selects role after first login
    },

    // ── Account Status ───────────────────────────────────────────────────
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },

    isSuspended: {
      type: Boolean,
      default: false,
      index: true,
    },

    suspendedAt: {
      type: Date,
      default: null,
    },

    suspendedReason: {
      type: String,
      default: null,
    },

    // ── Consent & Privacy (NDPR / GDPR) ─────────────────────────────────
    // Consent must be recorded before any data collection
    // Architecture.md Section 6 — compliance requirement
    hasAcceptedTerms: {
      type: Boolean,
      default: false,
    },

    termsAcceptedAt: {
      type: Date,
      default: null,
    },

    hasAcceptedPrivacyPolicy: {
      type: Boolean,
      default: false,
    },

    privacyPolicyAcceptedAt: {
      type: Date,
      default: null,
    },

    privacyPolicyVersion: {
      type: String,
      default: null,
    },

    // Activity tracking consent — separate from terms
    hasConsentedToTracking: {
      type: Boolean,
      default: false,
    },

    trackingConsentAt: {
      type: Date,
      default: null,
    },

    // ── Authentication Tokens ────────────────────────────────────────────
    // Refresh token stored hashed — never plain text
    refreshToken: {
      type: String,
      default: null,
      select: false, // Never returned in queries unless explicitly requested
    },

    refreshTokenExpiresAt: {
      type: Date,
      default: null,
      select: false,
    },

    // ── Security Tracking ────────────────────────────────────────────────
    // Brute force protection — Constitution Standard 4
    failedLoginAttempts: {
      type: Number,
      default: 0,
      select: false,
    },

    lockedUntil: {
      type: Date,
      default: null,
      select: false,
    },

    // ── Activity Timestamps ───────────────────────────────────────────────
    lastLoginAt: {
      type: Date,
      default: null,
    },

    lastLoginIp: {
      type: String,
      default: null,
      select: false, // Privacy — not exposed in normal queries
    },

    lastLoginCountry: {
      type: String,
      default: null,
    },

    lastLoginCity: {
      type: String,
      default: null,
    },

    // ── Data Retention (NDPR / GDPR) ─────────────────────────────────────
    // Auto-delete inactive accounts after 2 years — Architecture.md Section 6
    scheduledForDeletionAt: {
      type: Date,
      default: null,
    },
  },
  {
    // ── Schema Options ───────────────────────────────────────────────────
    timestamps: true, // Adds createdAt and updatedAt automatically
    toJSON: { virtuals: true, transform: transformOutput },
    toObject: { virtuals: true },
  }
);

// ── Output Transformation ─────────────────────────────────────────────────────
/**
 * @description Removes sensitive fields before sending user data to client.
 *              Constitution Standard 3 — sensitive data never exposed.
 * @param       {Object} doc - Mongoose document
 * @param       {Object} ret - Plain object representation
 * @returns     {Object} Sanitized user object
 */
function transformOutput(doc, ret) {
  delete ret.__v;
  delete ret.refreshToken;
  delete ret.refreshTokenExpiresAt;
  delete ret.failedLoginAttempts;
  delete ret.lockedUntil;
  delete ret.lastLoginIp;
  return ret;
}

// ── Virtual Fields ────────────────────────────────────────────────────────────
/**
 * @description Returns whether this account is currently locked
 *              due to too many failed login attempts.
 * @returns     {boolean} True if account is locked
 */
userSchema.virtual('isLocked').get(function () {
  return !!(this.lockedUntil && this.lockedUntil > Date.now());
});

/**
 * @description Returns whether the user has completed role selection
 *              after their first GitHub OAuth login.
 * @returns     {boolean} True if role has been selected
 */
userSchema.virtual('hasSelectedRole').get(function () {
  return this.role !== null;
});

/**
 * @description Returns whether the user has given full consent
 *              (terms + privacy policy).
 * @returns     {boolean} True if full consent given
 */
userSchema.virtual('hasFullConsent').get(function () {
  return this.hasAcceptedTerms && this.hasAcceptedPrivacyPolicy;
});

// ── Indexes ───────────────────────────────────────────────────────────────────
// Compound indexes for common query patterns
// Constitution Standard 9 — indexes on all queried fields from Day 1
userSchema.index({ role: 1, isActive: 1 });
userSchema.index({ isSuspended: 1, isActive: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ lastLoginAt: -1 });

// ── Immutable Audit Protection ────────────────────────────────────────────────
/**
 * @description Prevents githubId from being changed after account creation.
 *              GitHub identity is permanent — it cannot be reassigned.
 */
userSchema.pre('save', function (next) {
  if (!this.isNew && this.isModified('githubId')) {
    return next(new Error('GitHub ID cannot be changed after account creation'));
  }
  next();
});

const User = mongoose.model('User', userSchema);

module.exports = User;