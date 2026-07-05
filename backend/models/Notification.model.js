/**
 * @file        Notification.model.js
 * @description TechTrust Notification model.
 *              Stores all in-app notifications for developers and employers.
 *              Notifications are created by platform events and read by users
 *              via the notification bell in their dashboard.
 *              Constitution Standard 9  — indexes on all queried fields.
 *              SPECIFICATION.md Section 7 — notification system reference.
 * @author      Muaishaq
 * @created     2026-07-04
 * @modified    2026-07-04
 */

'use strict';

const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    // ── Recipient ─────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // ── Notification Type ─────────────────────────────────────────────────
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          // Developer notifications
          'verification_complete',
          'verification_flagged',
          'trust_score_changed',
          'coaching_insight_available',
          'job_match_found',
          'badge_updated',
          'premium_expiring',

          // Employer notifications
          'developer_applied',
          'search_match_available',
          'api_quota_warning',
          'subscription_expiring',

          // General notifications
          'account_suspended',
          'account_activated',
          'system_announcement',
          'payment_received',
          'payment_failed',
        ],
        message: 'Invalid notification type',
      },
      index: true,
    },

    // ── Content ───────────────────────────────────────────────────────────
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
    },

    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [1000, 'Message cannot exceed 1000 characters'],
    },

    // ── Action Link ───────────────────────────────────────────────────────
    // Optional — directs user to relevant page when clicked
    actionUrl: {
      type: String,
      default: null,
    },

    actionLabel: {
      type: String,
      default: null,
      maxlength: [50, 'Action label cannot exceed 50 characters'],
    },

    // ── Status ────────────────────────────────────────────────────────────
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },

    readAt: {
      type: Date,
      default: null,
    },

    // ── Priority ──────────────────────────────────────────────────────────
    priority: {
      type: String,
      enum: {
        values: ['low', 'normal', 'high', 'urgent'],
        message: 'Priority must be low, normal, high, or urgent',
      },
      default: 'normal',
      index: true,
    },

    // ── Related Resource ──────────────────────────────────────────────────
    // Links notification to the resource that triggered it
    relatedId: {
      type: mongoose.Schema.Types.ObjectId,
      default: null,
    },

    relatedType: {
      type: String,
      enum: [
        'VerificationRecord',
        'JobPosting',
        'DeveloperProfile',
        'Payment',
        'Dispute',
        null,
      ],
      default: null,
    },

    // ── Email ─────────────────────────────────────────────────────────────
    emailSent: {
      type: Boolean,
      default: false,
    },

    emailSentAt: {
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

// ── Indexes ───────────────────────────────────────────────────────────────────
notificationSchema.index({ userId: 1, isRead: 1, createdAt: -1 });
notificationSchema.index({ userId: 1, type: 1 });
notificationSchema.index({ userId: 1, priority: 1, createdAt: -1 });
notificationSchema.index({ createdAt: -1 });

// ── TTL Index ─────────────────────────────────────────────────────────────────
// Auto-delete read notifications after 90 days
// Keeps the notifications collection lean
notificationSchema.index(
  { readAt: 1 },
  {
    expireAfterSeconds: 90 * 24 * 60 * 60,
    partialFilterExpression: { isRead: true },
  }
);

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;