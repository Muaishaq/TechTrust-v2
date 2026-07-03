/**
 * @file        JobPosting.model.js
 * @description TechTrust Job Posting model.
 *              Stores job opportunities posted by employers.
 *              Developers matching the criteria are notified.
 *              Constitution Standard 9  — indexes on all queried fields.
 *              Constitution Standard 10 — designed for scale.
 *              SPECIFICATION.md Section 5.3 — job postings reference.
 * @author      Muaishaq
 * @created     2026-07-03
 * @modified    2026-07-03
 */

'use strict';

const mongoose = require('mongoose');

const jobPostingSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────
    employerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'EmployerProfile',
      required: [true, 'Employer ID is required'],
      index: true,
    },

    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // ── Job Details ───────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Job title is required'],
      trim: true,
      maxlength: [200, 'Job title cannot exceed 200 characters'],
      index: true,
    },

    description: {
      type: String,
      required: [true, 'Job description is required'],
      trim: true,
      maxlength: [5000, 'Description cannot exceed 5000 characters'],
    },

    requirements: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 20,
        message: 'Maximum 20 requirements allowed',
      },
    },

    skills: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) => arr.length <= 15,
        message: 'Maximum 15 skills allowed',
      },
    },

    // ── Compensation ──────────────────────────────────────────────────────
    salaryRange: {
      min: { type: Number, default: null },
      max: { type: Number, default: null },
      currency: {
        type: String,
        default: 'USD',
        uppercase: true,
        maxlength: 3,
      },
      isPublic: { type: Boolean, default: true },
    },

    // ── Work Type ─────────────────────────────────────────────────────────
    workType: {
      type: String,
      enum: {
        values: ['remote', 'hybrid', 'onsite'],
        message: 'Work type must be remote, hybrid, or onsite',
      },
      required: [true, 'Work type is required'],
      index: true,
    },

    // ── Location ──────────────────────────────────────────────────────────
    location: {
      country: { type: String, default: null },
      city: { type: String, default: null },
    },

    // ── Experience ────────────────────────────────────────────────────────
    experienceLevel: {
      type: String,
      enum: {
        values: ['junior', 'mid', 'senior', 'lead', 'any'],
        message: 'Invalid experience level',
      },
      default: 'any',
      index: true,
    },

    // ── TechTrust Requirements ────────────────────────────────────────────
    // Employers can require a minimum Trust Score
    minimumTrustScore: {
      type: Number,
      min: [0, 'Minimum trust score cannot be negative'],
      max: [100, 'Minimum trust score cannot exceed 100'],
      default: 0,
      index: true,
    },

    // ── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['draft', 'active', 'closed', 'expired'],
        message: 'Status must be draft, active, closed, or expired',
      },
      default: 'draft',
      index: true,
    },

    // ── Applications ──────────────────────────────────────────────────────
    applicants: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: 'User',
      default: [],
    },

    applicantCount: {
      type: Number,
      default: 0,
    },

    // ── Deadline ──────────────────────────────────────────────────────────
    deadline: {
      type: Date,
      default: null,
      index: true,
    },

    // ── Views ─────────────────────────────────────────────────────────────
    viewCount: {
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
 * @description Returns whether the job posting is still accepting applications.
 * @returns     {boolean} True if active and deadline not passed
 */
jobPostingSchema.virtual('isOpen').get(function () {
  if (this.status !== 'active') return false;
  if (!this.deadline) return true;
  return new Date() < this.deadline;
});

/**
 * @description Returns days remaining until deadline.
 * @returns     {number|null} Days remaining or null if no deadline
 */
jobPostingSchema.virtual('daysRemaining').get(function () {
  if (!this.deadline) return null;
  const remaining = this.deadline - new Date();
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
});

// ── Pre-Save Hook ─────────────────────────────────────────────────────────────
/**
 * @description Auto-expires jobs past their deadline.
 *              Keeps applicant count in sync.
 */
jobPostingSchema.pre('save', function (next) {
  // Auto-expire if deadline passed
  if (this.deadline && new Date() > this.deadline && this.status === 'active') {
    this.status = 'expired';
  }

  // Keep applicant count in sync
  this.applicantCount = this.applicants.length;

  next();
});

// ── Indexes ───────────────────────────────────────────────────────────────────
jobPostingSchema.index({ status: 1, createdAt: -1 });
jobPostingSchema.index({ status: 1, workType: 1 });
jobPostingSchema.index({ status: 1, experienceLevel: 1 });
jobPostingSchema.index({ status: 1, minimumTrustScore: 1 });
jobPostingSchema.index({ employerId: 1, status: 1 });
jobPostingSchema.index({ deadline: 1, status: 1 });

const JobPosting = mongoose.model('JobPosting', jobPostingSchema);

module.exports = JobPosting;