/**
 * @file        知識庫表格列表視圖
 * @description Table 列表式佈局，展示知識庫結構化資訊與多欄位排序
 * @lastUpdate  2026-03-24 23:06:11
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Table, Button, Space, Tag, Popconfirm } from 'antd';
import type { ColumnsType } from 'antd/es/table';
import { HeartFilled, HeartOutlined } from '@ant-design/icons';
import { KnowledgeRoot } from '../../../services/api';
import { useContentTokens } from '../../../contexts/AppThemeProvider';

export interface KBTableListProps {
  data: KnowledgeRoot[];
  loading: boolean;
  onEdit: (id: string) => void;
  onCopy: (id: string) => void;
  onDelete: (id: string) => void;
  onFavoriteToggle: (id: string) => void;
}

const getStatusColor = (status: string) => {
  switch (status) {
    case 'completed': return 'success';
    case 'processing': return 'processing';
    case 'failed': return 'error';
    case 'pending':
    default: return 'default';
  }
};

const getStatusText = (status: string) => {
  switch (status) {
    case 'completed': return '已完成';
    case 'processing': return '處理中';
    case 'failed': return '失敗';
    case 'pending':
    default: return '待處理';
  }
};

export default function KBTableList({
  data,
  loading,
  onEdit,
  onCopy,
  onDelete,
  onFavoriteToggle,
}: KBTableListProps) {
  const contentTokens = useContentTokens();

  const columns: ColumnsType<KnowledgeRoot> = [
    {
      title: '',
      dataIndex: 'is_favorite',
      key: 'is_favorite',
      width: 50,
      render: (is_favorite: boolean, record: KnowledgeRoot) => (
        <span
          onClick={(e) => {
            e.stopPropagation();
            onFavoriteToggle(record._key);
          }}
          style={{ cursor: 'pointer' }}
        >
          {is_favorite ? (
            <HeartFilled style={{ color: contentTokens.colorError, fontSize: 16 }} />
          ) : (
            <HeartOutlined style={{ color: contentTokens.textSecondary, fontSize: 16 }} />
          )}
        </span>
      ),
    },
    {
      title: '知識庫名稱',
      dataIndex: 'name',
      key: 'name',
      render: (text: string) => <strong style={{ color: contentTokens.colorPrimary }}>{text}</strong>,
    },
    {
      title: '描述',
      dataIndex: 'description',
      key: 'description',
      ellipsis: true,
    },
    {
      title: '領域',
      dataIndex: 'ontology_domain',
      key: 'ontology_domain',
      render: (text: string) => <Tag color={contentTokens.colorPrimary}>{text}</Tag>,
    },
    {
      title: '來源數量',
      dataIndex: 'source_count',
      key: 'source_count',
      width: 100,
    },
    {
      title: '向量狀態',
      dataIndex: 'vector_status',
      key: 'vector_status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '圖譜狀態',
      dataIndex: 'graph_status',
      key: 'graph_status',
      width: 100,
      render: (status: string) => (
        <Tag color={getStatusColor(status)}>{getStatusText(status)}</Tag>
      ),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_, record) => (
        <Space size="middle">
          <Button type="link" size="small" onClick={() => onEdit(record._key)} style={{ padding: 0 }}>
            詳情
          </Button>
          <Button type="link" size="small" onClick={() => onCopy(record._key)} style={{ padding: 0 }}>
            複製
          </Button>
          <Popconfirm
            title="確定要刪除此知識庫嗎？"
            description="刪除後將無法恢復"
            onConfirm={() => onDelete(record._key)}
            okText="確定"
            cancelText="取消"
          >
            <Button type="link" danger size="small" style={{ padding: 0 }}>
              刪除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <Table
      columns={columns}
      dataSource={data}
      rowKey="_key"
      loading={loading}
      pagination={{ pageSize: 10 }}
      style={{ boxShadow: contentTokens.tableShadow, borderRadius: contentTokens.borderRadius }}
    />
  );
}