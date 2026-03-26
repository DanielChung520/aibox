/**
 * @file        知識庫向量面板元件
 * @description 顯示文件的向量分塊結果
 * @lastUpdate  2026-03-26 00:00:00
 * @author      Daniel Chung
 * @version     1.1.0
 */

import { useEffect, useState } from 'react';
import { Empty, Spin, Alert, Table, Button, message, Typography, theme } from 'antd';
import { ReloadOutlined } from '@ant-design/icons';
import { knowledgeApi, VectorChunk } from '../../../services/api';

const { Text } = Typography;

interface KBVectorPanelProps {
  fileId: string;
}

export default function KBVectorPanel({ fileId }: KBVectorPanelProps) {
  const { token } = theme.useToken();
  const [chunks, setChunks] = useState<VectorChunk[]>([]);
  const [loading, setLoading] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchChunks = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await knowledgeApi.getVectors(fileId, { limit: 50, offset: 0 });
      setChunks(res.data.data?.chunks || []);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || '載入向量失敗');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChunks();
  }, [fileId]);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await knowledgeApi.regenerateFile(fileId);
      message.success('已重新提交向量生成任務');
      fetchChunks();
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '重新產生失敗');
    } finally {
      setRegenerating(false);
    }
  };

  const columns = [
    {
      title: '#',
      dataIndex: 'chunk_index',
      key: 'chunk_index',
      width: 60,
      render: (v: number) => <Text type="secondary">{v + 1}</Text>,
    },
    {
      title: '文字內容',
      dataIndex: 'text',
      key: 'text',
      ellipsis: true,
    },
    {
      title: '相似度',
      dataIndex: 'score',
      key: 'score',
      width: 80,
      render: (v: number) => <Text type="secondary">{v?.toFixed(3) ?? '—'}</Text>,
    },
  ];

  return (
    <div style={{ padding: token.padding }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: token.margin }}>
        <Button
          icon={<ReloadOutlined />}
          loading={regenerating}
          onClick={handleRegenerate}
          size="small"
        >
          重新產生
        </Button>
      </div>

      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}>
          <Spin tip="載入向量..." />
        </div>
      )}

      {!loading && error && (
        <Alert type="error" message={error} showIcon style={{ marginBottom: token.margin }} />
      )}

      {!loading && !error && chunks.length === 0 && (
        <Empty
          description={
            <Text style={{ color: token.colorTextSecondary }}>
              向量分塊待生成
            </Text>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      )}

      {!loading && !error && chunks.length > 0 && (
        <Table
          dataSource={chunks}
          rowKey="chunk_id"
          columns={columns}
          size="small"
          pagination={{ pageSize: 10, size: 'small' }}
          scroll={{ y: 400 }}
        />
      )}
    </div>
  );
}
