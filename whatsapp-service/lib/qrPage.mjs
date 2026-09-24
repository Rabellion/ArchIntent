// A tiny standalone page for scanning the login QR from a browser.
// Deliberately NOT open-wa's own `ezqr` option: that uploads the QR to
// a third-party cloud service (qr.openwa.cloud) to generate a public
// link, which is sensitive auth material this service has no reason to
// hand to anyone else. This renders the QR this service already
// captured itself, served only to whoever has the API key.

export function renderQrPage(qr) {
  const qrDataUri = qr && (qr.startsWith('data:') ? qr : `data:image/png;base64,${qr}`);

  if (!qrDataUri) {
    return `<!doctype html><html><head><meta http-equiv="refresh" content="3"></head>
<body style="font-family: sans-serif; text-align: center; padding-top: 4rem;">
  <p>No QR code available right now -- either already logged in, or still starting up.</p>
  <p>This page refreshes automatically every few seconds.</p>
</body></html>`;
  }

  return `<!doctype html><html><head><meta http-equiv="refresh" content="5">
<title>Scan to link WhatsApp</title></head>
<body style="font-family: sans-serif; text-align: center; padding-top: 2rem;">
  <h1>Scan with WhatsApp &rarr; Linked devices &rarr; Link a device</h1>
  <img src="${qrDataUri}" alt="WhatsApp login QR code" style="width: 320px; height: 320px;" />
  <p>This page refreshes every 5 seconds until it's scanned.</p>
</body></html>`;
}
