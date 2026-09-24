// Talks to the Laravel backend's /internal/whatsapp-session endpoints
// (WhatsAppSessionController), which is where the logged-in WhatsApp
// session actually persists -- Heroku's own disk does not survive a
// dyno restart or a redeploy, but that database does.

function requireEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }
  return value;
}

export function createLaravelClient({
  baseUrl = requireEnv('LARAVEL_BASE_URL'),
  internalKey = requireEnv('INTERNAL_API_KEY'),
  sessionId = process.env.WA_SESSION_ID || 'default',
  fetchImpl = fetch,
} = {}) {
  const url = `${baseUrl.replace(/\/+$/, '')}/api/internal/whatsapp-session/${encodeURIComponent(sessionId)}`;
  const headers = { 'X-Internal-Key': internalKey };

  return {
    /** @returns {Promise<string|null>} base64 archive, or null if none saved yet. */
    async fetchSessionArchive() {
      const response = await fetchImpl(url, { headers });
      if (response.status === 404) {
        return null;
      }
      if (!response.ok) {
        throw new Error(`Failed to fetch saved session: HTTP ${response.status}`);
      }
      const body = await response.json();
      return body.data.archive;
    },

    /** @param {string} archiveBase64 */
    async saveSessionArchive(archiveBase64) {
      const response = await fetchImpl(url, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ archive: archiveBase64 }),
      });
      if (!response.ok) {
        throw new Error(`Failed to save session: HTTP ${response.status}`);
      }
      return response.json();
    },
  };
}
