# TechTrust Master TODO
# Version: 1.0
# Author: Muhammed Ishaq — Founder & CEO, TechTrust
# Created: June 2026
# Purpose: Ordered task list — agents work through this top to bottom, never skipping ahead
# Rule: Do not mark a task complete until it is fully built, tested, and reviewed

---

## HOW TO USE THIS FILE

- Work top to bottom — never skip ahead
- Mark tasks: [ ] = pending, [x] = complete, [~] = in progress, [!] = blocked
- Every task completed must pass the CONSTITUTION.md checklist before marking done
- After every 5 tasks completed, run a security review before continuing

---

## PHASE 1 — Foundation & Setup

### 1.1 Repository & Environment
- [ ] Create GitHub repository: `techtrust-v2`
- [ ] Create `.gitignore` file (Node, Python, env files, OS files)
- [ ] Create root `README.md` with project overview
- [ ] Create `CONSTITUTION.md` in repo root
- [ ] Create `SPECIFICATION.md` in repo root
- [ ] Create `TODO.md` in repo root
- [ ] Create `PROMPTS.md` in repo root
- [ ] Create `ARCHITECTURE.md` in repo root
- [ ] Create `.cursorrules` in repo root
- [ ] Create `.editorconfig` in repo root
- [ ] Set up branch protection on `main` branch — no direct pushes
- [ ] Create `develop` branch for all active development
- [ ] Confirm Node.js version: 20.x LTS
- [ ] Confirm Git version: 2.x+
- [ ] Confirm VS Code installed with ESLint + Prettier extensions

### 1.2 Backend Project Initialization
- [ ] Create `/backend` folder in repo root
- [ ] Run `npm init` in `/backend`
- [ ] Install core dependencies:
      express, mongoose, dotenv, cors, helmet, morgan,
      express-rate-limit, express-validator, jsonwebtoken,
      cookie-parser, passport, passport-github2, axios,
      bcryptjs, uuid, winston, node-cron
- [ ] Install dev dependencies:
      nodemon, eslint, prettier, jest, supertest
- [ ] Create `/backend/.env` file with all required variables (see SPECIFICATION.md)
- [ ] Confirm `/backend/.env` is in `.gitignore`
- [ ] Create `/backend/.env.example` with all keys but empty values (safe to commit)
- [ ] Set up ESLint + Prettier config in `/backend`
- [ ] Confirm `npm run dev` starts the server

### 1.3 Backend Folder Structure
- [ ] Create complete folder structure (see ARCHITECTURE.md)
- [ ] Create `server.js` entry point
- [ ] Create `app.js` Express application setup
- [ ] Create `/config` folder with: `db.js`, `passport.js`, `env.js`
- [ ] Create `/middleware` folder with all security middleware files
- [ ] Create `/routes/v1` folder with all route files (empty, structured)
- [ ] Create `/controllers` folder with all controller files (empty, structured)
- [ ] Create `/services` folder with all service files (empty, structured)
- [ ] Create `/repositories` folder with all repository files (empty, structured)
- [ ] Create `/models` folder with all model files (empty, structured)
- [ ] Create `/utils` folder with utility files
- [ ] Create `/logs` folder (gitignored)

### 1.4 Security Middleware Setup
- [ ] Configure `helmet` middleware globally
- [ ] Configure `cors` with whitelist from environment variables
- [ ] Configure `express-rate-limit` globally (100 requests/15min default)
- [ ] Configure stricter rate limit for auth routes (5 requests/15min)
- [ ] Configure stricter rate limit for verification routes (3 requests/hour)
- [ ] Configure `morgan` request logger
- [ ] Configure `winston` structured logger (file + console)
- [ ] Configure `cookie-parser`
- [ ] Create global error handling middleware
- [ ] Create 404 handler middleware
- [ ] Create request sanitization middleware
- [ ] Test all middleware active — confirm headers in response

