---
lastUpdate: 2026-03-27 10:17:47
author: Prometheus (AI Planning Agent)
version: 1.0.0
status: 正式版
parent: 00-index.md
---

# 03 — Path A：開放聊天（LangGraph）

> **前置閱讀**: [00-index.md](./00-index.md)、[01-architecture.md](./01-architecture.md)、[02-protocol.md](./02-protocol.md)  
> **本文件涵蓋**: TopState 定義、LangGraph 圖結構、8 個節點實作、三層意圖分類、指代消解、記憶管理、SSE 串流整合

---

## 3.1 LangGraph 狀態定義

Top Orchestrator 的核心狀態模型，基於 LangGraph `StateGraph` 實作：

```python
from typing import TypedDict, Annotated, Literal, Optional
from operator import add
from langgraph.graph import add_messages

class TopState(TypedDict):
    """Top Orchestrator 核心狀態（LangGraph State）"""
    # === 會話識別 ===
    session_id: str
    user_id: str
    mode: Literal["chat", "task"]                     # chat=開放聊天, task=BPA任務
    
    # === 訊息歷史（SSOT）===
    messages: Annotated[list, add_messages]            # LangGraph 訊息累加器
    
    # === 意圖與實體 ===
    current_intent: Optional[str]                      # 當前意圖分類結果
    intent_confidence: float                           # 意圖信心度
    intent_method: Literal["rule", "semantic", "llm"]  # 分類方法
    entities: dict                                     # 提取的實體（累積）
    coreference_resolved: bool                         # 是否已完成指代消解
    context_entities: dict                             # 指代消解追蹤實體
    
    # === BPA 工作流狀態 ===
    active_bpa: Optional[str]                          # 當前活躍的 BPA agent_key
    bpa_workflow_id: Optional[str]                     # BPA 工作流 ID
    bpa_state: Literal["idle", "executing", "waiting_for_user", "completed", "failed"]
    
    # === 工具調用 ===
    tool_results: list[dict]                           # 工具調用結果記錄
    pending_tool_calls: list[dict]                     # 待執行的工具調用
    
    # === 記憶管理 ===
    short_term_memory: list[dict]                      # 近期記憶（最近 N 輪）
    long_term_memory: list[dict]                       # 長期記憶（摘要）
    memory_turn_count: int                             # 當前對話輪數
    
    # === 協議欄位 ===
    protocol_version: str                              # "2.0"
    state_version: int                                 # 狀態版本號（遞增）
    checkpoint_version: int                            # Checkpoint 版本號
```

---

## 3.2 LangGraph 圖結構

```python
from langgraph.graph import StateGraph, START, END

graph = StateGraph(TopState)

# === 節點定義 ===
graph.add_node("classify_intent", classify_intent_node)
graph.add_node("resolve_coreference", resolve_coreference_node)
graph.add_node("chat_responder", chat_responder_node)
graph.add_node("tool_executor", tool_executor_node)
graph.add_node("bpa_orchestrator", bpa_orchestrator_node)
graph.add_node("da_query", da_query_node)
graph.add_node("ka_search", ka_search_node)
graph.add_node("memory_manager", memory_manager_node)

# === 邊定義 ===
graph.add_edge(START, "classify_intent")
graph.add_edge("classify_intent", "resolve_coreference")

# 意圖路由（條件邊）
graph.add_conditional_edges(
    "resolve_coreference",
    route_by_intent,
    {
        "general_chat": "chat_responder",
        "data_query":   "da_query",
        "knowledge":    "ka_search",
        "tool_use":     "tool_executor",
        "bpa_task":     "bpa_orchestrator",
    }
)

# 所有終端節點 → 記憶管理 → 結束
graph.add_edge("chat_responder",   "memory_manager")
graph.add_edge("da_query",         "memory_manager")
graph.add_edge("ka_search",        "memory_manager")
graph.add_edge("tool_executor",    "memory_manager")
graph.add_edge("bpa_orchestrator", "memory_manager")
graph.add_edge("memory_manager",   END)

# 編譯（附帶 ArangoDB Checkpointer）
app = graph.compile(checkpointer=arango_checkpointer)
```

**圖結構視覺化**：

```
START
  │
  ▼
classify_intent
  │
  ▼
resolve_coreference
  │
  ├─ intent="general_chat" ──→ chat_responder ──┐
  ├─ intent="data_query"   ──→ da_query ────────┤
  ├─ intent="knowledge"    ──→ ka_search ───────┤
  ├─ intent="tool_use"     ──→ tool_executor ───┤
  └─ intent="bpa_task"     ──→ bpa_orchestrator ┤
                                                 │
                                                 ▼
                                          memory_manager
                                                 │
                                                 ▼
                                                END
```

