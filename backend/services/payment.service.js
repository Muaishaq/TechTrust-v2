/**
 * @file        payment.service.js
 * @description TechTrust payment service.
 *              Handles all payment flows for developer premium and
 *              employer subscriptions via Flutterwave (Africa) and
 *              Stripe (international).
 *              Constitution Standard 3  — payment secrets in env only.
 *              Constitution Standard 8  — fault tolerant payment flows.
 *              Constitution Standard 4  — all payment events logged.
 * @author      Muaishaq
 * @created     2026-07-05
 * @modified    2026-07-05
 */

'use strict';

const axios = require('axios');
const crypto = require('crypto');
const Subscription = require('../models/Subscription.model');
const DeveloperRepository = require('../repositories/developer.repository');
const EmployerRepository = require('../repositories/employer.repository');
const AuthRepository = require('../repositories/auth.repository');
const NotificationService = require('./notification.service');
const AuditService = require('./audit.service');
const AppError = require('../utils/AppError');
const logger = require('../utils/logger');

// ── Plan Configuration ────────────────────────────────────────────────────────
const PLANS = {
  developer_premium: {
    name: 'Developer Premium',
    amount: 5,
    currency: 'USD',
    durationDays: 30,
    description: 'TechTrust Developer Premium — Monthly',
  },
  employer_starter: {
    name: 'Employer Starter',
    amount: 30000,
    currency: 'NGN',
    durationDays: 30,
    description: 'TechTrust Employer Starter — Monthly',
  },
  employer_pro: {
    name: 'Employer Pro',
    amount: 60000,
    currency: 'NGN',
    durationDays: 30,
    description: 'TechTrust Employer Pro — Monthly',
  },
  employer_enterprise: {
    name: 'Employer Enterprise',
    amount: 0, // Custom pricing — contact sales
    currency: 'NGN',
    durationDays: 30,
    description: 'TechTrust Employer Enterprise — Monthly',
  },
};

// ── Flutterwave Configuration ─────────────────────────────────────────────────
const FLW_BASE_URL = 'https://api.flutterwave.com/v3';
const FLW_SECRET_KEY = process.env.FLUTTERWAVE_SECRET_KEY;
const FLW_WEBHOOK_SECRET = process.env.FLUTTERWAVE_WEBHOOK_SECRET;

// ── Stripe Configuration ──────────────────────────────────────────────────────
const STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY;
const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

// ── Flutterwave Payment Initiation ────────────────────────────────────────────
/**
 * @description Initiates a Flutterwave payment for a developer or employer plan.
 *              Returns a payment link the user is redirected to.
 *              Used for Nigerian/African payments.
 * @param       {string} userId   - MongoDB ObjectId of the user
 * @param       {string} planType - Plan type from PLANS config
 * @param       {string} email    - User email for payment
 * @param       {string} name     - User name for payment
 * @returns     {Promise<Object>} Payment link and transaction reference
 * @throws      {AppError} If plan not found or payment initiation fails
 */