### 1.5 Database Setup
- [ ] Create MongoDB Atlas account (free tier)
- [ ] Create `techtrust-dev` cluster
- [ ] Create database user with least-privilege credentials
- [ ] Whitelist IP addresses (or 0.0.0.0/0 for development only)
- [ ] Add connection string to `/backend/.env`
- [ ] Create `config/db.js` with connection logic and error handling
- [ ] Test database connection successful
- [ ] Create all Mongoose models (see SPECIFICATION.md data models)
- [ ] Add all required indexes to every model
- [ ] Confirm models load without errors

---

## PHASE 2 — Authentication System

### 2.1 GitHub OAuth Setup
- [ ] Create GitHub OAuth App in GitHub Developer Settings
- [ ] Set callback URL: `http://localhost:5000/api/v1/auth/github/callback`
- [ ] Add Client ID and Secret to `/backend/.env`
- [ ] Configure Passport.js GitHub strategy in `config/passport.js`
- [ ] Create User model with all fields from SPECIFICATION.md
- [ ] Create auth repository: `findByGithubId`, `findByEmail`, `createUser`, `updateLastLogin`
- [ ] Create auth service: `handleGithubCallback`, `generateTokens`, `refreshTokens`, `revokeToken`
- [ ] Create auth controller: `githubLogin`, `githubCallback`, `refresh`, `logout`, `getMe`
- [ ] Create auth routes with correct rate limiting applied
- [ ] Test GitHub OAuth flow end to end
- [ ] Confirm JWT stored in HttpOnly cookie — NOT in response body
- [ ] Confirm refresh token rotation working
- [ ] Confirm logout clears cookies properly

### 2.2 Auth Middleware
- [ ] Create `authenticate` middleware — verifies JWT from HttpOnly cookie
- [ ] Create `requireRole` middleware — checks user role (developer/employer/admin)
- [ ] Create `requireVerified` middleware — checks email verified
- [ ] Test protected route returns 401 without token
- [ ] Test protected route returns 403 with wrong role
- [ ] Test expired token returns 401 with clear message
- [ ] Test refresh token correctly issues new access token

### 2.3 Brute Force Protection
- [ ] Implement account lockout after 5 failed login attempts
- [ ] Store failed attempt count in database with timestamp
- [ ] Auto-unlock after 30 minutes or via email link
- [ ] Log all failed attempts with IP address
- [ ] Test lockout triggers correctly at attempt 5
- [ ] Test lockout releases correctly after timeout

---

## PHASE 3 — Data Privacy & Compliance Layer

### 3.1 NDPR / GDPR Compliance Infrastructure
- [ ] Create Privacy Policy document (see PROMPTS.md for content guidance)
- [ ] Create Terms of Service document
- [ ] Create Cookie Policy document
- [ ] Create consent model in database:
      userId, consentType, granted, timestamp, ipAddress, version
- [ ] Create consent service: `recordConsent`, `getConsent`, `revokeConsent`
- [ ] Create consent routes: `POST /api/v1/consent`, `DELETE /api/v1/consent`
- [ ] Add consent check to registration flow — no account without explicit consent
- [ ] Create data export endpoint: `GET /api/v1/account/export`
      Returns all data TechTrust holds about the requesting user (NDPR/GDPR right)
- [ ] Create account deletion endpoint: `DELETE /api/v1/account`
      Permanently deletes all personal data (NDPR/GDPR right to erasure)
- [ ] Create data retention policy: auto-delete inactive accounts after 2 years
- [ ] Create audit log model — immutable, append-only
- [ ] Create audit log service — logs every significant platform action
- [ ] Test consent flow — confirm no data collected without consent
- [ ] Test data export returns complete and accurate user data
- [ ] Test account deletion removes all personal data

### 3.2 Activity & Location Tracking (Compliant)
- [ ] Create session log model:
      userId, ipAddress, country, city, device, browser,
      action, timestamp, outcome
