---
lastUpdate: 2026-03-27 15:30:00
author: Daniel Chung
version: 1.0.0
status: 草稿
parent: 00-index.md
---

# 12 — 檔案上傳與知識向量化（Phase 8）

> **前置閱讀**: [00-index.md](./00-index.md)  
> **本文件涵蓋**: 檔案上傳流程、向量化/圖譜處理、Queue Work 架構、儲存目標（SeaWeedFS / ArangoDB / Qdrant）  
> **設計原則**: Chat Session 視為「臨時/私有 Knowledge Root」，所有資料打 `session_key` 標籤

---

## 12.1 設計原則與核心決策

> ⚠️ **重要發現**：系統已有 5W1H 實作存在於 `ai-services/aitask/main.py`（`TAG_5W1H_PROMPT` + `/v1/chat/tag-5w1h` 端點）。Session 上傳檔案的圖譜抽取應重複使用此端點，無需另起爐灶。

### 為何避免 Per-Session Collection？

動態建立大量 Per-Session Collection（每個 Session 一組 ArangoDB collection / Qdrant collection）是標準 **Anti-Pattern**：

| 問題 | 說明 |
|------|------|
| Qdrant | 每個 Collection 獨立維護 HNSW 索引 + WAL，空集合也佔用數十 MB 記憶體。千個 Session → OOM |
| ArangoDB | Collection 數量影響叢集元資料管理，大幅增加備份 / 遷移成本 |

**正確做法**: 共用集合 + `session_key` 欄位過濾

### 架構總覽

```
使用者上傳檔案
    │
    ▼
┌──────────────────────┐
│  POST /api/v1/chat/  │   ← 新增端點
│  sessions/:key/files │
└──────────┬───────────┘
           │ 1. 寫入 SeaWeedFS: /{session_key}/files/{file_id}.{ext}
           │ 2. ArangoDB: 新增 knowledge_files 文件（含 session_key）
           │ 3. 發送 Celery 任務（含 session_key）
           ▼
┌──────────────────────┐
│  Celery Queue Work   │   ← vectorize_task + extract_graph_task
│  (Redis Broker)      │
└──────────┬───────────┘
           │ 異步執行
     ┌─────┴─────┐
     ▼           ▼
┌─────────┐  ┌──────────────┐
│ Qdrant  │  │   ArangoDB   │
│ 向量儲存 │  │ 圖譜節點/邊  │
│(session_│  │(session_key) │
│ key過濾)│  │              │
└─────────┘  └──────────────┘
     │
     ▼
┌──────────────────────┐
│ WebSocket / SSE      │   ← 任務完成通知前端
│ (session_key channel) │
└──────────────────────┘
```

---

## 12.2 儲存架構

### 12.2.1 SeaWeedFS 路徑結構

**路徑格式**: `/{bucket}/sessions/{session_key}/{file_id}.{extension}`

> ⚠️ **與現有實作的差異**：
> - 現有實作（`api/src/api/knowledge.rs`）路徑為 `bucket-aibox-assets/{root_id}/{file_key}.{ext}`
> - Session 檔案應使用 `bucket-aibox-assets/sessions/{session_key}/{file_key}.{ext}`
> - 路徑改變後需同步更新 `knowledge_agent.delete_file_data` 中的刪除目標

**設計理由**: 
- 生命週期管理 (TTL)：刪除 Session 時可直接刪除整個 `/{session_key}/` 前綴
- 隔離性：與既有 `bucket-aibox-assets/{root_id}/` 路徑共存

**範例**:
```
bucket-aibox-assets/sessions/sess_abc123/file_001.pdf
bucket-aibox-assets/sessions/sess_abc123/file_002.xlsx
bucket-aibox-assets/sessions/sess_xyz789/file_003.png
```

### 12.2.2 ArangoDB Schema 變更

#### 方案選擇：Edge Collection 方案（支援一對多共享）

若同一檔案可能被多個 Session 共用 → 使用 Edge Collection  
若為一對一綁定 → 直接加 `session_key` 欄位

本規格採用 **Edge Collection 方案**（更靈活，未來可升級為全域 KB）：

