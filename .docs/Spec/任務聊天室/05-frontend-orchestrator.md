---
lastUpdate: 2026-03-27 15:00:00
author: Prometheus (AI Planning Agent) → Daniel Chung (修訂)
version: 1.1.0
status: 正式版
parent: 00-index.md
---

# 05 — 前端 ChatOrchestrator 狀態機

> **前置閱讀**: [00-index.md](./00-index.md)、[01-architecture.md](./01-architecture.md)  
> **本文件涵蓋**: FSM 三模式定義、狀態轉移規則、ChatMessage 介面、SSEManager 模組、ChatStore 實作、路由整合、React Hook 封裝

> ⚠️ **2026-03-27 修訂說明**：以下規格為**目標設計**（Phase 5+），當前實作狀態如下：
> - ✅ **ChatStore** 已完整實作，但架構比規格更精簡（無 FSM 模式，無 BPA 狀態）
> - ✅ **SSEManager** 已實作為 `sendMessageSSE` 函式（非 class），支援 `thinking_chunk` / `chat_chunk` 事件
> - ✅ **ChatMessage** 介面已根據實際 DB schema 調整（`_key` 而非 `id`，含 `thinking` 欄位）
> - ⏳ **FSM 模式**（bpa_workflow / bpa_param_collection）尚未實作，目前僅支援 `open_chat` 純聊天模式
> - ⏳ **TaskStatus** 尚未實作，目前使用 `isStreaming: boolean` 代替

---

## 5.1 架構概述

> ⚠️ 以下為**目標架構**，FSM 模式尚未實作。當前實作僅支援 `open_chat` 模式。

ChatOrchestrator 是前端核心狀態管理模組，負責管理對話模式、SSE 連線、訊息佇列、以及 UI 狀態同步。設計為一個**有限狀態機（FSM）**，三種模式對應兩條對話路徑。

```
┌────────────────────────────────────────────────────────────────────────┐
│                    ChatOrchestrator (FSM)                              │
│                                                                        │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│  │  open_chat   │    │  bpa_workflow    │    │  bpa_param_collect │   │
│  │              │    │                  │    │                    │   │
│  │ 自由聊天模式   │    │ BPA 執行模式      │    │ BPA 參數蒐集模式    │   │
│  │ Path A       │    │ Path B          │    │ Path B 子模式       │   │
│  │ ✅ 已實作     │    │ ⏳ 未實作         │    │ ⏳ 未實作           │   │
│  └──────────────┘    └──────────────────┘    └────────────────────┘   │
│                                                                        │
│  共用元件：SSEManager / MessageQueue / UIStateSync                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5.2 模式定義與狀態轉移

> ⚠️ **當前實作**：`TaskSessionChat.tsx` 僅支援 `open_chat` 模式，無 FSM 切換邏輯。狀態管理使用 `isStreaming: boolean` 而非完整 TaskStatus。

```typescript
// src/stores/chatStore.ts

// === 當前已實作的狀態 ===
interface ChatState {
  // === 會話識別 ===
  sessions: ChatSession[];           // 所有會話列表
  activeSessionKey: string | null;   // 當前會話 _key

  // === 訊息管理 ===
  messages: ChatMessage[];            // 當前會話訊息列表
  streamingContent: string;          // SSE 串流中的部分回應
  streamingThinking: string;         // AI 思考過程（thinking_chunk）

  // === 串流狀態 ===
  isStreaming: boolean;              // 是否正在串流中（替代 TaskStatus）

  // === 載入狀態 ===
  isLoadingSessions: boolean;       // 是否正在載入會話列表

  // === 模型供應商 ===
  selectedProvider: string | null;   // 選中的 provider code
  providers: ModelProvider[];        // 可用模型供應商列表

  // === 系統配置 ===
  greeting: string;                  // 歡迎訊息
  chatDefaults: Record<string, string>; // task_chat.* 配置項
}

// === 目標設計（尚未實作）===
type ChatMode = 'open_chat' | 'bpa_workflow' | 'bpa_param_collection';
type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';
type TaskStatus = 'idle' | 'sending' | 'streaming' | 'waiting_tool' | 'waiting_user' | 'completed' | 'failed' | 'cancelled' | 'paused';

