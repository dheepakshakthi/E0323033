

import { useState, useEffect, useCallback } from 'react';
import {
  Box,
  Paper,
  Button,
  Grid,
  Card,
  CardContent,
  Typography,
  Chip,
  Pagination,
  CircularProgress,
  Alert,
  Stack,
  Divider,
  Tooltip,
  IconButton,
} from '@mui/material';
import RefreshIcon from '@mui/icons-material/Refresh';
import FiberNewIcon from '@mui/icons-material/FiberNew';
import { fetchAllNotifications } from '../utils/api.js';
import { FELog } from '../utils/logger.js';

const NOTIFICATIONS_PER_PAGE = 10;
const NOTIFICATION_TYPES = ['all', 'Placement', 'Result', 'Event'];

// Colour palette shared with Navbar / PriorityPage
export const TYPE_COLORS = {
  Placement: { border: '#4caf50', chip: 'success', bg: '#f1f8e9' },
  Result:    { border: '#2196f3', chip: 'info',    bg: '#e3f2fd' },
  Event:     { border: '#ff9800', chip: 'warning', bg: '#fff8e1' },
};

const NotificationsPage = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedType, setSelectedType] = useState('all');
  // Set of IDs the user has clicked on — persisted in sessionStorage
  const [viewedIds, setViewedIds] = useState(() => {
    try {
      return new Set(JSON.parse(sessionStorage.getItem('viewedIds') ?? '[]'));
    } catch {
      return new Set();
    }
  });

  const loadNotifications = useCallback(async () => {
    await FELog('info', 'page', 'NotificationsPage: loading notifications');
    setLoading(true);
    setError(null);
    try {
      const json = await fetchAllNotifications();
      setNotifications(json.data ?? []);
    } catch (err) {
      await FELog('error', 'page', `NotificationsPage: fetch failed — ${err.message}`);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Persist viewed IDs to sessionStorage whenever they change
  useEffect(() => {
    sessionStorage.setItem('viewedIds', JSON.stringify([...viewedIds]));
  }, [viewedIds]);

  const handleMarkViewed = (id) => {
    setViewedIds((prev) => {
      if (prev.has(id)) return prev;
      FELog('debug', 'component', `Notification marked as viewed: ${id}`);
      return new Set([...prev, id]);
    });
  };

  const handlePageChange = (_e, value) => {
    setCurrentPage(value);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const filteredNotifications =
    selectedType === 'all'
      ? notifications
      : notifications.filter((n) => n.Type === selectedType);

  const totalPages = Math.ceil(filteredNotifications.length / NOTIFICATIONS_PER_PAGE);

  const paginatedNotifications = filteredNotifications.slice(
    (currentPage - 1) * NOTIFICATIONS_PER_PAGE,
    currentPage * NOTIFICATIONS_PER_PAGE
  );

  const countByType = (type) =>
    type === 'all'
      ? notifications.length
      : notifications.filter((n) => n.Type === type).length;

  const unreadCount = notifications.filter((n) => !viewedIds.has(n.ID)).length;

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
          <Typography variant="h5" fontWeight="bold">
            All Notifications
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
          <IconButton onClick={loadNotifications} color="primary">
            <RefreshIcon />
          </IconButton>
        </Tooltip>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
          {error}
        </Alert>
      )}

      {/* Filter bar */}
      <Paper variant="outlined" sx={{ p: 2, mb: 3 }}>
        <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1.5 }}>
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
                setCurrentPage(1);
                FELog('debug', 'component', `Type filter changed to: ${type}`);
              }}
              sx={{ textTransform: 'capitalize' }}
            >
              {type === 'all' ? 'All' : type} ({countByType(type)})
            </Button>
          ))}
        </Stack>
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
          Showing {paginatedNotifications.length} of {filteredNotifications.length} notifications
        </Typography>
      </Paper>

      {/* Notifications list */}
      <Stack spacing={1.5} sx={{ mb: 3 }}>
        {paginatedNotifications.length > 0 ? (
          paginatedNotifications.map((notification) => {
            const isNew = !viewedIds.has(notification.ID);
            const colors = TYPE_COLORS[notification.Type] ?? { border: '#9e9e9e', chip: 'default', bg: '#fafafa' };

            return (
              <Card
                key={notification.ID}
                onClick={() => handleMarkViewed(notification.ID)}
                variant="outlined"
                sx={{
                  cursor: 'pointer',
                  backgroundColor: isNew ? colors.bg : '#fafafa',
                  borderLeft: `5px solid ${colors.border}`,
                  opacity: isNew ? 1 : 0.75,
                  transition: 'box-shadow 0.2s, opacity 0.2s',
                  '&:hover': { boxShadow: 3, opacity: 1 },
                }}
              >
                <CardContent sx={{ py: 1.5, '&:last-child': { pb: 1.5 } }}>
                  <Grid container alignItems="center" spacing={1}>
                    <Grid item xs={12} sm>
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5 }}>
                        <Chip
                          label={notification.Type}
                          color={colors.chip}
                          size="small"
                        />
                        {isNew && (
                          <Chip label="NEW" color="primary" size="small" variant="outlined" />
                        )}
                      </Stack>
                      <Typography variant="body1" fontWeight={isNew ? 600 : 400}>
                        {notification.Message}
                      </Typography>
                      <Typography variant="caption" color="text.disabled">
                        ID: {notification.ID}
                      </Typography>
                    </Grid>
                    <Grid item xs={12} sm="auto">
                      <Typography variant="caption" color="text.secondary" noWrap>
                        {new Date(notification.Timestamp).toLocaleString()}
                      </Typography>
                    </Grid>
                  </Grid>
                </CardContent>
              </Card>
            );
          })
        ) : (
          <Alert severity="info">No notifications found for the selected filter.</Alert>
        )}
      </Stack>

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 2 }}>
          <Pagination
            count={totalPages}
            page={currentPage}
            onChange={handlePageChange}
            color="primary"
            showFirstButton
            showLastButton
          />
        </Box>
      )}
    </Box>
  );
};

export default NotificationsPage;
