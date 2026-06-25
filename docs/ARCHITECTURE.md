# TechTrust System Architecture
# Version: 1.0
# Author: Muhammed Ishaq — Founder & CEO, TechTrust
# Created: June 2026
# Purpose: Complete technical blueprint — folder structure, stack decisions,
#          data flow, network configuration, and deployment architecture

---

## 1. System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        TECHTRUST PLATFORM                        │
│                                                                   │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────────┐   │
│  │   FRONTEND   │    │   BACKEND    │    │   AI ENGINE      │   │
│  │  React+Vite  │◄──►│ Node+Express │◄──►│  Python+Flask    │   │
│  │   Netlify    │    │   Railway    │    │   Railway        │   │
│  └──────────────┘    └──────┬───────┘    └──────────────────┘   │
│                             │                                     │
│                    ┌────────▼────────┐                           │
│                    │  MongoDB Atlas  │                           │
│                    │   (Database)    │                           │
│                    └─────────────────┘                           │
│                                                                   │
│  External Services:                                               │
│  ┌────────────┐  ┌─────────────┐  ┌──────────┐  ┌───────────┐  │
│  │ GitHub API │  │Flutterwave  │  │  Stripe  │  │ip-api.com │  │
│  │   OAuth    │  │  Payments   │  │Payments  │  │ Geolocation│  │
│  └────────────┘  └─────────────┘  └──────────┘  └───────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Technology Stack

| Layer | Technology | Version | Hosting | Cost |
|---|---|---|---|---|
| Frontend | React + Vite | React 18, Vite 5 | Netlify | Free tier |
| Backend | Node.js + Express | Node 20 LTS | Railway | Free tier |
| AI Engine | Python + Flask | Python 3.11 | Railway | Free tier |
| Database | MongoDB Atlas | 7.x | Atlas | Free tier (512MB) |
| Auth | GitHub OAuth + JWT | — | — | Free |
| Payments (Africa) | Flutterwave | v3 | — | Free to integrate |
| Payments (Global) | Stripe | v3 | — | Free to integrate |
| Email | Nodemailer + Gmail | — | — | Free |
| Geolocation | ip-api.com | — | — | Free (1000 req/day) |
| Monitoring | UptimeRobot | — | — | Free tier |
| Logging | Winston | — | — | Free |
| CDN | Netlify CDN | — | Netlify | Free |

---

## 3. Complete Folder Structure

