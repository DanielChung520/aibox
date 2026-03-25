/**
 * @file        Header 右側控制區元件
 * @description Header 右側的控制項：服務狀態列、主題切換、使用者頭像下拉
 * @lastUpdate  2026-03-25 17:30:00
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Button, Avatar, Dropdown } from 'antd';
import type { MenuProps } from 'antd';
import { UserOutlined, LogoutOutlined, SunOutlined, MoonOutlined } from '@ant-design/icons';
import ServiceStatusBar from './ServiceStatusBar';
import JobMonitor from './JobMonitor';
import type { LoginResponse } from '../services/api';

interface HeaderControlsProps {
  user: LoginResponse['user'] | null;
  isDark: boolean;
  primaryColor: string;
  textColor: string;
  onLogout: () => void;
  onToggleTheme: () => void;
}

export default function HeaderControls({
  user,
  isDark,
  primaryColor,
  textColor,
  onLogout,
  onToggleTheme,
}: HeaderControlsProps) {
  const menuItems: MenuProps['items'] = [
    { key: 'logout', icon: <LogoutOutlined />, label: '退出登录', onClick: onLogout },
  ];

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
      <ServiceStatusBar />
      <JobMonitor isDark={isDark} primaryColor={primaryColor} textColor={textColor} />
      <Button
        type="text"
        icon={isDark ? <SunOutlined /> : <MoonOutlined />}
        onClick={onToggleTheme}
        style={{ color: textColor }}
      />
      <span style={{ color: textColor }}>{user?.name || user?.username}</span>
      <Dropdown menu={{ items: menuItems }} placement="bottomRight">
        <Avatar style={{ cursor: 'pointer', background: primaryColor }} icon={<UserOutlined />} />
      </Dropdown>
    </div>
  );
}
