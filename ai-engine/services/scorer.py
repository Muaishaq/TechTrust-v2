"""
@file:        scorer.py
@description: TechTrust AI Trust Score calculation engine.
              Analyses GitHub data across 8 dimensions and produces
              a composite Trust Score (0-100) for each developer.
              All thresholds and weights imported from config/config.py.
              Constitution Standard 1  — no hardcoded values.
              Constitution Standard 9  — optimized processing.
              SPECIFICATION.md Section 4.3 — 8 scoring dimensions.
@author:      Muaishaq
@created:     2026-07-02
@modified:    2026-07-02
"""

from datetime import datetime, timezone
from utils.logger import get_logger, log_scoring_event
from config.config import (
    SCORING_WEIGHTS,
    CONFIDENCE_THRESHOLDS,
    TRUST_SCORE_RANGES,
    CONSISTENCY_CONFIG,
    LANGUAGE_CONFIG,
    COMPLEXITY_CONFIG,
    COLLABORATION_CONFIG,
    DOCUMENTATION_CONFIG,
    RECENCY_CONFIG,
    ORIGINALITY_CONFIG,
    COMMUNITY_CONFIG,
)

logger = get_logger(__name__)


def score_code_consistency(github_data):
    """
    Description: Scores how consistently the developer commits code over time.
                 Analyzes weekly commit patterns across the last 52 weeks.
                 High score = regular, sustained coding activity.
                 Low score = sporadic bursts or long periods of inactivity.
    Args:        github_data (dict): Full GitHub data package
    Returns:     dict: { score, confidence, breakdown, flags }
    """
    flags = []
    breakdown = {}

    try:
        activity = github_data.get("activity", {})
        repositories = github_data.get("repositories", {})
        repo_list = repositories.get("list", [])

        # Not enough data to score meaningfully
        if not repo_list:
            return {
                "score": 0.0,
                "confidence": 0.1,
                "breakdown": {"reason": "No repositories found"},
                "flags": ["no_repositories"],
            }

        # Calculate days since last push across all repos
        push_dates = []
        for repo in repo_list:
            pushed_at = repo.get("pushedAt")
            if pushed_at:
                try:
                    push_date = datetime.fromisoformat(
                        pushed_at.replace("Z", "+00:00")
                    )
                    push_dates.append(push_date)
                except (ValueError, AttributeError):
                    continue

        if not push_dates:
            return {
                "score": 0.0,
                "confidence": 0.2,
                "breakdown": {"reason": "No push dates found"},
                "flags": ["no_push_dates"],
            }

        # Most recent push
        latest_push = max(push_dates)
        now = datetime.now(timezone.utc)
        days_since_last_push = (now - latest_push).days

        breakdown["days_since_last_push"] = days_since_last_push
        breakdown["total_repos_analyzed"] = len(repo_list)

        # Score based on recency and spread of activity
        original_repos = [r for r in repo_list if not r.get("isForked", False)]
        active_repos = [
            r for r in original_repos
            if r.get("pushedAt") and
            (now - datetime.fromisoformat(
                r["pushedAt"].replace("Z", "+00:00")
            )).days <= 180
        ]

        breakdown["original_repos"] = len(original_repos)
        breakdown["active_repos_last_180_days"] = len(active_repos)

        # Base score from push events
        push_score = min(activity.get("pushEvents", 0) * 3, 60)

        # Recency bonus
        if days_since_last_push <= 7:
            recency_bonus = 30
        elif days_since_last_push <= 30:
            recency_bonus = 20
        elif days_since_last_push <= 90:
            recency_bonus = 10
        else:
            recency_bonus = 0
            flags.append("inactive_recently")

        # Active repos bonus
        active_bonus = min(len(active_repos) * 2, 10)

        raw_score = push_score + recency_bonus + active_bonus
        score = min(round(raw_score, 2), 100.0)

        # Confidence based on data availability
        confidence = 0.5 + min(len(repo_list) / 20, 0.4) + (
            0.1 if len(push_dates) > 5 else 0
        )
        confidence = min(round(confidence, 2), 1.0)

        breakdown["push_score"] = push_score
        breakdown["recency_bonus"] = recency_bonus
        breakdown["active_bonus"] = active_bonus

        return {
            "score": score,
            "confidence": confidence,
            "breakdown": breakdown,
            "flags": flags,
        }

    except Exception as e:
        logger.error(f"Error in score_code_consistency: {str(e)}")
        return {
            "score": 0.0,
            "confidence": 0.1,
            "breakdown": {"error": "Scoring failed"},
            "flags": ["scoring_error"],
        }


