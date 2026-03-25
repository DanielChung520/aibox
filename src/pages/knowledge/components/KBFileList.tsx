/**
 * @file        知識庫檔案列表元件
 * @description 顯示並管理知識庫內的文件清單
 * @lastUpdate  2026-03-25 18:20:00
 * @author      Daniel Chung
 * @version     1.0.1
 */

import { Input, Button, Popconfirm, Typography, Space, theme, Spin } from 'antd';
import { SearchOutlined, UploadOutlined, DeleteOutlined, FilePdfOutlined, FileMarkdownOutlined, FileTextOutlined } from '@ant-design/icons';
import { useState } from 'react';
import { KnowledgeFile } from '../../../services/api';

const { Text } = Typography;

interface KBFileListProps {
  rootId: string;
  files: KnowledgeFile[];
  selectedFileId?: string;
  onSelectFile: (fileId: string) => void;
  onUpload: () => void;
  onDeleteFile: (fileId: string) => void;
  loading?: boolean;
}

const formatSize = (bytes: number) => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateString: string) => {
  const d = new Date(dateString);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

export default function KBFileList({ files, selectedFileId, onSelectFile, onUpload, onDeleteFile, loading }: KBFileListProps) {
  const [searchText, setSearchText] = useState('');
  const { token } = theme.useToken();

  const filteredFiles = files.filter(f => f.filename.toLowerCase().includes(searchText.toLowerCase()));

  const getIcon = (type: string) => {
    if (type.includes('pdf')) return <FilePdfOutlined style={{ color: token.colorError }} />;
    if (type.includes('markdown')) return <FileMarkdownOutlined style={{ color: token.colorPrimary }} />;
    return <FileTextOutlined style={{ color: token.colorSuccess }} />;
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div style={{ padding: token.padding, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Space orientation="vertical" style={{ width: '100%' }} size="middle">
          <Button type="primary" icon={<UploadOutlined />} block onClick={onUpload}>
            上傳文件
          </Button>
          <Input
            placeholder="搜尋文件..."
            prefix={<SearchOutlined />}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
            allowClear
          />
        </Space>
      </div>

      <div style={{ flex: 1, overflow: 'auto', position: 'relative' }}>
        {loading && (
          <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10 }}>
            <Spin />
          </div>
        )}
        {filteredFiles.length === 0 && !loading && (
          <div style={{ padding: token.paddingLG, textAlign: 'center', color: token.colorTextSecondary }}>
            尚無文件
          </div>
        )}
        {filteredFiles.map((file) => {
          const isSelected = file._key === selectedFileId;
          return (
            <div
              key={file._key}
              style={{
                padding: token.padding,
                cursor: 'pointer',
                borderBottom: `1px solid ${token.colorBorderSecondary}`,
                backgroundColor: isSelected ? token.controlItemBgActive : 'transparent',
                transition: 'background-color 0.2s',
              }}
              onClick={() => onSelectFile(file._key)}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' }}>
                <Space align="start">
                  <span style={{ fontSize: 24 }}>{getIcon(file.file_type)}</span>
                  <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <Text
                      ellipsis={{ tooltip: file.filename }}
                      style={{
                        width: 170,
                        color: isSelected ? token.colorPrimary : token.colorText,
                        fontWeight: isSelected ? 500 : 400,
                      }}
                    >
                      {file.filename}
                    </Text>
                    <Space size="middle">
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        {formatSize(file.file_size)}
                      </Text>
                      <Text type="secondary" style={{ fontSize: token.fontSizeSM }}>
                        {formatDate(file.upload_time)}
                      </Text>
                    </Space>
                  </div>
                </Space>
                <Popconfirm
                  title="確定要刪除此文件嗎？"
                  onConfirm={(e) => {
                    e?.stopPropagation();
                    onDeleteFile(file._key);
                  }}
                  onCancel={(e) => e?.stopPropagation()}
                >
                  <Button
                    type="text"
                    danger
                    icon={<DeleteOutlined />}
                    onClick={(e) => e.stopPropagation()}
                  />
                </Popconfirm>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