```aql
// Edge Collection: chat_session_files
// 綁定 Session ↔ 檔案的多對多關係
{
  "_key": "csf_001",
  "_from": "chat_sessions/sess_abc123",
  "_to": "knowledge_files/file_xyz",
  "session_key": "sess_abc123",
  "file_key": "file_xyz",
  "uploaded_at": "2026-03-27T15:00:00Z",
  "role": "attachment"    // 'attachment' | 'kb_upgraded'
}
```

**既有的 `knowledge_files` 結構不變**，新增 Index：

```aql
// 在 knowledge_files 上建立 session_key 索引（防禦性）
CREATE INDEX session_key_idx ON knowledge_files (session_key) TYPE persistent

// 在 job_logs 上建立 session_key 索引
CREATE INDEX job_session_key_idx ON job_logs (session_key) TYPE persistent
```

#### 向量資料（Qdrant）

維持現有 Per-KB-root Collection（如 `knowledge_kb1`），新增 `session_key` Payload 過濾：

> ⚠️ **重要發現**：現有實作使用 `collection = f"knowledge_{root_id}"` 作為 Qdrant Collection 名稱（每個 KB Root 一個 Collection）。若要支援 Session 私有檔案，有兩種做法：
> - **方案 A（推薦）**：將 `session_key` 也視為 `root_id` 的角色，Vector 寫入 `knowledge_{session_key}` Collection，與全域 KB 分開
> - **方案 B**：使用單一共用 Collection + Payload 過濾（需修改 `pipeline.py` 中的 collection 命名邏輯）

本規格採用 **方案 A**（破壞性最小，符合現有程式碼模式）：

```json
// Qdrant Point Payload 結構（新增 session_key）
{
  "file_id": "file_xyz",
  "root_id": "kb1",              // 全域 KB 時有值
  "session_key": "sess_abc123", // Session 私有檔案時有值（作為 root_id 使用）
  "chunk_index": 0,
  "text": "...",
  "text_full": "..."
}
```

**Collection 命名**:
- 全域 KB 檔案 → `knowledge_{root_id}`（現有）
- Session 私有檔案 → `knowledge_{session_key}`（新建 Collection）

---

## 12.3 API 端點設計

### 新增端點

| 方法 | 端點 | 說明 |
|------|------|------|
| POST | `/api/v1/chat/sessions/{session_key}/files` | 上傳檔案（multipart/form-data） |
| GET | `/api/v1/chat/sessions/{session_key}/files` | 列出 Session 內所有檔案 |
| DELETE | `/api/v1/chat/sessions/{session_key}/files/{file_key}` | 刪除檔案 + 清理 Qdrant/圖譜 |
| GET | `/api/v1/chat/sessions/{session_key}/files/{file_key}/status` | 查詢處理進度（vector/graph status） |

### POST /api/v1/chat/sessions/{session_key}/files

**Request**: `Content-Type: multipart/form-data`

| 欄位 | 類型 | 說明 |
|------|------|------|
| `file` | File | 上傳的檔案（二進制） |
| `filename` | string | 原始檔案名稱 |

**Response**:
```json
{
  "code": 0,
  "data": {
    "file_key": "file_abc123",
    "filename": "物料規範.pdf",
    "file_size": 2457600,
    "file_type": "pdf",
    "session_key": "sess_xyz",
    "upload_time": "2026-03-27T15:00:00Z",
    "vector_status": "queued",
    "graph_status": "queued",
    "task_ids": {
      "vector_task_id": "celery-task-uuid-1",
      "graph_task_id": "celery-task-uuid-2"
    }
  }
}
```

**處理流程**:
1. 接收檔案 → 存入 SeaWeedFS (`/{session_key}/files/{file_key}.{ext}`)
2. 在 `knowledge_files` 建立文件（`session_key` 非 null）
3. 在 `chat_session_files` 建立 Edge 記錄
4. 發送 Celery `vectorize_task` + `extract_graph_task`（含 `session_key`）
5. 回傳 `file_key` + `task_ids`

---

## 12.4 Celery Queue Work 實作

### 12.4.1 任務 Payload 擴展

現有 `celery_app/tasks.py` 的 `vectorize_task` 需擴展 `session_key` 參數：

