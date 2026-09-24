// Keeps one real WhatsApp login alive and exposes just enough HTTP API
// for Laravel's OtpService (sendViaOpenWa) to send a message through it.
//
// This deliberately does NOT use open-wa's own built-in CLI/Easy API
// server:
//   - in @open-wa/wa-automate 4.x (the actual stable release -- 5.x is
//     alpha-only on npm), that server calls client methods over
//     Socket.IO, not plain REST, which Laravel has no good client for
//   - its `ezqr` option uploads the login QR to a third-party cloud
//     service to generate a public link, which this service has no
//     reason to hand sensitive auth material to
//
// Instead this uses @open-wa/wa-automate as a plain library and runs
// one small HTTP server of its own, bound directly to Heroku's $PORT
// (a Heroku web dyno only routes one port, so there's no separate
// "backend" process here -- this *is* the whole web process).
//
// Session persistence: open-wa's own session (a base64 string, via its
// `sessionData`/`sessionDataBase64.**` mechanism) is fetched from and
// saved back to the Laravel app's database (WhatsAppSessionController),
// the only thing in this whole setup that actually survives a Heroku
// dyno restart or redeploy.

import { createServer } from 'node:http';
import { create, ev } from '@open-wa/wa-automate';
import { createLaravelClient } from './lib/laravelClient.mjs';
import { isAuthorized } from './lib/auth.mjs';
import { renderQrPage } from './lib/qrPage.mjs';

const PORT = Number(process.env.PORT ?? 8080);
const API_KEY = process.env.WA_API_KEY;
const SESSION_ID = process.env.WA_SESSION_ID || 'default';

if (!API_KEY) {
  console.error('[whatsapp-service] WA_API_KEY is required.');
  process.exit(1);
}

function log(...args) {
  console.log('[whatsapp-service]', ...args);
}

async function readJsonBody(req) {
  const chunks = [];
  for await (const chunk of req) {
    chunks.push(chunk);
  }
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

function sendJson(res, status, body) {
  res.writeHead(status, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(body));
}

async function main() {
  const laravel = createLaravelClient({ sessionId: SESSION_ID });

  let savedSessionData;
  try {
    savedSessionData = await laravel.fetchSessionArchive();
  } catch (error) {
    // Never fatal: worst case is an unnecessary QR re-scan, not a
    // refusal to start.
    log('Could not fetch a saved session, continuing without it:', error.message);
    savedSessionData = null;
  }
  log(savedSessionData ? 'Restoring saved WhatsApp session.' : 'No saved session -- this run needs a QR scan.');

  let client = null;
  let latestQr = null;

  // Fires every time open-wa rotates/updates the session, so this stays
  // current without polling; the plain (non-namespaced) event carries
  // the base64 string this service passes back into `sessionData` next
  // time. See node_modules/@open-wa/wa-automate/bin/config-schema.json's
  // own documented usage of this exact event for how this is intended
  // to be captured.
  ev.on('sessionDataBase64.**', async (sessionDataBase64) => {
    try {
      await laravel.saveSessionArchive(sessionDataBase64);
      log('Persisted updated WhatsApp session.');
    } catch (error) {
      log('Could not persist session update:', error.message);
    }
  });

  // The plain `qr` event (not `qr.qrData` / `qr.qrUrl`) carries the
  // actual base64 PNG; renderQrPage() adds the data: URI prefix.
  ev.on('qr.**', (data, subEvent) => {
    if (!subEvent && typeof data === 'string') {
      latestQr = data;
    }
  });

  create({
    sessionId: SESSION_ID,
    sessionData: savedSessionData || undefined,
    multiDevice: true,
    headless: true,
    useChrome: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
    authTimeout: 0,
    qrTimeout: 0,
    ezqr: false,
    disableSpins: true,
    logConsole: false,
    popup: false,
  })
    .then((readyClient) => {
      client = readyClient;
      latestQr = null;
      log('WhatsApp client ready.');
    })
    .catch((error) => {
      log('Fatal error launching the WhatsApp client:', error);
      process.exit(1);
    });

  const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);

    if (req.method === 'GET' && url.pathname === '/health') {
      // No auth: a plain liveness/readiness probe.
      return sendJson(res, 200, { ok: true, ready: client !== null });
    }

    if (!isAuthorized(req, url, API_KEY)) {
      return sendJson(res, 401, { error: 'Unauthorized' });
    }

    if (req.method === 'GET' && url.pathname === '/qr') {
      res.writeHead(200, { 'Content-Type': 'text/html' });
      return res.end(renderQrPage(latestQr));
    }

    if (req.method === 'POST' && url.pathname === '/api/sendText') {
      if (!client) {
        return sendJson(res, 503, { error: 'API not available until the session is truly ready' });
      }
      try {
        const { to, content } = await readJsonBody(req);
        if (!to || !content) {
          return sendJson(res, 422, { error: '"to" and "content" are required' });
        }
        const id = await client.sendText(to, content);
        return sendJson(res, 200, { id });
      } catch (error) {
        log('sendText failed:', error.message);
        return sendJson(res, 500, { error: 'Failed to send message' });
      }
    }

    return sendJson(res, 404, { error: 'Not found' });
  });

  server.listen(PORT, '0.0.0.0', () => {
    log(`Listening on port ${PORT}. Scan the QR at /qr?key=<WA_API_KEY> once the client starts.`);
  });

  const shutdown = (signal) => {
    log(`Received ${signal}, shutting down.`);
    server.close(() => process.exit(0));
    // Don't hang forever waiting for in-flight requests.
    setTimeout(() => process.exit(0), 5000).unref();
  };
  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));
}

main().catch((error) => {
  log('Fatal error during startup:', error);
  process.exit(1);
});
