import { Typography } from 'antd';

const { Title } = Typography;

export default function TaskSessionScheduled() {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      flexDirection: 'column',
    }}>
      <Title level={3} style={{ color: '#64748b' }}>定期任務</Title>
      <Title level={5} type="secondary">功能開發中</Title>
    </div>
  );
}