---

## 3.3 意圖分類節點 (classify_intent)

採用**三層分級路由**策略（參考業界最佳實踐），由上到下逐層 fallback：

### Layer 1：規則匹配（0ms 延遲，$0 成本）

```python
RULE_PATTERNS = {
    "bpa_task": {
        "keywords": ["採購單", "收貨", "盤點", "物料", "庫存管理"],
        "patterns": [r"執行.*流程", r"啟動.*代理", r"運行.*BPA"],
    },
    "data_query": {
        "keywords": ["查詢", "多少", "統計", "報表", "列出"],
        "patterns": [r"查.*數據", r"有多少.*", r".*的(數量|金額|總計)"],
    },
    "knowledge": {
        "keywords": ["文件", "規範", "政策", "標準作業", "SOP"],
        "patterns": [r"根據.*文件", r".*規定是什麼"],
    },
    "tool_use": {
        "keywords": ["計算", "搜尋", "天氣"],
        "patterns": [r"幫我計算.*", r"搜尋.*"],
    },
}
```

### Layer 2：語意路由（5-10ms，~$0.0001）

使用 Qdrant 向量相似度匹配預先嵌入的意圖範例：

```python
# 預先嵌入的意圖範例（存於 Qdrant intent_embeddings collection）
INTENT_EXAMPLES = {
    "data_query": [
        "本月採購單有幾筆",
        "查詢台北倉庫存量",
        "上季度的收貨統計",
    ],
    "bpa_task": [
        "幫我執行物料盤點",
        "啟動採購單流程",
    ],
    # ...
}

# 查詢時：
# 1. 嵌入使用者訊息
# 2. 在 intent_embeddings 中做 ANN 搜尋
# 3. 如果最高相似度 > 0.80，回傳該意圖
```

### Layer 3：LLM 分類器（500-1000ms，~$0.001）

```python
CLASSIFY_PROMPT = """
你是一個意圖分類器。將使用者訊息分類為以下意圖之一：
- general_chat: 一般聊天、問候、閒聊
- data_query: 查詢數據、統計、報表
- knowledge: 查詢文件、規範、SOP
- tool_use: 計算、搜尋等工具操作
- bpa_task: 執行企業流程（採購、收貨、盤點等）

使用者訊息: {user_message}
對話歷史: {recent_history}
已知實體: {entities}

回傳 JSON: {"intent": "...", "confidence": 0.XX, "entities": {...}}
"""
```

### 路由決策邏輯

```python
def classify_intent_node(state: TopState) -> dict:
    user_message = state["messages"][-1].content
    
    # Layer 1: 規則匹配
    rule_result = rule_based_classify(user_message)
    if rule_result and rule_result["confidence"] >= 0.95:
        return {"current_intent": rule_result["intent"], 
                "intent_confidence": rule_result["confidence"],
                "intent_method": "rule"}
    
    # Layer 2: 語意路由
    semantic_result = semantic_classify(user_message)
    if semantic_result and semantic_result["confidence"] >= 0.80:
        return {"current_intent": semantic_result["intent"],
                "intent_confidence": semantic_result["confidence"],
                "intent_method": "semantic"}
    
    # Layer 3: LLM 分類
    llm_result = llm_classify(user_message, state)
    return {"current_intent": llm_result["intent"],
            "intent_confidence": llm_result["confidence"],
            "intent_method": "llm",
            "entities": {**state["entities"], **llm_result.get("entities", {})}}
```

---

## 3.4 指代消解節點 (resolve_coreference)

處理多輪對話中的指代詞（「它」「那個」「上面提到的」等）：

```python
def resolve_coreference_node(state: TopState) -> dict:
    user_message = state["messages"][-1].content
    
    # 快速檢查：是否包含指代詞
    COREFERENCE_MARKERS = ["它", "那個", "這個", "上面", "剛才", "前面提到的", "同一個"]
    has_coreference = any(marker in user_message for marker in COREFERENCE_MARKERS)
    
    if not has_coreference:
        return {"coreference_resolved": True}
    
    # 使用 LLM 進行指代消解
    resolved = llm_resolve_coreference(
        current_message=user_message,
        context_entities=state["context_entities"],
        recent_messages=state["messages"][-6:],  # 最近 3 輪
    )
    
    # 更新消解後的實體
    return {
        "coreference_resolved": True,
        "context_entities": {**state["context_entities"], **resolved["entities"]},
        "entities": {**state["entities"], **resolved["entities"]},
    }
```

**指代消解 Prompt**：

