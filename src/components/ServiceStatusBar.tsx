/**
 * @file        ServiceStatusBar
 * @description Header 服務燈號列：每 30 秒透過 API Gateway 偵測各後端服務狀態，
 *              綠燈正常、黃燈延遲（>1s）、紅燈無回應，Tooltip 顯示服務名與延遲
 * @lastUpdate  2026-03-24 17:13:58
 * @author      Daniel Chung
 * @version     1.1.0
 */

import { useState, useEffect, useCallback } from 'react';
import { Tooltip } from 'antd';
import { servicesApi, ServiceStatus } from '../services/api';

type LightColor = 'green' | 'yellow' | 'red';

interface ServiceLight {
  name: string;
  displayName: string;
  color: LightColor;
  latencyMs: number | null;
  lastCheck: string | null;
}

function statusToColor(status: ServiceStatus, latencyMs: number | null): LightColor {
  if (status === 'stopped' || status === 'error') return 'red';
  if (status === 'starting' || status === 'stopping') return 'yellow';
  if (latencyMs !== null && latencyMs > 1000) return 'yellow';
  return 'green';
}

const HEARTBEAT_INTERVAL_MS = 30_000;

const COLOR_HEX: Record<LightColor, string> = {
  green:  '#52c41a',
  yellow: '#faad14',
  red:    '#ff4d4f',
};

const COLOR_LABEL: Record<LightColor, string> = {
  green:  '正常',
  yellow: '延遲',
  red:    '異常',
};

interface Props {
  textColor?: string;
}

export default function ServiceStatusBar({ textColor = '#f1f5f9' }: Props) {
  const [lights, setLights] = useState<ServiceLight[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchStatuses = useCallback(async () => {
    try {
      const res = await servicesApi.list();
      const services = res.data.services ?? [];

      setLights(
        services.map((svc) => ({
          name:        svc.name,
          displayName: svc.display_name,
          color:       statusToColor(svc.status, svc.latency_ms ?? null),
          latencyMs:   svc.latency_ms ?? null,
          lastCheck:   new Date().toLocaleTimeString(),
        }))
      );
    } catch {
      setLights([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchStatuses();
    const timer = setInterval(() => void fetchStatuses(), HEARTBEAT_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [fetchStatuses]);

  if (loading || lights.length === 0) return null;

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      {lights.map((light) => (
        <Tooltip
          key={light.name}
          title={
            <div style={{ fontSize: 12, lineHeight: 1.6 }}>
              <div><strong>{light.displayName}</strong></div>
              <div>狀態：{COLOR_LABEL[light.color]}</div>
              {light.latencyMs !== null && <div>延遲：{light.latencyMs} ms</div>}
              {light.lastCheck && <div>最後檢查：{light.lastCheck}</div>}
            </div>
          }
          placement="bottom"
        >
          <span
            style={{
              display:         'inline-block',
              width:           10,
              height:          10,
              borderRadius:    '50%',
              backgroundColor: COLOR_HEX[light.color],
              boxShadow:       `0 0 4px ${COLOR_HEX[light.color]}`,
              cursor:          'default',
              flexShrink:      0,
            }}
          />
        </Tooltip>
      ))}
      <span style={{ color: textColor, fontSize: 12, opacity: 0.6 }}>
        服務狀態
      </span>
    </div>
  );
}
