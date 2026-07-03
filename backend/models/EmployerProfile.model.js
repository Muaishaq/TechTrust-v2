/**
 * @file        EmployerProfile.model.js
 * @description TechTrust Employer Profile model.
 *              Stores all employer/recruiter specific data including
 *              company info, subscription plan, and saved developers.
 *              Every employer has one User document + one EmployerProfile.
 *              Constitution Standard 9  — indexes on all queried fields.
 *              Constitution Standard 10 — designed for scale.
 *              SPECIFICATION.md Section 5 — employer features reference.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const mongoose = require('mongoose');

const employerProfileSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },

    // ── Company Information ───────────────────────────────────────────────
    companyName: {
      type: String,
      trim: true,
      maxlength: [200, 'Company name cannot exceed 200 characters'],
      default: null,
    },

    companySize: {
      type: String,
      enum: {
        values: ['1-10', '11-50', '51-200', '201-500', '500+'],
        message: 'Invalid company size range',
      },
      default: null,
    },

    industry: {
      type: String,
      trim: true,
      maxlength: [100, 'Industry cannot exceed 100 characters'],
      default: null,
    },

    website: {
      type: String,
      trim: true,
      default: null,
      match: [
        /^https?:\/\/.+/,
        'Please provide a valid website URL',
      ],
    },

    description: {
      type: String,
      trim: true,
      maxlength: [500, 'Description cannot exceed 500 characters'],
      default: null,
    },

    // ── Location ──────────────────────────────────────────────────────────
    location: {
      country: { type: String, default: null, index: true },
      city: { type: String, default: null },
    },

    // ── Subscription ──────────────────────────────────────────────────────
    planType: {
      type: String,
      enum: {
        values: ['free', 'starter', 'pro', 'enterprise'],
        message: 'Plan type must be free, starter, pro, or enterprise',
      },
      default: 'free',
      index: true,
    },

    planExpiresAt: {
      type: Date,
      default: null,
    },

    // ── Usage Tracking ────────────────────────────────────────────────────
    // Tracks monthly usage for plan limits enforcement
    profileViewsThisMonth: {
      type: Number,
      default: 0,
    },

    profileViewsResetAt: {
      type: Date,
      default: Date.now,
    },

    // ── Saved Developers ──────────────────────────────────────────────────
    savedDevelopers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'DeveloperProfile',
      default: [],
      validate: {
        validator: (arr) => arr.length <= 500,
        message: 'Cannot save more than 500 developers',
      },
    },

    // ── Profile Completion ────────────────────────────────────────────────
    profileCompletion: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ── Verification ──────────────────────────────────────────────────────
    isVerifiedEmployer: {
      type: Boolean,
      default: false,
      index: true,
    },

    verifiedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ── Virtual Fields ────────────────────────────────────────────────────────────
/**
 * @description Returns monthly profile view limit based on plan.
 * @returns     {number} Maximum profile views allowed per month
 */
employerProfileSchema.virtual('monthlyViewLimit').get(function () {
  const limits = {
    free: 5,
    starter: 100,
    pro: 500,
    enterprise: Infinity,
  };
  return limits[this.planType] || 5;
});

/**
 * @description Returns whether employer has reached monthly view limit.
 * @returns     {boolean} True if limit reached
 */
employerProfileSchema.virtual('hasReachedViewLimit').get(function () {
  return this.profileViewsThisMonth >= this.monthlyViewLimit;
});

/**
 * @description Returns maximum job postings allowed based on plan.
 * @returns     {number} Maximum active job postings
 */
employerProfileSchema.virtual('jobPostingLimit').get(function () {
  const limits = {
    free: 1,
    starter: 5,
    pro: 20,
    enterprise: Infinity,
  };
  return limits[this.planType] || 1;
});

// ── Pre-Save Hook ─────────────────────────────────────────────────────────────
/**
 * @description Calculates profile completion percentage before saving.
 *              Resets monthly view counter if month has changed.
 */
employerProfileSchema.pre('save', function (next) {
  // Calculate profile completion
  const fields = [
    this.companyName,
    this.companySize,
    this.industry,
    this.website,
    this.description,
    this.location?.country,
  ];
  const completed = fields.filter(Boolean).length;
  this.profileCompletion = Math.round((completed / fields.length) * 100);

  // Reset monthly view counter if month has changed
  const now = new Date();
  const resetAt = new Date(this.profileViewsResetAt);
  if (
    now.getMonth() !== resetAt.getMonth() ||
    now.getFullYear() !== resetAt.getFullYear()
  ) {
    this.profileViewsThisMonth = 0;
    this.profileViewsResetAt = now;
  }

  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────
employerProfileSchema.index({ planType: 1, isVerifiedEmployer: 1 });
employerProfileSchema.index({ 'location.country': 1 });
employerProfileSchema.index({ createdAt: -1 });

const EmployerProfile = mongoose.model('EmployerProfile', employerProfileSchema);

module.exports = EmployerProfile;