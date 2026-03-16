import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

interface WelcomeProps {
  theme: 'light' | 'dark';
}

export default function Welcome({ theme }: WelcomeProps) {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [appName] = useState('管理系统');

  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0f172a' : '#f5f5f5';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#030213';
  const secondaryColor = isDark ? '#94a3b8' : '#717182';

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          navigate('/login');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [navigate]);

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      background: bgColor,
      transition: 'background 0.3s',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: cardBg,
        borderRadius: '10px',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '300px',
        transition: 'all 0.3s',
      }}>
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
        }}>
          ABC
        </div>
        
        <Title level={2} style={{ margin: 0, color: textColor }}>
          {appName}
        </Title>
        
        <Text type="secondary" style={{ color: secondaryColor }}>版本 1.0.0</Text>
        
        <div style={{ marginTop: '32px' }}>
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate('/login')}
            style={{ 
              background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
              border: 'none',
            }}
          >
            进入登录
          </Button>
        </div>
        
        <div style={{ marginTop: '24px', color: secondaryColor, fontSize: '12px' }}>
          <Text type="secondary" style={{ color: secondaryColor }}>
            {countdown} 秒后自动跳转...
          </Text>
        </div>
        
        <div style={{ marginTop: '48px', color: secondaryColor, fontSize: '12px' }}>
          © 2026 版权所有
        </div>
      </div>
    </div>
  );
}
