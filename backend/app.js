/**
 * @file        app.js
 * @description Express application setup — middleware and route mounting
 * @author      Muaishaq
 * @created     2026-06-25
 * @modified    2026-06-25
 */

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const cookieParser = require('cookie-parser');

const app = express();

app.use(helmet());
app.use(
  cors({
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    credentials: true,
  }),
);
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));
app.use(cookieParser(process.env.COOKIE_SECRET));

/**
 * @description Health check endpoint — confirms the API is running
 * @param       {import('express').Request} req - Incoming request
 * @param       {import('express').Response} res - Outgoing response
 * @returns     {import('express').Response} JSON success response
 */
app.get('/api/v1/health', (req, res) => {
  return res.status(200).json({
    success: true,
    message: 'TechTrust API is running',
    data: {
      environment: process.env.NODE_ENV || 'development',
      timestamp: new Date().toISOString(),
    },
  });
});

module.exports = app;
