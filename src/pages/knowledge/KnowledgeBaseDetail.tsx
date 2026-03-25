/**
 * @file        知識庫詳情頁面
 * @description 三欄佈局：左側文件列表、中間圖譜/源文件/向量、右側節點與關係面板
 * @lastUpdate  2026-03-25 16:15:47
 * @author      Daniel Chung
 * @version     2.0.0
 */

import { useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Button, Tabs, Space, Typography, Empty, App, theme } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import type { Graph } from '@antv/g6';
import { KnowledgeFile, GraphNode, GraphEdge } from '../../services/api';
import KBFileList from './components/KBFileList';
import KBSourcePreview from './components/KBSourcePreview';
import KBVectorPanel from './components/KBVectorPanel';
import KBGraphPanel from './components/KBGraphPanel';
import KBFileUpload from './components/KBFileUpload';
import KBNodeRelPanel from './components/KBNodeRelPanel';

const { Title, Text } = Typography;

const MOCK_FILES: KnowledgeFile[] = [
  { _key: 'f1', filename: '庫存規範.pdf', file_size: 1258000, file_type: 'application/pdf', upload_time: '2026-03-01T10:00:00Z', vector_status: 'completed', graph_status: 'completed', knowledge_root_id: 'kb1' },
  { _key: 'f2', filename: '採購流程.md', file_size: 45600, file_type: 'text/markdown', upload_time: '2026-03-05T14:30:00Z', vector_status: 'completed', graph_status: 'processing', knowledge_root_id: 'kb1' },
  { _key: 'f3', filename: '物料標準.txt', file_size: 12300, file_type: 'text/plain', upload_time: '2026-03-10T09:00:00Z', vector_status: 'processing', graph_status: 'pending', knowledge_root_id: 'kb1' },
  { _key: 'f4', filename: '供應商評估報告.pdf', file_size: 3456000, file_type: 'application/pdf', upload_time: '2026-03-15T16:00:00Z', vector_status: 'pending', graph_status: 'pending', knowledge_root_id: 'kb1' },
  { _key: 'f5', filename: '品質管控手冊.md', file_size: 89000, file_type: 'text/markdown', upload_time: '2026-03-20T11:30:00Z', vector_status: 'completed', graph_status: 'completed', knowledge_root_id: 'kb1' },
];

const MOCK_NODES: GraphNode[] = [
  { id: 'n1', label: '物料', type: '核心實體', properties: { category: '原材料', status: '使用中' } },
  { id: 'n2', label: '倉庫', type: '地點', properties: { location: 'A 區', capacity: '5000' } },
  { id: 'n3', label: '供應商', type: '組織', properties: { rating: 'A', region: '華東' } },
  { id: 'n4', label: '分類', type: '概念', properties: { method: 'ABC', level: 'A' } },
];

const MOCK_EDGES: GraphEdge[] = [
  { source: 'n1', target: 'n2', label: '存放於' },
  { source: 'n3', target: 'n1', label: '供應' },
  { source: 'n1', target: 'n4', label: '屬於' },
];

