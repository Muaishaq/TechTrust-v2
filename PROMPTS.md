# TechTrust AI Tool Prompts
# Version: 1.0
# Author: Muhammed Ishaq — Founder & CEO, TechTrust
# Created: June 2026
# Purpose: Ready-to-use prompts for Lovable, Cursor, and Claude.
#          Copy and paste exactly as written. Never modify the rules section.

---

## HOW TO USE THIS FILE

Each prompt has:
1. WHERE — which tool to use it in
2. WHEN — which situation it applies to
3. THE PROMPT — copy and paste exactly

Replace text inside [SQUARE BRACKETS] with your specific request.

---

## SECTION 1 — LOVABLE PROMPTS

---

### PROMPT L-001: Session Opener (Use at the START of EVERY Lovable session)

WHERE: Lovable
WHEN: First message of every single Lovable session — no exceptions

---

You are building the TechTrust frontend — an AI-powered developer credential
verification and coaching platform. This is a production startup platform,
not a prototype.

Before writing any code, internalize these non-negotiable rules:

TECHNICAL RULES:
- All code must be standard React + Vite — no Lovable-specific dependencies
- All code must be exportable and fully runnable in any Node.js environment
- All API URLs go in environment variables only: import.meta.env.VITE_API_BASE_URL
- Never hardcode any URL, key, or secret in the code
- Auth tokens go in HttpOnly cookies only — never localStorage or sessionStorage
- All user inputs must be validated before submission using zod or react-hook-form
- No dangerouslySetInnerHTML unless absolutely necessary and sanitized
- Components must be under 300 lines — split into smaller components if needed
- Every component and function must have a JSDoc comment

DESIGN RULES:
- Dark/futuristic aesthetic: background #0A0F1C, primary #0D9488, accent #1A3C5E
- Font: Inter for body, Space Grotesk for headings
- All screens must be responsive: mobile (375px), tablet (768px), desktop (1440px)
- Every action needs feedback: loading states, success messages, error messages
- No placeholder text or empty screens — design every empty state
- Smooth, purposeful animations only — nothing decorative

PRIVACY RULES:
- No tracking or analytics code that collects data without user consent
- No third-party scripts that collect personal data

Confirm you understand these rules before I give you the first task.

---

### PROMPT L-002: New Page or Component

WHERE: Lovable
WHEN: Requesting a new page or component to be built

---

Build the [PAGE/COMPONENT NAME] for TechTrust.

WHAT IT DOES:
[Describe what this page/component is for]

USERS WHO SEE IT:
[Developer / Employer / Admin / Public]

DATA IT NEEDS:
[List what data this page displays or collects]

API ENDPOINTS IT CONNECTS TO:
[List the endpoints from SPECIFICATION.md this page calls]

KEY INTERACTIONS:
[List the buttons, forms, or actions on this page]

EMPTY STATE:
[Describe what shows when there is no data]

ERROR STATE:
[Describe what shows when the API call fails]

Remember: Follow all rules from the session opener. Standard React + Vite only.
No Lovable dependencies. All env vars. Fully responsive. Well commented.

---

### PROMPT L-003: Connect Page to Backend API

WHERE: Lovable
WHEN: A page is built and needs to connect to the real backend

---

Connect the [PAGE NAME] to the TechTrust backend API.

API BASE URL: import.meta.env.VITE_API_BASE_URL (already in .env)

ENDPOINTS TO CONNECT:
[List each endpoint, method, and what data it sends/receives]

AUTH REQUIREMENT:
[Does this page require the user to be logged in? Yes/No]
[What role is required? Developer / Employer / Admin / Any]

ERROR HANDLING REQUIRED:
- 401 Unauthorized → redirect to login page
- 403 Forbidden → show "Access denied" message
- 404 Not Found → show empty state
- 500 Server Error → show "Something went wrong, please try again"
- Network error → show "Check your connection and try again"

