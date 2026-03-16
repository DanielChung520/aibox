import { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { Layout, Menu, Button, Avatar, Dropdown, theme } from 'antd';
import {
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  UserOutlined,
  TeamOutlined,
  SettingOutlined,
  LogoutOutlined,
  SunOutlined,
  MoonOutlined,
} from '@ant-design/icons';
import { authStore } from '../stores/auth';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function MainLayout({ theme: themeMode, setTheme }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  
  const [user, setUser] = useState(authStore.getState().user);

  const isDark = themeMode === 'dark';
  const bgColor = isDark ? '#0f172a' : '#f5f5f5';
  const siderBg = isDark ? '#1e293b' : token.colorBgContainer;
  const headerBg = isDark ? '#1e293b' : token.colorBgContainer;
  const textColor = isDark ? '#f1f5f9' : token.colorText;
  const primaryColor = isDark ? '#3b82f6' : '#1e40af';

  useEffect(() => {
    const unsubscribe = authStore.subscribe(() => {
      setUser(authStore.getState().user);
    });
    return unsubscribe;
  }, []);

  const menuItems = [
    {
      key: '/app/users',
      icon: <UserOutlined />,
      label: '账户管理',
    },
    {
      key: '/app/roles',
      icon: <TeamOutlined />,
      label: '角色管理',
    },
    {
      key: '/app/params',
      icon: <SettingOutlined />,
      label: '系统参数',
    },
  ];

  const handleMenuClick = (key: string) => {
    navigate(key);
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
    if (path.includes('users')) return '账户管理';
    if (path.includes('roles')) return '角色管理';
    if (path.includes('params')) return '系统参数';
    return '首页';
  };

  return (
    <Layout style={{ minHeight: '100vh', background: bgColor }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={200}
        style={{ background: siderBg }}
      >
        <div style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${isDark ? '#334155' : token.colorBorder}`,
          color: textColor,
        }}>
          {!collapsed && <strong>ABC 管理系统</strong>}
          {collapsed && <strong>ABC</strong>}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
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
          borderBottom: `1px solid ${isDark ? '#334155' : token.colorBorder}`,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px', color: textColor }}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <Button
              type="text"
              icon={isDark ? <SunOutlined /> : <MoonOutlined />}
              onClick={toggleTheme}
              style={{ color: primaryColor }}
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
          background: isDark ? '#1e293b' : token.colorBgContainer,
          borderRadius: '10px',
          minHeight: 280,
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ margin: 0, color: textColor }}>{getPageTitle()}</h2>
          </div>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