```
techtrust-v2/
│
├── .cursorrules                    ← Cursor AI rules (auto-read by Cursor)
├── .editorconfig                   ← VS Code formatting rules
├── .gitignore                      ← Ignored files
├── README.md                       ← Project overview
├── CONSTITUTION.md                 ← 10 Engineering Standards
├── SPECIFICATION.md                ← Complete product specification
├── TODO.md                         ← Master task list
├── PROMPTS.md                      ← AI tool prompts
├── ARCHITECTURE.md                 ← This file
│
├── backend/                        ← Node.js + Express API
│   ├── .env                        ← Environment variables (gitignored)
│   ├── .env.example                ← Template with empty values (committed)
│   ├── package.json
│   ├── server.js                   ← HTTP server entry point
│   ├── app.js                      ← Express app setup + middleware
│   │
│   ├── config/
│   │   ├── db.js                   ← MongoDB connection
│   │   ├── passport.js             ← GitHub OAuth strategy
│   │   └── env.js                  ← Environment variable validation
│   │
│   ├── middleware/
│   │   ├── auth.middleware.js       ← JWT verification, role checks
│   │   ├── rateLimiter.middleware.js← Rate limiting configurations
│   │   ├── validate.middleware.js   ← express-validator result handler
│   │   ├── audit.middleware.js      ← Automatic audit trail logging
│   │   ├── consent.middleware.js    ← NDPR/GDPR consent checks
│   │   ├── errorHandler.middleware.js← Global error handler
│   │   └── notFound.middleware.js   ← 404 handler
│   │
│   ├── routes/
│   │   └── v1/
│   │       ├── index.js             ← Combines all v1 routes
│   │       ├── auth.routes.js
│   │       ├── developer.routes.js
│   │       ├── employer.routes.js
│   │       ├── admin.routes.js
│   │       ├── payment.routes.js
│   │       ├── notification.routes.js
│   │       ├── account.routes.js    ← Data export, deletion (NDPR/GDPR)
│   │       └── public.routes.js     ← Badge verify, jobs, health
│   │
│   ├── controllers/
│   │   ├── auth.controller.js
│   │   ├── developer.controller.js
│   │   ├── employer.controller.js
│   │   ├── admin.controller.js
│   │   ├── payment.controller.js
│   │   ├── notification.controller.js
│   │   └── account.controller.js
│   │
│   ├── services/
│   │   ├── auth.service.js
│   │   ├── developer.service.js
│   │   ├── employer.service.js
│   │   ├── admin.service.js
│   │   ├── github.service.js        ← GitHub API integration
│   │   ├── verification.service.js  ← Orchestrates full verification flow
│   │   ├── coaching.service.js      ← Generates coaching insights
│   │   ├── badge.service.js         ← Open Badges 3.0 generation
│   │   ├── payment.service.js
│   │   ├── notification.service.js
│   │   ├── email.service.js
│   │   ├── geolocation.service.js   ← IP → Country/City only (NDPR compliant)
│   │   ├── audit.service.js         ← Immutable audit trail
│   │   ├── consent.service.js       ← NDPR/GDPR consent management
│   │   └── aiEngine.service.js      ← Communicates with Python AI engine
│   │
│   ├── repositories/
│   │   ├── user.repository.js
│   │   ├── developer.repository.js
│   │   ├── employer.repository.js
│   │   ├── verification.repository.js
│   │   ├── coaching.repository.js
│   │   ├── job.repository.js
│   │   ├── notification.repository.js
│   │   ├── audit.repository.js
│   │   ├── consent.repository.js
│   │   ├── session.repository.js
│   │   └── dispute.repository.js
│   │
│   ├── models/
│   │   ├── User.model.js
│   │   ├── DeveloperProfile.model.js
│   │   ├── EmployerProfile.model.js
│   │   ├── VerificationRecord.model.js
│   │   ├── CoachingInsight.model.js
│   │   ├── JobPosting.model.js
│   │   ├── Badge.model.js
│   │   ├── Notification.model.js
│   │   ├── AuditLog.model.js        ← Immutable — no updates permitted
│   │   ├── ConsentRecord.model.js
│   │   ├── SessionLog.model.js
│   │   ├── Dispute.model.js
│   │   └── Subscription.model.js
│   │
│   ├── validators/
│   │   ├── auth.validators.js
│   │   ├── developer.validators.js
│   │   ├── employer.validators.js
│   │   ├── admin.validators.js
│   │   └── payment.validators.js
│   │
│   ├── utils/
│   │   ├── asyncHandler.js          ← Wraps async controllers in try-catch
│   │   ├── AppError.js              ← Custom error class
│   │   ├── response.js              ← Standardized success/error responses
│   │   ├── logger.js                ← Winston logger configuration
│   │   ├── jwt.js                   ← JWT generation and verification
│   │   ├── crypto.js                ← Badge signing utilities
│   │   └── pagination.js            ← Pagination helper
│   │
│   ├── tests/
│   │   ├── unit/
│   │   │   ├── services/
│   │   │   └── utils/
│   │   └── integration/
│   │       └── routes/
│   │
│   └── logs/                        ← Log files (gitignored)
│       ├── error.log
│       └── combined.log
│
├── ai-engine/                       ← Python Flask scoring engine
│   ├── .env                         ← Environment variables (gitignored)
│   ├── .env.example
│   ├── requirements.txt
│   ├── app.py                       ← Flask entry point
│   │
│   ├── config/
│   │   └── config.py                ← All thresholds, weights, constants
│   │
│   ├── routes/
│   │   └── scoring_routes.py        ← Flask routes
│   │
│   ├── controllers/
│   │   └── scoring_controller.py
│   │
│   ├── services/
│   │   ├── scorer.py                ← Main scoring orchestrator
│   │   ├── coach.py                 ← Coaching insight generator
│   │   └── github_analyzer.py       ← GitHub data preprocessing
│   │
│   ├── models/
│   │   └── scoring_model.py         ← scikit-learn model wrapper
│   │
│   ├── utils/
│   │   ├── validators.py            ← Input validation
│   │   ├── logger.py                ← Python logging setup
│   │   └── auth.py                  ← Internal API key auth
│   │
│   └── tests/
│       ├── test_scorer.py
│       └── test_coach.py
│
└── frontend/                        ← React + Vite (built via Lovable)
    ├── .env                         ← Environment variables (gitignored)
    ├── .env.example
    ├── package.json
    ├── vite.config.js
    ├── index.html
    │
    ├── public/
    │   └── assets/
    │
    └── src/
        ├── main.jsx                 ← React entry point
        ├── App.jsx                  ← Router setup
        │
        ├── api/
        │   ├── axios.js             ← Axios instance with base URL + credentials
        │   ├── auth.api.js
        │   ├── developer.api.js
        │   ├── employer.api.js
        │   └── admin.api.js
        │
        ├── store/
        │   ├── auth.store.js        ← Zustand auth state
        │   └── notification.store.js
        │
        ├── hooks/
        │   ├── useAuth.js
        │   ├── useDeveloper.js
        │   └── useEmployer.js
        │
        ├── components/
        │   ├── ui/                  ← Design system components
        │   │   ├── Button.jsx
        │   │   ├── Card.jsx
        │   │   ├── Input.jsx
        │   │   ├── Modal.jsx
        │   │   ├── Badge.jsx
        │   │   ├── SkeletonLoader.jsx
        │   │   ├── EmptyState.jsx
        │   │   └── ErrorState.jsx
        │   │
        │   ├── layout/
        │   │   ├── DeveloperLayout.jsx
        │   │   ├── EmployerLayout.jsx
        │   │   ├── AdminLayout.jsx
        │   │   └── PublicLayout.jsx
        │   │
        │   └── shared/
        │       ├── TrustScoreBadge.jsx
        │       ├── SkillScoreChart.jsx
        │       ├── DeveloperCard.jsx
        │       └── NotificationBell.jsx
        │
        └── pages/
            ├── public/
            │   ├── Landing.jsx
            │   ├── Login.jsx
            │   └── BadgeVerify.jsx
            │
            ├── developer/
            │   ├── Dashboard.jsx
            │   ├── Profile.jsx
            │   ├── Verification.jsx
            │   ├── VerificationResults.jsx
            │   ├── Coaching.jsx
            │   └── Badge.jsx
            │
            ├── employer/
            │   ├── Dashboard.jsx
            │   ├── Search.jsx
            │   ├── DeveloperView.jsx
            │   └── Jobs.jsx
            │
            └── admin/
                ├── Dashboard.jsx
                ├── Users.jsx
                ├── Verifications.jsx
                ├── Disputes.jsx
                ├── Analytics.jsx
                └── Financial.jsx
```

