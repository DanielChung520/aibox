import { Typography } from 'antd';
import { useContentTokens } from '../contexts/AppThemeProvider';

const { Title } = Typography;

export default function TaskSessionHistory() {
  const contentTokens = useContentTokens();
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100%',
      flexDirection: 'column',
    }}>
      <Title level={3} style={{ color: contentTokens.textSecondary }}>瀏覽歷史會話</Title>
      <Title level={5} type="secondary">功能開發中</Title>
    </div>
  );
}
