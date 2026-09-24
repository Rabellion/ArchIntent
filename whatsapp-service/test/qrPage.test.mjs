import test from 'node:test';
import assert from 'node:assert/strict';
import { renderQrPage } from '../lib/qrPage.mjs';

test('shows a waiting message and no image tag when there is no QR yet', () => {
  const html = renderQrPage(null);
  assert.match(html, /No QR code available/);
  assert.doesNotMatch(html, /<img/);
});

test('embeds an already-prefixed data URI as-is', () => {
  const html = renderQrPage('data:image/png;base64,AAAA');
  assert.match(html, /<img src="data:image\/png;base64,AAAA"/);
});

test('adds the data URI prefix to a bare base64 string', () => {
  const html = renderQrPage('AAAA');
  assert.match(html, /<img src="data:image\/png;base64,AAAA"/);
});

test('always auto-refreshes, so a page left open eventually shows the scanned state', () => {
  assert.match(renderQrPage(null), /http-equiv="refresh"/);
  assert.match(renderQrPage('AAAA'), /http-equiv="refresh"/);
});
