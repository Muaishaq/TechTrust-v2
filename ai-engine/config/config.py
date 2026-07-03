"""
@file:        config.py
@description: TechTrust AI Engine configuration.
              All scoring thresholds, weights, and constants live here.
              Never hardcode values in scoring functions — always import from here.
              Constitution Standard 1  — no hardcoded values in source files.
              Constitution Standard 10 — centralized configuration management.
@author:      Muaishaq
@created:     2026-07-02
@modified:    2026-07-02
"""

# ── Scoring Dimension Weights ─────────────────────────────────────────────────
# Controls how much each dimension contributes to the final trust score.
# All weights must sum to 1.0
# SPECIFICATION.md Section 4.3 — 8 scoring dimensions
SCORING_WEIGHTS = {
    "code_consistency":      0.20,  # Most important — shows discipline
    "language_proficiency":  0.15,  # Depth of technical skill
    "project_complexity":    0.15,  # Quality of work produced
    "collaboration_score":   0.12,  # Teamwork and open source contribution
    "documentation_quality": 0.10,  # Professionalism and communication
    "activity_recency":      0.13,  # Are they actively coding now?
    "originality_score":     0.10,  # Original work vs copied/forked repos
    "community_impact":      0.05,  # Stars, followers, forks received
}

# Validate weights sum to 1.0 at import time
_weight_sum = sum(SCORING_WEIGHTS.values())
assert abs(_weight_sum - 1.0) < 0.001, (
    f"SCORING_WEIGHTS must sum to 1.0 — current sum: {_weight_sum}"
)

# ── Confidence Thresholds ─────────────────────────────────────────────────────
# Controls when verifications are flagged for admin review
CONFIDENCE_THRESHOLDS = {
    "minimum_for_auto_approval": 0.60,  # Below this — flag for admin review
    "minimum_repos_for_high_confidence": 5,   # Fewer repos = lower confidence
    "minimum_commits_for_high_confidence": 20, # Fewer commits = lower confidence
    "minimum_account_age_days": 30,     # Accounts under 30 days get lower confidence
}

# ── Trust Score Ranges ────────────────────────────────────────────────────────
# Defines score brackets and their labels
TRUST_SCORE_RANGES = {
    "elite":    {"min": 90, "max": 100, "label": "Elite Developer"},
    "advanced": {"min": 75, "max": 89,  "label": "Advanced Developer"},
    "skilled":  {"min": 60, "max": 74,  "label": "Skilled Developer"},
    "emerging": {"min": 40, "max": 59,  "label": "Emerging Developer"},
    "beginner": {"min": 0,  "max": 39,  "label": "Beginner Developer"},
}

# ── Code Consistency Scoring ──────────────────────────────────────────────────
CONSISTENCY_CONFIG = {
    # Minimum commits per week to be considered consistent
    "min_weekly_commits_threshold": 2,
    # Number of weeks to analyze
    "analysis_weeks": 52,
    # Penalty per week of inactivity
    "inactivity_penalty_per_week": 2,
    # Bonus for maintaining streaks
    "streak_bonus_per_week": 1,
    # Maximum score achievable
    "max_score": 100,
}

# ── Language Proficiency Scoring ──────────────────────────────────────────────
LANGUAGE_CONFIG = {
    # Minimum bytes of code to count a language as used
    "min_bytes_threshold": 1000,
    # Score bonus per language mastered
    "points_per_language": 15,
    # Maximum languages counted for score
    "max_languages_counted": 5,
    # Languages considered high-value for scoring
    "high_value_languages": [
        "Python", "JavaScript", "TypeScript", "Rust", "Go",
        "Java", "C++", "C#", "Kotlin", "Swift",
    ],
    # Bonus points for high-value languages
    "high_value_bonus": 5,
}

