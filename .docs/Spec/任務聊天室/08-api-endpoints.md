---
lastUpdate: 2026-03-27 10:17:47
author: Prometheus (AI Planning Agent)
version: 1.0.0
status: 正式版
parent: 00-index.md
---

# 08 — API 端點規格

> **前置閱讀**: [00-index.md](./00-index.md)、[01-architecture.md](./01-architecture.md)  
> **本文件涵蓋**: 12 個新增 Gateway 端點、7 個 Top Orchestrator 端點、詳細 Request/Response 格式、SSE 端點修改、4 個現有端點修改清單、前端 chatApi TypeScript 定義  
> **遵循規範**: `.docs/Spec/API Specification.md` 通用回應格式

---

## 8.1 新增端點總覽

> 所有端點皆需 JWT 認證（除非另行標註）。遵循 `.docs/Spec/API Specification.md` 通用回應格式。

### Rust API Gateway 新增端點

| 方法 | 端點 | 說明 | 認證 |
|------|------|------|------|
| POST | `/api/v1/chat/sessions` | 建立新會話 | 是 |
| GET | `/api/v1/chat/sessions` | 取得會話列表 | 是 |
| GET | `/api/v1/chat/sessions/:id` | 取得會話詳情（含訊息） | 是 |
| DELETE | `/api/v1/chat/sessions/:id` | 刪除（軟刪除）會話 | 是 |
| PATCH | `/api/v1/chat/sessions/:id` | 更新會話（標題、狀態） | 是 |
| POST | `/api/v1/chat/send` | 發送聊天訊息（Path A） | 是 |
| POST | `/api/v1/chat/bpa/start` | 啟動 BPA 工作流（Path B） | 是 |
| POST | `/api/v1/chat/bpa/:taskId/reply` | 回覆 BPA 提問 | 是 |
| POST | `/api/v1/chat/bpa/:taskId/cancel` | 取消 BPA 任務 | 是 |
| POST | `/api/v1/chat/bpa/:taskId/pause` | 暫停 BPA 任務 | 是 |
| POST | `/api/v1/chat/bpa/:taskId/resume` | 恢復 BPA 任務 | 是 |
| GET | `/api/v1/sse/chat/:contextId` | SSE 聊天串流（修改現有） | 是 |

