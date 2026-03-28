---
lastUpdate: 2026-03-27 10:27:55
author: Prometheus (AI Planning Agent)
version: 1.0.0
status: 正式版
parent: 00-index.md
---

# 09 — 錯誤處理、安全與可觀測性

> 本文件定義任務聊天室的錯誤碼體系、安全防護機制、分散式追蹤與可觀測性設計。  
> 前置閱讀：[02-protocol.md](./02-protocol.md)（SSE 事件格式）、[08-api-endpoints.md](./08-api-endpoints.md)（端點定義）

---

## 9.1 錯誤碼體系

延續 `.docs/API Specification.md` 既有錯誤碼，新增聊天室專用錯誤碼：

| 錯誤碼 | HTTP 狀態 | 類別 | 說明 | 前端處理 |
|--------|----------|------|------|---------|
| `CHAT_001` | 400 | 參數錯誤 | session_id 無效或不屬於當前使用者 | 提示重新建立會話 |
| `CHAT_002` | 404 | 找不到 | 會話不存在或已刪除 | 導向會話列表 |
| `CHAT_003` | 409 | 衝突 | 會話正在處理中，不可重複發送 | 提示等待回應完成 |
| `CHAT_004` | 429 | 速率限制 | 訊息發送頻率過高 | 顯示冷卻時間 |
| `CHAT_005` | 503 | 服務不可用 | Top Orchestrator 無法連線 | 提示稍後重試 |
| `BPA_001` | 400 | 參數錯誤 | BPA agent_id 無效 | 提示重新選擇代理 |
| `BPA_002` | 404 | 找不到 | BPA task 不存在 | 清除 BPA 狀態 |
| `BPA_003` | 409 | 衝突 | BPA 任務已完成/取消，不可操作 | 顯示最終狀態 |
| `BPA_004` | 504 | 逾時 | BPA 處理超時 | 提供重試/取消選項 |
| `TOOL_001` | 500 | 工具錯誤 | 工具執行失敗 | 顯示錯誤並繼續對話 |
| `TOOL_002` | 403 | 權限不足 | 使用者無權使用該工具 | 提示無權限 |
| `SSE_001` | 500 | 連線錯誤 | SSE 連線意外中斷 | 自動重連 |
| `LLM_001` | 503 | LLM 錯誤 | LLM 服務不可用 | 提示 AI 暫時不可用 |
| `LLM_002` | 500 | LLM 錯誤 | LLM 回應格式異常 | 提示重試 |

---

## 9.2 SSE 錯誤事件格式

當錯誤發生在 SSE 串流中（而非 HTTP 回應），使用 `event: error`：

```
event: error
data: {
  "code": "TOOL_001",
  "message": "工具 mcp_inventory_search 執行失敗：連線超時",
  "retryable": true,
  "details": {
    "tool_name": "mcp_inventory_search",
    "timeout_ms": 30000
  },
  "timestamp": "2026-03-27T10:05:30Z"
}
```

**欄位說明**：

| 欄位 | 型別 | 說明 |
|------|------|------|
| `code` | string | 上方錯誤碼之一 |
| `message` | string | 人可讀的錯誤描述（中文） |
| `retryable` | boolean | 前端是否應提供重試選項 |
| `details` | object? | 額外診斷資訊（選填） |
| `timestamp` | string | ISO 8601 時間戳 |

---

## 9.3 前端錯誤處理矩陣

| 錯誤類型 | 自動處理 | UI 反饋 | 使用者操作 |
|---------|---------|---------|-----------|
| SSE 斷線 | 自動重連（最多 5 次，見 [05-frontend-orchestrator.md](./05-frontend-orchestrator.md)） | 頂部橫幅「連線中斷，重新連接中...」 | 等待或手動重連 |
| 工具執行失敗 | 繼續對話（LLM 會收到錯誤訊息） | 訊息中顯示「⚠ 工具調用失敗」 | 無需操作 |
| LLM 不可用 | 無 | 訊息「AI 服務暫時不可用，請稍後重試」 | 重試按鈕 |
| BPA 超時 | 無 | 訊息「流程處理超時」 | 重試或取消 |
| 速率限制 | 等待冷卻 | 輸入框禁用 + 倒數計時 | 等待 |
| 認證過期 | 跳轉登入頁 | 無 | 重新登入 |

