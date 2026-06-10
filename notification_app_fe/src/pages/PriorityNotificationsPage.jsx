

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  TextField,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  CircularProgress,
  Alert,
  Stack,
  Tooltip,
  IconButton,
  Divider,
  Badge,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import { fetchPriorityNotifications } from '../utils/api.js';
import { FELog } from '../utils/logger.js';
import { TYPE_COLORS } from './NotificationsPage.jsx';

const NOTIFICATION_TYPES = ['all', 'Placement', 'Result', 'Event'];

const PRIORITY_META = {
  Placement: { label: 'High Priority', stars: '★★★' },
  Result:    { label: 'Medium Priority', stars: '★★☆' },
  Event:     { label: 'Low Priority',  stars: '★☆☆' },
};

const PriorityNotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [n, setN] = useState(10);
  const [pendingN, setPendingN] = useState(10);
  const [selectedType, setSelectedType] = useState('all');
  const [viewedIds, setViewedIds] = useState(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('viewedIds') ?? '[]'));
    } catch {
      return new Set();
    }
  });

  const loadNotifications = useCallback(async (topN) => {
    await FELog('info', 'page', `PriorityNotificationsPage: loading top ${topN} priority notifications`);
    setLoading(true);
    setError(null);
    try {
      const json = await fetchPriorityNotifications(topN);
      setNotifications(json.data ?? []);
    } catch (err) {
      await FELog('error', 'page', `PriorityNotificationsPage: fetch failed — ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications(n);
  }, [n, loadNotifications]);

  // Persist viewed IDs — shared with NotificationsPage via sessionStorage
  useEffect(() => {
    sessionStorage.setItem('viewedIds', JSON.stringify([...viewedIds]));
  }, [viewedIds]);

  const handleMarkViewed = (id) => {
    setViewedIds((prev) => {
      if (prev.has(id)) return prev;
      FELog('debug', 'component', `Priority notification marked as viewed: ${id}`);
      return new Set([...prev, id]);
    });
  };

  const handleApplyN = () => {
    const clamped = Math.max(1, Math.min(100, pendingN));
    setPendingN(clamped);
    setN(clamped);
    FELog('debug', 'component', `Top-N changed to ${clamped}`);
  };

  const filteredNotifications =
    selectedType === 'all'
      ? notifications
      : notifications.filter((n) => n.Type === selectedType);

  const countByType = (type) =>
    type === 'all'
      ? notifications.length
      : notifications.filter((notif) => notif.Type === type).length;

  const unreadCount = filteredNotifications.filter((n) => !viewedIds.has(n.ID)).length;

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box>
      {/* Page header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <WorkspacePremiumIcon color="warning" />
          <Typography variant="h5" fontWeight="bold">
            Priority Inbox
          </Typography>
          {unreadCount > 0 && (
            <Chip
              label={`${unreadCount} new`}
              color="primary"
              size="small"
              icon={<FiberNewIcon />}
            />
          )}
        </Box>
        <Tooltip title="Refresh">
          <IconButton onClick={() => loadNotifications(n)} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Controls */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="flex-end">
          {/* Top-N selector */}
          <Grid item xs={12} sm={6} md={4}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Show top N notifications
            </Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Top N"
                type="number"
                value={pendingN}
                onChange={(e) => setPendingN(parseInt(e.target.value) || 1)}
                inputProps={{ min: 1, max: 100 }}
                sx={{ width: 100 }}
              />
              <Button variant="contained" size="small" onClick={handleApplyN}>
                Apply
              </Button>
            </Stack>
          </Grid>

          {/* Type filter */}
          <Grid item xs={12} sm={6} md={8}>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
              Filter by type
            </Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              {NOTIFICATION_TYPES.map((type) => (
                <Button
                  key={type}
                  size="small"
                  variant={selectedType === type ? 'contained' : 'outlined'}
                  onClick={() => {
                    setSelectedType(type);
                    FELog('debug', 'component', `Priority type filter changed to: ${type}`);
                  }}
                  sx={{ textTransform: 'capitalize' }}
                >
                  {type === 'all' ? 'All' : type} ({countByType(type)})
                </Button>
              ))}
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Priority cards */}
      <Grid container spacing={2}>
        {filteredNotifications.length > 0 ? (
          filteredNotifications.map((notification, index) => {
            const isNew = !viewedIds.has(notification.ID);
            const colors = TYPE_COLORS[notification.Type] ?? { border: '#9e9e9e', chip: 'default', bg: '#fafafa' };
            const meta = PRIORITY_META[notification.Type] ?? { label: 'Normal', stars: '☆☆☆' };

            return (
              <Grid item xs={12} sm={6} md={4} key={notification.ID}>
                <Card
                  onClick={() => handleMarkViewed(notification.ID)}
                  variant="outlined"
                  sx={{
                    cursor: 'pointer',
                    height: '100%',
                    backgroundColor: isNew ? colors.bg : '#fafafa',
                    borderTop: `5px solid ${colors.border}`,
                    opacity: isNew ? 1 : 0.72,
                    transition: 'box-shadow 0.2s, transform 0.15s, opacity 0.2s',
                    '&:hover': {
                      boxShadow: 4,
                      transform: 'translateY(-3px)',
                      opacity: 1,
                    },
                  }}
                >
                  <CardContent>
                    {/* Rank badge + NEW chip */}
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography
                        variant="caption"
                        sx={{
                          fontWeight: 700,
                          color: 'text.secondary',
                          bgcolor: '#e0e0e0',
                          px: 1,
                          py: 0.25,
                          borderRadius: 1,
                        }}
                      >
                        #{index + 1}
                      </Typography>
                      {isNew && <Chip label="NEW" color="primary" size="small" variant="outlined" />}
                    </Box>

                    {/* Type chip + priority stars */}
                    <Stack direction="row" spacing={1} sx={{ mb: 1 }} alignItems="center">
                      <Chip label={notification.Type} color={colors.chip} size="small" />
                      <Typography variant="caption" color="text.secondary">
                        {meta.stars} {meta.label}
                      </Typography>
                    </Stack>

                    {/* Message */}
                    <Typography
                      variant="subtitle1"
                      fontWeight={isNew ? 700 : 400}
                      sx={{
                        mb: 1,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {notification.Message}
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    {/* Timestamp */}
                    <Typography variant="caption" color="text.secondary" display="block">
                      {new Date(notification.Timestamp).toLocaleString()}
                    </Typography>

                    {/* ID */}
                    <Typography
                      variant="caption"
                      color="text.disabled"
                      display="block"
                      sx={{ mt: 0.5, wordBreak: 'break-all' }}
                    >
                      {notification.ID}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            );
          })
        ) : (
          <Grid item xs={12}>
            <Alert severity="info">No priority notifications found for the selected filter.</Alert>
          </Grid>
        )}
      </Grid>

      {/* Legend */}
      <Paper
        variant="outlined"
        sx={{ p: 2, mt: 4, backgroundColor: '#fffde7', borderColor: '#ffd54f' }}
      >
        <Typography variant="subtitle2" fontWeight="bold" sx={{ mb: 0.5 }}>
          Priority System
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Notifications are ranked by <strong>importance</strong> first — Placement (★★★) &gt; Result (★★☆) &gt; Event (★☆☆) — then by <strong>recency</strong> within each tier.
          Clicking a card marks it as read.
        </Typography>
      </Paper>
    </Box>
  );
};

export default PriorityNotificationsPage;
