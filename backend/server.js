/**
 * @file        server.js
 * @description HTTP server entry point — loads environment and starts Express
 * @author      Muaishaq
 * @created     2026-06-25
 * @modified    2026-06-25
 */

require('dotenv').config();

const app = require('./app');
const logger = require('./utils/logger');

const PORT = process.env.PORT || 5000;

/**
 * @description Starts the TechTrust HTTP server on the configured port
 * @returns     {void}
 */
const startServer = () => {
  app.listen(PORT, () => {
    logger.info(`TechTrust API running on port ${PORT}`, {
      environment: process.env.NODE_ENV || 'development',
    });
  });
};

startServer();
