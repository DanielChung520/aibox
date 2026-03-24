/**
 * @file        知識庫卡片網格視圖
 * @description Grid 卡片式佈局，展示知識庫核心狀態與操作按鈕
 * @lastUpdate  2026-03-24 23:06:11
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Card, Row, Col, Typography, Button, Tag, Space, Empty, Spin } from 'antd';
import {
  FolderOpenOutlined,
  DatabaseOutlined,
  ProjectOutlined,
  HeartFilled,
  HeartOutlined,
} from '@ant-design/icons';
import { KnowledgeRoot } from '../../../services/api';
import { useContentTokens } from '../../../contexts/AppThemeProvider';

const { Title, Paragraph, Text } = Typography;

export interface KBCardGridProps {
  data: KnowledgeRoot[];
  loading: boolean;
  onRefresh?: () => void;
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

export default function KBCardGrid({
  data,
  loading,
  onEdit,
  onCopy,
  onDelete,
  onFavoriteToggle,
}: KBCardGridProps) {
  const contentTokens = useContentTokens();

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '50px' }}>
        <Spin size="large" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return <Empty description="暫無知識庫" />;
  }

  return (
    <Row gutter={[16, 16]}>
      {data.map((item) => (
        <Col xs={24} sm={12} md={8} lg={6} xl={6} key={item._key}>
          <Card
            hoverable
            style={{
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: contentTokens.cardShadow,
              borderRadius: contentTokens.borderRadius,
              border: `1px solid ${contentTokens.colorBgBase}`,
            }}
            bodyStyle={{ flex: 1, display: 'flex', flexDirection: 'column', padding: '16px' }}
            actions={[
              <Button type="link" onClick={() => onEdit(item._key)} key="edit">
                詳情
              </Button>,
              <Button type="link" onClick={() => onCopy(item._key)} key="copy">
                複製
              </Button>,
              <Button type="link" danger onClick={() => onDelete(item._key)} key="delete">
                刪除
              </Button>,
            ]}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
              <Space align="center">
                <FolderOpenOutlined style={{ fontSize: 20, color: contentTokens.colorPrimary }} />
                <Title level={5} style={{ margin: 0 }} ellipsis={{ tooltip: item.name }}>
                  {item.name}
                </Title>
              </Space>
              <span
                onClick={(e) => {
                  e.stopPropagation();
                  onFavoriteToggle(item._key);
                }}
                style={{ cursor: 'pointer' }}
              >
                {item.is_favorite ? (
                  <HeartFilled style={{ color: contentTokens.colorError, fontSize: 18 }} />
                ) : (
                  <HeartOutlined style={{ color: contentTokens.textSecondary, fontSize: 18 }} />
                )}
              </span>
            </div>

            <Paragraph
              type="secondary"
              ellipsis={{ rows: 2, tooltip: item.description }}
              style={{ minHeight: 44, marginBottom: 16 }}
            >
              {item.description || '無描述'}
            </Paragraph>

            <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <Tag color={contentTokens.colorPrimary}>{item.ontology_domain}</Tag>
              </div>

              <Space direction="vertical" size="small" style={{ width: '100%', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary"><ProjectOutlined /> 來源數量</Text>
                  <Text strong>{item.source_count}</Text>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary"><DatabaseOutlined /> 向量狀態</Text>
                  <Tag color={getStatusColor(item.vector_status)} style={{ margin: 0 }}>
                    {getStatusText(item.vector_status)}
                  </Tag>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Text type="secondary"><DatabaseOutlined /> 圖譜狀態</Text>
                  <Tag color={getStatusColor(item.graph_status)} style={{ margin: 0 }}>
                    {getStatusText(item.graph_status)}
                  </Tag>
                </div>
              </Space>
            </div>
          </Card>
        </Col>
      ))}
    </Row>
  );
}