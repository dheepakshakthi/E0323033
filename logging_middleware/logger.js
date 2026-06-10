

const LOGGING_SERVICE_URL = 'http://4.224.186.213/evaluation-service/logs';

const VALID_STACKS = ['backend', 'frontend'];
const VALID_LEVELS = ['debug', 'info', 'warn', 'error', 'fatal'];
const VALID_PACKAGES = [
  // backend-only
  'cache', 'controller', 'cron_job', 'db', 'domain', 'handler', 'repository', 'route', 'service',
  // frontend-only
  'api', 'component', 'hook', 'page', 'state', 'style',
  // shared
  'auth', 'config', 'middleware', 'utils',
];



export const Log = async (stack, level, packageName, message, token) => {
  const normalizedStack = stack.toLowerCase();
  const normalizedLevel = level.toLowerCase();
  const normalizedPackage = packageName.toLowerCase();

  if (!VALID_STACKS.includes(normalizedStack)) {
    console.error(`[Logger] Invalid stack "${stack}". Must be one of: ${VALID_STACKS.join(', ')}`);
    return null;
  }
  if (!VALID_LEVELS.includes(normalizedLevel)) {
    console.error(`[Logger] Invalid level "${level}". Must be one of: ${VALID_LEVELS.join(', ')}`);
    return null;
  }
  if (!VALID_PACKAGES.includes(normalizedPackage)) {
    console.error(`[Logger] Invalid package "${packageName}". Must be one of: ${VALID_PACKAGES.join(', ')}`);
    return null;
  }

  try {
    const response = await fetch(LOGGING_SERVICE_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({
        stack: normalizedStack,
        level: normalizedLevel,
        package: normalizedPackage,
        message,
      }),
    });

    if (response.ok) {
      const data = await response.json();
      return data;
    }

    const errorText = await response.text();
    console.error(`[Logger] Failed to send log. Status: ${response.status} — ${errorText}`);

    // Return a typed sentinel on 401 so callers can trigger a token refresh
    if (response.status === 401) return { __authError: true };
    return null;
  } catch (error) {
    console.error('[Logger] Network error while sending log:', error.message);
    return null;
  }
};


export const createLoggingMiddleware = (token) => async (req, res, next) => {
  const message = `${req.method} ${req.originalUrl} — incoming request`;
  await Log('backend', 'info', 'middleware', message, token);
  next();
};
