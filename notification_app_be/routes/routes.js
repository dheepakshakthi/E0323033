/**
 * Notification Routes
 */

import express from 'express';
import { getAllNotifications, getPriorityNotifications } from '../controllers/controller.js';
import { getToken } from '../auth/tokenManager.js';

const router = express.Router();

// GET /api/notifications
router.get('/notifications', getAllNotifications);

// GET /api/priority-notifications?n=10
router.get('/priority-notifications', getPriorityNotifications);

/**
 * GET /api/token
 * Returns the current valid Bearer token so the frontend logger can use it.
 * No credentials are exposed — only the short-lived token the frontend
 * already needs to call the same evaluation service directly.
 */
router.get('/token', (_req, res) => {
  res.json({ token: getToken() });
});

export default router;
