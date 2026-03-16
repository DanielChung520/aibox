import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, Input, Button, Checkbox, Typography, message } from 'antd';
import { UserOutlined, LockOutlined } from '@ant-design/icons';
import { authApi } from '../services/api';
import { authStore } from '../stores/auth';

const { Title, Text } = Typography;

export default function Login() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

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
      background: '#f5f5f5',
    }}>
      <div style={{
        width: 360,
        padding: '40px',
        background: '#fff',
        borderRadius: '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <Title level={3} style={{ margin: 0 }}>登录</Title>
          <Text type="secondary">ABC 管理系统</Text>
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
            >
              登录
            </Button>
          </Form.Item>
        </Form>

        <div style={{ textAlign: 'center', color: '#999', fontSize: '12px' }}>
          默认账号: admin / admin123
        </div>
      </div>
    </div>
  );
}