Loading state: Show skeleton loader while data is fetching
Success state: Show data as designed
Error state: Show error message with retry button

Use Axios with withCredentials: true on all requests (for HttpOnly cookie auth).
Use React Query for data fetching and caching.

---

### PROMPT L-004: Fix Exported Code Issues

WHERE: Lovable
WHEN: Exported Lovable code has errors when run in VS Code / standard environment

---

The code you generated has issues when run outside Lovable in a standard
React + Vite environment. Fix the following:

ISSUES FOUND:
[List each error or issue]

REQUIREMENTS FOR THE FIX:
- Must work in a standard React + Vite project with no Lovable dependencies
- Must use only these installed packages: [list packages in your package.json]
- Must not add any new dependencies without asking first
- Must keep the same visual design and functionality
- Must maintain all security rules from our session opener

Show me the corrected code for each affected file.

---

### PROMPT L-005: Design System Component

WHERE: Lovable
WHEN: Building a reusable UI component for the TechTrust design system

---

Create a reusable TechTrust design system component: [COMPONENT NAME]

DESIGN SYSTEM TOKENS:
- Background primary: #0A0F1C
- Background secondary: #111827
- Background card: #1F2937
- Primary color: #0D9488 (teal)
- Primary hover: #0F766E
- Accent color: #1A3C5E (blue)
- Text primary: #F9FAFB
- Text secondary: #9CA3AF
- Border color: #374151
- Success: #10B981
- Warning: #F59E0B
- Error: #EF4444
- Font heading: Space Grotesk
- Font body: Inter
- Border radius: 8px (small), 12px (medium), 16px (large)
- Shadow: 0 4px 6px rgba(0,0,0,0.3)

COMPONENT REQUIREMENTS:
- Name: [ComponentName]
- Props: [list props with types]
- Variants: [list any variants e.g. primary/secondary, small/medium/large]
- States: default, hover, active, disabled, loading
- Must be fully accessible (ARIA labels, keyboard navigable)
- Must work on all screen sizes

---

## SECTION 2 — CURSOR PROMPTS (Python AI Engine)

---

### PROMPT C-001: Session Opener (Use at the START of every Cursor session in /ai-engine)

WHERE: Cursor (when working in the /ai-engine folder)
WHEN: First message of every Cursor session on Python code

---

You are building the TechTrust AI Scoring Engine — a Python Flask service
that analyses developer GitHub data and produces skill scores and coaching insights.

NON-NEGOTIABLE RULES:

CODE QUALITY:
- Every file begins with a module docstring (file, description, author, date)
- Every function has a full docstring: description, args, returns, raises
- No hardcoded values — all thresholds and weights in config/config.py
- Maximum 300 lines per file — split into modules if exceeded
- snake_case for all Python variables and functions
- PascalCase for classes

SECURITY:
- Validate all inputs before any processing
- No raw file paths — all paths relative and from environment variables
- Internal API secured with API key authentication
- Never log personal data or GitHub tokens
- All errors handled gracefully — no unhandled exceptions

OUTPUT STRUCTURE:
Every scoring function must return exactly this structure:
{
    'score': float,          # 0.0 to 100.0
    'confidence': float,     # 0.0 to 1.0
    'breakdown': dict,       # sub-scores explaining the result
    'flags': list            # anomalies or warnings detected
}

COMPLIANCE:
- Never store raw GitHub data permanently — process and discard
- Only store computed scores, not raw personal data
- Log processing events without personal identifiers

Confirm understanding before I give you the first task.

---

### PROMPT C-002: New Scoring Function

WHERE: Cursor
WHEN: Building a new dimension scoring function in the AI engine

---

Build the [SCORING FUNCTION NAME] for the TechTrust AI scoring engine.

WHAT IT MEASURES:
[Describe exactly what this function analyses]

INPUT DATA:
[Describe what GitHub data fields this function receives]