---

## 4. Request Flow

### Standard Authenticated Request
```
User Action (Frontend)
  → Axios (with credentials: true, sends HttpOnly cookie)
  → Netlify CDN
  → Railway (Backend)
  → auth.middleware.js (verify JWT from cookie)
  → rateLimiter.middleware.js (check rate limit)
  → validate.middleware.js (validate input)
  → audit.middleware.js (log request)
  → Router
  → Controller (handle HTTP)
  → Service (business logic)
  → Repository (database query)
  → MongoDB Atlas
  → Repository returns data
  → Service processes data
  → Controller sends standardized response
  → Frontend receives and renders
```

### Verification Flow
```
Developer clicks "Verify My Skills"
  → POST /api/v1/developers/verify
  → Auth middleware (confirm developer role)
  → Verification service checks cooldown
  → GitHub service fetches developer's GitHub data
  → AI Engine service sends data to Python engine
  → Python engine: preprocess → score 8 dimensions → calculate trust score
  → Python engine generates coaching insights
  → Python engine returns scores + insights + confidence
  → Verification service stores VerificationRecord
  → Coaching service stores CoachingInsight records
  → Badge service generates/updates TechTrust badge
  → Developer profile updated with new Trust Score
  → Notification sent: "Your verification is complete"
  → Audit trail logged
  → Response returned to frontend
  → Frontend renders results screen
```

---

## 5. Security Architecture

```
INTERNET
   │
   ▼
[Netlify CDN] ← HTTPS enforced, CSP headers, DDoS protection
   │
   ▼
[Frontend: React + Vite]
  - No secrets in code
  - HttpOnly cookies only
  - Input validation (zod)
  - CSP headers
   │
   │  HTTPS + HttpOnly Cookie (JWT)
   ▼
[Railway: Node.js + Express Backend]
  ┌─────────────────────────────────┐
  │ helmet()         — HTTP headers  │
  │ cors()           — Whitelist only│
  │ rateLimiter()    — Per endpoint  │
  │ auth()           — JWT verify    │
  │ validate()       — Sanitize input│
  │ audit()          — Log action    │
  └─────────────────────────────────┘
   │
   ├──► [MongoDB Atlas] — Encrypted at rest, least privilege access
   │
   └──► [Railway: Python AI Engine] — Internal API key auth only
         Not exposed to internet — backend to backend only
```

---

## 6. Data Privacy Architecture (NDPR / GDPR Compliant)

### What TechTrust Collects