# ── Project Complexity Scoring ────────────────────────────────────────────────
COMPLEXITY_CONFIG = {
    # Minimum repo size (KB) to be considered substantial
    "min_repo_size_kb": 10,
    # Score per substantial original repository
    "points_per_repo": 8,
    # Maximum repos counted
    "max_repos_counted": 10,
    # Bonus for repos with topics/tags
    "topics_bonus": 3,
    # Bonus for repos with open issues (active projects)
    "active_issues_bonus": 2,
    # Stars multiplier bonus
    "stars_bonus_multiplier": 0.5,
}

# ── Collaboration Scoring ─────────────────────────────────────────────────────
COLLABORATION_CONFIG = {
    # Points per pull request event
    "points_per_pr": 5,
    # Points per code review
    "points_per_review": 4,
    # Points per issue event
    "points_per_issue": 2,
    # Maximum score achievable
    "max_score": 100,
}

# ── Documentation Quality Scoring ────────────────────────────────────────────
DOCUMENTATION_CONFIG = {
    # Points per repo with a README
    "points_per_readme": 8,
    # Bonus for repos with wiki enabled
    "wiki_bonus": 3,
    # Bonus for repos with description
    "description_bonus": 2,
    # Bonus for repos with topics
    "topics_bonus": 3,
    # Maximum score achievable
    "max_score": 100,
}

# ── Activity Recency Scoring ──────────────────────────────────────────────────
RECENCY_CONFIG = {
    # Days within which activity is considered recent
    "recent_activity_days": 30,
    # Score for activity within last 30 days
    "recent_score": 100,
    # Score for activity within last 90 days
    "moderate_score": 70,
    # Score for activity within last 180 days
    "dated_score": 40,
    # Score for activity older than 180 days
    "stale_score": 10,
}

# ── Originality Scoring ───────────────────────────────────────────────────────
ORIGINALITY_CONFIG = {
    # Minimum original repos for full score
    "min_original_repos": 5,
    # Score if all repos are original
    "full_originality_score": 100,
    # Penalty per forked repo as percentage of total
    "fork_penalty_multiplier": 0.7,
}

# ── Community Impact Scoring ──────────────────────────────────────────────────
COMMUNITY_CONFIG = {
    # Points per star received
    "points_per_star": 2,
    # Points per follower
    "points_per_follower": 1,
    # Points per fork received
    "points_per_fork": 3,
    # Maximum score achievable
    "max_score": 100,
    # Cap on stars counted (prevent gaming)
    "max_stars_counted": 100,
    # Cap on followers counted
    "max_followers_counted": 200,
}

# ── Coaching Insight Thresholds ───────────────────────────────────────────────
# Defines when coaching insights are triggered per dimension
COACHING_THRESHOLDS = {
    "code_consistency": {
        "critical":  20,  # Score below this = critical insight
        "important": 50,  # Score below this = important insight
        "suggestion": 70, # Score below this = suggestion
    },
    "language_proficiency": {
        "critical":  20,
        "important": 40,
        "suggestion": 60,
    },
    "project_complexity": {
        "critical":  20,
        "important": 45,
        "suggestion": 65,
    },
    "collaboration_score": {
        "critical":  15,
        "important": 35,
        "suggestion": 55,
    },
    "documentation_quality": {
        "critical":  20,
        "important": 40,
        "suggestion": 60,
    },
    "activity_recency": {
        "critical":  30,
        "important": 55,
        "suggestion": 75,
    },
    "originality_score": {
        "critical":  25,
        "important": 50,
        "suggestion": 70,
    },
    "community_impact": {
        "critical":  10,
        "important": 25,
        "suggestion": 45,
    },
}

# ── API Configuration ─────────────────────────────────────────────────────────
API_CONFIG = {
    # Maximum request payload size (bytes)
    "max_payload_size": 5 * 1024 * 1024,  # 5MB
    # Request timeout for external calls (seconds)
    "request_timeout": 30,
    # Current API version
    "version": "1.0.0",
}