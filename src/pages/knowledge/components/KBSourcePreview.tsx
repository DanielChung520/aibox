/**
 * @file        知識庫源文件預覽元件
 * @description 根據文件類型顯示不同的預覽內容
 * @lastUpdate  2026-03-24 23:08:24
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Typography, Space, theme } from 'antd';
import { FilePdfOutlined, FileMarkdownOutlined, FileTextOutlined } from '@ant-design/icons';

const { Title, Text } = Typography;

interface KBSourcePreviewProps {
  fileId: string;
  fileName: string;
  fileType: string;
}

const MOCK_MD = `## 採購流程規範

1. **需求提出**：各部門根據年度預算提出採購需求。
2. **供應商評估**：針對新供應商進行資質審查。
3. **詢價比價**：至少取得三家合格供應商報價。
4. **合約簽訂**：確認交期、付款條件及違約責任。
5. **驗收付款**：依據合約標準進行驗收，合格後啟動付款流程。`;

const MOCK_TXT = `物料標準作業程序 (SOP)
版本：1.0
日期：2026-03-10

1. 物料分類原則
   - A類：高價值、低數量
   - B類：中價值、中數量
   - C類：低價值、高數量

2. 儲存環境要求
   - 溫度控制：20°C - 25°C
   - 濕度控制：40% - 60%`;

export default function KBSourcePreview({ fileId, fileName, fileType }: KBSourcePreviewProps) {
  const { token } = theme.useToken();

  const renderContent = () => {
    if (fileType.includes('pdf')) {
      return (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 60,
          backgroundColor: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          border: `1px dashed ${token.colorBorder}`
        }}>
          <FilePdfOutlined style={{ fontSize: 64, color: token.colorError, marginBottom: 16 }} />
          <Title level={4} style={{ color: token.colorText }}>PDF 預覽: {fileName}</Title>
          <Text style={{ color: token.colorTextSecondary }}>此為 PDF 文件的 Mock 預覽畫面</Text>
        </div>
      );
    }

    if (fileType.includes('markdown')) {
      return (
        <div style={{
          padding: token.paddingLG,
          backgroundColor: token.colorBgContainer,
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`,
          fontFamily: 'monospace',
          whiteSpace: 'pre-wrap',
          color: token.colorText
        }}>
          {MOCK_MD}
        </div>
      );
    }

    return (
      <div style={{
        padding: token.paddingLG,
        backgroundColor: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        fontFamily: 'monospace',
        whiteSpace: 'pre-wrap',
        color: token.colorText
      }}>
        {MOCK_TXT}
      </div>
    );
  };

  const getIcon = () => {
    if (fileType.includes('pdf')) return <FilePdfOutlined style={{ color: token.colorError }} />;
    if (fileType.includes('markdown')) return <FileMarkdownOutlined style={{ color: token.colorPrimary }} />;
    return <FileTextOutlined style={{ color: token.colorSuccess }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginLG }}>
      {renderContent()}
      
      <div style={{ 
        padding: token.padding, 
        backgroundColor: token.colorBgContainer, 
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`
      }}>
        <Space orientation="vertical" size="small" style={{ width: '100%' }}>
          <Space>
            {getIcon()}
            <Text strong style={{ color: token.colorText }}>{fileName}</Text>
          </Space>
          <Space split={<Text type="secondary">|</Text>} style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>
            <Text type="secondary">ID: {fileId}</Text>
            <Text type="secondary">格式: {fileType}</Text>
            <Text type="secondary">上傳時間: {new Date().toLocaleDateString()}</Text>
            <Text type="secondary">大小: 暫無資料</Text>
          </Space>
        </Space>
      </div>
    </div>
  );
}