| Data Type | Source | Purpose | Retention | User Can Delete |
|---|---|---|---|---|
| Name, email, avatar | GitHub OAuth | Account identity | Until deletion | ✅ Yes |
| GitHub username | GitHub OAuth | Profile, verification | Until deletion | ✅ Yes |
| GitHub activity data | GitHub API | Scoring only | Processed, not stored raw | ✅ Yes |
| Skill scores | AI Engine | Trust profile | Until deletion | ✅ Yes |
| Coaching insights | AI Engine | Developer guidance | Until deletion | ✅ Yes |
| Country, City | IP geolocation | Analytics, fraud detection | 2 years | ✅ Yes |
| Session logs | Server | Security, audit | 90 days | ❌ Legal hold |
| Audit trail | Server | Legal, compliance | 5 years | ❌ Legal hold |
| Payment records | Flutterwave/Stripe | Financial compliance | 7 years | ❌ Legal hold |
| Consent records | Server | NDPR/GDPR proof | 7 years | ❌ Legal hold |

### What TechTrust NEVER Collects
- GPS or precise real-time location (illegal without explicit consent — NDPR Article 24)
- Device location services
- Biometric data
- Financial account details (handled by Flutterwave/Stripe directly)
- Private GitHub repository content
- Password or credentials of any kind

### User Rights Implemented
- **Right to Access** — `GET /api/v1/account/export` returns all stored data as JSON
- **Right to Erasure** — `DELETE /api/v1/account` permanently deletes all personal data
- **Right to Portability** — exported data in structured JSON format
- **Right to Object** — users can revoke activity tracking consent at any time
- **Right to Correction** — users can update profile data at any time

### Consent Flow
1. User arrives at TechTrust for the first time
2. Before GitHub OAuth — cookie/privacy consent banner shown
3. User must actively accept Privacy Policy and Terms of Service
4. Consent record stored: userId, timestamp, IP, policy version
5. No data collected before consent confirmed
6. Users can view and revoke consent at any time from Account Settings

---

## 7. Activity Tracking Architecture (Compliant)

### Session Log — What is Tracked Per Request
```javascript
{
  userId: ObjectId,          // who made the request
  action: String,            // what they did
  ipAddress: String,         // their IP (hashed after geolocation lookup)
  country: String,           // country from IP (ip-api.com)
  city: String,              // city from IP (ip-api.com)
  device: String,            // device type from User-Agent
  browser: String,           // browser from User-Agent
  timestamp: Date,           // when it happened
  outcome: String,           // success / failed / blocked
  consentGiven: Boolean      // was tracking consent given?
}
```

### Audit Trail — Immutable Business Event Log
```javascript
{
  actorId: ObjectId,         // who performed the action
  actorRole: String,         // their role
  action: String,            // what action (e.g. 'USER_SUSPENDED')
  targetId: ObjectId,        // what was acted upon
  targetType: String,        // what type of thing
  ipAddress: String,         // where from (hashed)
  country: String,           // country only
  city: String,              // city only
  outcome: String,           // success / failed
  metadata: Object,          // additional context
  timestamp: Date            // immutable timestamp
}
// This collection has NO update or delete operations — ever
// Enforced at the model level with pre-hooks blocking updates/deletes
```

---

## 8. Environment Variables Reference

### Backend (.env)
```
# Server
NODE_ENV=development
PORT=5000

# Database
MONGODB_URI=mongodb+srv://...

# JWT
JWT_ACCESS_SECRET=        ← minimum 64 character random string
JWT_REFRESH_SECRET=       ← different minimum 64 character random string
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=http://localhost:5000/api/v1/auth/github/callback

# AI Engine
AI_ENGINE_URL=http://localhost:8000
AI_ENGINE_API_KEY=        ← random string shared with AI engine

# Payments
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_WEBHOOK_SECRET=
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=

# Frontend
FRONTEND_URL=http://localhost:5173

# Email
EMAIL_USER=
EMAIL_PASS=

# Alerts
ALERT_EMAIL=muaishaq@techtrust.io

# Cookie
COOKIE_SECRET=            ← minimum 32 character random string
```

### AI Engine (.env)
```
FLASK_ENV=development
PORT=8000
API_KEY=                  ← Must match AI_ENGINE_API_KEY in backend
MONGODB_URI=
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_GITHUB_CLIENT_ID=
```

---

## 9. Deployment Architecture

### Development
```
Frontend:  localhost:5173  (Vite dev server)
Backend:   localhost:5000  (Nodemon)
AI Engine: localhost:8000  (Flask dev server)
Database:  MongoDB Atlas free tier (cloud)
```

### Production
```
Frontend:  Netlify (free tier) — custom domain
Backend:   Railway (free tier) — subdomain
AI Engine: Railway (free tier) — internal service
Database:  MongoDB Atlas (free tier — upgrade when needed)
```

### CI/CD Flow
```
Push to develop branch
  → GitHub Actions runs tests
  → Tests pass → auto-deploy to staging
  → Manual approval → deploy to production
  → Run deployment checklist
  → Smoke test critical flows
  → Monitor logs for 2 hours
```

---

*TechTrust System Architecture v1.0 — Muhammed Ishaq — June 2026*
