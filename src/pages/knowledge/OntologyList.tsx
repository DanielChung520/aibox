/**
 * @file        知識本體列表頁面
 * @description 知識管理 - 知識本體(Ontology)列表與管理
 * @lastUpdate  2026-03-24 19:45:28
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Typography } from 'antd';
import { useContentTokens } from '../../contexts/AppThemeProvider';

const { Title } = Typography;

export default function OntologyList() {
  const contentTokens = useContentTokens();
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%',
      flexDirection: 'column'
    }}>
      <Title level={2} style={{ color: contentTokens.colorPrimary }}>📚 知識本體列表</Title>
      <Title level={4} type="secondary">此功能正在開發中，敬請期待...</Title>
    </div>
  );
}
