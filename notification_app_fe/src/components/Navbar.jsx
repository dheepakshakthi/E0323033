

import React from 'react';
import {
  AppBar,
  Toolbar,
  Typography,
  Button,
  Box,
  Container,
} from '@mui/material';
import NotificationsIcon from '@mui/icons-material/Notifications';
import WorkspacePremiumIcon from '@mui/icons-material/WorkspacePremium';

export default function Navbar({ currentPage, onPageChange }) {
  return (
    <AppBar position="sticky" elevation={2} sx={{ backgroundColor: '#1565c0', mb: 4 }}>
      <Container maxWidth="lg">
        <Toolbar disableGutters sx={{ display: 'flex', justifyContent: 'space-between' }}>
          {/* Brand */}
          <Typography
            variant="h6"
            component="div"
            fontWeight="bold"
            letterSpacing={0.5}
            sx={{ cursor: 'pointer', userSelect: 'none' }}
            onClick={() => onPageChange('all')}
          >
            Campus Notifications
          </Typography>

          {/* Nav links */}
          <Box sx={{ display: 'flex', gap: { xs: 0.5, sm: 1 } }}>
            <Button
              color="inherit"
              onClick={() => onPageChange('all')}
              startIcon={<NotificationsIcon />}
              sx={{
                borderBottom: currentPage === 'all' ? '3px solid white' : '3px solid transparent',
                borderRadius: 0,
                px: { xs: 1, sm: 2 },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
              }}
            >
              All
            </Button>

            <Button
              color="inherit"
              onClick={() => onPageChange('priority')}
              startIcon={<WorkspacePremiumIcon />}
              sx={{
                borderBottom: currentPage === 'priority' ? '3px solid white' : '3px solid transparent',
                borderRadius: 0,
                px: { xs: 1, sm: 2 },
                '&:hover': { backgroundColor: 'rgba(255,255,255,0.1)' },
              }}
            >
              Priority Inbox
            </Button>
          </Box>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
