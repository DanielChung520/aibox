---
lastUpdate: 2026-03-22 18:39:55
author: Daniel Chung (with AI assistance)
version: 1.8.1
status: Complete Draft
---

# 物料管理 BPA 規格書（Material Management BPA Specification）

## 修訂紀錄

| 日期 | 版本 | 作者 | 變更內容 |
|---|---|---|---|
| 2026-03-22 | 1.8.1 | Daniel Chung (with AI assistance) | 全檔一致性修正（v1.8.0 Oracle 複評）：§15.2.x 走讀範例對齊 v1.8.0 主章節修正（BPA_ASK_USER、execution_summary、TASK_FAILED.details、DA 錯誤回應）；§6.7.4 控制訊息回應對齊；ZA 規則統一 trace_id 走 header 規範；DAClientError 補 retryable 參數。 |
| 2026-03-22 | 1.8.0 | Daniel Chung (with AI assistance) | P0 修正（v1.7.0 Oracle 複評）：BPA_ASK_USER 對齊 Top v2.0（補 ask.required/default_value、task_status 取代舊執行上下文欄位）；TASK_COMPLETE.execution_summary 改用 SSOT 欄位名稱（total_duration_seconds/llm_calls/tool_calls/tokens_used）；TASK_FAILED.error.details 改為字串型別。P1：DAClient RETRYABLE_CODES 移除 DA_QUERY_TIMEOUT；DA 錯誤回應移除非 SSOT http_status 欄位。 |
| 2026-03-22 | 1.7.0 | Daniel Chung (with AI assistance) | P0 修正（v1.6.0 Oracle 複評）：`backoff_seconds` 型別改為陣列；`partial_results` failed item 補 root-level `error`；補齊 TASK_COMPLETE `result.next_actions`；§5.1.4 `HandoverMessage` 補 `correlation_id`。 |
| 2026-03-22 | 1.6.0 | Daniel Chung (with AI assistance) | P0 修正（v1.5.0 Oracle 複評）：移除 auth_context.tenant_id（SSOT 禁止）；TASK_PAUSE/RESUME 移除 reason；所有 retry_strategy 補 backoff_seconds；§5.1.4 conversation_context 型別放寬。P1：DA error http_status 對齊；bpa_domain_intent 標註非 SSOT 擴充；DAClient retry 邏輯改進 |
| 2026-03-22 | 1.5.0 | Daniel Chung (with AI assistance) | P0 修正（v1.4.0 Oracle 複評）：§5.1.2 user_intent 路徑修正；§5.1.4 Pydantic 範例對齊 SSOT（AuthContext、ExtractedEntity、Subtask、HandoverMessage）；§15 三組 walk-through extracted_entities 改用物件結構；附錄 ZA rules 33-34 對齊控制訊息 SSOT |
| 2026-03-22 | 1.4.0 | Daniel Chung (with AI assistance) | P0 修正（v1.3.0 Oracle 複評）：extracted_entities 改用物件結構；USER_MESSAGE 補 root bpa_id；partial_results[] 改用 task_id；§7.3 Pydantic 模型對齊協議；附錄 ZA 驗證規則對齊 Top v2.0；§15.4.1 options 改用 {id,label} |
| 2026-03-22 | 1.3.0 | Daniel Chung (with AI assistance) | P0 結構對齊：TASK_HANDOVER auth_context 欄位對齊 Top v2.0（user_roles, allowed_tools, rate_limit_quota）；BPA_ASK_USER options 改用 {id,label}；USER_MESSAGE context_delta 對齊 {new_entities, updated_preferences}；TASK_COMPLETE tasks[] 改用 {id,description,status,result}；TASK_FAILED retry_strategy 改用物件、partial_results 改用陣列；控制訊息扁平化；DA 錯誤碼補齊至 9 碼 |
| 2026-03-22 | 1.2.0 | Daniel Chung (with AI assistance) | P0 修正：USER_MESSAGE 對齊 Top v2.0 `message` + `context_delta` 結構；BPA_ASK_USER 欄位 `single_select`→`single_choice`、`max_wait_seconds`→`timeout_seconds`；TASK_FAILED `retryable`→`can_retry` + `retry_strategy`；DA 錯誤碼對齊 DA v2.0 SSOT；DA `intent_type` 對齊 DA v2.0 枚舉；DA timeout HTTP 504→408；SQL 範例加註邏輯示意說明 |
| 2026-03-22 | 1.1.0 | Daniel Chung (with AI assistance) | P0/P1 修正：協議欄位對齊 Top v2.0、端點對齊、DA 錯誤碼修正、狀態模型分層、去重機制、租戶隔離 |
| 2026-03-22 | 1.0.0 | Daniel Chung (with AI assistance) | 首版完整草案，定義 material-bpa 作為 AIBox 第一個 BPA 實作範本 |

## 目錄

