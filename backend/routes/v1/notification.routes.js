/**
 * @file        notification.routes.js
 * @description TechTrust notification routes.
 *              Endpoints:
 *              GET    /api/v1/notifications              - Get all notifications
 *              GET    /api/v1/notifications/unread-count - Get unread count
 *              PUT    /api/v1/notifications/read-all     - Mark all as read
 *              DELETE /api/v1/notifications/read         - Clear read notifications
 *              PUT    /api/v1/notifications/:id/read     - Mark one as read
 *              DELETE /api/v1/notifications/:id          - Delete one notification
 *              All routes require authentication.
 *              Constitution Standard 3  — all routes authenticated.
 *              Constitution Standard 10 — all endpoints documented.
 * @author      Muaishaq
 * @created     2026-07-04
 * @modified    2026-07-04
 */

'use strict';

const express = require('express');
const router = express.Router();
const notificationController = require('../../controllers/notification.controller');
const { authenticate } = require('../../middleware/auth.middleware');

// All notification routes require authentication
router.use(authenticate);

// ── List & Count ──────────────────────────────────────────────────────────────

/**
 * GET /api/v1/notifications
 * Returns paginated notifications for the authenticated user.
 * Query: unreadOnly=true|false, page, limit
 */
router.get(
  '/',
  notificationController.getNotifications
);

/**
 * GET /api/v1/notifications/unread-count
 * Returns count of unread notifications.
 * Used by frontend notification bell badge.
 * Must be BEFORE /:id route to avoid conflict.
 */
router.get(
  '/unread-count',
  notificationController.getUnreadCount
);

// ── Bulk Actions ──────────────────────────────────────────────────────────────

/**
 * PUT /api/v1/notifications/read-all
 * Marks all notifications as read for the authenticated user.
 * Must be BEFORE /:id route to avoid conflict.
 */
router.put(
  '/read-all',
  notificationController.markAllAsRead
);

/**
 * DELETE /api/v1/notifications/read
 * Deletes all read notifications for the authenticated user.
 * Keeps unread notifications intact.
 * Must be BEFORE /:id route to avoid conflict.
 */
router.delete(
  '/read',
  notificationController.clearReadNotifications
);

// ── Single Notification Actions ───────────────────────────────────────────────

/**
 * PUT /api/v1/notifications/:id/read
 * Marks a single notification as read.
 * Params: id = notification MongoDB ObjectId
 */
router.put(
  '/:id/read',
  notificationController.markAsRead
);

/**
 * DELETE /api/v1/notifications/:id
 * Deletes a single notification.
 * Params: id = notification MongoDB ObjectId
 */
router.delete(
  '/:id',
  notificationController.deleteNotification
);

module.exports = router;