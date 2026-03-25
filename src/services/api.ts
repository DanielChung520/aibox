/**
 * @file        API 服務層
 * @description Axios 實例配置、API 請求封裝、所有業務 API 接口定義
 * @lastUpdate  2026-03-25 15:07:58
 * @author      Daniel Chung
 * @version     1.4.0
 * @history
 * - 2026-03-25 15:07:58 | Daniel Chung | 1.4.0 | 新增 activate() 方法到 themeTemplateApi
 * - 2026-03-24 23:01:20 | Daniel Chung | 1.3.0 | 新增 Knowledge Base 介面定義與 API 方法
 * - 2026-03-24 20:58:11 | Daniel Chung | 1.2.0 | 新增 Ontology 介面定義與 API 方法
 * - 2026-03-22 19:11:57 | Daniel Chung | 1.1.0 | 新增 ThemeTemplate 介面定義
 * - 2026-03-17 23:27:55 | Daniel Chung | 1.0.0 | 初始版本
 */

import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? 'http://localhost:3001',
  timeout: 30000,
});

// Add token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle response errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('token');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export interface User {
  _key: string;
  username: string;
  name: string;
  role_keys: string[];
  status: string;
  created_at: string;
}

export interface Role {
  _key: string;
  name: string;
  description: string;
  created_at: string;
}

export interface SystemParam {
  _key: string;
  param_key: string;
  param_value: string;
  param_type: string;
  require_restart: boolean;
  category: string;
}

export interface Function {
  _key: string;
  code: string;
  name: string;
  description: string;
  function_type: 'group' | 'sub_function' | 'tab';
  parent_key: string | null;
  path: string | null;
  icon: string | null;
  sort_order: number;
  status: string;
  created_at: string;
}

export interface LoginRequest {
  username: string;
  password: string;
  remember?: boolean;
}

export interface LoginResponse {
  token: string;
  user: {
    _key: string;
    username: string;
    name: string;
    role_key: string;
    role_name: string;
  };
}

export const authApi = {
  login: (data: LoginRequest) => api.post<{ code: number; message: string; data: LoginResponse }>('/api/v1/auth/login', data),
  logout: () => api.post('/api/v1/auth/logout'),
  me: () => api.get<{ code: number; data: LoginResponse['user'] }>('/api/v1/auth/me'),
};

export const userApi = {
  list: () => api.get<{ code: number; data: User[] }>('/api/v1/users'),
  get: (key: string) => api.get<{ code: number; data: User }>(`/api/v1/users/${key}`),
  create: (data: Partial<User> & { password_hash: string }) => api.post('/api/v1/users', data),
  update: (key: string, data: Partial<User>) => api.put(`/api/v1/users/${key}`, data),
  delete: (key: string) => api.delete(`/api/v1/users/${key}`),
  resetPassword: (key: string, password: string) => api.post(`/api/v1/users/${key}/reset-password`, { password }),
};

export const roleApi = {
  list: () => api.get<{ code: number; data: Role[] }>('/api/v1/roles'),
  get: (key: string) => api.get<{ code: number; data: Role }>(`/api/v1/roles/${key}`),
  create: (data: Partial<Role>) => api.post('/api/v1/roles', data),
  update: (key: string, data: Partial<Role>) => api.put(`/api/v1/roles/${key}`, data),
  delete: (key: string) => api.delete(`/api/v1/roles/${key}`),
};

export const paramsApi = {
  list: () => api.get<{ code: number; data: SystemParam[] }>('/api/v1/system-params'),
  get: (key: string) => api.get<{ code: number; data: SystemParam }>(`/api/v1/system-params/${key}`),
  update: (key: string, param_value: string) => api.put(`/api/v1/system-params/${key}`, { param_value }),
};

export interface FunctionRoleAuth {
  function_key: string;
  role_keys: string[];
  inherited_role_keys: string[];
}

