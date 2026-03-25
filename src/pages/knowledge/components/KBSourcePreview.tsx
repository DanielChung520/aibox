/**
 * @file        知識庫源文件預覽元件
 * @description 根據文件類型顯示預覽或下載提示
 * @lastUpdate  2026-03-25 18:00:00
 * @author      Daniel Chung
 * @version     1.0.1
 */

import { Typography, theme } from 'antd';
import { FilePdfOutlined, FileMarkdownOutlined, FileTextOutlined, InboxOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface KBSourcePreviewProps {
  fileId: string;
  fileName: string;
  fileType: string;
}

export default function KBSourcePreview({ fileId, fileName, fileType }: KBSourcePreviewProps) {
  const { token } = theme.useToken();

  const getIcon = () => {
    if (fileType.includes('pdf')) return <FilePdfOutlined style={{ color: token.colorError }} />;
    if (fileType.includes('markdown')) return <FileMarkdownOutlined style={{ color: token.colorPrimary }} />;
    if (fileType.includes('csv') || fileType.includes('excel') || fileType.includes('sheet')) return <FileTextOutlined style={{ color: token.colorSuccess }} />;
    return <InboxOutlined style={{ color: token.colorTextSecondary }} />;
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: 60,
      backgroundColor: token.colorBgContainer,
      borderRadius: token.borderRadiusLG,
      border: `1px dashed ${token.colorBorder}`,
      minHeight: 300,
    }}>
      {getIcon()}
      <Title level={4} style={{ color: token.colorText, marginTop: 16, marginBottom: 8 }}>
        {fileName}
      </Title>
      <Text type="secondary">ID: {fileId} | 格式: {fileType}</Text>
      <Text type="secondary" style={{ marginTop: 8 }}>文件預覽待後端實作 /api/v1/knowledge/files/:key/preview</Text>
    </div>
  );
}