def score_language_proficiency(github_data):
    """
    Description: Scores depth of programming language usage.
                 Analyzes bytes of code written per language across all repos.
                 High score = deep expertise in multiple languages.
                 Low score = very little code or only one language superficially.
    Args:        github_data (dict): Full GitHub data package
    Returns:     dict: { score, confidence, breakdown, flags }
    """
    flags = []
    breakdown = {}

    try:
        languages = github_data.get("languages", {})
        totals = languages.get("totals", {})

        if not totals:
            return {
                "score": 0.0,
                "confidence": 0.1,
                "breakdown": {"reason": "No language data found"},
                "flags": ["no_language_data"],
            }

        # Filter languages above minimum threshold
        significant_languages = {
            lang: bytes_count
            for lang, bytes_count in totals.items()
            if bytes_count >= LANGUAGE_CONFIG["min_bytes_threshold"]
        }

        breakdown["total_languages"] = len(significant_languages)
        breakdown["languages_found"] = list(significant_languages.keys())

        if not significant_languages:
            return {
                "score": 5.0,
                "confidence": 0.3,
                "breakdown": {"reason": "No significant language usage found"},
                "flags": ["insufficient_code"],
            }

        # Base score per language
        language_count = min(
            len(significant_languages),
            LANGUAGE_CONFIG["max_languages_counted"]
        )
        base_score = language_count * LANGUAGE_CONFIG["points_per_language"]

        # Bonus for high-value languages
        high_value_bonus = 0
        high_value_found = []
        for lang in significant_languages:
            if lang in LANGUAGE_CONFIG["high_value_languages"]:
                high_value_bonus += LANGUAGE_CONFIG["high_value_bonus"]
                high_value_found.append(lang)

        breakdown["high_value_languages"] = high_value_found
        breakdown["high_value_bonus"] = high_value_bonus

        # Diversity bonus — reward breadth
        diversity_bonus = min(len(significant_languages) * 2, 10)

        raw_score = base_score + high_value_bonus + diversity_bonus
        score = min(round(raw_score, 2), 100.0)

        confidence = min(0.4 + (len(significant_languages) / 10), 1.0)
        confidence = round(confidence, 2)

        breakdown["base_score"] = base_score
        breakdown["diversity_bonus"] = diversity_bonus

        return {
            "score": score,
            "confidence": confidence,
            "breakdown": breakdown,
            "flags": flags,
        }

    except Exception as e:
        logger.error(f"Error in score_language_proficiency: {str(e)}")
        return {
            "score": 0.0,
            "confidence": 0.1,
            "breakdown": {"error": "Scoring failed"},
            "flags": ["scoring_error"],
        }