```python
COREFERENCE_PROMPT = """
解析以下對話中的指代詞，將其替換為明確的實體引用。

近期對話:
{recent_messages}

當前已知實體:
{context_entities}

當前訊息: {current_message}

回傳 JSON:
{
  "resolved_message": "消解後的完整訊息",
  "entities": {
    "entity_name": {
      "value": "實際值",
      "source": "coreference",
      "original_reference": "它/那個/...",
      "confidence": 0.XX
    }
  }
}
"""
```

---

## 3.5 聊天回應節點 (chat_responder)

一般聊天回應，支援 SSE 串流：

```python
async def chat_responder_node(state: TopState) -> dict:
    writer = get_stream_writer()  # LangGraph stream writer
    
    # 建構 system prompt
    system_prompt = build_system_prompt(
        user_id=state["user_id"],
        entities=state["entities"],
        short_term_memory=state["short_term_memory"],
    )
    
    # 串流 LLM 回應
    full_response = ""
    async for chunk in llm.astream([
        {"role": "system", "content": system_prompt},
        *state["messages"][-10:],  # 最近 5 輪
    ]):
        full_response += chunk.content
        # 透過 stream_writer 發送 chat_chunk 事件
        writer({"type": "chat_chunk", "content": chunk.content})
    
    # 發送完成事件
    writer({"type": "chat_complete", "message_id": generate_message_id()})
    
    return {
        "messages": [AIMessage(content=full_response)],
        "state_version": state["state_version"] + 1,
    }
```

---

## 3.6 工具執行節點 (tool_executor)

整合 MCP Tools 服務 (port 8004)。詳細工具整合設計見 [07-mcp-tools.md](./07-mcp-tools.md)。

```python
async def tool_executor_node(state: TopState) -> dict:
    writer = get_stream_writer()
    user_message = state["messages"][-1].content
    
    # Step 1: LLM 決定要調用哪些工具
    tool_plan = await plan_tool_calls(user_message, state["entities"])
    
    results = []
    for tool_call in tool_plan["calls"]:
        # 發送工具調用開始事件
        writer({
            "type": "tool_call_start",
            "tool": tool_call["tool"],
            "parameters": tool_call["parameters"],
        })
        
        # Step 2: 呼叫 MCP Tools 服務
        result = await call_mcp_tool(
            tool=tool_call["tool"],
            parameters=tool_call["parameters"],
        )
        
        # 發送工具調用結果
        writer({
            "type": "tool_call_result",
            "tool": tool_call["tool"],
            "success": result["success"],
            "result": result["result"],
        })
        results.append(result)
    
    # Step 3: LLM 彙整工具結果為自然語言回應
    summary = await summarize_tool_results(user_message, results)
    writer({"type": "chat_chunk", "content": summary})
    writer({"type": "chat_complete"})
    
    return {
        "messages": [AIMessage(content=summary)],
        "tool_results": results,
        "state_version": state["state_version"] + 1,
    }
```

---

## 3.7 資料查詢節點 (da_query)

整合 Data Agent (port 8003)。DA 端點規格見 `.docs/Spec/後台/DA/data-agent-spec-v2.md`。

```python
async def da_query_node(state: TopState) -> dict:
    writer = get_stream_writer()
    user_message = state["messages"][-1].content
    
    writer({"type": "da_query_start", "query": user_message})
    
    # 呼叫 DA (遵循 DA v2 協議)
    da_response = await httpx_client.post(
        f"{DA_URL}/query/query",
        json={
            "query": user_message,
            "session_id": state["session_id"],
            "user_id": state["user_id"],
            "options": {
                "module_scope": extract_module_scope(state["entities"]),
                "timezone": "Asia/Taipei",
                "limit": 100,
                "return_debug": False,
            },
        },
        headers={
            "Authorization": f"Bearer {get_jwt_token(state)}",
            "X-Trace-Id": state.get("trace_id", generate_trace_id()),
            "X-Session-Id": state["session_id"],
            "X-Handoff-Schema-Version": "2.0",
        },
        timeout=30.0,
    )
    
    result = da_response.json()
    
    if result.get("code") == 0:
        # 成功：發送結果
        writer({
            "type": "da_query_result",
            "sql": result["data"].get("sql"),
            "results": result["data"]["results"],
            "metadata": result["data"].get("metadata"),
            "intent": result.get("intent"),
        })
        
        # LLM 解釋查詢結果
        explanation = await explain_query_results(user_message, result["data"])
        writer({"type": "chat_chunk", "content": explanation})
        writer({"type": "chat_complete"})
        
        return {
            "messages": [AIMessage(content=explanation)],
            "state_version": state["state_version"] + 1,
        }
    else:
        # 失敗：發送錯誤
        writer({
            "type": "error",
            "code": result.get("code", "DA_UNKNOWN_ERROR"),
            "message": result.get("message", "資料查詢失敗"),
        })
        return {
            "messages": [AIMessage(content=f"查詢失敗：{result.get('message')}")],
        }
```

