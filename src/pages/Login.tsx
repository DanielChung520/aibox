/**
 * @file        登錄頁面
 * @description 用戶登錄頁面
 * @lastUpdate  2026-03-19 21:10:20
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Typography, App } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authApi } from '../services/api';
import { authStore } from '../stores/auth';
import { paramsApi } from '../services/api';

const { Title, Text } = Typography;

interface LoginProps {
  theme: 'light' | 'dark';
}

export default function Login({ theme }: LoginProps) {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [appLogo, setAppLogo] = useState('');
  const { message } = App.useApp();

  useEffect(() => {
    paramsApi.list().then((res: any) => {
      const params = res.data.data || [];
      const logo = params.find((p: any) => p.param_key === 'app.logo');
      if (logo?.param_value) setAppLogo(logo.param_value);
    }).catch(() => {});
  }, []);
  
  const isDark = theme === 'dark';
  const bgColor = isDark ? '#0f172a' : '#f5f5f5';
  const cardBg = isDark ? '#1e293b' : '#ffffff';
  const textColor = isDark ? '#f1f5f9' : '#030213';
  const secondaryColor = isDark ? '#94a3b8' : '#717182';

  const onFinish = async (values: { username: string; password: string; remember: boolean }) => {
    setLoading(true);
    try {
      const response = await authApi.login(values);
      if (response.data.code === 200) {
        const { user, token } = response.data.data;
        authStore.login(user, token);
        message.success('登录成功');
        navigate('/app');
      }
    } catch (error: any) {
      message.error(error.response?.data?.message || '用户名或密码错误');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      height: '100vh',
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      background: bgColor,
      transition: 'background 0.3s',
    }}>
      <div style={{
        width: 360,
        padding: '40px',
        background: cardBg,
        borderRadius: '10px',
        boxShadow: isDark ? '0 4px 20px rgba(0,0,0,0.5)' : '0 2px 8px rgba(0,0,0,0.1)',
        transition: 'all 0.3s',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          {appLogo && (
            <img
              src={appLogo}
              alt="logo"
              style={{
                width: 80,
                height: 80,
                objectFit: 'contain',
                marginBottom: 16,
                borderRadius: 8,
              }}
            />
          )}
          <Title level={3} style={{ margin: 0, color: textColor }}>登录</Title>
          <Text type="secondary" style={{ color: secondaryColor }}>ABC 管理系统</Text>
        </div>

        <Form
          name="login"
          onFinish={onFinish}
          autoComplete="off"
          size="large"
        >
          <Form.Item
            name="username"
            rules={[{ required: true, message: '请输入用户名' }]}
          >
            <Input 
              prefix={<UserOutlined />} 
              placeholder="用户名" 
            />
          </Form.Item>

          <Form.Item
            name="password"
            rules={[
              { required: true, message: '请输入密码' },
              { min: 6, message: '密码至少6位' }
            ]}
          >
            <Input.Password 
              prefix={<LockOutlined />} 
              placeholder="密码" 
            />
          </Form.Item>

          <Form.Item name="remember" valuePropName="checked">
            <Checkbox>记住密码</Checkbox>
          </Form.Item>

          <Form.Item>
            <Button 
              type="primary" 
              htmlType="submit" 
              loading={loading}
              block
              style={{ 
                background: 'linear-gradient(135deg, #1e40af 0%, #3b82f6 100%)',
                border: 'none',
              }}
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: secondaryColor, fontSize: '12px' }}>
          默认账号: admin / admin123
        </div>
      </div>
    </div>
  );
}
