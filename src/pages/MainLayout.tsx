/**
 * @file        主佈局元件
 * @description 應用主佈局，包含側邊欄導航、Header、使用者資訊下拉選單
 * @lastUpdate  2026-03-19 21:10:20
 * @author      Daniel Chung
 * @version     1.0.0
 */

import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  SettingOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
  LoadingOutlined,
} from '@ant-design/icons';
import { authStore } from '../stores/auth';
import { authApi, functionApi, paramsApi, Function } from '../services/api';
import { iconMap } from '../utils/icons';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function MainLayout({ theme: themeMode, setTheme }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  const [user, setUser] = useState(authStore.getState().user);
  const [functions, setFunctions] = useState<Function[]>([]);
  const [appLogo, setAppLogo] = useState('');

  const isDark = themeMode === 'dark';
  const siderBg = '#1e293b';
  const headerBg = '#1e293b';
  const textColor = '#f1f5f9';
  const primaryColor = '#3b82f6';
  const contentBg = isDark ? '#1e293b' : '#ffffff';

  useEffect(() => {
    const unsubscribe = authStore.subscribe(() => {
      setUser(authStore.getState().user);
    });
    if (!authStore.getState().user && authStore.getState().token) {
      authApi.me().then((res: any) => {
        if (res.data.code === 200) {
          setUser(res.data.data);
        }
      }).catch(() => {});
    }
    return unsubscribe;
  }, []);

  useEffect(() => {
    functionApi.getAuthorized()
      .then(res => setFunctions(res.data.data || []))
      .catch(() => setFunctions([]));
  }, []);

  useEffect(() => {
    paramsApi.list().then((res: any) => {
      const params = res.data.data || [];
      const logo = params.find((p: any) => p.param_key === 'app.logo');
      if (logo?.param_value) setAppLogo(logo.param_value);
    }).catch(() => {});
  }, []);

  const buildIcon = (iconName: string | null) => {
    if (!iconName || !iconMap[iconName]) return <SettingOutlined />;
    return React.createElement(iconMap[iconName]);
  };

  const menuItems = (() => {
    if (functions.length === 0) {
      return [{
        key: 'loading',
        icon: <LoadingOutlined />,
        label: '載入中...',
        disabled: true,
      }];
    }

    const topGroups = functions
      .filter(f => f.function_type === 'group' && f.status === 'enabled')
      .sort((a, b) => a.sort_order - b.sort_order);

    return topGroups.map(group => {
      const subs = functions
        .filter(f => f.function_type === 'sub_function' && f.parent_key === group.code && f.status === 'enabled')
        .sort((a, b) => a.sort_order - b.sort_order);

      const item: any = {
        key: group.path || group.code,
        icon: buildIcon(group.icon),
        label: group.name,
      };

      if (subs.length > 0) {
        item.children = subs.map(sub => ({
          key: sub.path || sub.code,
          label: sub.name,
        }));
      } else if (group.path) {
        item.onClick = () => navigate(group.path!);
      }

      return item;
    });
  })();

  const handleMenuClick = ({ key }: { key: string }) => {
    const item = functions.find(f => (f.path || f.code) === key);
    if (item?.path) navigate(item.path);
  };

  const handleLogout = () => {
    authStore.logout();
    navigate('/login');
  };

  const toggleTheme = () => {
    setTheme(isDark ? 'light' : 'dark');
  };

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ];

  const getPageTitle = () => {
    const path = location.pathname;
    const func = functions.find(f => f.path === path);
    if (func) return func.name;
    if (path.includes('users')) return '账户管理';
    if (path.includes('roles')) return '角色管理';
    if (path.includes('params')) return '系统参数';
    return '首页';
  };

  return (
    <Layout style={{ minHeight: '100vh', background: '#0f172a' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={200}
        style={{ background: siderBg }}
      >
        <div style={{
          height: 65,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: '1px solid #334155',
          color: textColor,
        }}>
          {appLogo && appLogo.length > 0 ? (
            <div
              style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
              onClick={() => navigate('/app/home')}
            >
              <img
                src={appLogo}
                alt="logo"
                style={{ height: 50, width: 'auto', objectFit: 'contain' }}
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              {!collapsed && <strong>AI- BOX</strong>}
            </div>
          ) : !collapsed ? (
            <div
              style={{ cursor: 'pointer' }}
              onClick={() => navigate('/app/home')}
            >
              <strong>AI-BOX</strong>
            </div>
          ) : null}
        </div>
        
        <Menu
          mode="inline"
          theme="dark"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick({ key })}
          style={{
            borderRight: 0,
            background: 'transparent',
          }}
        />
        
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: isDark ? '#64748b' : '#999',
          fontSize: '12px',
        }}>
          v1.0.0
        </div>
      </Sider>
      
      <Layout>
        <Header style={{
          padding: '0 16px',
          background: headerBg,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid #334155',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Button
              type="text"
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed(!collapsed)}
              style={{ fontSize: '16px', color: textColor }}
            />
            <span style={{ color: textColor, fontSize: 16, fontWeight: 500 }}>
              {getPageTitle()}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button
              type="text"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              style={{ color: textColor }}
            />
            <span style={{ color: textColor }}>{user?.name || user?.username}</span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar
                style={{ cursor: 'pointer', background: primaryColor }}
                icon={<UserOutlined />}
              />
            </Dropdown>
          </div>
        </Header>
        
        <Content style={{
          margin: '16px',
          padding: '24px',
          background: contentBg,
          borderRadius: '10px',
          minHeight: 280,
        }}>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