def score_project_complexity(github_data):
    """
    Description: Scores the sophistication of projects the developer has built.
                 Analyzes repo size, stars, topics, and issues.
                 High score = substantial, well-structured original projects.
                 Low score = empty repos, only forks, or trivial projects.
    Args:        github_data (dict): Full GitHub data package
    Returns:     dict: { score, confidence, breakdown, flags }
    """
    flags = []
    breakdown = {}

    try:
        repositories = github_data.get("repositories", {})
        repo_list = repositories.get("list", [])
        original_repos = [r for r in repo_list if not r.get("isForked", False)]

        if not original_repos:
            flags.append("no_original_repos")
            return {
                "score": 0.0,
                "confidence": 0.2,
                "breakdown": {"reason": "No original repositories found"},
                "flags": flags,
            }

        # Score substantial repos
        substantial_repos = [
            r for r in original_repos
            if (r.get("size", 0) or 0) >= COMPLEXITY_CONFIG["min_repo_size_kb"]
        ]

        breakdown["original_repos"] = len(original_repos)
        breakdown["substantial_repos"] = len(substantial_repos)

        if not substantial_repos:
            flags.append("no_substantial_repos")

        # Base score per substantial repo
        repo_count = min(
            len(substantial_repos),
            COMPLEXITY_CONFIG["max_repos_counted"]
        )
        base_score = repo_count * COMPLEXITY_CONFIG["points_per_repo"]

        # Stars bonus
        total_stars = sum(r.get("stargazersCount", 0) or 0 for r in original_repos)
        stars_bonus = min(
            total_stars * COMPLEXITY_CONFIG["stars_bonus_multiplier"],
            20
        )

        # Topics bonus — shows organized, documented projects
        repos_with_topics = sum(
            1 for r in substantial_repos
            if r.get("topics") and len(r.get("topics", [])) > 0
        )
        topics_bonus = min(
            repos_with_topics * COMPLEXITY_CONFIG["topics_bonus"],
            15
        )

        # Active issues bonus
        repos_with_issues = sum(
            1 for r in substantial_repos
            if (r.get("openIssuesCount", 0) or 0) > 0
        )
        issues_bonus = min(
            repos_with_issues * COMPLEXITY_CONFIG["active_issues_bonus"],
            10
        )

        raw_score = base_score + stars_bonus + topics_bonus + issues_bonus
        score = min(round(raw_score, 2), 100.0)

        confidence = min(
            0.3 + (len(substantial_repos) / 10) + (0.1 if total_stars > 0 else 0),
            1.0
        )
        confidence = round(confidence, 2)

        breakdown["base_score"] = base_score
        breakdown["stars_bonus"] = round(stars_bonus, 2)
        breakdown["topics_bonus"] = topics_bonus
        breakdown["issues_bonus"] = issues_bonus
        breakdown["total_stars"] = total_stars

        return {
            "score": score,
            "confidence": confidence,
            "breakdown": breakdown,
            "flags": flags,
        }

    except Exception as e:
        logger.error(f"Error in score_project_complexity: {str(e)}")
        return {
            "score": 0.0,
            "confidence": 0.1,
            "breakdown": {"error": "Scoring failed"},
            "flags": ["scoring_error"],
        }


