---
lastUpdate: 2026-03-27 10:17:47
author: Prometheus (AI Planning Agent)
version: 1.0.0
status: 正式版
parent: 00-index.md
---

# 04 — Path B：BPA 代理工作流

> **前置閱讀**: [00-index.md](./00-index.md)、[01-architecture.md](./01-architecture.md)、[02-protocol.md](./02-protocol.md)  
> **本文件涵蓋**: BPA 觸發路徑、bpa_orchestrator 節點、TASK_HANDOVER 訊息建構、BPA 回應處理、多輪互動流程、控制操作、已知問題修正  
> **相關規格**: `.docs/Spec/後台/BPA/material-management-bpa-spec.md`、`.docs/Spec/後台/top-orchestrator-spec-v2.md` §4

---

## 4.1 BPA 觸發路徑

BPA 工作流有兩種觸發方式：

| 觸發方式 | 入口 | 說明 |
|----------|------|------|
| **Path B-1: 瀏覽代理頁面** | `BrowseAgent.tsx` → handleChat(agentKey) | 使用者從代理列表選擇 BPA 代理 |
| **Path B-2: 開放聊天轉交** | Path A → classify_intent → "bpa_task" | LangGraph 意圖分類為 BPA 任務 |

---

## 4.2 BPA Orchestrator 節點（LangGraph 內）

當 Path A 路由至 BPA 或 Path B 直接觸發時，進入此節點：

```python
async def bpa_orchestrator_node(state: TopState) -> dict:
    writer = get_stream_writer()
    user_message = state["messages"][-1].content
    
    # === Step 1: 建構 TASK_HANDOVER ===
    handover = build_task_handover(
        schema_version="2.0",
        session_id=state["session_id"],
        user_id=state["user_id"],
        user_intent=user_message,
        entities=state["entities"],
        history=state["short_term_memory"][-6:],
        auth_context={
            "user_roles": get_user_roles(state["user_id"]),
            "scopes": get_user_scopes(state["user_id"]),
            "allowed_tools": get_allowed_tools(state["user_id"]),
            "rate_limit_quota": 100,
        },
    )
    
    writer({"type": "bpa_step_start", "message": "正在準備任務交接..."})
    
    # === Step 2: 發送 TASK_HANDOVER 至 BPA ===
    bpa_url = get_bpa_url(state["active_bpa"])  # e.g., http://localhost:8005
    
    response = await httpx_client.post(
        f"{bpa_url}/process",      # 注意：BPA 規格要求 /process 端點
        json=handover,
        headers={
            "Authorization": f"Bearer {get_jwt_token(state)}",
            "X-Trace-Id": state.get("trace_id"),
            "X-Session-Id": state["session_id"],
            "X-Handoff-Schema-Version": "2.0",
        },
        timeout=120.0,  # BPA 可能需要較長時間
    )
    
    result = response.json()
    
    # === Step 3: 處理 BPA 回應 ===
    return await handle_bpa_response(state, result, writer)
```

---

## 4.3 TASK_HANDOVER 訊息建構

完整的 TASK_HANDOVER 訊息格式（遵循 Top Orchestrator Spec v2 §4）：

```json
{
  "schema_version": "2.0",
  "message_id": "msg_th_001",
  "correlation_id": "corr_001",
  "type": "TASK_HANDOVER",
  "session_id": "ses_001",
  "user_id": "u_admin",
  "timestamp": "2026-03-27T10:00:00Z",
  
  "auth_context": {
    "user_roles": ["admin", "warehouse_manager"],
    "scopes": ["mm:read", "mm:write", "mm:approve"],
    "allowed_tools": ["calculator", "web_search"],
    "rate_limit_quota": 100
  },
  
  "handover_data": {
    "user_intent": "幫我執行台北倉的物料盤點",
    "initial_message": "幫我執行台北倉的物料盤點",
    
    "extracted_entities": {
      "warehouse": {
        "value": "台北倉",
        "source": "user_input",
        "evidence_span": "台北倉",
        "confidence": 0.98
      },
      "task_type": {
        "value": "inventory_count",
        "source": "intent_classification",
        "evidence_span": "物料盤點",
        "confidence": 0.95
      }
    },
    
    "top_level_subtasks": [
      {
        "id": "subtask_001",
        "description": "執行物料盤點流程",
        "bpa_hint": "mm_inventory_count"
      }
    ],
    
    "conversation_context": {
      "turn_count": 3,
      "topic": "物料管理",
      "language": "zh-TW"
    },
    
    "history": [
      {"role": "user", "content": "我想看看倉庫狀況", "timestamp": "..."},
      {"role": "assistant", "content": "請問您想查詢哪個倉庫？", "timestamp": "..."},
      {"role": "user", "content": "幫我執行台北倉的物料盤點", "timestamp": "..."}
    ]
  }
}
```

---

## 4.4 BPA 回應處理

BPA 可能回傳以下訊息類型，Top 需根據類型做不同處理：

