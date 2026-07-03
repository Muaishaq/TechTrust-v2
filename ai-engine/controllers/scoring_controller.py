"""
@file:        scoring_controller.py
@description: TechTrust AI Engine scoring controller.
              Handles HTTP layer for all scoring endpoints.
              Validates input, calls scoring services, returns results.
              Controllers only handle HTTP — all logic in services.
              Constitution Standard 3  — sanitized responses only.
              Constitution Standard 10 — strict layer separation.
@author:      Muaishaq
@created:     2026-07-02
@modified:    2026-07-02
"""

from flask import request, jsonify
from utils.logger import get_logger
from utils.validators import validate_scoring_request, sanitize_github_data
from services.scorer import run_scoring
from services.coach import generate_insights

logger = get_logger(__name__)


def score_developer():
    """
    Description: Handles POST /score endpoint.
                 Receives GitHub data from TechTrust backend,
                 runs AI scoring, generates coaching insights,
                 and returns complete verification results.
    Returns:     JSON response with trust score and coaching insights
    """
    # ── Parse Request Body ────────────────────────────────────────────────
    try:
        data = request.get_json(force=True, silent=True)
    except Exception:
        return jsonify({
            "success": False,
            "message": "Invalid JSON in request body.",
        }), 400

    if data is None:
        return jsonify({
            "success": False,
            "message": "Request body must be valid JSON.",
        }), 400

    # ── Validate Input ────────────────────────────────────────────────────
    is_valid, error_message = validate_scoring_request(data)
    if not is_valid:
        logger.warning(f"Invalid scoring request: {error_message}")
        return jsonify({
            "success": False,
            "message": f"Validation failed: {error_message}",
        }), 400

    # ── Extract and Sanitize GitHub Data ──────────────────────────────────
    github_data = sanitize_github_data(data["githubData"])
    username = github_data.get("username", "unknown")

    logger.info(f"Scoring request received for username: {username}")

    # ── Run Scoring Engine ────────────────────────────────────────────────
    try:
        scoring_result = run_scoring(github_data)
    except Exception as e:
        logger.error(f"Scoring engine error for {username}: {str(e)}")
        return jsonify({
            "success": False,
            "message": "Scoring engine encountered an error. Please try again.",
        }), 500

    # ── Generate Coaching Insights ────────────────────────────────────────
    try:
        coaching_insights = generate_insights(scoring_result)
    except Exception as e:
        logger.error(f"Coaching engine error for {username}: {str(e)}")
        # Coaching failure is non-fatal — return scores without insights
        coaching_insights = []

    # ── Build Response ────────────────────────────────────────────────────
    response = {
        "success": True,
        "message": "Scoring completed successfully",
        "data": {
            "trustScore":        scoring_result.get("trustScore", 0),
            "trustLabel":        scoring_result.get("trustLabel", ""),
            "confidence":        scoring_result.get("confidence", 0),
            "skillScores":       scoring_result.get("skillScores", {}),
            "flags":             scoring_result.get("flags", []),
            "coachingInsights":  coaching_insights,
            "scoredAt":          scoring_result.get("scoredAt", ""),
            "username":          username,
        },
    }

    logger.info(
        f"Scoring complete for {username} — "
        f"Trust Score: {scoring_result.get('trustScore', 0)} — "
        f"Insights: {len(coaching_insights)}"
    )

    return jsonify(response), 200