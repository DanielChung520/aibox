/**
 * @file        知識庫圖譜面板元件
 * @description 使用 @antv/g6 v5 力導向圖視覺化知識圖譜節點與關聯
 * @lastUpdate  2026-03-25 16:03:03
 * @author      Daniel Chung
 * @version     2.0.0
 */

import { useEffect, useRef } from 'react';
import { theme } from 'antd';
import { Graph, NodeEvent, CanvasEvent } from '@antv/g6';
import type { IElementEvent, IPointerEvent } from '@antv/g6';
import { GraphNode, GraphEdge } from '../../../services/api';

interface KBGraphPanelProps {
  fileId: string;
  onNodeSelect?: (nodeId: string | null) => void;
  onGraphReady?: (graph: Graph) => void;
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

export default function KBGraphPanel({ fileId, onNodeSelect, onGraphReady }: KBGraphPanelProps) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const graphNodes = MOCK_GRAPH_NODES.map((n) => ({
      id: n.id,
      data: { label: n.label, type: n.type, properties: n.properties },
    }));

    const graphEdges = MOCK_GRAPH_EDGES.map((e, idx) => ({
      id: `edge-${idx}`,
      source: e.source,
      target: e.target,
      data: { label: e.label },
    }));

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      data: { nodes: graphNodes, edges: graphEdges },
      node: {
        style: {
          size: 32,
          labelText: (d) => (d.data?.label as string) || d.id,
          labelPlacement: 'bottom',
          fill: token.colorPrimary,
          stroke: token.colorBorder,
          labelFill: token.colorText,
          labelFontSize: 12,
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
          labelText: (d) => (d.data?.label as string) || '',
          stroke: token.colorBorderSecondary,
          endArrow: true,
          labelFill: token.colorTextSecondary,
          labelFontSize: 11,
        },
      },
      layout: {
        type: 'force',
        preventOverlap: true,
        linkDistance: 150,
        animated: true,
      },
      behaviors: ['drag-canvas', 'zoom-canvas', 'drag-element'],
    });

    graph.on(NodeEvent.CLICK, (evt: IElementEvent) => {
      onNodeSelect?.(evt.target.id);
    });

    graph.on(CanvasEvent.CLICK, (_evt: IPointerEvent) => {
      onNodeSelect?.(null);
    });

    graph.render().then(() => {
      onGraphReady?.(graph);
    });

    graphRef.current = graph;

    return () => {
      graphRef.current = null;
      graph.destroy();
    };
    // fileId 變更時重新初始化圖譜
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fileId]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 400,
        borderRadius: token.borderRadiusLG,
        border: `1px solid ${token.colorBorderSecondary}`,
        backgroundColor: token.colorBgContainer,
      }}
    />
  );
}
