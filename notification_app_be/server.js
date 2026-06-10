/**
 * Express Server — Campus Notification Platform Backend
 */

import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { Log } from '../logging_middleware/logger.js';
import { initTokenManager, getToken, backendLog } from './auth/tokenManager.js';
import notificationRoutes from './routes/routes.js';

dotenv.config();

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(express.json());

// Per-request logging — reads token lazily so it is always the live token
app.use(async (req, _res, next) => {
  const msg = `${req.method} ${req.originalUrl}`.slice(0, 48);
  await Log('backend', 'info', 'middleware', msg, getToken());
  next();
});

app.use('/api', notificationRoutes);

// 404
app.use((req, res) => {
  backendLog('warn', 'route', `404 ${req.method} ${req.path}`);
  res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Route not found' } });
});

// Global error handler
// eslint-disable-next-line no-unused-vars
app.use((err, _req, res, _next) => {
  backendLog('fatal', 'handler', `Error: ${err.message}`);
  res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'An unexpected error occurred' } });
});

// Fetch a valid token first, then start listening
initTokenManager()
  .then(async () => {
    await backendLog('info', 'config', `Server started on port ${PORT}`);
    app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('[Startup] Failed to obtain auth token:', err.message);
    process.exit(1);
  });
