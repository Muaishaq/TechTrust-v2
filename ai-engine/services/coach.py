"""
@file:        coach.py
@description: TechTrust AI Coaching Insight Generator.
              Analyses scoring results and generates personalised,
              actionable coaching insights for each developer.
              Insights tell developers exactly what mistakes they are
              making and how to fix their online presence and visibility.
              Constitution Standard 1  — thresholds from config only.
              SPECIFICATION.md Section 4.5 — coaching module reference.
@author:      Muaishaq
@created:     2026-07-02
@modified:    2026-07-02
"""

from utils.logger import get_logger
from config.config import COACHING_THRESHOLDS

logger = get_logger(__name__)


def _get_severity(dimension, score):
    """
    Description: Determines the severity level of a coaching insight
                 based on the dimension score and configured thresholds.
    Args:        dimension (str): Scoring dimension name
                 score     (float): Dimension score (0-100)
    Returns:     str|None: 'critical', 'important', 'suggestion', or None
    """
    thresholds = COACHING_THRESHOLDS.get(dimension, {})
    if not thresholds:
        return None

    if score <= thresholds.get("critical", 20):
        return "critical"
    elif score <= thresholds.get("important", 50):
        return "important"
    elif score <= thresholds.get("suggestion", 70):
        return "suggestion"

    return None  # Score is good — no insight needed


def generate_consistency_insight(score, breakdown):
    """
    Description: Generates coaching insight for code consistency dimension.
                 Targets developers with gaps in their commit history.
    Args:        score     (float): Code consistency score
                 breakdown (dict):  Score breakdown details
    Returns:     dict|None: Coaching insight or None if score is good
    """
    severity = _get_severity("code_consistency", score)
    if not severity:
        return None

    days_since_push = breakdown.get("days_since_last_push", 0)
    active_repos = breakdown.get("active_repos_last_180_days", 0)

    if days_since_push > 180:
        problem = (
            f"Your last GitHub activity was {days_since_push} days ago. "
            f"Employers see a developer who has stopped coding."
        )
        action_steps = [
            "Start coding daily — even small commits count",
            "Pick one personal project and push updates every week",
            "Contribute to open source to show consistent activity",
            "Set a daily reminder to commit at least one change",
        ]
    elif days_since_push > 90:
        problem = (
            f"Your GitHub has been inactive for {days_since_push} days. "
            f"This sends a signal that you may not be actively developing."
        )
        action_steps = [
            "Push at least 3 commits per week going forward",
            "Restart a dormant project and document your progress",
            "Join a coding challenge to build momentum",
        ]
    else:
        problem = (
            f"You have only {active_repos} active repositories in the last 180 days. "
            f"Your commit history has significant gaps."
        )
        action_steps = [
            "Aim for commits at least 3-4 days per week",
            "Work on multiple projects simultaneously to fill gaps",
            "Document your learning journey through regular commits",
        ]

    return {
        "category": "consistency",
        "severity": severity,
        "title": "Build a Consistent Coding Footprint",
        "problem": problem,
        "why_it_matters": (
            "Recruiters and employers check your GitHub activity graph first. "
            "A developer with consistent commits shows discipline, passion, and "
            "that they are actively growing. Gaps signal disengagement."
        ),
        "action_steps": action_steps,
        "score_impact": 15 if severity == "critical" else 8,
    }


def generate_language_insight(score, breakdown):
    """
    Description: Generates coaching insight for language proficiency dimension.
                 Targets developers with little or no significant code written.
    Args:        score     (float): Language proficiency score
                 breakdown (dict):  Score breakdown details
    Returns:     dict|None: Coaching insight or None if score is good
    """
    severity = _get_severity("language_proficiency", score)
    if not severity:
        return None

    languages_found = breakdown.get("languages_found", [])
    high_value = breakdown.get("high_value_languages", [])

    if not languages_found:
        problem = (
            "Your GitHub profile shows almost no significant code. "
            "You appear invisible to employers searching for skilled developers."
        )
        action_steps = [
            "Start building projects in your primary language immediately",
            "Push all local projects to GitHub — even work-in-progress ones",
            "Create at least one substantial project per month",
            "Rebuild old projects with better code and push them",
        ]
    elif len(languages_found) < 2:
        problem = (
            f"You only have significant code in {languages_found[0] if languages_found else 'one language'}. "
            f"Modern employers expect developers to have breadth alongside depth."
        )
        action_steps = [
            "Learn and build projects in at least one complementary language",
            "If you know Python, add JavaScript. If you know JS, add Python",
            "Build full-stack projects that naturally use multiple languages",
        ]
    else:
        problem = (
            "Your language usage exists but lacks depth in high-value technologies. "
            "Employers in the global market prioritize certain technology stacks."
        )
        action_steps = [
            f"Deepen your expertise in: {', '.join(languages_found[:3])}",
            "Build larger, more complex projects rather than small scripts",
            "Contribute to established open source projects in your languages",
        ]

    return {
        "category": "language",
        "severity": severity,
        "title": "Prove Your Technical Depth Through Code",
        "problem": problem,
        "why_it_matters": (
            "Employers cannot verify skills they cannot see. "
            "Your GitHub is your proof of work. Without substantial code, "
            "your CV claims mean nothing to international recruiters."
        ),
        "action_steps": action_steps,
        "score_impact": 12 if severity == "critical" else 7,
    }


