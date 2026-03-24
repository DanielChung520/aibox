/**
 * @file        知識庫管理頁面
 * @description 知識管理 - 知識庫的建立、設定與管理
 * @lastUpdate  2026-03-24 19:45:28
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Typography } from 'antd';
import { useContentTokens } from '../../contexts/AppThemeProvider';

const { Title } = Typography;

export default function KnowledgeBaseManagement() {
  const contentTokens = useContentTokens();
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%',
      flexDirection: 'column'
    }}>
      <Title level={2} style={{ color: contentTokens.colorPrimary }}>🗄️ 知識庫管理</Title>
      <Title level={4} type="secondary">此功能正在開發中，敬請期待...</Title>
    </div>
  );
}
