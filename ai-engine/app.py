"""
@file:        app.py
@description: TechTrust AI Scoring Engine — Flask application entry point.
              Initialises the Flask app, registers all routes, and configures
              security middleware. This service receives GitHub data from the
              Node.js backend and returns trust scores and coaching insights.
              Constitution Standard 3  — API key authentication on all endpoints.
              Constitution Standard 8  — fault tolerant, graceful error handling.
@author:      Muaishaq
@created:     2026-07-02
@modified:    2026-07-02
"""

import os
import logging
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv

# Load environment variables before anything else
load_dotenv()

# ── Import Route Blueprints ───────────────────────────────────────────────────
from routes.scoring_routes import scoring_blueprint

# ── Flask App Initialization ──────────────────────────────────────────────────
app = Flask(__name__)

# ── CORS Configuration ────────────────────────────────────────────────────────
# AI engine only accepts requests from the TechTrust backend
# Never exposed directly to the internet
CORS(app, resources={
    r"/*": {
        "origins": [
            "http://localhost:5000",      # Backend development
            os.getenv("BACKEND_URL", ""), # Backend production URL
        ]
    }
})

# ── Logging Configuration ─────────────────────────────────────────────────────
log_level = os.getenv("LOG_LEVEL", "DEBUG")
logging.basicConfig(
    level=getattr(logging, log_level, logging.DEBUG),
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)

# ── Register Blueprints ───────────────────────────────────────────────────────
app.register_blueprint(scoring_blueprint)

# ── Health Check ──────────────────────────────────────────────────────────────
@app.route("/health", methods=["GET"])
def health_check():
    """
    Description: Public health check endpoint.
                 Used by backend to verify AI engine is running.
    Returns:     JSON response with status and version info.
    """
    return jsonify({
        "success": True,
        "message": "TechTrust AI Engine is running",
        "version": "1.0.0",
        "environment": os.getenv("FLASK_ENV", "development"),
    }), 200

# ── Global Error Handlers ─────────────────────────────────────────────────────
@app.errorhandler(404)
def not_found(error):
    """
    Description: Handles all requests to undefined routes.
    Returns:     JSON 404 response.
    """
    return jsonify({
        "success": False,
        "message": "The requested endpoint does not exist.",
    }), 404

@app.errorhandler(405)
def method_not_allowed(error):
    """
    Description: Handles requests with incorrect HTTP methods.
    Returns:     JSON 405 response.
    """
    return jsonify({
        "success": False,
        "message": "HTTP method not allowed on this endpoint.",
    }), 405

@app.errorhandler(500)
def internal_error(error):
    """
    Description: Handles all unhandled internal server errors.
                 Constitution Standard 3 — never exposes internal details.
    Returns:     JSON 500 response with generic message.
    """
    logger.error(f"Internal server error: {str(error)}")
    return jsonify({
        "success": False,
        "message": "An unexpected error occurred. Please try again.",
    }), 500

# ── Entry Point ───────────────────────────────────────────────────────────────
if __name__ == "__main__":
    port = int(os.getenv("PORT", 8000))
    debug = os.getenv("FLASK_DEBUG", "1") == "1"

    logger.info(f"Starting TechTrust AI Engine on port {port}")
    logger.info(f"Environment: {os.getenv('FLASK_ENV', 'development')}")

    app.run(
        host="0.0.0.0",
        port=port,
        debug=debug,
    )