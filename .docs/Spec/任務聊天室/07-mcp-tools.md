---
lastUpdate: 2026-03-27 10:17:47
author: Prometheus (AI Planning Agent)
version: 1.0.0
status: 正式版
parent: 00-index.md
---

# 07 — MCP / 工具整合與 Agent Tool Calling

> **前置閱讀**: [00-index.md](./00-index.md)、[01-architecture.md](./01-architecture.md)  
> **本文件涵蓋**: 統一工具抽象層、ToolDefinition 格式、ToolRegistry 實作、4 種 Executor（MCP/DA/KA/Builtin）、LangGraph tool node 整合、LLM Function Calling 配置、工具安全與權限控制、工具列表維護

---

## 7.1 統一工具抽象層

Top Orchestrator 需要統一封裝不同來源的工具，使 LangGraph 節點可以透過一致的介面調用：

```
┌─────────────────────────────────────────────────────────────────┐
│                    ToolRegistry (統一工具註冊表)                   │
│                                                                   │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ MCP Tools    │  │ Data Agent   │  │ Knowledge Agent      │   │
│  │ (port 8004)  │  │ (port 8003)  │  │ (port 8007)          │   │
│  │              │  │              │  │                      │   │
│  │ - inventory  │  │ - nl2sql     │  │ - kb_search          │   │
│  │ - erp_query  │  │ - data_viz   │  │ - doc_retrieval      │   │
│  │ - calc       │  │              │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
│                                                                   │
│  統一介面：ToolDefinition + execute(name, args) → ToolResult      │
└─────────────────────────────────────────────────────────────────┘
```

---

## 7.2 ToolDefinition 標準格式

參照 MCP `Tool` 定義 + OpenAI Function Calling 格式，建立統一標準：

```python
# ai-services/aitask/tools/registry.py

from pydantic import BaseModel, Field
from typing import Any, Optional
from enum import Enum

class ToolSource(str, Enum):
    MCP = "mcp"               # MCP Tools Service (port 8004)
    DATA_AGENT = "data_agent" # Data Agent (port 8003)
    KNOWLEDGE = "knowledge"   # Knowledge Agent (port 8007)
    BUILTIN = "builtin"       # Top Orchestrator 內建工具

class ToolDefinition(BaseModel):
    """統一工具定義（供 LLM function calling 使用）"""
    name: str                              # 工具唯一名稱
    description: str                       # 工具描述（供 LLM 判斷何時使用）
    source: ToolSource                     # 工具來源
    
    parameters: dict[str, Any]             # JSON Schema 格式的參數定義
    # 範例：{
    #   "type": "object",
    #   "properties": {
    #     "keyword": {"type": "string", "description": "搜尋關鍵字"},
    #     "warehouse": {"type": "string", "enum": ["A", "B", "C"]}
    #   },
    #   "required": ["keyword"]
    # }
    
    requires_auth: bool = True             # 是否需要使用者授權
    timeout_seconds: int = 30              # 執行超時
    retry_config: Optional[dict] = None    # 重試策略
    
    # MCP 特有欄位
    mcp_endpoint: Optional[str] = None     # MCP service endpoint
    
    # 中繼資料
    category: str = "general"              # 分類（inventory, finance, knowledge, data）
    version: str = "1.0.0"

class ToolResult(BaseModel):
    """統一工具執行結果"""
    tool_name: str
    tool_call_id: str                      # 對應 LLM 的 tool_call_id
    success: bool
    result: Any                            # 成功時的結果
    error: Optional[str] = None            # 失敗時的錯誤訊息
    duration_ms: int = 0
    
    # 來源追蹤
    source: ToolSource
    trace_id: Optional[str] = None
```

---

## 7.3 ToolRegistry 實作

```python
# ai-services/aitask/tools/registry.py

class ToolRegistry:
    """
    統一工具註冊表。
    
    啟動時從各服務拉取可用工具清單，
    提供 LangGraph 節點使用的 tool 列表（轉換為 LangChain Tool 格式）。
    """
    
    def __init__(self):
        self._tools: dict[str, ToolDefinition] = {}
        self._executors: dict[ToolSource, ToolExecutor] = {}
    
    async def initialize(self) -> None:
        """
        啟動時呼叫，從各服務取得工具清單。
        
        1. GET http://localhost:8004/tools → MCP 工具列表
        2. 靜態註冊 Data Agent 工具（da_query, da_visualize）
        3. 靜態註冊 Knowledge Agent 工具（ka_search, ka_doc_retrieve）
        4. 註冊內建工具（current_time, session_summary）
        """
    
    async def refresh(self) -> None:
        """熱更新工具列表（無需重啟）"""
    
    def get_tools_for_llm(self) -> list[dict]:
        """
        轉換為 LLM function calling 格式。
        
        Returns:
            OpenAI-compatible tools list:
            [
              {
                "type": "function",
                "function": {
                  "name": "mcp_inventory_search",
                  "description": "搜尋物料庫存...",
                  "parameters": { ... JSON Schema ... }
                }
              }
            ]
        """
    
    def get_langchain_tools(self) -> list[BaseTool]:
        """
        轉換為 LangChain Tool 格式（供 LangGraph bind_tools 使用）。
        每個工具包裝為 StructuredTool，execute 時透過對應 executor 調用。
        """
    
    async def execute(self, tool_name: str, arguments: dict, 
                      context: ToolExecutionContext) -> ToolResult:
        """
        統一執行入口。根據 tool_name 找到對應 executor 並執行。
        """

class ToolExecutionContext(BaseModel):
    """工具執行上下文（攜帶認證、追蹤資訊）"""
    user_id: str
    session_id: str
    trace_id: str
    auth_token: str
    correlation_id: str
```

