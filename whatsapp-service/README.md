# whatsapp-service

Free WhatsApp OTP delivery for ArchIntent's phone verification. A real
WhatsApp account (yours, or a spare number's) stays logged in here via
[open-wa](https://github.com/open-wa/wa-automate-nodejs), and Laravel's
`OtpService` sends the verification code through it instead of a paid
SMS provider.

**Read this whole file before deploying.** A few things about how this
works are worth understanding up front, not discovered later:

- **The number you log in with is the number every user sees the code
  come from.** It cannot be hidden. If you don't want your own personal
  WhatsApp exposed this way, log in with a different number instead
  (see "Which number to use" below).
- **This carries real risk of that number being banned by WhatsApp**,
  since sending many short, similar, automated messages is exactly the
  pattern their anti-spam systems look for. Keep messages to *only* the
  OTP text, and only when a user actually requests one.
- **This is not open-wa's official Docker image or CLI Easy API.**
  `@open-wa/wa-automate`'s actual stable npm release (`4.76.0` -- the
  `5.x` line is alpha-only, unpublished as a stable release) exposes
  its built-in HTTP API over Socket.IO, not plain REST, which Laravel
  has no good client for. So this runs the library directly and exposes
  one small REST API of its own instead. See the comment at the top of
  `index.mjs` for the full reasoning.

## Which number to use

Any WhatsApp account works, but think about which one:

- **Your own personal number**: simplest, no cost, but every user sees
  your real phone number as the sender, and a ban affects your personal
  WhatsApp too.
- **A second number on WhatsApp Business**: keeps it separate from your
  personal chats (set the profile name to "ArchIntent" and add the
  logo), still requires a real SIM you control.
- **A spare/secondary SIM**: cleanest option if you have one -- an
  unused number is exactly what's needed here, and it costs nothing
  beyond the SIM itself.

Whichever number, it needs an active WhatsApp (or WhatsApp Business)
account with **Linked Devices** available, which is how this connects
(no password is ever entered here -- see "Scanning the QR code" below).

## How session persistence works

Heroku's own disk does not survive a dyno restart or a redeploy, and a
dyno *does* restart on its own periodically ("dyno cycling") even
without a deploy. Without persisting the login somewhere else, this
service would ask for a fresh QR scan on every restart -- not workable
for something meant to run unattended.

So instead: `archintent-backend`'s own database is used to store the
session (see `WhatsAppSessionController` and the `whatsapp_sessions`
table there). This service fetches it on boot and saves it back
whenever open-wa reports a session update (`sessionDataBase64.**`).
No new third-party account or storage service is needed for this.

## One-time setup

### 1. Create the Heroku app

```bash
heroku create <your-app-name> --region us
heroku stack:set container -a <your-app-name>
```

### 2. Set its config vars

```bash
heroku config:set \
  WA_API_KEY="$(openssl rand -hex 24)" \
  LARAVEL_BASE_URL="https://archintent-api.herokuapp.com" \
  INTERNAL_API_KEY="<same value as archintent-backend's INTERNAL_API_KEY>" \
  -a <your-app-name>
```

`WA_API_KEY` is whatever you want -- it's what Laravel and you (when
viewing `/qr`) both authenticate with. `openssl rand -hex 24` just
generates a long random one.

### 3. Point archintent-backend at it

In `archintent-backend`'s own config (Heroku config vars, not this
service's):

```bash
heroku config:set \
  OPENWA_BASE_URL="https://<your-app-name>.herokuapp.com" \
  OPENWA_API_KEY="<the same WA_API_KEY you set in step 2>" \
  -a archintent-api
```

Once both are set, `OTP_SMS_DRIVER` in `archintent-backend` resolves to
`openwa` automatically (see `config/otp.php`) -- no separate flag to flip.

### 4. Deploy

This repo's CI/CD already has a `deploy-whatsapp` job that pushes this
directory to Heroku on every push to `main`, the same way `nlp-service`
deploys -- but only once the `HEROKU_WHATSAPP_APP` repository variable
is set (GitHub repo → Settings → Secrets and variables → Actions →
Variables) to `<your-app-name>`. Until that variable exists, the job
is skipped entirely and nothing changes.

To deploy by hand instead:

```bash
git subtree push --prefix whatsapp-service https://git.heroku.com/<your-app-name>.git main
```

### 5. Scan the QR code

Once deployed, visit, in a browser:

```
https://<your-app-name>.herokuapp.com/qr?key=<WA_API_KEY>
```

Then on the phone with the WhatsApp account you're linking:
**WhatsApp → Settings → Linked Devices → Link a Device**, and scan
what's on screen. The page auto-refreshes until it's scanned; reload it
if it still says "no QR available" after a few seconds (the service may
still be starting up -- check `heroku logs --tail -a <your-app-name>`).

Once scanned, the session is saved automatically, and this service
should not ask for another scan unless the account is logged out from
the phone itself, or a very long time passes with the dyno never
running.

### 6. Verify it actually works

```bash
curl -s -X POST "https://<your-app-name>.herokuapp.com/api/sendText" \
  -H "X-Api-Key: <WA_API_KEY>" -H "Content-Type: application/json" \
  -d '{"to":"923001234567@c.us","content":"Test message from whatsapp-service"}'
```

(`to` is the recipient's number, digits only with country code, plus
`@c.us`.) You should see the message arrive on that WhatsApp within a
few seconds, and `{"id": "..."}` in the response.

## Local development

```bash
cp .env.example .env   # fill in the values
npm install
npm test                # pure-logic unit tests -- no Chrome, no network
npm start                # the real thing -- will try to launch Chrome
```

`npm start` locally uses whatever Chrome Puppeteer bundles for your own
OS (no `PUPPETEER_EXECUTABLE_PATH` needed outside the Docker image).

## Why not the official open-wa Docker image?

`openwa/wa-automate`'s image runs the CLI directly as its entrypoint,
which is that Socket.IO-based Easy API mentioned above, not something
this project's own persistence and REST-wrapper code plugs into
cleanly. Building from a plain `node:20-bookworm-slim` base with
`chromium` installed via `apt` keeps the whole setup auditable in one
Dockerfile, the same way `nlp-service/Dockerfile` in this repo does for
its own dependencies.