---

## 3.8 知識檢索節點 (ka_search)

整合 Knowledge Agent (port 8007)：

```python
async def ka_search_node(state: TopState) -> dict:
    writer = get_stream_writer()
    user_message = state["messages"][-1].content
    
    # 呼叫 KA
    ka_response = await httpx_client.post(
        f"{KA_URL}/query",
        json={
            "query": user_message,
            "session_id": state["session_id"],
            "top_k": 5,
        },
        headers={
            "Authorization": f"Bearer {get_jwt_token(state)}",
            "X-Trace-Id": state.get("trace_id", generate_trace_id()),
            "X-Session-Id": state["session_id"],
        },
        timeout=30.0,
    )
    
    result = ka_response.json()
    
    # 發送知識檢索結果
    writer({
        "type": "ka_search_result",
        "chunks": result.get("chunks", []),
        "sources": result.get("sources", []),
    })
    
    # LLM 基於知識片段生成回應（RAG）
    rag_response = await generate_rag_response(user_message, result.get("chunks", []))
    writer({"type": "chat_chunk", "content": rag_response})
    writer({"type": "chat_complete"})
    
    return {
        "messages": [AIMessage(content=rag_response)],
        "state_version": state["state_version"] + 1,
    }
```

---

## 3.9 記憶管理節點 (memory_manager)

管理對話記憶，防止 context window 溢出：

```python
async def memory_manager_node(state: TopState) -> dict:
    turn_count = state["memory_turn_count"] + 1
    
    # 策略 1: 滑動窗口（保留最近 10 輪 = 20 條訊息）
    MAX_SHORT_TERM = 20
    if len(state["messages"]) > MAX_SHORT_TERM:
        # 策略 2: 將較早的訊息摘要化
        old_messages = state["messages"][:-MAX_SHORT_TERM]
        summary = await summarize_conversation(old_messages)
        
        return {
            "short_term_memory": state["messages"][-MAX_SHORT_TERM:],
            "long_term_memory": state["long_term_memory"] + [{
                "summary": summary,
                "turn_range": f"{turn_count - len(old_messages)}-{turn_count - MAX_SHORT_TERM // 2}",
                "timestamp": datetime.utcnow().isoformat(),
            }],
            "memory_turn_count": turn_count,
            "state_version": state["state_version"] + 1,
        }
    
    return {
        "memory_turn_count": turn_count,
    }
```

**記憶管理策略**：

| 策略 | 觸發條件 | 行為 |
|------|----------|------|
| 滑動窗口 | messages > 20 | 保留最近 20 條，其餘進入摘要 |
| 對話摘要 | 超出窗口的訊息 | LLM 摘要後存入 long_term_memory |
| 實體追蹤 | 每輪對話 | 持續更新 context_entities |
| Checkpoint | 每個節點完成後 | ArangoDB Checkpointer 自動儲存 |

> **配置參數**：`MAX_SHORT_TERM` 應從 `system_params.chat.max_messages_in_context` 讀取，預設 20。見 [11-appendix.md](./11-appendix.md) §11.3。

---

## 3.10 SSE 串流整合

Top Orchestrator 透過 `astream_events(version="v2")` 將 LangGraph 事件轉換為 SSE：

```python
# FastAPI 端點
@app.post("/chat/stream")
async def chat_stream(request: ChatRequest):
    config = {
        "configurable": {
            "thread_id": request.session_id,
        }
    }
    
    async def event_generator():
        async for event in app.astream_events(
            {"messages": [HumanMessage(content=request.message)]},
            config=config,
            version="v2",
        ):
            # 轉換 LangGraph 事件為 SSE 格式
            sse_event = convert_to_sse(event)
            if sse_event:
                yield f"event: {sse_event['type']}\ndata: {json.dumps(sse_event['data'])}\n\n"
        
        # 結束事件
        yield f"event: chat_complete\ndata: {json.dumps({'session_id': request.session_id})}\n\n"
    
    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
```

> **SSE 事件格式詳細定義**：見 [02-protocol.md](./02-protocol.md) §2.2。  
> **SSE 完整對話範例**：見 [11-appendix.md](./11-appendix.md) §11.1。

---

> **下一步**：若使用者意圖被路由至 `bpa_task`，進入 [04-path-b-bpa-workflow.md](./04-path-b-bpa-workflow.md)。
