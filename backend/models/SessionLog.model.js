/**
 * @file        SessionLog.model.js
 * @description TechTrust session activity log model.
 *              Records user activity on the platform for security monitoring
 *              and analytics. Only collected after user consent is confirmed.
 *              Location tracking: country and city from IP only — NO GPS.
 *              Architecture.md Section 7 — compliant activity tracking.
 *              NDPR/GDPR — personal data, retained for 90 days only.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const mongoose = require('mongoose');

const sessionLogSchema = new mongoose.Schema(
  {
    // ── Who ──────────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // ── What They Did ────────────────────────────────────────────────────
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      index: true,
    },

    // ── Request Details ──────────────────────────────────────────────────
    method: {
      type: String,
      enum: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      default: null,
    },

    path: {
      type: String,
      default: null,
    },

    statusCode: {
      type: Number,
      default: null,
    },

    // ── Location (NDPR/GDPR Compliant) ───────────────────────────────────
    // Country and city from IP geolocation ONLY
    // NO GPS, NO precise location, NO coordinates
    // Architecture.md Section 6 — what TechTrust collects
    ipAddress: {
      type: String,
      default: null,
      select: false, // Hidden from normal queries — privacy protection
    },

    country: {
      type: String,
      default: null,
    },

    city: {
      type: String,
      default: null,
    },

    // ── Device Information ───────────────────────────────────────────────
    device: {
      type: String,
      enum: ['desktop', 'mobile', 'tablet', 'unknown'],
      default: 'unknown',
    },

    browser: {
      type: String,
      default: null,
    },

    // ── Outcome ──────────────────────────────────────────────────────────
    outcome: {
      type: String,
      enum: ['success', 'failed', 'blocked'],
      default: 'success',
      index: true,
    },

    // ── Consent Confirmation ─────────────────────────────────────────────
    // Confirms tracking consent was given before this log was created
    // Architecture.md Section 7 — consent-gated tracking
    consentConfirmed: {
      type: Boolean,
      required: true,
      default: false,
    },

    // ── Timestamp ────────────────────────────────────────────────────────
    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
      // Auto-delete after 90 days — NDPR/GDPR data minimization
      expires: 60 * 60 * 24 * 90, // 90 days in seconds (MongoDB TTL index)
    },
  },
  {
    timestamps: false, // Using custom timestamp field above
  }
);

// ── Indexes ───────────────────────────────────────────────────────────────────
sessionLogSchema.index({ userId: 1, timestamp: -1 });
sessionLogSchema.index({ action: 1, timestamp: -1 });
sessionLogSchema.index({ outcome: 1, timestamp: -1 });
sessionLogSchema.index({ country: 1, timestamp: -1 });

const SessionLog = mongoose.model('SessionLog', sessionLogSchema);

module.exports = SessionLog;