- [ ] Integrate IP geolocation (ip-api.com free tier) — country + city only, no GPS
- [ ] Create activity tracking middleware — logs all authenticated requests
- [ ] Add tracking consent flag — users who have not consented are not tracked
- [ ] Create audit trail for all admin actions
- [ ] Create audit trail for all payment events
- [ ] Create audit trail for all verification events
- [ ] Add "Data & Privacy" section to developer/employer dashboard
      Shows users exactly what TechTrust tracks about them
- [ ] Test that no location data collected without consent
- [ ] Test that audit trail is immutable — no update or delete permitted on audit records

---

## PHASE 4 — Developer Features

### 4.1 Developer Profile
- [ ] Create DeveloperProfile model with all fields from SPECIFICATION.md
- [ ] Create developer repository: CRUD operations
- [ ] Create developer service: profile logic
- [ ] Create developer controller: all profile endpoints
- [ ] Create developer routes with authentication
- [ ] Test: create profile, update profile, get own profile
- [ ] Test: get public profile by username (unauthenticated)
- [ ] Test: private fields not exposed on public profile

### 4.2 GitHub API Integration
- [ ] Create GitHub service in `/services/github.service.js`
- [ ] Implement: fetch user repositories (paginated)
- [ ] Implement: fetch commit history per repo
- [ ] Implement: fetch languages used per repo
- [ ] Implement: fetch contribution stats
- [ ] Implement: fetch pull request history
- [ ] Implement: fetch starred repos and followers
- [ ] Add GitHub API rate limit handling (retry with backoff)
- [ ] Add fallback if GitHub API is unavailable
- [ ] Test: full GitHub data fetch for a test account
- [ ] Test: rate limit handling works correctly
- [ ] Test: partial data returned gracefully if some endpoints fail

### 4.3 Verification Flow
- [ ] Create Verification model with all fields from SPECIFICATION.md
- [ ] Create verification repository: create, findByDeveloper, updateStatus
- [ ] Create verification service: orchestrates full verification flow
- [ ] Create verification controller: trigger, status, results endpoints
- [ ] Create verification routes
- [ ] Connect verification service to AI engine via internal API call
- [ ] Implement AI confidence score threshold — flag if < 60%
- [ ] Implement verification cooldown: 90 days (free), 30 days (premium)
- [ ] Test: full verification flow end to end
- [ ] Test: flagged verifications appear in admin panel
- [ ] Test: cooldown prevents re-verification before period ends

### 4.4 Coaching Insights
- [ ] Create CoachingInsight model
- [ ] Create coaching repository
- [ ] Create coaching service: generates insights from verification scores
- [ ] Create coaching controller and routes
- [ ] Implement 8 coaching categories (see SPECIFICATION.md)
- [ ] Implement severity levels: critical, important, suggestion
- [ ] Implement mark-as-complete for each coaching card
- [ ] Test: coaching insights generated after verification
- [ ] Test: mark complete updates correctly
- [ ] Test: free tier receives 3 coaching cards max

### 4.5 Badge System
- [ ] Create badge generation service
- [ ] Implement Open Badges 3.0 standard structure
- [ ] Generate cryptographic signature for each badge
- [ ] Create badge verification endpoint (public)
- [ ] Generate shareable badge URL
- [ ] Generate embeddable HTML snippet
- [ ] Generate downloadable badge PNG
- [ ] Test: badge generated after verification
- [ ] Test: public badge verification returns correct data
- [ ] Test: tampered badge fails verification

---

## PHASE 5 — AI Scoring Engine (Python)

### 5.1 Python Project Setup
- [ ] Create `/ai-engine` folder in repo root
- [ ] Create Python virtual environment
- [ ] Install dependencies: flask, scikit-learn, pandas, numpy,
      pymongo, python-dotenv, requests, gunicorn
- [ ] Create `requirements.txt`
- [ ] Create `/ai-engine/.env` with required variables
- [ ] Confirm `/ai-engine/.env` in `.gitignore`
- [ ] Create Flask app entry point `app.py`
- [ ] Create `/ai-engine/config/config.py` — all thresholds and weights
- [ ] Test Flask server starts on port 8000