interface ChatOrchestratorState {
  // === 模式控制 ===
  mode: ChatMode;
  
  // === 會話識別 ===
  sessionId: string | null;        // 當前會話 ID
  contextId: string | null;        // SSE context ID (由後端分配)

  // === 連線狀態 ===
  sseStatus: ConnectionStatus;
  wsStatus: ConnectionStatus;       // 僅 bpa_workflow 模式使用

  // === 任務狀態 ===
  taskStatus: TaskStatus;
  currentTaskId: string | null;     // Agent Protocol task_id
  currentStepId: string | null;     // Agent Protocol step_id

  // === BPA 專用 ===
  bpaAgentId: string | null;        // 選中的 BPA Agent _key
  bpaAgentName: string | null;      // Agent 顯示名稱
  bpaSteps: BpaStep[];              // BPA 流程步驟追蹤
  bpaAskUserPayload: any | null;    // BPA_ASK_USER 暫存

  // === 訊息管理 ===
  messages: ChatMessage[];          // 當前會話訊息列表
  streamingContent: string;           // SSE 串流中的部分回應
  pendingQueue: string[];            // 使用者排隊的訊息

  // === UI 狀態 ===
  inputEnabled: boolean;            // 輸入框是否可用
  inputPlaceholder: string;         // 輸入框提示文字
  showStopButton: boolean;          // 是否顯示停止按鈕
  showBpaControls: boolean;         // 是否顯示 BPA 控制列（暫停/取消）
  replyMode: 'auto' | 'fast' | 'detail';
}
```
┌────────────────────────────────────────────────────────────────────────┐
│                    ChatOrchestrator (FSM)                              │
│                                                                        │
│  ┌──────────────┐    ┌──────────────────┐    ┌────────────────────┐   │
│  │  open_chat   │    │  bpa_workflow    │    │  bpa_param_collect │   │
│  │              │    │                  │    │                    │   │
│  │ 自由聊天模式   │    │ BPA 執行模式      │    │ BPA 參數蒐集模式    │   │
│  │ Path A       │    │ Path B          │    │ Path B 子模式       │   │
│  └──────────────┘    └──────────────────┘    └────────────────────┘   │
│                                                                        │
│  共用元件：SSEManager / MessageQueue / UIStateSync                      │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 5.2 模式定義與狀態轉移

```typescript
// src/stores/chatOrchestrator.ts

type ChatMode = 'open_chat' | 'bpa_workflow' | 'bpa_param_collection';

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting' | 'error';

type TaskStatus = 'idle' | 'sending' | 'streaming' | 'waiting_tool' | 'waiting_user' | 'completed' | 'failed' | 'cancelled' | 'paused';

interface ChatOrchestratorState {
  // === 模式控制 ===
  mode: ChatMode;
  
  // === 會話識別 ===
  sessionId: string | null;        // 當前會話 ID
  contextId: string | null;        // SSE context ID (由後端分配)
  
  // === 連線狀態 ===
  sseStatus: ConnectionStatus;
  wsStatus: ConnectionStatus;       // 僅 bpa_workflow 模式使用
  
  // === 任務狀態 ===
  taskStatus: TaskStatus;
  currentTaskId: string | null;     // Agent Protocol task_id
  currentStepId: string | null;     // Agent Protocol step_id
  
  // === BPA 專用 ===
  bpaAgentId: string | null;        // 選中的 BPA Agent _key
  bpaAgentName: string | null;      // Agent 顯示名稱
  bpaSteps: BpaStep[];              // BPA 流程步驟追蹤
  bpaAskUserPayload: any | null;    // BPA_ASK_USER 暫存
  
  // === 訊息管理 ===
  messages: ChatMessage[];          // 當前會話訊息列表
  streamingContent: string;         // SSE 串流中的部分回應
  pendingQueue: string[];           // 使用者排隊的訊息
  
