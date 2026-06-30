# TechTrust Engineering & Product Constitution
# Version: 1.0
# Author: Muhammed Ishaq — Founder & CEO, TechTrust
# Created: June 2026
# Purpose: Supreme engineering authority — all agents, all files, all deployments

---

## ⚠️ AGENT INSTRUCTION — READ THIS FIRST

You are working on **TechTrust** — an AI-powered developer credential verification
and coaching platform. Before writing a single line of code, you must read and
internalize every standard in this document. These are non-negotiable.

**The Golden Rule: If any code violates any one of these 10 standards — it does not ship.**

---

## Standard 1 — Code Quality & Structure

- Every file begins with a header comment block:
  ```
  /**
   * @file        filename.js
   * @description What this file does
   * @author      Muaishaq
   * @created     YYYY-MM-DD
   * @modified    YYYY-MM-DD
   */
  ```
- Every function has a JSDoc comment (JS) or docstring (Python) explaining:
  what it does, parameters it accepts, and what it returns
- Naming conventions:
  - `camelCase` for variables and functions
  - `PascalCase` for classes and React components
  - `SCREAMING_SNAKE_CASE` for constants
- One file = one responsibility. No file does multiple unrelated things
- No dead code — no commented-out blocks, no unused variables
- No `console.log` statements in production code
- Prettier formatting enforced on every file
- Maximum file length: 300 lines — split into modules if exceeded
- Imports ordered: external libraries → internal modules → local files

---

## Standard 2 — Frontend Security

- No API keys, tokens, or secrets ever in frontend code — use environment variables
- No sensitive data in localStorage or sessionStorage — HttpOnly cookies only
- Every user input validated client-side before submission
- No `dangerouslySetInnerHTML` unless absolutely unavoidable and sanitized
- Content Security Policy (CSP) headers enforced
- All HTTP traffic redirected to HTTPS — no exceptions
- `npm audit` passed before every deployment — no critical vulnerabilities
- All API base URLs in `.env` files — `.env` always in `.gitignore`
- All Lovable-generated code must be free of proprietary components and
  runnable in any standard React + Vite environment

---

## Standard 3 — Backend Security

- Zero open routes — every endpoint requires authentication unless explicitly public
- Zero test endpoints in production — enforced via `NODE_ENV` flag
- Rate limiting on every single endpoint
- `helmet` middleware applied globally on every response
- Every request body, query param, and URL param validated with `express-validator`
- Parameterized queries only — no raw string concatenation in database queries
- JWT access tokens expire in 15 minutes — refresh tokens expire in 7 days with rotation
- CORS configured to accept requests from whitelisted domains only — no wildcard in production
- Every secret in `.env` files — nothing hardcoded
- Internal errors never exposed in API responses — clean generic messages only
- GitHub OAuth is the only authentication method — no username/password

---

## Standard 4 — Firewall & Alert Systems

- Accounts locked after 5 consecutive failed login attempts
- IP-based rate limiting — suspicious IPs blocked automatically after repeated violations
- All API requests logged: timestamp, IP, endpoint, response status, user ID
- Automated alert when failed auth attempts exceed threshold in any 5-minute window
- Bulk scraping detection — inhuman request speeds flagged and blocked
- Every production 500-level error triggers an immediate founder alert
- Weekly automated dependency vulnerability scans
- Data access anomaly detection — unusual bulk access patterns trigger alerts
- Continuous uptime monitoring — downtime triggers immediate notification

---

## Standard 5 — Deployment Checklist

**Before any deployment, every item below must be confirmed:**

- [ ] All environment variables verified for production
- [ ] No test or debug endpoints active
- [ ] All routes confirmed authenticated where required
- [ ] Rate limiting active on all endpoints
- [ ] CORS domains verified — production domains only
- [ ] HTTPS redirect active
- [ ] Helmet.js security headers active
- [ ] No secrets anywhere in the codebase
- [ ] `npm audit` passed — no critical vulnerabilities
- [ ] Error responses sanitized — no stack traces exposed
- [ ] Database least-privilege credentials confirmed
- [ ] All `console.log` and debug statements removed
- [ ] Input validation active on all endpoints
- [ ] JWT expiry times correctly configured
- [ ] Logging and monitoring systems active
- [ ] Brute force protection active
- [ ] All third-party API keys valid
- [ ] Frontend build passes without warnings
- [ ] Mobile responsiveness verified on 3+ screen sizes
- [ ] Payment flows tested in sandbox before going live

