/**
 * @file        應用 Logo 元件
 * @description Sider 頂部的 Logo 區域，支持文字和圖片兩種模式
 * @lastUpdate  2026-03-25 17:30:00
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useNavigate } from 'react-router-dom';

interface AppLogoProps {
  logo: string;
  collapsed: boolean;
  textColor: string;
  borderColor: string;
}

export default function AppLogo({ logo, collapsed, textColor }: AppLogoProps) {
  const navigate = useNavigate();

  if (logo && logo.length > 0) {
    return (
      <div
        style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
        onClick={() => navigate('/app/home')}
      >
        <img
          src={logo}
          alt="logo"
          style={{ height: 50, width: 'auto', objectFit: 'contain' }}
          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
        />
        {!collapsed && <strong style={{ color: textColor }}>AI-BOX</strong>}
      </div>
    );
  }

  if (collapsed) return null;

  return (
    <div style={{ cursor: 'pointer' }} onClick={() => navigate('/app/home')}>
      <strong style={{ color: textColor }}>AI-BOX</strong>
    </div>
  );
}
