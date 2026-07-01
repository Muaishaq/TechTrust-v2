/**
 * @file        server.js
 * @description TechTrust HTTP server entry point.
 *              Starts the Express application on the configured port.
 *              This file only handles server startup — all app logic is in app.js
 * @author      Muaishaq
 * @created     2026-06-30
 * @modified    2026-06-30
 */

'use strict';


const app = require('./app');
const { connectDB } = require('./config/db');
const logger = require('./utils/logger');

// ── Environment ───────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// ── Start Server ──────────────────────────────────────────────────────────────
const startServer = async () => {
  try {
    // Connect to MongoDB before accepting any requests
    await connectDB();

    // Start HTTP server
    const server = app.listen(PORT, () => {
      logger.info(`TechTrust API running in ${NODE_ENV} mode on port ${PORT}`);
    });

    // ── Graceful Shutdown ───────────────────────────────────────────────────
    // Handle process termination signals cleanly
    // Closes server and DB connection before exiting

    const shutdown = async (signal) => {
      logger.warn(`${signal} received — shutting down gracefully`);
      server.close(async () => {
        logger.info('HTTP server closed');
        process.exit(0);
      });
    };

    process.on('SIGTERM', () => shutdown('SIGTERM'));
    process.on('SIGINT', () => shutdown('SIGINT'));

    // ── Unhandled Errors ────────────────────────────────────────────────────
    // Catch any unhandled promise rejections or exceptions
    // Logs the error and shuts down — never silently swallow errors

    process.on('unhandledRejection', (reason) => {
      logger.error('Unhandled Promise Rejection:', { reason });
      shutdown('unhandledRejection');
    });

    process.on('uncaughtException', (error) => {
      logger.error('Uncaught Exception:', { error: error.message });
      shutdown('uncaughtException');
    });

  } catch (error) {
    logger.error('Failed to start TechTrust server:', { error: error.message });
    process.exit(1);
  }
};

startServer();