  // === UI 狀態 ===
  inputEnabled: boolean;            // 輸入框是否可用
  inputPlaceholder: string;         // 輸入框提示文字
  showStopButton: boolean;          // 是否顯示停止按鈕
  showBpaControls: boolean;         // 是否顯示 BPA 控制列（暫停/取消）
  replyMode: 'auto' | 'fast' | 'detail';
}
```

### 狀態轉移圖

```
                    ┌───────────────────────────────┐
                    │         初始狀態               │
                    │   mode: open_chat              │
                    │   taskStatus: idle              │
                    └───────────┬───────────────────┘
                                │
           ┌────────────────────┴────────────────────┐
           │                                          │
     使用者直接輸入文字                        使用者從 BrowseAgent 選擇代理
           │                                          │
           ▼                                          ▼
  ┌─────────────────┐                      ┌──────────────────────┐
  │  open_chat      │                      │  bpa_param_collection│
  │  sending →      │                      │  蒐集必要參數         │
  │  streaming →    │                      │  inputPlaceholder:    │
  │  idle           │                      │  "請輸入查詢條件..."   │
  └─────────────────┘                      └──────────┬───────────┘
                                                      │
                                              參數蒐集完成，發送 TASK_HANDOVER
                                                      │
                                                      ▼
                                           ┌──────────────────────┐
                                           │  bpa_workflow        │
                                           │  streaming/          │
                                           │  waiting_tool/       │
                                           │  waiting_user        │
                                           └──────────────────────┘
```

### 轉移事件定義

| 事件 | 來源模式 | 目標模式 | 觸發條件 |
|------|---------|---------|---------|
| `USER_INPUT` | `open_chat` (idle) | `open_chat` (sending) | 使用者按下送出 |
| `SSE_STREAM_START` | `open_chat` (sending) | `open_chat` (streaming) | 收到 `event: chunk` |
| `SSE_STREAM_END` | `open_chat` (streaming) | `open_chat` (idle) | 收到 `event: done` |
| `SELECT_BPA_AGENT` | `open_chat` (idle) | `bpa_param_collection` | 從 BrowseAgent 選擇代理 |
| `BPA_PARAMS_READY` | `bpa_param_collection` | `bpa_workflow` (sending) | 使用者輸入完必要參數 |
| `BPA_ASK_USER` | `bpa_workflow` (streaming) | `bpa_workflow` (waiting_user) | 收到 BPA_ASK_USER 事件 |
| `USER_REPLY_BPA` | `bpa_workflow` (waiting_user) | `bpa_workflow` (sending) | 使用者回覆 BPA 問題 |
| `BPA_COMPLETE` | `bpa_workflow` | `open_chat` (idle) | 收到 TASK_COMPLETE |
| `BPA_FAILED` | `bpa_workflow` | `open_chat` (idle) | 收到 TASK_FAILED |
| `USER_CANCEL_BPA` | `bpa_workflow` | `open_chat` (idle) | 使用者按取消按鈕 |
| `TOOL_CALL_START` | `open_chat` (streaming) | `open_chat` (waiting_tool) | 收到 `event: tool_call` |
| `TOOL_CALL_RESULT` | `open_chat` (waiting_tool) | `open_chat` (streaming) | 收到 `event: tool_result` |
| `SSE_ERROR` | 任何 | 同模式 (error 狀態) | SSE 連線錯誤 |
| `SSE_RECONNECT` | 任何 (error) | 同模式 (reconnecting) | 自動重連觸發 |

---

## 5.3 ChatMessage 介面

> ⚠️ **已修訂**：以下為**實際實作**的介面（基於 ArangoDB schema），與原始規格有重大差異。

```typescript
// 實際實作（src/services/api.ts + src/stores/chatStore.ts）
// 基於 ArangoDB chat_messages collection schema

interface ChatMessage {
  _key: string;                    // 唯一 ID（ArangoDB _key）
  session_key: string;             // 所屬會話的 _key
  role: string;                    // 'user' | 'assistant' | 'system' | 'tool'
  content: string;                  // 顯示內容（Markdown）
  thinking?: string | null;        // AI 思考過程（thinking_chunk SSE 事件）
  tokens: number | null;           // token 使用量
  created_at: string;              // ISO 8601 時間戳
}