def score_collaboration(github_data):
    """
    Description: Scores the developer's collaboration and community activity.
                 Analyzes pull requests, code reviews, and issue activity.
                 High score = active collaborator and open source contributor.
                 Low score = works entirely alone, no community engagement.
    Args:        github_data (dict): Full GitHub data package
    Returns:     dict: { score, confidence, breakdown, flags }
    """
    flags = []
    breakdown = {}

    try:
        activity = github_data.get("activity", {})

        pr_events = activity.get("pullRequestEvents", 0) or 0
        review_events = activity.get("reviewEvents", 0) or 0
        issue_events = activity.get("issueEvents", 0) or 0
        total_events = activity.get("totalEvents", 0) or 0

        breakdown["pull_request_events"] = pr_events
        breakdown["review_events"] = review_events
        breakdown["issue_events"] = issue_events

        if total_events == 0:
            flags.append("no_activity_data")
            return {
                "score": 5.0,
                "confidence": 0.2,
                "breakdown": {"reason": "No activity data available"},
                "flags": flags,
            }

        # Score each collaboration signal
        pr_score = min(
            pr_events * COLLABORATION_CONFIG["points_per_pr"],
            40
        )
        review_score = min(
            review_events * COLLABORATION_CONFIG["points_per_review"],
            30
        )
        issue_score = min(
            issue_events * COLLABORATION_CONFIG["points_per_issue"],
            20
        )

        # Activity diversity bonus
        active_types = sum([
            pr_events > 0,
            review_events > 0,
            issue_events > 0,
        ])
        diversity_bonus = active_types * 3

        raw_score = pr_score + review_score + issue_score + diversity_bonus
        score = min(round(raw_score, 2), 100.0)

        if pr_events == 0 and review_events == 0:
            flags.append("no_collaboration_detected")

        confidence = min(0.4 + (total_events / 100), 1.0)
        confidence = round(confidence, 2)

        breakdown["pr_score"] = pr_score
        breakdown["review_score"] = review_score
        breakdown["issue_score"] = issue_score
        breakdown["diversity_bonus"] = diversity_bonus

        return {
            "score": score,
            "confidence": confidence,
            "breakdown": breakdown,
            "flags": flags,
        }

    except Exception as e:
        logger.error(f"Error in score_collaboration: {str(e)}")
        return {
            "score": 0.0,
            "confidence": 0.1,
            "breakdown": {"error": "Scoring failed"},
            "flags": ["scoring_error"],
        }


def score_documentation_quality(github_data):
    """
    Description: Scores the quality of documentation across the developer's repos.
                 Checks for README files, descriptions, topics, and wikis.
                 High score = well documented, professional repositories.
                 Low score = empty repos with no README or description.
    Args:        github_data (dict): Full GitHub data package
    Returns:     dict: { score, confidence, breakdown, flags }
    """
    flags = []
    breakdown = {}

    try:
        repositories = github_data.get("repositories", {})
        repo_list = repositories.get("list", [])
        original_repos = [r for r in repo_list if not r.get("isForked", False)]

        if not original_repos:
            return {
                "score": 0.0,
                "confidence": 0.1,
                "breakdown": {"reason": "No original repositories to analyze"},
                "flags": ["no_original_repos"],
            }

        # Count documentation signals
        repos_with_description = sum(
            1 for r in original_repos
            if r.get("description") and len(r.get("description", "") or "") > 0
        )
        repos_with_topics = sum(
            1 for r in original_repos
            if r.get("topics") and len(r.get("topics", []) or []) > 0
        )
        repos_with_wiki = sum(
            1 for r in original_repos
            if r.get("hasReadme", False)
        )

        breakdown["repos_with_description"] = repos_with_description
        breakdown["repos_with_topics"] = repos_with_topics
        breakdown["repos_with_wiki"] = repos_with_wiki
        breakdown["total_original_repos"] = len(original_repos)

        # Score each documentation signal
        description_score = min(
            repos_with_description * DOCUMENTATION_CONFIG["description_bonus"],
            30
        )
        topics_score = min(
            repos_with_topics * DOCUMENTATION_CONFIG["topics_bonus"],
            30
        )
        wiki_score = min(
            repos_with_wiki * DOCUMENTATION_CONFIG["wiki_bonus"],
            30
        )

        # Consistency bonus — if majority of repos are documented
        total_repos = len(original_repos)
        documentation_rate = repos_with_description / total_repos
        consistency_bonus = round(documentation_rate * 10, 2)

        if documentation_rate < 0.3:
            flags.append("poor_documentation")

        raw_score = (
            description_score + topics_score + wiki_score + consistency_bonus
        )
        score = min(round(raw_score, 2), 100.0)

        confidence = min(0.4 + (total_repos / 20), 1.0)
        confidence = round(confidence, 2)

        breakdown["description_score"] = description_score
        breakdown["topics_score"] = topics_score
        breakdown["wiki_score"] = wiki_score
        breakdown["consistency_bonus"] = consistency_bonus
        breakdown["documentation_rate"] = round(documentation_rate, 2)

        return {
            "score": score,
            "confidence": confidence,
            "breakdown": breakdown,
            "flags": flags,
        }

    except Exception as e:
        logger.error(f"Error in score_documentation_quality: {str(e)}")
        return {
            "score": 0.0,
            "confidence": 0.1,
            "breakdown": {"error": "Scoring failed"},
            "flags": ["scoring_error"],
        }


