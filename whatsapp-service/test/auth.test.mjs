import test from 'node:test';
import assert from 'node:assert/strict';
import { isAuthorized, extractProvidedKey } from '../lib/auth.mjs';

function req(headers = {}) {
  return { headers };
}

test('accepts the key via the X-Api-Key header', () => {
  assert.equal(isAuthorized(req({ 'x-api-key': 'secret' }), new URL('http://x/api/sendText'), 'secret'), true);
});

test('accepts the key via a ?key= query param, for a plain browser GET', () => {
  assert.equal(isAuthorized(req(), new URL('http://x/qr?key=secret'), 'secret'), true);
});

test('rejects a wrong key from either source', () => {
  assert.equal(isAuthorized(req({ 'x-api-key': 'wrong' }), new URL('http://x/'), 'secret'), false);
  assert.equal(isAuthorized(req(), new URL('http://x/?key=wrong'), 'secret'), false);
});

test('rejects a missing key', () => {
  assert.equal(isAuthorized(req(), new URL('http://x/'), 'secret'), false);
});

test('rejects everything when no server key is configured, even an empty-string guess', () => {
  assert.equal(isAuthorized(req({ 'x-api-key': '' }), new URL('http://x/'), ''), false);
  assert.equal(isAuthorized(req({ 'x-api-key': 'anything' }), new URL('http://x/'), ''), false);
});

test('a key of the wrong length is rejected, not thrown on', () => {
  assert.equal(isAuthorized(req({ 'x-api-key': 'short' }), new URL('http://x/'), 'a-much-longer-secret-key'), false);
});

test('the header takes priority over the query param when both are present', () => {
  const url = new URL('http://x/?key=from-query');
  assert.equal(extractProvidedKey(req({ 'x-api-key': 'from-header' }), url), 'from-header');
});
