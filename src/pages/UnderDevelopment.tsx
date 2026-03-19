/**
 * @file        開發中頁面
 * @description 顯示「功能開發中」提示的通用頁面
 * @lastUpdate  2026-03-17 23:27:55
 * @author      Daniel Chung
 * @version     1.0.0
 * @history
 * - 2026-03-17 23:27:55 | Daniel Chung | 1.0.0 | 初始版本
 */

import { Typography } from 'antd';

const { Title } = Typography;

export default function UnderDevelopment() {
  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100%',
      flexDirection: 'column'
    }}>
      <Title level={2} style={{ color: '#f59e0b' }}>🚧 开发中</Title>
      <Title level={4} type="secondary">此功能正在开发中，敬请期待...</Title>
    </div>
  );
}