const initiateFlutterwavePayment = async (userId, planType, email, name) => {
  const plan = PLANS[planType];

  if (!plan) {
    throw AppError.badRequest(`Invalid plan type: ${planType}`);
  }

  if (plan.amount === 0) {
    throw AppError.badRequest(
      'Enterprise plans require contacting our sales team. ' +
      'Please email us at enterprise@techtrust.io'
    );
  }

  // Generate unique transaction reference
  const txRef = `TT-${userId}-${Date.now()}`;

  // Create pending subscription record
  await Subscription.create({
    userId,
    planType,
    status: 'pending',
    amount: plan.amount,
    currency: plan.currency,
    provider: 'flutterwave',
    providerReference: txRef,
    billingCycle: 'monthly',
  });

  // Initiate Flutterwave payment
  try {
    const response = await axios.post(
      `${FLW_BASE_URL}/payments`,
      {
        tx_ref: txRef,
        amount: plan.amount,
        currency: plan.currency,
        redirect_url: `${process.env.FRONTEND_URL}/payment/callback`,
        customer: {
          email,
          name,
        },
        customizations: {
          title: 'TechTrust',
          description: plan.description,
          logo: `${process.env.FRONTEND_URL}/logo.png`,
        },
        meta: {
          userId,
          planType,
        },
      },
      {
        headers: {
          Authorization: `Bearer ${FLW_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        timeout: 15000,
      }
    );

    if (response.data.status !== 'success') {
      throw new Error('Flutterwave payment initiation failed');
    }

    await AuditService.log({
      actorId: userId,
      actorRole: 'developer',
      action: AuditService.ACTIONS.PAYMENT_INITIATED,
      outcome: 'success',
      metadata: { planType, provider: 'flutterwave', txRef },
    });

    logger.info('Flutterwave payment initiated', { userId, planType, txRef });

    return {
      paymentLink: response.data.data.link,
      txRef,
      amount: plan.amount,
      currency: plan.currency,
    };

  } catch (error) {
    // Clean up pending subscription on failure
    await Subscription.findOneAndDelete({
      userId,
      providerReference: txRef,
      status: 'pending',
    });

    logger.error('Flutterwave payment initiation failed', {
      userId,
      error: error.message,
    });

    throw AppError.internal(
      'Payment initiation failed. Please try again.'
    );
  }
};

// ── Flutterwave Webhook Handler ───────────────────────────────────────────────
/**
 * @description Verifies and processes Flutterwave payment webhooks.
 *              Called by Flutterwave when payment status changes.
 *              Constitution Standard 3 — webhook signature verified.
 * @param       {string} signature - Flutterwave webhook signature from header
 * @param       {Object} payload   - Webhook payload from Flutterwave
 * @returns     {Promise<void>}
 * @throws      {AppError} If signature verification fails
 */
const handleFlutterwaveWebhook = async (signature, payload) => {
  // Verify webhook signature
  const expectedSignature = FLW_WEBHOOK_SECRET;

  if (signature !== expectedSignature) {
    logger.warn('Invalid Flutterwave webhook signature', { signature });
    throw AppError.forbidden('Invalid webhook signature.');
  }

  const { event, data } = payload;

  if (event !== 'charge.completed') {
    logger.info('Flutterwave webhook event ignored', { event });
    return;
  }

  if (data.status !== 'successful') {
    // Payment failed — update subscription status
    await Subscription.findOneAndUpdate(
      { providerReference: data.tx_ref },
      { status: 'failed' }
    );

    logger.warn('Flutterwave payment failed', { txRef: data.tx_ref });
    return;
  }

  // Payment successful — activate subscription
  const subscription = await Subscription.findOne({
    providerReference: data.tx_ref,
  });

  if (!subscription) {
    logger.error('Subscription not found for Flutterwave webhook', {
      txRef: data.tx_ref,
    });
    return;
  }

  await activateSubscription(
    subscription,
    data.id.toString(),
    'flutterwave'
  );

  logger.info('Flutterwave payment successful', {
    userId: subscription.userId,
    planType: subscription.planType,
    txRef: data.tx_ref,
  });
};

// ── Stripe Payment Initiation ─────────────────────────────────────────────────
/**
 * @description Initiates a Stripe payment for international employers.
 *              Returns a Stripe checkout session URL.
 * @param       {string} userId   - MongoDB ObjectId of the user
 * @param       {string} planType - Plan type from PLANS config
 * @param       {string} email    - User email for payment
 * @returns     {Promise<Object>} Stripe checkout URL and session ID
 * @throws      {AppError} If Stripe keys not configured or initiation fails
 */
const initiateStripePayment = async (userId, planType, email) => {
  if (!STRIPE_SECRET_KEY) {
    throw AppError.internal('Stripe payments are not configured yet.');
  }

  const plan = PLANS[planType];
  if (!plan) {
    throw AppError.badRequest(`Invalid plan type: ${planType}`);
  }

  const txRef = `TT-STRIPE-${userId}-${Date.now()}`;

  // Create pending subscription
  await Subscription.create({
    userId,
    planType,
    status: 'pending',
    amount: plan.amount,
    currency: 'USD',
    provider: 'stripe',
    providerReference: txRef,
    billingCycle: 'monthly',
  });

  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        price_data: {
          currency: 'usd',
          product_data: {
            name: plan.name,
            description: plan.description,
          },
          unit_amount: plan.amount * 100, // Stripe uses cents
        },
        quantity: 1,
      }],
      mode: 'payment',
      success_url: `${process.env.FRONTEND_URL}/payment/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${process.env.FRONTEND_URL}/payment/cancelled`,
      metadata: { userId, planType, txRef },
    });

    await AuditService.log({
      actorId: userId,
      actorRole: 'employer',
      action: AuditService.ACTIONS.PAYMENT_INITIATED,
      outcome: 'success',
      metadata: { planType, provider: 'stripe', txRef },
    });

    logger.info('Stripe payment initiated', { userId, planType });

    return {
      checkoutUrl: session.url,
      sessionId: session.id,
      txRef,
    };

  } catch (error) {
    await Subscription.findOneAndDelete({
      userId,
      providerReference: txRef,
      status: 'pending',
    });

    logger.error('Stripe payment initiation failed', {
      userId,
      error: error.message,
    });

    throw AppError.internal('Payment initiation failed. Please try again.');
  }
};

// ── Stripe Webhook Handler ────────────────────────────────────────────────────
/**
 * @description Verifies and processes Stripe payment webhooks.
 * @param       {string} signature - Stripe webhook signature from header
 * @param       {Buffer} rawBody   - Raw request body for signature verification
 * @returns     {Promise<void>}
 */
const handleStripeWebhook = async (signature, rawBody) => {
  if (!STRIPE_SECRET_KEY) return;

  let event;
  try {
    const stripe = require('stripe')(STRIPE_SECRET_KEY);
    event = stripe.webhooks.constructEvent(
      rawBody,
      signature,
      STRIPE_WEBHOOK_SECRET
    );
  } catch (error) {
    logger.warn('Invalid Stripe webhook signature', { error: error.message });
    throw AppError.forbidden('Invalid Stripe webhook signature.');
  }

  if (event.type !== 'checkout.session.completed') {
    return;
  }

  const session = event.data.object;
  const { userId, planType, txRef } = session.metadata;

  const subscription = await Subscription.findOne({
    providerReference: txRef,
  });

  if (!subscription) {
    logger.error('Subscription not found for Stripe webhook', { txRef });
    return;
  }

  await activateSubscription(subscription, session.payment_intent, 'stripe');

  logger.info('Stripe payment successful', { userId, planType });
};

// ── Subscription Activation ───────────────────────────────────────────────────
/**
 * @description Activates a subscription after successful payment.
 *              Updates subscription record, user profile plan, and
 *              sends notification to user.
 * @param       {Object} subscription   - Subscription document
 * @param       {string} transactionId  - Provider transaction ID
 * @param       {string} provider       - Payment provider name
 * @returns     {Promise<void>}
 */
const activateSubscription = async (subscription, transactionId, provider) => {
  const plan = PLANS[subscription.planType];
  const startDate = new Date();
  const endDate = new Date(
    startDate.getTime() + plan.durationDays * 24 * 60 * 60 * 1000
  );

  // Update subscription record
  await Subscription.findByIdAndUpdate(subscription._id, {
    status: 'active',
    providerTransactionId: transactionId,
    startDate,
    endDate,
  });

  // Update user's profile plan
  const userId = subscription.userId;
  const planType = subscription.planType;

  if (planType === 'developer_premium') {
    await DeveloperRepository.updatePlan(userId, 'premium', endDate);
  } else if (planType.startsWith('employer_')) {
    const employerPlan = planType.replace('employer_', '');
    await EmployerRepository.updatePlan(userId, employerPlan, endDate);
  }

  // Log payment received
  await AuditService.log({
    actorId: userId,
    actorRole: planType.startsWith('developer') ? 'developer' : 'employer',
    action: AuditService.ACTIONS.PAYMENT_RECEIVED,
    targetId: subscription._id,
    targetType: 'Subscription',
    outcome: 'success',
    metadata: { planType, provider, transactionId },
  });

  // Send notification
  await NotificationService.notifyPaymentReceived(userId, planType);

  logger.info('Subscription activated', {
    userId,
    planType,
    endDate,
    provider,
  });
};

// ── Subscription Status ───────────────────────────────────────────────────────
/**
 * @description Returns current subscription status for a user.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<Object|null>} Active subscription or null
 */
const getSubscriptionStatus = async (userId) => {
  return await Subscription.findOne({
    userId,
    status: 'active',
    endDate: { $gt: new Date() },
  })
    .sort({ createdAt: -1 })
    .lean();
};

module.exports = {
  initiateFlutterwavePayment,
  handleFlutterwaveWebhook,
  initiateStripePayment,
  handleStripeWebhook,
  getSubscriptionStatus,
  PLANS,
};