"""
@file:        logger.py
@description: TechTrust AI Engine structured logging utility.
              Provides consistent logging across the entire AI engine.
              Sanitizes sensitive data before logging.
              Constitution Standard 3  — sensitive data never logged.
              Constitution Standard 4  — all significant events logged.
@author:      Muaishaq
@created:     2026-07-02
@modified:    2026-07-02
"""

import logging
import os
from datetime import datetime

# ── Sensitive Fields ──────────────────────────────────────────────────────────
# These fields are redacted before any log entry is written
SENSITIVE_FIELDS = [
    "api_key",
    "token",
    "password",
    "secret",
    "authorization",
    "github_token",
]

# ── Log Format ────────────────────────────────────────────────────────────────
LOG_FORMAT = "%(asctime)s [%(levelname)s] %(name)s: %(message)s"
DATE_FORMAT = "%Y-%m-%d %H:%M:%S"


def get_logger(name):
    """
    Description: Creates and returns a configured logger instance.
                 All loggers share the same format and level settings.
    Args:        name (str): Logger name — use __name__ from calling module
    Returns:     logging.Logger: Configured logger instance
    """
    logger = logging.getLogger(name)

    # Avoid adding duplicate handlers if logger already configured
    if logger.handlers:
        return logger

    # Set log level from environment
    log_level = os.getenv("LOG_LEVEL", "DEBUG")
    logger.setLevel(getattr(logging, log_level, logging.DEBUG))

    # ── Console Handler ───────────────────────────────────────────────────
    console_handler = logging.StreamHandler()
    console_handler.setFormatter(logging.Formatter(LOG_FORMAT, DATE_FORMAT))
    logger.addHandler(console_handler)

    return logger


def sanitize_log_data(data):
    """
    Description: Removes sensitive fields from data before logging.
                 Recursively sanitizes nested dictionaries.
                 Constitution Standard 3 — sensitive data never logged.
    Args:        data (dict): Data object to sanitize
    Returns:     dict: Sanitized copy of the data object
    """
    if not isinstance(data, dict):
        return data

    sanitized = {}
    for key, value in data.items():
        if key.lower() in SENSITIVE_FIELDS:
            sanitized[key] = "[REDACTED]"
        elif isinstance(value, dict):
            sanitized[key] = sanitize_log_data(value)
        elif isinstance(value, list):
            sanitized[key] = [
                sanitize_log_data(item) if isinstance(item, dict) else item
                for item in value
            ]
        else:
            sanitized[key] = value

    return sanitized


def log_scoring_event(logger, username, event, metadata=None):
    """
    Description: Logs a scoring engine event with consistent format.
                 Never logs raw GitHub data or personal identifiers.
    Args:        logger   (Logger): Logger instance from get_logger()
                 username (str):    GitHub username being scored
                 event    (str):    Event description
                 metadata (dict):   Additional context (optional)
    Returns:     None
    """
    log_entry = {
        "event": event,
        "username": username,
        "timestamp": datetime.utcnow().isoformat(),
    }

    if metadata:
        # Sanitize metadata before logging
        log_entry["metadata"] = sanitize_log_data(metadata)

    logger.info(f"SCORING EVENT | {log_entry}")