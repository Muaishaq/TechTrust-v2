# TechTrust Product Specification
# Version: 1.0
# Author: Muhammed Ishaq — Founder & CEO, TechTrust
# Created: June 2026
# Purpose: Complete description of every feature, screen, user flow, and data model

---

## 1. Product Overview

**TechTrust** is a two-sided AI-powered developer credibility platform.

It serves **developers** by verifying their real skills through GitHub analysis
and coaching them to build the right online presence to get hired.

It serves **employers and recruiters** by providing a verified, trusted talent
pool they can search and hire from with confidence.

**Tagline:** The Trust Layer Between Developers and Employers

**Problem solved:**
- African developers are skilled but invisible — no digital footprint, no proof
- Employers drown in unverifiable CVs and waste money on bad hires
- No AI-powered verification layer exists for the African tech market

---

## 2. User Types

### 2.1 Developer
A tech professional seeking verified proof of their skills and coaching on
building their digital presence to compete for remote and local jobs.

### 2.2 Employer / Recruiter
A company or hiring manager seeking verified, trustworthy developer profiles
to hire from — locally in Africa or remotely from abroad.

### 2.3 Admin
The TechTrust team (initially the founder) with full platform oversight,
moderation, analytics, and control capabilities.

---

## 3. Authentication

### 3.1 Method
- GitHub OAuth 2.0 ONLY — no username/password
- On login, TechTrust fetches the user's GitHub profile automatically
- JWT access token (15 min expiry) + refresh token (7 days, rotated on use)
- Tokens stored in HttpOnly cookies — never localStorage

### 3.2 Registration Flow
1. User clicks "Sign in with GitHub"
2. GitHub OAuth consent screen
3. TechTrust receives GitHub profile data
4. System checks if email already registered
5. If new user → account creation → role selection screen (Developer or Employer)
6. If existing user → redirect to dashboard

### 3.3 Role Selection
After first GitHub login, user selects:
- "I am a Developer — I want to get verified"
- "I am an Employer — I want to hire verified developers"

---

## 4. Developer Features

### 4.1 Developer Dashboard
The main screen after login. Shows:
- TechTrust Trust Score (0–100)
- Verification status (Unverified / In Progress / Verified)
- Top 3 skill areas with scores
- Coaching insights summary
- Profile completion percentage
- Quick actions: View Profile, Run Verification, Share Badge

### 4.2 GitHub Verification Flow
1. Developer clicks "Verify My Skills"
2. TechTrust requests GitHub API access (read-only)
3. System fetches: repositories, commit history, languages used,
   contribution patterns, code complexity indicators, stars received,
   pull request history, issue activity
4. Data sent to AI Scoring Engine
5. Scores generated across skill dimensions
6. Coaching insights generated based on weaknesses detected
7. Trust Score calculated (0–100 composite)
8. Developer shown full results screen

### 4.3 Skill Scoring Dimensions
The AI engine scores developers across these dimensions (0–100 each):

- **Code Consistency** — regularity of commits over time
- **Language Proficiency** — depth of usage per programming language
- **Project Complexity** — sophistication of repositories built
- **Collaboration Score** — pull requests, code reviews, open source contributions
- **Documentation Quality** — README files, code comments, wiki usage
- **Activity Recency** — how recently and actively the developer has been coding
- **Originality Score** — ratio of original work vs forked repositories
- **Community Impact** — stars received, followers, forks of their work

### 4.4 Developer Profile Page (Public)
A public-facing page visible to employers. Contains:
- Full name, title, location
- TechTrust Trust Score badge
- Verified skill scores (visual chart)
- Top languages and frameworks
- Featured repositories (auto-selected by AI, developer can curate)
- Contribution activity heatmap
- Coaching completion badges
- Verification timestamp and TechTrust badge
- "Contact Me" button (for employers)

### 4.5 Footprint Coaching Module
After verification, TechTrust generates personalised coaching insights:

**Example coaching cards:**
- "Your commit history has large gaps — here's how to build consistency"
- "You have no README files in 8 of your repos — here's why this costs you jobs"
- "Your LinkedIn has no GitHub link — here's how to fix your online presence"
- "You have 0 contributions to open source — here's how to start today"

