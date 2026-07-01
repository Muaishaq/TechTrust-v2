/**
 * @file        passport.js
 * @description TechTrust Passport.js GitHub OAuth strategy configuration.
 *              Configures how TechTrust handles GitHub OAuth authentication.
 *              Passport verifies the OAuth token and returns GitHub profile
 *              data which is then passed to the auth callback controller.
 *              Constitution Standard 3  — GitHub OAuth only, no passwords.
 *              Constitution Standard 8  — fault tolerant OAuth handling.
 * @author      Muaishaq
 * @created     2026-07-01
 * @modified    2026-07-01
 */

'use strict';

const passport = require('passport');
const GitHubStrategy = require('passport-github2').Strategy;
const logger = require('../utils/logger');

/**
 * @description Configures the GitHub OAuth 2.0 strategy for Passport.js.
 *              Called once during server startup via app.js.
 *              GitHub redirects to GITHUB_CALLBACK_URL after user approves.
 *              The verify callback receives the GitHub profile and passes
 *              it to the auth controller via done(null, profile).
 * @returns     {void}
 */
const configurePassport = () => {
  // ── GitHub OAuth Strategy ───────────────────────────────────────────────
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: process.env.GITHUB_CALLBACK_URL,
        // Request email scope — needed for user account creation
        scope: ['user:email'],
        // Pass request to callback for IP logging
        passReqToCallback: false,
      },

      /**
       * @description Verify callback — called after GitHub OAuth succeeds.
       *              Receives GitHub access token and profile data.
       *              We pass the raw profile to the controller — no DB
       *              operations here. DB logic lives in auth.service.js.
       * @param       {string}   accessToken  - GitHub OAuth access token
       * @param       {string}   refreshToken - GitHub OAuth refresh token
       * @param       {Object}   profile      - GitHub user profile data
       * @param       {Function} done         - Passport done callback
       * @returns     {void}
       */
      (accessToken, refreshToken, profile, done) => {
        try {
          // Log OAuth success — never log the tokens themselves
          logger.info('GitHub OAuth callback received', {
            githubId: profile.id,
            githubUsername: profile.username,
          });

          // Pass raw GitHub profile to controller
          // All business logic (find/create user) in auth.service.js
          return done(null, profile);

        } catch (error) {
          logger.error('GitHub OAuth strategy error', {
            error: error.message,
          });
          return done(error, null);
        }
      }
    )
  );

  // ── Session Serialization ───────────────────────────────────────────────
  // TechTrust uses JWT cookies — not Passport sessions
  // These are required by Passport but sessions are disabled in app.js
  // We serialize/deserialize the GitHub profile ID only

  /**
   * @description Serializes user into session (minimal data only).
   *              TechTrust uses JWT — sessions not actively used.
   * @param       {Object}   user - GitHub profile object
   * @param       {Function} done - Passport done callback
   */
  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  /**
   * @description Deserializes user from session.
   *              TechTrust uses JWT — sessions not actively used.
   * @param       {string}   id   - GitHub user ID from session
   * @param       {Function} done - Passport done callback
   */
  passport.deserializeUser((id, done) => {
    done(null, { id });
  });

  logger.info('Passport GitHub OAuth strategy configured');
};

module.exports = { configurePassport, passport };