"""
@file:        auth.py
@description: TechTrust AI Engine API key authentication utility.
              Verifies that all incoming requests to the AI engine
              come from the authorised TechTrust backend only.
              The AI engine is never exposed directly to the internet.
              Constitution Standard 3  — all endpoints authenticated.
              Constitution Standard 4  — unauthorised requests logged and blocked.
@author:      Muaishaq
@created:     2026-07-02
@modified:    2026-07-02
"""

import os
import logging
from functools import wraps
from flask import request, jsonify

logger = logging.getLogger(__name__)

# ── API Key Configuration ─────────────────────────────────────────────────────
# Must match AI_ENGINE_API_KEY in backend .env
API_KEY = os.getenv("API_KEY")


def require_api_key(f):
    """
    Description: Decorator that verifies the API key on every protected endpoint.
                 Checks the Authorization header for a Bearer token.
                 Rejects requests with missing or invalid keys.
                 Constitution Standard 3 — zero open routes.
    Args:        f (function): The route function to protect
    Returns:     function: Wrapped function with API key verification
    """
    @wraps(f)
    def decorated_function(*args, **kwargs):
        # Extract API key from Authorization header
        auth_header = request.headers.get("Authorization", "")

        if not auth_header.startswith("Bearer "):
            logger.warning(
                f"Unauthorised request — missing Bearer token | "
                f"IP: {request.remote_addr} | "
                f"Path: {request.path}"
            )
            return jsonify({
                "success": False,
                "message": "Unauthorised — valid API key required.",
            }), 401

        # Extract token from header
        provided_key = auth_header.split("Bearer ")[1].strip()

        # Validate against stored API key
        if not API_KEY:
            logger.error("API_KEY environment variable not configured")
            return jsonify({
                "success": False,
                "message": "AI engine not properly configured.",
            }), 500

        # Constant time comparison — prevents timing attacks
        if not _constant_time_compare(provided_key, API_KEY):
            logger.warning(
                f"Unauthorised request — invalid API key | "
                f"IP: {request.remote_addr} | "
                f"Path: {request.path}"
            )
            return jsonify({
                "success": False,
                "message": "Unauthorised — invalid API key.",
            }), 401

        return f(*args, **kwargs)

    return decorated_function


def _constant_time_compare(val1, val2):
    """
    Description: Compares two strings in constant time to prevent timing attacks.
                 A regular string comparison exits early on first mismatch,
                 leaking information about how many characters are correct.
                 This comparison always takes the same time regardless of match.
    Args:        val1 (str): First string to compare
                 val2 (str): Second string to compare
    Returns:     bool: True if strings are identical
    """
    if len(val1) != len(val2):
        return False

    result = 0
    for a, b in zip(val1, val2):
        result |= ord(a) ^ ord(b)

    return result == 0