def score_activity_recency(github_data):
    """
    Description: Scores how recently the developer has been active on GitHub.
                 Checks last push date across all repositories.
                 High score = active coding in the last 30 days.
                 Low score = no activity for 6+ months.
    Args:        github_data (dict): Full GitHub data package
    Returns:     dict: { score, confidence, breakdown, flags }
    """
    flags = []
    breakdown = {}

    try:
        repositories = github_data.get("repositories", {})
        repo_list = repositories.get("list", [])
        activity = github_data.get("activity", {})

        if not repo_list:
            return {
                "score": 0.0,
                "confidence": 0.1,
                "breakdown": {"reason": "No repositories found"},
                "flags": ["no_repositories"],
            }

        # Find most recent push date
        push_dates = []
        for repo in repo_list:
            pushed_at = repo.get("pushedAt")
            if pushed_at:
                try:
                    push_date = datetime.fromisoformat(
                        pushed_at.replace("Z", "+00:00")
                    )
                    push_dates.append(push_date)
                except (ValueError, AttributeError):
                    continue

        if not push_dates:
            return {
                "score": 0.0,
                "confidence": 0.2,
                "breakdown": {"reason": "No push dates available"},
                "flags": ["no_push_dates"],
            }

        latest_push = max(push_dates)
        now = datetime.now(timezone.utc)
        days_since_push = (now - latest_push).days

        breakdown["days_since_last_push"] = days_since_push
        breakdown["latest_push_date"] = latest_push.isoformat()

        # Score based on recency thresholds from config
        if days_since_push <= RECENCY_CONFIG["recent_activity_days"]:
            score = float(RECENCY_CONFIG["recent_score"])
        elif days_since_push <= 90:
            score = float(RECENCY_CONFIG["moderate_score"])
        elif days_since_push <= 180:
            score = float(RECENCY_CONFIG["dated_score"])
        else:
            score = float(RECENCY_CONFIG["stale_score"])
            flags.append("stale_activity")

        # Recent events bonus
        recent_events = activity.get("totalEvents", 0) or 0
        events_bonus = min(recent_events * 0.5, 10)
        score = min(score + events_bonus, 100.0)

        breakdown["events_bonus"] = events_bonus
        breakdown["recent_events"] = recent_events

        # Account age factor
        account_age_days = activity.get("accountAgeDays", 0) or 0
        breakdown["account_age_days"] = account_age_days

        if account_age_days < CONFIDENCE_THRESHOLDS["minimum_account_age_days"]:
            flags.append("new_account")

        confidence = min(
            0.5 + (min(account_age_days, 365) / 730),
            1.0
        )
        confidence = round(confidence, 2)

        return {
            "score": round(score, 2),
            "confidence": confidence,
            "breakdown": breakdown,
            "flags": flags,
        }

    except Exception as e:
        logger.error(f"Error in score_activity_recency: {str(e)}")
        return {
            "score": 0.0,
            "confidence": 0.1,
            "breakdown": {"error": "Scoring failed"},
            "flags": ["scoring_error"],
        }


