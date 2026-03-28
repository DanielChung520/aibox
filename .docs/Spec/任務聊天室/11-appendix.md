---
lastUpdate: 2026-03-27 10:27:55
author: Prometheus (AI Planning Agent)
version: 1.0.0
status: 正式版
parent: 00-index.md
---

# 11 — 附錄

> 完整 SSE 對話範例、配置參數彙總、檔案修改清單、術語對照表。

---

## 11.1 完整 SSE 對話範例（Path A）

以下是一個完整的 Path A 對話流程，包含意圖分類、工具調用、串流回應：

```
使用者: "上個月 A 倉庫的螺絲出貨量是多少？"

──── 前端 ────

POST /api/v1/chat/send
{
  "session_id": "ses_001",
  "message": "上個月 A 倉庫的螺絲出貨量是多少？",
  "reply_mode": "auto",
  "context_id": "ctx_001"
}

← 202 { "message_id": "msg_003", "context_id": "ctx_001", "status": "processing" }

──── SSE /api/v1/sse/chat/ctx_001 ────

event: intent
data: {"intent":"data_query","confidence":0.95,"message_id":"msg_003"}

event: thinking
data: {"content":"分析使用者需要查詢庫存出貨數據，將調用 Data Agent...","message_id":"msg_003"}

event: tool_call
data: {"tool_name":"da_query","tool_id":"call_001","arguments":{"question":"上個月 A 倉庫的螺絲出貨量"}}

event: tool_result
data: {
  "tool_id": "call_001",
  "tool_name": "da_query",
  "success": true,
  "result": "{\"sql\":\"SELECT SUM(quantity) FROM shipments WHERE warehouse='A' AND item LIKE '%螺絲%' AND ship_date >= '2026-02-01' AND ship_date < '2026-03-01'\",\"results\":[{\"total\":15420}],\"metadata\":{\"row_count\":1}}",
  "duration_ms": 450
}

event: chunk
data: {"content":"根據","message_id":"msg_004"}

event: chunk
data: {"content":"查詢結果，","message_id":"msg_004"}

event: chunk
data: {"content":"上個月（2026年2月）","message_id":"msg_004"}

event: chunk
data: {"content":"A 倉庫的螺絲出貨量為 **15,420** 件。","message_id":"msg_004"}

event: chunk
data: {"content":"\n\n查詢 SQL:\n```sql\nSELECT SUM(quantity) FROM shipments WHERE warehouse='A' AND item LIKE '%螺絲%' ...\n```","message_id":"msg_004"}

event: done
data: {
  "message_id": "msg_004",
  "usage": {
    "prompt_tokens": 890,
    "completion_tokens": 120,
    "total_tokens": 1010,
    "model": "qwen2.5:14b"
  }
}

event: heartbeat
data: {}
```

---

## 11.2 完整 SSE 對話範例（Path B — BPA 工作流）

```
使用者從 BrowseAgent 選擇「物料管理代理」→ 導航至 TaskChat

POST /api/v1/chat/bpa/start
{
  "session_id": "ses_002",
  "agent_id": "agents/mm_agent_001",
  "user_input": "分析本月低於安全庫存的物料",
  "context": {"warehouse": "A"}
}

← 202 { "task_id": "task_bpa_001", "context_id": "ctx_002", "agent_name": "物料管理代理" }

──── SSE /api/v1/sse/chat/ctx_002 ────

event: bpa_status
data: {"step":"parsing","progress":10,"message":"正在解析查詢條件...","task_id":"task_bpa_001"}

event: bpa_status
data: {"step":"analysis","progress":30,"message":"正在分析庫存數據...","task_id":"task_bpa_001"}

event: chunk
data: {"content":"正在分析 A 倉庫的物料庫存狀況...","message_id":"msg_bpa_001"}

event: bpa_status
data: {"step":"analysis","progress":60,"message":"發現 5 項物料低於安全庫存","task_id":"task_bpa_001"}

event: bpa_ask_user
data: {
  "question": "發現以下 5 項物料低於安全庫存，是否需要自動生成補貨建議？\n\n1. M6 螺絲 (庫存: 200, 安全庫存: 500)\n2. 彈簧墊片 (庫存: 50, 安全庫存: 200)\n3. ...",
  "options": ["生成補貨建議", "僅查看清單", "取消"],
  "context": {"items_count": 5},
  "task_id": "task_bpa_001"
}

──── 使用者選擇「生成補貨建議」────

POST /api/v1/chat/bpa/task_bpa_001/reply
{
  "session_id": "ses_002",
  "message": "生成補貨建議"
}

──── SSE 繼續 ────

event: bpa_status
data: {"step":"aggregating","progress":80,"message":"正在生成補貨建議報告...","task_id":"task_bpa_001"}

event: chunk
data: {
  "content": "## 補貨建議報告\n\n| 物料 | 當前庫存 | 安全庫存 | 建議補貨量 |\n|------|---------|---------|----------|\n| M6 螺絲 | 200 | 500 | 400 |\n| 彈簧墊片 | 50 | 200 | 200 |\n...",
  "message_id": "msg_bpa_002"
}

event: bpa_complete
data: {
  "task_id": "task_bpa_001",
  "summary": "已完成庫存分析，發現 5 項物料低於安全庫存，已生成補貨建議",
  "result": {
    "items_analyzed": 5,
    "report_generated": true
  }
}

event: done
data: {
  "message_id": "msg_bpa_002",
  "usage": {
    "prompt_tokens": 2100,
    "completion_tokens": 450,
    "total_tokens": 2550,
    "model": "qwen2.5:14b"
  }
}
```

---

