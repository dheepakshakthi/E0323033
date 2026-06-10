/**
 * Notification Controller
 * Handles all notification-related request logic.
 */

import { getToken, backendLog } from '../auth/tokenManager.js';

const PRIORITY_WEIGHTS = { Placement: 3, Result: 2, Event: 1 };

/**
 * Score = (weight × 10^13) + timestamp_ms
 * Weight always dominates; recency breaks ties within the same type.
 */
const computePriorityScore = (notification) => {
  const weight = PRIORITY_WEIGHTS[notification.Type] ?? 0;
  const ts = new Date(notification.Timestamp).getTime();
  return weight * 1e13 + ts;
};

/**
 * GET /api/notifications
 * Proxies the upstream notifications service with optional query params.
 */
export const getAllNotifications = async (req, res) => {
  await backendLog('info', 'controller', `getAllNotifications — query: ${JSON.stringify(req.query)}`);

  try {
    const { limit, page, notification_type } = req.query;
    const params = new URLSearchParams();
    if (limit)             params.append('limit', limit);
    if (page)              params.append('page', page);
    if (notification_type) params.append('notification_type', notification_type);

    const url = `${process.env.NOTIFICATIONS_SERVICE_URL}${params.toString() ? `?${params}` : ''}`;
    await backendLog('debug', 'service', `Upstream GET ${url}`);

    const upstreamRes = await fetch(url, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      await backendLog('error', 'service', `Upstream returned ${upstreamRes.status}: ${text}`);
      return res.status(502).json({
        success: false,
        error: { code: 'UPSTREAM_ERROR', message: `Upstream service returned ${upstreamRes.status}` },
      });
    }

    const data = await upstreamRes.json();
    const notifications = data.notifications ?? [];
    await backendLog('info', 'controller', `getAllNotifications returning ${notifications.length} items`);

    return res.status(200).json({
      success: true,
      data: notifications,
      meta: { count: notifications.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    await backendLog('fatal', 'controller', `getAllNotifications error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to fetch notifications' },
    });
  }
};

/**
 * GET /api/priority-notifications?n=10
 * Returns the top-N notifications ranked by type weight then recency.
 */
export const getPriorityNotifications = async (req, res) => {
  const n = Math.max(1, parseInt(req.query.n) || 10);
  await backendLog('info', 'controller', `getPriorityNotifications — n=${n}`);

  try {
    await backendLog('debug', 'service', 'Fetching all notifications from upstream for priority scoring');

    const upstreamRes = await fetch(process.env.NOTIFICATIONS_SERVICE_URL, {
      headers: { Authorization: `Bearer ${getToken()}` },
    });

    if (!upstreamRes.ok) {
      const text = await upstreamRes.text();
      await backendLog('error', 'service', `Upstream returned ${upstreamRes.status}: ${text}`);
      return res.status(502).json({
        success: false,
        error: { code: 'UPSTREAM_ERROR', message: `Upstream service returned ${upstreamRes.status}` },
      });
    }

    const data = await upstreamRes.json();
    const notifications = data.notifications ?? [];
    await backendLog('debug', 'controller', `Scoring ${notifications.length} notifications`);

    const sorted = [...notifications].sort(
      (a, b) => computePriorityScore(b) - computePriorityScore(a)
    );
    const topN = sorted.slice(0, n);

    await backendLog('info', 'controller', `getPriorityNotifications returning top ${topN.length} items`);

    return res.status(200).json({
      success: true,
      count: topN.length,
      data: topN,
      meta: { requestedN: n, totalAvailable: notifications.length, timestamp: new Date().toISOString() },
    });
  } catch (error) {
    await backendLog('fatal', 'controller', `getPriorityNotifications error: ${error.message}`);
    return res.status(500).json({
      success: false,
      error: { code: 'INTERNAL_ERROR', message: 'Failed to process priority notifications' },
    });
  }
};