def score_originality(github_data):
    """
    Description: Scores the ratio of original work vs forked repositories.
                 High score = mostly original projects.
                 Low score = mostly forked repositories with no original work.
    Args:        github_data (dict): Full GitHub data package
    Returns:     dict: { score, confidence, breakdown, flags }
    """
    flags = []
    breakdown = {}

    try:
        repositories = github_data.get("repositories", {})
        total = repositories.get("total", 0) or 0
        original = repositories.get("original", 0) or 0
        forked = repositories.get("forked", 0) or 0

        breakdown["total_repos"] = total
        breakdown["original_repos"] = original
        breakdown["forked_repos"] = forked

        if total == 0:
            return {
                "score": 0.0,
                "confidence": 0.1,
                "breakdown": {"reason": "No repositories found"},
                "flags": ["no_repositories"],
            }

        # Calculate originality ratio
        originality_ratio = original / total if total > 0 else 0
        breakdown["originality_ratio"] = round(originality_ratio, 2)

        # Base score from ratio
        base_score = originality_ratio * ORIGINALITY_CONFIG["full_originality_score"]

        # Penalty if mostly forks
        if originality_ratio < 0.3:
            flags.append("mostly_forked_repos")
            base_score *= ORIGINALITY_CONFIG["fork_penalty_multiplier"]

        # Bonus if has enough original repos
        if original >= ORIGINALITY_CONFIG["min_original_repos"]:
            volume_bonus = min(original * 2, 20)
            base_score += volume_bonus
            breakdown["volume_bonus"] = volume_bonus

        score = min(round(base_score, 2), 100.0)

        confidence = min(0.4 + (total / 20), 1.0)
        confidence = round(confidence, 2)

        return {
            "score": score,
            "confidence": confidence,
            "breakdown": breakdown,
            "flags": flags,
        }

    except Exception as e:
        logger.error(f"Error in score_originality: {str(e)}")
        return {
            "score": 0.0,
            "confidence": 0.1,
            "breakdown": {"error": "Scoring failed"},
            "flags": ["scoring_error"],
        }


def score_community_impact(github_data):
    """
    Description: Scores the developer's impact on the GitHub community.
                 Analyzes stars received, followers, and forks of their work.
                 High score = work that others find valuable and follow.
                 Low score = no community recognition yet.
    Args:        github_data (dict): Full GitHub data package
    Returns:     dict: { score, confidence, breakdown, flags }
    """
    flags = []
    breakdown = {}

    try:
        profile = github_data.get("profile", {})
        repositories = github_data.get("repositories", {})
        repo_list = repositories.get("list", [])
        original_repos = [r for r in repo_list if not r.get("isForked", False)]

        followers = min(
            profile.get("followers", 0) or 0,
            COMMUNITY_CONFIG["max_followers_counted"]
        )
        total_stars = min(
            sum(r.get("stargazersCount", 0) or 0 for r in original_repos),
            COMMUNITY_CONFIG["max_stars_counted"]
        )
        total_forks = sum(
            r.get("forksCount", 0) or 0 for r in original_repos
        )

        breakdown["followers"] = followers
        breakdown["total_stars"] = total_stars
        breakdown["total_forks"] = total_forks

        # Score each community signal
        stars_score = min(
            total_stars * COMMUNITY_CONFIG["points_per_star"],
            40
        )
        followers_score = min(
            followers * COMMUNITY_CONFIG["points_per_follower"],
            30
        )
        forks_score = min(
            total_forks * COMMUNITY_CONFIG["points_per_fork"],
            30
        )

        raw_score = stars_score + followers_score + forks_score
        score = min(round(raw_score, 2), COMMUNITY_CONFIG["max_score"])

        if total_stars == 0 and followers == 0:
            flags.append("no_community_engagement")

        # Community impact is hard to build — lower confidence for low scores
        confidence = min(
            0.3 + (min(total_stars + followers, 50) / 100),
            1.0
        )
        confidence = round(confidence, 2)

        breakdown["stars_score"] = stars_score
        breakdown["followers_score"] = followers_score
        breakdown["forks_score"] = forks_score

        return {
            "score": score,
            "confidence": confidence,
            "breakdown": breakdown,
            "flags": flags,
        }

    except Exception as e:
        logger.error(f"Error in score_community_impact: {str(e)}")
        return {
            "score": 0.0,
            "confidence": 0.1,
            "breakdown": {"error": "Scoring failed"},
            "flags": ["scoring_error"],
        }


