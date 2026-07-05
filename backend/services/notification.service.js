/**
 * @file        notification.service.js
 * @description TechTrust notification service.
 *              Creates, retrieves, and manages all platform notifications.
 *              Called by other services when significant events occur.
 *              Constitution Standard 8  — notification failures never crash main flow.
 *              Constitution Standard 10 — strict layer separation.
 *              SPECIFICATION.md Section 7 — notification triggers reference.
 * @author      Muaishaq
 * @created     2026-07-04
 * @modified    2026-07-04
 */

'use strict';

const Notification = require('../models/Notification.model');
const logger = require('../utils/logger');
const AppError = require('../utils/AppError');

// ── Notification Templates ────────────────────────────────────────────────────
// Pre-built notification content for each event type
// Ensures consistent messaging across the platform
const NOTIFICATION_TEMPLATES = {
  verification_complete: {
    title: 'Verification Complete!',
    message: 'Your TechTrust verification is complete. Your Trust Score is now live on your profile.',
    actionUrl: '/developer/verification',
    actionLabel: 'View Results',
    priority: 'high',
  },
  verification_flagged: {
    title: 'Verification Under Review',
    message: 'Your verification has been flagged for manual review. Our team will review it within 48 hours.',
    actionUrl: '/developer/verification',
    actionLabel: 'View Status',
    priority: 'high',
  },
  trust_score_changed: {
    title: 'Your Trust Score Updated',
    message: 'Your TechTrust Trust Score has been updated. Check your profile to see your new score.',
    actionUrl: '/developer/profile',
    actionLabel: 'View Profile',
    priority: 'normal',
  },
  coaching_insight_available: {
    title: 'New Coaching Insight',
    message: 'TechTrust has identified a new coaching insight to help you improve your profile.',
    actionUrl: '/developer/coaching',
    actionLabel: 'View Insight',
    priority: 'normal',
  },
  job_match_found: {
    title: 'New Job Match',
    message: 'A new job posting matches your verified profile and skills.',
    actionUrl: '/developer/jobs',
    actionLabel: 'View Job',
    priority: 'high',
  },
  badge_updated: {
    title: 'Your TechTrust Badge Updated',
    message: 'Your TechTrust credibility badge has been updated with your latest verification.',
    actionUrl: '/developer/badge',
    actionLabel: 'View Badge',
    priority: 'normal',
  },
  premium_expiring: {
    title: 'Premium Plan Expiring Soon',
    message: 'Your TechTrust Premium plan expires in 7 days. Renew to keep your premium benefits.',
    actionUrl: '/developer/subscription',
    actionLabel: 'Renew Plan',
    priority: 'urgent',
  },
  developer_applied: {
    title: 'New Job Application',
    message: 'A verified developer has applied to one of your job postings.',
    actionUrl: '/employer/jobs',
    actionLabel: 'View Application',
    priority: 'high',
  },
  search_match_available: {
    title: 'New Developer Match',
    message: 'A new verified developer matches your saved search criteria.',
    actionUrl: '/employer/search',
    actionLabel: 'View Developer',
    priority: 'normal',
  },
  api_quota_warning: {
    title: 'API Quota Warning',
    message: 'You have used 80% of your monthly API verification quota.',
    actionUrl: '/employer/subscription',
    actionLabel: 'Upgrade Plan',
    priority: 'urgent',
  },
  subscription_expiring: {
    title: 'Subscription Expiring Soon',
    message: 'Your TechTrust subscription expires in 7 days. Renew to maintain access.',
    actionUrl: '/employer/subscription',
    actionLabel: 'Renew Now',
    priority: 'urgent',
  },
  account_suspended: {
    title: 'Account Suspended',
    message: 'Your TechTrust account has been suspended. Please contact support for assistance.',
    actionUrl: null,
    actionLabel: null,
    priority: 'urgent',
  },
  account_activated: {
    title: 'Account Reactivated',
    message: 'Your TechTrust account has been reactivated. Welcome back!',
    actionUrl: '/dashboard',
    actionLabel: 'Go to Dashboard',
    priority: 'high',
  },
  payment_received: {
    title: 'Payment Successful',
    message: 'Your payment was received successfully. Your plan has been activated.',
    actionUrl: '/account',
    actionLabel: 'View Account',
    priority: 'high',
  },
  payment_failed: {
    title: 'Payment Failed',
    message: 'Your payment could not be processed. Please update your payment details.',
    actionUrl: '/account/billing',
    actionLabel: 'Update Payment',
    priority: 'urgent',
  },
  system_announcement: {
    title: 'TechTrust Announcement',
    message: 'TechTrust has an important announcement for you.',
    actionUrl: null,
    actionLabel: null,
    priority: 'normal',
  },
};

