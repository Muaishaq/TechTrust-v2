<!--
  @file        README.md
  @description Project overview — TechTrust platform introduction, stack, setup, and documentation links
  @author      Muaishaq
  @created     2026-06-25
  @modified    2026-06-25
-->

# TechTrust

**The Trust Layer Between Developers and Employers**

TechTrust is an AI-powered developer credential verification and coaching platform built by Muhammed Ishaq (Muaishaq). It helps African developers prove their real skills through GitHub analysis, receive personalized coaching to strengthen their online presence, and connect with employers who need verified, trustworthy talent.

---

## What TechTrust Does

TechTrust is a two-sided credibility platform:

- **For developers** — Verifies skills via GitHub analysis, generates a Trust Score (0–100), and delivers coaching insights to improve visibility and hireability.
- **For employers** — Provides a searchable pool of verified developer profiles, reducing hiring risk and time spent on unverifiable CVs.
- **For admins** — Full platform oversight including moderation, analytics, audit trails, and dispute resolution.

Authentication is GitHub OAuth only. Verification runs through a dedicated Python AI scoring engine. All personal data handling follows NDPR and GDPR requirements.

---

## User Types

| Role | Description |
|------|-------------|
| **Developer** | A tech professional seeking verified proof of skills and coaching to build a stronger digital presence for remote and local jobs. |
| **Employer / Recruiter** | A company or hiring manager searching for verified, trustworthy developer profiles to hire locally or remotely. |
| **Admin** | The TechTrust team with full platform oversight, moderation, analytics, and control capabilities. |

---

## Tech Stack

| Layer | Technology | Hosting |
|-------|------------|---------|
| **Frontend** | React 18 + Vite 5 | Netlify |
| **Backend** | Node.js 20 LTS + Express | Railway |
| **AI Engine** | Python 3.11 + Flask | Railway |
| **Database** | MongoDB Atlas 7.x | MongoDB Atlas |
| **Auth** | GitHub OAuth 2.0 + JWT (HttpOnly cookies) | — |
| **Payments** | Flutterwave (Africa) + Stripe (Global) | — |

Additional services: Nodemailer (email), ip-api.com (country/city geolocation only), Winston (logging), UptimeRobot (monitoring).

---

## Prerequisites

Before setting up locally, ensure you have:

| Tool | Version |
|------|---------|
| **Node.js** | 20.x LTS |
| **Python** | 3.11 |
| **Git** | 2.x or later |
| **MongoDB Atlas** | Free-tier cluster (512 MB) |

Recommended: VS Code with ESLint and Prettier extensions.

---

## Local Setup

### 1. Clone the repository

```bash
git clone https://github.com/your-org/techtrust-v2.git
cd techtrust-v2
```

### 2. Set up MongoDB Atlas

1. Create a free cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas).
2. Create a database user with read/write access.
3. Whitelist your IP address (or `0.0.0.0/0` for local development only).
4. Copy the connection string — you will use it in the backend `.env` file.

### 3. Set up the backend

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env` with your MongoDB URI, GitHub OAuth credentials, JWT secrets, and other required values (see `docs/SPECIFICATION.md` for the full variable list).

```bash
npm install
npm run dev
```

The API runs at `http://localhost:5000` by default.

### 4. Set up the AI engine

```bash
cd ../ai-engine
python -m venv venv
```

**Windows:**

```bash
venv\Scripts\activate
```

**macOS / Linux:**

```bash
source venv/bin/activate
```

```bash
cp .env.example .env
pip install -r requirements.txt
python app.py
```

The AI engine runs at `http://localhost:5001` by default.

### 5. Set up the frontend

```bash
cd ../frontend
cp .env.example .env
```

Edit `frontend/.env` and set `VITE_API_BASE_URL` to your backend URL (e.g. `http://localhost:5000`).

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173` by default.

### 6. Verify the setup

1. Open `http://localhost:5173` in your browser.
2. Confirm the backend health endpoint responds at `/api/v1/health`.
3. Confirm the AI engine health endpoint responds.

---

## Folder Structure

```
techtrust-v2/
├── .cursor/              # Cursor AI rules
├── .gitignore
├── README.md
├── backend/              # Node.js + Express API
├── ai-engine/            # Python Flask scoring engine
├── frontend/             # React + Vite application
└── docs/                 # Foundation documentation
    ├── CONSTITUTION.md
    ├── SPECIFICATION.md
    ├── ARCHITECTURE.md
    ├── TODO.md
    ├── PROMPTS.md
    └── AGENT_BRIEFING.md
```

See [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the complete folder structure and data flow diagrams.

---

## Foundation Documentation

| Document | Purpose |
|----------|---------|
| [CONSTITUTION.md](docs/CONSTITUTION.md) | 10 non-negotiable engineering standards — supreme authority for all code |
| [SPECIFICATION.md](docs/SPECIFICATION.md) | Complete product specification — features, screens, user flows, data models |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Technical blueprint — stack, folder structure, data flow, deployment |
| [TODO.md](docs/TODO.md) | Master ordered task list — work top to bottom, never skip ahead |
| [PROMPTS.md](docs/PROMPTS.md) | AI tool briefing prompts for Lovable, Cursor, and Claude |
| [AGENT_BRIEFING.md](docs/AGENT_BRIEFING.md) | Session-start prompts for each development agent |

---

## Engineering Standards

All development on TechTrust follows the [Engineering Constitution](docs/CONSTITUTION.md). The golden rule applies to every file, every agent, and every deployment:

**If any code violates any one of the 10 standards — it does not ship.**

Key principles include strict layer separation (routes → controllers → services → repositories → models), mandatory input validation, rate limiting on all endpoints, NDPR/GDPR compliance, immutable audit trails, and zero secrets in source code.

---

*TechTrust — Muhammed Ishaq — June 2026*
