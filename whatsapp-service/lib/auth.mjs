// Shared auth check for this service's own HTTP endpoints (not
// open-wa's built-in Easy API, which this service does not expose --
// see index.mjs for why). Accepts the key via header (preferred) or a
// `key` query param, so GET /qr can still be opened directly in a
// browser, which can't set custom headers.

import { timingSafeEqual } from 'node:crypto';

export function extractProvidedKey(req, url) {
  return req.headers['x-api-key'] || url.searchParams.get('key') || null;
}

function timingSafeStringEqual(a, b) {
  const bufA = Buffer.from(a);
  const bufB = Buffer.from(b);
  // timingSafeEqual throws on a length mismatch rather than returning
  // false, and comparing against a same-length buffer of the expected
  // key first keeps a wrong-length guess from being timed against it.
  return bufA.length === bufB.length && timingSafeEqual(bufA, bufB);
}

export function isAuthorized(req, url, expectedKey) {
  if (!expectedKey) {
    return false;
  }
  const provided = extractProvidedKey(req, url);
  return provided !== null && timingSafeStringEqual(provided, expectedKey);
}
