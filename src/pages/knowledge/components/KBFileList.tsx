/**
 * @file        知識庫檔案列表元件
 * @description 顯示並管理知識庫內的文件清單
 * @lastUpdate  2026-03-26 00:00:00
 * @author      Daniel Chung
 * @version     1.1.0
 */

import { Input, Button, Popconfirm, Typography, Table, theme } from 'antd';
import type { ColumnsType } from 'antd/es/table';
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

export default function KBFileList({ files, selectedFileId, onSelectFile, onUpload, onDeleteFile, loading }: KBFileListProps) {
  const [searchText, setSearchText] = useState('');
  const { token } = theme.useToken();

  const filteredFiles = files.filter(f => f.filename.toLowerCase().includes(searchText.toLowerCase()));

  const columns: ColumnsType<KnowledgeFile> = [
    {
      title: '文件名稱',
      dataIndex: 'filename',
      key: 'filename',
      render: (filename: string, record) => {
        const isPdf = record.file_type?.includes('pdf');
        const isMd = record.file_type?.includes('markdown');
        const isSelected = record._key === selectedFileId;
        const textColor = isSelected ? '#fff' : token.colorText;
        const iconColor = isSelected ? '#fff' : (
          isPdf ? token.colorError : isMd ? token.colorPrimary : token.colorSuccess
        );
        return (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {isPdf ? <FilePdfOutlined style={{ color: iconColor }} /> :
             isMd ? <FileMarkdownOutlined style={{ color: iconColor }} /> :
             <FileTextOutlined style={{ color: iconColor }} />}
            <Text ellipsis={{ tooltip: filename }} style={{ color: textColor, fontWeight: isSelected ? 500 : 400 }}>
              {filename}
            </Text>
          </div>
        );
      },
    },
    {
      title: '大小',
      dataIndex: 'file_size',
      key: 'file_size',
      width: 80,
      render: (size: number, record) => {
        const isSelected = record._key === selectedFileId;
        return (
          <Text style={{ fontSize: token.fontSizeSM, color: isSelected ? 'rgba(255,255,255,0.7)' : token.colorTextSecondary }}>
            {formatSize(size)}
          </Text>
        );
      },
    },
    {
      title: '',
      key: 'action',
      width: 40,
      render: (_: unknown, record: KnowledgeFile) => {
        const isSelected = record._key === selectedFileId;
        return (
          <Popconfirm
            title="確定要刪除此文件嗎？"
            onConfirm={() => onDeleteFile(record._key)}
          >
            <Button
              type="text"
              danger
              size="small"
              icon={<DeleteOutlined />}
              style={isSelected ? { color: '#fff' } : undefined}
            />
          </Popconfirm>
        );
      },
    },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      <div style={{ padding: token.padding, borderBottom: `1px solid ${token.colorBorderSecondary}` }}>
        <Button type="primary" icon={<UploadOutlined />} block onClick={onUpload} style={{ marginBottom: token.margin }}>
          上傳文件
        </Button>
        <Input
          placeholder="搜尋文件..."
          prefix={<SearchOutlined />}
          value={searchText}
          onChange={(e) => setSearchText(e.target.value)}
          allowClear
        />
      </div>

      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Table
          dataSource={filteredFiles}
          columns={columns}
          rowKey="_key"
          size="small"
          loading={loading}
          pagination={false}
          scroll={{ y: 'calc(100vh - 220px)' }}
          onRow={(record) => ({
            onClick: () => onSelectFile(record._key),
            style: {
              cursor: 'pointer',
              backgroundColor: record._key === selectedFileId
                ? token.controlItemBgActive
                : 'transparent',
            },
          })}
          locale={{ emptyText: '尚無文件' }}
        />
      </div>
    </div>
  );
}