```python
# ai-services/celery_app/tasks.py

@celery_app.task(bind=True)
def vectorize_task(self, file_id: str, local_path: str, root_id: str | None = None, session_key: str | None = None):
    """Vectorization task with optional session binding."""
    result = pipeline.vectorize(
        file_id=file_id,
        local_path=local_path,
        root_id=root_id or session_key or "default",
    )
    # 通知前端（session_key 非 null 時）
    if session_key:
        notify_file_processed(session_key=session_key, file_id=file_id, status="vector_done")
    return result

@celery_app.task(bind=True)
def extract_graph_task(self, file_id: str, local_path: str, session_key: str | None = None):
    """Graph extraction task with optional session binding.
    
    Session-attached files: call aitask /v1/chat/tag-5w1h endpoint
    (reuses existing TAG_5W1H_PROMPT — lightweight, no ontology needed).
    """
    if session_key:
        # Lightweight 5W1H path — reuse existing endpoint
        result = call_aitask_tag5w1h(file_id=file_id, local_path=local_path)
    else:
        # Full KB graph extraction — use existing pipeline
        result = pipeline.extract_graph(file_id=file_id, local_path=local_path)
    if session_key:
        notify_file_processed(session_key=session_key, file_id=file_id, status="graph_done")
    return result
```

### 12.4.2 前端通知機制

Celery 任務完成後，透過 SSE 向前端推送進度：

**SSE Event**: `event: file_status`
```json
data: {
  "session_key": "sess_abc123",
  "file_key": "file_xyz",
  "vector_status": "completed",
  "graph_status": "completed",
  "vector_task_id": "celery-uuid-1",
  "graph_task_id": "celery-uuid-2"
}
```

**實作方式**: 
- 方案 A: Celery → Redis Pub/Sub → API Gateway SSE → Frontend
- 方案 B: Celery → 寫入 ArangoDB `job_logs` → 前端輪詢 `/files/{file_key}/status`

推薦方案 A（低延遲），可與現有 SSE 聊天連線共用。

---

## 12.5 向量檢索流程（與全域 KB 整合）

當 AI 回應使用者問題時，檢索範圍 = 全域 KB + 當前 Session 私有檔案：

```python
# 檢索時同時查詢全域 KB 和當前 Session
async def search_knowledge(query: str, session_key: str | None, root_ids: list[str] | None):
    results = []
    
    # 1. 全域 KB 檢索（若指定 root_ids）
    if root_ids:
        for root_id in root_ids:
            collection = f"knowledge_{root_id}"
            qdrant_results = qdrant.search(collection, embedding, limit=10)
            results.extend(qdrant_results)
    
    # 2. 當前 Session 私有檔案檢索
    if session_key:
        # 注意：需要先確認 session_key 對應的 root_id
        # 若 session 檔案使用 session_key 作為 root_id：
        session_collection = f"knowledge_{session_key}"
        # 使用 Payload Filter 過濾
        session_results = qdrant.search_with_filter(
            collection=session_collection,
            vector=embedding,
            filter={"session_key": session_key},
            limit=10,
        )
        results.extend(session_results)
    
    return deduplicate_and_rank(results)
```

---

## 12.6 檔案刪除流程

### 刪除觸發時機
- 使用者主動刪除聊天中的檔案
- Session 被刪除（ cascade delete）

### 刪除順序（避免殘留）

```
1. ArangoDB job_logs ← 按 session_key + file_key 刪除日誌
2. ArangoDB chat_session_files ← 刪除 Edge
3. ArangoDB knowledge_graphs / knowledge_graph_edges ← 按 file_key 刪除圖譜
4. ArangoDB knowledge_files ← 刪除主文件
5. Qdrant ← 刪除該 file_id 的所有 Points
6. SeaWeedFS ← 刪除 /{session_key}/files/{file_key}.{ext}
```

