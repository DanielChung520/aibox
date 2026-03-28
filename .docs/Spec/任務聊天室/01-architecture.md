---
lastUpdate: 2026-03-27 10:12:43
author: Prometheus (AI Planning Agent)
version: 1.0.0
status: 正式版
parent: 00-index.md
---

# 01 — 系統架構總覽

> **前置閱讀**: [00-index.md](./00-index.md)  
> **本文件涵蓋**: 四層架構、元件職責矩陣、資料流概覽、端口與服務清單

---

## 1.1 四層架構

```
┌─────────────────────────────────────────────────────────────────┐
│                    展示層 (Presentation Layer)                    │
│  React + TypeScript + Ant Design 6.x                            │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ChatOrchestrator (前端狀態機)                             │   │
│  │  ├─ Mode: open_chat | bpa_workflow | bpa_param_collection│   │
│  │  ├─ SSE Client (主要串流)                                 │   │
│  │  ├─ WebSocket Client (BPA 雙向互動，輔助)                 │   │
│  │  └─ Message Queue (本地訊息佇列)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP / SSE / WS
┌───────────────────────────▼─────────────────────────────────────┐
│                    閘道層 (Gateway Layer)                         │
│  Rust Axum API Gateway (port 6500)                              │
│  ├─ JWT 認證中介層                                               │
│  ├─ 速率限制                                                     │
│  ├─ SSE 端點 (/api/v1/sse/chat/:context_id)                    │
│  ├─ WebSocket 端點 (/api/v1/ws/chat)                            │
│  ├─ AI Proxy (轉發至 Top Orchestrator)                          │
│  └─ Trace ID 注入 (X-Trace-Id, X-Session-Id)                   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP (內部)
┌───────────────────────────▼─────────────────────────────────────┐
│                    編排層 (Orchestration Layer)                   │
│  Top Orchestrator (升級自 aitask, port 8001)                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  LangGraph StateGraph                                     │   │
│  │  ├─ classify_intent (意圖分類節點)                        │   │
│  │  ├─ resolve_coreference (指代消解節點)                    │   │
│  │  ├─ route_by_intent (路由節點)                            │   │
│  │  ├─ chat_responder (一般聊天回應)                         │   │
│  │  ├─ tool_executor (MCP 工具執行)                          │   │
│  │  ├─ bpa_orchestrator (BPA 工作流編排)                     │   │
│  │  ├─ da_query (資料查詢代理)                               │   │
│  │  └─ ka_search (知識庫檢索代理)                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│  ├─ ArangoDB Checkpointer (會話持久化)                          │
│  ├─ Conversation Memory Manager (記憶管理)                      │
│  └─ SSE Stream Writer (astream_events v2)                       │
└──────┬──────────┬──────────┬──────────┬─────────────────────────┘
       │          │          │          │
┌──────▼──┐ ┌────▼────┐ ┌──▼───┐ ┌───▼────┐
│ BPA     │ │ Data    │ │ MCP  │ │Knowledge│
│ MM Agent│ │ Agent   │ │Tools │ │ Agent   │
│ :8005   │ │ :8003   │ │:8004 │ │ :8007   │
└─────────┘ └─────────┘ └──────┘ └────────┘
       服務層 (Service Layer)
```

---

## 1.2 元件職責矩陣

| 元件 | 職責 | 輸入 | 輸出 | 協議 |
|------|------|------|------|------|
| **ChatOrchestrator** (前端) | 對話模式管理、SSE 連線、UI 狀態 | 使用者輸入、BPA 選擇 | HTTP 請求、SSE 訂閱 | REST + SSE |
| **API Gateway** (Rust) | 認證、限流、SSE/WS 代理、Trace 注入 | 前端請求 | 轉發至 Top | HTTP + SSE + WS |
| **Top Orchestrator** (Python) | 意圖分類、路由、LangGraph 狀態管理 | Gateway 轉發 | SSE 事件、BPA 指令 | Handoff v2.0 |
| **BPA MM Agent** (Python) | 企業流程執行、步驟分解、DA 調用 | TASK_HANDOVER | TASK_COMPLETE/FAILED | Handoff v2.0 |
| **Data Agent** (Python) | NL→SQL、資料查詢 | POST /query | 查詢結果 | REST + Headers |
| **MCP Tools** (Python) | 外部工具執行 | POST /execute | ToolResult | REST (MCP-like) |
| **Knowledge Agent** (Python) | RAG 向量檢索 | POST /query | 知識片段 | REST |

---

## 1.3 資料流概覽

### Path A：開放聊天流程

```
使用者輸入 → ChatOrchestrator(open_chat 模式)
  → POST /api/v1/chat/send {session_id, message}
  → API Gateway (JWT驗證 + Trace注入)
  → Top Orchestrator (LangGraph)
    → classify_intent 節點
      ├─ intent="general_chat" → chat_responder → SSE 串流回應
      ├─ intent="data_query"   → da_query → DA:8003 → SSE 結果
      ├─ intent="knowledge"    → ka_search → KA:8007 → SSE 結果
      ├─ intent="tool_use"     → tool_executor → MCP:8004 → SSE 結果
      └─ intent="bpa_task"     → bpa_orchestrator → 轉入 Path B
  → SSE /api/v1/sse/chat/{session_id} (串流事件)
  → ChatOrchestrator 更新 UI
```

> **詳細 Path A 規格**: 見 [03-path-a-open-chat.md](./03-path-a-open-chat.md)

### Path B：BPA 代理工作流

```
使用者選擇 BPA Agent → ChatOrchestrator(bpa_workflow 模式)
  → POST /api/v1/chat/bpa/start {session_id, agent_key, initial_message}
  → API Gateway → Top Orchestrator
    → 建構 TASK_HANDOVER (schema_version: "2.0")
    → 發送至 BPA MM Agent:8005 POST /process
    → BPA 解析任務、分解步驟
      ├─ query 步驟 → BPA 呼叫 DA:8003
      ├─ analysis 步驟 → BPA 本地 LLM 分析
      ├─ ask_user 步驟 → BPA_ASK_USER → Top → SSE → 前端顯示
      │   └─ 使用者回覆 → USER_MESSAGE → Top → BPA 繼續
      └─ 完成 → TASK_COMPLETE → Top → SSE → 前端顯示結果
```

> **詳細 Path B 規格**: 見 [04-path-b-bpa-workflow.md](./04-path-b-bpa-workflow.md)

---

## 1.4 端口與服務清單

| 服務 | 端口 | 角色 | 狀態 |
|------|------|------|------|
| API Gateway | 6500 | 閘道、SSE/WS 代理 | ✅ 現有，需擴充 SSE 轉發 |
| Top Orchestrator | 8001 | LangGraph 編排器 | 🔄 升級自 aitask |
| Data Agent | 8003 | NL→SQL 查詢 | ✅ 現有 |
| MCP Tools | 8004 | 工具執行 | ✅ 現有，需擴充 MCP 協議 |
| BPA MM Agent | 8005 | 物料管理流程 | ✅ 現有 |
| Knowledge Agent | 8007 | RAG 檢索 | ✅ 現有 |
| ArangoDB | 8529 | 資料持久化 | ✅ 現有 |
| Qdrant | 6333 | 向量檢索 | ✅ 現有 |
| Ollama | 11434 | 本地 LLM | ✅ 現有 |