export interface Agent {
  _key?: string;
  name: string;
  description?: string;
  icon?: string;
  status?: 'online' | 'maintenance' | 'deprecated' | 'registering';
  usage_count?: number;
  group_key: string;
  agent_type?: 'knowledge' | 'data' | 'bpa' | 'tool';
  source?: 'local' | 'third_party';
  endpoint_url?: string;
  api_key?: string;
  auth_type?: 'none' | 'bearer' | 'basic' | 'oauth2';
  llm_model?: string;
  temperature?: number;
  max_tokens?: number;
  system_prompt?: string;
  knowledge_bases?: string[];
  data_sources?: string[];
  tools?: string[];
  opening_lines?: string[];
  capabilities?: string[];
  is_favorite?: boolean;
  visibility?: 'public' | 'private' | 'role';
  visibility_roles?: string[];
  created_by?: string;
  updated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export const agentApi = {
  list: (agentType?: string) => {
    const url = agentType ? `/api/v1/agents?agent_type=${agentType}` : '/api/v1/agents';
    return api.get<{ code: number; data: Agent[] }>(url);
  },
  get: (key: string) => api.get<{ code: number; data: Agent }>(`/api/v1/agents/${key}`),
  create: (data: Partial<Agent>) => api.post('/api/v1/agents', data),
  update: (key: string, data: Partial<Agent>) => api.put(`/api/v1/agents/${key}`, data),
  delete: (key: string) => api.delete(`/api/v1/agents/${key}`),
  toggleFavorite: (key: string) => api.patch<{ code: number; data: Agent }>(`/api/v1/agents/${key}/favorite`, {}),
};

export const functionApi = {
  list: () => api.get<{ code: number; data: Function[] }>('/api/v1/functions'),
  get: (key: string) => api.get<{ code: number; data: Function }>(`/api/v1/functions/${key}`),
  create: (data: Partial<Function>) => api.post('/api/v1/functions', data),
  update: (key: string, data: Partial<Function>) => api.put(`/api/v1/functions/${key}`, data),
  delete: (key: string) => api.delete(`/api/v1/functions/${key}`),
  getRoles: (key: string) => api.get<{ code: number; data: FunctionRoleAuth }>(`/api/v1/functions/${key}/roles`),
  setRoles: (key: string, role_keys: string[], inherited_role_keys: string[] = []) => 
    api.put(`/api/v1/functions/${key}/roles`, { function_key: key, role_keys, inherited_role_keys }),
  getAuthorized: () => api.get<{ code: number; data: Function[] }>('/api/v1/auth/functions'),
};

export interface LLMModel {
  model_id: string;
  name: string;
  display_name?: string;
  context_window?: number;
  input_cost_per_1k?: number;
  output_cost_per_1k?: number;
  supports_vision?: boolean;
  status?: string;
}

export interface ModelProvider {
  _key: string;
  code: string;
  name: string;
  description?: string;
  icon?: string;
  base_url: string;
  api_key?: string;
  status: string;
  sort_order: number;
  models: LLMModel[];
  created_at: string;
  updated_at: string;
}

export const modelProviderApi = {
  list: () => api.get<{ code: number; data: ModelProvider[] }>('/api/v1/model-providers'),
  get: (key: string) => api.get<{ code: number; data: ModelProvider }>(`/api/v1/model-providers/${key}`),
  create: (data: Partial<ModelProvider>) => api.post('/api/v1/model-providers', data),
  update: (key: string, data: Partial<ModelProvider>) => api.put(`/api/v1/model-providers/${key}`, data),
  delete: (key: string) => api.delete(`/api/v1/model-providers/${key}`),
  sync: (key: string) => api.post(`/api/v1/model-providers/${key}/sync`),
};

export interface ShellTokens {
  siderBg: string;
  headerBg: string;
  menuItemColor: string;
  menuItemHoverBg: string;
  menuItemSelectedBg: string;
  menuItemSelectedColor: string;
  logoColor: string;
  siderBorder: string;
  headerShadow: string;
  siderShadow: string;
}

export interface ContentTokens {
  colorPrimary: string;
  colorSuccess: string;
  colorWarning: string;
  colorError: string;
  colorInfo: string;
  colorBgBase: string;
  colorTextBase: string;
  pageBg: string;
  contentBg: string;
  containerBg: string;
  borderRadius: number;
  fontFamily: string;
  boxShadow: string;
  boxShadowSecondary: string;
  tableExpandedRowBg: string;
  tableHeaderBg: string;
  tableRowHoverBg: string;
  chatInputBg: string;
  chatUserBubble: string;
  chatAssistantBubble: string;
  textSecondary: string;
  iconDefault: string;
  iconHover: string;
  btnClear: string;
  btnClearHover: string;
  btnSend: string;
  btnSendHover: string;
  btnText: string;
  cardShadow: string;
  cardShadowHover: string;
  tableShadow: string;
  bgOpacity: number;
}

export interface ThemeTemplate {
  _key: string;
  name: string;
  description: string;
  template_type: 'shell' | 'content';
  tokens: ShellTokens | ContentTokens;
  is_default: boolean;
  is_active?: boolean;
  status: string;
  created_at: string;
  updated_at: string;
}

export const themeTemplateApi = {
  list: () => api.get<{ code: number; data: ThemeTemplate[] }>('/api/v1/theme-templates'),
  get: (key: string) => api.get<{ code: number; data: ThemeTemplate }>(`/api/v1/theme-templates/${key}`),
  create: (data: Partial<ThemeTemplate>) => api.post('/api/v1/theme-templates', data),
  update: (key: string, data: Partial<ThemeTemplate>) => api.put(`/api/v1/theme-templates/${key}`, data),
  delete: (key: string) => api.delete(`/api/v1/theme-templates/${key}`),
  activate: (key: string) => api.put<{ code: number; message: string }>(`/api/v1/theme-templates/${key}/activate`, {}),
};

// ===== Ontology (知識本體) =====

export interface EntityClass {
  name: string;
  base_class: string;
  description: string;
}

export interface ObjectProperty {
  name: string;
  description: string;
  domain: string[];
  range: string[];
}

export type OntologyLayer = 'basic' | 'domain' | 'major';

export interface OntologyMetadata {
  domain_owner?: string;
  domain?: string;
  major_owner?: string;
  data_classification?: string;
  intended_usage?: string[];
}

export interface Ontology {
  _key: string;
  type: OntologyLayer;
  name: string;
  version: string;
  default_version: boolean;
  ontology_name: string;
  description: string;
  author: string;
  last_modified: string;
  inherits_from: string[];
  compatible_domains?: string[];
  tags: string[];
  use_cases: string[];
  entity_classes: EntityClass[];
  object_properties: ObjectProperty[];
  metadata: OntologyMetadata;
  status?: string;
}

export const ontologyApi = {
  list: (layer?: OntologyLayer) =>
    api.get<{ code: number; data: Ontology[] }>('/api/v1/ontologies', { params: layer ? { type: layer } : {} }),
  get: (key: string) =>
    api.get<{ code: number; data: Ontology }>(`/api/v1/ontologies/${key}`),
  create: (data: Partial<Ontology>) =>
    api.post('/api/v1/ontologies', data),
  importOntology: (data: Partial<Ontology>) =>
    api.post('/api/v1/ontologies/import', data),
  update: (key: string, data: Partial<Ontology>) =>
    api.put(`/api/v1/ontologies/${key}`, data),
  delete: (key: string) =>
    api.delete(`/api/v1/ontologies/${key}`),
};

// ===== Services =====

export type ServiceStatus = 'running' | 'stopped' | 'starting' | 'stopping' | 'error';

export interface ServiceInfo {
  name: string;
  display_name: string;
  status: ServiceStatus;
  port: number;
  url: string;
  health_url: string | null;
  last_check: string | null;
  latency_ms: number | null;
}

export interface ServiceListResponse {
  services: ServiceInfo[];
}

export const servicesApi = {
  list: () => api.get<ServiceListResponse>('/api/v1/services'),
  get: (name: string) => api.get<{ service: ServiceInfo }>(`/api/v1/services/${name}`),
};

// ===== Knowledge Base (知識庫) =====

export interface KnowledgeRoot {
  _key: string;
  name: string;
  description?: string;
  ontology_domain: string;
  ontology_majors: string[];
  tags: string[];
  source_count: number;
  vector_status: 'pending' | 'processing' | 'completed' | 'failed';
  graph_status: 'pending' | 'processing' | 'completed' | 'failed';
  is_favorite: boolean;
  created_at: string;
}

export interface KnowledgeFile {
  _key: string;
  filename: string;
  file_size: number;
  file_type: string;
  upload_time: string;
  vector_status: 'pending' | 'processing' | 'completed' | 'failed';
  graph_status: 'pending' | 'processing' | 'completed' | 'failed';
  knowledge_root_id: string;
}

export interface VectorChunk {
  chunk_id: string;
  text: string;
  vector_preview: number[];
  metadata: Record<string, string>;
}

export interface GraphNode {
  id: string;
  label: string;
  type: string;
  properties: Record<string, string>;
}

export interface GraphEdge {
  source: string;
  target: string;
  label: string;
}

export interface KnowledgeRoleAuth {
  root_key: string;
  role_keys: string[];
  inherited_role_keys: string[];
}

interface ApiResponse<T> { code: number; data: T }
interface ApiMessage { code: number; message: string }

export const knowledgeApi = {
  listRoots: (params?: { search?: string; is_favorite?: boolean }) =>
    api.get<ApiResponse<KnowledgeRoot[]>>('/api/v1/knowledge/roots', { params }),
  createRoot: (data: Partial<KnowledgeRoot>) =>
    api.post<ApiResponse<{ _key: string }>>('/api/v1/knowledge/roots', data),
  getRoot: (id: string) =>
    api.get<ApiResponse<KnowledgeRoot>>(`/api/v1/knowledge/roots/${id}`),
  updateRoot: (id: string, data: Partial<KnowledgeRoot>) =>
    api.put<ApiMessage>(`/api/v1/knowledge/roots/${id}`, data),
  deleteRoot: (id: string) =>
    api.delete<ApiMessage>(`/api/v1/knowledge/roots/${id}`),
  copyRoot: (id: string) =>
    api.post<ApiResponse<{ _key: string }>>(`/api/v1/knowledge/roots/${id}/copy`),
  toggleFavorite: (id: string) =>
    api.patch<ApiResponse<{ is_favorite: boolean }>>(`/api/v1/knowledge/roots/${id}/favorite`),
  listFiles: (rootId: string) =>
    api.get<ApiResponse<KnowledgeFile[]>>(`/api/v1/knowledge/roots/${rootId}/files`),
  uploadFile: (rootId: string, formData: FormData) =>
    api.post<ApiResponse<{ fileId: string }>>(`/api/v1/knowledge/roots/${rootId}/files/upload`, formData),
  getFile: (fileId: string) =>
    api.get<ApiResponse<KnowledgeFile>>(`/api/v1/knowledge/files/${fileId}`),
  deleteFile: (fileId: string) =>
    api.delete<ApiMessage>(`/api/v1/knowledge/files/${fileId}`),
  getPreview: (fileId: string) =>
    api.get<ApiResponse<{ content: string; type: string }>>(`/api/v1/knowledge/files/${fileId}/preview`),
  getVectors: (fileId: string, params: { limit: number; offset: number }) =>
    api.get<ApiResponse<{ chunks: VectorChunk[]; total: number }>>(`/api/v1/knowledge/files/${fileId}/vectors`, { params }),
  getGraph: (fileId: string) =>
    api.get<ApiResponse<{ nodes: GraphNode[]; edges: GraphEdge[] }>>(`/api/v1/knowledge/files/${fileId}/graph`),
  getRoles: (rootId: string) =>
    api.get<ApiResponse<KnowledgeRoleAuth>>(`/api/v1/knowledge/roots/${rootId}/roles`),
  setRoles: (rootId: string, role_keys: string[], inherited_role_keys: string[]) =>
    api.put<ApiMessage>(`/api/v1/knowledge/roots/${rootId}/roles`, { role_keys, inherited_role_keys }),
};

export default api;