// ── Core Notification Functions ───────────────────────────────────────────────
/**
 * @description Creates a new notification for a user.
 *              This is a fire-and-forget operation — never blocks main flow.
 *              Constitution Standard 8 — notification failures are caught and logged.
 * @param       {string} userId       - MongoDB ObjectId of the recipient
 * @param       {string} type         - Notification type from NOTIFICATION_TEMPLATES
 * @param       {Object} overrides    - Optional field overrides for this notification
 * @param       {string} overrides.message    - Custom message
 * @param       {string} overrides.actionUrl  - Custom action URL
 * @param       {Object} relatedResource      - Related resource details
 * @param       {string} relatedResource.id   - Related resource ID
 * @param       {string} relatedResource.type - Related resource type
 * @returns     {Promise<Object|null>} Created notification or null on failure
 */
const createNotification = async (
  userId,
  type,
  overrides = {},
  relatedResource = {}
) => {
  try {
    const template = NOTIFICATION_TEMPLATES[type];

    if (!template) {
      logger.error('Unknown notification type', { type });
      return null;
    }

    const notification = await Notification.create({
      userId,
      type,
      title: overrides.title || template.title,
      message: overrides.message || template.message,
      actionUrl: overrides.actionUrl || template.actionUrl,
      actionLabel: overrides.actionLabel || template.actionLabel,
      priority: overrides.priority || template.priority,
      relatedId: relatedResource.id || null,
      relatedType: relatedResource.type || null,
    });

    logger.info('Notification created', {
      userId,
      type,
      notificationId: notification._id,
    });

    return notification.toJSON();

  } catch (error) {
    // Notification failure must NEVER crash the main application flow
    logger.error('Failed to create notification', {
      error: error.message,
      userId,
      type,
    });
    return null;
  }
};

/**
 * @description Creates notifications for multiple users simultaneously.
 *              Used for bulk announcements and system notifications.
 * @param       {Array}  userIds - Array of MongoDB ObjectIds
 * @param       {string} type    - Notification type
 * @param       {Object} overrides - Optional field overrides
 * @returns     {Promise<void>}
 */
const createBulkNotifications = async (userIds, type, overrides = {}) => {
  try {
    const template = NOTIFICATION_TEMPLATES[type];
    if (!template) return;

    const notifications = userIds.map((userId) => ({
      userId,
      type,
      title: overrides.title || template.title,
      message: overrides.message || template.message,
      actionUrl: overrides.actionUrl || template.actionUrl,
      actionLabel: overrides.actionLabel || template.actionLabel,
      priority: overrides.priority || template.priority,
    }));

    await Notification.insertMany(notifications, { ordered: false });

    logger.info('Bulk notifications created', {
      count: userIds.length,
      type,
    });

  } catch (error) {
    logger.error('Failed to create bulk notifications', {
      error: error.message,
      type,
      userCount: userIds.length,
    });
  }
};

// ── Retrieval Functions ───────────────────────────────────────────────────────
/**
 * @description Returns paginated notifications for a user.
 * @param       {string}  userId   - MongoDB ObjectId of the user
 * @param       {Object}  options  - Query options
 * @param       {boolean} options.unreadOnly - Return only unread notifications
 * @param       {number}  options.page       - Page number
 * @param       {number}  options.limit      - Items per page
 * @returns     {Promise<Object>} Notifications and metadata
 */
const getUserNotifications = async (userId, options = {}) => {
  const {
    unreadOnly = false,
    page = 1,
    limit = 20,
  } = options;

  const skip = (page - 1) * limit;
  const query = { userId };

  if (unreadOnly) {
    query.isRead = false;
  }

  const [notifications, total, unreadCount] = await Promise.all([
    Notification.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    Notification.countDocuments(query),
    Notification.countDocuments({ userId, isRead: false }),
  ]);

  return {
    notifications,
    total,
    unreadCount,
    page,
    limit,
    totalPages: Math.ceil(total / limit),
  };
};

