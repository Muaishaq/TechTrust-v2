/**
 * @file        notification.controller.js
 * @description TechTrust notification controller.
 *              Handles HTTP layer for all notification endpoints.
 *              Controllers only handle req/res — all logic in notification.service.js.
 *              Constitution Standard 10 — strict layer separation enforced.
 *              Constitution Standard 3  — sanitized responses only.
 *              SPECIFICATION.md Section 7 — notification system reference.
 * @author      Muaishaq
 * @created     2026-07-04
 * @modified    2026-07-04
 */

'use strict';

const NotificationService = require('../services/notification.service');
const asyncHandler = require('../utils/asyncHandler');
const AppError = require('../utils/AppError');
const {
  successResponse,
  paginatedResponse,
  noContentResponse,
} = require('../utils/response');
const { getPaginationParams, buildPaginationMeta } = require('../utils/pagination');

// ── Get Notifications ─────────────────────────────────────────────────────────
/**
 * @description Returns paginated notifications for the authenticated user.
 *              Supports filtering by unread only.
 * @param       {Object} req       - Express request object
 * @param       {Object} req.query - Query parameters
 * @param       {Object} res       - Express response object
 * @returns     {Promise<void>}
 */
const getNotifications = asyncHandler(async (req, res) => {
  const { page, limit } = getPaginationParams(req.query, 20);
  const unreadOnly = req.query.unreadOnly === 'true';

  const result = await NotificationService.getUserNotifications(
    req.user.id,
    { unreadOnly, page, limit }
  );

  const pagination = buildPaginationMeta(result.total, page, limit);

  return paginatedResponse(
    res,
    200,
    'Notifications retrieved successfully',
    result.notifications,
    { ...pagination, unreadCount: result.unreadCount }
  );
});

/**
 * @description Returns the count of unread notifications.
 *              Used by frontend to show notification badge count.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const getUnreadCount = asyncHandler(async (req, res) => {
  const count = await NotificationService.getUnreadCount(req.user.id);

  return successResponse(
    res,
    200,
    'Unread count retrieved successfully',
    { unreadCount: count }
  );
});

// ── Mark As Read ──────────────────────────────────────────────────────────────
/**
 * @description Marks a single notification as read.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.id  - Notification ID
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const markAsRead = asyncHandler(async (req, res) => {
  const { id: notificationId } = req.params;

  if (!notificationId) {
    throw AppError.badRequest('Notification ID is required.');
  }

  const notification = await NotificationService.markAsRead(
    req.user.id,
    notificationId
  );

  return successResponse(
    res,
    200,
    'Notification marked as read',
    { notification }
  );
});

/**
 * @description Marks all notifications as read for the authenticated user.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const markAllAsRead = asyncHandler(async (req, res) => {
  const count = await NotificationService.markAllAsRead(req.user.id);

  return successResponse(
    res,
    200,
    `${count} notification(s) marked as read`
  );
});

// ── Delete Notifications ──────────────────────────────────────────────────────
/**
 * @description Deletes a single notification.
 * @param       {Object} req            - Express request object
 * @param       {Object} req.params     - URL parameters
 * @param       {string} req.params.id  - Notification ID
 * @param       {Object} res            - Express response object
 * @returns     {Promise<void>}
 */
const deleteNotification = asyncHandler(async (req, res) => {
  const { id: notificationId } = req.params;

  if (!notificationId) {
    throw AppError.badRequest('Notification ID is required.');
  }

  await NotificationService.deleteNotification(req.user.id, notificationId);

  return noContentResponse(res);
});

/**
 * @description Deletes all read notifications for the authenticated user.
 *              Keeps unread notifications intact.
 * @param       {Object} req - Express request object
 * @param       {Object} res - Express response object
 * @returns     {Promise<void>}
 */
const clearReadNotifications = asyncHandler(async (req, res) => {
  const count = await NotificationService.clearReadNotifications(req.user.id);

  return successResponse(
    res,
    200,
    `${count} read notification(s) cleared successfully`
  );
});

module.exports = {
  getNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  clearReadNotifications,
};