### 5.2 Scoring Engine
- [ ] Create `scorer.py` — main scoring orchestrator
- [ ] Implement `score_code_consistency(data)` — commit regularity analysis
- [ ] Implement `score_language_proficiency(data)` — language depth analysis
- [ ] Implement `score_project_complexity(data)` — repository complexity analysis
- [ ] Implement `score_collaboration(data)` — PRs, reviews, open source
- [ ] Implement `score_documentation(data)` — README, comments, wikis
- [ ] Implement `score_activity_recency(data)` — recent coding activity
- [ ] Implement `score_originality(data)` — original vs forked ratio
- [ ] Implement `score_community_impact(data)` — stars, followers, forks
- [ ] Implement `calculate_trust_score(scores)` — weighted composite score
- [ ] Implement `calculate_confidence(data)` — how much data available
- [ ] Test each scoring function with sample GitHub data
- [ ] Test trust score calculation with known inputs

### 5.3 Coaching Engine
- [ ] Create `coach.py` — coaching insight generator
- [ ] Implement coaching logic for each of 8 categories
- [ ] Implement severity assignment logic
- [ ] Implement action step generation per insight
- [ ] Implement score impact estimation per insight
- [ ] Test: correct insights generated for weak profiles
- [ ] Test: no false insights generated for strong profiles

### 5.4 API Endpoints (Flask)
- [ ] Create `POST /score` — accepts GitHub data, returns scores + insights
- [ ] Create `GET /health` — engine health check
- [ ] Add input validation on all endpoints
- [ ] Add authentication (internal API key — backend only)
- [ ] Add request logging
- [ ] Test: full scoring request returns correct structure
- [ ] Test: invalid input returns clear error
- [ ] Test: unauthorized request rejected

---

## PHASE 6 — Employer Features

### 6.1 Employer Profile
- [ ] Create EmployerProfile model
- [ ] Create employer repository
- [ ] Create employer service
- [ ] Create employer controller and routes
- [ ] Test: create, update, get employer profile

### 6.2 Developer Search
- [ ] Implement search endpoint with all filters from SPECIFICATION.md
- [ ] Implement pagination on search results
- [ ] Implement sort by Trust Score, recency, experience level
- [ ] Add search query logging for analytics
- [ ] Test: search returns only verified developers
- [ ] Test: all filters work correctly
- [ ] Test: pagination works correctly
- [ ] Test: free tier employer limited to 5 results/month

### 6.3 Job Postings
- [ ] Create JobPosting model
- [ ] Create job repository
- [ ] Create job service
- [ ] Create job controller and routes
- [ ] Implement public job listing endpoint
- [ ] Implement developer notification on matching job posted
- [ ] Test: create, update, close job posting
- [ ] Test: free tier limited to 1 active posting

---

## PHASE 7 — Admin Panel Backend

### 7.1 Admin Routes & Controllers
- [ ] Create admin middleware — verify admin role strictly
- [ ] Create admin dashboard stats endpoint
- [ ] Create user management endpoints (list, suspend, activate)
- [ ] Create verification oversight endpoints
- [ ] Create dispute management endpoints
- [ ] Create analytics endpoints
- [ ] Create content management endpoints
- [ ] Create financial overview endpoints
- [ ] Test: all admin endpoints return 403 for non-admin users
- [ ] Test: all admin actions logged to audit trail

---

## PHASE 8 — Notification System

- [ ] Create Notification model
- [ ] Create notification service
- [ ] Implement in-app notification creation
- [ ] Implement email notification via Nodemailer
- [ ] Create notification routes
- [ ] Implement all notification triggers (see SPECIFICATION.md)
- [ ] Test: notifications created on correct events
- [ ] Test: email sent correctly

---

## PHASE 9 — Payments

