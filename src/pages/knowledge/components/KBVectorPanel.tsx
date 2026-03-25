/**
 * @file        知識庫向量面板元件
 * @description 顯示文件的向量分塊結果
 * @lastUpdate  2026-03-25 18:00:00
 * @author      Daniel Chung
 * @version     1.0.1
 */

import { Empty, Typography, theme } from 'antd';

const { Text } = Typography;

interface KBVectorPanelProps {
  fileId: string;
}

export default function KBVectorPanel({ fileId }: KBVectorPanelProps) {
  const { token } = theme.useToken();

  return (
    <Empty
      description={
        <Text style={{ color: token.colorTextSecondary }}>
          向量分塊待生成（file_id: {fileId}）
        </Text>
      }
      image={Empty.PRESENTED_IMAGE_SIMPLE}
    />
  );
}
