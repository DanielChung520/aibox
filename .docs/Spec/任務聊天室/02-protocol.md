---
lastUpdate: 2026-03-27 10:12:43
author: Prometheus (AI Planning Agent)
version: 1.0.0
status: 正式版
parent: 00-index.md
---

# 02 — 通訊協議設計

> **前置閱讀**: [00-index.md](./00-index.md)、[01-architecture.md](./01-architecture.md)  
> **本文件涵蓋**: 協議層級、16 種 SSE 事件定義、WebSocket 訊息格式、Handoff Protocol v2.0 整合、必要 HTTP Headers

---

## 2.1 協議層級

```
┌─────────────────────────────────────────────────┐
│ Level 3: 業務協議                                │
│ Handoff Protocol v2.0 (TASK_HANDOVER, etc.)     │
├─────────────────────────────────────────────────┤
│ Level 2: 串流協議                                │
│ SSE Events (chat_chunk, tool_call, bpa_ask, ..) │
├─────────────────────────────────────────────────┤
│ Level 1: 傳輸協議                                │
│ HTTP/1.1 (REST + SSE) / WebSocket (輔助)        │
└─────────────────────────────────────────────────┘
```

---

## 2.2 SSE 事件類型定義（Level 2）

所有 SSE 事件透過 `/api/v1/sse/chat/{session_id}` 推送，格式遵循 W3C SSE 標準。

| 事件類型 (event) | 用途 | 方向 | 觸發時機 |
|------------------|------|------|----------|
| `chat_chunk` | LLM 文字串流片段 | Server→Client | LLM 逐 token 生成 |
| `chat_complete` | 回應完成 | Server→Client | LLM 完成生成 |
| `intent_detected` | 意圖分類結果 | Server→Client | 意圖分類完成 |
| `tool_call_start` | 工具調用開始 | Server→Client | 進入 tool_executor 節點 |
| `tool_call_result` | 工具調用結果 | Server→Client | 工具執行完成 |
| `bpa_step_start` | BPA 步驟開始 | Server→Client | BPA 開始執行步驟 |
| `bpa_step_complete` | BPA 步驟完成 | Server→Client | BPA 步驟完成 |
| `bpa_ask_user` | BPA 請求使用者輸入 | Server→Client | BPA 需要使用者回覆 |
| `bpa_complete` | BPA 任務完成 | Server→Client | BPA 回傳 TASK_COMPLETE |
| `bpa_failed` | BPA 任務失敗 | Server→Client | BPA 回傳 TASK_FAILED |
| `da_query_start` | DA 查詢開始 | Server→Client | 進入 da_query 節點 |
| `da_query_result` | DA 查詢結果 | Server→Client | DA 回傳結果 |
| `ka_search_result` | KA 檢索結果 | Server→Client | KA 回傳知識片段 |
| `error` | 錯誤事件 | Server→Client | 任何階段發生錯誤 |
| `heartbeat` | 心跳保活 | Server→Client | 每 30 秒 |
| `session_state` | 會話狀態更新 | Server→Client | 狀態變更時 |

### SSE 事件格式範例

```
event: chat_chunk
id: evt_abc123
data: {"session_id":"ses_001","message_id":"msg_001","content":"你好","node":"chat_responder","timestamp":"2026-03-27T10:00:00Z"}

event: intent_detected
id: evt_abc124
data: {"session_id":"ses_001","intent":"data_query","confidence":0.95,"method":"llm","entities":{"table":"purchase_orders","date_range":"本月"}}

event: tool_call_start
id: evt_abc125
data: {"session_id":"ses_001","tool":"calculator","parameters":{"expression":"1500*0.05"},"trace_id":"tr_xyz"}

event: tool_call_result
id: evt_abc126
data: {"session_id":"ses_001","tool":"calculator","success":true,"result":75.0,"duration_ms":12}

event: bpa_ask_user
id: evt_abc127
data: {"session_id":"ses_001","ask":{"question":"請選擇要查詢的倉庫","input_type":"select","options":[{"id":"wh01","label":"台北倉"},{"id":"wh02","label":"高雄倉"}],"required":true,"timeout_seconds":300,"default_value":"wh01"},"task_status":{"current_step":"query_inventory","progress":0.4},"checkpoint_version":3}

event: bpa_complete
id: evt_abc128
data: {"session_id":"ses_001","result":{"summary":"物料盤點完成","tasks":[{"id":"t1","description":"查詢庫存","status":"completed","result":"共 156 筆"}],"execution_summary":{"total_duration_seconds":45,"llm_calls":3,"tool_calls":2,"tokens_used":1200}},"checkpoint_version":5}

event: error
id: evt_abc129
data: {"session_id":"ses_001","code":"TOP_INTENT_CLASSIFY_FAILED","message":"意圖分類失敗","details":{"trace_id":"tr_xyz"},"can_retry":true}

event: heartbeat
id: evt_abc130
data: {"timestamp":"2026-03-27T10:00:30Z","session_id":"ses_001"}
```

