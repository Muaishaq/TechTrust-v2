/**
 * @file        db.js
 * @description TechTrust MongoDB Atlas connection configuration.
 *              Handles connection, reconnection, and disconnection cleanly.
 *              Constitution Standard 3  — database uses least-privilege credentials.
 *              Constitution Standard 8  — fault tolerant, retries on failure.
 *              Constitution Standard 10 — connection pooling for scalability.
 * @author      Muaishaq
 * @created     2026-06-30
 * @modified    2026-06-30
 */

'use strict';

const mongoose = require('mongoose');
const logger = require('../utils/logger');

// ── Connection Options ────────────────────────────────────────────────────────
// Optimised for production scalability and fault tolerance
// Constitution Standard 10 — designed for horizontal scaling
const CONNECTION_OPTIONS = {
  maxPoolSize: 10,          // Maximum 10 concurrent connections in the pool
  minPoolSize: 2,           // Keep minimum 2 connections alive
  socketTimeoutMS: 45000,   // Close sockets after 45 seconds of inactivity
  serverSelectionTimeoutMS: 5000, // Fail fast if no server found in 5 seconds
  heartbeatFrequencyMS: 10000,    // Check server health every 10 seconds
  retryWrites: true,        // Automatically retry failed write operations
  w: 'majority',            // Write concern — confirmed by majority of nodes
};

// ── Retry Configuration ───────────────────────────────────────────────────────
const MAX_RETRIES = 5;
const RETRY_DELAY_MS = 5000; // 5 seconds between retries

/**
 * @description Waits for a specified number of milliseconds
 * @param       {number} ms - Milliseconds to wait
 * @returns     {Promise<void>}
 */
const wait = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * @description Connects to MongoDB Atlas with retry logic.
 *              Retries up to MAX_RETRIES times before giving up.
 *              Constitution Standard 8 — fault tolerant with automatic retries.
 * @param       {number} retryCount - Current retry attempt (internal use)
 * @returns     {Promise<void>}
 * @throws      {Error} If connection fails after all retries
 */
const connectDB = async (retryCount = 0) => {
  try {
    const mongoURI = process.env.MONGODB_URI;

    // Validate URI exists — never expose it in logs
    if (!mongoURI) {
      throw new Error('MONGODB_URI environment variable is not defined');
    }

    logger.info(`Connecting to MongoDB Atlas... (attempt ${retryCount + 1})`);

    await mongoose.connect(mongoURI, CONNECTION_OPTIONS);

    logger.info('MongoDB Atlas connected successfully');

  } catch (error) {
    logger.error('MongoDB connection failed:', {
      message: error.message,
      attempt: retryCount + 1,
    });

    // Retry if under max retries
    if (retryCount < MAX_RETRIES - 1) {
      logger.warn(`Retrying MongoDB connection in ${RETRY_DELAY_MS / 1000} seconds...`);
      await wait(RETRY_DELAY_MS);
      return connectDB(retryCount + 1);
    }

    // All retries exhausted — throw to crash the server cleanly
    throw new Error(`MongoDB connection failed after ${MAX_RETRIES} attempts: ${error.message}`);
  }
};

// ── Connection Event Listeners ────────────────────────────────────────────────
// Monitor connection health throughout the server lifetime
// Constitution Standard 4 — alert on connection issues

mongoose.connection.on('connected', () => {
  logger.info('Mongoose connected to MongoDB Atlas');
});

mongoose.connection.on('error', (error) => {
  logger.error('Mongoose connection error:', { message: error.message });
});

mongoose.connection.on('disconnected', () => {
  logger.warn('Mongoose disconnected from MongoDB Atlas');
});

mongoose.connection.on('reconnected', () => {
  logger.info('Mongoose reconnected to MongoDB Atlas');
});

// ── Graceful Disconnection ────────────────────────────────────────────────────
/**
 * @description Cleanly closes the MongoDB connection.
 *              Called during server shutdown to prevent data corruption.
 * @returns     {Promise<void>}
 */
const disconnectDB = async () => {
  try {
    await mongoose.connection.close();
    logger.info('MongoDB connection closed cleanly');
  } catch (error) {
    logger.error('Error closing MongoDB connection:', { message: error.message });
  }
};

module.exports = { connectDB, disconnectDB };