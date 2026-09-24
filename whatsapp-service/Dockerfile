# =====================================================================
#  whatsapp-service — Heroku Container Registry deploy
#
#  Docker (not the standard Node buildpack) because this needs a real
#  Chromium browser installed alongside Node -- open-wa drives an
#  actual WhatsApp Web session in it. The buildpack has no route to
#  install system packages like `chromium`; a Dockerfile does.
#
#  PUPPETEER_SKIP_DOWNLOAD=true stops `npm install` from also
#  downloading Puppeteer's own bundled Chromium build (a second, ~200MB
#  copy) -- wa.config in index.mjs points useChrome/executablePath at
#  the apt-installed one below instead, so only one Chromium ships in
#  the image.
# =====================================================================

FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    # Chromium's own runtime dependencies on a "slim" base image --
    # without these it fails to launch with missing .so errors, not a
    # clear "chromium not found".
    fonts-liberation \
    libasound2 \
    libatk-bridge2.0-0 \
    libatk1.0-0 \
    libcups2 \
    libdrm2 \
    libgbm1 \
    libnspr4 \
    libnss3 \
    libxcomposite1 \
    libxdamage1 \
    libxfixes3 \
    libxkbcommon0 \
    libxrandr2 \
    xdg-utils \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true
ENV PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium
ENV WA_USER_DATA_DIR=/app/.wa-session
ENV NODE_ENV=production

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --omit=dev

COPY . .

# open-wa's own default Chrome launch args already include --no-sandbox
# and --disable-setuid-sandbox (see node_modules/@open-wa/wa-automate/
# dist/config/puppeteer.config.js) -- Heroku's containers don't grant
# the privileges Chrome's setuid sandbox needs, and without those flags
# Chromium fails to launch at all under Docker-on-Heroku. Nothing to
# configure here; this comment exists so the next person doesn't have
# to go find that out again if Chrome ever refuses to launch.

# Heroku injects $PORT at runtime; index.mjs reads it directly, so no
# EXPOSE/CMD port juggling is needed here.
CMD ["node", "index.mjs"]