---

## 7.4 各來源工具執行器

### 7.4.1 MCP Tools Executor

```python
# ai-services/aitask/tools/executors/mcp_executor.py

class MCPToolExecutor(ToolExecutor):
    """
    呼叫 MCP Tools Service (port 8004)。
    
    對應端點：
    - POST /execute       — 單一工具執行
    - POST /execute-batch — 批次執行（當 LLM 同時調用多個工具時）
    """
    
    async def execute(self, tool_name: str, arguments: dict,
                      context: ToolExecutionContext) -> ToolResult:
        """
        POST http://localhost:8004/execute
        Body: {
          "tool": tool_name,
          "params": arguments,
          "context": {
            "user_id": context.user_id,
            "trace_id": context.trace_id
          }
        }
        
        Response: {
          "tool": "inventory_search",
          "success": true,
          "result": { ... },
          "error": null
        }
        """
    
    async def execute_batch(self, calls: list[ToolCall],
                            context: ToolExecutionContext) -> list[ToolResult]:
        """
        POST http://localhost:8004/execute-batch
        用於 LLM 在單一回應中調用多個工具的情況。
        MCP service 會並行執行並回傳結果列表。
        """
```

### 7.4.2 Data Agent Executor

```python
# ai-services/aitask/tools/executors/da_executor.py

class DataAgentExecutor(ToolExecutor):
    """
    呼叫 Data Agent (port 8003)。
    
    對應端點：
    - POST /query — 自然語言查詢
    
    Required Headers (Handoff v2.0):
    - Authorization: Bearer {token}
    - X-Trace-Id: {trace_id}
    - X-Session-Id: {session_id}
    - X-Handoff-Schema-Version: 2.0
    """
    
    async def execute(self, tool_name: str, arguments: dict,
                      context: ToolExecutionContext) -> ToolResult:
        """
        tool_name: "da_query"
        arguments: { "question": "上個月 A 倉庫的螺絲出貨量" }
        
        POST http://localhost:8003/query
        Headers: { X-Trace-Id, X-Session-Id, X-Handoff-Schema-Version: "2.0", Authorization }
        Body: {
          "question": arguments["question"],
          "session_id": context.session_id,
          "user_id": context.user_id
        }
        
        Response: {
          "code": 0,
          "data": {
            "sql": "SELECT ...",
            "results": [...],
            "metadata": { "row_count": 15, "execution_time_ms": 120 }
          },
          "intent": "data_query",
          "cache_hit": false
        }
        
        ToolResult.result 包含 sql + results（前端可展示 SQL 和資料表格）
        """
```

### 7.4.3 Knowledge Agent Executor

```python
# ai-services/aitask/tools/executors/ka_executor.py

class KnowledgeAgentExecutor(ToolExecutor):
    """
    呼叫 Knowledge Agent (port 8007)。
    
    對應端點：
    - POST /search — 知識庫向量搜尋
    - POST /retrieve — 文件擷取
    """
    
    async def execute(self, tool_name: str, arguments: dict,
                      context: ToolExecutionContext) -> ToolResult:
        """
        tool_name: "ka_search"
        arguments: { "query": "安全庫存計算公式", "kb_ids": ["kb_material"] }
        
        POST http://localhost:8007/search
        Body: {
          "query": arguments["query"],
          "kb_ids": arguments.get("kb_ids", []),
          "top_k": arguments.get("top_k", 5),
          "session_id": context.session_id
        }
        
        Response: {
          "results": [
            {
              "content": "安全庫存 = 平均日需求量 × ...",
              "source": "物料管理手冊.pdf",
              "relevance_score": 0.92,
              "chunk_id": "chunk_001"
            }
          ]
        }
        
        ToolResult.result 包含 results（前端可展示來源引用）
        """
```

---

## 7.5 LangGraph Tool Node 整合