---

## 9.4 安全設計

### 9.4.1 全鏈路認證

```
前端 → API Gateway → Top Orchestrator → BPA/DA/KA
  │        │              │                │
  │   JWT 驗證        JWT 轉發          Header 傳遞
  │   (middleware)    (Authorization)   (X-Trace-Id 等)
  │        │              │                │
  └────────┴──────────────┴────────────────┘
  
  全鏈路 JWT Token 傳遞，每一層都驗證 Token 有效性
```

**Token 傳遞規則**：

1. 前端在 Axios Interceptor 中自動附加 `Authorization: Bearer {token}`
2. Rust Gateway 的 `auth_middleware` 驗證 JWT 有效性
3. Gateway 轉發請求至 Top Orchestrator 時**保留** Authorization header
4. Top Orchestrator 調用下游服務（DA/KA/MCP/BPA）時**傳遞** Token

### 9.4.2 會話隔離

```python
# 所有會話操作都必須驗證 user_id 歸屬

async def verify_session_ownership(session_id: str, user_id: str) -> bool:
    """
    AQL: FOR s IN chat_sessions
         FILTER s._key == @session_id AND s.user_id == @user_id
         RETURN s
    
    若查無結果 → 回傳 CHAT_001 錯誤
    """
```

**規則**：

- 使用者只能存取**自己的**會話
- 使用者只能操作**自己的** BPA 任務
- 管理員可透過特殊端點查看所有會話（未來需求）

### 9.4.3 輸入清理 (InputSanitizer)

```python
class InputSanitizer:
    """
    使用者輸入清理，防止 Prompt Injection 和 XSS。
    """
    
    # Prompt Injection 防護
    INJECTION_PATTERNS: list[str] = [
        r"ignore previous instructions",
        r"system prompt",
        r"你是一個",  # 嘗試重置系統提示
    ]
    
    def sanitize_chat_input(self, text: str) -> str:
        """
        1. 移除控制字元
        2. 長度限制（system_params `chat.max_message_length`，預設 4000 字元）
        3. 偵測注入模式（記錄但不阻擋，由 LLM 系統提示防護）
        """
    
    def sanitize_for_display(self, text: str) -> str:
        """
        前端顯示用清理（Markdown 允許，但移除 <script> 等）
        """
```

**實作注意**：

- 注入模式偵測**僅記錄**（structlog warning），不阻擋使用者輸入
- 長度限制從 `system_params` 讀取，**不可硬編碼**
- 前端顯示清理需防止 XSS（sanitize HTML tags）

### 9.4.4 速率限制

| 端點 | 限制 | 窗口 | 配置來源 |
|------|------|------|---------|
| `POST /chat/send` | 20 次 | 1 分鐘 | system_params `chat.message_rate_limit_per_minute` |
| `POST /chat/bpa/start` | 5 次 | 1 分鐘 | system_params `chat.bpa_rate_limit_per_minute` |
| `POST /chat/sessions` | 10 次 | 1 分鐘 | system_params |
| SSE 連線數 | 3 個 | 每使用者 | system_params `chat.max_sse_connections_per_user` |

> 所有限制值均從 `system_params` 讀取，**避免硬編碼**。Rust Gateway 現有 `rate_limit.rs` middleware 可擴展。

---

## 9.5 可觀測性 (Observability)

### 9.5.1 分散式追蹤 (X-Trace-Id)

使用 `X-Trace-Id` 貫穿全鏈路：

```
前端生成 trace_id → Gateway → Top Orchestrator → BPA/DA/KA/MCP
                                    │
                                    └── 所有日誌包含 trace_id
                                        所有 SSE 事件包含 trace_id
                                        所有 DB 記錄包含 trace_id
```

**Trace ID 格式**：`trc_{uuid_v4}`（例：`trc_a1b2c3d4-e5f6-7890-abcd-ef1234567890`）

**前端生成**：