Each coaching card includes:
- The specific problem detected
- Why it matters to employers
- Step-by-step action to fix it
- Estimated impact on Trust Score

### 4.6 TechTrust Credibility Badge
- Generated after first verification
- Cryptographically signed (Open Badges 3.0 standard)
- Contains: developer name, Trust Score, verification date, TechTrust signature
- Shareable link, embeddable HTML snippet, downloadable PNG
- Employers can click the badge to verify it is authentic on TechTrust

### 4.7 Developer Pricing
- **Free tier:** Basic verification, Trust Score, standard badge, 3 coaching cards
- **Premium ($5–8/month):** Full coaching report, detailed skill breakdown,
  priority badge styling, boosted visibility in employer search,
  re-verification every 30 days (free tier: every 90 days)

---

## 5. Employer Features

### 5.1 Employer Dashboard
Main screen after login. Shows:
- Search bar (search verified developers)
- Saved developer profiles
- Active job postings
- Recent verification API usage (if on API plan)
- Quick stats: developers contacted, profiles saved, hires made

### 5.2 Developer Search & Discovery
Employers can search and filter verified developers by:
- Skills / programming languages
- Trust Score range (minimum score filter)
- Location (country, city)
- Availability (open to work, freelance, full-time)
- Experience level
- Specific frameworks or tools
- Verification recency

Search results show:
- Developer name and title
- Trust Score badge
- Top 3 skills
- Location
- Last active
- "View Profile" and "Save" buttons

### 5.3 Developer Profile View (Employer perspective)
Same as public profile but additionally shows:
- Full skill score breakdown
- Coaching completion rate (shows developer is improving)
- Verification history
- Contact button

### 5.4 Job Postings
Employers can post opportunities:
- Job title, description, requirements
- Salary range (optional)
- Remote / hybrid / onsite
- Required minimum Trust Score
- Application deadline

Verified developers matching the criteria are notified.

### 5.5 Employer Pricing
- **Free:** View 5 profiles/month, post 1 job listing
- **Starter (₦30,000/month):** Unlimited profile views, 5 job listings, basic search filters
- **Pro (₦60,000/month):** Everything in Starter + advanced filters, saved searches,
  CSV export of developer lists, priority support
- **Enterprise:** API access, ATS integration, custom pricing

---

## 6. Admin Features

### 6.1 Admin Dashboard
Overview of entire platform:
- Total registered developers
- Total verified developers
- Total employers
- Total verifications run today / this week / this month
- Revenue metrics (MRR, total revenue)
- Platform health indicators
- Recent flagged profiles
- Recent disputes

### 6.2 User Management
- View all developers and employers
- Search and filter users
- View any user's full profile and activity
- Suspend, ban, or reactivate accounts
- Manually override verification status
- Send system messages to individual users or all users

### 6.3 Verification Oversight
- View all verification requests and results
- Flag profiles where AI confidence score is low (< 60%)
- Manually review and approve flagged verifications
- Override AI scores with manual assessment and reason logged
- View AI engine performance metrics

### 6.4 AI Score Monitoring
- View distribution of Trust Scores across all developers
- Monitor AI engine accuracy over time
- View anomalous scoring patterns
- Trigger model retraining when performance degrades
- View per-dimension score averages across the platform

### 6.5 Platform Analytics
- User growth charts (daily, weekly, monthly)
- Verification volume over time
- Employer activity metrics
- Revenue breakdown by plan type
- Geographic distribution of users
- Most common coaching insights triggered
- Badge share rates

### 6.6 Content Management
- Update coaching card content
- Manage job posting categories
- Send platform-wide announcements
- Manage FAQ and help content

### 6.7 Dispute Resolution
- View developer-submitted disputes about their scores
- Review dispute with full context
- Respond to dispute
- Approve re-verification
- Log resolution with reason

### 6.8 Financial Management
- View all transactions (Flutterwave + Stripe)
- View subscription status of all employers
- Process refunds
- View revenue by plan, by month, by geography

---

## 7. Notification System

All users receive notifications via:
- In-app notification bell
- Email

