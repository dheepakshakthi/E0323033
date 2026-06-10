/**
 * Frontend Logger
 * Self-contained — does not import from outside the project root (Vite constraint).
 * Replicates the Log() logic from logging_middleware/logger.js for the browser.
 *
 * Token is fetched from the backend /api/token endpoint so no credentials
 * ever live in the browser bundle.
 */

const LOGGING_SERVICE_URL = 'http://4.224.186.213/evaluation-service/logs';
const TOKEN_ENDPOINT      = 'http://localhost:5000/api/token';

const VALID_LEVELS   = ['debug', 'info', 'warn', 'error', 'fatal'];
const VALID_PACKAGES = [
  'api', 'component', 'hook', 'page', 'state', 'style',   // frontend-only
  'auth', 'config', 'middleware', 'utils',                  // shared
];

// ─── token cache ─────────────────────────────────────────────────────────────

let _cachedToken  = null;
let _fetchPromise = null;

const getToken = async () => {
  if (_cachedToken) return _cachedToken;
  if (!_fetchPromise) {
    _fetchPromise = fetch(TOKEN_ENDPOINT)
      .then((r) => { if (!r.ok) throw new Error(`/api/token ${r.status}`); return r.json(); })
      .then((d) => { _cachedToken = d.token; _fetchPromise = null; return _cachedToken; })
      .catch((e) => { _fetchPromise = null; throw e; });
  }
  return _fetchPromise;
};

const invalidateToken = () => { _cachedToken = null; };

// ─── truncation helper ───────────────────────────────────────────────────────

const truncate = (msg, max = 48) =>
  msg.length > max ? msg.slice(0, max - 1) + '…' : msg;

// ─── core log sender ─────────────────────────────────────────────────────────

const sendLog = async (level, packageName, message, token) => {
  const res = await fetch(LOGGING_SERVICE_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({
      stack:   'frontend',
      level:   level.toLowerCase(),
      package: packageName.toLowerCase(),
      message: truncate(message),
    }),
  });

  if (res.ok) return res.json();
  if (res.status === 401) return { __authError: true };
  return null;
};

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Send a frontend log entry.
 * Validates inputs, fetches token dynamically, retries once on 401.
 *
 * @param {string} level       - "debug" | "info" | "warn" | "error" | "fatal"
 * @param {string} packageName - e.g. "component", "api", "page"
 * @param {string} message
 */
export const FELog = async (level, packageName, message) => {
  const lvl = level.toLowerCase();
  const pkg = packageName.toLowerCase();

  if (!VALID_LEVELS.includes(lvl) || !VALID_PACKAGES.includes(pkg)) {
    console.warn(`[FELog] Invalid level "${level}" or package "${packageName}"`);
    return;
  }

  try {
    const token  = await getToken();
    const result = await sendLog(lvl, pkg, message, token);

    if (result?.__authError) {
      invalidateToken();
      const fresh = await getToken();
      await sendLog(lvl, pkg, message, fresh);
    }
  } catch (err) {
    console.warn('[FELog] Failed to send log:', err.message);
  }
};