// 備註：以下為原始規格介面（尚未實作）
interface ChatMessageSpec {
  id: string;                       // 唯一 ID (UUID) — 實作用 _key
  timestamp: string;                 // ISO 8601 時間戳 — 實作用 created_at
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;                  // 顯示內容（Markdown）
  
  // === 尚未實作 ===
  messageType?: MessageType;
  agentId?: string;
  agentName?: string;
  toolCalls?: ToolCallDisplay[];    // Phase 3
  bpaStep?: string;                 // Phase 5
  bpaProgress?: number;             // Phase 5
  bpaAskUserOptions?: string[];     // Phase 5
  isStreaming?: boolean;
  isFinal?: boolean;
  sources?: SourceReference[];      // Phase 4
  sqlQuery?: string;                // Phase 3 DA
}

type MessageType =
  | 'user_message'
  | 'ai_response'
  | 'tool_call'
  | 'tool_result'
  | 'bpa_status'
  | 'bpa_ask_user'
  | 'bpa_result'
  | 'system_notice'
  | 'error';

interface ToolCallDisplay {
  toolName: string;
  toolId: string;
  arguments: Record<string, unknown>;
  result?: string;
  status: 'pending' | 'executing' | 'success' | 'error';
  duration?: number;                // 毫秒
}

interface SourceReference {
  title: string;
  source: string;                   // 檔案名或 KB 名稱
  relevanceScore?: number;
  snippet?: string;                 // 匹配片段
}
```

---

## 5.4 SSEManager 模組

> ⚠️ **已修訂**：SSEManager 已實作為 `sendMessageSSE` 函式（非 class），介面與規格差異如下。

```typescript
// 實際實作（src/services/sseManager.ts）
// 已實作為工廠函式，無需 class 實例化

interface SSECallbacks {
  onChunk: (delta: string) => void;          // chat_chunk 事件（內容片段）
  onThinkingChunk?: (delta: string) => void;  // thinking_chunk 事件（思考過程）
  onDone: () => void;                        // chat_done 事件
  onError: (error: string) void;             // chat_error 事件
}

interface SSEConnection {
  abort: () => void;  // 中斷 SSE 連線
}

// 發送訊息並建立 SSE 串流連線
function sendMessageSSE(
  sessionKey: string,
  request: SendMessageRequest,
  callbacks: SSECallbacks,
): SSEConnection;

// SSE 事件類型：
// - event: chat_chunk    → { message: { content: string } }
// - event: thinking_chunk → { message: { thinking: string } }
// - event: chat_done     → 完成
// - event: chat_error    → { error: string }
```

> ⚠️ **目標設計（尚未實作）**：
> - 自動重連（指數退避 + 抖動）
> - 心跳超時機制
> - `onConnectionChange` 回調
> - `onToolCall` / `onToolResult` / `onBpaStatus` / `onBpaAskUser` 等 BPA 相關事件

### SSE 重連策略（目標設計）

```
重連策略：指數退避 + 抖動（Exponential Backoff with Jitter）

delay = min(retryDelayMs * 2^retryCount + random(0, 1000), 30000)

重連次數   延遲（ms）    說明
1          ~1000-2000    第一次重連
2          ~2000-3000    第二次
3          ~4000-5000    第三次
4          ~8000-9000    第四次
5          ~16000-17000  第五次（最後）
超過 5 次  → 放棄，顯示錯誤 UI，提供「重新連線」按鈕
```

> **配置參數**：`maxRetries`、`retryDelayMs` 應從 `system_params` 讀取。見 [11-appendix.md](./11-appendix.md) §11.3。

---

## 5.5 ChatOrchestrator 行為（各模式詳述）

### 5.5.1 open_chat 模式

**進入條件**：預設模式，或 BPA 任務完成/取消後

**使用者送出訊息流程**：

```
1. 使用者按送出 → handleSend(text)
2. 若 taskStatus !== 'idle'，加入 pendingQueue → return
3. taskStatus = 'sending'
4. 建立 ChatMessage { role: 'user', content: text }
5. POST /api/v1/ai/chat/send {
     session_id, message: text, reply_mode, context_id
   }