---

## Standard 6 — User Experience (UX)

- Every flow is intuitive — the next step is always obvious
- No page or action takes longer than 2 seconds to respond
- Every screen works on desktop (1440px), tablet (768px), and mobile (375px)
- Every user action receives immediate feedback — loaders, success, error messages
- Every empty state has a helpful message and a clear next action
- Proper color contrast, keyboard navigation, and screen reader support throughout
- Error messages tell users what went wrong AND what they can do to fix it
- Navigation is identical across all pages
- New users are guided through their first action step by step

---

## Standard 7 — User Interface (UI)

- One design system — same colors, typography, spacing everywhere
- Dark/futuristic aesthetic — dark backgrounds, teal/blue accents, clean typography
- Every screen looks intentional and complete — no placeholders
- Micro-animations are smooth, purposeful, and never distracting
- Clear visual hierarchy on every page
- Every UI element is a reusable component
- One icon library used throughout — no mixed styles
- All text meets WCAG AA contrast standards
- All Lovable components function identically when exported to standard React + Vite

---

## Standard 8 — Fault Tolerance

- Every external API call wrapped in try-catch with graceful fallbacks
- If one service fails, all other features continue working
- Graceful degradation — reduced capability over total failure
- Failed network requests retried with exponential backoff (1s → 2s → 4s)
- Database connection pooling — individual failures don't bring down the server
- All external API calls have timeout limits — no indefinite hanging
- Every component has a defined error state
- A `/health` endpoint returns platform status at all times
- Long-running tasks run asynchronously — users never blocked waiting

---

## Standard 9 — Performance

- All frequently queried MongoDB fields indexed from Day 1
- Frequently requested, rarely changing data cached at API layer
- Heavy operations run in background workers — API responds immediately
- All images compressed, served in WebP format, delivered via CDN
- Non-critical components and images lazy loaded
- All list endpoints paginated — no unbounded data returns
- No N+1 query patterns — no full collection scans on large datasets
- Frontend bundle size monitored — large dependencies evaluated before adding
- Benchmarks: < 200ms simple reads, < 500ms complex queries, < 2s AI scoring

---

## Standard 10 — Maintainability & Scalability

- Frontend, backend, and AI engine are completely independent modules
- Routes → Controllers → Services → Repositories — strict layered architecture
- Switching environments requires only environment variable changes — never code changes
- Any developer can understand any file within 5 minutes of reading it
- Every commit has a clear descriptive message
- Backend is stateless — multiple instances can run in parallel
- MongoDB schemas and indexes designed for millions of records from Day 1
- New features deployed behind feature flags
- All API endpoints versioned from Day 1: `/api/v1/`
- Every major feature has accompanying documentation

---

## Tool-Specific Rules

### Lovable (Frontend)
Paste this at the start of EVERY Lovable session:
> "All code you generate must be: (1) Standard React + Vite compatible with no
> Lovable-specific dependencies, (2) Exportable and runnable in any Node.js
> environment, (3) Integration-ready with a REST API via environment variables
> only — no hardcoded URLs, (4) Free of secrets in frontend code, (5) Using
> HttpOnly cookies for auth tokens — never localStorage, (6) Fully validating
> all user inputs, (7) Following TechTrust design system — dark/futuristic,
> teal and blue accents, (8) Well-commented with JSDoc on all functions and
> components, (9) Organized into single-responsibility components under 300
> lines each. This is a production platform — code quality and security are
> non-negotiable."

### Cursor (Python AI Engine)
- Every Python file begins with a module docstring
- Every function has a docstring: description, args, return type
- No hardcoded values — all config in `config.py`
- All model inputs validated before processing
- Model outputs always include a confidence score
- `requirements.txt` updated after every new dependency

### Node.js + Express (Backend)
- Every route file begins with a comment listing all endpoints it contains
- Middleware order: helmet → cors → rateLimiter → auth → validation → controller
- Controllers call service functions only — no business logic in controllers
- Services call repository functions only — no direct DB queries in services
- Repository functions contain all database queries — parameterized always
- Every new endpoint added to the deployment checklist for review

---

*TechTrust Engineering Constitution v1.0 — Muhammed Ishaq — June 2026*