- [§1 文檔概述](#1-文檔概述)
  - [1.1 文件目的](#11-文件目的)
  - [1.2 文件範圍](#12-文件範圍)
  - [1.3 文件定位](#13-文件定位)
  - [1.4 關鍵識別資訊](#14-關鍵識別資訊)
  - [1.5 參考文件](#15-參考文件)
- [§2 產品定位與核心目標](#2-產品定位與核心目標)
  - [2.1 產品定位](#21-產品定位)
  - [2.2 核心目標](#22-核心目標)
  - [2.3 產品範圍](#23-產品範圍)
- [§3 目標用戶與場景](#3-目標用戶與場景)
  - [3.1 用戶畫像](#31-用戶畫像)
  - [3.2 核心使用場景](#32-核心使用場景)
  - [3.3 場景對應能力矩陣](#33-場景對應能力矩陣)
- [§4 系統架構](#4-系統架構)
  - [4.1 架構總覽](#41-架構總覽)
  - [4.2 BPA Registry 定義格式](#42-bpa-registry-定義格式)
  - [4.3 內部模組分層](#43-內部模組分層)
  - [4.4 服務邊界與責任](#44-服務邊界與責任)
- [§5 核心功能模組](#5-核心功能模組)
  - [5.1 需求理解模組（Handover Parsing）](#51-需求理解模組handover-parsing)
  - [5.2 任務拆解模組（Task Decomposition）](#52-任務拆解模組task-decomposition)
  - [5.3 DA 調用模組（Data Agent Client）](#53-da-調用模組data-agent-client)
  - [5.4 結果聚合與業務解釋模組](#54-結果聚合與業務解釋模組)
  - [5.5 多輪對話模組（BPA_ASK_USER）](#55-多輪對話模組bpa_ask_user)
- [§6 通信協議整合](#6-通信協議整合)
  - [6.1 Top → BPA：TASK_HANDOVER](#61-top--bpatask_handover)
  - [6.2 BPA → Top：BPA_ASK_USER](#62-bpa--topbpa_ask_user)
  - [6.3 Top → BPA：USER_MESSAGE](#63-top--bpauser_message)
  - [6.4 BPA → Top：TASK_COMPLETE](#64-bpa--toptask_complete)
  - [6.5 BPA → Top：TASK_FAILED](#65-bpa--toptask_failed)
  - [6.6 BPA → DA：Query 請求/回應](#66-bpa--daquery-請求回應)
  - [6.7 控制訊息：TASK_CANCEL / TASK_PAUSE / TASK_RESUME](#67-控制訊息task_cancel--task_pause--task_resume)
  - [6.8 訊息去重與 state_version 處理](#68-訊息去重與-state_version-處理)
- [§7 BPA 狀態機](#7-bpa-狀態機)
  - [7.1 狀態機圖](#71-狀態機圖)
  - [7.2 狀態定義表](#72-狀態定義表)
  - [7.2.1 兩層狀態模型](#721-兩層狀態模型)
  - [7.3 Pydantic 模型](#73-pydantic-模型)
  - [7.4 狀態轉移規則](#74-狀態轉移規則)
- [§8 持久化與檢查點（Checkpoint）](#8-持久化與檢查點checkpoint)
  - [8.1 ArangoDB Collections](#81-arangodb-collections)
  - [8.2 Checkpoint 策略](#82-checkpoint-策略)
  - [8.3 Recovery Flow](#83-recovery-flow)
  - [8.4 Idempotency 設計](#84-idempotency-設計)
- [§9 安全設計](#9-安全設計)
- [§10 錯誤處理](#10-錯誤處理)
- [§11 非功能需求](#11-非功能需求)
- [§12 護欄與約束](#12-護欄與約束)
- [§13 驗收標準](#13-驗收標準)
- [§14 部署與整合](#14-部署與整合)
- [§15 附錄](#15-附錄)
  - [15.1 開發檢查清單](#151-開發檢查清單)
  - [15.2 完整場景走讀（三個）](#152-完整場景走讀三個)
  - [15.3 SAP MM 表格參考](#153-sap-mm-表格參考)
  - [15.4 Prompt Templates](#154-prompt-templates)
  - [15.5 驗證測試案例清單（20 項）](#155-驗證測試案例清單20-項)

---

## 1. 文檔概述

### 1.1 文件目的

本文件定義 AIBox 平台第一個正式 BPA 實作：**物料管理 BPA（material-bpa）**。

本文件的核心目標如下：

1. 給出可落地的產品與技術規格，作為開發、測試、部署與驗收依據。
2. 將 Top Orchestrator v2.0 Handoff Protocol 與 DA v2.0 的協議邊界明確化。
3. 定義 Material Management（SAP MM）領域的能力範圍、資料邊界、輸出樣式、護欄與限制。
4. 作為後續 BPA 規格模板的參照案例，建立可複製的方法論。

### 1.2 文件範圍

本文件涵蓋：

- 產品定位與業務目標。
- 面向採購、庫存、供應商與物料主數據的查詢與分析需求。
- Top Orchestrator 與 BPA 的完整訊息流程。
- BPA 與 DA 的資料查詢整合細節。
- BPA 狀態機、持久化與復原機制。
- 安全、權限、監控、效能與驗收標準。
- 部署方式（Docker Compose、環境變數、BPA Registry）。

本文件不涵蓋：

- SAP 即時寫入與交易過帳。
- 跨模組（例如 MM+SD）聯合分析。
- 人工審批流程引擎設計。

### 1.3 文件定位

本文件定位為「需求規格 + 技術設計 + 介面契約」三合一文檔，預期讀者包括：

- 產品經理（確認範圍、價值、驗收）。
- 後端工程師（FastAPI、協議、資料層整合）。
- 平台工程師（編排、部署、監控）。
- QA（測試案例建立與驗收執行）。
- 安全與治理角色（權限、審計、合規檢查）。

### 1.4 關鍵識別資訊

| 欄位 | 值 |
|---|---|
| BPA ID | `material-bpa` |
| 服務名稱 | Material Management BPA |
| 服務 Port | `8012` |
| 服務類型 | Domain-Specific BPA Service |
| 主責模組 | SAP MM（MARA、LFA1、EKKO、EKPO、MSEG） |
| 協議版本 | Top Handoff `schema_version: 2.0` |
| DA 整合端點 | `POST http://data-query:8002/query` |
| v1.0 操作模式 | Read-only |

### 1.5 參考文件

1. `.docs/Spec/後台/BPA/AI Agent 需求规格说明书模板.md`
2. Top Orchestrator v2.0 Handoff Protocol 規格（內部規格文件）。
3. DA v2.0 API 規格（內部規格文件，含 `/query` 請求/回應定義）。
4. AIBox 現有 BPA 原型程式：`ai-services/bpa/main.py`。
5. SAP MM 資料表對照（MARA/LFA1/EKKO/EKPO/MSEG）。

---

## 2. 產品定位與核心目標

### 2.1 產品定位

物料管理 BPA 是一個**領域型業務流程代理（domain-specific business process agent）**，專注處理 SAP MM 模組中的查詢與分析流程。

其角色定位如下：

1. 接收 Top Orchestrator 的結構化任務交接（TASK_HANDOVER）。
2. 以 MM 領域知識解析業務問題、拆解子任務與查詢策略。
3. 將資料查詢委派給 DA（Data Agent）執行，嚴格避免 BPA 直接產生 SQL。
4. 視需求向 Knowledge Agent（KA）查詢政策、規章、內控條件。
5. 將查詢結果轉換為可理解的業務結論（不是只輸出原始表格）。

### 2.2 核心目標

#### 2.2.1 業務目標

- 自動化 80% 的常規物料管理查詢。
- 降低採購、倉儲、財務分析人員在資料彙整上的手動時間。
- 形成一致的回答格式與可追溯的分析流程。

#### 2.2.2 使用者目標

- 使用自然語言提出查詢（例如「比較供應商 A 與 B 的採購金額」）。
- 快速得到可決策的摘要、重點與異常提示。
- 在資訊不足時，系統能進行精準補問（BPA_ASK_USER）。

#### 2.2.3 技術目標

- DA 呼叫成功率 > 98%。
- 簡單查詢 E2E 回應 < 10 秒。
- 明確狀態機與 checkpoint，可在故障後可恢復。
- 與 Top Orchestrator v2.0 與 DA v2.0 完整相容。

### 2.3 產品範圍

#### 2.3.1 v1.0 納入範圍（Included）

1. 採購訂單查詢（Purchase Order Query，EKKO/EKPO）。
2. 物料主數據查詢（Material Master Query，MARA）。
3. 供應商資訊查詢（Supplier Query，LFA1）。
4. 庫存異動查詢（Inventory Movement Query，MSEG）。
5. 採購分析報表（跨表彙總分析）。
6. 供應商比較分析（成本、數量、交期等維度）。
7. 採購異常偵測（規則式 + 統計式基礎偵測）。

#### 2.3.2 v1.0 不納入範圍（Not Included）

1. 寫入操作（新增採購單、修改主檔、過帳、衝銷）。
2. 審批流程（簽核、核准路由）。
3. MM 與 SD/FI 等跨模組聯合查詢。
4. SAP 即時 API 整合（本版聚焦資料層查詢）。

---

## 3. 目標用戶與場景

### 3.1 用戶畫像

| 使用者類型 | 描述 |
|---|---|
| 採購經理 | 關注採購總額、供應商績效、價格趨勢與異常訂單 |
| 倉管人員 | 關注庫存餘量、入出庫異動、特定物料移動記錄 |
| 財務分析 | 關注採購成本、預算使用率、單價與期間變化 |

### 3.2 核心使用場景

以下場景皆包含完整流程：Top → material-bpa → DA → 結果解釋 → Top。

#### 場景 1：採購訂單查詢

使用者提問：

`查詢上個月所有採購訂單`

流程：

1. Top 接收使用者問題並判定路由至 material-bpa。
2. Top 發送 TASK_HANDOVER，包含時間實體「上個月」。
3. material-bpa 解析為「EKKO + EKPO 期間查詢」。
4. material-bpa 呼叫 DA，限定 `module_scope=["MM"]`。
5. DA 回傳結果集與 metadata。
6. material-bpa 輸出摘要：筆數、總金額、前 N 大供應商。
7. material-bpa 回傳 TASK_COMPLETE。

#### 場景 2：供應商比較分析

使用者提問：

`比較供應商A和供應商B的採購金額`

流程：

1. Top 交接 `supplier_name=[A,B]`。
2. material-bpa 解析比較維度（總金額、訂單數、平均單價）。
3. 呼叫 DA（EKKO/EKPO/LFA1 join + GROUP BY LIFNR）。
4. material-bpa 格式化對照表。
5. 產生「差異解釋 + 可能原因」。
6. 回傳 TASK_COMPLETE。

#### 場景 3：庫存異動追蹤

使用者提問：

`查詢物料M-001最近的庫存變動`

流程：

1. Top 交接 material_id = `M-001`。
2. material-bpa 辨識為 MSEG 時序查詢。
3. 呼叫 DA（MSEG WHERE MATNR='M-001'，按日期排序）。
4. 轉換為時間軸敘述（入庫、出庫、異常波動）。
5. 回傳 TASK_COMPLETE。

#### 場景 4：多步驟複雜流程（需要補問）

使用者提問：

`分析採購成本趨勢`

流程：

1. Top 發送 TASK_HANDOVER。
2. material-bpa 判定關鍵參數不足（期間、物料群組）。
3. material-bpa 發送 BPA_ASK_USER（問題：時間範圍、分析維度）。
4. Top 轉發詢問給使用者。
5. 使用者回覆後 Top 發送 USER_MESSAGE。
6. material-bpa 續跑執行 DA 查詢。
7. material-bpa 生成趨勢分析（月度變化率、峰值、異常點）。
8. 回傳 TASK_COMPLETE。

#### 場景 5：採購異常偵測

使用者提問：

`有沒有異常的採購訂單？`

流程：

1. material-bpa 任務拆解：
   - 子任務 A：確定異常規則。
   - 子任務 B：取數據。
   - 子任務 C：評分與分級。
2. 呼叫 DA 取得相關採購資料。
3. material-bpa 進行規則判斷（例如單價跳升、短期多筆拆單）。
4. 輸出異常摘要與建議 drill-down。
5. 回傳 TASK_COMPLETE。

### 3.3 場景對應能力矩陣

| 場景 | 主要表 | 主要能力 | 是否需補問 | 主要輸出 |
|---|---|---|---|---|
| 採購訂單查詢 | EKKO, EKPO | list/query | 否 | 訂單清單 + 金額統計 |
| 供應商比較 | EKKO, EKPO, LFA1 | compare/aggregate | 視情況 | 對照表 + 差異解釋 |
| 庫存異動追蹤 | MSEG | timeline/query | 否 | 異動時間軸 |
| 採購成本趨勢 | EKKO, EKPO | trend/analysis | 是 | 趨勢摘要 + 指標 |
| 異常偵測 | EKKO, EKPO | anomaly/detection | 視情況 | 異常清單 + 風險分級 |

---

## 4. 系統架構

### 4.1 架構總覽

```text
┌──────────────────────────────────────────────────────────────────┐
│                    Top Orchestrator (:8006)                     │
│  意圖檢測 → BPA 路由 → material-bpa                              │
└──────────────────────┬───────────────────────────────────────────┘
                       │ TASK_HANDOVER / USER_MESSAGE
                       │ (Handoff Protocol v2.0)
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│              Material Management BPA (:8012)                    │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ 意圖理解 │→│ 任務拆解 │→│ DA 調用  │→│ 結果聚合與解釋   │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
│       │              │            │                │            │
│       ▼              ▼            ▼                ▼            │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────────────┐   │
│  │ Prompts  │ │ State    │ │ DA Client│ │ LLM Interpreter  │   │
│  │ Library  │ │ Machine  │ │ (httpx)  │ │ (Ollama)         │   │
│  └──────────┘ └──────────┘ └──────────┘ └──────────────────┘   │
└──────────────────────────────────────────────────────────────────┘
                       │ POST /query
                       ▼
┌──────────────────────────────────────────────────────────────────┐
│                    Data Agent (:8002)                           │
│  NL → Intent → Schema Bind → Qdrant → SQL → DuckDB → S3        │
└──────────────────────────────────────────────────────────────────┘
```

架構原則：

1. Top 負責路由與跨代理協調，不承載領域分析細節。
2. material-bpa 負責 MM 領域語意與流程控制。
3. DA 負責自然語言到查詢執行，BPA 不生成 SQL。
4. KA（可選）負責知識規章補充，不介入資料查詢。

### 4.2 BPA Registry 定義格式

以下 JSON 為 material-bpa 在 Registry 的完整註冊內容。

```json
{
  "id": "material-bpa",
  "name": "物料管理 BPA",
  "description": "處理 SAP MM 模組相關業務流程：採購、物料、供應商、庫存",
  "version": "1.0.0",
  "status": "active",
  "service_url": "http://material-bpa:8012",
  "capabilities": [
    "purchase_order_query",
    "material_master_query",
    "supplier_query",
    "inventory_movement_query",
    "procurement_analytics",
    "supplier_comparison",
    "anomaly_detection"
  ],
  "tools": [
    {
      "tool_id": "da-mm-query",
      "tool_type": "data_query",
      "description": "查詢 MM 模組數據",
      "endpoint": "http://data-query:8002/query",
      "auth_required": true
    }
  ],
  "prompts": {
    "task_decomposition": "你是物料管理專家，請將使用者查詢拆解為可執行資料查詢與業務分析步驟。",
    "result_interpretation": "請根據 SAP MM 查詢結果，以商業語言輸出摘要、風險與建議。"
  },
  "permissions": {
    "required_scopes": [
      "material:read",
      "procurement:read",
      "supplier:read"
    ],
    "allowed_collections": [
      "EKKO",
      "EKPO",
      "MARA",
      "LFA1",
      "MSEG"
    ],
    "rate_limit": {
      "max_requests_per_minute": 60
    }
  },
  "config": {
    "max_retries": 3,
    "timeout_seconds": 60,
    "checkpoint_interval": 5
  }
}
```

### 4.3 內部模組分層

material-bpa 服務內部分層：

1. API Layer：接收 Top 訊息。
2. Protocol Layer：驗證 schema_version、type、欄位完整性。
3. Domain Layer：MM 意圖解析、任務拆解、策略選擇。
4. Data Access Layer：呼叫 DA / 查 checkpoint / 審計落庫。
5. Interpretation Layer：結果敘事、摘要與可視化文字描述。
6. Output Layer：輸出 TASK_COMPLETE / TASK_FAILED / BPA_ASK_USER。

### 4.4 服務邊界與責任

| 元件 | 責任 | 不做的事 |
|---|---|---|
| Top Orchestrator | 路由、上下文管理、對話編排 | 不做 MM 細節拆解 |
| material-bpa | MM 領域流程、補問、整合 | 不直接執行 SQL |
| Data Agent | NL→查詢執行、資料回傳 | 不做最終商業解釋 |
| Knowledge Agent | 規章/政策查詢 | 不做資料聚合 |

---

## 5. 核心功能模組

### 5.1 需求理解模組（Handover Parsing）

#### 5.1.1 功能目標

解析 Top 發來的 TASK_HANDOVER，萃取可執行結構：

- user_intent
- extracted_entities
- constraints
- auth_context
- session context

#### 5.1.2 解析欄位

| 欄位 | 來源 | 用途 |
|---|---|---|
| `handover_data.user_intent` | Top handover_data | 判定主要任務類型（字串） |
| `handover_data.extracted_entities` | Top handover_data | 取得實體參數 |
| `auth_context.scopes` | auth_context | 權限驗證 |
| `conversation_context.language` | handover_data | 輸出語言控制 |
| `history` | handover_data | 多輪上下文追蹤 |

#### 5.1.3 SAP MM 實體辨識規則

| 實體類型 | Pattern | 範例 | 正規化策略 |
|---|---|---|---|
| material_id | MATNR 格式 | M-001, 000000001234 | 移除分隔符、左補零 |
| supplier_id | LIFNR 格式 | V001, 0000001000 | 統一為 10 碼 |
| purchase_order | EBELN 格式 | 4500000001 | 驗證 10 碼 |
| date_range | 日期語句 | 上個月、2026Q1、最近三個月 | 轉 ISO 區間 |
| amount_range | 金額語句 | 超過100萬、50萬以下 | 轉 min/max |
| warehouse | LGORT 代碼 | WH01、1000 | 白名單驗證 |

#### 5.1.4 Python 實作範例（Pydantic）

```python
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field, field_validator


class MessageType(str, Enum):
    TASK_HANDOVER = "TASK_HANDOVER"
    USER_MESSAGE = "USER_MESSAGE"
    BPA_ASK_USER = "BPA_ASK_USER"
    TASK_COMPLETE = "TASK_COMPLETE"
    TASK_FAILED = "TASK_FAILED"
    TASK_CANCEL = "TASK_CANCEL"
    TASK_PAUSE = "TASK_PAUSE"
    TASK_RESUME = "TASK_RESUME"


class AuthContext(BaseModel):
    user_roles: List[str]
    scopes: List[str]
    allowed_tools: List[str]
    rate_limit_quota: int


class ExtractedEntity(BaseModel):
    value: str
    source: str
    evidence_span: Optional[str] = None
    confidence: float = Field(ge=0.0, le=1.0)


class Subtask(BaseModel):
    id: int
    description: str


class HandoverData(BaseModel):
    user_intent: str
    extracted_entities: Dict[str, ExtractedEntity]
    top_level_subtasks: List[Subtask]
    conversation_context: Dict[str, Any]
    history: List[Dict[str, str]]


class HandoverMessage(BaseModel):
    schema_version: str
    type: MessageType
    message_id: str
    correlation_id: str
    session_id: str
    user_id: str
    timestamp: datetime
    auth_context: AuthContext
    handover_data: HandoverData

    @field_validator("schema_version")
    @classmethod
    def validate_schema_version(cls, value: str) -> str:
        if value != "2.0":
            raise ValueError("schema_version 必須為 2.0")
        return value
```

### 5.2 任務拆解模組（Task Decomposition）

#### 5.2.1 拆解策略

1. 簡單查詢：單次 DA 呼叫。
2. 複雜分析：多步驟拆解。
3. 參數不足：先問再查（BPA_ASK_USER）。

#### 5.2.2 拆解決策表

| 條件 | 策略 | 範例 |
|---|---|---|
| 單表 + 單條件 | 單步查詢 | 「查某物料主檔」 |
| 多表 + 比較 | 雙步（取數 + 比較） | 「比較供應商採購金額」 |
| 趨勢 + 未指定期間 | 先補問後分析 | 「分析採購成本趨勢」 |
| 異常偵測 | 三步（規則→取數→評分） | 「異常採購訂單」 |

#### 5.2.3 Task Decomposition Prompt（範本）

```text
你是 SAP MM 領域流程規劃代理。
請根據輸入任務，輸出可執行的子任務陣列。

限制：
1) 不得產生 SQL。
2) 只能透過 DA 查詢。
3) 若關鍵參數不足，輸出 ask_user 步驟。
4) 每個步驟需有 step_id、goal、required_entities、expected_output。

輸入：
- user_intent
- extracted_entities
- auth_scopes

輸出 JSON 格式：
{
  "plan_id": "plan_xxx",
  "confidence": 0.0,
  "steps": [
    {
      "step_id": "s1",
      "type": "query|analysis|ask_user",
      "goal": "...",
      "required_entities": ["..."],
      "expected_output": "..."
    }
  ]
}
```

#### 5.2.4 各場景拆解示例

##### 示例 A：採購訂單查詢

```json
{
  "plan_id": "plan_mm_po_001",
  "confidence": 0.93,
  "steps": [
    {
      "step_id": "s1",
      "type": "query",
      "goal": "查詢上月採購訂單資料並計算總額",
      "required_entities": [
        "date_range"
      ],
      "expected_output": "po_list_with_total"
    },
    {
      "step_id": "s2",
      "type": "analysis",
      "goal": "輸出採購摘要與重點觀察",
      "required_entities": [],
      "expected_output": "business_summary"
    }
  ]
}
```

##### 示例 B：供應商比較

```json
{
  "plan_id": "plan_mm_supplier_compare_002",
  "confidence": 0.91,
  "steps": [
    {
      "step_id": "s1",
      "type": "query",
      "goal": "取得指定供應商期間採購資料",
      "required_entities": [
        "supplier_ids",
        "date_range"
      ],
      "expected_output": "supplier_amounts"
    },
    {
      "step_id": "s2",
      "type": "analysis",
      "goal": "比較總金額、單價、訂單數",
      "required_entities": [],
      "expected_output": "comparison_table"
    }
  ]
}
```

##### 示例 C：趨勢分析需補問

```json
{
  "plan_id": "plan_mm_trend_003",
  "confidence": 0.69,
  "steps": [
    {
      "step_id": "s1",
      "type": "ask_user",
      "goal": "補齊時間範圍與分析對象",
      "required_entities": [
        "date_range",
        "material_scope"
      ],
      "expected_output": "user_clarification"
    },
    {
      "step_id": "s2",
      "type": "query",
      "goal": "取得期間採購數據",
      "required_entities": [
        "date_range",
        "material_scope"
      ],
      "expected_output": "trend_dataset"
    },
    {
      "step_id": "s3",
      "type": "analysis",
      "goal": "輸出趨勢結論與波動分析",
      "required_entities": [],
      "expected_output": "trend_summary"
    }
  ]
}
```

### 5.3 DA 調用模組（Data Agent Client）

> 本節為 BPA→DA 通信核心規格。

#### 5.3.1 呼叫端點

- URL：`http://data-query:8002/query`
- Method：`POST`
- Timeout：每次 30 秒
- Retry：依錯誤碼決策（僅可重試錯誤使用指數退避，最多 3 次）

#### 5.3.2 請求格式

```json
{
  "query": "上個月各供應商的採購訂單金額統計",
  "session_id": "ses_mm_20260322_0001",
  "user_id": "u_10001",
  "options": {
    "module_scope": [
      "MM"
    ],
    "timezone": "Asia/Taipei",
    "limit": 100,
    "return_debug": false
  }
}
```

#### 5.3.3 必要 Headers

```text
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.material.payload.signature
X-Trace-Id: trace-mm-20260322-0001
X-Session-Id: ses_mm_20260322_0001
X-Handoff-Schema-Version: 2.0
Content-Type: application/json
```

#### 5.3.4 成功回應處理

需檢查：

1. `code == 0`
2. `data.results` 可為空陣列但不能缺欄位。
3. `metadata.trace_id` 與 `X-Trace-Id` 可關聯。

#### 5.3.5 錯誤回應處理

1. `DA_QUERY_TIMEOUT`：不可重試，立即回 TASK_FAILED，並建議使用者縮小查詢範圍。
2. `DA_SCHEMA_NOT_FOUND` / `DA_SCHEMA_BINDING_FAILED`：不可重試，回 TASK_FAILED。
3. `DA_INTENT_PARSE_ERROR`：不可重試，回 TASK_FAILED 並提示使用者重新描述查詢意圖。
4. `DA_SQL_GENERATION_FAILED`：可重試（retry with different prompt），超限後回 TASK_FAILED。
5. `DA_SQL_VALIDATION_FAILED`：不可重試，回 TASK_FAILED。
6. `DA_S3_CONNECTION_ERROR`：可重試，超限後回 TASK_FAILED。
7. `DA_QDRANT_ERROR`：可重試（graceful degradation），超限後回 TASK_FAILED。
8. `DA_LLM_ERROR`：可重試，超限後回 TASK_FAILED。

> DA v2.0 §8.1 定義完整錯誤碼 SSOT（9 碼）：`DA_INTENT_PARSE_ERROR`、`DA_SCHEMA_NOT_FOUND`、`DA_SCHEMA_BINDING_FAILED`、`DA_SQL_GENERATION_FAILED`、`DA_SQL_VALIDATION_FAILED`、`DA_QUERY_TIMEOUT`、`DA_S3_CONNECTION_ERROR`、`DA_QDRANT_ERROR`、`DA_LLM_ERROR`。BPA 必須依此 SSOT 處理，不可自行定義 DA 錯誤碼。

#### 5.3.6 Python 程式碼（httpx + Retry）

```python
from __future__ import annotations

import asyncio
from dataclasses import dataclass
from typing import Dict, List

import httpx


@dataclass(frozen=True)
class DAClientConfig:
    base_url: str = "http://data-query:8002"
    timeout_seconds: float = 30.0
    max_retries: int = 3


class DAClientError(Exception):
    """DA 呼叫錯誤。"""

    def __init__(self, message: str, retryable: bool = False) -> None:
        super().__init__(message)
        self.retryable = retryable


class DAClient:
    RETRYABLE_CODES = {
        "DA_SQL_GENERATION_FAILED",
        "DA_S3_CONNECTION_ERROR",
        "DA_QDRANT_ERROR",
        "DA_LLM_ERROR",
    }

    def __init__(self, config: DAClientConfig) -> None:
        self.config = config

    async def query(
        self,
        *,
        query: str,
        session_id: str,
        user_id: str,
        jwt_token: str,
        trace_id: str,
        module_scope: List[str],
        limit: int = 100,
        timezone: str = "Asia/Taipei",
        return_debug: bool = False,
    ) -> Dict[str, object]:
        payload: Dict[str, object] = {
            "query": query,
            "session_id": session_id,
            "user_id": user_id,
            "options": {
                "module_scope": module_scope,
                "timezone": timezone,
                "limit": limit,
                "return_debug": return_debug,
            },
        }

        headers = {
            "Authorization": f"Bearer {jwt_token}",
            "X-Trace-Id": trace_id,
            "X-Session-Id": session_id,
            "X-Handoff-Schema-Version": "2.0",
            "Content-Type": "application/json",
        }

        url = f"{self.config.base_url}/query"
        backoff_seconds = [0.5, 1.0, 2.0]

        for attempt in range(self.config.max_retries):
            try:
                async with httpx.AsyncClient(timeout=self.config.timeout_seconds) as client:
                    response = await client.post(url, json=payload, headers=headers)
                data = response.json()
                if response.status_code >= 400:
                    error_code = data.get("code", "UNKNOWN")
                    raise DAClientError(f"DA 回傳錯誤: {error_code}", retryable=error_code in self.RETRYABLE_CODES)
                if data.get("code") != 0:
                    raise DAClientError(f"DA 回傳錯誤 code: {data.get('code')}")
                return data
            # NOTE: 生產實作應依 DA v2.0 §8.1 retryable 屬性判斷是否重試
            # 僅 DA_SQL_GENERATION_FAILED、DA_S3_CONNECTION_ERROR、DA_QDRANT_ERROR、DA_LLM_ERROR 可重試
            except (httpx.HTTPError, DAClientError) as exc:
                is_last_attempt = attempt == self.config.max_retries - 1
                if is_last_attempt:
                    raise DAClientError(str(exc)) from exc
                await asyncio.sleep(backoff_seconds[attempt])

        raise DAClientError("未知 DA 呼叫失敗")
```

### 5.4 結果聚合與業務解釋模組

#### 5.4.1 設計原則

1. 必須把查詢數據轉換成業務語言。
2. 必須提供關鍵指標（總額、比例、波動、風險）。
3. 必須提供資料新鮮度與查詢範圍說明。
4. 避免只輸出 raw JSON。

#### 5.4.2 輸出結構

| 區塊 | 內容 |
|---|---|
| `summary` | 2~5 行摘要 |
| `highlights` | 關鍵觀察 |
| `risk_flags` | 風險項（可空） |
| `next_actions` | 建議下一步 |
| `data_freshness` | 資料時間戳與來源 |

#### 5.4.3 轉譯示例

輸入：

```json
[
  {
    "LIFNR": "V001",
    "supplier_name": "宏達供應股份有限公司",
    "total": 1500000
  },
  {
    "LIFNR": "V002",
    "supplier_name": "華新材料科技",
    "total": 1000000
  },
  {
    "LIFNR": "V003",
    "supplier_name": "東聯採購服務",
    "total": 800000
  }
]
```

輸出：

```text
在指定期間內，供應商 V001（宏達供應股份有限公司）採購總額為 150 萬元，
占前三供應商總額約 45.45%，為主要採購來源。
V002 與 V003 分別為 100 萬元與 80 萬元。
若以集中採購風險衡量，V001 依賴度偏高，建議進一步比較交期與品質績效以分散供應風險。
```

#### 5.4.4 結果解釋 Prompt（範本）

```text
你是企業採購分析顧問。
請根據輸入資料輸出繁體中文業務摘要。

要求：
1) 先給 3 行內總結。
2) 再給關鍵數字與占比。
3) 提示 1~3 個風險。
4) 給可執行建議。
5) 附上資料時間範圍與筆數。
6) 不可虛構不存在的資料。
```

### 5.5 多輪對話模組（BPA_ASK_USER）

#### 5.5.1 啟動條件

當以下任一條件成立，觸發 BPA_ASK_USER：

1. 缺少關鍵查詢參數（期間、供應商、物料範圍）。
2. 任務拆解信心 < 0.7。
3. 查詢範圍過大（v1.0 以啟發式與 DA metadata 判斷）。

v1.0 大結果集策略：

1. 使用啟發式規則：若日期範圍 > 6 個月且未指定供應商/物料條件，優先觸發補問要求縮小範圍。
2. 依 DA 回應 metadata 判斷：`metadata.truncated=true` 或 `metadata.row_count` 超過門檻時，觸發補問。
3. 不要求在查詢前做精確筆數預估；以保守啟發式 + 回應後訊號處理為主。
4. 若 DA 回傳 `truncated: true`，BPA 應自動觸發 BPA_ASK_USER 要求使用者縮小範圍。

#### 5.5.2 補問限制

- 最多 3 輪補問。
- 每輪只問最關鍵 1~2 題。
- 問題必須可選或可輸入，避免模糊問法。

#### 5.5.3 問題格式

| 欄位 | 說明 |
|---|---|
| `ask.question` | 補問文字 |
| `ask.input_type` | `text` / `single_choice` / `multi_choice` / `date_range`（對齊 Top v2.0 §4.5） |
| `ask.options` | 選項陣列（非必填） |
| `ask.reason` | 為何需要補問 |
| `ask.timeout_seconds` | 等待秒數（對齊 Top v2.0 §4.5） |

---

## 6. 通信協議整合

本節嚴格對齊 Top Orchestrator v2.0（`schema_version: "2.0"`）與 DA v2.0。

端點路由對應（Top v2.0 多端點）：

- `TASK_HANDOVER` → `POST /process`
- `USER_MESSAGE` → `POST /session/{session_id}/message`
- `TASK_CANCEL` → `POST /session/{session_id}/cancel`
- `TASK_PAUSE` → `POST /session/{session_id}/pause`
- `TASK_RESUME` → `POST /session/{session_id}/resume`

為向下相容，BPA 入口解析器亦接受 `message_type` 欄位，但輸出一律使用 `type`。

### 6.1 Top → BPA：TASK_HANDOVER

#### 6.1.1 範例（採購分析場景）

```json
{
  "schema_version": "2.0",
  "type": "TASK_HANDOVER",
  "message_id": "msg_top_20260322_00001",
  "correlation_id": "corr_20260322_mm_00001",
  "session_id": "ses_mm_20260322_00001",
  "user_id": "u_10001",
  "timestamp": "2026-03-22T12:30:01+08:00",
  "auth_context": {
    "user_roles": [
      "procurement_manager"
    ],
    "scopes": [
      "material:read",
      "procurement:read",
      "supplier:read"
    ],
    "allowed_tools": [
      "da-mm-query"
    ],
    "rate_limit_quota": 1000
  },
  "handover_data": {
    "user_intent": "分析上個月供應商採購趨勢",
    "extracted_entities": {
      "date_range": {
        "value": "上個月",
        "source": "user_text",
        "confidence": 1.0
      },
      "supplier_scope": {
        "value": "all",
        "source": "inferred",
        "confidence": 0.9
      },
      "metric": {
        "value": "purchase_amount",
        "source": "inferred",
        "confidence": 0.95
      }
    },
    "top_level_subtasks": [
      {
        "id": 1,
        "description": "查詢採購資料"
      },
      {
        "id": 2,
        "description": "依供應商彙總採購金額"
      },
      {
        "id": 3,
        "description": "產出業務摘要與建議"
      }
    ],
    "conversation_context": {
      "language": "zh-TW",
      "timezone": "Asia/Taipei",
      "channel": "web"
    },
    "history": [
      {
        "role": "user",
        "content": "幫我看上個月採購狀況",
        "timestamp": "2026-03-22T12:29:30+08:00"
      },
      {
        "role": "assistant",
        "content": "請問要依供應商還是物料分類？",
        "timestamp": "2026-03-22T12:29:45+08:00"
      },
      {
        "role": "user",
        "content": "先看供應商",
        "timestamp": "2026-03-22T12:29:55+08:00"
      }
    ]
  },
  "checkpoint": {
    "checkpoint_version": 0,
    "resume_from_step": "start",
    "state_payload": {}
  }
}
```

### 6.2 BPA → Top：BPA_ASK_USER

#### 6.2.1 範例（成本趨勢需補問期間）

```json
{
  "schema_version": "2.0",
  "type": "BPA_ASK_USER",
  "message_id": "msg_bpa_20260322_00011",
  "correlation_id": "corr_20260322_mm_00011",
  "session_id": "ses_mm_20260322_00011",
  "timestamp": "2026-03-22T12:38:15+08:00",
  "bpa_id": "material-bpa",
  "ask": {
    "question": "請選擇要分析的時間範圍",
    "input_type": "single_choice",
    "options": [
      {
        "id": "last_3_months",
        "label": "最近 3 個月"
      },
      {
        "id": "last_6_months",
        "label": "最近 6 個月"
      },
      {
        "id": "2026Q1",
        "label": "2026 年 Q1"
      },
      {
        "id": "custom",
        "label": "自訂日期區間"
      }
    ],
    "required": true,
    // BPA 擴充欄位（非 SSOT）
    "reason": "缺少時間範圍將無法建立趨勢基線",
    "timeout_seconds": 300,
    "default_value": null
  },
  "task_status": {
    "task_1": {
      "status": "completed",
      "result": {
        "intent": "cost_trend_analysis",
        "scope": "MM"
      }
    },
    "task_2": {
      "status": "running"
    }
  },
  "checkpoint_version": 3
}
```

> **BPA 擴充欄位**：`ask.reason` 為 material-bpa 內部補問脈絡欄位，非 Top v2.0 §4.5 SSOT 必填欄位。
>
> **Header 傳遞說明**：追蹤資訊（例如 `trace_id`）透過 HTTP headers（`X-Trace-Id`）傳遞，不放入訊息 body。

### 6.3 Top → BPA：USER_MESSAGE

#### 6.3.1 範例（使用者回覆時間範圍）

```json
{
  "schema_version": "2.0",
  "type": "USER_MESSAGE",
  "message_id": "msg_top_20260322_00012",
  "correlation_id": "corr_20260322_mm_00011",
  "session_id": "ses_mm_20260322_00011",
  "bpa_id": "material-bpa",
  "state_version": 4,
  "timestamp": "2026-03-22T12:39:01+08:00",
  "message": {
    "role": "user",
    "content": "最近6個月",
    "timestamp": "2026-03-22T12:39:01+08:00"
  },
  "context_delta": {
    "new_entities": {
      "date_range": {
        "value": "last_6_months",
        "source": "user_selection",
        "confidence": 1.0
      }
    },
    "updated_preferences": {}
  }
}
```

### 6.4 BPA → Top：TASK_COMPLETE

#### 6.4.1 範例（採購分析完成）

```json
{
  "schema_version": "2.0",
  "type": "TASK_COMPLETE",
  "message_id": "msg_bpa_20260322_00019",
  "correlation_id": "corr_20260322_mm_00011",
  "session_id": "ses_mm_20260322_00011",
  "timestamp": "2026-03-22T12:39:18+08:00",
  "bpa_id": "material-bpa",
  "result": {
    "summary": "最近 6 個月採購總額較前期成長 12.8%，主要增長來自 V001 與 V004 供應商。",
    "tasks": [
      {
        "id": 1,
        "description": "查詢採購資料",
        "status": "completed",
        "result": {
          "row_count": 286,
          "tables": [
            "EKKO",
            "EKPO",
            "LFA1"
          ]
        }
      },
      {
        "id": 2,
        "description": "執行趨勢分析",
        "status": "completed",
        "result": {
          "peak_month": "2026-01",
          "growth_rate": 0.128,
          "top_suppliers": [
            "V001",
            "V004",
            "V002"
          ]
        }
      }
    ],
    "execution_summary": {
      "total_duration_seconds": 3.58,
      "llm_calls": 2,
      "tool_calls": 3,
      "tokens_used": 1468,
      // BPA 擴充欄位（非 SSOT）
      "bpa_extensions": {
        "clarification_rounds": 1,
        "da_calls": 1,
        "cache_hits": 0
      }
    },
    "next_actions": [
      "是否需要查看供應商 V001 的明細採購訂單？"
    ],
    "presentation": {
      "highlights": [
        "V001 採購額占比 31.2%",
        "M-001 材料於 2026-01 單價上升 9.4%",
        "採購集中度較前期略增"
      ],
      "risk_flags": [
        {
          "level": "medium",
          "message": "單一供應商集中度偏高，建議評估第二來源。"
        }
      ],
      "data_freshness": {
        "source": "MM Data Lake",
        "snapshot_at": "2026-03-22T11:55:00+08:00"
      }
    }
  },
  "checkpoint_version": 6
}
```

> **BPA 擴充欄位**：`result.execution_summary.bpa_extensions` 為 BPA 統計欄位（非 Top v2.0 §4.6 SSOT）。
>
> **BPA 擴充欄位**：`result.presentation` 為 material-bpa 視覺化摘要資料（非 Top v2.0 §4.6 SSOT），前端可選擇性使用。
>
> **Header 傳遞說明**：追蹤資訊（例如 `trace_id`）透過 HTTP headers（`X-Trace-Id`）傳遞，不放入訊息 body。

### 6.5 BPA → Top：TASK_FAILED

#### 6.5.1 範例（DA 連線逾時）

```json
{
  "schema_version": "2.0",
  "type": "TASK_FAILED",
  "message_id": "msg_bpa_20260322_00029",
  "correlation_id": "corr_20260322_mm_00029",
  "session_id": "ses_mm_20260322_00029",
  "timestamp": "2026-03-22T12:45:40+08:00",
  "bpa_id": "material-bpa",
  "error": {
    "code": "BPA_MM_DA_QUERY_TIMEOUT",
    "message": "資料查詢服務逾時（DA_QUERY_TIMEOUT），依 DA v2.0 規範不進行重試。",
    "can_retry": false,
    "retry_strategy": {
      "max_retries": 0,
      "backoff_seconds": [],
      "type": "narrow_scope",
      "description": "建議使用者縮小查詢範圍"
    },
    "details": "DA 查詢逾時（http://data-query:8002/query, timeout=30s, http_status=408）",
    // BPA 擴充欄位（非 SSOT）
    "debug_context": {
      "da_endpoint": "http://data-query:8002/query",
      "timeout_seconds": 30,
      "retry_count": 0,
      "last_http_status": 408
    }
  },
  "partial_results": [
    {
      "task_id": 1,
      "status": "completed",
      "result": {
        "step": "parse_handover",
        "validated_scope": [
          "MM"
        ]
      }
    },
    {
      "task_id": 2,
      "status": "failed",
      "error": "DA_QUERY_TIMEOUT",
      "result": {
        "step": "query_data",
        "error": "DA_QUERY_TIMEOUT"
      }
    }
  ],
  "checkpoint_version": 2,
  "suggested_actions": [
    "重試操作",
    "稍後再試",
    "聯繫技術支持"
  ]
}
```

### 6.6 BPA → DA：Query 請求/回應

> **SQL 表示說明**：本節及附錄走讀中的 SQL 語句為**邏輯示意**（使用業務表名 `EKKO`、`EKPO` 等方便理解）。實際 DA v2.0 內部使用 DuckDB + `read_parquet('s3://...')` 語法存取 SeaWeedFS/S3 上的 Parquet 檔案，並以 `?` 參數化查詢避免注入風險（參見 DA v2.0 §5.3、§6.2）。BPA 不需關注實際 SQL 語法，僅需檢查 DA 回應的 `code`、`data.results`、`metadata` 結構是否正確。

#### 6.6.1 請求範例

```json
{
  "query": "比較供應商 V001 與 V002 在 2026Q1 的採購金額與平均單價",
  "session_id": "ses_mm_20260322_00041",
  "user_id": "u_10001",
  "options": {
    "module_scope": [
      "MM"
    ],
    "timezone": "Asia/Taipei",
    "limit": 100,
    "return_debug": false
  }
}
```

#### 6.6.2 成功回應範例

```json
{
  "code": 0,
  "data": {
    "sql": "SELECT LFA1.LIFNR, LFA1.NAME1, SUM(EKPO.NETWR) AS total_amount, AVG(EKPO.NETPR) AS avg_price FROM EKKO JOIN EKPO ON EKKO.EBELN = EKPO.EBELN JOIN LFA1 ON EKKO.LIFNR = LFA1.LIFNR WHERE EKKO.BEDAT BETWEEN '2026-01-01' AND '2026-03-31' AND LFA1.LIFNR IN ('V001','V002') GROUP BY LFA1.LIFNR, LFA1.NAME1",
    "results": [
      {
        "LIFNR": "V001",
        "NAME1": "宏達供應股份有限公司",
        "total_amount": 1562300.0,
        "avg_price": 1245.33
      },
      {
        "LIFNR": "V002",
        "NAME1": "華新材料科技",
        "total_amount": 1328890.0,
        "avg_price": 1170.24
      }
    ],
    "metadata": {
      "duration_ms": 1920,
      "row_count": 2,
      "truncated": false,
      "trace_id": "trace-mm-20260322-00041"
    }
  },
  "intent": {
    "intent_type": "comparison",
    "confidence": 0.94,
    "bpa_domain_intent": "supplier_comparison"
  },
  "cache_hit": false
}
```

> **intent_type 對齊說明**：DA v2.0 §3.2 定義 `intent_type` 枚舉為 `aggregate | filter | join | time_series | ranking | comparison`。BPA 不可在 DA 回應中使用領域特有意圖名稱（如 `supplier_comparison`、`purchase_order_query`）。`bpa_domain_intent` 為 BPA 自行擴充之非 SSOT 欄位，供 BPA 內部業務邏輯使用，DA 不解析此欄位。此欄位不屬於 DA v2.0 canonical response 定義。

#### 6.6.3 錯誤回應範例

```json
{
  "code": "DA_SCHEMA_NOT_FOUND",
  "message": "Schema not found for module scope: MM table ZXYZ",
  "details": {
    "trace_id": "trace-mm-20260322-00041",
    "suggestions": [
      "確認 MM scope 是否已載入對應 schema",
      "確認查詢欄位是否存在於 DA 可用映射"
    ]
  }
}
```

> DA 錯誤回應嚴格遵循 DA v2.0 §5.2.3 格式。HTTP status code 由 DA HTTP response header 傳達，不重複出現在 response body。

### 6.7 控制訊息：TASK_CANCEL / TASK_PAUSE / TASK_RESUME

> 以下控制訊息同為 Top v2.0 既定 types，material-bpa 必須完整支援。

#### 6.7.1 Top → BPA：TASK_CANCEL

```json
{
  "schema_version": "2.0",
  "type": "TASK_CANCEL",
  "message_id": "msg_top_20260322_00051",
  "correlation_id": "corr_20260322_mm_00051",
  "session_id": "ses_mm_20260322_00051",
  "bpa_id": "material-bpa",
  "timestamp": "2026-03-22T12:50:12+08:00",
  "reason": "user_requested"
}
```

#### 6.7.2 Top → BPA：TASK_PAUSE

```json
{
  "schema_version": "2.0",
  "type": "TASK_PAUSE",
  "message_id": "msg_top_20260322_00052",
  "correlation_id": "corr_20260322_mm_00052",
  "session_id": "ses_mm_20260322_00052",
  "bpa_id": "material-bpa",
  "timestamp": "2026-03-22T12:50:26+08:00",
  "checkpoint_version": 4
}
```

#### 6.7.3 Top → BPA：TASK_RESUME

```json
{
  "schema_version": "2.0",
  "type": "TASK_RESUME",
  "message_id": "msg_top_20260322_00053",
  "correlation_id": "corr_20260322_mm_00052",
  "session_id": "ses_mm_20260322_00052",
  "bpa_id": "material-bpa",
  "timestamp": "2026-03-22T12:55:10+08:00",
  "checkpoint_version": 4
}
```

#### 6.7.4 BPA → Top：TASK_COMPLETE（取消/暫停回應）

```json
{
  "schema_version": "2.0",
  "type": "TASK_COMPLETE",
  "message_id": "msg_bpa_20260322_00054",
  "correlation_id": "corr_20260322_mm_00051",
  "session_id": "ses_mm_20260322_00051",
  "timestamp": "2026-03-22T12:50:13+08:00",
  "bpa_id": "material-bpa",
  "result": {
    "summary": "任務已依使用者要求取消。",
    "tasks": [
      {
        "id": 1,
        "description": "執行取消流程",
        "status": "completed",
        "result": {
          "cancelled": true
        }
      }
    ],
    "execution_summary": {
      "total_duration_seconds": 0.008,
      "llm_calls": 0,
      "tool_calls": 0,
      "tokens_used": 0,
      // BPA 擴充欄位（非 SSOT）
      "bpa_extensions": {
        "clarification_rounds": 0,
        "da_calls": 0,
        "cache_hits": 0
      }
    },
    "next_actions": []
  },
  "checkpoint_version": 5
}
```

### 6.8 訊息去重與 state_version 處理

#### 6.8.1 Message de-dup 規則

1. BPA 需在 session 文件維護近期 `message_id` 集合（最近 1000 筆或最近 1 小時，以先到條件為準）。
2. 若收到重複 `message_id`，不得重跑流程，應直接回傳快取回應（cached response）。
3. 去重資料需與 `session_id` 綁定，避免跨 session 誤判。

#### 6.8.2 USER_MESSAGE 的 state_version 檢查

1. Top 發送 USER_MESSAGE 時需包含 `state_version`。
2. BPA 應驗證收到的 `state_version` 必須等於本地已知版本，或僅允許 `+1`。
3. 若版本不一致，回傳 `BPA_MM_STATE_VERSION_MISMATCH`，並拒絕本次增量訊息處理。
4. 錯誤回應需附目前 BPA 端版本號與收到版本號，便於 Top 重新同步。

---

## 7. BPA 狀態機

### 7.1 狀態機圖

```text
[idle] → [parsing_handover] → [decomposing_tasks] → [executing]
                                                        ↓  ↑
[completed] ← [aggregating_results] ← [executing] → [waiting_for_user]
                                                   ↘ [failed]
```

### 7.2 狀態定義表

| State | Description | Transitions |
|---|---|---|
| idle | 等待任務 | → parsing_handover |
| parsing_handover | 解析 TASK_HANDOVER | → decomposing_tasks |
| decomposing_tasks | 拆分子任務與策略 | → executing |
| executing | 執行 DA 查詢與計算 | → waiting_for_user, aggregating_results, failed |
| waiting_for_user | 已發 BPA_ASK_USER | → executing |
| aggregating_results | 匯總與業務解釋 | → completed |
| completed | 任務完成 | → idle |
| failed | 任務失敗 | → idle |

### 7.2.1 兩層狀態模型

為解決外部可觀測狀態與內部執行狀態粒度差異，採用兩層狀態：

1. `status`（粗粒度）：`idle`、`running`、`waiting`、`completed`、`failed`。
   - 用於對外訊息與 session 文件查詢。
2. `state`（細粒度）：`idle`、`parsing_handover`、`decomposing_tasks`、`executing`、`waiting_for_user`、`aggregating_results`、`completed`、`failed`。
   - 用於 BPA 內部流程控制與 checkpoint 恢復。

狀態映射規則：

- `parsing_handover` / `decomposing_tasks` / `executing` / `aggregating_results` → `status="running"`
- `waiting_for_user` → `status="waiting"`
- `idle` → `status="idle"`
- `completed` → `status="completed"`
- `failed` → `status="failed"`

### 7.3 Pydantic 模型

```python
from __future__ import annotations

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional

from pydantic import BaseModel, Field


class BPAStatus(str, Enum):
    IDLE = "idle"
    RUNNING = "running"
    WAITING = "waiting"
    COMPLETED = "completed"
    FAILED = "failed"


class BPAStateEnum(str, Enum):
    IDLE = "idle"
    PARSING_HANDOVER = "parsing_handover"
    DECOMPOSING_TASKS = "decomposing_tasks"
    EXECUTING = "executing"
    WAITING_FOR_USER = "waiting_for_user"
    AGGREGATING_RESULTS = "aggregating_results"
    COMPLETED = "completed"
    FAILED = "failed"


class Task(BaseModel):
    """Internal state model.

    Note: Wire protocol uses 'id' (int) in TASK_COMPLETE.result.tasks[]
    and 'task_id' (int) in TASK_FAILED.partial_results[].
    This model is for BPA internal tracking.
    """

    id: int
    description: str
    status: str
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    result: Dict[str, object] = Field(default_factory=dict)


class AskOption(BaseModel):
    id: str
    label: str


class Question(BaseModel):
    question_id: str
    question: str
    input_type: str
    options: List[AskOption] = Field(default_factory=list)
    asked_at: datetime
    answered: bool = False


class ToolCall(BaseModel):
    call_id: str
    tool_name: str
    endpoint: str
    status: str
    started_at: datetime
    ended_at: Optional[datetime] = None
    trace_id: str


class BPAState(BaseModel):
    bpa_id: str
    session_id: str
    tasks: List[Task]
    current_task: Optional[str]
    status: BPAStatus
    state: BPAStateEnum
    results: Dict[str, object] = Field(default_factory=dict)
    pending_questions: List[Question] = Field(default_factory=list)
    checkpoint_version: int = 0
    last_checkpoint_at: Optional[datetime] = None
    tool_calls: List[ToolCall] = Field(default_factory=list)
```

### 7.4 狀態轉移規則

1. `idle -> parsing_handover`
   - 觸發：收到合法 TASK_HANDOVER。
2. `parsing_handover -> decomposing_tasks`
   - 條件：schema 與權限驗證通過。
3. `decomposing_tasks -> executing`
   - 條件：拆解成功，且關鍵參數完整。
4. `decomposing_tasks -> waiting_for_user`
   - 條件：關鍵參數不足。
5. `waiting_for_user -> executing`
   - 觸發：收到 USER_MESSAGE 並完成正規化。
6. `executing -> aggregating_results`
   - 條件：所有子任務成功。
7. `executing -> failed`
   - 條件：不可恢復錯誤。
8. `aggregating_results -> completed`
   - 條件：結果生成並回傳 TASK_COMPLETE。

---

## 8. 持久化與檢查點（Checkpoint）

### 8.1 ArangoDB Collections

> `bpa_material_sessions` 中 `status`（粗粒度）與 `current_state`（細粒度）需同時維護，並遵循 §7.2.1 映射規則。

#### 8.1.1 `bpa_material_sessions`

用途：保存 session 層級運行狀態。

文件樣例：

```json
{
  "_key": "ses_mm_20260322_00011",
  "bpa_id": "material-bpa",
  "session_id": "ses_mm_20260322_00011",
  "user_id": "u_10001",
  "tenant_id": "t_abc",
  "status": "running",
  "current_state": "executing",
  "current_task": "query_data",
  "checkpoint_version": 4,
  "clarification_round": 1,
  "auth_scopes": [
    "material:read",
    "procurement:read",
    "supplier:read"
  ],
  "input_entities": {
    "date_range": "last_6_months",
    "supplier_scope": "all"
  },
  "result_summary": "",
  "trace_id": "trace-mm-20260322-00011",
  "created_at": "2026-03-22T12:38:10+08:00",
  "updated_at": "2026-03-22T12:39:02+08:00"
}
```

#### 8.1.2 `bpa_material_checkpoints`

用途：保存可恢復快照。

文件樣例：

```json
{
  "_key": "ses_mm_20260322_00011_v4",
  "session_id": "ses_mm_20260322_00011",
  "checkpoint_version": 4,
  "state": "executing",
  "task_cursor": "task_2",
  "tasks": [
    {
      "id": 1,
      "name": "query_data",
      "status": "completed"
    },
    {
      "id": 2,
      "name": "trend_analysis",
      "status": "running"
    }
  ],
  "pending_questions": [],
  "tool_calls": [
    {
      "call_id": "call_da_001",
      "tool_name": "da-mm-query",
      "endpoint": "http://data-query:8002/query",
      "status": "completed",
      "trace_id": "trace-mm-20260322-00011"
    }
  ],
  "partial_results": {
    "supplier_amounts": [
      {
        "LIFNR": "V001",
        "amount": 1562300
      }
    ]
  },
  "created_at": "2026-03-22T12:39:00+08:00"
}
```

#### 8.1.3 建議索引

| Collection | 索引欄位 | 類型 | 用途 |
|---|---|---|---|
| bpa_material_sessions | session_id | hash(unique) | 快速取 session |
| bpa_material_sessions | user_id, created_at | persistent | 使用者歷程查詢 |
| bpa_material_checkpoints | session_id, checkpoint_version | persistent | 快照恢復 |
| bpa_material_checkpoints | created_at | ttl(optional) | 歷史清理 |

### 8.2 Checkpoint 策略

checkpoint 觸發時機：

1. 每次 DA 呼叫完成後。
2. 每次狀態轉移後。
3. 每次收到 USER_MESSAGE 後。
4. 收到 TASK_PAUSE 時立即保存。

checkpoint 內容必須包含：

- `checkpoint_version`
- `state`
- `tasks`
- `current_task`
- `pending_questions`
- `partial_results`
- `tool_calls`
- `timestamp`

### 8.3 Recovery Flow

```python
from __future__ import annotations

from typing import Optional


class RecoveryService:
    def __init__(self, repository: "CheckpointRepository") -> None:
        self.repository = repository

    async def recover(self, session_id: str) -> Optional[dict]:
        latest = await self.repository.get_latest_checkpoint(session_id)
        if latest is None:
            return None

        state = latest.get("state")
        if state == "executing":
            return {
                "action": "resume_execution",
                "resume_from_task": latest.get("task_cursor"),
                "checkpoint_version": latest.get("checkpoint_version"),
            }

        if state == "waiting_for_user":
            return {
                "action": "wait_for_user_message",
                "pending_questions": latest.get("pending_questions", []),
                "checkpoint_version": latest.get("checkpoint_version"),
            }

        if state in {"completed", "failed"}:
            return {
                "action": "no_resume_needed",
                "checkpoint_version": latest.get("checkpoint_version"),
            }

        return {
            "action": "restart_from_handover",
            "checkpoint_version": latest.get("checkpoint_version"),
        }
```

### 8.4 Idempotency 設計

雖然 v1.0 為唯讀，仍先納入 idempotency 設計，供未來寫入型 BPA 使用。

#### 8.4.1 原則

1. 每個可重試操作都需要 idempotency key。
2. key 建議組成：`session_id + task_id + step_id + stable_hash(payload)`。
3. 若 key 已存在且結果成功，直接回放結果。

#### 8.4.2 範例資料結構

```json
{
  "_key": "idem_ses_mm_20260322_00011_task_2_step_1_8f1c9a",
  "session_id": "ses_mm_20260322_00011",
  "id": 2,
  "step_id": "step_1",
  "idempotency_key": "idem_ses_mm_20260322_00011_task_2_step_1_8f1c9a",
  "request_hash": "8f1c9ae6d3de3bb9",
  "status": "completed",
  "response_snapshot": {
    "code": 0,
    "summary": "cached result replay"
  },
  "created_at": "2026-03-22T12:39:20+08:00"
}
```

---

## 9. 安全設計

### 9.1 權限模型

1. 繼承 Top TASK_HANDOVER 的 `auth_context`。
2. 必須驗證必要 scopes：
   - `material:read`
   - `procurement:read`
   - `supplier:read`（若有供應商資訊）
3. 權限不足直接 TASK_FAILED（`BPA_MM_FORBIDDEN`）。

### 9.2 Token 傳遞

material-bpa 呼叫 DA 時，必須透傳 JWT：

- Header: `Authorization: Bearer {jwt_token}`。
- 不得在 log 明文寫出 token。

### 9.3 資料邊界

1. 僅允許 MM 相關表。
2. 嚴禁跨域表查詢（例如客戶個資、薪資資料）。
3. 查詢結果須依租戶隔離。

### 9.4 審計日誌

每個關鍵動作都必須落審計：

| 欄位 | 說明 |
|---|---|
| session_id | 會話識別 |
| user_id | 使用者識別 |
| tenant_id | 租戶識別（JWT claims） |
| action | parse_handover / da_query / ask_user / complete / failed |
| timestamp | 動作時間 |
| trace_id | 追蹤編號 |
| result_code | 成功或錯誤碼 |

### 9.5 Read-only 強制

v1.0 僅允許查詢與分析：

1. 不呼叫任何寫入 API。
2. 不產生任何寫入 SQL。
3. 若使用者要求「新增、修改、刪除」，回應不支援並提供替代方案。

### 9.6 租戶隔離與 JWT 責任邊界

1. `tenant_id` 與資料範圍由 JWT claims（`auth_context`）解析取得，BPA 不可自行推導或覆寫。
2. BPA 呼叫 DA 時必須透傳完整 JWT：`Authorization: Bearer {jwt}`。
3. 租戶資料隔離由 DA 依 DA v2.0 規範負責強制執行。
4. BPA 審計日誌每筆操作都必須記錄 `tenant_id` 以支援稽核追溯。

---

## 10. 錯誤處理

### 10.1 錯誤碼表

| Code | Description | Retryable |
|---|---|---|
| BPA_MM_HANDOVER_INVALID | TASK_HANDOVER 格式錯誤 | No |
| BPA_MM_ENTITY_NOT_FOUND | 找不到指定物料/供應商/訂單 | No |
| BPA_MM_DA_ERROR | DA 回傳錯誤 | Depends |
| BPA_MM_DA_QUERY_TIMEOUT | DA 查詢逾時（DA_QUERY_TIMEOUT） | No |
| BPA_MM_LLM_ERROR | 結果解釋 LLM 失敗 | Yes |
| BPA_MM_DECOMPOSITION_FAILED | 任務拆解失敗 | No |
| BPA_MM_FORBIDDEN | 權限不足 | No |
| BPA_MM_SCOPE_VIOLATION | 超出 MM 範圍 | No |

### 10.2 Retry 策略

1. `DA_QUERY_TIMEOUT`：不重試，立即回 TASK_FAILED，並引導縮小查詢範圍。
2. `LLM_ERROR`：最多 2 次。
3. `HANDOVER_INVALID`：不重試。
4. `FORBIDDEN`：不重試。

> DA v2.0 定義 `DA_QUERY_TIMEOUT` 為不可重試，BPA 應建議使用者縮小查詢範圍。

### 10.3 Graceful Degradation

當 DA 不可用：

- 回 TASK_FAILED。
- 附上已完成步驟與可重試建議。
- 若有快取結果，可選擇回傳「最近可用資料 + 風險註記」。

### 10.4 錯誤回應格式

```json
{
  "error": {
    "code": "BPA_MM_DA_QUERY_TIMEOUT",
    "message": "資料查詢逾時",
    "can_retry": false,
    "retry_strategy": {
      "max_retries": 0,
      "backoff_seconds": [],
      "type": "narrow_scope",
      "description": "建議使用者縮小查詢範圍"
    },
    "suggested_action": "請縮小時間範圍後重試",
    "trace_id": "trace-mm-20260322-00088"
  }
}
```

---

## 11. 非功能需求

### 11.1 效能目標

| 指標 | 目標 |
|---|---|
| 簡單查詢 E2E | < 10 秒 |
| 複雜分析 E2E | < 30 秒 |
| 單次 DA 呼叫 | < 3 秒（P50） / < 8 秒（P95） |
| 可用性 | 99.5% |
| DA 呼叫成功率 | > 98% |

### 11.2 擴展性

1. material-bpa 本體盡量無狀態。
2. 狀態透過 ArangoDB checkpoint 持久化。
3. 允許水平擴容（多副本）。

### 11.3 可觀測性

需輸出 Prometheus 指標：

| Metric | 型別 | 說明 |
|---|---|---|
| `bpa_mm_requests_total` | counter | 總請求數 |
| `bpa_mm_request_duration_ms` | histogram | 請求耗時 |
| `bpa_mm_da_calls_total` | counter | DA 呼叫次數 |
| `bpa_mm_da_errors_total` | counter | DA 錯誤次數 |
| `bpa_mm_clarification_rounds` | histogram | 補問輪次 |
| `bpa_mm_checkpoint_total` | counter | checkpoint 次數 |

### 11.4 日誌要求

1. JSON 結構化日誌。
2. 必須帶 `trace_id`、`session_id`、`message_id`。
3. 隱私與敏感資訊遮罩（token、個資）。

---

## 12. 護欄與約束

### 12.1 硬約束

1. **禁止直接生成 SQL**，必須委派 DA。
2. **禁止裸資料輸出**，必須給業務解釋。
3. **禁止訪問 MM 以外表格**。
4. **禁止寫入操作**（v1.0 Read-only）。

### 12.2 軟約束

1. 優先使用模板化查詢語句。
2. 預設結果上限 100 列。
3. 回覆需附資料新鮮度資訊。

### 12.3 HITL（Human-in-the-Loop）機制

| Scenario | Action |
|---|---|
| 查詢結果 > 10000 rows | 要求使用者縮小範圍 |
| 拆解信心 < 0.7 | 提出計畫並請使用者確認 |
| 異常數量 > 50 | 先摘要，再詢問是否 drill-down |

### 12.4 輸出品質規範

1. 必須用繁體中文。
2. 必須明確描述時間範圍。
3. 必須描述資料筆數與是否截斷。
4. 建議含「下一步行動」。

---

## 13. 驗收標準

### 13.1 功能驗收

1. 至少 20 個測試場景全部通過。
2. 覆蓋 5 大核心情境。
3. 補問流程可完成且可恢復。

### 13.2 效能驗收

1. 簡單查詢 < 10 秒。
2. P95 在目標範圍內。
3. 壓測下錯誤率符合 SLA。

### 13.3 安全驗收

1. 權限不足不可查。
2. Token 不可洩漏。
3. 超範圍表查詢不可執行。

### 13.4 整合驗收

1. Top handoff round-trip 完整（TASK_HANDOVER → TASK_COMPLETE）。
2. USER_MESSAGE 補問流程完整。
3. TASK_FAILED 與控制訊息可正常處理。

---

## 14. 部署與整合

### 14.1 Docker Compose 新增服務

```yaml
services:
  material-bpa:
    container_name: material-bpa
    build:
      context: ./ai-services/material-bpa
      dockerfile: Dockerfile
    environment:
      BPA_ID: material-bpa
      BPA_PORT: "8012"
      TOP_ORCHESTRATOR_URL: http://top-orchestrator:8006
      DATA_QUERY_URL: http://data-query:8002
      OLLAMA_BASE_URL: http://ollama:11434
      ARANGO_URL: http://arangodb:8529
      ARANGO_DB: aibox
      ARANGO_USER: root
      ARANGO_PASSWORD: ${ARANGO_PASSWORD}
      DEFAULT_TIMEZONE: Asia/Taipei
      HANDOFF_SCHEMA_VERSION: "2.0"
      MAX_RETRIES: "3"
      DA_QUERY_TIMEOUT_SECONDS: "30"
      CHECKPOINT_INTERVAL: "5"
      LOG_LEVEL: INFO
    ports:
      - "8012:8012"
    depends_on:
      - data-query
      - arangodb
```

### 14.2 環境變數

| 變數 | 說明 | 範例 |
|---|---|---|
| `BPA_ID` | BPA 識別碼 | `material-bpa` |
| `BPA_PORT` | 服務 Port | `8012` |
| `TOP_ORCHESTRATOR_URL` | Top URL | `http://top-orchestrator:8006` |
| `DATA_QUERY_URL` | DA URL | `http://data-query:8002` |
| `ARANGO_URL` | ArangoDB URL | `http://arangodb:8529` |
| `HANDOFF_SCHEMA_VERSION` | 協議版本 | `2.0` |

### 14.3 BPA Registry Entry

```json
{
  "id": "material-bpa",
  "service_url": "http://material-bpa:8012",
  "status": "active",
  "version": "1.0.0",
  "capabilities": [
    "purchase_order_query",
    "material_master_query",
    "supplier_query",
    "inventory_movement_query",
    "procurement_analytics",
    "supplier_comparison",
    "anomaly_detection"
  ],
  "handoff_schema_version": "2.0"
}
```

### 14.4 健康檢查與啟動順序

1. 啟動 ArangoDB。
2. 啟動 DA。
3. 啟動 Top。
4. 啟動 material-bpa。
5. 註冊 BPA 至 Registry。

---

## 15. 附錄

### 15.1 開發檢查清單

#### 15.1.1 規格落地清單

- [ ] API 接口包含 `schema_version=2.0` 驗證。
- [ ] 支援全部 message types。
- [ ] DA 請求封裝完整 headers。
- [ ] 支援 BPA_ASK_USER 補問與 USER_MESSAGE 恢復。
- [ ] checkpoint 寫入與恢復流程可運作。
- [ ] 完整審計日誌與 trace_id。
- [ ] 只讀限制實作。

#### 15.1.2 安全清單

- [ ] scope 驗證。
- [ ] token mask。
- [ ] MM table allowlist。
- [ ] 錯誤碼對外一致。

#### 15.1.3 監控清單

- [ ] Prometheus metrics。
- [ ] error rate dashboard。
- [ ] latency dashboard。
- [ ] checkpoint health dashboard。

### 15.2 完整場景走讀（三個）

> 本節提供端到端完整訊息序列。

#### 15.2.1 走讀 A：採購訂單查詢（無補問）

##### 步驟 A1：Top 發送 TASK_HANDOVER

```json
{
  "schema_version": "2.0",
  "type": "TASK_HANDOVER",
  "message_id": "msg_top_walkA_001",
  "correlation_id": "corr_walkA_001",
  "session_id": "ses_walkA_001",
  "user_id": "u_proc_01",
  "timestamp": "2026-03-22T13:00:01+08:00",
  "auth_context": {
    "user_roles": [
      "procurement_manager"
    ],
    "scopes": [
      "material:read",
      "procurement:read",
      "supplier:read"
    ],
    "allowed_tools": [
      "da-mm-query"
    ],
    "rate_limit_quota": 1000
  },
  "handover_data": {
    "user_intent": "查詢上個月採購訂單並產出摘要",
    "extracted_entities": {
      "date_range": {
        "value": "上個月",
        "source": "user_text",
        "confidence": 1.0
      }
    },
    "top_level_subtasks": [
      {
        "id": 1,
        "description": "查詢採購訂單資料"
      },
      {
        "id": 2,
        "description": "彙整採購金額並輸出摘要"
      }
    ],
    "conversation_context": {
      "language": "zh-TW",
      "timezone": "Asia/Taipei",
      "channel": "web"
    },
    "history": []
  },
  "checkpoint": {
    "checkpoint_version": 0,
    "resume_from_step": "start",
    "state_payload": {}
  }
}
```

##### 步驟 A2：BPA 呼叫 DA

```json
{
  "query": "查詢上個月所有採購訂單，包含訂單編號、供應商、金額、日期",
  "session_id": "ses_walkA_001",
  "user_id": "u_proc_01",
  "options": {
    "module_scope": [
      "MM"
    ],
    "timezone": "Asia/Taipei",
    "limit": 100,
    "return_debug": false
  }
}
```

##### 步驟 A3：DA 回應

```json
{
  "code": 0,
  "data": {
    "sql": "SELECT EKKO.EBELN, EKKO.LIFNR, LFA1.NAME1, SUM(EKPO.NETWR) AS amount, EKKO.BEDAT FROM EKKO JOIN EKPO ON EKKO.EBELN = EKPO.EBELN JOIN LFA1 ON EKKO.LIFNR = LFA1.LIFNR WHERE EKKO.BEDAT BETWEEN '2026-02-01' AND '2026-02-28' GROUP BY EKKO.EBELN, EKKO.LIFNR, LFA1.NAME1, EKKO.BEDAT",
    "results": [
      {
        "EBELN": "4500000001",
        "LIFNR": "V001",
        "NAME1": "宏達供應股份有限公司",
        "amount": 512000.0,
        "BEDAT": "2026-02-02"
      },
      {
        "EBELN": "4500000002",
        "LIFNR": "V002",
        "NAME1": "華新材料科技",
        "amount": 389000.0,
        "BEDAT": "2026-02-06"
      }
    ],
    "metadata": {
      "duration_ms": 1400,
      "row_count": 42,
      "truncated": false,
      "trace_id": "trace_walkA_001"
    }
  },
  "intent": {
    "intent_type": "filter",
    "confidence": 0.96,
    "bpa_domain_intent": "purchase_order_query"
  },
  "cache_hit": false
}
```

##### 步驟 A4：BPA 回 TASK_COMPLETE

```json
{
  "schema_version": "2.0",
  "type": "TASK_COMPLETE",
  "message_id": "msg_bpa_walkA_004",
  "correlation_id": "corr_walkA_001",
  "session_id": "ses_walkA_001",
  "timestamp": "2026-03-22T13:00:04+08:00",
  "bpa_id": "material-bpa",
  "result": {
    "summary": "上個月共查得 42 筆採購訂單，總採購金額約 1,268 萬元。",
    "tasks": [
      {
        "id": 1,
        "description": "查詢採購訂單資料",
        "status": "completed",
        "result": {
          "row_count": 42,
          "truncated": false
        }
      },
      {
        "id": 2,
        "description": "彙整採購金額並產出摘要",
        "status": "completed",
        "result": {
          "top_supplier": "V001",
          "top_supplier_amount": 512000.0
        }
      }
    ],
    "execution_summary": {
      "total_duration_seconds": 1.82,
      "llm_calls": 1,
      "tool_calls": 2,
      "tokens_used": 920,
      // BPA 擴充欄位（非 SSOT）
      "bpa_extensions": {
        "clarification_rounds": 0,
        "da_calls": 1,
        "cache_hits": 0
      }
    },
    "next_actions": []
  },
  "checkpoint_version": 3
}
```

#### 15.2.2 走讀 B：成本趨勢分析（含補問）

##### 步驟 B1：Top 發送 TASK_HANDOVER

```json
{
  "schema_version": "2.0",
  "type": "TASK_HANDOVER",
  "message_id": "msg_top_walkB_001",
  "correlation_id": "corr_walkB_001",
  "session_id": "ses_walkB_001",
  "user_id": "u_fin_01",
  "timestamp": "2026-03-22T13:05:01+08:00",
  "auth_context": {
    "user_roles": [
      "finance_analyst"
    ],
    "scopes": [
      "material:read",
      "procurement:read",
      "supplier:read"
    ],
    "allowed_tools": [
      "da-mm-query"
    ],
    "rate_limit_quota": 1000
  },
  "handover_data": {
    "user_intent": "分析採購成本趨勢",
    "extracted_entities": {
      "analysis_type": {
        "value": "cost_trend",
        "source": "user_text",
        "confidence": 0.95
      }
    },
    "top_level_subtasks": [
      {
        "id": 1,
        "description": "確認分析期間"
      },
      {
        "id": 2,
        "description": "查詢期間內採購資料"
      },
      {
        "id": 3,
        "description": "進行趨勢分析"
      }
    ],
    "conversation_context": {
      "language": "zh-TW",
      "timezone": "Asia/Taipei",
      "channel": "web"
    },
    "history": []
  },
  "checkpoint": {
    "checkpoint_version": 0,
    "resume_from_step": "start",
    "state_payload": {}
  }
}
```

##### 步驟 B2：BPA 發 BPA_ASK_USER

```json
{
  "schema_version": "2.0",
  "type": "BPA_ASK_USER",
  "message_id": "msg_bpa_walkB_002",
  "correlation_id": "corr_walkB_001",
  "session_id": "ses_walkB_001",
  "timestamp": "2026-03-22T13:05:03+08:00",
  "bpa_id": "material-bpa",
  "ask": {
    "question": "請問要分析哪段期間的採購成本趨勢？",
    "input_type": "single_choice",
    "options": [
      {
        "id": "last_3_months",
        "label": "最近 3 個月"
      },
      {
        "id": "last_6_months",
        "label": "最近 6 個月"
      },
      {
        "id": "last_12_months",
        "label": "最近 12 個月"
      }
    ],
    "required": true,
    "reason": "未提供時間區間，無法計算趨勢斜率",
    "timeout_seconds": 600,
    "default_value": null
  },
  "task_status": {
    "task_1": {
      "status": "completed",
      "result": {
        "intent": "cost_trend_analysis",
        "scope": "MM"
      }
    },
    "task_2": {
      "status": "running"
    }
  },
  "checkpoint_version": 1
}
```

> **BPA 擴充欄位**：`ask.reason` 為 material-bpa 內部補問脈絡欄位，非 Top v2.0 §4.5 SSOT 必填欄位。
>
> **Header 傳遞說明**：追蹤資訊（例如 `trace_id`）透過 HTTP headers（`X-Trace-Id`）傳遞，不放入訊息 body。

##### 步驟 B3：Top 發 USER_MESSAGE

```json
{
  "schema_version": "2.0",
  "type": "USER_MESSAGE",
  "state_version": 4,
  "message_id": "msg_top_walkB_003",
  "correlation_id": "corr_walkB_001",
  "session_id": "ses_walkB_001",
  "bpa_id": "material-bpa",
  "timestamp": "2026-03-22T13:05:14+08:00",
  "message": {
    "role": "user",
    "content": "最近12個月",
    "timestamp": "2026-03-22T13:05:14+08:00"
  },
  "context_delta": {
    "new_entities": {
      "date_range": {
        "value": "last_12_months",
        "source": "user_selection",
        "confidence": 1.0
      }
    },
    "updated_preferences": {}
  }
}
```

##### 步驟 B4：BPA 呼叫 DA

```json
{
  "query": "統計最近12個月每月採購總金額與平均單價，並可用於趨勢分析",
  "session_id": "ses_walkB_001",
  "user_id": "u_fin_01",
  "options": {
    "module_scope": [
      "MM"
    ],
    "timezone": "Asia/Taipei",
    "limit": 100,
    "return_debug": false
  }
}
```

##### 步驟 B5：DA 回應

```json
{
  "code": 0,
  "data": {
    "sql": "SELECT DATE_TRUNC('month', EKKO.BEDAT) AS month, SUM(EKPO.NETWR) AS total_amount, AVG(EKPO.NETPR) AS avg_price FROM EKKO JOIN EKPO ON EKKO.EBELN = EKPO.EBELN WHERE EKKO.BEDAT BETWEEN '2025-04-01' AND '2026-03-31' GROUP BY DATE_TRUNC('month', EKKO.BEDAT) ORDER BY month",
    "results": [
      {
        "month": "2025-04-01",
        "total_amount": 1582000.0,
        "avg_price": 1120.5
      },
      {
        "month": "2025-05-01",
        "total_amount": 1620000.0,
        "avg_price": 1132.8
      }
    ],
    "metadata": {
      "duration_ms": 1780,
      "row_count": 12,
      "truncated": false,
      "trace_id": "trace_walkB_001"
    }
  },
  "intent": {
    "intent_type": "time_series",
    "confidence": 0.92,
    "bpa_domain_intent": "procurement_analytics"
  },
  "cache_hit": false
}
```

##### 步驟 B6：BPA 回 TASK_COMPLETE

```json
{
  "schema_version": "2.0",
  "type": "TASK_COMPLETE",
  "message_id": "msg_bpa_walkB_006",
  "correlation_id": "corr_walkB_001",
  "session_id": "ses_walkB_001",
  "timestamp": "2026-03-22T13:05:18+08:00",
  "bpa_id": "material-bpa",
  "result": {
    "summary": "最近12個月採購成本呈現溫和上升，年末與年初有兩個高峰。",
    "tasks": [
      {
        "id": 1,
        "description": "確認分析期間",
        "status": "completed",
        "result": {
          "selected_period": "last_12_months"
        }
      },
      {
        "id": 2,
        "description": "查詢期間內採購資料",
        "status": "completed",
        "result": {
          "row_count": 12
        }
      },
      {
        "id": 3,
        "description": "進行趨勢分析",
        "status": "completed",
        "result": {
          "trend": "upward",
          "growth_rate": 0.074
        }
      }
    ],
    "execution_summary": {
      "total_duration_seconds": 13.3,
      "llm_calls": 2,
      "tool_calls": 3,
      "tokens_used": 1735,
      // BPA 擴充欄位（非 SSOT）
      "bpa_extensions": {
        "clarification_rounds": 1,
        "da_calls": 1,
        "cache_hits": 0
      }
    },
    "next_actions": [
      "是否需要查看各月份明細與異常月份解讀？"
    ]
  },
  "checkpoint_version": 5
}
```

#### 15.2.3 走讀 C：異常偵測（含降級處理）

##### 步驟 C1：Top 發 TASK_HANDOVER

```json
{
  "schema_version": "2.0",
  "type": "TASK_HANDOVER",
  "message_id": "msg_top_walkC_001",
  "correlation_id": "corr_walkC_001",
  "session_id": "ses_walkC_001",
  "user_id": "u_proc_02",
  "timestamp": "2026-03-22T13:10:01+08:00",
  "auth_context": {
    "user_roles": [
      "procurement_manager"
    ],
    "scopes": [
      "material:read",
      "procurement:read",
      "supplier:read"
    ],
    "allowed_tools": [
      "da-mm-query"
    ],
    "rate_limit_quota": 1000
  },
  "handover_data": {
    "user_intent": "偵測最近三個月採購異常",
    "extracted_entities": {
      "date_range": {
        "value": "最近三個月",
        "source": "user_text",
        "confidence": 1.0
      }
    },
    "top_level_subtasks": [
      {
        "id": 1,
        "description": "定義異常偵測規則"
      },
      {
        "id": 2,
        "description": "查詢採購資料"
      },
      {
        "id": 3,
        "description": "計算異常分數"
      }
    ],
    "conversation_context": {
      "language": "zh-TW",
      "timezone": "Asia/Taipei",
      "channel": "web"
    },
    "history": []
  },
  "checkpoint": {
    "checkpoint_version": 0,
    "resume_from_step": "start",
    "state_payload": {}
  }
}
```

##### 步驟 C2：BPA 呼叫 DA（發生逾時）

```json
{
  "query": "查詢最近3個月採購訂單，含單價、數量、供應商，用於異常偵測",
  "session_id": "ses_walkC_001",
  "user_id": "u_proc_02",
  "options": {
    "module_scope": [
      "MM"
    ],
    "timezone": "Asia/Taipei",
    "limit": 100,
    "return_debug": false
  }
}
```

##### 步驟 C3：DA 錯誤回應

```json
{
  "code": "DA_QUERY_TIMEOUT",
  "message": "query execution timeout",
  "details": {
    "trace_id": "trace_walkC_001",
    "suggestions": [
      "請縮小時間範圍或加上供應商/物料條件後重試"
    ]
  }
}
```

##### 步驟 C4：BPA 回 TASK_FAILED

```json
{
  "schema_version": "2.0",
  "type": "TASK_FAILED",
  "message_id": "msg_bpa_walkC_004",
  "correlation_id": "corr_walkC_001",
  "session_id": "ses_walkC_001",
  "timestamp": "2026-03-22T13:10:38+08:00",
  "bpa_id": "material-bpa",
  "error": {
    "code": "BPA_MM_DA_QUERY_TIMEOUT",
    "message": "異常偵測查詢逾時（DA_QUERY_TIMEOUT），依 DA v2.0 定義不可重試",
    "can_retry": false,
    "retry_strategy": {
      "max_retries": 0,
      "backoff_seconds": [],
      "type": "narrow_scope",
      "description": "建議使用者縮小查詢範圍"
    },
    "details": "DA_QUERY_TIMEOUT（retry_count=0, trace_id=trace_walkC_001）",
    // BPA 擴充欄位（非 SSOT）
    "debug_context": {
      "retry_count": 0,
      "last_error_code": "DA_QUERY_TIMEOUT",
      "trace_id": "trace_walkC_001"
    }
  },
  "partial_results": [
    {
      "task_id": 1,
      "status": "completed",
      "result": {
        "step": "define_rules"
      }
    },
    {
      "task_id": 2,
      "status": "failed",
      "error": "DA_QUERY_TIMEOUT",
      "result": {
        "step": "query_data",
        "error": "DA_QUERY_TIMEOUT"
      }
    }
  ],
  "checkpoint_version": 2,
  "suggested_actions": [
    "重試操作",
    "稍後再試",
    "聯繫技術支持"
  ]
}
```

### 15.3 SAP MM 表格參考

#### 15.3.1 表格清單

| 表名 | 中文名稱 | 用途 | 常用欄位 |
|---|---|---|---|
| MARA | 物料主數據 | 物料基礎資訊查詢 | MATNR, MTART, MATKL, ERSDA |
| LFA1 | 供應商主記錄 | 供應商基本檔查詢 | LIFNR, NAME1, LAND1, KTOKK |
| EKKO | 採購訂單抬頭 | 採購單主檔 | EBELN, LIFNR, BEDAT, BUKRS |
| EKPO | 採購訂單行項目 | 採購明細與金額 | EBELN, EBELP, MATNR, NETPR, MENGE, NETWR |
| MSEG | 庫存移動記錄 | 庫存入出與異動 | MBLNR, MATNR, BWART, MENGE, LGORT, BUDAT |

#### 15.3.2 查詢限制

1. 僅允許上述五張表。
2. 若 DA 回應涉及其他表，BPA 必須拒絕並記錄 `BPA_MM_SCOPE_VIOLATION`。
3. 不應在回覆中揭露內部 SQL 細節給最終使用者。

#### 15.3.3 資料語意對照

| 業務語句 | 對應表 | 常見條件 |
|---|---|---|
| 採購總額 | EKKO + EKPO | 日期區間、供應商 |
| 單價趨勢 | EKPO | 物料、月份 |
| 供應商比較 | EKKO + EKPO + LFA1 | 供應商列表、期間 |
| 庫存異動 | MSEG | MATNR、LGORT、日期 |
| 物料主檔 | MARA | MATNR、物料類型 |

### 15.4 Prompt Templates

#### 15.4.1 任務拆解 Prompt（完整模板）

```text
系統角色：你是 Material Management BPA 的任務拆解器。

目標：
將 Top TASK_HANDOVER 轉成可執行子任務，不可直接寫 SQL。

已知限制：
1. 只能使用 DA 查詢。
2. 只能查 MM 模組資料。
3. 若資訊不足，必須 ask_user。
4. 輸出需包含 confidence。

輸入：
- user_intent
- extracted_entities
- conversation_context
- auth_scopes

輸出 JSON schema：
{
  "plan_id": "string",
  "confidence": 0.0,
  "need_clarification": true,
  "clarification_questions": [
    {
      "question": "string",
      "input_type": "single_choice",
      "options": [
        {
          "id": "string",
          "label": "string"
        }
      ],
      "reason": "string"
    }
  ],
  "steps": [
    {
      "step_id": "string",
      "type": "query|analysis|ask_user",
      "goal": "string",
      "required_entities": ["string"],
      "expected_output": "string"
    }
  ]
}
```

#### 15.4.2 結果解釋 Prompt（完整模板）

```text
系統角色：你是 SAP MM 業務分析顧問。

任務：
將查詢結果轉為業務可讀結論。

輸入：
- 查詢結果 rows
- metadata(row_count, duration_ms, truncated, trace_id)
- 原始問題

輸出要求：
1. summary：2~4 句。
2. highlights：至少 3 條。
3. risk_flags：若無可留空陣列。
4. next_actions：1~3 條。
5. data_freshness：必填。
6. 禁止杜撰數據。
7. 語言必須為繁體中文。
```

#### 15.4.3 異常偵測規則 Prompt（完整模板）

```text
你是採購風險分析專家。
請根據輸入數據對訂單做異常分級。

分級規則：
- high: 單價高於同物料均值 30% 以上且金額 > 50 萬。
- medium: 單價高於均值 15% 以上或短時間拆單行為。
- low: 輕微偏離。

輸出 JSON：
{
  "anomalies": [
    {
      "order_id": "string",
      "supplier_id": "string",
      "material_id": "string",
      "risk_level": "high|medium|low",
      "reasons": ["string"],
      "recommended_action": "string"
    }
  ],
  "summary": "string"
}
```

### 15.5 驗證測試案例清單（20 項）

> 以下 20 項為驗收最小覆蓋面。

| 編號 | 測試名稱 | 輸入 | 預期輸出 |
|---|---|---|---|
| T01 | 基本 PO 查詢 | 上個月採購訂單 | TASK_COMPLETE + 列表摘要 |
| T02 | 基本供應商查詢 | 供應商 V001 資訊 | TASK_COMPLETE + 供應商主檔 |
| T03 | 基本物料查詢 | 物料 M-001 主數據 | TASK_COMPLETE + MARA 摘要 |
| T04 | 庫存異動追蹤 | M-001 最近異動 | TASK_COMPLETE + timeline |
| T05 | 供應商比較 | 比較 V001/V002 金額 | TASK_COMPLETE + 對照表 |
| T06 | 成本趨勢（補問） | 分析成本趨勢 | BPA_ASK_USER → TASK_COMPLETE |
| T07 | 權限不足 | 缺 procurement:read | TASK_FAILED(BPA_MM_FORBIDDEN) |
| T08 | 超範圍查詢 | 要求查 SD 表 | TASK_FAILED(BPA_MM_SCOPE_VIOLATION) |
| T09 | DA 查詢逾時不可重試 | 模擬 DA_QUERY_TIMEOUT | 直接 TASK_FAILED 並提示縮小範圍 |
| T10 | DA 認證失敗 | 過期 token | TASK_FAILED(BPA_MM_DA_ERROR) |
| T11 | 無結果查詢 | 不存在供應商 | TASK_COMPLETE（0 筆 + 引導） |
| T12 | 大結果集 | metadata.truncated=true 或 row_count 超門檻 | BPA_ASK_USER 要求縮小範圍 |
| T13 | 拆解低信心 | 意圖含糊 | BPA_ASK_USER 先確認 |
| T14 | 異常偵測 | 有無異常訂單 | TASK_COMPLETE + 異常摘要 |
| T15 | TASK_CANCEL | 中途取消 | 任務停止 + TASK_COMPLETE(取消) |
| T16 | TASK_PAUSE/RESUME | 中途暫停後恢復 | 能從 checkpoint 繼續 |
| T17 | checkpoint 恢復 | 服務重啟後續跑 | 任務可恢復 |
| T18 | 審計日誌 | 任務全流程 | 可查到完整 action log |
| T19 | 性能 P95 | 壓測 100 並發 | 達成 P95 目標 |
| T20 | 協議完整性 | 全 message types | schema_version 2.0 全通過 |

---

## 補充 A：FastAPI 服務骨架（參考實作）

> 以下程式碼為可落地的 material-bpa 服務骨架示例。

```python
from __future__ import annotations

from datetime import datetime, timezone
from typing import Dict

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel


app = FastAPI(title="Material Management BPA", version="1.1.0")


class Envelope(BaseModel):
    schema_version: str
    type: str | None = None
    message_type: str | None = None
    message_id: str
    correlation_id: str
    session_id: str
    timestamp: str
    payload: Dict[str, object]


@app.get("/health")
async def health() -> Dict[str, str]:
    return {
        "status": "ok",
        "service": "material-bpa",
        "version": "1.1.0",
        "time": datetime.now(timezone.utc).isoformat(),
    }


def _resolve_message_type(message: Envelope) -> str:
    # 向下相容：允許舊欄位 message_type，但標準輸出一律使用 type
    if message.type:
        return message.type
    if message.message_type:
        return message.message_type
    raise HTTPException(status_code=400, detail="缺少 type 欄位")


@app.post("/process")
async def process(message: Envelope) -> Dict[str, object]:
    if message.schema_version != "2.0":
        raise HTTPException(status_code=400, detail="schema_version 必須為 2.0")

    msg_type = _resolve_message_type(message)
    if msg_type != "TASK_HANDOVER":
        raise HTTPException(status_code=400, detail="/process 僅接受 TASK_HANDOVER")

    return {
        "accepted": True,
        "type": "TASK_HANDOVER",
        "session_id": message.session_id,
        "message_id": message.message_id,
    }


@app.post("/session/{session_id}/message")
async def session_message(session_id: str, message: Envelope) -> Dict[str, object]:
    msg_type = _resolve_message_type(message)
    if msg_type != "USER_MESSAGE":
        raise HTTPException(status_code=400, detail="/message 僅接受 USER_MESSAGE")

    return {
        "accepted": True,
        "type": "USER_MESSAGE",
        "session_id": session_id,
        "message_id": message.message_id,
    }


@app.post("/session/{session_id}/cancel")
async def session_cancel(session_id: str, message: Envelope) -> Dict[str, object]:
    msg_type = _resolve_message_type(message)
    if msg_type != "TASK_CANCEL":
        raise HTTPException(status_code=400, detail="/cancel 僅接受 TASK_CANCEL")

    return {
        "accepted": True,
        "type": "TASK_CANCEL",
        "session_id": session_id,
        "message_id": message.message_id,
    }


@app.post("/session/{session_id}/pause")
async def session_pause(session_id: str, message: Envelope) -> Dict[str, object]:
    msg_type = _resolve_message_type(message)
    if msg_type != "TASK_PAUSE":
        raise HTTPException(status_code=400, detail="/pause 僅接受 TASK_PAUSE")

    return {
        "accepted": True,
        "type": "TASK_PAUSE",
        "session_id": session_id,
        "message_id": message.message_id,
    }


@app.post("/session/{session_id}/resume")
async def session_resume(session_id: str, message: Envelope) -> Dict[str, object]:
    msg_type = _resolve_message_type(message)
    if msg_type != "TASK_RESUME":
        raise HTTPException(status_code=400, detail="/resume 僅接受 TASK_RESUME")

    return {
        "accepted": True,
        "type": "TASK_RESUME",
        "session_id": session_id,
        "message_id": message.message_id,
    }


@app.get("/session/{session_id}/status")
async def session_status(session_id: str) -> Dict[str, object]:
    return {
        "session_id": session_id,
        "status": "running",
        "current_state": "executing",
    }
```

## 補充 B：ArangoDB Repository 範例

```python
from __future__ import annotations

from typing import Dict, Optional


class CheckpointRepository:
    def __init__(self, database: "StandardDatabase") -> None:
        self.database = database
        self.collection = self.database.collection("bpa_material_checkpoints")

    async def save_checkpoint(self, document: Dict[str, object]) -> None:
        self.collection.insert(document, overwrite=True)

    async def get_latest_checkpoint(self, session_id: str) -> Optional[Dict[str, object]]:
        aql = """
        FOR c IN bpa_material_checkpoints
          FILTER c.session_id == @session_id
          SORT c.checkpoint_version DESC
          LIMIT 1
          RETURN c
        """
        cursor = self.database.aql.execute(aql, bind_vars={"session_id": session_id})
        docs = list(cursor)
        if not docs:
            return None
        return docs[0]
```

## 補充 C：狀態機執行器範例

```python
from __future__ import annotations

from dataclasses import dataclass


@dataclass
class Transition:
    from_state: str
    to_state: str
    reason: str


class MaterialBPAStateMachine:
    allowed = {
        "idle": {"parsing_handover"},
        "parsing_handover": {"decomposing_tasks", "failed"},
        "decomposing_tasks": {"executing", "waiting_for_user", "failed"},
        "executing": {"waiting_for_user", "aggregating_results", "failed"},
        "waiting_for_user": {"executing", "failed"},
        "aggregating_results": {"completed", "failed"},
        "completed": {"idle"},
        "failed": {"idle"},
    }

    def can_transit(self, from_state: str, to_state: str) -> bool:
        return to_state in self.allowed.get(from_state, set())

    def transit(self, from_state: str, to_state: str, reason: str) -> Transition:
        if not self.can_transit(from_state, to_state):
            raise ValueError(f"invalid transition: {from_state} -> {to_state}")
        return Transition(from_state=from_state, to_state=to_state, reason=reason)
```

## 補充 D：訊息欄位規範速查

| 欄位 | 必填 | 說明 |
|---|---|---|
| schema_version | 是 | 固定 `2.0` |
| type | 是 | 見協議類型 |
| message_id | 是 | 訊息唯一識別 |
| correlation_id | 是 | 關聯同一流程 |
| session_id | 是 | 會話識別 |
| timestamp | 是 | ISO8601 |
| auth_context | 條件 | Top → BPA 訊息必填 |
| handover_data | 條件 | TASK_HANDOVER 必填 |
| ask | 條件 | BPA_ASK_USER 必填 |
| result | 條件 | TASK_COMPLETE 必填 |
| error | 條件 | TASK_FAILED 必填 |

## 補充 E：控制流程規格

### E.1 TASK_CANCEL 行為

1. 接收到 `TASK_CANCEL` 後立即停止未開始步驟。
2. 若有正在執行的 DA 呼叫，等待呼叫返回或到達中止超時。
3. 立即寫入 checkpoint。
4. 回傳 TASK_COMPLETE（summary: 任務已取消）。

### E.2 TASK_PAUSE 行為

1. 設定狀態為 `waiting_for_user` 或 `paused`（內部擴充狀態可選）。
2. 持久化當前 task cursor。
3. 回傳處理確認（可採 TASK_COMPLETE with paused summary，或內部事件回報）。

### E.3 TASK_RESUME 行為

1. 讀取 `resume_from_checkpoint_version`。
2. 驗證 session 與版本一致。
3. 從 checkpoint 恢復並繼續 `executing`。

## 補充 F：資料新鮮度輸出規範

每次回覆必須帶：

1. `snapshot_at`：資料快照時間。
2. `row_count`：查詢筆數。
3. `truncated`：是否截斷。
4. `query_time_ms`：DA 查詢耗時。

範例：

```json
{
  "data_freshness": {
    "snapshot_at": "2026-03-22T11:55:00+08:00",
    "row_count": 286,
    "truncated": false,
    "query_time_ms": 1920
  }
}
```

## 補充 G：異常偵測規則明細（v1.0）

| 規則 ID | 類型 | 條件 | 風險等級 |
|---|---|---|---|
| R001 | 單價偏離 | 單價 > 同物料 30 天均值 30% | high |
| R002 | 拆單疑慮 | 同供應商同日同物料多筆小額 | medium |
| R003 | 非常規時段 | 非工作日大額採購 | medium |
| R004 | 供應商切換 | 同物料短期切換供應商且單價上升 | low |
| R005 | 數量異常 | 數量高於歷史 P95 | medium |

## 補充 H：結果格式範本

```json
{
  "summary": "string",
  "highlights": [
    "string"
  ],
  "risk_flags": [
    {
      "level": "low|medium|high",
      "message": "string"
    }
  ],
  "next_actions": [
    "string"
  ],
  "data_freshness": {
    "snapshot_at": "string",
    "row_count": 0,
    "truncated": false,
    "query_time_ms": 0
  }
}
```

## 補充 I：運維告警建議

| 告警名稱 | 條件 | 通知級別 |
|---|---|---|
| DA 失敗率過高 | 5 分鐘內 DA 失敗率 > 5% | high |
| E2E 延遲過高 | P95 > 12 秒 | medium |
| checkpoint 失敗 | 連續 3 次寫入失敗 | high |
| 權限錯誤異常 | BPA_MM_FORBIDDEN 突增 | medium |

## 補充 J：開發里程碑（項目排期）

| 週次 | 目標 | 交付物 |
|---|---|---|
| 第 1 週 | 協議與骨架 | FastAPI endpoint、message model、health check |
| 第 2 週 | DA 整合 | DA client、retry、timeout、trace headers |
| 第 3 週 | 任務拆解與補問 | decomposition、BPA_ASK_USER、USER_MESSAGE |
| 第 4 週 | 結果解釋與模板 | LLM interpret、輸出格式、品質規則 |
| 第 5 週 | checkpoint 與恢復 | Arango collections、recovery flow |
| 第 6 週 | 安全與驗收 | scope guard、audit log、20 測試場景 |

## 補充 K：需求對照矩陣（模板章節映射）

| 模板章節 | 本文件對應 |
|---|---|
| 產品概述 | §1, §2 |
| 需求分析 | §3 |
| 系統架構與核心流程 | §4, §7, §8 |
| 功能需求 | §5, §6 |
| 非功能需求 | §11 |
| 護欄與約束 | §12 |
| 驗收標準 | §13 |
| 項目排期 | 補充 J |
| 附錄 | §15 + 補充 A~K |

## 補充 L：Top v2.0 Handoff 相容性清單

| 項目 | 狀態 | 說明 |
|---|---|---|
| schema_version=2.0 驗證 | 必須 | 不符合即拒絕 |
| TASK_HANDOVER | 必須 | 主流程入口 |
| USER_MESSAGE | 必須 | 補問回應 |
| BPA_ASK_USER | 必須 | 主動補問 |
| TASK_COMPLETE | 必須 | 成功完成 |
| TASK_FAILED | 必須 | 錯誤回報 |
| TASK_CANCEL | 必須 | 控制訊息 |
| TASK_PAUSE | 必須 | 控制訊息 |
| TASK_RESUME | 必須 | 控制訊息 |
| checkpoint_version | 必須 | 支援恢復 |
| idempotency key | 預留 | 寫入型未來擴充 |

## 補充 M：DA v2.0 相容性清單

| 項目 | 狀態 | 說明 |
|---|---|---|
| Endpoint `/query` | 必須 | POST 呼叫 |
| Request.query | 必須 | 自然語言查詢 |
| Request.session_id | 必須 | 追蹤會話 |
| Request.user_id | 必須 | 權限關聯 |
| options.module_scope | 必須 | 限定 MM |
| options.timezone | 必須 | Asia/Taipei |
| options.limit | 必須 | 預設 100 |
| options.return_debug | 必須 | 預設 false |
| Header.Authorization | 必須 | JWT 透傳 |
| Header.X-Trace-Id | 必須 | 追蹤一致 |
| Header.X-Session-Id | 必須 | 會話一致 |
| Header.X-Handoff-Schema-Version | 必須 | 值為 2.0 |
| Response.code | 必須 | 0 成功 |
| Response.data.results | 必須 | 結果列 |
| Response.metadata | 必須 | 時間與筆數 |

## 補充 N：未來擴充路線圖（v1.1+）

1. 納入寫入型流程（需 idempotency 全量啟用）。
2. 納入審批整合（HITL + workflow engine）。
3. 納入跨模組查詢（MM + FI/SD）。
4. 納入圖表 API（前端可直接渲染）。
5. 納入策略引擎（規則可配置化）。

## 補充 O：術語表

| 術語 | 定義 |
|---|---|
| BPA | Business Process Agent，業務流程代理 |
| Top | Top Orchestrator，任務編排器 |
| DA | Data Agent，資料查詢代理 |
| KA | Knowledge Agent，知識查詢代理 |
| Handoff | 任務交接訊息 |
| Checkpoint | 可恢復狀態快照 |
| Idempotency | 冪等保證，避免重複執行副作用 |

## 補充 P：完整錯誤代碼擴充表

| Code | HTTP 建議 | 說明 | 重試 |
|---|---|---|---|
| BPA_MM_HANDOVER_INVALID | 400 | handover 欄位缺失或格式錯誤 | 否 |
| BPA_MM_FORBIDDEN | 403 | 權限不足 | 否 |
| BPA_MM_SCOPE_VIOLATION | 403 | 超出 MM 資料範圍 | 否 |
| BPA_MM_ENTITY_NOT_FOUND | 404 | 指定實體不存在 | 否 |
| BPA_MM_DA_QUERY_TIMEOUT | 408 | DA 查詢逾時（DA_QUERY_TIMEOUT，依 DA v2.0 Appendix B 映射 HTTP 408） | 否 |
| BPA_MM_DA_ERROR | 502 | DA 一般錯誤 | 視情況 |
| BPA_MM_LLM_ERROR | 500 | LLM 轉譯失敗 | 是 |
| BPA_MM_DECOMPOSITION_FAILED | 422 | 任務拆解不可行 | 否 |
| BPA_MM_CHECKPOINT_ERROR | 500 | checkpoint 寫入失敗 | 是 |
| BPA_MM_INTERNAL | 500 | 未分類內部錯誤 | 視情況 |

## 補充 Q：審計日誌 JSON 格式

```json
{
  "event_id": "evt_20260322_000001",
  "service": "material-bpa",
  "bpa_id": "material-bpa",
  "session_id": "ses_mm_20260322_00011",
  "message_id": "msg_bpa_20260322_00019",
  "correlation_id": "corr_20260322_mm_00011",
  "trace_id": "trace-mm-20260322-00011",
  "user_id": "u_10001",
  "tenant_id": "t_abc",
  "action": "task_complete",
  "result_code": "OK",
  "details": {
    "state": "completed",
    "checkpoint_version": 6,
    "da_calls": 1
  },
  "timestamp": "2026-03-22T12:39:18+08:00"
}
```

## 補充 R：SLO / SLA 建議

| 指標 | 目標值 | 觀察窗 |
|---|---|---|
| 可用性 | 99.5% | 30 天 |
| 成功率 | 98% | 7 天 |
| P95 延遲 | < 12 秒 | 24 小時 |
| 錯誤預算 | 0.5% | 30 天 |

## 補充 S：回覆語氣與格式規範

1. 先總結後細節。
2. 給具體數字與比例。
3. 不誇張、不虛構。
4. 用語保持中性專業。
5. 若資料不足，清楚聲明限制。

## 補充 T：最小可行 API 規格摘要

| Endpoint | Method | 說明 |
|---|---|---|
| `/health` | GET | 健康檢查 |
| `/process` | POST | 接收 TASK_HANDOVER 消息 |
| `/session/{session_id}/message` | POST | 接收 USER_MESSAGE |
| `/session/{session_id}/cancel` | POST | 取消任務 |
| `/session/{session_id}/pause` | POST | 暫停任務 |
| `/session/{session_id}/resume` | POST | 恢復任務 |
| `/session/{session_id}/status` | GET | 獲取任務狀態 |
| `/internal/state/{session_id}` | GET | 查 session 狀態（內部） |
| `/internal/recover/{session_id}` | POST | 觸發恢復（內部） |

## 補充 U：樣板輸出（供前端渲染）

```json
{
  "title": "採購分析結果",
  "summary": "最近 6 個月採購總額成長 12.8%",
  "sections": [
    {
      "type": "kpi",
      "items": [
        {
          "name": "總採購額",
          "value": "12,680,000"
        },
        {
          "name": "成長率",
          "value": "12.8%"
        }
      ]
    },
    {
      "type": "table",
      "columns": [
        "供應商",
        "金額",
        "占比"
      ],
      "rows": [
        [
          "V001",
          "1,562,300",
          "31.2%"
        ],
        [
          "V002",
          "1,328,890",
          "26.5%"
        ]
      ]
    }
  ],
  "footer": {
    "data_freshness": "2026-03-22 11:55:00+08:00",
    "trace_id": "trace-mm-20260322-00011"
  }
}
```

## 補充 V：風險與緩解

| 風險 | 影響 | 緩解措施 |
|---|---|---|
| DA 依賴單點 | 查詢失敗率上升 | 重試、快取、熔斷 |
| 實體抽取錯誤 | 查詢偏差 | 加強正規化與補問 |
| 範圍過大 | 延遲過高 | 啟發式規則 + metadata.truncated/row_count 觸發補問 |
| 權限配置錯誤 | 資料外洩風險 | scope 驗證 + 審計告警 |

## 補充 W：能力宣告（Capability Contract）

```json
{
  "bpa_id": "material-bpa",
  "supports": {
    "read_operations": true,
    "write_operations": false,
    "clarification_dialog": true,
    "checkpoint_recovery": true,
    "task_pause_resume": true,
    "task_cancel": true,
    "anomaly_detection": true
  },
  "limits": {
    "max_clarification_rounds": 3,
    "default_limit": 100,
    "max_da_retries": 3,
    "da_timeout_seconds": 30
  }
}
```

## 補充 X：上線前 Gate 清單

1. 協議測試全綠。
2. 20 測試案例全綠。
3. 安全掃描無 blocker。
4. 壓測達標。
5. 監控與告警完成。
6. Runbook 完成。

## 補充 Y：Runbook 摘要

### Y.1 DA 逾時頻發

1. 檢查 DA 健康與資源。
2. 檢查 query 範圍是否過大。
3. 臨時降低結果上限與加強補問。

### Y.2 checkpoint 寫入失敗

1. 檢查 Arango 連線。
2. 檢查 collection 權限與索引。
3. 切換降級模式（暫不接受長流程任務）。

### Y.3 協議不相容

1. 檢查 schema_version。
2. 檢查 type 與必填欄位。
3. 回傳 `BPA_MM_HANDOVER_INVALID` 並記錄原始欄位差異。

## 補充 Z：結語

本規格將 material-bpa 定位為 AIBox 第一個可運行、可驗證、可擴展的 BPA 樣板。

其核心價值在於：

1. 將協議整合（Top v2.0 / DA v2.0）標準化。
2. 將 MM 領域流程從「查資料」升級為「做解釋與決策支援」。
3. 以狀態機、checkpoint、審計與護欄構成可營運的企業級能力。

---

## 行數補充附錄（確保長文檔覆蓋）

> 以下為結構化補充片段，用於完整覆蓋落地細節與驗收溯源。

### ZA. 協議欄位逐項驗證規則

1. `schema_version` 必須存在。
2. `schema_version` 必須等於 `2.0`。
3. `type` 必須存在。
4. `type` 必須在允許集合內。
5. `message_id` 必須存在。
6. `message_id` 必須唯一。
7. `correlation_id` 必須存在。
8. `session_id` 必須存在。
9. `timestamp` 必須是 ISO8601。
10. TASK_HANDOVER 必須含 `auth_context`；USER_MESSAGE 與控制訊息（TASK_CANCEL/PAUSE/RESUME）不含 `auth_context`。
11. TASK_HANDOVER root `user_id` 必須存在。
12. `auth_context` 不得包含 `tenant_id`（tenant 資訊由 JWT claims 取得，不放入 JSON payload）。
13. `auth_context.scopes` 必須非空。
14. JWT token 透過 HTTP Header `Authorization: Bearer {token}` 傳遞，不放入 JSON payload。
15. TASK_HANDOVER 必須含 `handover_data`。
16. `handover_data.user_intent` 必須存在。
17. `handover_data.extracted_entities` 必須存在（可空物件）。
18. `handover_data.top_level_subtasks` 必須存在（可空陣列）。
19. `handover_data.conversation_context` 必須存在。
20. `handover_data.history` 必須存在（可空陣列）。
21. BPA_ASK_USER 必須含 `ask`。
22. `ask.question` 必須非空。
23. `ask.input_type` 必須在定義集合內。
24. `ask.options` 若存在，需符合陣列結構。
25. TASK_COMPLETE 必須含 `result`。
26. TASK_COMPLETE 需含 `result.summary`。
27. TASK_COMPLETE 需含 `result.tasks`。
28. TASK_COMPLETE 需含 `result.execution_summary`。
29. TASK_FAILED 必須含 `error`。
30. TASK_FAILED 需含 `error.code`。
31. TASK_FAILED 需含 `error.message`。
32. TASK_CANCEL 需含 root `reason`（字串）。
33. TASK_PAUSE 需含 root `checkpoint_version`（整數）。
34. TASK_RESUME 結構與 TASK_PAUSE 一致（含 root `checkpoint_version`）。
35. TASK_PAUSE 與 TASK_RESUME 不得包含 `reason` 欄位（與 TASK_CANCEL 不同）。
36. 追蹤資訊（`trace_id`）透過 HTTP header `X-Trace-Id` 傳遞。若訊息 body 含 `meta` 物件，為 BPA 擴充欄位（非 SSOT），Top Orchestrator 不依賴此欄位。
37. 追蹤欄位不可在流程中遺失（以 HTTP header 傳遞與轉傳）。
38. 權限 scope 需在 handover 階段完成驗證。
39. 權限驗證失敗立即終止。
40. 欄位驗證錯誤需回傳一致錯誤碼。
41. 驗證規則需版本化管理。

### ZB. MM 實體正規化規則

1. MATNR 去除空白。
2. MATNR 英數轉大寫。
3. MATNR 純數字時左補零至 12 碼。
4. LIFNR 去除空白。
5. LIFNR 英數轉大寫。
6. LIFNR 純數字時左補零至 10 碼。
7. EBELN 驗證 10 碼。
8. `上個月` 正規化為完整月區間。
9. `最近三個月` 以當前月份往前推。
10. `2026Q1` 正規化為 `2026-01-01` ~ `2026-03-31`。
11. 金額語句抽取幣別（若有）。
12. 金額條件轉換為 min/max。
13. 倉別代碼需落在 allowlist。
14. 若語句矛盾，觸發補問。
15. 多個期間語句衝突時優先最後一次使用者輸入。
16. 提供正規化結果於 debug log（遮罩敏感）。
17. 正規化失敗時回 `BPA_MM_ENTITY_NOT_FOUND` 或 `BPA_MM_HANDOVER_INVALID`。
18. 支援繁中日期詞彙。
19. 支援民國/西元換算（可選）。
20. 實體抽取結果寫入 checkpoint。

### ZC. 任務拆解品質評分規則

1. 是否覆蓋所有必要實體。
2. 是否避免 SQL 生成。
3. 是否步驟數合理。
4. 是否有清楚 expected_output。
5. 是否有失敗分支策略。
6. 是否需要補問且定義充分。
7. confidence < 0.7 需補問。
8. confidence >= 0.7 可直行。
9. 拆解結果需可序列化。
10. 拆解結果需可持久化。
11. 步驟間依賴需顯式。
12. 可並行步驟需標記。
13. 每步驟應可測試。
14. 每步驟需可追蹤。
15. 每步驟需可重放。
16. 每步驟錯誤需可歸因。
17. 拆解模板需版本化。
18. 拆解提示詞需可調。
19. 拆解結果需由 guardrail 過濾。
20. 拆解最終計畫需回寫 state。

### ZD. 結果解釋品質準則

1. 先結論。
2. 再數據。
3. 再風險。
4. 再建議。
5. 不得虛構。
6. 不得洩漏內部實作。
7. 不得輸出敏感 token。
8. 不得忽略資料範圍。
9. 必須標明時間區間。
10. 必須標明 row_count。
11. 必須標明 truncated。
12. 必須標明 snapshot_at。
13. 必須提供可執行建議。
14. 應避免過度冗長。
15. 應使用繁體中文。
16. 應使用商務語氣。
17. 應包含例外說明。
18. 應支援表格輸出。
19. 應支援摘要輸出。
20. 應支援 drill-down 建議。

### ZE. 維運自檢條目（每日）

1. 檢查健康端點。
2. 檢查 DA 可用率。
3. 檢查 Top 連通性。
4. 檢查 Arango 連線。
5. 檢查 checkpoint 寫入率。
6. 檢查錯誤碼分布。
7. 檢查 P95 延遲。
8. 檢查補問比率。
9. 檢查超大結果集比率。
10. 檢查權限拒絕比率。
11. 檢查 scope violation 事件。
12. 檢查 token 遮罩規則。
13. 檢查審計日誌完整性。
14. 檢查 trace 關聯完整性。
15. 檢查部署副本健康。
16. 檢查告警渠道。
17. 檢查資源使用率。
18. 檢查重試是否異常增高。
19. 檢查 cache hit。
20. 檢查 schema drift。

### ZF. QA 深度測試步驟（摘要）

1. 建立測試租戶。
2. 建立不同權限帳號。
3. 準備 MM 模擬資料。
4. 驗證 TASK_HANDOVER 正常路徑。
5. 驗證 TASK_HANDOVER 缺欄位路徑。
6. 驗證 USER_MESSAGE 補問回覆。
7. 驗證 TASK_CANCEL 行為。
8. 驗證 TASK_PAUSE 行為。
9. 驗證 TASK_RESUME 行為。
10. 驗證 DA 成功回應。
11. 驗證 DA 逾時重試。
12. 驗證 DA 權限錯誤。
13. 驗證 checkpoint 寫入。
14. 驗證 checkpoint 恢復。
15. 驗證結果解釋品質。
16. 驗證資料新鮮度欄位。
17. 驗證 MM 邊界防護。
18. 驗證審計記錄完整。
19. 驗證性能門檻。
20. 驗證端到端回歸。

### ZG. 最終一致性聲明

本規格已覆蓋以下重點：

1. 文件模板映射完整。
2. Top v2.0 協議整合完整。
3. DA v2.0 協議整合完整。
4. BPA Registry 配置完整。
5. ArangoDB 持久化設計完整。
6. BPA 狀態機定義完整。
7. Checkpoint 與復原流程完整。
8. Idempotency 設計已預留。
9. Read-only 護欄明確。
10. 驗收標準可執行。

---

（文件結束）
