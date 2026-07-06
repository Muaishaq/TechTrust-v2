/**
 * @file        payment.routes.js
 * @description TechTrust payment routes.
 *              Endpoints:
 *              GET  /api/v1/payments/plans                  - Get available plans
 *              GET  /api/v1/payments/subscription           - Get subscription status
 *              POST /api/v1/payments/developer/subscribe    - Developer premium
 *              POST /api/v1/payments/employer/subscribe     - Employer subscription
 *              POST /api/v1/payments/webhook/flutterwave    - Flutterwave webhook
 *              POST /api/v1/payments/webhook/stripe         - Stripe webhook
 *              Constitution Standard 3  — webhooks verified by signature not JWT.
 *              Constitution Standard 4  — all payment events logged.
 * @author      Muaishaq
 * @created     2026-07-05
 * @modified    2026-07-05
 */

'use strict';

const express = require('express');
const router = express.Router();
const paymentController = require('../../controllers/payment.controller');
const {
  authenticate,
  requireDeveloper,
  requireEmployer,
} = require('../../middleware/auth.middleware');
const { sensitiveActionLimiter } = require('../../middleware/rateLimiter.middleware');

// ── Public Routes ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/plans
 * Returns all available plans and pricing.
 * Public — no authentication required.
 */
router.get(
  '/plans',
  paymentController.getPlans
);

/**
 * POST /api/v1/payments/webhook/flutterwave
 * Flutterwave payment webhook.
 * Public — verified by Flutterwave signature header (verif-hash).
 * Must be registered BEFORE express.json() middleware in app.js
 * so raw body is available for signature verification.
 */
router.post(
  '/webhook/flutterwave',
  express.json(),
  paymentController.flutterwaveWebhook
);

/**
 * POST /api/v1/payments/webhook/stripe
 * Stripe payment webhook.
 * Public — verified by Stripe signature.
 * Uses express.raw() to preserve raw body for Stripe signature verification.
 */
router.post(
  '/webhook/stripe',
  express.raw({ type: 'application/json' }),
  (req, res, next) => {
    // Store raw body for Stripe webhook signature verification
    req.rawBody = req.body;
    next();
  },
  paymentController.stripeWebhook
);

// ── Authenticated Routes ──────────────────────────────────────────────────────

/**
 * GET /api/v1/payments/subscription
 * Returns the authenticated user's current subscription status.
 * Requires: any authenticated user.
 */
router.get(
  '/subscription',
  authenticate,
  paymentController.getSubscriptionStatus
);

/**
 * POST /api/v1/payments/developer/subscribe
 * Initiates developer premium subscription via Flutterwave.
 * Requires: developer role.
 * Rate limited — prevents duplicate payment attempts.
 * Body: { planType: 'developer_premium' }
 */
router.post(
  '/developer/subscribe',
  requireDeveloper,
  sensitiveActionLimiter,
  paymentController.subscribeDeveloper
);

/**
 * POST /api/v1/payments/employer/subscribe
 * Initiates employer subscription via Flutterwave or Stripe.
 * Requires: employer role.
 * Rate limited — prevents duplicate payment attempts.
 * Body: { planType: 'employer_starter'|'employer_pro', provider: 'flutterwave'|'stripe' }
 */
router.post(
  '/employer/subscribe',
  requireEmployer,
  sensitiveActionLimiter,
  paymentController.subscribeEmployer
);

module.exports = router;