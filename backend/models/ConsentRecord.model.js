/**
 * @file        ConsentRecord.model.js
 * @description TechTrust consent record model.
 *              Records every consent action taken by users on the platform.
 *              NDPR Article 24 and GDPR Article 7 require proof of consent
 *              before any personal data is collected or processed.
 *              Consent records are retained for 7 years — legal requirement.
 *              Architecture.md Section 6 — NDPR/GDPR compliance.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const mongoose = require('mongoose');

const consentRecordSchema = new mongoose.Schema(
  {
    // ── Who Gave Consent ─────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // ── What They Consented To ───────────────────────────────────────────
    consentType: {
      type: String,
      enum: [
        'terms_of_service',       // Terms and conditions
        'privacy_policy',         // Privacy policy
        'activity_tracking',      // Session and activity logging
        'marketing_emails',       // Optional marketing communications
        'data_processing',        // General data processing consent
      ],
      required: [true, 'Consent type is required'],
      index: true,
    },

    // ── Consent Decision ─────────────────────────────────────────────────
    granted: {
      type: Boolean,
      required: [true, 'Consent decision is required'],
      index: true,
    },

    // ── Policy Version ───────────────────────────────────────────────────
    // Tracks which version of the policy was accepted
    // When policy updates, users must re-consent
    policyVersion: {
      type: String,
      required: [true, 'Policy version is required'],
      default: '1.0',
    },

    // ── Evidence of Consent ──────────────────────────────────────────────
    // Required by NDPR/GDPR to prove consent was freely given
    ipAddress: {
      type: String,
      default: null,
    },

    country: {
      type: String,
      default: null,
    },

    userAgent: {
      type: String,
      default: null,
    },

    // ── Timestamps ───────────────────────────────────────────────────────
    grantedAt: {
      type: Date,
      default: null,
    },

    revokedAt: {
      type: Date,
      default: null,
    },

    // ── Revocation Reason ────────────────────────────────────────────────
    revocationReason: {
      type: String,
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
 * @description Returns whether consent is currently active
 * @returns     {boolean} True if consent granted and not revoked
 */
consentRecordSchema.virtual('isActive').get(function () {
  return this.granted && !this.revokedAt;
});

// ── Indexes ───────────────────────────────────────────────────────────────────
consentRecordSchema.index({ userId: 1, consentType: 1 });
consentRecordSchema.index({ userId: 1, granted: 1 });
consentRecordSchema.index({ createdAt: -1 });

const ConsentRecord = mongoose.model('ConsentRecord', consentRecordSchema);

module.exports = ConsentRecord;