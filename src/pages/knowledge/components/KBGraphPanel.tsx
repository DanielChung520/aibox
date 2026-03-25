/**
 * @file        知識庫圖譜面板元件
 * @description 使用 @antv/g6 v5 力導向圖視覺化知識圖譜節點與關聯
 * @lastUpdate  2026-03-25 18:00:00
 * @author      Daniel Chung
 * @version     2.0.1
 */

import { useEffect, useRef } from 'react';
import { Empty, Typography, theme } from 'antd';
import { Graph, NodeEvent, CanvasEvent } from '@antv/g6';
import type { IElementEvent, IPointerEvent } from '@antv/g6';

const { Text } = Typography;

interface KBGraphPanelProps {
  fileId: string;
  onNodeSelect?: (nodeId: string | null) => void;
  onGraphReady?: (graph: Graph) => void;
}

export default function KBGraphPanel({ fileId, onNodeSelect, onGraphReady }: KBGraphPanelProps) {
  const { token } = theme.useToken();
  const containerRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<Graph | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    graphRef.current?.destroy();
    graphRef.current = null;

    const graph = new Graph({
      container: containerRef.current,
      autoResize: true,
      data: { nodes: [], edges: [] },
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
      onGraphReady?.(graph);
    });

    graphRef.current = graph;

    return () => {
      graphRef.current = null;
      graph.destroy();
    };
  }, [fileId, onNodeSelect, onGraphReady, token]);

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
      <div style={{
        position: 'absolute', inset: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 10, pointerEvents: 'none',
      }}>
        <Empty
          description={
            <Text style={{ color: token.colorTextSecondary }}>
              圖譜待生成（請等待後端向量化工序完成）
            </Text>
          }
          image={Empty.PRESENTED_IMAGE_SIMPLE}
        />
      </div>
    </div>
  );
}