6. 後端回應 { message_id, context_id }（若首次，保存 contextId）
7. SSEManager 開始收到 chunk 事件
8. taskStatus = 'streaming'
9. 逐字更新 streamingContent
10. 收到 done 事件 → 將 streamingContent 合併為完整 ChatMessage
11. taskStatus = 'idle'
12. 若 pendingQueue 有訊息 → 取出第一條 → 回到步驟 3
```

**工具調用 UI 展示**：

```
收到 tool_call → 在訊息列表插入「工具調用中...」提示
  └── 顯示工具名稱、參數摘要
  └── 狀態指示器（旋轉圖示）

收到 tool_result → 更新工具調用狀態為完成
  └── 顯示結果摘要（可摺疊展開完整結果）
  └── 繼續接收 chunk（LLM 根據工具結果生成回應）
```

### 5.5.2 bpa_param_collection 模式

**進入條件**：從 BrowseAgent 選擇代理（路由攜帶 `agentId` 參數）

**流程**：

```
1. 從路由參數讀取 agentId → 查詢 Agent 資訊
2. mode = 'bpa_param_collection'
3. 顯示 Agent 資訊卡（名稱、描述、所需參數）
4. inputPlaceholder = Agent 定義的引導文字（如「請輸入要查詢的物料條件...」）
5. 使用者輸入初始指令/參數
6. 前端可進行基本參數驗證（若 Agent 定義了必要參數 schema）
7. 觸發 BPA_PARAMS_READY → 進入 bpa_workflow 模式
```

**注意**：部分 BPA Agent 可能不需要額外參數蒐集（例如「生成月報」），此時使用者選擇代理後直接進入 `bpa_workflow`。是否需要蒐集參數由 Agent 的 `requires_input: boolean` 欄位決定。

### 5.5.3 bpa_workflow 模式

**進入條件**：BPA 參數蒐集完成

**流程**：

```
1. 建構 TASK_HANDOVER payload（參照 04-path-b-bpa-workflow.md §4.3 格式）
2. POST /api/v1/ai/bpa/start {
     agent_id, session_id, user_input, context
   }
3. 後端回應 { task_id, context_id }
4. SSEManager 連線至 /api/v1/sse/chat/{context_id}
5. showBpaControls = true（顯示暫停/取消按鈕）
6. 接收 SSE 事件：
   - bpa_status → 更新進度條、步驟列表
   - chunk → 串流 BPA 的文字回應
   - bpa_ask_user → taskStatus = 'waiting_user'
     └── 顯示問題 UI（文字輸入或選項按鈕）
     └── inputPlaceholder = BPA 提出的問題
   - bpa_complete → 顯示最終結果
     └── mode = 'open_chat', taskStatus = 'idle'
   - error → 顯示錯誤訊息，提供重試選項
```

**BPA 控制操作**：

| 按鈕 | API 請求 | 結果 |
|------|---------|------|
| 暫停 | `POST /api/v1/ai/bpa/{task_id}/pause` | taskStatus = 'paused' |
| 繼續 | `POST /api/v1/ai/bpa/{task_id}/resume` | taskStatus = 'streaming' |
| 取消 | `POST /api/v1/ai/bpa/{task_id}/cancel` | mode = 'open_chat', 清除 BPA 狀態 |

---

## 5.6 路由整合

```typescript
// src/App.tsx 路由配置（擴展現有路由）

// Path A — 直接開啟聊天
<Route path="task-chat" element={<TaskSessionChat />} />
<Route path="task-chat/:sessionId" element={<TaskSessionChat />} />