export default function KnowledgeBaseDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { message } = App.useApp();
  const { token } = theme.useToken();

  const [files, setFiles] = useState<KnowledgeFile[]>(MOCK_FILES);
  const [selectedFileId, setSelectedFileId] = useState<string | undefined>(undefined);
  const [activeTab, setActiveTab] = useState<string>('graph');
  const [uploadMode, setUploadMode] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [rightPanelCollapsed, setRightPanelCollapsed] = useState(false);
  const graphInstanceRef = useRef<Graph | null>(null);

  const selectedFile = files.find(f => f._key === selectedFileId);

  const handleSelectFile = (fileId: string) => {
    setSelectedFileId(fileId);
    setUploadMode(false);
  };

  const handleDeleteFile = (fileId: string) => {
    setFiles(files.filter(f => f._key !== fileId));
    if (selectedFileId === fileId) setSelectedFileId(undefined);
    message.success('文件已刪除 (Mock)');
  };

  const handleUploadComplete = () => {
    message.success('文件上傳成功 (Mock)');
    setUploadMode(false);
  };

  const handleGraphReady = useCallback((graph: Graph) => {
    graphInstanceRef.current = graph;
  }, []);

  const handleNodeSelect = useCallback((nodeId: string | null) => {
    setSelectedNodeId(nodeId);
  }, []);

  const handleRightPanelNodeClick = useCallback((nodeId: string) => {
    setSelectedNodeId(nodeId);
    const graph = graphInstanceRef.current;
    if (!graph) return;
    try {
      graph.setElementState(nodeId, 'selected', true);
      graph.focusElement(nodeId, { duration: 500 });
    } catch { /* graph may not be ready */ }
  }, []);

  const showRightPanel = activeTab === 'graph' && selectedFile && !uploadMode;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
      {/* Top Bar */}
      <div style={{
        padding: token.padding,
        borderBottom: `1px solid ${token.colorBorderSecondary}`,
        display: 'flex', alignItems: 'center', gap: token.margin,
        backgroundColor: token.colorBgContainer, flexShrink: 0,
      }}>
        <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/app/knowledge/management')} />
        <Space direction="vertical" size={0}>
          <Title level={4} style={{ margin: 0, color: token.colorText }}>MM-Agent 知識庫</Title>
          <Text style={{ color: token.colorTextSecondary, fontSize: token.fontSizeSM }}>ID: {id || 'kb1'}</Text>
        </Space>
      </div>

      {/* Body: 3-panel layout */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0 }}>
        {/* Left Panel: File List */}
        <div style={{
          width: 280, minWidth: 280, flexShrink: 0,
          borderRight: `1px solid ${token.colorBorderSecondary}`,
          backgroundColor: token.colorBgContainer,
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
        }}>
          <KBFileList
            rootId={id || 'kb1'} files={files} selectedFileId={selectedFileId}
            onSelectFile={handleSelectFile} onUpload={() => setUploadMode(true)}
            onDeleteFile={handleDeleteFile} loading={false}
          />
        </div>

        {/* Center Panel: Content */}
        <div style={{
          flex: 1, minWidth: 0, overflow: 'hidden',
          backgroundColor: token.colorBgLayout,
          display: 'flex', flexDirection: 'column',
        }}>
          {uploadMode ? (
            <div style={{ padding: token.paddingXL, maxWidth: 600, margin: '0 auto', width: '100%' }}>
              <KBFileUpload rootId={id || 'kb1'} onUploadComplete={handleUploadComplete} />
            </div>
          ) : !selectedFile ? (
            <div style={{ display: 'flex', height: '100%', alignItems: 'center', justifyContent: 'center' }}>
              <Empty description={<Text style={{ color: token.colorTextSecondary }}>請在左側選擇文件以查看詳情</Text>} />
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              <div style={{ padding: `0 ${token.padding}px`, backgroundColor: token.colorBgContainer, flexShrink: 0 }}>
                <Tabs
                  activeKey={activeTab} onChange={setActiveTab}
                  items={[
                    { key: 'graph', label: '圖譜' },
                    { key: 'source', label: '源文件' },
                    { key: 'vector', label: '向量' },
                  ]}
                />
              </div>
              <div style={{ flex: 1, overflow: activeTab === 'graph' ? 'hidden' : 'auto', padding: activeTab === 'graph' ? 0 : token.padding }}>
                {activeTab === 'graph' && (
                  <KBGraphPanel fileId={selectedFile._key} onNodeSelect={handleNodeSelect} onGraphReady={handleGraphReady} />
                )}
                {activeTab === 'source' && (
                  <KBSourcePreview fileId={selectedFile._key} fileName={selectedFile.filename} fileType={selectedFile.file_type} />
                )}
                {activeTab === 'vector' && <KBVectorPanel fileId={selectedFile._key} />}
              </div>
            </div>
          )}
        </div>

        {/* Right Panel: Node & Relationship (only visible in graph tab) */}
        {showRightPanel && (
          <KBNodeRelPanel
            nodes={MOCK_NODES} edges={MOCK_EDGES}
            selectedNodeId={selectedNodeId} onNodeClick={handleRightPanelNodeClick}
            collapsed={rightPanelCollapsed} onCollapse={setRightPanelCollapsed}
          />
        )}
      </div>
    </div>
  );
}
