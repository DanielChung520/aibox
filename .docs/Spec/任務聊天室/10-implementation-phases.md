---
lastUpdate: 2026-03-27 15:00:00
author: Prometheus (AI Planning Agent) → Daniel Chung (修訂)
version: 1.1.0
status: 正式版
parent: 00-index.md
---

# 10 — 實作階段與依賴關係

> 本文件定義 7 階段實作計劃、依賴關係圖、各階段詳細任務與預估工時。  
> AI Coder Agent 應按階段順序執行，注意依賴關係。

> ⚠️ **2026-03-27 修訂**：Phase 1 已實作內容大幅超出原規格；Phase 7.1（歷史頁面）已實作。詳見各 Phase 備註。

---

## 10.1 階段總覽

```
Phase 1: 基礎建設 ✅（已完成 90%）──────────────────────────────────────
  ├── 1.1 ArangoDB Collections + Indexes（後端實作，略）
  ├── 1.2 ArangoDB Checkpointer 適配器（後端實作，略）
  ├── 1.3 Rust Gateway 新增路由骨架（後端實作，略）
  └── 1.4 前端 ✅ 已超越「骨架」：
        - ChatStore 完整實作（sendMessage, retryMessage, editAndResend, truncateAfter, 
          streamingContent/streamingThinking, finishStreaming, 訊息佇列）
        - SSEManager 完整實作（sendMessageSSE 函式，含 thinking_chunk / chat_chunk 事件）
        - chatApi 完整（createSession, listSessions, getSession, updateSession, deleteSession）
        - modelProviderApi + paramsApi 整合（Provider 選擇、預設模型/溫度/max_tokens）
        - TaskSessionHistory 頁面（會話列表、點擊導航）✅ Phase 7.1 已實作

Phase 2: Path A 核心鏈路 🔄（前端已完成，後端 LangGraph 待實作）──────────────
  ├── 2.1 Top Orchestrator 升級（aitask → LangGraph）⚠️ 後端尚未實作
  ├── 2.2 LangGraph StateGraph 基本圖（router → chat_responder）⚠️ 後端尚未實作
  ├── 2.3 SSE 串流整合（Top Orch → Gateway → Frontend）⚠️ 後端尚未實作
  ├── 2.4 前端 SSEManager + 訊息串流渲染 ✅ 已實作（SSE Manager + 串流渲染）
  └── 2.5 端對端測試：使用者輸入 → SSE 串流回應 ⚠️ 待後端完成後驗證

Phase 3: 工具整合 ⏳（尚未實作）─────────────────────────────────────────────
  ├── 3.1 ToolRegistry + 統一 ToolDefinition
  ├── 3.2 MCP Executor 整合
  ├── 3.3 Data Agent Executor 整合
  ├── 3.4 Knowledge Agent Executor 整合
  ├── 3.5 LangGraph tool_executor 節點 + 條件路由
  └── 3.6 前端工具調用 UI（tool_call / tool_result 渲染）

Phase 4: 意圖分類與對話智能 ⏳（尚未實作）───────────────────────────────────
  ├── 4.1 三層意圖分類器（規則 → 語義 → LLM）
  ├── 4.2 指代消解（coreference resolution）
  ├── 4.3 記憶管理（滑動窗口 + 摘要化）
  └── 4.4 多輪對話上下文維持

Phase 5: Path B — BPA 工作流 ⏳（尚未實作）──────────────────────────────────
  ├── 5.1 Gateway BPA 端點實作
  ├── 5.2 Top Orch bpa_orchestrator 節點
  ├── 5.3 TASK_HANDOVER 建構 + BPA 轉發
  ├── 5.4 BPA_ASK_USER 多輪互動流程
  ├── 5.5 BPA 控制操作（cancel/pause/resume）
  ├── 5.6 前端 ChatOrchestrator BPA 模式
  └── 5.7 前端 BrowseAgent → TaskChat 導航整合

Phase 6: 錯誤處理與強化 ⏳（尚未實作）──────────────────────────────────────
  ├── 6.1 SSE 重連 + 心跳機制
  ├── 6.2 錯誤碼體系 + 前端錯誤矩陣
  ├── 6.3 速率限制實作
  ├── 6.4 輸入清理 + 安全防護
  ├── 6.5 分散式追蹤（X-Trace-Id 全鏈路）
  └── 6.6 Token 使用量追蹤 + 配額檢查

Phase 7: 會話管理與歷史 🔄（部分完成）──────────────────────────────────────
  ├── 7.1 會話列表頁面（TaskSessionHistory.tsx）✅ 已實作（列表、排序、點擊導航）
  ├── 7.2 會話恢復（載入歷史訊息）✅ 已實作（loadSessionMessages，詳見 1.4）
  │   └── ⚠️ LangGraph Checkpoint 狀態恢復待後端實作（依賴 Phase 2 完成）
  ├── 7.3 會話搜尋與篩選 ⏳（尚未實作）
  └── 7.4 會話刪除 + 資料清理 ⏳（尚未實作）

Phase 8: 檔案上傳與知識向量化 📋（待新增）────────────────────────────────────────
  ├── 8.1 前端上傳 UI + 進度追蹤 ⏳（尚未實作）
  ├── 8.2 API 上傳端點 + SeaWeedFS 寫入 ⏳（尚未實作）
  ├── 8.3 Queue Work 任務排程（Celery）⏳（尚未實作）
  ├── 8.4 向量化處理（Qdrant）⏳（尚未實作）
  ├── 8.5 圖譜抽取處理（ArangoDB）⏳（尚未實作）
  └── 8.6 任務會話綁定（session_key）⏳（尚未實作）
```

