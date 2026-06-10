/**
 * API Utility
 * Centralises all backend calls so the rest of the app
 * doesn't need to know the base URL or handle raw fetch logic.
 */

import { FELog } from './logger.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

/**
 * Fetches all notifications with optional filters.
 *
 * @param {{ page?: number, limit?: number, notification_type?: string }} params
 */
export const fetchAllNotifications = async ({ page, limit, notification_type } = {}) => {
  const params = new URLSearchParams();
  if (page) params.append('page', page);
  if (limit) params.append('limit', limit);
  if (notification_type && notification_type !== 'all') {
    params.append('notification_type', notification_type);
  }

  const url = `${API_BASE}/notifications${params.toString() ? `?${params}` : ''}`;

  await FELog('info', 'api', `Fetching all notifications — ${url}`);

  const res = await fetch(url);

  if (!res.ok) {
    await FELog('error', 'api', `fetchAllNotifications failed — status ${res.status}`);
    throw new Error(`Failed to fetch notifications (${res.status})`);
  }

  const json = await res.json();
  await FELog('debug', 'api', `fetchAllNotifications received ${json.data?.length ?? 0} items`);
  return json;
};

/**
 * Fetches top-N priority notifications.
 *
 * @param {number} n - how many top notifications to return
 */
export const fetchPriorityNotifications = async (n = 10) => {
  const url = `${API_BASE}/priority-notifications?n=${n}`;

  await FELog('info', 'api', `Fetching priority notifications — n=${n}`);

  const res = await fetch(url);

  if (!res.ok) {
    await FELog('error', 'api', `fetchPriorityNotifications failed — status ${res.status}`);
    throw new Error(`Failed to fetch priority notifications (${res.status})`);
  }

  const json = await res.json();
  await FELog('debug', 'api', `fetchPriorityNotifications received ${json.data?.length ?? 0} items`);
  return json;
};