/**
 * @description Returns the count of unread notifications for a user.
 *              Used by frontend to show notification badge count.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<number>} Unread notification count
 */
const getUnreadCount = async (userId) => {
  return await Notification.countDocuments({ userId, isRead: false });
};

// ── Status Update Functions ───────────────────────────────────────────────────
/**
 * @description Marks a single notification as read.
 * @param       {string} userId         - MongoDB ObjectId of the user
 * @param       {string} notificationId - MongoDB ObjectId of the notification
 * @returns     {Promise<Object>} Updated notification
 * @throws      {AppError} If notification not found or not owned by user
 */
const markAsRead = async (userId, notificationId) => {
  const notification = await Notification.findOneAndUpdate(
    { _id: notificationId, userId },
    { isRead: true, readAt: new Date() },
    { new: true }
  ).lean();

  if (!notification) {
    throw AppError.notFound('Notification not found.');
  }

  return notification;
};

/**
 * @description Marks all notifications as read for a user.
 *              Used when user clicks "Mark all as read".
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<number>} Number of notifications marked as read
 */
const markAllAsRead = async (userId) => {
  const result = await Notification.updateMany(
    { userId, isRead: false },
    { isRead: true, readAt: new Date() }
  );

  logger.info('All notifications marked as read', {
    userId,
    count: result.modifiedCount,
  });

  return result.modifiedCount;
};

/**
 * @description Deletes a single notification.
 * @param       {string} userId         - MongoDB ObjectId of the user
 * @param       {string} notificationId - MongoDB ObjectId of the notification
 * @returns     {Promise<void>}
 * @throws      {AppError} If notification not found or not owned by user
 */
const deleteNotification = async (userId, notificationId) => {
  const result = await Notification.findOneAndDelete({
    _id: notificationId,
    userId,
  });

  if (!result) {
    throw AppError.notFound('Notification not found.');
  }
};

/**
 * @description Deletes all read notifications for a user.
 *              Keeps unread notifications intact.
 * @param       {string} userId - MongoDB ObjectId of the user
 * @returns     {Promise<number>} Number of notifications deleted
 */
const clearReadNotifications = async (userId) => {
  const result = await Notification.deleteMany({
    userId,
    isRead: true,
  });

  return result.deletedCount;
};

// ── Event-Triggered Notification Helpers ─────────────────────────────────────
// These are convenience functions called by other services
// when specific platform events occur

/**
 * @description Notifies developer that their verification is complete.
 * @param       {string} userId     - Developer's user ID
 * @param       {number} trustScore - Their new trust score
 * @returns     {Promise<void>}
 */
const notifyVerificationComplete = async (userId, trustScore) => {
  await createNotification(
    userId,
    'verification_complete',
    {
      message: `Your verification is complete. Your Trust Score is ${trustScore}/100.`,
    }
  );
};

/**
 * @description Notifies developer that their verification was flagged.
 * @param       {string} userId - Developer's user ID
 * @returns     {Promise<void>}
 */
const notifyVerificationFlagged = async (userId) => {
  await createNotification(userId, 'verification_flagged');
};

/**
 * @description Notifies user that their account was suspended.
 * @param       {string} userId  - User's ID
 * @param       {string} reason  - Suspension reason
 * @returns     {Promise<void>}
 */
const notifyAccountSuspended = async (userId, reason) => {
  await createNotification(
    userId,
    'account_suspended',
    {
      message: `Your account has been suspended. Reason: ${reason}. Contact support for assistance.`,
    }
  );
};

/**
 * @description Notifies user that their account was reactivated.
 * @param       {string} userId - User's ID
 * @returns     {Promise<void>}
 */
const notifyAccountActivated = async (userId) => {
  await createNotification(userId, 'account_activated');
};

/**
 * @description Notifies user of successful payment.
 * @param       {string} userId   - User's ID
 * @param       {string} planType - The plan they subscribed to
 * @returns     {Promise<void>}
 */
const notifyPaymentReceived = async (userId, planType) => {
  await createNotification(
    userId,
    'payment_received',
    {
      message: `Payment received successfully. Your ${planType} plan is now active.`,
    }
  );
};

module.exports = {
  createNotification,
  createBulkNotifications,
  getUserNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
  notifyVerificationComplete,
  notifyVerificationFlagged,
  notifyAccountSuspended,
  notifyAccountActivated,
  notifyPaymentReceived,
  NOTIFICATION_TEMPLATES,
};