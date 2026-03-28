/**
 * @file        應用 Logo 元件
 * @description Sider 頂部的 Logo 區域，支持文字和圖片兩種模式
 * @lastUpdate  2026-03-29 01:11:04
 * @author      Daniel Chung
 * @version     1.1.0
 */

import { useNavigate } from 'react-router-dom';
import defaultLogo from '../assets/logo.png';

interface AppLogoProps {
  logo: string;
  collapsed: boolean;
  textColor: string;
  borderColor: string;
}

export default function AppLogo({ logo, collapsed, textColor }: AppLogoProps) {
  const navigate = useNavigate();
  const src = (logo && logo.length > 0) ? logo : defaultLogo;

  return (
    <div
      style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer' }}
      onClick={() => navigate('/app/home')}
    >
      <img
        src={src}
        alt="logo"
        style={{ height: 50, width: 'auto', objectFit: 'contain' }}
      />
      {!collapsed && <strong style={{ color: textColor }}>AI-BOX</strong>}
    </div>
  );
}
