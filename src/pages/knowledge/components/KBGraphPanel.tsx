/**
 * @file        知識庫圖譜面板元件
 * @description 使用 @antv/g6 v5 力導向圖視覺化知識圖譜節點與關聯
 * @lastUpdate  2026-03-26 00:00:00
 * @author      Daniel Chung
 * @version     2.1.0
 */

import { useEffect, useRef, useState } from 'react';
import { Empty, Spin, Alert, Typography, Button, message, theme } from 'antd';
import { Graph, NodeEvent, CanvasEvent } from '@antv/g6';
import type { IElementEvent, IPointerEvent, NodeData, EdgeData } from '@antv/g6';
import { ReloadOutlined } from '@ant-design/icons';
import { knowledgeApi, GraphNode, GraphEdge } from '../../../services/api';

const { Text } = Typography;

interface KBGraphPanelProps {
  fileId: string;
  onNodeSelect?: (nodeId: string | null) => void;
  onGraphReady?: (graph: Graph) => void;
  onDataLoaded?: (nodes: GraphNode[], edges: GraphEdge[]) => void;
}

type G6Node = {
  id: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

type G6Edge = {
  source: string;
  target: string;
  data?: Record<string, unknown>;
  [key: string]: unknown;
};

export default function KBGraphPanel({ fileId, onNodeSelect, onGraphReady, onDataLoaded }: KBGraphPanelProps) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasData, setHasData] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const instanceRef = useRef(0);

  const handleRegenerate = async () => {
    setRegenerating(true);
    try {
      await knowledgeApi.regenerateFile(fileId);
      message.success('已重新提交圖譜生成任務');
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      message.error(e.response?.data?.message || '重新產生失敗');
    } finally {
      setRegenerating(false);
    }
  };

  useEffect(() => {
    if (!containerRef.current) return;

    const currentInstance = ++instanceRef.current;
    graphRef.current?.destroy();
    graphRef.current = null;
    setLoading(true);
    setError(null);
    setHasData(false);

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      data: { nodes: [], edges: [] },
      node: {
        style: {
          size: 36,
          labelText: (d: NodeData): string => {
            const rec = d.data as Record<string, unknown> | undefined;
            return rec && typeof rec['label'] === 'string' ? rec['label'] : String(d.id);
          },
          labelFill: token.colorText,
          labelFontSize: 12,
          labelPlacement: 'bottom',
          fill: token.colorPrimary,
          stroke: token.colorBorder,
          lineWidth: 1,
        },
        state: {
          selected: {
            fill: token.colorPrimaryActive,
            stroke: token.colorPrimary,
            lineWidth: 3,
          },
        },
      },
      edge: {
        style: {
          labelText: (d: EdgeData): string => {
            const rec = d.data as Record<string, unknown> | undefined;
            return rec && typeof rec['label'] === 'string' ? rec['label'] : '';
          },
          labelFill: token.colorTextSecondary,
          labelFontSize: 11,
          stroke: token.colorBorderSecondary,
          endArrow: true,
        },
      },
      layout: { type: 'force', preventOverlap: true, linkDistance: 150, animated: true },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    });

    graph.on(NodeEvent.CLICK, (evt: IElementEvent) => {
      onNodeSelect?.(evt.target.id);
    });

    graph.on(CanvasEvent.CLICK, (_evt: IPointerEvent) => {
      onNodeSelect?.(null);
    });

    graph.render().then(() => {
      if (instanceRef.current !== currentInstance) return;
      onGraphReady?.(graph);
    }).catch(() => {});

    graphRef.current = graph;

    const fetchGraph = async () => {
      try {
        const res = await knowledgeApi.getGraph(fileId);
        const data = res.data.data;
        if (instanceRef.current !== currentInstance) return;
        if (!data || (!data.nodes?.length && !data.edges?.length)) {
          setHasData(false);
          setLoading(false);
          return;
        }
        const nodes: G6Node[] = (data.nodes || []).map((n: GraphNode) => ({
          id: n.id,
          data: { label: n.label },
        }));
        const edges: G6Edge[] = (data.edges || []).map((e: GraphEdge) => ({
          source: e.source,
          target: e.target,
          data: { label: e.label },
        }));
        if (instanceRef.current !== currentInstance) return;
        graph.setData({ nodes, edges });
        await graph.render();
        if (instanceRef.current !== currentInstance) return;
        onDataLoaded?.(data.nodes || [], data.edges || []);
        setHasData(true);
      } catch (err: unknown) {
        const e = err as { response?: { data?: { message?: string } } };
        if (instanceRef.current === currentInstance) {
          setError(e.response?.data?.message || '載入圖譜失敗');
        }
      } finally {
        if (instanceRef.current === currentInstance) {
          setLoading(false);
        }
      }
    };

    fetchGraph();

    return () => {
      if (instanceRef.current === currentInstance) {
        instanceRef.current = -1;
        graphRef.current = null;
        graph.destroy();
      }
    };
  }, [fileId, onNodeSelect, onGraphReady, onDataLoaded, token]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        backgroundColor: token.colorBgContainer,
        position: 'relative',
      }}
    >
      {loading && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.8)', zIndex: 10,
        }}>
          <Spin tip="載入圖譜..." />
        </div>
      )}
      {!loading && error && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          backgroundColor: 'rgba(255,255,255,0.9)', zIndex: 10,
        }}>
          <Alert type="error" message={error} showIcon style={{ maxWidth: 300 }} />
        </div>
      )}
      {!loading && !error && !hasData && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          zIndex: 10, gap: token.padding,
        }}>
          <Empty
            description={
              <Text style={{ color: token.colorTextSecondary }}>
                圖譜待生成
              </Text>
            }
            image={Empty.PRESENTED_IMAGE_SIMPLE}
          />
          <Button
            icon={<ReloadOutlined />}
            loading={regenerating}
            onClick={handleRegenerate}
          >
            重新產生
          </Button>
        </div>
      )}
    </div>
  );
}
