"""
@file:        scoring_routes.py
@description: TechTrust AI Engine scoring routes.
              Endpoints:
              POST /score  - Score a developer's GitHub data
              GET  /health - Health check (registered in app.py)
              All endpoints except /health require API key authentication.
              Constitution Standard 3  — all routes authenticated.
              Constitution Standard 10 — all endpoints documented.
@author:      Muaishaq
@created:     2026-07-02
@modified:    2026-07-02
"""

from flask import Blueprint
from utils.auth import require_api_key
from controllers.scoring_controller import score_developer

# ── Blueprint ─────────────────────────────────────────────────────────────────
scoring_blueprint = Blueprint("scoring", __name__)


# ── Scoring Endpoint ──────────────────────────────────────────────────────────
@scoring_blueprint.route("/score", methods=["POST"])
@require_api_key
def score():
    """
    POST /score
    Scores a developer's GitHub data and returns trust score + coaching insights.
    Requires: Bearer API key in Authorization header.
    Body: { githubData: { username, profile, repositories, languages, activity } }
    Returns: { success, message, data: { trustScore, skillScores, coachingInsights } }
    """
    return score_developer()