### Top Orchestrator 新增端點 (port 8001)

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/chat` | 接收聊天訊息，啟動 LangGraph |
| POST | `/bpa/handover` | 接收 TASK_HANDOVER，轉發 BPA |
| POST | `/bpa/reply` | 接收 USER_MESSAGE，轉發 BPA |
| POST | `/bpa/control` | BPA 控制操作（cancel/pause/resume） |
| GET | `/tools` | 取得可用工具清單 |
| POST | `/tools/refresh` | 刷新工具註冊表 |
| GET | `/health` | 健康檢查 |

---

## 8.2 端點詳細規格

### 8.2.1 POST /api/v1/chat/sessions

建立新的聊天會話。

**Request**:
```json
{
  "mode": "open_chat",
  "title": "新對話",
  "bpa_agent_id": null
}
```

**Response** (200):
```json
{
  "code": 0,
  "data": {
    "session_id": "ses_a1b2c3d4",
    "context_id": "ctx_x1y2z3",
    "mode": "open_chat",
    "created_at": "2026-03-27T10:00:00Z"
  }
}
```

**說明**：
- `context_id` 用於建立 SSE 連線
- Gateway 在 ArangoDB 建立 `chat_sessions` 記錄
- 同時呼叫 Top Orchestrator 初始化 LangGraph thread

### 8.2.2 GET /api/v1/chat/sessions

取得使用者的會話列表（分頁）。

**Query Parameters**:

| 參數 | 類型 | 預設 | 說明 |
|------|------|------|------|
| `page` | int | 1 | 頁碼 |
| `page_size` | int | 20 | 每頁數量 |
| `status` | string | "active" | 篩選狀態 |
| `mode` | string | null | 篩選模式 |

**Response** (200):
```json
{
  "code": 0,
  "data": {
    "sessions": [
      {
        "session_id": "ses_a1b2c3d4",
        "title": "物料查詢",
        "mode": "open_chat",
        "status": "active",
        "message_count": 12,
        "last_message_at": "2026-03-27T10:30:00Z",
        "summary": "查詢了 A 倉庫螺絲庫存...",
        "created_at": "2026-03-27T10:00:00Z"
      }
    ],
    "total": 45,
    "page": 1,
    "page_size": 20
  }
}
```

### 8.2.3 GET /api/v1/chat/sessions/:id

取得會話詳情，包含完整訊息列表。

**Query Parameters**:

| 參數 | 類型 | 預設 | 說明 |
|------|------|------|------|
| `message_limit` | int | 50 | 載入訊息數量上限 |
| `before` | string | null | 分頁游標（載入更早的訊息） |

**Response** (200):
```json
{
  "code": 0,
  "data": {
    "session": {
      "session_id": "ses_a1b2c3d4",
      "title": "物料查詢",
      "mode": "open_chat",
      "status": "active",
      "context_id": "ctx_x1y2z3",
      "metadata": { "reply_mode": "auto", "total_tokens": 4500 }
    },
    "messages": [
      {
        "id": "msg_001",
        "role": "user",
        "content": "查詢 A 倉庫的螺絲庫存",
        "message_type": "user_message",
        "created_at": "2026-03-27T10:05:00Z"
      },
      {
        "id": "msg_002",
        "role": "assistant",
        "content": "根據查詢結果，A 倉庫目前有...",
        "message_type": "ai_response",
        "tool_calls": [],
        "sources": [],
        "created_at": "2026-03-27T10:05:03Z"
      }
    ],
    "has_more": false
  }
}
```

### 8.2.4 POST /api/v1/chat/send

發送聊天訊息（Path A 核心端點）。

**Request**:
```json
{
  "session_id": "ses_a1b2c3d4",
  "message": "上個月 A 倉庫的螺絲出貨量是多少？",
  "reply_mode": "auto",
  "context_id": "ctx_x1y2z3"
}
```

**Response** (202 Accepted):
```json
{
  "code": 0,
  "data": {
    "message_id": "msg_003",
    "context_id": "ctx_x1y2z3",
    "status": "processing"
  }
}
```

**說明**：
- 回應 202（非 200），表示訊息已接受但處理尚未完成
- 實際回應透過 SSE `/api/v1/sse/chat/{context_id}` 串流傳送
- Gateway 收到請求後：
  1. 寫入 `chat_messages` (role: user)
  2. 轉發至 Top Orchestrator `POST /chat`
  3. Top Orchestrator 啟動 LangGraph，透過 SSE 回傳結果

### 8.2.5 POST /api/v1/chat/bpa/start

啟動 BPA 工作流（Path B 核心端點）。

**Request**:
```json
{
  "session_id": "ses_b1c2d3e4",
  "agent_id": "agents/mm_agent_001",
  "user_input": "查詢本月所有低於安全庫存的物料",
  "context": {
    "warehouse": "A",
    "date_range": "2026-03"
  }
}
```

**Response** (202 Accepted):
```json
{
  "code": 0,
  "data": {
    "task_id": "task_uuid_001",
    "context_id": "ctx_y1z2a3",
    "agent_name": "物料管理代理",
    "status": "started"
  }
}
```

**說明**：
- Gateway 建構 TASK_HANDOVER 訊息（[04-path-b-bpa-workflow.md](./04-path-b-bpa-workflow.md) §4.3 格式）
- 轉發至 Top Orchestrator `POST /bpa/handover`
- Top Orchestrator 轉發至對應 BPA service
- BPA 回應透過 SSE 串流

### 8.2.6 POST /api/v1/chat/bpa/:taskId/reply

回覆 BPA 的 `BPA_ASK_USER` 提問。

**Request**:
```json
{
  "session_id": "ses_b1c2d3e4",
  "message": "確認，使用預設的安全庫存計算公式",
  "reply_to_step": "ask_user_confirmation"
}
```

**Response** (202 Accepted):
```json
{
  "code": 0,
  "data": {
    "message_id": "msg_reply_001",
    "status": "processing"
  }
}
```

### 8.2.7 BPA 控制端點

**POST /api/v1/chat/bpa/:taskId/cancel**
```json
// Request
{ "session_id": "ses_b1c2d3e4", "reason": "使用者手動取消" }
// Response (200)
{ "code": 0, "data": { "status": "cancelled" } }
```

**POST /api/v1/chat/bpa/:taskId/pause**
```json
// Request
{ "session_id": "ses_b1c2d3e4" }
// Response (200)
{ "code": 0, "data": { "status": "paused", "checkpoint_version": 3 } }
```

**POST /api/v1/chat/bpa/:taskId/resume**
```json
// Request
{ "session_id": "ses_b1c2d3e4" }
// Response (200)
{ "code": 0, "data": { "status": "resumed" } }
```

---

## 8.3 SSE 端點修改

### GET /api/v1/sse/chat/:contextId（修改現有）

現有 `api/src/api/sse.rs` 的 `chat_stream` 函數需要從模擬數據改為真實代理回應。

**修改重點**：

1. **移除模擬邏輯**：刪除 `tokio::time::sleep` + 固定文字的模擬回應
2. **建立代理連線**：與 Top Orchestrator SSE endpoint 建立反向代理
3. **事件轉發**：Top Orchestrator 的 SSE 事件 → 轉發給前端 EventSource
4. **心跳機制**：每 15 秒發送 `event: heartbeat`

```rust
// 修改前 (模擬)
async fn chat_stream(Path(context_id): Path<String>) -> Sse<impl Stream<Item = ...>> {
    let stream = stream::iter(vec!["模擬回應..."])
        .map(|chunk| Ok(Event::default().event("chunk").data(chunk)));
    Sse::new(stream)
}

