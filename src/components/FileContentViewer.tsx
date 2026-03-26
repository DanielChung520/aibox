/**
 * @file        文件內容預覽元件
 * @description 文件源文件/圖譜/向量 Tab 預覽，知識庫與 AI 聊天複用
 * @lastUpdate  2026-03-26 00:00:00
 * @author      Daniel Chung
 * @version     1.0.0
 */

import { Card, Tabs, Button, theme } from 'antd';
import { SettingOutlined } from '@ant-design/icons';
import type { Graph } from '@antv/g6';
import type { GraphNode, GraphEdge } from '../services/api';
import KBSourcePreview from '../pages/knowledge/components/KBSourcePreview';
import KBGraphPanel from '../pages/knowledge/components/KBGraphPanel';
import KBVectorPanel from '../pages/knowledge/components/KBVectorPanel';

interface FileContentViewerProps {
  fileId: string;
  fileName: string;
  fileType: string;
  activeTab?: string;
  graphStatus?: string;
  vectorStatus?: string;
  onActiveTabChange?: (tab: string) => void;
  onSettingsClick?: () => void;
  onGraphReady?: (graph: Graph) => void;
  onNodeSelect?: (nodeId: string | null) => void;
  onDataLoaded?: (nodes: GraphNode[], edges: GraphEdge[]) => void;
}

export default function FileContentViewer({
  fileId, fileName, fileType, activeTab = 'source', graphStatus, vectorStatus,
  onActiveTabChange, onSettingsClick, onGraphReady, onNodeSelect, onDataLoaded,
}: FileContentViewerProps) {
  const { token } = theme.useToken();
  const currentTab = activeTab;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', overflow: 'hidden', boxSizing: 'border-box' }}>
      <Card
        style={{ height: '100%', overflow: 'hidden', display: 'flex', flexDirection: 'column' }}
        styles={{ body: { flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' } }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingBottom: token.padding, flexShrink: 0, borderBottom: `1px solid ${token.colorBorderSecondary}`, marginBottom: token.margin }}>
          <Tabs
            activeKey={currentTab} onChange={onActiveTabChange}
            items={[
              { key: 'source', label: '源文件' },
              { key: 'graph', label: '圖譜' },
              { key: 'vector', label: '向量' },
            ]}
          />
          {onSettingsClick && (
            <Button icon={<SettingOutlined />} onClick={onSettingsClick} size="small" />
          )}
        </div>
        <div style={{ flex: 1, overflow: currentTab === 'graph' ? 'hidden' : 'auto', paddingTop: token.margin }}>
          {currentTab === 'source' && (
            <KBSourcePreview fileId={fileId} fileName={fileName} fileType={fileType} />
          )}
          {currentTab === 'graph' && (
            <KBGraphPanel
              fileId={fileId} graphStatus={graphStatus}
              onNodeSelect={onNodeSelect} onGraphReady={onGraphReady} onDataLoaded={onDataLoaded}
            />
          )}
          {currentTab === 'vector' && (
            <KBVectorPanel fileId={fileId} vectorStatus={vectorStatus} />
          )}
        </div>
      </Card>
    </div>
  );
}
