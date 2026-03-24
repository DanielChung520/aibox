/**
 * @file        Data Agent API 服務層
 * @description DA 的 Schema、Intents、Query 等 API 接口定義
 * @lastUpdate  2026-03-23 21:45:17
 * @author      Daniel Chung
 */

import api from './api';

// ==================== Types ====================

export interface TableInfo {
  table_id: string;
  table_name: string;
  module: 'MM' | 'SD' | 'FI' | 'PP' | 'QM' | 'OTHER';
  description: string;
  s3_path: string;
  primary_keys: string[];
  partition_keys: string[];
  row_count_estimate?: number;
  status: 'enabled' | 'disabled' | 'deprecated';
  version: number;
  created_at: string;
  updated_at: string;
}

export interface FieldInfo {
  table_id: string;
  field_id: string;
  field_name: string;
  field_type: string;
  length?: number;
  scale?: number;
  nullable: boolean;
  description: string;
  business_aliases?: string[];
  is_pk: boolean;
  is_fk: boolean;
  relation_table?: string;
  relation_field?: string;
  status: string;
}

export interface TableRelation {
  relation_id: string;
  left_table: string;
  left_field: string;
  right_table: string;
  right_field: string;
  join_type: 'INNER' | 'LEFT';
  cardinality: '1:1' | '1:N' | 'N:1' | 'N:N';
  confidence: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface QueryRequest {
  query: string;
  session_id?: string;
  user_id?: string;
  options?: {
    timezone?: string;
    limit?: number;
    module_scope?: string[];
    return_debug?: boolean;
  };
}

export interface IntentSummary {
  intent_type: string;
  confidence: number;
}

export interface QueryResponse {
  code: number;
  message?: string;
  data: {
    sql: string;
    results: Record<string, unknown>[];
    columns?: string[];
    metadata: {
      duration_ms: number;
      row_count: number;
      truncated: boolean;
      trace_id: string;
    };
  };
  intent: IntentSummary;
  cache_hit: boolean;
}

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  modified_at: string;
  digest: string;
}

export interface IntentCatalogEntry {
  intent_id: string;
  bpa_domain_intent: string;
  intent_type: string;
  group: string;
  description: string;
  tables?: string[];
  core_fields?: string[];
  nl_examples: string[];
  example_sqls?: string[];
  sql_template: string;
  is_template: boolean;
  generation_strategy: 'template' | 'small_llm' | 'large_llm';
  llm_model?: string;
}

export interface NL2SqlPhaseResult {
  phase: string;
  duration_ms: number;
  success: boolean;
  error?: string;
}

export interface NL2SqlIntentMatch {
  intent_id: string;
  score: number;
  generation_strategy: 'template' | 'small_llm' | 'large_llm';
  sql_template: string;
  tables: string[];
  core_fields: string[];
  description: string;
  intent_type: string;
  group: string;
  nl_examples: string[];
  example_sqls: string[];
}

export interface NL2SqlQueryPlan {
  intent_type: string;
  primary_table: string;
  tables: string[];
  joins: { from_ref: string; to_ref: string; join_type: string }[];
  filters: { field: string; operator: string; value: string }[];
  select_fields: string[];
  aggregations: string[];
  group_by: string[];
  order_by: { field: string; direction: string }[];
  limit: number;
}

export interface NL2SqlValidation {
  is_valid: boolean;
  errors: { layer: number; message: string; severity: string }[];
  warnings: { layer: number; message: string; severity: string }[];
}

export interface NL2SqlExecution {
  sql: string;
  rows: Record<string, unknown>[];
  columns: string[];
  row_count: number;
  execution_time_ms: number;
}

export interface NL2SqlResponse {
  success: boolean;
  query: string;
  matched_intent?: NL2SqlIntentMatch;
  query_plan?: NL2SqlQueryPlan;
  generated_sql: string;
  validation?: NL2SqlValidation;
  execution_result?: NL2SqlExecution;
  error?: string;
  phases: NL2SqlPhaseResult[];
  total_time_ms: number;
}

// ==================== Schema API ====================