## 11.3 配置參數彙總

以下參數應存放於 ArangoDB `system_params` collection（**避免硬編碼**）：

| 參數 Key | 預設值 | 說明 |
|----------|--------|------|
| `chat.max_message_length` | 4000 | 單條訊息最大字元數 |
| `chat.max_messages_in_context` | 20 | LLM 上下文最大訊息數 |
| `chat.sse_heartbeat_interval_ms` | 15000 | SSE 心跳間隔（毫秒） |
| `chat.sse_max_retries` | 5 | SSE 最大重連次數 |
| `chat.sse_retry_delay_ms` | 1000 | SSE 重連基礎延遲（毫秒） |
| `chat.tool_timeout_seconds` | 30 | 工具調用超時（秒） |
| `chat.tool_rate_limit_per_minute` | 30 | 每使用者每分鐘工具調用上限 |
| `chat.message_rate_limit_per_minute` | 20 | 每使用者每分鐘訊息上限 |
| `chat.bpa_rate_limit_per_minute` | 5 | 每使用者每分鐘 BPA 啟動上限 |
| `chat.max_sse_connections_per_user` | 3 | 每使用者最大 SSE 連線數 |
| `chat.checkpoint_retention_count` | 50 | 每個 thread 保留的 checkpoint 數量 |
| `chat.memory_summary_model` | `"qwen2.5:7b"` | 對話摘要使用的模型（較小模型降低成本） |
| `chat.intent_classifier_mode` | `"hybrid"` | 意圖分類模式：rule / semantic / llm / hybrid |
| `chat.default_reply_mode` | `"auto"` | 預設回覆模式 |

> 以上參數在 Phase 1.1 建立 collections 時同步寫入 system_params 作為種子資料。

---

## 11.4 現有檔案修改清單

> 供 AI Coder Agent 快速定位需要修改的檔案

### 前端修改

| 檔案 | 修改類型 | 說明 |
|------|---------|------|
| `src/pages/TaskSessionChat.tsx` | 重大修改 | 移除 mock，整合 ChatStore + SSEManager |
| `src/pages/BrowseAgent.tsx` | 小修改 | `handleChat` 改為 `navigate` 至 TaskChat with agent param |
| `src/pages/TaskSessionHistory.tsx` | 全新實作 | 從 placeholder 改為完整會話列表 |
| `src/services/api.ts` | 新增 | 新增 `chatApi` 區塊 |
| `src/stores/chatStore.ts` | **新建** | ChatOrchestrator 狀態管理 |
| `src/services/sseManager.ts` | **新建** | SSE 連線管理 |
| `src/hooks/useChatStore.ts` | **新建** | React Hook 封裝 |
| `src/components/ToolCallDisplay.tsx` | **新建** | 工具調用 UI 元件 |
| `src/App.tsx` | 小修改 | 新增路由參數支援 |

### 後端修改（Rust Gateway）

| 檔案 | 修改類型 | 說明 |
|------|---------|------|
| `api/src/api/mod.rs` | 修改 | 新增 chat 路由群組 |
| `api/src/api/chat.rs` | **新建** | 聊天 API 端點 |
| `api/src/api/sse.rs` | 重大修改 | SSE 從模擬改為真實代理 |
| `api/src/api/ai.rs` | 修改 | 移除 echo mock |
| `api/src/services/ai_proxy.rs` | 修改 | `forward_bpa` 端點修正（`/start` → `/process`） |

### 後端修改（Python AI Services）

| 檔案 | 修改類型 | 說明 |
|------|---------|------|
| `ai-services/aitask/main.py` | 重大修改 | 升級為 Top Orchestrator |
| `ai-services/aitask/graph/` | **新建目錄** | LangGraph 圖定義 + 所有節點 |
| `ai-services/aitask/tools/` | **新建目錄** | ToolRegistry + Executors |
| `ai-services/aitask/checkpointer/` | **新建目錄** | ArangoDB Checkpointer |

---

## 11.5 術語對照表

| 英文 | 中文 | 說明 |
|------|------|------|
| Top Orchestrator | 頂層編排器 | 統合所有 AI 服務的中央調度 |
| BPA | 企業流程自動化 (Business Process Automation) | 結構化業務流程 Agent |
| MCP | 模型上下文協議 (Model Context Protocol) | 工具調用標準協議 |
| SSE | 伺服器推送事件 (Server-Sent Events) | 單向串流通訊 |
| LangGraph | — | LangChain 的圖狀態機框架 |
| Checkpointer | 檢查點保存器 | LangGraph 狀態持久化機制 |
| Intent Classification | 意圖分類 | 判斷使用者輸入的目的 |
| Coreference Resolution | 指代消解 | 解析代名詞（他/它/那個）指代對象 |
| Sliding Window | 滑動窗口 | 對話記憶截斷策略 |
| Handoff Protocol | 交接協議 | 服務間任務傳遞標準 |
| FSM | 有限狀態機 (Finite State Machine) | 前端模式管理模型 |
| Context ID | 上下文 ID | SSE 連線標識，由後端分配 |
| Tool Registry | 工具註冊表 | 統一管理所有可用工具的中央登錄 |
| Data Agent (DA) | 數據代理 | 自然語言 → SQL 查詢服務 (port 8003) |
| Knowledge Agent (KA) | 知識代理 | RAG 知識庫查詢服務 (port 8007) |

---

> **規格書結束** — 完整規格共 12 個文件（00-index 至 11-appendix），涵蓋系統架構、通訊協議、Path A/B 完整流程、前端狀態機、資料模型、工具整合、API 端點、安全性、實作階段。可直接用於 AI Coder Agent 開發。