```typescript
function generateTraceId(): string {
  return `trc_${crypto.randomUUID()}`;
}

// 在 chatApi.sendMessage 中自動附加
api.interceptors.request.use((config) => {
  config.headers['X-Trace-Id'] = generateTraceId();
  return config;
});
```

### 9.5.2 結構化日誌

Top Orchestrator 使用 `structlog` 進行結構化日誌記錄：

```python
import structlog

logger = structlog.get_logger()

# 每個請求的日誌上下文
logger.info("chat.message.received",
    trace_id="trc_...",
    session_id="ses_...",
    user_id="admin",
    message_length=150,
    mode="open_chat"
)

logger.info("chat.tool.executed",
    trace_id="trc_...",
    tool_name="mcp_inventory_search",
    duration_ms=350,
    success=True
)

logger.info("chat.bpa.handover",
    trace_id="trc_...",
    agent_id="mm_agent_001",
    task_id="task_...",
    step="parsing"
)

logger.error("chat.llm.error",
    trace_id="trc_...",
    error_type="timeout",
    model="qwen2.5:14b",
    retry_count=2
)
```

**日誌命名規範**：`chat.{module}.{action}` — 例如 `chat.tool.executed`、`chat.bpa.handover`

### 9.5.3 Token 使用量追蹤

```python
class TokenTracker:
    """
    追蹤每個會話的 Token 使用量，用於計費和配額管理。
    
    存放位置：chat_sessions.metadata.total_tokens
    + 各 chat_messages.token_usage
    """
    
    async def record_usage(self, session_id: str, usage: TokenUsage) -> None:
        """
        記錄 Token 使用量。
        1. 更新 chat_messages.token_usage
        2. 累加 chat_sessions.metadata.total_tokens
        3. 檢查使用者配額（從 billing_quota 讀取）
        4. 若超額 → 發送 SSE warning 事件
        """
    
    async def check_quota(self, user_id: str) -> QuotaStatus:
        """
        檢查使用者剩餘配額。
        回傳 { remaining_tokens, total_quota, usage_percentage }
        """
```

**關聯資料模型**：見 [06-data-model.md](./06-data-model.md) 中 `chat_messages.token_usage` 與 `chat_sessions.metadata.total_tokens`

### 9.5.4 健康檢查增強

Top Orchestrator `/health` 端點需回報所有下游服務連通性：

```python
@app.get("/health")
async def health_check():
    """
    回傳各下游服務的連通性狀態。
    """
    checks = {
        "arangodb": await check_arango_connection(),
        "mcp_tools": await check_service_health("http://localhost:8004/health"),
        "data_agent": await check_service_health("http://localhost:8003/health"),
        "knowledge_agent": await check_service_health("http://localhost:8007/health"),
        "llm_ollama": await check_service_health("http://localhost:11434/api/tags"),
        "tool_registry": {
            "status": "healthy",
            "tools_count": len(tool_registry._tools)
        }
    }
    
    all_healthy = all(c.get("status") == "healthy" for c in checks.values())
    
    return {
        "status": "healthy" if all_healthy else "degraded",
        "services": checks,
        "timestamp": datetime.utcnow().isoformat()
    }
```

> **注意**：下游服務 URL 從環境變數讀取（`AITASK_URL`、`DATA_AGENT_URL` 等），**不可硬編碼 localhost**。

---

## 9.6 實作檢查清單

AI Coder Agent 實作錯誤處理與安全模組時，請逐項確認：

- [ ] 14 個錯誤碼已在 Rust Gateway 與 Top Orchestrator 中定義
- [ ] SSE error 事件格式包含 `code`, `message`, `retryable`, `timestamp`
- [ ] 前端 SSEManager 處理 error 事件並依矩陣回應
- [ ] JWT Token 全鏈路傳遞（Gateway → Top Orch → 下游服務）
- [ ] `verify_session_ownership` 在所有會話操作中調用
- [ ] InputSanitizer 長度限制從 system_params 讀取
- [ ] 速率限制值從 system_params 讀取
- [ ] 所有 HTTP 請求附帶 X-Trace-Id
- [ ] structlog 日誌包含 trace_id、session_id
- [ ] TokenTracker 在每次 LLM 調用後記錄 usage
- [ ] 健康檢查端點覆蓋所有下游服務
