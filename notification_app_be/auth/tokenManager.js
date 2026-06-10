/**
 * Token Manager
 * POSTs to the evaluation /auth endpoint on startup to get a Bearer token,
 * then auto-refreshes it 60 s before expiry so the server never has a
 * stale token in memory.
 */

import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';
import { Log } from '../../logging_middleware/logger.js';

// Resolve .env from notification_app_be/.env regardless of cwd
const __dir = dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: resolve(__dir, '../.env') });

const AUTH_URL          = process.env.AUTH_SERVICE_URL;
const REFRESH_BUFFER_MS = 60_000; // refresh 60 s before expiry

let _token        = null;
let _refreshTimer = null;

// ─── internal helpers ────────────────────────────────────────────────────────

const truncate = (msg, max = 48) =>
  msg.length > max ? msg.slice(0, max - 1) + '…' : msg;

/** Fire-and-forget log that never throws. */
const safeLog = (level, pkg, msg) => {
  if (!_token) return;
  Log('backend', level, pkg, truncate(msg), _token).catch(() => {});
};

// ─── public API ──────────────────────────────────────────────────────────────

/**
 * Fetch a fresh token from the auth service and schedule the next refresh.
 * @returns {Promise<string>} the new access token
 */
export const refreshToken = async () => {
  const body = {
    email:        process.env.AUTH_EMAIL,
    name:         process.env.AUTH_NAME,
    rollNo:       process.env.AUTH_ROLL_NO,
    accessCode:   process.env.AUTH_ACCESS_CODE,
    clientID:     process.env.AUTH_CLIENT_ID,
    clientSecret: process.env.AUTH_CLIENT_SECRET,
  };

  const res = await fetch(AUTH_URL, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Auth ${res.status}: ${text}`);
  }

  const data  = await res.json();
  _token = data.access_token;

  // expires_in is a Unix epoch in seconds, not a duration
  const expiresInMs  = data.expires_in * 1000 - Date.now();
  const refreshInMs  = Math.max(expiresInMs - REFRESH_BUFFER_MS, 10_000);

  if (_refreshTimer) clearTimeout(_refreshTimer);
  _refreshTimer = setTimeout(async () => {
    console.log('[TokenManager] Auto-refreshing token...');
    try {
      await refreshToken();
      console.log('[TokenManager] Token refreshed.');
    } catch (err) {
      console.error('[TokenManager] Refresh failed:', err.message);
    }
  }, refreshInMs);

  console.log(`[TokenManager] Token ready. Refresh in ${Math.round(refreshInMs / 1000)}s`);
  return _token;
};

/**
 * Initialise the token manager. Await this before the server starts listening.
 */
export const initTokenManager = () => refreshToken();

/**
 * Return the current token synchronously.
 * Throws if called before initTokenManager resolves.
 */
export const getToken = () => {
  if (!_token) throw new Error('TokenManager: call initTokenManager() first');
  return _token;
};

/**
 * Backend log helper.
 * Wraps Log() with auto token-refresh on 401 and message truncation.
 *
 * @param {string} level
 * @param {string} pkg
 * @param {string} message
 */
export const backendLog = async (level, pkg, message) => {
  const result = await Log('backend', level, pkg, truncate(message), getToken());
  if (result?.__authError) {
    await refreshToken();
    await Log('backend', level, pkg, truncate(message), getToken());
  }
};