```python
# ai-services/aitask/graph/nodes/tool_executor.py

from langgraph.prebuilt import ToolNode
from langchain_core.messages import ToolMessage

async def tool_executor_node(state: TopState) -> dict:
    """
    LangGraph 工具執行節點。
    
    從最後一條 AIMessage 中提取 tool_calls，
    透過 ToolRegistry 統一調用，回傳 ToolMessage 列表。
    
    同時透過 SSE stream_writer 發送即時事件：
    - tool_call: 工具開始執行
    - tool_result: 工具執行完成
    """
    last_message = state["messages"][-1]
    tool_calls = last_message.tool_calls
    
    context = ToolExecutionContext(
        user_id=state["user_id"],
        session_id=state["session_id"],
        trace_id=state.get("trace_id", ""),
        auth_token=state.get("auth_token", ""),
        correlation_id=state.get("correlation_id", "")
    )
    
    results: list[ToolMessage] = []
    stream_writer = state.get("stream_writer")
    
    for call in tool_calls:
        # 發送 tool_call 開始事件
        if stream_writer:
            await stream_writer({
                "event": "tool_call",
                "data": {
                    "tool_name": call["name"],
                    "tool_id": call["id"],
                    "arguments": call["args"]
                }
            })
        
        # 執行工具
        result = await tool_registry.execute(
            tool_name=call["name"],
            arguments=call["args"],
            context=context
        )
        
        # 發送 tool_result 事件
        if stream_writer:
            await stream_writer({
                "event": "tool_result",
                "data": {
                    "tool_id": call["id"],
                    "tool_name": call["name"],
                    "success": result.success,
                    "result": str(result.result)[:500],  # 截斷避免過大
                    "duration_ms": result.duration_ms
                }
            })
        
        # 轉換為 LangChain ToolMessage
        results.append(ToolMessage(
            content=json.dumps(result.result) if result.success else f"Error: {result.error}",
            tool_call_id=call["id"],
            name=call["name"]
        ))
    
    return {"messages": results, "tool_results": results}
```

---

## 7.6 LLM Function Calling 配置

```python
# ai-services/aitask/graph/nodes/chat_responder.py

async def chat_responder_node(state: TopState) -> dict:
    """
    聊天回應節點 — 綁定工具定義，讓 LLM 決定是否調用工具。
    """
    # 從 ToolRegistry 取得 LangChain 格式的工具
    tools = tool_registry.get_langchain_tools()
    
    # 綁定工具到 LLM
    llm_with_tools = llm.bind_tools(tools)
    
    # 建構系統提示（包含工具使用指引）
    system_prompt = build_system_prompt(
        mode=state["mode"],
        intent=state.get("intent"),
        available_tools=[t.name for t in tools],
        memory_summary=state.get("memory_summary", "")
    )
    
    # 調用 LLM（支援 SSE 串流）
    response = await llm_with_tools.ainvoke(
        [SystemMessage(content=system_prompt)] + state["messages"]
    )
    
    return {"messages": [response]}
```

### 條件路由（工具調用判斷）

```python
def should_use_tools(state: TopState) -> str:
    """
    LangGraph 條件邊：判斷最後一條訊息是否包含 tool_calls。
    
    Returns:
        "tool_executor" — 有工具調用，進入工具執行節點
        "memory_manager" — 無工具調用，進入記憶管理
    """
    last_message = state["messages"][-1]
    if hasattr(last_message, "tool_calls") and last_message.tool_calls:
        return "tool_executor"
    return "memory_manager"
```

---

## 7.7 工具安全與權限控制

```python
class ToolPermissionChecker:
    """
    工具調用權限檢查。
    
    1. 使用者角色 → 可用工具集（從 ArangoDB roles collection 讀取）
    2. 敏感工具需要額外確認（如寫入操作）
    3. 速率限制（每使用者每分鐘最多 N 次工具調用）
    """
    
    async def check_permission(self, user_id: str, tool_name: str) -> bool:
        """檢查使用者是否有權限調用指定工具"""
    
    async def check_rate_limit(self, user_id: str) -> bool:
        """檢查使用者工具調用速率是否超限"""
    
    def is_sensitive_tool(self, tool_name: str) -> bool:
        """
        判斷是否為敏感工具（寫入類操作）。
        敏感工具需要 Human-in-the-Loop 確認。
        
        例如：erp_create_order, erp_update_inventory
        """
```

> **錯誤碼 TOOL_001/TOOL_002**：見 [09-error-security.md](./09-error-security.md) §9.1.1。

---

## 7.8 工具列表維護

工具定義存放位置與更新策略：

| 工具來源 | 定義位置 | 更新方式 |
|---------|---------|---------|
| MCP Tools | `mcp_tools/main.py` TOOL_REGISTRY | 修改後重啟服務，或呼叫 `/refresh` |
| Data Agent | 靜態定義於 ToolRegistry.initialize() | Top Orchestrator 重啟時載入 |
| Knowledge Agent | 靜態定義於 ToolRegistry.initialize() | Top Orchestrator 重啟時載入 |
| 內建工具 | `aitask/tools/builtin/` 目錄 | Top Orchestrator 重啟時載入 |

**未來擴展**：將工具定義存入 ArangoDB `tool_definitions` collection，支援動態註冊/停用工具，無需重啟服務。

---

> **工具調用 SSE 事件格式**：見 [02-protocol.md](./02-protocol.md) §2.2。  
> **前端工具調用 UI**：見 [05-frontend-orchestrator.md](./05-frontend-orchestrator.md) §5.5.1。
