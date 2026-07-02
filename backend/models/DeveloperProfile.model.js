/**
 * @file        DeveloperProfile.model.js
 * @description TechTrust Developer Profile model.
 *              Stores all developer-specific data including skills,
 *              verification status, trust score, and platform settings.
 *              Every developer has one User document + one DeveloperProfile.
 *              Constitution Standard 9  — indexes on all queried fields.
 *              Constitution Standard 10 — designed for millions of records.
 *              SPECIFICATION.md Section 4 — developer features reference.
 * @author      Muaishaq
 * @created     2026-07-02
 * @modified    2026-07-02
 */

'use strict';

const mongoose = require('mongoose');

const developerProfileSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────
    // Links to the base User document
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      unique: true,
      index: true,
    },

    // ── Professional Info ─────────────────────────────────────────────────
    title: {
      type: String,
      trim: true,
      maxlength: [100, 'Title cannot exceed 100 characters'],
      default: null,
    },

    bio: {
      type: String,
      trim: true,
      maxlength: [500, 'Bio cannot exceed 500 characters'],
      default: null,
    },

    location: {
      country: { type: String, default: null, index: true },
      city: { type: String, default: null },
    },

    // ── Skills & Experience ───────────────────────────────────────────────
    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: 'Maximum 20 skills allowed',
      },
    },

    experienceLevel: {
      type: String,
      enum: {
        values: ['junior', 'mid', 'senior', 'lead'],
        message: 'Experience level must be junior, mid, senior, or lead',
      },
      default: null,
      index: true,
    },

    yearsOfExperience: {
      type: Number,
      min: [0, 'Years of experience cannot be negative'],
      max: [50, 'Years of experience cannot exceed 50'],
      default: null,
    },

    // ── Availability ──────────────────────────────────────────────────────
    availability: {
      type: String,
      enum: {
        values: ['open', 'freelance', 'not_available'],
        message: 'Availability must be open, freelance, or not_available',
      },
      default: 'not_available',
      index: true,
    },

    // ── Trust Score & Verification ────────────────────────────────────────
    // Core TechTrust metrics — updated after each verification
    trustScore: {
      type: Number,
      min: [0, 'Trust score cannot be negative'],
      max: [100, 'Trust score cannot exceed 100'],
      default: 0,
      index: true,
    },

    verificationStatus: {
      type: String,
      enum: {
        values: ['unverified', 'pending', 'verified', 'flagged'],
        message: 'Invalid verification status',
      },
      default: 'unverified',
      index: true,
    },

    lastVerifiedAt: {
      type: Date,
      default: null,
      index: true,
    },

    // ── Skill Dimension Scores ────────────────────────────────────────────
    // Individual scores from the AI scoring engine
    // SPECIFICATION.md Section 4.3 — 8 scoring dimensions
    skillScores: {
      codeConsistency: { type: Number, min: 0, max: 100, default: 0 },
      languageProficiency: { type: mongoose.Schema.Types.Mixed, default: {} },
      projectComplexity: { type: Number, min: 0, max: 100, default: 0 },
      collaborationScore: { type: Number, min: 0, max: 100, default: 0 },
      documentationQuality: { type: Number, min: 0, max: 100, default: 0 },
      activityRecency: { type: Number, min: 0, max: 100, default: 0 },
      originalityScore: { type: Number, min: 0, max: 100, default: 0 },
      communityImpact: { type: Number, min: 0, max: 100, default: 0 },
    },

    // ── Subscription ──────────────────────────────────────────────────────
    planType: {
      type: String,
      enum: {
        values: ['free', 'premium'],
        message: 'Plan type must be free or premium',
      },
      default: 'free',
      index: true,
    },

    planExpiresAt: {
      type: Date,
      default: null,
    },

    // ── Badge ─────────────────────────────────────────────────────────────
    badgeUrl: {
      type: String,
      default: null,
    },

    badgeGeneratedAt: {
      type: Date,
      default: null,
    },

    // ── Profile Visibility ────────────────────────────────────────────────
    isPublic: {
      type: Boolean,
      default: true,
      index: true,
    },

    // ── External Links ────────────────────────────────────────────────────
    linkedinUrl: {
      type: String,
      trim: true,
      default: null,
      match: [
        /^https?:\/\/(www\.)?linkedin\.com\/.+/,
        'Please provide a valid LinkedIn URL',
      ],
    },

    portfolioUrl: {
      type: String,
      trim: true,
      default: null,
      match: [
        /^https?:\/\/.+/,
        'Please provide a valid portfolio URL',
      ],
    },

    twitterUrl: {
      type: String,
      trim: true,
      default: null,
    },

    // ── Profile Completion ────────────────────────────────────────────────
    // Percentage of profile fields completed
    // Calculated on save — used for onboarding progress
    profileCompletion: {
      type: Number,
      min: 0,
      max: 100,
      default: 0,
    },

    // ── Coaching Stats ────────────────────────────────────────────────────
    totalCoachingInsights: {
      type: Number,
      default: 0,
    },

    completedCoachingInsights: {
      type: Number,
      default: 0,
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
 * @description Returns whether developer is eligible for re-verification.
 *              Free tier: 90 days cooldown.
 *              Premium tier: 30 days cooldown.
 * @returns     {boolean} True if verification cooldown has passed
 */
developerProfileSchema.virtual('canVerify').get(function () {
  if (!this.lastVerifiedAt) return true;

  const cooldownDays = this.planType === 'premium' ? 30 : 90;
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  return Date.now() - this.lastVerifiedAt.getTime() > cooldownMs;
});

/**
 * @description Returns days remaining until next verification is allowed.
 * @returns     {number} Days remaining (0 if verification is available)
 */
developerProfileSchema.virtual('daysUntilNextVerification').get(function () {
  if (!this.lastVerifiedAt || this.canVerify) return 0;

  const cooldownDays = this.planType === 'premium' ? 30 : 90;
  const cooldownMs = cooldownDays * 24 * 60 * 60 * 1000;
  const elapsed = Date.now() - this.lastVerifiedAt.getTime();
  const remaining = cooldownMs - elapsed;

  return Math.ceil(remaining / (24 * 60 * 60 * 1000));
});

/**
 * @description Returns coaching completion percentage.
 * @returns     {number} Percentage of coaching insights completed
 */
developerProfileSchema.virtual('coachingCompletionRate').get(function () {
  if (this.totalCoachingInsights === 0) return 0;
  return Math.round(
    (this.completedCoachingInsights / this.totalCoachingInsights) * 100
  );
});

// ── Pre-Save Hook ─────────────────────────────────────────────────────────────
/**
 * @description Calculates profile completion percentage before saving.
 *              Used for onboarding progress indicator.
 */
developerProfileSchema.pre('save', function (next) {
  const fields = [
    this.title,
    this.bio,
    this.location?.country,
    this.skills?.length > 0,
    this.experienceLevel,
    this.availability !== 'not_available',
    this.linkedinUrl,
    this.portfolioUrl,
  ];

  const completed = fields.filter(Boolean).length;
  this.profileCompletion = Math.round((completed / fields.length) * 100);

  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────
developerProfileSchema.index({ trustScore: -1 });
developerProfileSchema.index({ verificationStatus: 1, isPublic: 1 });
developerProfileSchema.index({ availability: 1, trustScore: -1 });
developerProfileSchema.index({ 'location.country': 1, trustScore: -1 });
developerProfileSchema.index({ planType: 1, lastVerifiedAt: -1 });
developerProfileSchema.index({ createdAt: -1 });

const DeveloperProfile = mongoose.model('DeveloperProfile', developerProfileSchema);

module.exports = DeveloperProfile;