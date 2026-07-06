/**
 * @file        payment.controller.js
 * @description TechTrust payment controller.
 *              Handles HTTP layer for all payment endpoints.
 *              Controllers only handle req/res — all logic in payment.service.js.
 *              Constitution Standard 10 — strict layer separation enforced.
 *              Constitution Standard 3  — payment secrets never exposed.
 *              SPECIFICATION.md Section 5.5 — pricing reference.
 * @author      Muaishaq
 * @created     2026-07-05
 * @modified    2026-07-05
 */

'use strict';

const PaymentService = require('../services/payment.service');
const AuthRepository = require('../repositories/auth.repository');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const { successResponse } = require('../utils/response');
const logger = require('../utils/logger');

// ── Developer Premium Subscription ───────────────────────────────────────────
/**
 * @description Initiates a Flutterwave payment for developer premium plan.
 *              Returns a payment link the developer is redirected to.
 * @param       {Object} req      - Express request object
 * @param       {Object} req.body - Request body
 * @param       {string} req.body.planType - Plan type (developer_premium)
 * @param       {Object} res      - Express response object
 * @returns     {Promise<void>}
 */
const subscribeDeveloper = asyncHandler(async (req, res) => {
  const { planType = 'developer_premium' } = req.body;

  // Get user details for payment
  const user = await AuthRepository.findById(req.user.id);
  if (!user) {
    throw AppError.notFound('User account not found.');
  }

  const result = await PaymentService.initiateFlutterwavePayment(
    req.user.id,
    planType,
    user.email,
    user.name
  );

  return successResponse(
    res,
    200,
    'Payment initiated. Please complete your payment using the link provided.',
    {
      paymentLink: result.paymentLink,
      txRef: result.txRef,
      amount: result.amount,
      currency: result.currency,
    }
  );
});

// ── Employer Subscription ─────────────────────────────────────────────────────
/**
 * @description Initiates payment for employer subscription plan.
 *              Uses Flutterwave for NGN plans, Stripe for USD plans.
 * @param       {Object} req      - Express request object
 * @param       {Object} req.body - Request body
 * @param       {string} req.body.planType  - Plan type
 * @param       {string} req.body.provider  - Payment provider: flutterwave | stripe
 * @param       {Object} res      - Express response object
 * @returns     {Promise<void>}
 */
const subscribeEmployer = asyncHandler(async (req, res) => {
  const { planType, provider = 'flutterwave' } = req.body;

  if (!planType) {
    throw AppError.badRequest('Plan type is required.');
  }

  const validEmployerPlans = [
    'employer_starter',
    'employer_pro',
    'employer_enterprise',
  ];

  if (!validEmployerPlans.includes(planType)) {
    throw AppError.badRequest(
      `Invalid employer plan. Must be one of: ${validEmployerPlans.join(', ')}`
    );
  }

  const user = await AuthRepository.findById(req.user.id);
  if (!user) {
    throw AppError.notFound('User account not found.');
  }

  let result;

  if (provider === 'stripe') {
    result = await PaymentService.initiateStripePayment(
      req.user.id,
      planType,
      user.email
    );

    return successResponse(
      res,
      200,
      'Payment initiated. Please complete your payment using the checkout link.',
      {
        checkoutUrl: result.checkoutUrl,
        sessionId: result.sessionId,
        txRef: result.txRef,
      }
    );
  }

  // Default to Flutterwave
  result = await PaymentService.initiateFlutterwavePayment(
    req.user.id,
    planType,
    user.email,
    user.name
  );

  return successResponse(
    res,
    200,
    'Payment initiated. Please complete your payment using the link provided.',
    {
      paymentLink: result.paymentLink,
      txRef: result.txRef,
      amount: result.amount,
      currency: result.currency,
    }
  );
});

// ── Webhook Handlers ──────────────────────────────────────────────────────────
/**
 * @description Handles Flutterwave payment webhooks.
 *              Public endpoint — verified by signature not JWT.
 *              Constitution Standard 3 — webhook signature verified.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const flutterwaveWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['verif-hash'];

  if (!signature) {
    logger.warn('Flutterwave webhook received without signature', {
      ip: req.ip,
    });
    throw AppError.forbidden('Missing webhook signature.');
  }

  await PaymentService.handleFlutterwaveWebhook(signature, req.body);

  // Always return 200 to Flutterwave — even if processing fails
  // Flutterwave retries on non-200 responses
  return res.status(200).json({ status: 'success' });
});

/**
 * @description Handles Stripe payment webhooks.
 *              Public endpoint — verified by Stripe signature.
 *              Requires raw body — configured in payment.routes.js.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const stripeWebhook = asyncHandler(async (req, res) => {
  const signature = req.headers['stripe-signature'];

  if (!signature) {
    logger.warn('Stripe webhook received without signature', { ip: req.ip });
    throw AppError.forbidden('Missing Stripe webhook signature.');
  }

  // req.rawBody set by express.raw() middleware in payment.routes.js
  await PaymentService.handleStripeWebhook(signature, req.rawBody);

  return res.status(200).json({ received: true });
});

// ── Subscription Status ───────────────────────────────────────────────────────
/**
 * @description Returns the authenticated user's current subscription status.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getSubscriptionStatus = asyncHandler(async (req, res) => {
  const subscription = await PaymentService.getSubscriptionStatus(req.user.id);

  return successResponse(
    res,
    200,
    'Subscription status retrieved successfully',
    {
      subscription,
      hasActiveSubscription: !!subscription,
    }
  );
});

/**
 * @description Returns available plans and pricing.
 *              Public endpoint — no auth required.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getPlans = asyncHandler(async (req, res) => {
  const plans = Object.entries(PaymentService.PLANS).map(([key, plan]) => ({
    id: key,
    name: plan.name,
    amount: plan.amount,
    currency: plan.currency,
    durationDays: plan.durationDays,
    description: plan.description,
  }));

  return successResponse(
    res,
    200,
    'Plans retrieved successfully',
    { plans }
  );
});

module.exports = {
  subscribeDeveloper,
  subscribeEmployer,
  flutterwaveWebhook,
  stripeWebhook,
  getSubscriptionStatus,
  getPlans,
};