---

## 10.2 依賴關係圖

```
Phase 1 ─┬─→ Phase 2 ──→ Phase 3 ──→ Phase 4
          │        │
          │        └──────────────────→ Phase 5
          │
          └──→ Phase 6 (可與 3/4/5 並行)
          
Phase 2 + 7.2 checkpoint ──→ Phase 7

Phase 6 可隨時插入，不阻塞主線
Phase 7 依賴 Phase 2 的 SSE 基礎 + Phase 1 的資料模型

Phase 1 + Phase 7 ──→ Phase 8（檔案上傳依賴會話管理基礎）
```

**關鍵路徑**：Phase 1 → Phase 2 → Phase 3 → Phase 4（總計 ~56hr）

**關鍵路徑**：Phase 1 → Phase 2 → Phase 3 → Phase 4（總計 ~56hr）

**可並行**：Phase 6 可在 Phase 2 完成後隨時穿插

---

## 10.3 各階段詳細任務

### Phase 1: 基礎建設

| 任務 | 檔案 | 說明 | 狀態 |
|------|------|------|------|
| 1.1 ArangoDB Collections | `api/src/db/` + AQL scripts | 建立 5 個 collections（chat_sessions, chat_messages, chat_checkpoints, chat_checkpoint_writes, tool_executions）+ 索引，見 [06-data-model.md](./06-data-model.md) | ✅ 後端實作中 |
| 1.2 ArangoDB Checkpointer | `ai-services/aitask/checkpointer/arango_saver.py` | 實作 `BaseCheckpointSaver` 介面（aget_tuple, alist, aput, aput_writes, setup），見 [06-data-model.md §6.4](./06-data-model.md) | ⏳ 後端待實作 |
| 1.3 Gateway 路由骨架 | `api/src/api/chat.rs`（新） | 建立 chat module，註冊所有新端點（先回傳 501 Not Implemented），見 [08-api-endpoints.md](./08-api-endpoints.md) | ✅ 後端實作中 |
| 1.4 前端骨架 | `src/services/api.ts`, `src/stores/chatStore.ts`, `src/services/sseManager.ts`, `src/pages/TaskSessionHistory.tsx` | **已超越「骨架」——完整實作** | ✅ **已完成** |

> **實作細節（1.4）**：
> - `chatStore.ts`：完整實作，包含 `sendMessage`、`retryMessage`、`editAndResend`、`truncateAfter`、`updateMessage`、`startStreaming`、`stopStreaming`、`appendStreamChunk`、`appendThinkingChunk`、`finishStreaming`、`handleStreamError`、`generateSessionTitle` 等方法
> - `sseManager.ts`：`sendMessageSSE` 函式實作，`thinking_chunk` + `chat_chunk` + `chat_done` + `chat_error` 事件支援
> - `api.ts`：Chat API 完整（createSession, listSessions, getSession, updateSession, deleteSession）
> - `TaskSessionHistory.tsx`：**超出 Phase 1 規格**，已完成 Phase 7.1

