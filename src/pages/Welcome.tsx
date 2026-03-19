/**
 * @file        歡迎頁面
 * @description 應用啟動後的歡迎頁，展示 logo、應用名稱，並自動跳轉至登錄頁
 * @lastUpdate  2026-03-17 23:27:55
 * @author      Daniel Chung
 * @version     1.0.0
 * @history
 * - 2026-03-17 23:27:55 | Daniel Chung | 1.0.0 | 初始版本，新增 logo 動畫效果
 */

import { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from 'antd';
import { paramsApi } from '../services/api';

const { Title, Text } = Typography;

interface WelcomeProps {
  theme: 'light' | 'dark';
}

export default function Welcome({ }: WelcomeProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [appName] = useState('管理系统');
  const [appLogo, setAppLogo] = useState<string>('');
  const navigatedRef = useRef(false);

  useEffect(() => {
    paramsApi.list().then((res: any) => {
      const params = res.data.data || [];
      const logo = params.find((p: any) => p.param_key === 'app.logo');
      if (logo?.param_value) setAppLogo(logo.param_value);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (countdown === 0 && !navigatedRef.current) {
      navigatedRef.current = true;
      navigate('/login');
    }
  }, [countdown, navigate]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%)',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: 'rgba(30, 41, 59, 0.8)',
        backdropFilter: 'blur(10px)',
        WebkitBackdropFilter: 'blur(10px)',
        borderRadius: '16px',
        border: '1px solid rgba(255, 255, 255, 0.1)',
        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4)',
        minWidth: '320px',
      }}>
        {appLogo ? (
          <img 
            src={appLogo} 
            alt="logo" 
            style={{ 
              width: 128, 
              height: 128, 
              objectFit: 'contain',
              margin: '0 auto 24px',
              animation: 'logoScale 1.2s ease-out forwards',
            }} 
          />
        ) : (
          <div style={{
            width: 128,
            height: 128,
            background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
            borderRadius: '16px',
            margin: '0 auto 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '48px',
            color: '#fff',
            fontWeight: 'bold',
            animation: 'logoScale 3.6s ease-out forwards',
          }}>
            ABC
          </div>
        )}
        
        <Title level={2} style={{ margin: 0, color: '#f1f5f9' }}>
          {appName}
        </Title>
        
        <Text type="secondary" style={{ color: '#94a3b8' }}>版本 1.0.0</Text>
        
        <div style={{ marginTop: '32px' }}>
          <Button 
            type="primary" 
            size="large"
            onClick={() => {
              navigatedRef.current = true;
              navigate('/login');
            }}
            style={{ 
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              border: 'none',
            }}
          >
            进入登录
          </Button>
        </div>
        
        <div style={{ marginTop: '24px', color: '#94a3b8', fontSize: '12px' }}>
          <Text type="secondary" style={{ color: '#94a3b8' }}>
            {countdown} 秒后自动跳转...
          </Text>
        </div>
        
        <div style={{ marginTop: '48px', color: '#94a3b8', fontSize: '12px' }}>
          © 2026 版权所有
        </div>
      </div>
      <style>{`
        @keyframes logoScale {
          0% { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(1); opacity: 1; }
        }
      `}</style>
    </div>
  );
}
