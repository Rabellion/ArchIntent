# Deploying ArchIntent

Frontend → **Vercel**. Backend + MySQL + AI matching service → **Heroku**.

This is a monorepo, so each Heroku app is deployed from its own subdirectory via
`git subtree push`, not from the repo root.

---

## Architecture chosen (and why)

| Decision | Choice | Why |
|---|---|---|
| MySQL | Heroku JawsDB add-on | Kept entirely within Heroku's own billing/dashboard, per your preference. No free tier exists for MySQL add-ons on Heroku — budget ~$15+/mo. |
| Reverb (chat) + queue worker | Single dyno, `QUEUE_CONNECTION=sync`, Reverb backgrounded inside the web dyno | Avoids paying for two extra always-on dynos. Nginx proxies WebSocket traffic to Reverb internally — one public hostname, one dyno. |
| NLP service | Heroku, **container stack** via `heroku.yml` | `sentence-transformers` + `torch` exceed Heroku's 500MB buildpack slug limit. `heroku.yml` triggers a **remote** Docker build on Heroku's own servers — no Docker installed locally. Zero changes to `matcher.py`. |

**Prerequisite: both CLIs are already installed** in this environment:
```
"/c/Users/Huzaifa Imran/AppData/Roaming/npm/vercel"
"/c/Users/Huzaifa Imran/tools/heroku/bin/heroku.cmd"
```
Add them to PATH for convenience, or keep using the full paths below.

**Log in first** (browser-based, must be done by you):
```bash
heroku login
vercel login
```

---

## 1. Backend → Heroku

```bash
cd archintent-backend

# Create the app (pick your own name; must be globally unique on Heroku)
heroku create archintent-api

# Buildpack: standard PHP (nginx + php-fpm)
heroku buildpacks:set heroku/php -a archintent-api

# MySQL add-on
heroku addons:create jawsdb:kitefin -a archintent-api
# JawsDB provisions JAWSDB_URL. config/database.php's mysql connection
# already reads DB_URL (Laravel's native connection-string support) —
# just point it at JawsDB, no code change needed:
heroku config:set DB_URL="$(heroku config:get JAWSDB_URL -a archintent-api)" -a archintent-api

# Core app config
heroku config:set -a archintent-api \
  APP_ENV=production \
  APP_DEBUG=false \
  APP_KEY="$(php artisan key:generate --show)" \
  QUEUE_CONNECTION=sync \
  BROADCAST_CONNECTION=reverb \
  REVERB_APP_ID=archintent \
  REVERB_APP_KEY="$(openssl rand -hex 16)" \
  REVERB_APP_SECRET="$(openssl rand -hex 24)" \
  REVERB_HOST=127.0.0.1 \
  REVERB_PORT=8080 \
  REVERB_SCHEME=http \
  STRIPE_KEY=pk_test_... \
  STRIPE_SECRET=sk_test_... \
  STRIPE_VERIFY_SSL=true \
  INTERNAL_API_KEY="$(openssl rand -hex 32)" \
  FRONTEND_URL=https://archintent.vercel.app

# Deploy (subtree push: only this subfolder's history goes to Heroku)
cd ..
git subtree push --prefix=archintent-backend heroku-backend main
```

If `heroku-backend` isn't set up as a remote yet:
```bash
heroku git:remote -a archintent-api -r heroku-backend
```

`release: php artisan migrate --force` in the Procfile runs migrations automatically
on every deploy. Seed once, manually, after the first deploy:
```bash
heroku run php artisan db:seed --class=TestDataSeeder -a archintent-api
```

### ⚠️ File storage — required before real use

`FILESYSTEM_DISK=local` is fine for local dev, but **Heroku's filesystem is ephemeral** —
every dyno restart (including routine daily cycling) wipes it. Any uploaded design files
or portfolio images would silently disappear. `config/filesystems.php` already has a
working `s3` disk defined; it just needs real values:

```bash
# Easiest: Heroku's Bucketeer add-on provisions an S3 bucket and sets these automatically
heroku addons:create bucketeer:hobbyist -a archintent-api
heroku config:set FILESYSTEM_DISK=s3 -a archintent-api
# Bucketeer's config vars are named BUCKETEER_* — map them:
heroku config:set \
  AWS_ACCESS_KEY_ID="$(heroku config:get BUCKETEER_AWS_ACCESS_KEY_ID -a archintent-api)" \
  AWS_SECRET_ACCESS_KEY="$(heroku config:get BUCKETEER_AWS_SECRET_ACCESS_KEY -a archintent-api)" \
  AWS_DEFAULT_REGION="$(heroku config:get BUCKETEER_AWS_REGION -a archintent-api)" \
  AWS_BUCKET="$(heroku config:get BUCKETEER_BUCKET_NAME -a archintent-api)" \
  -a archintent-api
```
Or use the AWS credentials already sitting in `.env` (`AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`
are present but `AWS_BUCKET` is currently empty) if you already have a real S3 bucket —
just set `AWS_BUCKET` and `FILESYSTEM_DISK=s3` directly instead of using Bucketeer.

