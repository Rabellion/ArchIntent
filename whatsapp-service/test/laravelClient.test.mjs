import test from 'node:test';
import assert from 'node:assert/strict';
import { createLaravelClient } from '../lib/laravelClient.mjs';

function fakeFetch(responses) {
  const calls = [];
  const fetchImpl = async (url, options) => {
    calls.push({ url, options });
    const response = responses.shift();
    if (!response) throw new Error('fakeFetch called more times than expected');
    return response;
  };
  fetchImpl.calls = calls;
  return fetchImpl;
}

function jsonResponse(status, body) {
  return { status, ok: status >= 200 && status < 300, json: async () => body };
}

const opts = { baseUrl: 'https://api.example.com', internalKey: 'secret-key', sessionId: 'default' };

test('fetchSessionArchive requests the right URL with the internal key header', async () => {
  const fetchImpl = fakeFetch([jsonResponse(200, { data: { archive: 'YWJj' } })]);
  const client = createLaravelClient({ ...opts, fetchImpl });

  const archive = await client.fetchSessionArchive();

  assert.equal(archive, 'YWJj');
  assert.equal(fetchImpl.calls[0].url, 'https://api.example.com/api/internal/whatsapp-session/default');
  assert.equal(fetchImpl.calls[0].options.headers['X-Internal-Key'], 'secret-key');
});

test('fetchSessionArchive returns null (not an error) when nothing was saved yet', async () => {
  const fetchImpl = fakeFetch([jsonResponse(404, { message: 'No saved session' })]);
  const client = createLaravelClient({ ...opts, fetchImpl });

  assert.equal(await client.fetchSessionArchive(), null);
});

test('fetchSessionArchive throws on an unexpected error status', async () => {
  const fetchImpl = fakeFetch([{ status: 500, ok: false }]);
  const client = createLaravelClient({ ...opts, fetchImpl });

  await assert.rejects(() => client.fetchSessionArchive(), /HTTP 500/);
});

test('saveSessionArchive PUTs the archive as JSON with the internal key header', async () => {
  const fetchImpl = fakeFetch([jsonResponse(200, { message: 'Saved' })]);
  const client = createLaravelClient({ ...opts, fetchImpl });

  await client.saveSessionArchive('YWJj');

  const { url, options } = fetchImpl.calls[0];
  assert.equal(url, 'https://api.example.com/api/internal/whatsapp-session/default');
  assert.equal(options.method, 'PUT');
  assert.equal(options.headers['X-Internal-Key'], 'secret-key');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.deepEqual(JSON.parse(options.body), { archive: 'YWJj' });
});

test('saveSessionArchive throws on a non-2xx response', async () => {
  const fetchImpl = fakeFetch([{ status: 413, ok: false }]);
  const client = createLaravelClient({ ...opts, fetchImpl });

  await assert.rejects(() => client.saveSessionArchive('x'), /HTTP 413/);
});

test('different sessionIds produce different URLs, safely encoded', async () => {
  const fetchImpl = fakeFetch([jsonResponse(404, {}), jsonResponse(404, {})]);
  await createLaravelClient({ ...opts, sessionId: 'sales', fetchImpl }).fetchSessionArchive();
  await createLaravelClient({ ...opts, sessionId: 'a b', fetchImpl }).fetchSessionArchive();

  assert.equal(fetchImpl.calls[0].url, 'https://api.example.com/api/internal/whatsapp-session/sales');
  assert.equal(fetchImpl.calls[1].url, 'https://api.example.com/api/internal/whatsapp-session/a%20b');
});

test('requires baseUrl and internalKey to be supplied one way or another', () => {
  const originalBase = process.env.LARAVEL_BASE_URL;
  const originalKey = process.env.INTERNAL_API_KEY;
  delete process.env.LARAVEL_BASE_URL;
  delete process.env.INTERNAL_API_KEY;
  try {
    assert.throws(() => createLaravelClient(), /LARAVEL_BASE_URL is required/);
    assert.throws(
      () => createLaravelClient({ baseUrl: 'https://api.example.com' }),
      /INTERNAL_API_KEY is required/,
    );
  } finally {
    if (originalBase !== undefined) process.env.LARAVEL_BASE_URL = originalBase;
    if (originalKey !== undefined) process.env.INTERNAL_API_KEY = originalKey;
  }
});
