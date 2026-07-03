"""
@file:        validators.py
@description: TechTrust AI Engine input validation utility.
              Validates all incoming data before any processing begins.
              Constitution Standard 3  — all inputs validated and sanitized.
              Constitution Standard 8  — invalid inputs rejected gracefully.
@author:      Muaishaq
@created:     2026-07-02
@modified:    2026-07-02
"""

from utils.logger import get_logger

logger = get_logger(__name__)

# ── Required Fields ───────────────────────────────────────────────────────────
# These fields must be present in the GitHub data package
REQUIRED_GITHUB_FIELDS = [
    "username",
    "profile",
    "repositories",
    "languages",
    "activity",
]

REQUIRED_PROFILE_FIELDS = [
    "login",
    "publicRepos",
]

REQUIRED_REPOSITORY_FIELDS = [
    "total",
    "original",
    "list",
]


def validate_scoring_request(data):
    """
    Description: Validates the full scoring request payload.
                 Checks structure, required fields, and data types.
                 Returns validation result without raising exceptions.
    Args:        data (dict): The request payload to validate
    Returns:     tuple: (is_valid: bool, error_message: str)
    """
    # Must be a dictionary
    if not isinstance(data, dict):
        return False, "Request payload must be a JSON object"

    # Must contain githubData key
    if "githubData" not in data:
        return False, "Missing required field: githubData"

    github_data = data["githubData"]

    # githubData must be a dictionary
    if not isinstance(github_data, dict):
        return False, "githubData must be a JSON object"

    # Check all required top-level fields
    for field in REQUIRED_GITHUB_FIELDS:
        if field not in github_data:
            return False, f"Missing required field in githubData: {field}"

    # Validate profile section
    profile = github_data.get("profile", {})
    if not isinstance(profile, dict):
        return False, "githubData.profile must be a JSON object"

    for field in REQUIRED_PROFILE_FIELDS:
        if field not in profile:
            return False, f"Missing required field in profile: {field}"

    # Validate repositories section
    repositories = github_data.get("repositories", {})
    if not isinstance(repositories, dict):
        return False, "githubData.repositories must be a JSON object"

    for field in REQUIRED_REPOSITORY_FIELDS:
        if field not in repositories:
            return False, f"Missing required field in repositories: {field}"

    # Validate repo list is actually a list
    if not isinstance(repositories.get("list", []), list):
        return False, "githubData.repositories.list must be an array"

    # Validate languages section
    languages = github_data.get("languages", {})
    if not isinstance(languages, dict):
        return False, "githubData.languages must be a JSON object"

    # Validate activity section
    activity = github_data.get("activity", {})
    if not isinstance(activity, dict):
        return False, "githubData.activity must be a JSON object"

    # Validate username is a non-empty string
    username = github_data.get("username", "")
    if not isinstance(username, str) or len(username.strip()) == 0:
        return False, "githubData.username must be a non-empty string"

    # Validate username length — GitHub usernames max 39 characters
    if len(username) > 39:
        return False, "githubData.username exceeds maximum length of 39 characters"

    logger.debug(f"Validation passed for username: {username}")

    return True, ""


def validate_username(username):
    """
    Description: Validates a GitHub username format.
    Args:        username (str): GitHub username to validate
    Returns:     tuple: (is_valid: bool, error_message: str)
    """
    if not username or not isinstance(username, str):
        return False, "Username must be a non-empty string"

    username = username.strip()

    if len(username) == 0:
        return False, "Username cannot be empty"

    if len(username) > 39:
        return False, "Username exceeds maximum GitHub length of 39 characters"

    # GitHub username rules — alphanumeric and hyphens only
    import re
    if not re.match(r'^[a-zA-Z0-9]([a-zA-Z0-9-]*[a-zA-Z0-9])?$', username):
        return False, "Username contains invalid characters"

    return True, ""


def sanitize_github_data(github_data):
    """
    Description: Sanitizes GitHub data before processing.
                 Removes unexpected fields and enforces data limits.
                 Prevents processing of malformed or oversized payloads.
    Args:        github_data (dict): Raw GitHub data package
    Returns:     dict: Sanitized GitHub data safe for scoring
    """
    sanitized = {}

    # Only keep expected top-level fields
    allowed_fields = [
        "username", "collectedAt", "profile",
        "repositories", "languages", "activity"
    ]

    for field in allowed_fields:
        if field in github_data:
            sanitized[field] = github_data[field]

    # Cap repository list at 500 — prevent memory issues
    if "repositories" in sanitized:
        repo_list = sanitized["repositories"].get("list", [])
        if len(repo_list) > 500:
            sanitized["repositories"]["list"] = repo_list[:500]
            logger.warning(
                f"Repository list capped at 500 for user: "
                f"{sanitized.get('username', 'unknown')}"
            )

    return sanitized