def calculate_trust_score(dimension_scores):
    """
    Description: Calculates the composite Trust Score from all 8 dimensions.
                 Uses weighted average from config/config.py SCORING_WEIGHTS.
                 Constitution Standard 1 — weights from config, not hardcoded.
    Args:        dimension_scores (dict): Individual scores per dimension
    Returns:     tuple: (trust_score: float, overall_confidence: float)
    """
    weighted_sum = 0.0
    confidence_values = []

    weight_map = {
        "code_consistency":      dimension_scores.get("codeConsistency", {}),
        "language_proficiency":  dimension_scores.get("languageProficiency", {}),
        "project_complexity":    dimension_scores.get("projectComplexity", {}),
        "collaboration_score":   dimension_scores.get("collaborationScore", {}),
        "documentation_quality": dimension_scores.get("documentationQuality", {}),
        "activity_recency":      dimension_scores.get("activityRecency", {}),
        "originality_score":     dimension_scores.get("originalityScore", {}),
        "community_impact":      dimension_scores.get("communityImpact", {}),
    }

    for dimension, weight in SCORING_WEIGHTS.items():
        dim_data = weight_map.get(dimension, {})
        dim_score = dim_data.get("score", 0.0) if isinstance(dim_data, dict) else 0.0
        dim_confidence = dim_data.get("confidence", 0.5) if isinstance(dim_data, dict) else 0.5

        weighted_sum += dim_score * weight
        confidence_values.append(dim_confidence)

    trust_score = round(min(weighted_sum, 100.0), 2)
    overall_confidence = round(
        sum(confidence_values) / len(confidence_values) if confidence_values else 0.5,
        2
    )

    return trust_score, overall_confidence


def run_scoring(github_data):
    """
    Description: Main scoring orchestrator — runs all 8 dimension scorers
                 and calculates the final Trust Score.
                 Called by the scoring controller after validation.
    Args:        github_data (dict): Validated and sanitized GitHub data package
    Returns:     dict: Complete scoring result with trust score and all dimensions
    """
    username = github_data.get("username", "unknown")
    log_scoring_event(logger, username, "scoring_started")

    # ── Run All 8 Dimension Scorers ───────────────────────────────────────
    dimension_scores = {
        "codeConsistency":      score_code_consistency(github_data),
        "languageProficiency":  score_language_proficiency(github_data),
        "projectComplexity":    score_project_complexity(github_data),
        "collaborationScore":   score_collaboration(github_data),
        "documentationQuality": score_documentation_quality(github_data),
        "activityRecency":      score_activity_recency(github_data),
        "originalityScore":     score_originality(github_data),
        "communityImpact":      score_community_impact(github_data),
    }

    # ── Calculate Composite Trust Score ──────────────────────────────────
    trust_score, overall_confidence = calculate_trust_score(dimension_scores)

    # ── Determine Trust Level Label ───────────────────────────────────────
    trust_label = "Beginner Developer"
    for level, config in TRUST_SCORE_RANGES.items():
        if config["min"] <= trust_score <= config["max"]:
            trust_label = config["label"]
            break

    # ── Collect All Flags ─────────────────────────────────────────────────
    all_flags = []
    for dim_data in dimension_scores.values():
        if isinstance(dim_data, dict):
            all_flags.extend(dim_data.get("flags", []))

    log_scoring_event(logger, username, "scoring_completed", {
        "trust_score": trust_score,
        "confidence": overall_confidence,
        "flags_count": len(all_flags),
    })

    return {
        "trustScore": trust_score,
        "trustLabel": trust_label,
        "confidence": overall_confidence,
        "skillScores": dimension_scores,
        "flags": list(set(all_flags)),  # Deduplicate flags
        "scoredAt": datetime.utcnow().isoformat(),
    }