// Path B — 從 BrowseAgent 跳轉（攜帶 agentId）
// BrowseAgent handleChat 改為：
// navigate(`/app/task-chat?agent=${agentId}`)
// TaskSessionChat 讀取 searchParams.get('agent') 判斷是否進入 BPA 模式
```

### URL 參數說明

| 參數 | 來源 | 用途 |
|------|------|------|
| `:sessionId` | 路由 params | 恢復已有會話（歷史記錄點擊） |
| `?agent={agentId}` | query string | BPA 模式觸發 |
| `?agent={agentId}&input={encodedText}` | query string | BPA 模式 + 預填參數 |

---

## 5.7 ChatStore 實作模式

> ⚠️ **已修訂**：以下為**實際實作**程式碼。目標設計（FSM 模式、BPA 控制）尚未實作。

```typescript
// src/stores/chatStore.ts
// 沿用專案現有 AuthStore 的 subscribe/notify 模式

class ChatStore {
  private state: ChatState = { /* 見 5.2 節 */ };
  private listeners: Set<() => void> = new Set();
  
  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => { this.listeners.delete(listener); };
  }
  
  getState(): ChatState { return this.state; }
  
  private setState(partial: Partial<ChatState>): void {
    this.state = { ...this.state, ...partial };
    this.notify();
  }
  
  private notify(): void {
    this.listeners.forEach(listener => listener());
  }
  
  // === 已實作方法 ===
  loadProviders(): Promise<void>;                          // 載入模型供應商
  loadChatDefaults(): Promise<void>;                       // 從 system_params 讀取 task_chat.* 配置
  setSelectedProvider(providerCode: string | null): void;  // 設定模型供應商
  createSession(provider?, model?): Promise<ChatSession>;   // 建立新會話
  loadSessions(): Promise<void>;                           // 載入會話列表
  loadSessionMessages(sessionKey: string): Promise<void>;  // 載入會話訊息
  addUserMessage(content: string): void;                  // 新增本地使用者訊息
  sendMessage(content: string): Promise<SSEConnection | null>; // 發送訊息 + 建立 SSE 串流
  truncateAfter(key: string): void;                       // 截断至指定訊息（含）
  updateMessage(key: string, content: string): void;      // 更新訊息內容
  retryMessage(key: string): Promise<SSEConnection | null>;    // 重發指定訊息
  editAndResend(key: string, newContent: string): Promise<SSEConnection | null>; // 編輯重發
  startStreaming(): void;                                  // 開始串流
  stopStreaming(): void;                                  // 停止串流
  appendStreamChunk(delta: string): void;                 // 附加內容片段
  appendThinkingChunk(delta: string): void;               // 附加思考片段
  finishStreaming(fullContent: string, thinkingContent: string): void; // 完成串流
  handleStreamError(error: string): void;                 // 處理串流錯誤
  generateSessionTitle(): Promise<void>;                   // 根據第一則使用者訊息產生標題
  
  // === 尚未實作（Phase 5 BPA）===
  enterOpenChat(): void;                                  // 進入開放聊天模式
  enterBpaMode(agentId: string, agentName: string): void; // 進入 BPA 模式
  replyToBpa(text: string): Promise<void>;                // 回覆 BPA 提問
  pauseBpa(): Promise<void>;                              // 暫停 BPA
  resumeBpa(): Promise<void>;                             // 繼續 BPA
  cancelBpa(): Promise<void>;                             // 取消 BPA
  connectSSE(contextId: string): void;                    // 建立 SSE 連線
  disconnectSSE(): void;                                   // 斷開 SSE
}

export const chatStore = new ChatStore();
```

### React Hook 封裝

```typescript
// 實際使用方式（src/pages/TaskSessionChat.tsx）

import { useEffect, useState } from 'react';
import { chatStore } from '../stores/chatStore';

export default function TaskSessionChat() {
  const [storeState, setStoreState] = useState(chatStore.getState());
  
  useEffect(() => {
    const unsubscribe = chatStore.subscribe(() => setStoreState(chatStore.getState()));
    return unsubscribe;
  }, []);
  
  // storeState.messages, storeState.isStreaming 等可直接使用
}
```

---

> **API 端點規格**：見 [08-api-endpoints.md](./08-api-endpoints.md)。  
> **錯誤處理矩陣**：見 [09-error-security.md](./09-error-security.md) §9.1.3。
