/**
 * @file        Subscription.model.js
 * @description TechTrust Subscription model.
 *              Records all active and historical subscriptions for
 *              both developers (premium) and employers (starter/pro/enterprise).
 *              Links users to their payment history and plan status.
 *              Constitution Standard 9  — indexes on all queried fields.
 *              SPECIFICATION.md Section 5.5 — employer pricing reference.
 * @author      Muaishaq
 * @created     2026-07-05
 * @modified    2026-07-05
 */

'use strict';

const mongoose = require('mongoose');

const subscriptionSchema = new mongoose.Schema(
  {
    // ── Identity ─────────────────────────────────────────────────────────
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'User ID is required'],
      index: true,
    },

    // ── Plan Details ──────────────────────────────────────────────────────
    planType: {
      type: String,
      required: [true, 'Plan type is required'],
      enum: {
        values: ['developer_premium', 'employer_starter', 'employer_pro', 'employer_enterprise'],
        message: 'Invalid plan type',
      },
      index: true,
    },

    // ── Status ────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: {
        values: ['active', 'expired', 'cancelled', 'pending', 'failed'],
        message: 'Invalid subscription status',
      },
      default: 'pending',
      index: true,
    },

    // ── Payment Details ───────────────────────────────────────────────────
    amount: {
      type: Number,
      required: [true, 'Payment amount is required'],
      min: [0, 'Amount cannot be negative'],
    },

    currency: {
      type: String,
      required: [true, 'Currency is required'],
      uppercase: true,
      default: 'USD',
    },

    // ── Payment Provider ──────────────────────────────────────────────────
    provider: {
      type: String,
      enum: {
        values: ['flutterwave', 'stripe'],
        message: 'Provider must be flutterwave or stripe',
      },
      required: [true, 'Payment provider is required'],
    },

    // ── Transaction References ────────────────────────────────────────────
    providerTransactionId: {
      type: String,
      default: null,
      index: true,
    },

    providerReference: {
      type: String,
      default: null,
    },

    // ── Duration ──────────────────────────────────────────────────────────
    startDate: {
      type: Date,
      default: null,
    },

    endDate: {
      type: Date,
      default: null,
      index: true,
    },

    // ── Billing Cycle ─────────────────────────────────────────────────────
    billingCycle: {
      type: String,
      enum: {
        values: ['monthly', 'annual'],
        message: 'Billing cycle must be monthly or annual',
      },
      default: 'monthly',
    },

    // ── Metadata ──────────────────────────────────────────────────────────
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },

    // ── Cancellation ──────────────────────────────────────────────────────
    cancelledAt: {
      type: Date,
      default: null,
    },

    cancellationReason: {
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
 * @description Returns whether subscription is currently active.
 * @returns     {boolean} True if active and not expired
 */
subscriptionSchema.virtual('isActive').get(function () {
  if (this.status !== 'active') return false;
  if (!this.endDate) return true;
  return new Date() < this.endDate;
});

/**
 * @description Returns days remaining on subscription.
 * @returns     {number} Days remaining or 0 if expired
 */
subscriptionSchema.virtual('daysRemaining').get(function () {
  if (!this.endDate) return 0;
  const remaining = this.endDate - new Date();
  return Math.max(0, Math.ceil(remaining / (1000 * 60 * 60 * 24)));
});

// ── Indexes ───────────────────────────────────────────────────────────────────
subscriptionSchema.index({ userId: 1, status: 1 });
subscriptionSchema.index({ userId: 1, planType: 1 });
subscriptionSchema.index({ status: 1, endDate: 1 });
subscriptionSchema.index({ provider: 1, providerTransactionId: 1 });
subscriptionSchema.index({ createdAt: -1 });

const Subscription = mongoose.model('Subscription', subscriptionSchema);

module.exports = Subscription;