export const dataAgentApi = {
  // Schema - Tables
  listTables: () => api.get<{ code: number; data: TableInfo[] }>('/api/v1/da/schema/tables'),
  
  getTable: (tableId: string) => 
    api.get<{ code: number; data: TableInfo }>(`/api/v1/da/schema/tables/${tableId}`),
  
  createTable: (data: Partial<TableInfo>) => 
    api.post('/api/v1/da/schema/tables', data),
  
  updateTable: (tableId: string, data: Partial<TableInfo>) => 
    api.put(`/api/v1/da/schema/tables/${tableId}`, data),
  
  deleteTable: (tableId: string) => 
    api.delete(`/api/v1/da/schema/tables/${tableId}`),

  // Schema - Fields
  listFields: (tableId: string) => 
    api.get<{ code: number; data: FieldInfo[] }>(`/api/v1/da/schema/tables/${tableId}/fields`),
  
  createField: (data: Partial<FieldInfo>) => 
    api.post(`/api/v1/da/schema/tables/${data.table_id}/fields`, data),
  
  updateField: (tableId: string, fieldId: string, data: Partial<FieldInfo>) => 
    api.put(`/api/v1/da/schema/tables/${tableId}/fields/${fieldId}`, data),
  
  deleteField: (tableId: string, fieldId: string) => 
    api.delete(`/api/v1/da/schema/tables/${tableId}/fields/${fieldId}`),

  // Schema - Relations
  listRelations: () => 
    api.get<{ code: number; data: TableRelation[] }>('/api/v1/da/schema/relations'),
  
  createRelation: (data: Partial<TableRelation>) => 
    api.post('/api/v1/da/schema/relations', data),
  
  updateRelation: (relationId: string, data: Partial<TableRelation>) => 
    api.put(`/api/v1/da/schema/relations/${relationId}`, data),
  
  deleteRelation: (relationId: string) => 
    api.delete(`/api/v1/da/schema/relations/${relationId}`),

  // Intents
  listCatalog: (params?: { page?: number; page_size?: number; group?: string; intent_type?: string; search?: string; generation_strategy?: string }) =>
    api.get<{ code: number; data: { records: IntentCatalogEntry[]; total: number; page: number; page_size: number } }>('/api/v1/da/intents/catalog', { params }),

  createIntent: (data: IntentCatalogEntry) =>
    api.post('/api/v1/da/intents/catalog', data),

  updateIntent: (intentId: string, data: IntentCatalogEntry) =>
    api.put(`/api/v1/da/intents/catalog/${intentId}`, data),

  deleteIntent: (intentId: string) => 
    api.delete(`/api/v1/da/intents/catalog/${intentId}`),

  feedbackIntent: (intentId: string, data: { action: 'thumbs_up' | 'thumbs_down'; nl_query: string }) =>
    api.post<{ code: number; data: { action: string; intent_id: string; applied: boolean; nl_added?: string } }>(
      `/api/v1/da/intents/catalog/${intentId}/feedback`, data
    ),

  syncToQdrant: (data: { model?: string }) => {
    return api.post<{ synced_count: number }>('/api/v1/da/intents/sync-qdrant', data);
  },

  // Query
  query: (data: QueryRequest) => {
    return api.post<QueryResponse>('/api/v1/da/query', data);
  },

  // NL→SQL Pipeline
  nl2sql: (data: { natural_language: string }) => {
    return api.post<NL2SqlResponse>('/api/v1/da/query/nl2sql', data);
  },
  
  querySql: (data: { sql: string; params?: unknown[] }) => {
    return api.post<{ code: number; data: unknown }>('/api/v1/da/query/sql', data);
  },

  // Sync
  getSyncStatus: () => {
    return api.get<{ code: number; data: unknown }>('/api/v1/da/sync/status');
  },
  
  triggerSync: () => {
    return api.post<{ code: number; data: unknown }>('/api/v1/da/sync/trigger');
  },

  // Health
  health: () => api.get<{ status: string }>('/api/v1/da/health'),

  // Data Lake Preview
  previewTable: (tableName: string, offset = 0, limit = 20) =>
    api.get<{
      code: number;
      table_name: string;
      table_id: string;
      table_info: TableInfo;
      fields: FieldInfo[];
      rows: Record<string, unknown>[];
      total: number;
      offset: number;
      limit: number;
    }>(`/api/v1/da/query/tables/${tableName}/preview`, { params: { offset, limit } }),
};

export default dataAgentApi;