```python
async def delete_session_file(session_key: str, file_key: str):
    """Delete file and all associated data."""
    # 1. 刪除 job_logs
    await arango.aql("""
        FOR log IN job_logs
        FILTER log.file_id == @file_key AND log.session_key == @session_key
        REMOVE log IN job_logs
    """, bind_vars={"file_key": file_key, "session_key": session_key})
    
    # 2. 刪除 Edge
    await arango.aql("""
        FOR edge IN chat_session_files
        FILTER edge.session_key == @session_key AND edge.file_key == @file_key
        REMOVE edge IN chat_session_files
    """, bind_vars={"session_key": session_key, "file_key": file_key})
    
    # 3. 刪除圖譜（使用既有的 arango_ops.delete_file_data）
    arango_ops_instance.delete_file_data(file_key)
    
    # 4. 刪除 knowledge_files 主文件
    await arango.delete_document("knowledge_files", file_key)
    
    # 5. 刪除 Qdrant vectors
    qdrant.delete_by_file(session_key or file_key, file_key)
    
    # 6. 刪除 SeaWeedFS 檔案
    seaweeds_path = f"/{session_key}/files/{file_key}"
    await seaweeds_client.delete(seaweeds_path)
```

### Session 刪除 Cascade

當整個 Session 被刪除時，觸發 cascade delete：

```python
async def delete_session_cascade(session_key: str):
    """Delete entire session: files, vectors, graphs, storage."""
    # 1. 取得所有關聯檔案
    edges = await arango.aql("""
        FOR edge IN chat_session_files
        FILTER edge.session_key == @session_key
        RETURN edge.file_key
    """, bind_vars={"session_key": session_key})
    
    # 2. 刪除每個檔案的關聯資料（使用 delete_session_file 邏輯）
    for file_key in edges:
        await delete_session_file(session_key, file_key)
    
    # 3. 刪除 Session 主文件（chat_sessions, chat_messages 由既有機制處理）
    await arango.delete_document("chat_sessions", session_key)
```

---

## 12.7 前端上傳 UI（待實作）

### 12.7.1 上傳檔案列表（Session File Panel）

**設計目標**：使用者可在聊天中查看、上傳、刪除當前 Session 的附屬檔案，**無需預覽功能**。

**UI 位置**：`TaskSessionChat.tsx` 底部輸入框上方（附屬區域）。

**呈現欄位**：

| 欄位 | 說明 |
|------|------|
| 📎 檔案圖示 | 依副檔名（pdf/docx/xlsx/csv/md/txt）顯示對應圖示 |
| 檔案名稱 | 原始檔名，超長時 ellipsis + tooltip |
| 向量化狀態 | `vector_status` badge（pending / processing / ✅完成 / ❌失敗） |
| 圖譜狀態 | `graph_status` badge，含節點數/邊數（格式：`✅ 12節點 8邊` 或 `❌ 失敗`） |
| 刪除 | ✕ 按鈕，Popconfirm 二次確認後刪除 |

**範例 UI**：

```
┌─────────────────────────────────────────────────────────┐
│ 📎 物料管理規範_v3.2.pdf   ✅向量  ✅圖譜(12節點/8邊)   ✕ │
│ 📎 庫存盤點流程.docx        ❌向量  ❌圖譜(解析失敗)      ✕ │
└─────────────────────────────────────────────────────────┘
```

**技術要點**：
- 列表透過 `GET /api/v1/chat/sessions/{session_key}/files` 取得（Phase 8.2 API）
- 圖譜節點/邊數：列表 API 回應中附加 count（後端 JOIN `knowledge_graphs` / `knowledge_graph_edges`）
- 上傳：點擊 `PaperClipOutlined` → AntD Upload `customRequest` → POST → 即時新增至列表
- 刪除：Popconfirm → `DELETE /api/v1/chat/sessions/{session_key}/files/{file_key}`
- 無輪詢：失敗時由 SSE `file_status` 事件更新狀態

**API 回應格式**：

```json
{
  "code": 0,
  "data": [{
    "file_key": "file_abc123",
    "filename": "物料規範.pdf",
    "file_size": 2457600,
    "file_type": "pdf",
    "vector_status": "completed",
    "graph_status": "completed",
    "graph_stats": { "nodes": 12, "edges": 8 },
    "upload_time": "2026-03-27T15:00:00Z"
  }]
}
```

---

## 12.8 Schema 變更摘要

### ArangoDB Collections

