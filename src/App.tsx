/**
 * @file        應用入口
 * @description 路由配置、ConfigProvider、主題供應
 * @lastUpdate  2026-03-19 21:10:20
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useState, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, theme } from 'antd';
import Login from './pages/Login';
import Welcome from './pages/Welcome';
import MainLayout from './pages/MainLayout';
import Home from './pages/Home';
import UserManagement from './pages/UserManagement';
import RoleManagement from './pages/RoleManagement';
import SystemParams from './pages/SystemParams';
import FunctionManagement from './pages/FunctionManagement';
import BrowseAgent from './pages/BrowseAgent';
import BrowseTools from './pages/BrowseTools';
import TaskSessionChat from './pages/TaskSessionChat';
import TaskSessionHistory from './pages/TaskSessionHistory';
import TaskSessionScheduled from './pages/TaskSessionScheduled';
import UnderDevelopment from './pages/UnderDevelopment';
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
        components: {
          Table: {
            rowExpandedBg: themeMode === 'dark' ? '#0a1120' : '#f0f4ff',
            headerBg: themeMode === 'dark' ? '#1a2235' : '#f0f4ff',
          },
        },
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
            <Route index element={<Navigate to="/app/home" replace />} />
            <Route path="home" element={<Home />} />
            <Route path="users" element={<UserManagement />} />
            <Route path="roles" element={<RoleManagement />} />
            <Route path="params" element={<SystemParams />} />
            <Route path="functions" element={<FunctionManagement />} />
            <Route path="browse-agent" element={<BrowseAgent />} />
            <Route path="browse-tools" element={<BrowseTools />} />
            <Route path="task-session/chat" element={<TaskSessionChat />} />
            <Route path="task-session/history" element={<TaskSessionHistory />} />
            <Route path="task-session/scheduled" element={<TaskSessionScheduled />} />
            <Route path="under-development" element={<UnderDevelopment />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ConfigProvider>
  );
}

export default App;