SCORING LOGIC:
[Describe how the score should be calculated — what makes a high score vs low score]

EDGE CASES TO HANDLE:
- Developer has no data for this dimension → return score: 0, confidence: 0.1
- Developer has very little data → low confidence score
- Data appears anomalous → add to flags array
- GitHub API returned partial data → handle gracefully

OUTPUT:
Return the standard scoring structure (score, confidence, breakdown, flags)

Remember: No hardcoded values. All thresholds in config.py. Full docstrings.
Validate inputs. Handle all errors.

---

### PROMPT C-003: Coaching Insight Generator

WHERE: Cursor
WHEN: Building coaching logic for a specific category

---

Build the coaching insight generator for the [CATEGORY NAME] category.

CATEGORY: [github / linkedin / consistency / openSource / documentation / visibility / collaboration / recency]

TRIGGER CONDITIONS:
[Describe what score or pattern triggers a coaching insight in this category]

SEVERITY LOGIC:
- critical: [describe when it's critical]
- important: [describe when it's important]
- suggestion: [describe when it's a suggestion]

INSIGHT STRUCTURE TO RETURN:
{
    'category': '[category name]',
    'severity': '[critical/important/suggestion]',
    'title': '[short title]',
    'problem': '[what the problem is]',
    'why_it_matters': '[why employers care about this]',
    'action_steps': ['[step 1]', '[step 2]', '[step 3]'],
    'score_impact': float  # estimated Trust Score improvement if fixed
}

Remember: insights must be specific and actionable, not generic advice.

---

## SECTION 3 — CLAUDE / BACKEND PROMPTS

---

### PROMPT B-001: Session Opener (Use when starting a backend session with Claude)

WHERE: Claude (this conversation)
WHEN: Starting any backend development session

---

We are continuing the TechTrust v2 backend build.
Platform: AI-powered developer credential verification and coaching startup.
Stack: Node.js + Express + MongoDB Atlas.

Active rules (non-negotiable):
1. Follow TechTrust Engineering Constitution — all 10 standards
2. Architecture layers: Routes → Controllers → Services → Repositories → Models
3. Every file has a header comment and every function has a JSDoc comment
4. Zero open routes, zero test endpoints in production
5. All secrets in .env, never in code
6. Input validation on every endpoint using express-validator
7. Parameterized queries only — no raw string DB queries
8. JWT in HttpOnly cookies only — never response body
9. All errors handled — generic messages to client, details logged server-side
10. NDPR/GDPR compliant — consent before tracking, right to export, right to delete
11. Audit trail logged for all significant actions
12. Location tracking: country + city from IP only — no GPS, no precise location

Current position in TODO.md: [TELL ME WHERE YOU ARE]

Task for this session: [DESCRIBE WHAT YOU WANT TO BUILD]

---

### PROMPT B-002: New Backend Feature

WHERE: Claude
WHEN: Requesting a complete backend feature to be built

---

Build the complete backend implementation for: [FEATURE NAME]

Following TechTrust architecture (Routes → Controllers → Services → Repositories → Models):

FILES TO CREATE:
- /models/[name].model.js
- /repositories/[name].repository.js
- /services/[name].service.js
- /controllers/[name].controller.js
- /routes/v1/[name].routes.js
- /validators/[name].validators.js (express-validator rules)

FEATURE DESCRIPTION:
[Describe exactly what this feature does]

DATA MODEL:
[Describe the fields needed or reference SPECIFICATION.md]

ENDPOINTS NEEDED:
[List each endpoint: METHOD /path — description]

BUSINESS RULES:
[List any specific logic this feature must enforce]

SECURITY REQUIREMENTS:
[List which routes are public, which need auth, which need specific roles]

AUDIT TRAIL:
[List which actions in this feature must be logged to the audit trail]

COMPLIANCE:
[Any NDPR/GDPR considerations for this feature]

Build all files completely — no placeholders, no TODOs left in code.
Follow all Constitution standards throughout.

---

### PROMPT B-003: Security Review

WHERE: Claude
WHEN: Reviewing a file or feature for security issues before it ships

---

Perform a security review of the following TechTrust backend code.
Check against all 10 Constitution standards, with particular focus on:

1. Are there any open routes that should be protected?
2. Is input validation present and complete on all endpoints?
3. Are there any secrets, keys, or sensitive data in the code?
4. Are error messages sanitized — no internal details exposed?
5. Is rate limiting applied?
6. Are database queries parameterized?
7. Is the audit trail logging all required actions?
8. Are there any NDPR/GDPR compliance gaps?
9. Are there any injection vulnerabilities?
10. Is there anything that could leak user data?

For each issue found:
- Severity: CRITICAL / HIGH / MEDIUM / LOW
- Location: file and line number
- Problem: what the issue is
- Fix: exact corrected code

[PASTE CODE TO REVIEW HERE]

---

### PROMPT B-004: Database Model Review

WHERE: Claude
WHEN: Creating or reviewing a Mongoose model

---

Review and complete this TechTrust Mongoose model.

Ensure it includes:
- All fields from SPECIFICATION.md for this model
- Correct field types and validation
- Required fields marked correctly
- Default values where appropriate
- Indexes on all frequently queried fields
- Timestamps (createdAt, updatedAt) enabled
- A pre-save hook for any needed transformations
- Virtual fields if needed
- toJSON transform that removes sensitive fields from responses

Model name: [MODEL NAME]
Collection: [collection name]

[PASTE EXISTING MODEL CODE OR DESCRIBE FIELDS NEEDED]

---

## SECTION 4 — GIT COMMIT PROMPTS

### Standard Commit Message Format
```
type(scope): short description under 72 characters

[Optional body: explain WHY this change was made]

Types:
  feat     - New feature
  fix      - Bug fix
  security - Security improvement
  refactor - Code restructuring without feature change
  test     - Adding or fixing tests
  docs     - Documentation only
  chore    - Build process, dependencies, config

Examples:
  feat(auth): implement GitHub OAuth callback and JWT issuance
  security(middleware): add rate limiting to all auth endpoints
  fix(verification): handle GitHub API timeout gracefully
  docs(api): document developer profile endpoints
```

---

## SECTION 5 — EMERGENCY PROMPTS

### PROMPT E-001: Production Bug Fix

WHERE: Claude or Cursor
WHEN: A critical bug is found in production

---

PRODUCTION ISSUE — TechTrust platform.

SEVERITY: [CRITICAL / HIGH / MEDIUM]
AFFECTED FEATURE: [feature name]
REPORTED AT: [timestamp]

SYMPTOMS:
[Describe exactly what is happening]

ERROR LOGS:
[Paste relevant error logs]

SUSPECTED CAUSE:
[Your initial assessment]

REQUIREMENTS FOR THE FIX:
- Fix must not break any other feature
- Fix must pass all Constitution security standards
- Fix must be tested before deploying
- Audit log entry must be created for the incident
- Root cause must be documented

Provide: diagnosis, fix, test steps, and deployment instructions.

---

### PROMPT E-002: Security Incident Response

WHERE: Claude
WHEN: A security vulnerability or breach is suspected

---

SECURITY INCIDENT — TechTrust platform.

INCIDENT TYPE: [unauthorized access / data exposure / brute force / injection / other]
DETECTED AT: [timestamp]
AFFECTED SYSTEMS: [list affected components]

EVIDENCE:
[Paste relevant logs or observations]

IMMEDIATE ACTIONS NEEDED:
1. Contain the threat
2. Assess what data may be affected
3. Identify root cause
4. Provide remediation steps
5. NDPR/GDPR breach notification requirements (if personal data affected)

Provide step-by-step incident response plan following security best practices.

---

*TechTrust AI Tool Prompts v1.0 — Muhammed Ishaq — June 2026*