```python
async def handle_bpa_response(state: TopState, result: dict, writer) -> dict:
    msg_type = result.get("type")
    
    match msg_type:
        case "BPA_ASK_USER":
            # BPA 需要使用者補充資訊
            writer({
                "type": "bpa_ask_user",
                "ask": result["ask"],
                "task_status": result.get("task_status"),
                "checkpoint_version": result.get("checkpoint_version"),
            })
            return {
                "bpa_state": "waiting_for_user",
                "checkpoint_version": result.get("checkpoint_version", state["checkpoint_version"]),
                "state_version": state["state_version"] + 1,
            }
        
        case "TASK_COMPLETE":
            writer({
                "type": "bpa_complete",
                "result": result["result"],
                "checkpoint_version": result.get("checkpoint_version"),
            })
            return {
                "bpa_state": "completed",
                "messages": [AIMessage(content=result["result"]["summary"])],
                "state_version": state["state_version"] + 1,
            }
        
        case "TASK_FAILED":
            writer({
                "type": "bpa_failed",
                "error": result["error"],
                "suggested_actions": result.get("suggested_actions", []),
            })
            return {
                "bpa_state": "failed",
                "messages": [AIMessage(content=f"任務失敗：{result['error']['message']}")],
            }
        
        case "BPA_RESPONSE":
            # BPA 中間回應（進度更新）
            writer({
                "type": "bpa_step_complete",
                "step": result.get("current_step"),
                "progress": result.get("progress"),
            })
            return {
                "bpa_state": "executing",
            }
```

---

## 4.5 BPA 多輪互動流程（BPA_ASK_USER → USER_MESSAGE）

當 BPA 發送 `BPA_ASK_USER` 時的完整流程：

```
1. BPA → Top: BPA_ASK_USER
   {
     "ask": {
       "question": "請選擇要查詢的倉庫",
       "input_type": "select",
       "options": [{"id":"wh01","label":"台北倉"}, {"id":"wh02","label":"高雄倉"}],
       "required": true,
       "timeout_seconds": 300,
       "default_value": "wh01"
     },
     "task_status": {"current_step": "query_inventory", "progress": 0.4},
     "checkpoint_version": 3
   }

2. Top → 前端: SSE event "bpa_ask_user" (包含上述 ask 結構)

3. 前端: ChatOrchestrator 切換至 bpa_param_collection 模式
   - 顯示 select 控件（台北倉/高雄倉）
   - 顯示超時倒數計時（300 秒）
   - 使用者選擇後提交

4. 前端 → Top: POST /api/v1/chat/bpa/reply
   {
     "session_id": "ses_001",
     "message": "台北倉",
     "reply_to_checkpoint": 3,
     "state_version": 3,
     "context_delta": {
       "new_entities": {"warehouse": {"value": "wh01", "label": "台北倉"}},
       "updated_preferences": {}
     }
   }

5. Top: 建構 USER_MESSAGE → 發送至 BPA
   {
     "schema_version": "2.0",
     "type": "USER_MESSAGE",
     "message_id": "msg_um_002",
     "session_id": "ses_001",
     "bpa_id": "mm_agent",
     "state_version": 4,
     "message": {"role": "user", "content": "台北倉", "timestamp": "..."},
     "context_delta": {
       "new_entities": {"warehouse": {"value": "wh01", "label": "台北倉"}},
       "updated_preferences": {}
     }
   }

6. Top 發送 USER_MESSAGE 至 BPA: POST {bpa_url}/session/{session_id}/message

7. BPA 繼續執行，可能再次 BPA_ASK_USER 或最終 TASK_COMPLETE/TASK_FAILED
```

> **前端 BPA 模式詳細行為**：見 [05-frontend-orchestrator.md](./05-frontend-orchestrator.md) §5.5.3。

---

## 4.6 BPA 控制操作

使用者可以在 BPA 執行過程中發送控制指令：

| 操作 | 前端觸發 | Top 行為 | BPA 端點 |
|------|----------|----------|----------|
| **取消** | 點擊「停止」按鈕 | 發送 TASK_CANCEL | `POST /session/{session_id}/cancel` |
| **暫停** | 點擊「暫停」按鈕 | 發送 TASK_PAUSE | `POST /session/{session_id}/pause` |
| **恢復** | 點擊「繼續」按鈕 | 發送 TASK_RESUME | `POST /session/{session_id}/resume` |

### TASK_CANCEL 訊息

```json
{
  "schema_version": "2.0",
  "type": "TASK_CANCEL",
  "message_id": "msg_cancel_001",
  "session_id": "ses_001",
  "reason": "使用者手動取消",
  "checkpoint_version": 3,
  "timestamp": "2026-03-27T10:05:00Z"
}
```

> **API 端點規格**：見 [08-api-endpoints.md](./08-api-endpoints.md) §8.2.7。

---

## 4.7 已知問題修正

### ai_proxy.forward_bpa 端點不匹配

**問題**: `api/src/services/ai_proxy.rs` 的 `forward_bpa` 呼叫 `{bpa_url}/start`（第 114 行），但 BPA 規格要求 `/process`。

**修正**: 將 `forward_bpa` 的端點從 `/start` 改為 `/process`，或根據 BPA spec 改為：
- 新任務：`POST /process`（接收 TASK_HANDOVER）
- 多輪回覆：`POST /session/{session_id}/message`（接收 USER_MESSAGE）
- 控制操作：`POST /session/{session_id}/cancel|pause|resume`

---

> **前端如何呈現 BPA 流程**：見 [05-frontend-orchestrator.md](./05-frontend-orchestrator.md)。  
> **BPA 完整 SSE 範例**：見 [11-appendix.md](./11-appendix.md) §11.2。