### 9.1 Flutterwave Integration
- [ ] Create Flutterwave service
- [ ] Implement developer premium subscription initiation
- [ ] Implement employer plan subscription initiation
- [ ] Implement Flutterwave webhook handler
- [ ] Implement subscription status update on payment confirmed
- [ ] Test: payment flow in sandbox mode
- [ ] Test: webhook correctly updates subscription

### 9.2 Stripe Integration
- [ ] Create Stripe service
- [ ] Implement international employer subscription
- [ ] Implement Stripe webhook handler
- [ ] Test: Stripe payment in test mode
- [ ] Test: webhook correctly updates subscription

---

## PHASE 10 — Frontend (Lovable)

### 10.1 Setup
- [ ] Create `/frontend` folder
- [ ] Initialize React + Vite project
- [ ] Install dependencies: axios, react-router-dom, zustand,
      react-query, react-hook-form, zod
- [ ] Create `/frontend/.env` with API base URL
- [ ] Confirm `/frontend/.env` in `.gitignore`
- [ ] Set up design system: colors, typography, spacing tokens
- [ ] Set up Axios instance with base URL and cookie credentials

### 10.2 Pages to Build (via Lovable)
- [ ] Landing Page (public)
- [ ] Login Page (GitHub OAuth button)
- [ ] Role Selection Page (after first login)
- [ ] Developer Dashboard
- [ ] Developer Profile Editor
- [ ] Verification Flow Screen
- [ ] Verification Results Screen
- [ ] Coaching Insights Screen
- [ ] Badge Screen
- [ ] Employer Dashboard
- [ ] Developer Search & Results
- [ ] Developer Profile View (employer perspective)
- [ ] Job Posting Manager
- [ ] Admin Dashboard
- [ ] Admin User Management
- [ ] Admin Verification Oversight
- [ ] Admin Dispute Manager
- [ ] Admin Analytics
- [ ] Notification Center
- [ ] Account Settings (includes data privacy controls)
- [ ] Privacy & Data Page (shows user what TechTrust tracks)

### 10.3 Frontend Integration
- [ ] Connect all pages to backend API endpoints
- [ ] Implement auth state management (Zustand)
- [ ] Implement protected routes (redirect to login if unauthenticated)
- [ ] Implement role-based routing (developers see dev pages, employers see employer pages)
- [ ] Implement error states on all pages
- [ ] Implement loading states on all async operations
- [ ] Test all pages on mobile (375px)
- [ ] Test all pages on tablet (768px)
- [ ] Test all pages on desktop (1440px)

---

## PHASE 11 — Testing

- [ ] Write unit tests for all service functions (Jest)
- [ ] Write integration tests for all API endpoints (Supertest)
- [ ] Write Python unit tests for all scoring functions
- [ ] Test all error handling paths
- [ ] Test all security middleware
- [ ] Test rate limiting triggers correctly
- [ ] Test brute force lockout
- [ ] Test GDPR/NDPR data export
- [ ] Test GDPR/NDPR account deletion
- [ ] Run full deployment checklist from CONSTITUTION.md
- [ ] Run `npm audit` — resolve all critical vulnerabilities
- [ ] Performance test: verify API responses within benchmarks

---

## PHASE 12 — Deployment & Launch

- [ ] Set up Railway account for backend
- [ ] Set up Netlify account for frontend
- [ ] Configure production environment variables
- [ ] Deploy backend to Railway
- [ ] Deploy frontend to Netlify
- [ ] Deploy AI engine to Railway
- [ ] Set up custom domain
- [ ] Set up SSL certificates (auto via Railway/Netlify)
- [ ] Configure production CORS whitelist
- [ ] Set up uptime monitoring (UptimeRobot free tier)
- [ ] Set up error alerting
- [ ] Run full deployment checklist
- [ ] Smoke test all critical flows in production
- [ ] Invite first 30 beta testers
- [ ] Monitor logs for first 48 hours post-launch

---

*TechTrust Master TODO v1.0 — Muhammed Ishaq — June 2026*
