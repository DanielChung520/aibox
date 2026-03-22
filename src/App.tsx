/**
 * @file        應用入口
 * @description 路由配置、ConfigProvider、主題供應
 * @lastUpdate  2026-03-22 19:23:12
 * @author      Daniel Chung
 * @version     2.0.0
 */

import { useState, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider, App as AntApp, theme } from 'antd';
import { AppThemeProvider, useEffectiveTheme, useContentTokens } from './contexts/AppThemeProvider';
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
import SchemaPage from './pages/data-agent/SchemaPage';
import IntentsPage from './pages/data-agent/IntentsPage';
import QueryPlayground from './pages/data-agent/QueryPlayground';
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

function AppContent() {
  const effectiveTheme = useEffectiveTheme();
  const contentTokens = useContentTokens();

  const algorithm = effectiveTheme === 'dark' ? theme.darkAlgorithm : theme.defaultAlgorithm;

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: contentTokens.colorPrimary,
          colorSuccess: contentTokens.colorSuccess,
          colorWarning: contentTokens.colorWarning,
          colorError: contentTokens.colorError,
          colorInfo: contentTokens.colorInfo,
          colorBgBase: contentTokens.colorBgBase,
          colorTextBase: contentTokens.colorTextBase,
          borderRadius: contentTokens.borderRadius,
          fontFamily: contentTokens.fontFamily,
          boxShadow: contentTokens.boxShadow,
          boxShadowSecondary: contentTokens.boxShadowSecondary,
        },
        algorithm,
        components: {
          Layout: {
            bodyBg: contentTokens.colorBgBase,
          },
          Card: {
            boxShadow: contentTokens.cardShadow,
          },
          Table: {
            rowExpandedBg: contentTokens.tableExpandedRowBg,
            headerBg: contentTokens.tableHeaderBg,
          },
        },
      }}
    >
      <BrowserRouter>
        <AntApp>
          <Routes>
            <Route path="/" element={<Welcome />} />
            <Route path="/login" element={<Login />} />
            <Route
              path="/app"
              element={
                <ProtectedRoute>
                  <MainLayout />
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
              <Route path="data-agent/schema" element={<SchemaPage />} />
              <Route path="data-agent/intents" element={<IntentsPage />} />
              <Route path="data-agent/playground" element={<QueryPlayground />} />
            </Route>
          </Routes>
        </AntApp>
      </BrowserRouter>
    </ConfigProvider>
  );
}

function App() {
  return (
    <AppThemeProvider>
      <AppContent />
    </AppThemeProvider>
  );
}

export default App;