def generate_complexity_insight(score, breakdown):
    """
    Description: Generates coaching insight for project complexity dimension.
    Args:        score     (float): Project complexity score
                 breakdown (dict):  Score breakdown details
    Returns:     dict|None: Coaching insight or None if score is good
    """
    severity = _get_severity("project_complexity", score)
    if not severity:
        return None

    substantial = breakdown.get("substantial_repos", 0)
    original = breakdown.get("original_repos", 0)

    return {
        "category": "complexity",
        "severity": severity,
        "title": "Build Projects That Demonstrate Real Skill",
        "problem": (
            f"You have {original} original repositories but only {substantial} are "
            f"substantial enough to demonstrate real technical skill. "
            f"Employers want to see projects they can evaluate."
        ),
        "why_it_matters": (
            "Small, incomplete, or trivial repositories do not impress employers. "
            "A developer with 3 substantial projects beats one with 30 empty repos. "
            "Quality and completeness signal professionalism."
        ),
        "action_steps": [
            "Pick your best project and invest in making it truly complete",
            "Add a proper README, screenshots, and setup instructions",
            "Add topics and a description to every repository you own",
            "Build at least one full-stack or end-to-end project",
            "Deploy your projects so employers can see them live",
        ],
        "score_impact": 10 if severity == "critical" else 6,
    }


def generate_collaboration_insight(score, breakdown):
    """
    Description: Generates coaching insight for collaboration dimension.
    Args:        score     (float): Collaboration score
                 breakdown (dict):  Score breakdown details
    Returns:     dict|None: Coaching insight or None if score is good
    """
    severity = _get_severity("collaboration_score", score)
    if not severity:
        return None

    pr_events = breakdown.get("pull_request_events", 0)

    return {
        "category": "openSource",
        "severity": severity,
        "title": "Start Contributing Beyond Your Own Projects",
        "problem": (
            f"Your GitHub shows {pr_events} pull request events. "
            f"You are building entirely alone with no visible collaboration. "
            f"International employers specifically look for collaborative developers."
        ),
        "why_it_matters": (
            "Remote jobs require developers who can work in teams, review code, "
            "and communicate through pull requests. No collaboration history "
            "suggests you may struggle in a team environment."
        ),
        "action_steps": [
            "Find one open source project you use and fix a bug or improve docs",
            "Submit at least one pull request per month to any public repository",
            "Review other developers code — leave constructive comments",
            "Join a hackathon or collaborative coding challenge",
            "Start a project with a friend and use pull requests to collaborate",
        ],
        "score_impact": 10 if severity == "critical" else 6,
    }


def generate_documentation_insight(score, breakdown):
    """
    Description: Generates coaching insight for documentation quality dimension.
    Args:        score     (float): Documentation quality score
                 breakdown (dict):  Score breakdown details
    Returns:     dict|None: Coaching insight or None if score is good
    """
    severity = _get_severity("documentation_quality", score)
    if not severity:
        return None

    doc_rate = breakdown.get("documentation_rate", 0)
    repos_without_docs = breakdown.get("total_original_repos", 0) - \
                         breakdown.get("repos_with_description", 0)

    return {
        "category": "documentation",
        "severity": severity,
        "title": "Document Your Work Like a Professional",
        "problem": (
            f"Only {round(doc_rate * 100)}% of your repositories have descriptions. "
            f"Approximately {repos_without_docs} of your repositories have no "
            f"documentation. An undocumented repo is an invisible repo."
        ),
        "why_it_matters": (
            "A README is the first thing an employer reads when they click your repo. "
            "No README = no interest. Documentation shows communication skills, "
            "professionalism, and that you care about your work being understood."
        ),
        "action_steps": [
            "Add a README to every repository you own — start today",
            "Include: what the project does, how to install it, how to use it",
            "Add a screenshot or demo GIF to your most impressive projects",
            "Write descriptions for every repository on GitHub",
            "Add relevant topics/tags to help employers find your work",
        ],
        "score_impact": 8 if severity == "critical" else 5,
    }


def generate_recency_insight(score, breakdown):
    """
    Description: Generates coaching insight for activity recency dimension.
    Args:        score     (float): Activity recency score
                 breakdown (dict):  Score breakdown details
    Returns:     dict|None: Coaching insight or None if score is good
    """
    severity = _get_severity("activity_recency", score)
    if not severity:
        return None

    days_inactive = breakdown.get("days_since_last_push", 0)

    return {
        "category": "visibility",
        "severity": severity,
        "title": "Reactivate Your GitHub Presence Now",
        "problem": (
            f"Your GitHub has had no significant activity for {days_inactive} days. "
            f"To employers searching for developers right now, you appear to have "
            f"stopped coding."
        ),
        "why_it_matters": (
            "Employers filter by recent activity. A developer who last pushed "
            "6 months ago is often skipped entirely. Your activity graph is "
            "the first visual signal an employer sees on your profile."
        ),
        "action_steps": [
            "Push code to GitHub today — any project, any size",
            "Set a weekly goal: at least 3 coding sessions per week",
            "Start a new project that genuinely excites you",
            "Rebuild or improve an old project with new skills",
            "Set GitHub contribution reminders on your phone",
        ],
        "score_impact": 13 if severity == "critical" else 8,
    }


