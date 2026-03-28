/**
 * @file        Orchestrator Intent API 服務層
 * @description 意圖決策管理 CRUD 接口定義
 * @lastUpdate  2026-03-28 11:27:55
 * @author      Daniel Chung
 * @version     1.0.0
 */

import api from './api';

// ==================== Types ====================

export interface OrchIntentEntry {
  intent_id: string;
  name: string;
  description: string;
  intent_type: 'tool' | 'workflow' | 'fallback';
  tool_name: string;
  nl_examples: string[];
  confidence_threshold: number;
  priority: number;
  status: 'enabled' | 'disabled';
  created_at?: string;
  updated_at?: string;
}

export interface OrchIntentListResponse {
  code: number;
  data: {
    records: OrchIntentEntry[];
    total: number;
    page: number;
    page_size: number;
  };
}

export interface OrchIntentListParams {
  page?: number;
  page_size?: number;
  intent_type?: string;
  status?: string;
  tool_name?: string;
  search?: string;
}

// ==================== API ====================

export const orchestratorApi = {
  listCatalog: (params?: OrchIntentListParams) =>
    api.get<OrchIntentListResponse>('/api/v1/orch/intents/catalog', { params }),

  createIntent: (data: Partial<OrchIntentEntry>) =>
    api.post<{ code: number; data: OrchIntentEntry }>('/api/v1/orch/intents/catalog', data),

  updateIntent: (intentId: string, data: Partial<OrchIntentEntry>) =>
    api.put<{ code: number; data: OrchIntentEntry }>(`/api/v1/orch/intents/catalog/${intentId}`, data),

  deleteIntent: (intentId: string) =>
    api.delete(`/api/v1/orch/intents/catalog/${intentId}`),

  syncToQdrant: (data: { model?: string }) =>
    api.post<{ code: number; data: { synced_count: number; status: string } }>(
      '/api/v1/orch/intents/sync-qdrant',
      data
    ),
};

export default orchestratorApi;
