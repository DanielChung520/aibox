/**
 * @file        知識庫向量面板元件
 * @description 顯示文件的向量分塊結果
 * @lastUpdate  2026-03-24 23:08:24
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Collapse, Tag, Typography, Space, Descriptions, theme } from 'antd';
import { VectorChunk } from '../../../services/api';

const { Text } = Typography;

interface KBVectorPanelProps {
  fileId: string;
}

const MOCK_VECTOR_STATS = {
  total_chunks: 124,
  dimension: 1536,
  model: 'text-embedding-3-small',
  processing_time: '12s',
};

const MOCK_CHUNKS: VectorChunk[] = [
  { chunk_id: 'c1', text: '物料管理系統中，安全庫存量的計算需考慮平均日用量、前置時間及安全係數。建議採用「平均日用量 × 前置天數 × 安全係數」公式...', vector_preview: [0.012, -0.045, 0.882, 0.331, -0.127], metadata: { page: '3', section: '2.1' } },
  { chunk_id: 'c2', text: '供應商評估應涵蓋品質、交期、價格三大面向。品質面向包含來料合格率、退貨率；交期面向包含準時交貨率、緊急訂單配合度...', vector_preview: [0.045, 0.112, -0.667, 0.089, 0.445], metadata: { page: '5', section: '3.2' } },
  { chunk_id: 'c3', text: '倉庫管理採用 ABC 分類法，A 類物料佔總值 80% 但品項僅 20%，需實施嚴格庫存控制與定期盤點...', vector_preview: [-0.234, 0.556, 0.123, -0.089, 0.778], metadata: { page: '8', section: '4.1' } },
];

export default function KBVectorPanel({ fileId }: KBVectorPanelProps) {
  const { token } = theme.useToken();

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginLG }}>
      <div style={{ 
        padding: token.padding, 
        backgroundColor: token.colorBgContainer, 
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`
      }}>
        <Descriptions title={<Text style={{ color: token.colorText }}>向量化統計 ({fileId})</Text>} column={{ xxl: 4, xl: 4, lg: 4, md: 2, sm: 2, xs: 1 }}>
          <Descriptions.Item label="分塊數量">{MOCK_VECTOR_STATS.total_chunks}</Descriptions.Item>
          <Descriptions.Item label="向量維度">{MOCK_VECTOR_STATS.dimension}</Descriptions.Item>
          <Descriptions.Item label="嵌入模型">{MOCK_VECTOR_STATS.model}</Descriptions.Item>
          <Descriptions.Item label="處理耗時">{MOCK_VECTOR_STATS.processing_time}</Descriptions.Item>
        </Descriptions>
      </div>

      <Collapse 
        defaultActiveKey={['0']} 
        style={{ backgroundColor: token.colorBgContainer }}
        items={MOCK_CHUNKS.map((chunk, index) => ({
          key: String(index),
          label: <Text strong style={{ color: token.colorText }}>Chunk #{index + 1}</Text>,
          children: (
            <Space orientation="vertical" size="middle" style={{ width: '100%' }}>
              <div style={{ 
                padding: token.paddingSM, 
                backgroundColor: token.colorBgLayout, 
                borderRadius: token.borderRadius,
                color: token.colorText
              }}>
                {chunk.text}
              </div>
              <div>
                <Text type="secondary" style={{ display: 'block', marginBottom: token.marginXS }}>向量預覽 (前 5 維):</Text>
                <Space wrap>
                  {chunk.vector_preview.map((v, i) => (
                    <Tag key={i} color="blue" bordered={false}>{v.toFixed(3)}</Tag>
                  ))}
                  <Text type="secondary">...</Text>
                </Space>
              </div>
              {chunk.metadata && (
                <div>
                  <Text type="secondary" style={{ display: 'block', marginBottom: token.marginXS }}>元資料:</Text>
                  <Space wrap>
                    {Object.entries(chunk.metadata).map(([k, v]) => (
                      <Tag key={k} bordered={false}>{k}: {v}</Tag>
                    ))}
                  </Space>
                </div>
              )}
            </Space>
          )
        }))}
      />
    </div>
  );
}