### Phase 2: Path A 核心鏈路

| 任務 | 檔案 | 說明 | 依賴 | 預估 | 狀態 |
|------|------|------|------|------|------|
| 2.1 Top Orch 升級 | `ai-services/aitask/main.py` | 新增 `/chat`, `/stream/{context_id}` 端點，安裝 langgraph，見 [08-api-endpoints.md §8.2](./08-api-endpoints.md) | 1.2 | 4hr | ⏳ |
| 2.2 LangGraph 基本圖 | `ai-services/aitask/graph/`（新目錄） | TopState 定義、router + chat_responder 節點、StateGraph 配置，見 [03-path-a-open-chat.md](./03-path-a-open-chat.md) | 2.1 | 4hr | ⏳ |
| 2.3 SSE 串流 | `api/src/api/sse.rs`（修改）, `ai-services/aitask/graph/nodes/chat_responder.py` | Gateway SSE 反向代理 + Top Orch SSE 發送，見 [02-protocol.md](./02-protocol.md) | 2.2 | 4hr | ⏳ |
| 2.4 前端串流 | `src/services/sseManager.ts`, `src/pages/TaskSessionChat.tsx`（修改） | SSEManager 連線 + 訊息渲染邏輯，見 [05-frontend-orchestrator.md](./05-frontend-orchestrator.md) | 1.4, 2.3 | 4hr | ✅ 前端完成 |
| 2.5 端對端測試 | — | 使用者輸入 → Gateway → Top Orch → LLM → SSE → 前端顯示 | 2.4 | 2hr | ⏳ |

> ⚠️ **注意**：`TaskSessionChat.tsx` 目前處於 `PREVIEW_MOCK = true` 模式，需等後端 LangGraph 完成後設為 `false` 並驗證端對端串流。

### Phase 3: 工具整合

| 任務 | 檔案 | 依賴 | 預估 | 狀態 |
|------|------|------|------|------|
| 3.1 ToolRegistry | `ai-services/aitask/tools/registry.py`（新） | 2.1 | 3hr | ⏳ |
| 3.2 MCP Executor | `ai-services/aitask/tools/executors/mcp_executor.py`（新） | 3.1 | 2hr | ⏳ |
| 3.3 DA Executor | `ai-services/aitask/tools/executors/da_executor.py`（新） | 3.1 | 2hr | ⏳ |
| 3.4 KA Executor | `ai-services/aitask/tools/executors/ka_executor.py`（新） | 3.1 | 2hr | ⏳ |
| 3.5 tool_executor 節點 | `ai-services/aitask/graph/nodes/tool_executor.py`（新） | 3.1, 2.2 | 3hr | ⏳ |
| 3.6 前端工具 UI | `src/pages/TaskSessionChat.tsx`, `src/components/ToolCallDisplay.tsx`（新） | 2.4, 3.5 | 3hr | ⏳ |

> 工具規格詳見 [07-mcp-tools.md](./07-mcp-tools.md)

### Phase 4: 對話智能

| 任務 | 檔案 | 依賴 | 預估 |
|------|------|------|------|
| 4.1 意圖分類器 | `ai-services/aitask/graph/nodes/intent_classifier.py`（新） | 2.2 | 4hr |
| 4.2 指代消解 | `ai-services/aitask/graph/nodes/coreference.py`（新） | 4.1 | 3hr |
| 4.3 記憶管理 | `ai-services/aitask/graph/nodes/memory_manager.py`（新） | 1.2 | 3hr |
| 4.4 多輪上下文 | 整合測試 | 4.1, 4.2, 4.3 | 2hr |

> 意圖分類與記憶管理詳見 [03-path-a-open-chat.md](./03-path-a-open-chat.md)

### Phase 5: Path B — BPA 工作流

