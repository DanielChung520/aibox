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
} from '@ant-design/icons';
import { authStore } from '../stores/auth';

const { Header, Sider, Content } = Layout;

interface MainLayoutProps {
  theme: 'light' | 'dark';
  setTheme: (theme: 'light' | 'dark') => void;
}

export default function MainLayout({ }: MainLayoutProps) {
  const [collapsed, setCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = theme.useToken();
  
  const [user, setUser] = useState(authStore.getState().user);

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
    <Layout style={{ minHeight: '100vh' }}>
      <Sider 
        trigger={null} 
        collapsible 
        collapsed={collapsed}
        width={200}
        style={{ background: token.colorBgContainer }}
      >
        <div style={{
          height: 60,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          borderBottom: `1px solid ${token.colorBorder}`,
        }}>
          {!collapsed && <strong>ABC 管理系统</strong>}
          {collapsed && <strong>ABC</strong>}
        </div>
        
        <Menu
          mode="inline"
          selectedKeys={[location.pathname]}
          items={menuItems}
          onClick={({ key }) => handleMenuClick(key)}
          style={{ borderRight: 0 }}
        />
        
        <div style={{
          position: 'absolute',
          bottom: 16,
          left: 0,
          right: 0,
          textAlign: 'center',
          color: token.colorTextSecondary,
          fontSize: '12px',
        }}>
          v1.0.0
        </div>
      </Sider>
      
      <Layout>
        <Header style={{ 
          padding: '0 16px', 
          background: token.colorBgContainer,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: `1px solid ${token.colorBorder}`,
        }}>
          <Button
            type="text"
            icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
            onClick={() => setCollapsed(!collapsed)}
            style={{ fontSize: '16px' }}
          />
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{user?.name || user?.username}</span>
            <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
              <Avatar 
                style={{ cursor: 'pointer', background: token.colorPrimary }} 
                icon={<UserOutlined />}
              />
            </Dropdown>
          </div>
        </Header>
        
        <Content style={{ 
          margin: '16px', 
          padding: '24px', 
          background: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          minHeight: 280,
        }}>
          <div style={{ marginBottom: '16px' }}>
            <h2 style={{ margin: 0 }}>{getPageTitle()}</h2>
          </div>
          <Outlet />
        </Content>
      </Layout>
    </Layout>
  );
}
