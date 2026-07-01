/**
 * @file        asyncHandler.js
 * @description TechTrust async route handler wrapper.
 *              Wraps all async controller functions in a try-catch block.
 *              Eliminates the need for try-catch in every controller.
 *              Any error thrown inside a controller is automatically passed
 *              to Express global error handler via next(error).
 *              Constitution Standard 3  — all async handlers wrapped.
 *              Constitution Standard 8  — no unhandled promise rejections.
 * @author      Muaishaq
 * @created     2026-06-30
 * @modified    2026-06-30
 */

'use strict';

/**
 * @description Wraps an async Express route handler in a try-catch.
 *              Catches any thrown error and passes it to next()
 *              so the global error handler in app.js processes it.
 * @param       {Function} fn - Async controller function to wrap
 * @returns     {Function} Express middleware function with error handling
 *
 * @example
 * // Without asyncHandler — repetitive try-catch everywhere:
 * const getProfile = async (req, res, next) => {
 *   try {
 *     const profile = await ProfileService.get(req.user.id);
 *     res.json({ success: true, data: profile });
 *   } catch (error) {
 *     next(error);
 *   }
 * };
 *
 * // With asyncHandler — clean and consistent:
 * const getProfile = asyncHandler(async (req, res) => {
 *   const profile = await ProfileService.get(req.user.id);
 *   res.json({ success: true, data: profile });
 * });
 */
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch(next);
};

module.exports = asyncHandler;