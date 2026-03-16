import { useState, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import MainLayout from './pages/MainLayout';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import SystemParams from './pages/SystemParams';
import { authStore } from './stores/auth';

function ProtectedRoute({ children }: { children: ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(authStore.getState().isAuthenticated);

  useEffect(() => {
    const unsubscribe = authStore.subscribe(() => {
      setIsAuthenticated(authStore.getState().isAuthenticated);
    });
    return unsubscribe;
  }, []);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

// AI-Box theme colors
const lightTokens = {
  colorPrimary: '#1e40af', // Deep blue
  colorSuccess: '#22c55e',
  colorWarning: '#f59e0b',
  colorError: '#dc2626',
  colorInfo: '#1e40af',
  colorBgBase: '#ffffff',
  colorTextBase: '#030213',
  borderRadius: 10,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const darkTokens = {
  colorPrimary: '#3b82f6', // Brighter blue for dark mode
  colorSuccess: '#22c55e',
  colorWarning: '#f59e0b',
  colorError: '#ef4444',
  colorInfo: '#3b82f6',
  colorBgBase: '#0f172a', // Dark blue-gray
  colorTextBase: '#f1f5f9',
  borderRadius: 10,
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
};

const lightAlgorithm = theme.defaultAlgorithm;
const darkAlgorithm = theme.darkAlgorithm;

function App() {
  const [themeMode, setThemeMode] = useState<'light' | 'dark'>('light');

  const tokens = themeMode === 'dark' ? darkTokens : lightTokens;
  const algorithm = themeMode === 'dark' ? darkAlgorithm : lightAlgorithm;

  return (
    <ConfigProvider
      theme={{
        token: tokens,
        algorithm,
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome theme={themeMode} />} />
          <Route path="/login" element={<Login theme={themeMode} />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout theme={themeMode} setTheme={setThemeMode} />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/app/users" replace />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="params" element={<SystemParams />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