| Collection | 變更 |
|-----------|------|
| `knowledge_files` | 新增 `session_key` 欄位（可為 null）+ Persistent Index |
| `job_logs` | 新增 `session_key` 欄位 + Persistent Index |
| `chat_session_files` | **新建 Edge Collection**：綁定 Session ↔ 檔案 |
| `knowledge_graphs` | 不變（已有 `file_id` 過濾） |
| `knowledge_graph_edges` | 不變（已有 `file_id` 過濾） |

### Qdrant

| 變更 | 說明 |
|------|------|
| 所有 Collection | Payload 新增 `session_key: string` 欄位 |
| 每個 Collection | 建立 Payload Index: `session_key` (keyword) |
| 刪除 | 使用 `delete_by_file()` 時同時過濾 `session_key` |

### SeaWeedFS

| 變更 | 說明 |
|------|------|
| 路徑結構 | `/{session_key}/files/{file_id}.{ext}` |
| 刪除 | 刪除整個 Session 時用前綴刪除 `/{session_key}/` |

---

## 12.9 待實作任務（Phase 8）

| 任務 | 檔案 | 說明 | 預估 |
|------|------|------|------|
| 8.1 前端上傳 UI | `src/pages/TaskSessionChat.tsx` | PaperClip 按鈕 → 上傳 API → 進度條 | 4hr |
| 8.2 API 上傳端點 | `api/src/api/chat.rs` | 新增 `/chat/sessions/{key}/files` POST（參考現有 `knowledge.rs` 上傳實作） | 2hr |
| 8.3 SeaWeedFS 寫入 | `api/src/api/chat.rs` | 路徑：`bucket-aibox-assets/sessions/{session_key}/{file_key}.{ext}` | 1hr |
| 8.4 ArangoDB 欄位 | `api/src/db/mod.rs` + `api/src/api/chat.rs` | 在 `knowledge_files` 新增 `session_key` 欄位 + Persistent Index；建立 `chat_session_files` Edge Collection | 2hr |
| 8.5 Celery 擴展 | `ai-services/celery_app/tasks.py` | 新增 `session_key` 參數；Vector 寫入 `knowledge_{session_key}` Collection | 2hr |
| 8.6 Pipeline Collection | `ai-services/kb_pipeline/pipeline.py` | 修改 `vectorize()` 中的 collection 命名：`root_id or session_key` | 1hr |
| 8.7 刪除 Cascade | `api/src/api/chat.rs` + `knowledge_agent/main.py` | Session 刪除時 cascade 清理（參考 `delete_file_data` 實作） | 2hr |
| 8.8 SSE 進度通知 | `api/src/api/sse.rs` | `file_status` 事件 | 2hr |
| 8.9 ArangoDB Index | 資料庫 | 對 `knowledge_files.session_key`、`chat_messages.session_key+created_at`、`job_logs.session_key` 建立 Persistent Index | 1hr |

### 12.9.1 關鍵修改點（基於現有程式碼）

**現有實作參考**（不要重造輪子）：
- 上傳實作：`api/src/api/knowledge.rs` — 參考其 SeaWeedFS PUT 邏輯與 `knowledge_files` 文件建立
- Celery 任務：`ai-services/celery_app/tasks.py` — 參考現有 `vectorize_task` / `graph_task` 簽名
- Pipeline：`ai-services/kb_pipeline/pipeline.py` — 參考 `vectorize()` 如何建立 Qdrant Collection + upsert
- 刪除：`knowledge_agent/main.py` 的 `delete_file_data()` — 參考其 Qdrant delete、ArangoDB cleanup、SeaWeedFS DELETE 順序

**⚠️ 重要發現**：
- `chat_checkpoints` Collection **尚未實作**（Phase 7.2 待完成）
- `knowledge_chunks` Collection 在 `arango_ops.py` 中有引用，但 Rust `ensure_collections()` **未自動建立**此 Collection
- `knowledge_files` 目前綁定 `knowledge_root_id`，需擴展支援 `session_key`

---

> **相關文件**: [06-data-model.md](./06-data-model.md)（現有 KB schema）, [05-frontend-orchestrator.md](./05-frontend-orchestrator.md)（前端狀態管理）  
> **依賴**: Phase 2 完成後再實作（需要後端 LangGraph + SSE 基礎）