---

## 2.3 WebSocket 訊息格式（輔助通道）

WebSocket 僅在 BPA 多輪互動需要即時雙向通訊時啟用。端點：`/api/v1/ws/chat`

### Client → Server 訊息

#### user_message 類型

```json
{
  "type": "user_message",
  "session_id": "ses_001",
  "message_id": "msg_client_001",
  "content": "選擇台北倉",
  "reply_to": "evt_abc127",
  "state_version": 3,
  "context_delta": {
    "new_entities": {"warehouse": {"value": "wh01", "label": "台北倉"}},
    "updated_preferences": {}
  },
  "timestamp": "2026-03-27T10:01:00Z"
}
```

#### control 類型

```json
{
  "type": "control",
  "session_id": "ses_001",
  "action": "cancel | pause | resume",
  "reason": "使用者取消",
  "timestamp": "2026-03-27T10:01:30Z"
}
```

### Server → Client 訊息

WebSocket Server 推送格式與 SSE 事件 data 欄位相同，外加 `type` 包裝：

```json
{
  "type": "bpa_ask_user",
  "data": { /* 同 SSE bpa_ask_user data */ }
}
```

---

## 2.4 Handoff Protocol v2.0 整合（Level 3）

此規格完整遵循現有 Top Orchestrator 規格 v2 的 Handoff Protocol。以下列出與 Task Chat Room 直接相關的訊息類型：

| 訊息類型 | 方向 | 用途 | 對應 SSE 事件 |
|----------|------|------|---------------|
| `TASK_HANDOVER` | Top→BPA | 任務交接 | `bpa_step_start` |
| `USER_MESSAGE` | Top→BPA | 使用者回覆 | — (HTTP POST) |
| `BPA_RESPONSE` | BPA→Top | 一般回應 | `chat_chunk` |
| `BPA_ASK_USER` | BPA→Top | 請求使用者輸入 | `bpa_ask_user` |
| `TASK_COMPLETE` | BPA→Top | 任務完成 | `bpa_complete` |
| `TASK_FAILED` | BPA→Top | 任務失敗 | `bpa_failed` |
| `TASK_CANCEL` | Top→BPA | 取消任務 | — (HTTP POST) |
| `TASK_PAUSE` | Top→BPA | 暫停任務 | — (HTTP POST) |
| `TASK_RESUME` | Top→BPA | 恢復任務 | — (HTTP POST) |

### 必填訊息信封欄位（所有 Handoff v2.0 訊息）

```json
{
  "schema_version": "2.0",
  "message_id": "msg_<uuid>",
  "correlation_id": "corr_<uuid>",
  "session_id": "ses_<uuid>",
  "user_id": "u_<user_key>",
  "timestamp": "2026-03-27T10:00:00Z",
  "type": "TASK_HANDOVER | USER_MESSAGE | BPA_ASK_USER | ..."
}
```

> **完整 Handoff 規格**: 見 `.docs/Spec/後台/top-orchestrator-spec-v2.md`

---

## 2.5 必要 HTTP Headers

所有內部服務間通訊必須包含以下 headers：

| Header | 說明 | 範例 |
|--------|------|------|
| `Authorization` | JWT Bearer Token | `Bearer eyJhbG...` |
| `X-Trace-Id` | 分散式追蹤 ID | `tr_a1b2c3d4` |
| `X-Session-Id` | 會話 ID | `ses_001` |
| `X-Handoff-Schema-Version` | Handoff 協議版本 | `2.0` |
| `Content-Type` | 內容類型 | `application/json` |
