/**
 * @file        AuditLog.model.js
 * @description TechTrust immutable audit log model.
 *              Records every significant action on the platform permanently.
 *              This collection is WRITE-ONLY — no updates, no deletes — ever.
 *              Provides complete accountability trail for legal, compliance,
 *              and security purposes.
 *              Constitution Standard 4  — all significant events logged.
 *              Architecture.md Section 7 — immutable audit trail.
 *              NDPR/GDPR — audit records retained for 7 years (legal requirement).
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema(
  {
    // ── Who Did It ───────────────────────────────────────────────────────
    actorId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,  // null for system-generated events
      index: true,
    },

    actorRole: {
      type: String,
      enum: ['developer', 'employer', 'admin', 'system', 'unauthenticated'],
      required: [true, 'Actor role is required'],
      index: true,
    },

    // ── What Was Done ────────────────────────────────────────────────────
    action: {
      type: String,
      required: [true, 'Action is required'],
      uppercase: true,
      trim: true,
      index: true,
      // Examples: USER_REGISTERED, USER_SUSPENDED, VERIFICATION_TRIGGERED,
      //           ADMIN_OVERRIDE, PAYMENT_RECEIVED, DISPUTE_RESOLVED,
      //           CONSENT_GRANTED, DATA_EXPORTED, ACCOUNT_DELETED
    },

    // ── What It Was Done To ──────────────────────────────────────────────
    targetId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
      index: true,
    },

    targetType: {
      type: String,
      enum: [
        'User',
        'DeveloperProfile',
        'EmployerProfile',
        'VerificationRecord',
        'JobPosting',
        'Dispute',
        'Payment',
        'Subscription',
        'ConsentRecord',
        'System',
      ],
      default: null,
    },

    // ── Where From ───────────────────────────────────────────────────────
    // IP stored hashed for privacy — never plain text
    // Architecture.md Section 7 — country/city only, no GPS
    ipAddress: {
      type: String,
      default: null,
    },

    country: {
      type: String,
      default: null,
    },

    city: {
      type: String,
      default: null,
    },

    // ── Result ───────────────────────────────────────────────────────────
    outcome: {
      type: String,
      enum: ['success', 'failed', 'blocked', 'pending'],
      required: [true, 'Outcome is required'],
      index: true,
    },

    // ── Additional Context ───────────────────────────────────────────────
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Immutable Timestamp ──────────────────────────────────────────────
    timestamp: {
      type: Date,
      default: Date.now,
      immutable: true,  // Cannot be changed after creation
      index: true,
    },
  },
  {
    // No updatedAt — audit logs are never updated
    timestamps: { createdAt: 'timestamp', updatedAt: false },

    // Capped collection option — consider for high volume in production
    // Keeps last 1 million audit records automatically
  }
);

// ── Immutable Protection ──────────────────────────────────────────────────────
// Prevents ANY update or delete operation on audit log records
// Constitution Standard 4 — audit trail is permanent
auditLogSchema.pre(['updateOne', 'findOneAndUpdate', 'updateMany'], function () {
  throw new Error('Audit log records cannot be modified — they are immutable');
});

auditLogSchema.pre(['deleteOne', 'findOneAndDelete', 'deleteMany'], function () {
  throw new Error('Audit log records cannot be deleted — they are permanent');
});

// ── Indexes ───────────────────────────────────────────────────────────────────
auditLogSchema.index({ actorId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ targetId: 1, timestamp: -1 });
auditLogSchema.index({ outcome: 1, timestamp: -1 });
auditLogSchema.index({ timestamp: -1 });

const AuditLog = mongoose.model('AuditLog', auditLogSchema);

module.exports = AuditLog;