### About the single-dyno Reverb setup

`Procfile` starts Reverb in the background on `127.0.0.1:8080` (internal only), then
launches nginx in the foreground bound to Heroku's `$PORT`. `nginx-app.conf` proxies
`/app/` (the path Reverb's Pusher-protocol client always connects to) through to Reverb.
Frontend env vars should point at the **same public Heroku hostname**, not a separate one:

```
VITE_REVERB_HOST=archintent-api.herokuapp.com
VITE_REVERB_PORT=443
VITE_REVERB_SCHEME=https
```

**Test this specifically after first deploy** — it's the trickiest part of this setup.
If real-time chat doesn't connect, the documented fallback (no code change, one command)
is to split Reverb into its own dyno:
```bash
# Remove "php artisan reverb:start ... &" from Procfile's web line first, then:
heroku ps:scale reverb=1 -a archintent-api   # billed separately, ~$5-7/mo
```

---

## 2. NLP service → Heroku (container stack)

```bash
cd nlp-service
heroku create archintent-nlp
heroku stack:set container -a archintent-nlp   # tells Heroku to use heroku.yml + Dockerfile

heroku config:set -a archintent-nlp \
  INTERNAL_KEY="<same value as the backend's INTERNAL_API_KEY>" \
  LARAVEL_URL=https://archintent-api.herokuapp.com \
  MIN_SCORE=0.20 \
  TOP_K=10 \
  ENABLE_LARAVEL_CALLBACK=0

cd ..
heroku git:remote -a archintent-nlp -r heroku-nlp
git subtree push --prefix=nlp-service heroku-nlp main
```

This triggers a **remote** Docker build on Heroku's servers (no local Docker needed).
The first build will take several minutes — it's downloading and installing torch.

Then tell the backend where to find it:
```bash
heroku config:set MATCHING_NLP_SERVICE_URL=https://archintent-nlp.herokuapp.com -a archintent-api
```

---

## 3. Frontend → Vercel

```bash
cd archintent-frontend
vercel link      # first time: creates/links a Vercel project
vercel env add VITE_API_URL production        # -> https://archintent-api.herokuapp.com/api
vercel env add VITE_REVERB_HOST production     # -> archintent-api.herokuapp.com
vercel env add VITE_REVERB_PORT production     # -> 443
vercel env add VITE_REVERB_SCHEME production   # -> https
vercel env add VITE_REVERB_APP_KEY production  # -> same value as backend's REVERB_APP_KEY
vercel env add VITE_STRIPE_PUBLIC_KEY production  # -> pk_test_...

vercel --prod
```

`vercel.json` (already added) rewrites every path to `index.html` so React Router's
client-side routes work on a hard refresh, and long-caches Vite's hashed asset files.

Once you have the real Vercel URL, go back and set it on the backend:
```bash
heroku config:set FRONTEND_URL=https://<your-real-vercel-domain>.vercel.app -a archintent-api
```
`config/cors.php` already allows both that exact origin and any `*.vercel.app` preview
deployment, so PR/branch previews aren't blocked by CORS during grading/review.

---

## Verification checklist after deploy

- [ ] `https://archintent-api.herokuapp.com/api/health` → 200
- [ ] `https://archintent-nlp.herokuapp.com/docs` → FastAPI docs load (first request may be slow — dyno spin-up)
- [ ] Frontend loads on the Vercel URL, `/architects` shows verified architects
- [ ] Register/login works (confirms DB connection via JawsDB)
- [ ] Create a project → matches appear (confirms backend ↔ NLP service ↔ `INTERNAL_API_KEY` wiring)
- [ ] Open `/messages` in two browser sessions, send a message → arrives without refresh (confirms the Reverb nginx proxy)
- [ ] Upload a design file, restart the dyno (`heroku restart -a archintent-api`), confirm the file still downloads — if it disappears, S3 isn't wired up yet

## Costs (approximate, USD/month)

| Item | Cost |
|---|---|
| Backend dyno (Eco) | ~$5 |
| NLP service dyno (Eco) | ~$5 |
| JawsDB (kitefin, smallest tier) | ~$15 |
| Bucketeer (hobbyist, smallest tier) | ~$1 |
| Vercel (Hobby plan) | $0 |
| **Total** | **~$26/mo** |

Eco dynos sleep after 30 minutes of inactivity and take a few seconds to wake on the
next request — acceptable for an FYP demo, worth knowing before a live viva so a cold
start isn't mistaken for a bug.