def generate_originality_insight(score, breakdown):
    """
    Description: Generates coaching insight for originality dimension.
    Args:        score     (float): Originality score
                 breakdown (dict):  Score breakdown details
    Returns:     dict|None: Coaching insight or None if score is good
    """
    severity = _get_severity("originality_score", score)
    if not severity:
        return None

    forked = breakdown.get("forked_repos", 0)
    original = breakdown.get("original_repos", 0)
    ratio = breakdown.get("originality_ratio", 0)

    return {
        "category": "github",
        "severity": severity,
        "title": "Show Your Own Work — Not Just Forks",
        "problem": (
            f"You have {forked} forked repositories and only {original} original ones. "
            f"Only {round(ratio * 100)}% of your GitHub activity represents "
            f"your own original work."
        ),
        "why_it_matters": (
            "Forked repos show what others built, not what you can build. "
            "Employers want to see your ideas, your code, your creativity. "
            "A profile full of forks signals a lack of initiative."
        ),
        "action_steps": [
            "Delete or archive forked repos you never actively worked on",
            "Start at least one completely original project per month",
            "When you fork to learn, build something new on top of it",
            "Pin your best 6 original projects to your GitHub profile",
            "Turn your learning exercises into original projects with your own twist",
        ],
        "score_impact": 9 if severity == "critical" else 5,
    }


def generate_community_insight(score, breakdown):
    """
    Description: Generates coaching insight for community impact dimension.
    Args:        score     (float): Community impact score
                 breakdown (dict):  Score breakdown details
    Returns:     dict|None: Coaching insight or None if score is good
    """
    severity = _get_severity("community_impact", score)
    if not severity:
        return None

    stars = breakdown.get("total_stars", 0)
    followers = breakdown.get("followers", 0)

    return {
        "category": "visibility",
        "severity": severity,
        "title": "Build Your Presence in the Developer Community",
        "problem": (
            f"Your GitHub has received {stars} stars and you have {followers} followers. "
            f"You are building in isolation with minimal community visibility. "
            f"Employers notice developers that others in the community value."
        ),
        "why_it_matters": (
            "Stars, followers, and forks are social proof. "
            "They tell employers that other developers found your work valuable. "
            "A developer with community recognition stands out immediately."
        ),
        "action_steps": [
            "Share your projects on LinkedIn, Twitter/X, and dev communities",
            "Write about what you are building — blog posts or LinkedIn articles",
            "Engage with other developers — comment, star, and share their work",
            "Submit your projects to platforms like Product Hunt or Hacker News",
            "Build tools that solve real problems developers actually have",
        ],
        "score_impact": 6 if severity == "critical" else 3,
    }


def generate_insights(scoring_result):
    """
    Description: Main coaching orchestrator — generates all relevant insights
                 from the complete scoring result.
                 Only generates insights for dimensions with room for improvement.
    Args:        scoring_result (dict): Complete scoring result from scorer.py
    Returns:     list: List of coaching insight objects sorted by severity
    """
    insights = []
    skill_scores = scoring_result.get("skillScores", {})

    # Map dimension to generator function and breakdown
    generators = [
        (
            "codeConsistency",
            generate_consistency_insight,
        ),
        (
            "languageProficiency",
            generate_language_insight,
        ),
        (
            "projectComplexity",
            generate_complexity_insight,
        ),
        (
            "collaborationScore",
            generate_collaboration_insight,
        ),
        (
            "documentationQuality",
            generate_documentation_insight,
        ),
        (
            "activityRecency",
            generate_recency_insight,
        ),
        (
            "originalityScore",
            generate_originality_insight,
        ),
        (
            "communityImpact",
            generate_community_insight,
        ),
    ]

    for dimension_key, generator_fn in generators:
        dim_data = skill_scores.get(dimension_key, {})
        if not isinstance(dim_data, dict):
            continue

        score = dim_data.get("score", 0.0)
        breakdown = dim_data.get("breakdown", {})

        try:
            insight = generator_fn(score, breakdown)
            if insight:
                insights.append(insight)
        except Exception as e:
            logger.error(
                f"Error generating insight for {dimension_key}: {str(e)}"
            )
            continue

    # Sort by severity — critical first, then important, then suggestion
    severity_order = {"critical": 0, "important": 1, "suggestion": 2}
    insights.sort(key=lambda x: severity_order.get(x.get("severity", "suggestion"), 2))

    logger.info(f"Generated {len(insights)} coaching insights")

    return insights