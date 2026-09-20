# ArchIntent

**An AI-augmented, three-sided marketplace connecting clients, architects, and construction
companies — bridging the pre-contract gap in the architecture and construction industry.**

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
├── nlp-service/           Python FastAPI microservice — semantic matching only
├── fyp-report/            LaTeX source for the final report (XeLaTeX)
├── archintent.sql         Reference schema dump (30 tables)
├── TEST_PLAN.md           Full feature test plan (14 suites, 163 cases)
└── ArchIntent_flow_test.pdf   Manual end-to-end test script
```

```
┌──────────────────┐      REST + WebSocket      ┌───────────────────┐
│  React frontend   │ ─────────────────────────▶ │  Laravel backend   │
│  (Vite, :3000)    │ ◀───────────────────────── │  (:8000, Reverb    │
└──────────────────┘                             │   on :8080)        │
                                                  └─────────┬──────────┘
                                                            │ internal API,
                                                            │ shared key
                                                            ▼
                                                  ┌───────────────────┐
                                                  │  NLP service        │
                                                  │  (FastAPI, :8001)   │
                                                  │  Sentence-BERT       │
                                                  │  cosine similarity   │
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
connection string, a Stripe test secret/publishable key pair, and a shared `INTERNAL_API_KEY`
(same value in the backend and the NLP service — it authenticates the callback between them).

Seeded test accounts (password `Test@1234` for all): `admin@test.com`, `client@test.com`,
`architect@test.com` / `architect2@test.com`, `contractor@test.com` / `contractor2@test.com`,
and `pending@test.com` (an architect account awaiting admin verification).

## Testing

`TEST_PLAN.md` is the canonical test plan: 14 suites and 163 cases covering authentication,
public browsing, AI matching, real-time chat, agreements and signatures, payments, design
delivery, construction bidding, reviews, admin operations, security/authorization, and the
architect payout demo. It also documents corrections to the older manual flow-test script and a
static integrity audit of every route and API call in the codebase.

## Known limitations

Two capabilities described in the original project proposal are **not** implemented in the
delivered system, and the codebase does not claim otherwise:

- **Voice query input (Whisper)** — the proposal specified speech-to-text as part of the intent
  pipeline; no speech recognition package or microphone UI exists in this build.
- **Keyword extraction (SpaCy)** — the proposal specified a keyword-extraction stage ahead of
  semantic matching; the delivered pipeline embeds and matches the raw brief text directly.

The semantic matching stage itself (Sentence-BERT + cosine similarity) is fully implemented and
is what the project's AI contribution rests on. See `fyp-report/chapters/ch3-methodology.tex`
for the full discrepancy note and the reasoning behind the scope decision.

The architect **bank withdrawal** feature is a demo path: it records bank details and
withdrawal requests for manual settlement but does not move funds automatically. Automated
payouts run through Stripe Connect, which is implemented separately.

## Documentation

- `fyp-report/` — the full LaTeX final report (build with `fyp-report/compile.sh` or upload the
  folder to Overleaf; see `fyp-report/README.md`)
- `TEST_PLAN.md` — full feature test plan
- `VERIFICATION_REPORT.md` — a prior end-to-end verification pass with bugs found and fixed
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
