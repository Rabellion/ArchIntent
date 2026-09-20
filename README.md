# ArchIntent

**An AI-augmented, three-sided marketplace connecting clients, architects, and construction
companies — bridging the pre-contract gap in the architecture and construction industry.**

[![CI/CD](https://github.com/Rabellion/ArchIntent/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/Rabellion/ArchIntent/actions/workflows/ci-cd.yml)

Final Year Project · Department of Software Engineering · Mirpur University of Science and
Technology (MUST), Mirpur, AJK, Pakistan.

---

## What it does

The architecture and construction industry lacks a unified digital ecosystem: clients struggle
to find and vet professionals, articulating design intent in technical terms is hard, and the
pre-contract phase (matching, negotiation, agreement) is manual and opaque. ArchIntent addresses
this with:

- **Semantic project matching** — a client's project brief is matched against architect
  portfolios using Sentence-BERT embeddings and cosine similarity, not keyword search.
- **Verified, role-based marketplace** — clients, architects, and construction companies each
  get a dedicated workspace; architect and contractor accounts are manually verified by an
  admin before they can be discovered.
- **End-to-end project lifecycle** — from project creation through matching, architect
  selection, a digitally signed agreement, escrowed Stripe payment, design delivery with a
  revision loop, to construction bidding and contractor selection.
- **Real-time communication** — a chat system built on Laravel Reverb (WebSockets) connects
  every party once a match is made.
- **Reviews and reputation** — clients rate architects and contractors after project milestones.
- **Admin oversight** — identity verification, user management, platform analytics, and an
  audit log of every administrative action.

## Architecture

This is a monorepo of three independently runnable services plus the FYP documentation:

```
ArchIntent/
├── archintent-backend/    Laravel 12 REST API — the system of record
├── archintent-frontend/   React 18 + TypeScript + Vite single-page app
├── nlp-service/           Python FastAPI microservice — voice, keywords, matching
├── fyp-report/            LaTeX source for the final report (XeLaTeX)
├── .github/workflows/     CI/CD pipeline (test -> deploy all three services)
├── DEPLOYMENT.md          Heroku + Vercel provisioning and deployment
└── ArchIntent_flow_test.pdf   Manual end-to-end test script
```

```
┌──────────────────┐      REST + WebSocket       ┌───────────────────┐
│  React frontend   │ ─────────────────────────▶ │  Laravel backend │
│  (Vite, :3000)    │ ◀───────────────────────── │  (:8000, Reverb  │
└──────────────────┘                              │   on :8080)      │
                                                  └─────────┬────────┘
                                                            │ internal API,
                                                            │ shared key
                                                            ▼
                                                  ┌───────────────────┐
                                                  │  NLP service      │
                                                  │  (FastAPI, :8001) │
                                                  │  Sentence-BERT    │
                                                  │  cosine similarity│
                                                  └───────────────────┘
```

The NLP service is deliberately a separate deployable unit: it can be scaled, redeployed, or
swapped independently of the Laravel application, and a failure there does not have to take the
rest of the platform down with it.

## Tech stack

| Layer | Technology | Version |
|---|---|---|
| Backend framework | Laravel | 12.57 |
| Language (backend) | PHP | 8.2 |
| Authentication | Laravel Sanctum | 4.3 |
| Real-time | Laravel Reverb | 1.10 |
| Database | MySQL | 8.x |
| Frontend framework | React | 18 |
| Language (frontend) | TypeScript | 4.9 |
| Build tool | Vite | 8 |
| Styling | Tailwind CSS | 3 |
| NLP runtime | Python + FastAPI | 3.x / 0.115 |
| Semantic embeddings | sentence-transformers (S-BERT) | 3.3 |
| Similarity scoring | scikit-learn | 1.5 |
| Payments | Stripe (Payment Intents + Connect) | — |
| Documentation | LaTeX (XeLaTeX) | — |

## Getting started

Four services, four terminals. All ports are configurable via each module's `.env`.

```bash
# 1. Backend API
cd archintent-backend
composer install
cp .env.example .env
php artisan key:generate
php artisan migrate --seed --seeder=TestDataSeeder
php artisan serve                      # http://127.0.0.1:8000

# 2. Real-time chat (separate terminal)
cd archintent-backend
php artisan reverb:start               # ws://127.0.0.1:8080

# 3. NLP matching service (separate terminal)
cd nlp-service
pip install -r requirements.txt
cp .env.example .env
uvicorn main:app --host 127.0.0.1 --port 8001

# 4. Frontend (separate terminal)
cd archintent-frontend
npm install
cp .env.example .env
npm run dev                            # http://localhost:3000
```

Copy every `.env.example` to `.env` in its own module and fill in real values — none of the
committed `.env.example` files contain working credentials. At minimum you will need a MySQL
connection string, a Stripe test secret/publishable key pair, a shared `INTERNAL_API_KEY`
(same value in the backend and the NLP service — it authenticates the callback between them),
and an `OPENAI_API_KEY` in `nlp-service/.env` for voice transcription (matching runs fine
without it; only the microphone feature needs it).

Seeded test accounts (password `Test@1234` for all): `admin@test.com`, `client@test.com`,
`architect@test.com` / `architect2@test.com`, `contractor@test.com` / `contractor2@test.com`,
and `pending@test.com` (an architect account awaiting admin verification).

## Containerization & CI/CD

Containerization is used selectively, based on an actual constraint, not applied uniformly
across the stack:

- **NLP service** — deployed as a **Docker container** (`nlp-service/Dockerfile` +
  `heroku.yml`). This is a necessity, not a style choice: `sentence-transformers` pulls in
  `torch`, and the combined dependency tree exceeds the 500MB slug size limit of a standard
  Heroku buildpack deploy. Packaging it as a container removes that ceiling (Heroku's
  Container Registry allows images up to 5GB). The image is built on **Heroku's own remote
  build servers** via `heroku.yml`, so deploying it requires no local Docker installation.
- **Backend** (`archintent-backend`) — deployed via Heroku's standard `heroku/php`
  buildpack, **not** a container. The Laravel app is well within the buildpack slug limit,
  and buildpack deploys are simpler to iterate on (a plain `git push`, no image build step).
- **Frontend** (`archintent-frontend`) — deployed to Vercel, which builds and serves the
  static Vite output directly; no container is involved.

**CI/CD**: automated via GitHub Actions (`.github/workflows/ci-cd.yml`). Pushing to `main`
runs the full test suite, and all three services deploy **only if every check passes**:

```
push to main
     │
     ├─ backend-test    PHP 8.2 · lint all 134 sources · PHPUnit
     ├─ frontend-test   tsc --noEmit (zero errors) · vite build
     └─ nlp-test        byte-compile · resolve requirements.txt on py3.11
     │
     └─ all green ──┬─ deploy backend  → Heroku (buildpack)
                    ├─ deploy NLP      → Heroku (remote Docker build)
                    └─ deploy frontend → Vercel
```

Design notes:

- **Tests gate deploys.** Each deploy job `needs:` all three test jobs, so a failing
  typecheck or test blocks the release rather than shipping a broken build.
- **Deploys are independent.** A Heroku problem doesn't block the Vercel deploy.
- **`concurrency` cancels superseded runs**, so two pushes in quick succession can't race
  each other onto the same dyno.
- **Unconfigured deploys skip rather than fail**, so the pipeline reads green while
  infrastructure is still being provisioned; each one activates automatically once its
  gating repo variable is set. (The gate has to be a variable — GitHub does not expose the
  `secrets` context in a job-level `if:`.)
- Pull requests run the tests but never deploy.

Configured under **Settings → Secrets and variables → Actions**:

| Type | Name |
|---|---|
| Secrets | `HEROKU_API_KEY`, `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID` |
| Variables | `HEROKU_BACKEND_APP`, `HEROKU_NLP_APP`, `VERCEL_ENABLED` |

Full provisioning steps, environment variable wiring, and a post-deploy verification
checklist are in `DEPLOYMENT.md`.

## Testing

Automated checks run on every push (see the pipeline above): PHP linting across all 134
backend sources, PHPUnit, a zero-error TypeScript typecheck, a production frontend build,
and dependency resolution for the NLP service.

Beyond that, the project maintains a manual test plan of 14 suites and 163 cases covering
authentication, public browsing, AI matching, real-time chat, agreements and signatures,
payments, design delivery, construction bidding, reviews, admin operations,
security/authorization, and the architect payout demo — alongside a static integrity audit
of every route and API call in the codebase. Those documents are kept locally rather than
committed (`TEST_PLAN.md`, `VERIFICATION_REPORT.md`) and are available on request.

## The AI intent-decoding pipeline

All three components described in the original project proposal are implemented, running as
one pipeline in `nlp-service`:

```
client's voice or typed brief
        │
        ▼
  Whisper (OpenAI API)         transcriber.py    -- speech-to-text, only if voice was used
        │
        ▼
  SpaCy keyword extraction     keyword_extractor.py
        │  style / room type / material / feature, via a curated
        │  PhraseMatcher vocabulary + noun-chunk fallback
        ▼
  Sentence-BERT embedding      matcher.py
        │  the brief is enriched with its own decoded keywords before
        │  embedding, so matching benefits automatically
        ▼
  cosine similarity ranking against architect portfolios
```

Two design choices worth noting:

- **Whisper runs via the OpenAI API, not a locally-loaded model.** The NLP service already
  carries Sentence-BERT + torch in a 512MB Heroku Eco dyno; a second in-process transformer
  model for speech recognition would risk the dyno running out of memory under real usage.
  Moving that compute off-dyno costs a few cents per demo and removes that failure mode
  entirely.
- **Keyword extraction is visible, not just internal.** Beyond enriching the matching text,
  `POST /projects/preview-intent` lets the frontend show the client a live "we understood:
  modern, minimalist, open-plan" confirmation while they are still writing or reviewing their
  brief — a concrete, demonstrable piece of the intent-decoding claim, not something that only
  shows up in a log file.

The architect **bank withdrawal** feature is a demo path: it records bank details and
withdrawal requests for manual settlement but does not move funds automatically. Automated
payouts run through Stripe Connect, which is implemented separately.

## Documentation

- `fyp-report/` — the full final year project report
- `DEPLOYMENT.md` — provisioning and deployment for Heroku and Vercel
- `ArchIntent.postman_collection.json` — a Postman collection for the API

## Team

| Name | Registration No. |
|---|---|
| Muhammad Dawood Khan | FA22-BSE-067 |
| Huzaifa Imran | FA22-BSE-075 |

Department of Software Engineering, Faculty of Engineering & Technology, Mirpur University of
Science and Technology (MUST), Mirpur, AJK, Pakistan.

## License

Academic project. No license is granted for commercial use without the authors' permission.