// 修改後 (真實代理)
async fn chat_stream(
    Path(context_id): Path<String>,
    State(state): State<AppState>,
) -> Sse<impl Stream<Item = ...>> {
    // 建立與 Top Orchestrator 的 SSE 連線
    // 透過 reqwest 連線至 http://localhost:8001/stream/{context_id}
    // 轉發所有事件給前端
}
```

---

## 8.4 現有端點修改清單

| 端點 | 檔案 | 修改內容 |
|------|------|---------|
| `POST /api/v1/ai/chat` | `api/src/api/ai.rs` | 移除 echo mock，改為轉發至 Top Orchestrator |
| `GET /api/v1/sse/chat/:id` | `api/src/api/sse.rs` | 移除模擬，建立真實 SSE 代理 |
| `forward_bpa` | `api/src/services/ai_proxy.rs` | 端點從 `/start` 改為 `/process` |
| `routes` | `api/src/api/mod.rs` | 新增 chat/bpa 路由群組 |

---

## 8.5 前端 API 層新增

```typescript
// src/services/api.ts — 新增 chatApi

export interface CreateSessionRequest {
  mode: 'open_chat' | 'bpa_workflow';
  title?: string;
  bpa_agent_id?: string;
}

export interface CreateSessionResponse {
  session_id: string;
  context_id: string;
  mode: string;
  created_at: string;
}

export interface SendMessageRequest {
  session_id: string;
  message: string;
  reply_mode: 'auto' | 'fast' | 'detail';
  context_id: string;
}

export interface BpaStartRequest {
  session_id: string;
  agent_id: string;
  user_input: string;
  context?: Record<string, unknown>;
}

export const chatApi = {
  // === 會話管理 ===
  createSession: (data: CreateSessionRequest) =>
    api.post<{ code: number; data: CreateSessionResponse }>('/api/v1/chat/sessions', data),
  
  listSessions: (params?: { page?: number; page_size?: number; status?: string }) =>
    api.get<{ code: number; data: { sessions: any[]; total: number } }>('/api/v1/chat/sessions', { params }),
  
  getSession: (id: string, params?: { message_limit?: number; before?: string }) =>
    api.get<{ code: number; data: any }>(`/api/v1/chat/sessions/${id}`, { params }),
  
  deleteSession: (id: string) =>
    api.delete(`/api/v1/chat/sessions/${id}`),
  
  updateSession: (id: string, data: { title?: string; status?: string }) =>
    api.patch(`/api/v1/chat/sessions/${id}`, data),
  
  // === Path A: 開放聊天 ===
  sendMessage: (data: SendMessageRequest) =>
    api.post<{ code: number; data: { message_id: string; context_id: string } }>('/api/v1/chat/send', data),
  
  // === Path B: BPA 工作流 ===
  startBpa: (data: BpaStartRequest) =>
    api.post<{ code: number; data: { task_id: string; context_id: string } }>('/api/v1/chat/bpa/start', data),
  
  replyBpa: (taskId: string, data: { session_id: string; message: string }) =>
    api.post(`/api/v1/chat/bpa/${taskId}/reply`, data),
  
  cancelBpa: (taskId: string, data: { session_id: string; reason?: string }) =>
    api.post(`/api/v1/chat/bpa/${taskId}/cancel`, data),
  
  pauseBpa: (taskId: string, data: { session_id: string }) =>
    api.post(`/api/v1/chat/bpa/${taskId}/pause`, data),
  
  resumeBpa: (taskId: string, data: { session_id: string }) =>
    api.post(`/api/v1/chat/bpa/${taskId}/resume`, data),
};
```

---

> **SSE 事件格式定義**：見 [02-protocol.md](./02-protocol.md) §2.2。  
> **錯誤碼與 HTTP 狀態**：見 [09-error-security.md](./09-error-security.md) §9.1.1。