### Developer notifications:
- Verification complete
- Trust Score changed
- New coaching insight available
- New job matching your profile posted
- Badge shared or viewed by employer
- Premium plan expiring soon

### Employer notifications:
- New developer matching saved search
- Developer applied to your job posting
- Verification API quota warning

### Admin notifications:
- New flagged profile requiring review
- New dispute submitted
- Platform error detected
- Revenue milestone reached
- Unusual traffic pattern detected

---

## 8. Data Models

### 8.1 User
```
{
  _id: ObjectId,
  githubId: String (unique),
  githubUsername: String,
  email: String (unique),
  name: String,
  avatarUrl: String,
  role: enum['developer', 'employer', 'admin'],
  isActive: Boolean,
  isSuspended: Boolean,
  createdAt: Date,
  updatedAt: Date,
  lastLoginAt: Date
}
```

### 8.2 Developer Profile
```
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  title: String,
  bio: String,
  location: { country, city },
  skills: [String],
  availability: enum['open', 'freelance', 'not_available'],
  experienceLevel: enum['junior', 'mid', 'senior'],
  trustScore: Number (0-100),
  verificationStatus: enum['unverified', 'pending', 'verified', 'flagged'],
  lastVerifiedAt: Date,
  planType: enum['free', 'premium'],
  planExpiresAt: Date,
  badgeUrl: String,
  isPublic: Boolean,
  linkedinUrl: String,
  portfolioUrl: String,
  createdAt: Date,
  updatedAt: Date
}
```

### 8.3 Verification Record
```
{
  _id: ObjectId,
  developerId: ObjectId (ref: DeveloperProfile),
  status: enum['pending', 'complete', 'failed', 'flagged'],
  githubDataSnapshot: Object,
  skillScores: {
    codeConsistency: Number,
    languageProficiency: Object,
    projectComplexity: Number,
    collaborationScore: Number,
    documentationQuality: Number,
    activityRecency: Number,
    originalityScore: Number,
    communityImpact: Number
  },
  trustScore: Number,
  aiConfidenceScore: Number,
  coachingInsights: [ObjectId] (ref: CoachingInsight),
  flagReason: String,
  adminReviewedBy: ObjectId (ref: User),
  adminReviewNote: String,
  createdAt: Date,
  completedAt: Date
}
```

### 8.4 Coaching Insight
```
{
  _id: ObjectId,
  verificationId: ObjectId,
  developerId: ObjectId,
  category: enum['github', 'linkedin', 'consistency', 'openSource', 'documentation', 'visibility'],
  severity: enum['critical', 'important', 'suggestion'],
  title: String,
  problem: String,
  whyItMatters: String,
  actionSteps: [String],
  scorImpact: Number,
  isCompleted: Boolean,
  completedAt: Date,
  createdAt: Date
}
```

### 8.5 Employer Profile
```
{
  _id: ObjectId,
  userId: ObjectId (ref: User),
  companyName: String,
  companySize: enum['1-10', '11-50', '51-200', '200+'],
  industry: String,
  website: String,
  location: { country, city },
  planType: enum['free', 'starter', 'pro', 'enterprise'],
  planExpiresAt: Date,
  savedDevelopers: [ObjectId],
  createdAt: Date,
  updatedAt: Date
}
```

### 8.6 Job Posting
```
{
  _id: ObjectId,
  employerId: ObjectId (ref: EmployerProfile),
  title: String,
  description: String,
  requirements: [String],
  salaryRange: { min, max, currency },
  workType: enum['remote', 'hybrid', 'onsite'],
  minimumTrustScore: Number,
  status: enum['active', 'closed', 'draft'],
  applicants: [ObjectId],
  deadline: Date,
  createdAt: Date,
  updatedAt: Date
}
```

### 8.7 Dispute
```
{
  _id: ObjectId,
  developerId: ObjectId,
  verificationId: ObjectId,
  reason: String,
  description: String,
  status: enum['open', 'under_review', 'resolved', 'rejected'],
  adminResponse: String,
  resolvedBy: ObjectId (ref: User),
  createdAt: Date,
  resolvedAt: Date
}
```

---

## 9. API Structure

