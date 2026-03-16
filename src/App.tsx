import { useState, useEffect, ReactNode } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { ConfigProvider } from 'antd';
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

function App() {
  const [theme, setTheme] = useState<'light' | 'dark'>('light');

  return (
    <ConfigProvider
      theme={{
        token: {
          colorPrimary: '#1677FF',
        },
      }}
    >
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Welcome />} />
          <Route path="/login" element={<Login />} />
          <Route
            path="/app"
            element={
              <ProtectedRoute>
                <MainLayout theme={theme} setTheme={setTheme} />
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
