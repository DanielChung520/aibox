/**
 * @file        知識庫圖譜面板元件
 * @description 顯示文件解析出的知識圖譜節點與關聯
 * @lastUpdate  2026-03-24 23:08:24
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Typography, Space, Table, Tag, theme } from 'antd';
import { GraphNode, GraphEdge } from '../../../services/api';

const { Title, Text } = Typography;

interface KBGraphPanelProps {
  fileId: string;
}

const MOCK_GRAPH_NODES: GraphNode[] = [
  { id: 'n1', label: '物料', type: '核心實體', properties: { category: '原材料', status: '使用中' } },
  { id: 'n2', label: '倉庫', type: '地點', properties: { location: 'A 區', capacity: '5000' } },
  { id: 'n3', label: '供應商', type: '組織', properties: { rating: 'A', region: '華東' } },
  { id: 'n4', label: '分類', type: '概念', properties: { method: 'ABC', level: 'A' } },
];

const MOCK_GRAPH_EDGES: GraphEdge[] = [
  { source: 'n1', target: 'n2', label: '存放於' },
  { source: 'n3', target: 'n1', label: '供應' },
  { source: 'n1', target: 'n4', label: '屬於' },
];

export default function KBGraphPanel({ fileId }: KBGraphPanelProps) {
  const { token } = theme.useToken();

  const nodeColumns = [
    { title: '節點名稱', dataIndex: 'label', key: 'label', render: (text: string) => <Text strong>{text}</Text> },
    { title: '類型', dataIndex: 'type', key: 'type', render: (type: string) => <Tag color="geekblue">{type}</Tag> },
    { title: '屬性', dataIndex: 'properties', key: 'properties', render: (props: Record<string, string>) => (
      <Space wrap>
        {Object.entries(props).map(([k, v]) => <Tag key={k} bordered={false}>{k}: {v}</Tag>)}
      </Space>
    )}
  ];

  const edgeColumns = [
    { title: '起點', dataIndex: 'source', key: 'source', render: (src: string) => <Text>{MOCK_GRAPH_NODES.find(n => n.id === src)?.label || src}</Text> },
    { title: '關係', dataIndex: 'label', key: 'label', render: (text: string) => <Tag color="purple">{text}</Tag> },
    { title: '終點', dataIndex: 'target', key: 'target', render: (tgt: string) => <Text>{MOCK_GRAPH_NODES.find(n => n.id === tgt)?.label || tgt}</Text> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: token.marginLG }}>
      {/* Visual Placeholder for Force Graph */}
      <div style={{
        height: 300,
        backgroundColor: token.colorBgContainer,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: `radial-gradient(${token.colorBorder} 1px, transparent 1px)`,
        backgroundSize: '20px 20px'
      }}>
        <Title level={4} style={{ color: token.colorText, margin: 0 }}>Knowledge Graph 預覽 ({fileId})</Title>
        <Text style={{ color: token.colorTextSecondary, marginTop: token.margin }}>力導向圖將在後續版本實現</Text>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: token.marginLG }}>
        <div style={{ 
          padding: token.padding, 
          backgroundColor: token.colorBgContainer, 
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`
        }}>
          <Title level={5} style={{ color: token.colorText, marginTop: 0 }}>節點列表 (Nodes)</Title>
          <Table 
            dataSource={MOCK_GRAPH_NODES} 
            columns={nodeColumns} 
            rowKey="id" 
            pagination={false} 
            size="small"
          />
        </div>

        <div style={{ 
          padding: token.padding, 
          backgroundColor: token.colorBgContainer, 
          borderRadius: token.borderRadiusLG,
          border: `1px solid ${token.colorBorderSecondary}`
        }}>
          <Title level={5} style={{ color: token.colorText, marginTop: 0 }}>關係列表 (Edges)</Title>
          <Table 
            dataSource={MOCK_GRAPH_EDGES} 
            columns={edgeColumns} 
            rowKey={(record) => `${record.source}-${record.target}`}
            pagination={false} 
            size="small"
          />
        </div>
      </div>
    </div>
  );
}