All endpoints versioned under `/api/v1/`

### Auth
- `GET  /api/v1/auth/github`          — Initiate GitHub OAuth
- `GET  /api/v1/auth/github/callback` — GitHub OAuth callback
- `POST /api/v1/auth/refresh`         — Refresh access token
- `POST /api/v1/auth/logout`          — Logout and clear tokens
- `GET  /api/v1/auth/me`              — Get current authenticated user

### Developers
- `GET  /api/v1/developers/profile`         — Get own profile
- `PUT  /api/v1/developers/profile`         — Update own profile
- `GET  /api/v1/developers/:username`       — Get public profile (public)
- `POST /api/v1/developers/verify`          — Trigger verification
- `GET  /api/v1/developers/verification`    — Get latest verification result
- `GET  /api/v1/developers/coaching`        — Get coaching insights
- `PUT  /api/v1/developers/coaching/:id`    — Mark coaching insight complete
- `GET  /api/v1/developers/badge`           — Get badge data

### Employers
- `GET  /api/v1/employers/profile`          — Get own employer profile
- `PUT  /api/v1/employers/profile`          — Update employer profile
- `GET  /api/v1/employers/search`           — Search verified developers
- `GET  /api/v1/employers/saved`            — Get saved developers
- `POST /api/v1/employers/saved/:devId`     — Save a developer
- `DELETE /api/v1/employers/saved/:devId`   — Unsave a developer
- `GET  /api/v1/employers/jobs`             — Get own job postings
- `POST /api/v1/employers/jobs`             — Create job posting
- `PUT  /api/v1/employers/jobs/:id`         — Update job posting
- `DELETE /api/v1/employers/jobs/:id`       — Delete job posting

### Admin
- `GET  /api/v1/admin/dashboard`            — Platform overview stats
- `GET  /api/v1/admin/users`                — List all users
- `PUT  /api/v1/admin/users/:id/suspend`    — Suspend user
- `PUT  /api/v1/admin/users/:id/activate`   — Activate user
- `GET  /api/v1/admin/verifications`        — List all verifications
- `PUT  /api/v1/admin/verifications/:id`    — Review flagged verification
- `GET  /api/v1/admin/disputes`             — List all disputes
- `PUT  /api/v1/admin/disputes/:id`         — Resolve dispute
- `GET  /api/v1/admin/analytics`            — Platform analytics data

### Payments
- `POST /api/v1/payments/developer/subscribe`  — Developer premium subscription
- `POST /api/v1/payments/employer/subscribe`   — Employer plan subscription
- `POST /api/v1/payments/webhook/flutterwave`  — Flutterwave webhook (public)
- `POST /api/v1/payments/webhook/stripe`       — Stripe webhook (public)
- `GET  /api/v1/payments/subscription`         — Get own subscription status

### Public
- `GET  /api/v1/public/badge/:badgeId`      — Verify a TechTrust badge (public)
- `GET  /api/v1/public/jobs`                — Browse public job listings (public)
- `GET  /api/v1/health`                     — Platform health check (public)

---

## 10. Environment Variables Required

### Backend (.env)
```
NODE_ENV=development
PORT=5000
MONGODB_URI=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
JWT_ACCESS_EXPIRY=15m
JWT_REFRESH_EXPIRY=7d
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
GITHUB_CALLBACK_URL=
FLUTTERWAVE_PUBLIC_KEY=
FLUTTERWAVE_SECRET_KEY=
FLUTTERWAVE_WEBHOOK_SECRET=
STRIPE_PUBLIC_KEY=
STRIPE_SECRET_KEY=
STRIPE_WEBHOOK_SECRET=
AI_ENGINE_URL=http://localhost:8000
FRONTEND_URL=http://localhost:5173
ALERT_EMAIL=
```

### Frontend (.env)
```
VITE_API_BASE_URL=http://localhost:5000/api/v1
VITE_GITHUB_CLIENT_ID=
```

### AI Engine (.env)
```
FLASK_ENV=development
PORT=8000
MONGODB_URI=
GITHUB_TOKEN=
```

---

*TechTrust Product Specification v1.0 — Muhammed Ishaq — June 2026*