| 任務 | 檔案 | 依賴 | 預估 |
|------|------|------|------|
| 5.1 Gateway BPA 端點 | `api/src/api/chat.rs` | 1.3 | 3hr |
| 5.2 bpa_orchestrator | `ai-services/aitask/graph/nodes/bpa_orchestrator.py`（新） | 2.1 | 4hr |
| 5.3 TASK_HANDOVER | 5.2 內部 | 5.2 | 2hr |
| 5.4 多輪互動 | 5.2 + `api/src/api/chat.rs` | 5.3 | 3hr |
| 5.5 控制操作 | `api/src/api/chat.rs` + 5.2 | 5.4 | 2hr |
| 5.6 前端 BPA 模式 | `src/stores/chatStore.ts` + `src/pages/TaskSessionChat.tsx` | 2.4, 5.1 | 4hr |
| 5.7 導航整合 | `src/pages/BrowseAgent.tsx`（修改）+ `src/App.tsx` | 5.6 | 1hr |

> BPA 工作流詳見 [04-path-b-bpa-workflow.md](./04-path-b-bpa-workflow.md)

### Phase 6: 錯誤處理與強化

| 任務 | 依賴 | 預估 |
|------|------|------|
| 6.1 SSE 重連 + 心跳 | 2.4 | 2hr |
| 6.2 錯誤碼體系 | 1.3 | 2hr |
| 6.3 速率限制 | 1.3 | 2hr |
| 6.4 安全防護 | 2.1 | 2hr |
| 6.5 分散式追蹤 | 2.1 | 2hr |
| 6.6 Token 追蹤 | 2.2, 1.1 | 2hr |

> 錯誤碼與安全規格詳見 [09-error-security.md](./09-error-security.md)

### Phase 7: 會話管理

| 任務 | 依賴 | 預估 | 狀態 |
|------|------|------|------|
| 7.1 歷史頁面 | 1.4, Phase 2 | 4hr | ✅ **已完成** |
| 7.2 會話恢復 | 1.2, 2.4 | 3hr | 🔄 部分（訊息載入已完成，LangGraph Checkpoint 恢復待後端） |
| 7.3 搜尋篩選 | 7.1 | 2hr | ⏳ |
| 7.4 資料清理 | 7.1 | 1hr | ⏳ |

---

## 10.4 總預估

| 階段 | 時數 | 累計 |
|------|------|------|
| Phase 1: 基礎建設 | 11hr | 11hr |
| Phase 2: Path A 核心 | 18hr | 29hr |
| Phase 3: 工具整合 | 15hr | 44hr |
| Phase 4: 對話智能 | 12hr | 56hr |
| Phase 5: Path B BPA | 19hr | 75hr |
| Phase 6: 強化 | 12hr | 87hr |
| Phase 7: 會話管理 | 10hr | 97hr |
| **總計** | **~97hr** | |

> ⚠ 以上為 AI Coder Agent 預估工時，實際可能因調試和整合測試增加 20-30%。

---

## 10.5 風險與緩解

| 風險 | 機率 | 影響 | 緩解措施 |
|------|------|------|------|---------|
| ArangoDB Checkpointer 相容性 | 中 | 高 | Phase 1 優先驗證，準備 fallback 到 SQLite |
| LLM 串流回應不穩定 | 中 | 中 | 重試機制 + timeout 保護 + 降級為非串流 |
| BPA 端點不匹配 | 高 | 中 | Phase 5 開始前確認並修正 `ai_proxy.rs`（`/start` → `/process`） |
| SSE 跨瀏覽器相容性 | 低 | 低 | EventSource polyfill + 測試主流瀏覽器 |
| 工具調用延遲過高 | 中 | 中 | 工具調用超時配置 + 並行執行 + 快取 |
| **前端 LangGraph 依賴斷鏈** | 高 | 中 | ⚠️ 後端 LangGraph 尚未實作，前端已預留介面；需先完成 Phase 2 後端 |
| **PREVIEW_MOCK 未關閉** | 高 | 中 | ⚠️ `TaskSessionChat.tsx` 中 `PREVIEW_MOCK = true` 需在 Phase 2 完成後設為 `false` |
