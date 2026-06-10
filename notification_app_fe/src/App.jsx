/**
 * App Root
 * Sets up MUI theme and top-level page routing via state.
 * No router library needed — the spec only requires two pages.
 */

import { useState } from 'react';
import { Container, CssBaseline, ThemeProvider, createTheme } from '@mui/material';
import Navbar from './components/Navbar';
import NotificationsPage from './pages/NotificationsPage';
import PriorityNotificationsPage from './pages/PriorityNotificationsPage';
import './App.css';

const theme = createTheme({
  palette: {
    primary:   { main: '#1565c0' },
    secondary: { main: '#f57c00' },
    background: { default: '#f5f7fa' },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica Neue", sans-serif',
  },
  shape: { borderRadius: 10 },
  components: {
    MuiCard: {
      defaultProps: { elevation: 0 },
    },
  },
});

function App() {
  const [currentPage, setCurrentPage] = useState('all');

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar currentPage={currentPage} onPageChange={setCurrentPage} />
      <Container maxWidth="lg" sx={{ py: 3, pb: 6 }}>
        {currentPage === 'all'      && <NotificationsPage />}
        {currentPage === 'priority' && <PriorityNotificationsPage />}
      </Container>
    </ThemeProvider>
  );
}

export default App;
