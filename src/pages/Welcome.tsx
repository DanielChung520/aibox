import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Typography } from 'antd';

const { Title, Text } = Typography;

export default function Welcome() {
  const navigate = useNavigate();
  const [countdown, setCountdown] = useState(3);
  const [appName] = useState('管理系统');

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
      background: '#f5f5f5',
    }}>
      <div style={{
        textAlign: 'center',
        padding: '40px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        minWidth: '300px',
      }}>
        <div style={{
          width: 128,
          height: 128,
          background: '#1677FF',
          borderRadius: '16px',
          margin: '0 auto 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '48px',
          color: '#fff',
        }}>
          ABC
        </div>
        
        <Title level={2} style={{ margin: 0 }}>
          {appName}
        </Title>
        
        <Text type="secondary">版本 1.0.0</Text>
        
        <div style={{ marginTop: '32px' }}>
          <Button 
            type="primary" 
            size="large"
            onClick={() => navigate('/login')}
          >
            进入登录
          </Button>
        </div>
        
        <div style={{ marginTop: '24px', color: '#999', fontSize: '12px' }}>
          <Text type="secondary">
            {countdown} 秒后自动跳转...
          </Text>
        </div>
        
        <div style={{ marginTop: '48px', color: '#999', fontSize: '12px' }}>
          © 2026 版权所有
        </div>
      </div>
    </div>
  );
}
