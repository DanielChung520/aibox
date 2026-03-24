---
lastUpdate: 2026-03-24 11:05:51
author: Daniel Chung
version: 1.0.0
---

# Data Agent 查詢測試場景 (100 Scenarios)

## 測試環境

| 項目 | 值 |
|------|-----|
| Endpoint | `POST /api/v1/da/query/nl2sql` |
| Request | `{ "natural_language": "..." }` |
| 資料範圍 | SAP MM 模組，2024-03 ~ 2026-03 |
| Tables | EKKO, EKPO, LFA1, MARA, MARD, MCHB, MKPF, MSEG |

## 策略分布

| Strategy | 數量 | 說明 |
|----------|------|------|
| template | 20 | 單表 / 簡單 JOIN (≤2 tables) |
| small_llm | 11 | 中等 JOIN + 聚合 (3 tables) |
| large_llm | 6 | 多表 JOIN / CTE / 子查詢 (4+ tables) |

---

## 一、Template 策略 — 簡單查詢 (S-001 ~ S-035)

### Group A: 採購訂單 (EKKO/EKPO)

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-001 | 查詢 2025 年 3 月的採購訂單 | mm_a01 | template | WHERE 包含 AEDAT 日期範圍 |
| S-002 | 2024 年的採購訂單有哪些 | mm_a01 | template | AEDAT BETWEEN '2024-01-01' AND '2024-12-31' |
| S-003 | 上個月的採購總金額是多少 | mm_a03 | template | SUM(NETPR * MENGE), 回傳數字 |
| S-004 | 各工廠的採購金額比較 | mm_a06 | template | GROUP BY WERKS |
| S-005 | 各幣別的採購金額分布 | mm_a07 | template | GROUP BY WAERS |
| S-006 | 過去一年的採購趨勢 | mm_a04 | template | strftime 月度聚合, 至少 12 行 |
| S-007 | 今年 Q1 的採購訂單 | mm_a01 | template | AEDAT 2026-01 ~ 2026-03 |
| S-008 | 工廠 1000 的採購金額 | mm_a06 | template | WHERE WERKS = '1000' |

### Group B: 供應商 (LFA1)

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-009 | 列出所有供應商 | mm_b01 | template | 回傳 LFA1 全量, 含 NAME1 |
| S-010 | 台灣的供應商有哪些 | mm_b01 | template | WHERE LAND1 = 'TW' |
| S-011 | 供應商 V001 的基本資料 | mm_b01 | template | WHERE LIFNR = 'V001' |
| S-012 | 供應商 V001 過去半年的月度採購趨勢 | mm_b05 | template | strftime 月度, WHERE LIFNR |

### Group C: 物料主檔 (MARA)

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-013 | 查詢物料 M-0001 的資料 | mm_c01 | template | WHERE MATNR = 'M-0001' |
| S-014 | 列出所有原物料 | mm_c02 | template | WHERE MTART = 'ROH' |
| S-015 | 各物料群組有多少物料 | mm_c03 | template | GROUP BY MTART 或 MATKL, COUNT(*) |
| S-016 | 這個月新增了哪些物料 | mm_c04 | template | WHERE ERSDA >= 月初 |
| S-017 | 半成品物料有幾個 | mm_c02 | template | WHERE MTART = 'HALB', COUNT |
| S-018 | 物料 M-0050 的重量是多少 | mm_c01 | template | SELECT BRGEW, GEWEI WHERE MATNR |
| S-019 | 列出所有成品物料 | mm_c02 | template | WHERE MTART = 'FERT' |
| S-020 | 物料數量最多的物料類型 | mm_c03 | template | GROUP BY MTART ORDER BY COUNT DESC |

### Group D: 庫存 (MARD/MCHB)

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-021 | 物料 M-0001 的庫存多少 | mm_d01 | template | WHERE MATNR, SELECT LABST |
| S-022 | 各工廠的庫存總量 | mm_d02 | template | GROUP BY WERKS, SUM(LABST) |
| S-023 | 目前庫存總覽 | mm_d03 | template | 匯總 MARD + MARA |
| S-024 | 庫存低於 100 的物料 | mm_d04 | template | WHERE LABST < 100 |
| S-025 | 批次 B001 的庫存 | mm_d05 | template | MCHB WHERE CHARG = 'B001' |
| S-026 | 30 天內即將過期的批次 | mm_d06 | template | WHERE VFDAT 過期日期條件 |
| S-027 | 庫存量最多的前 20 種物料 | mm_d07 | template | ORDER BY LABST DESC LIMIT 20 |
| S-028 | 工廠 1000 倉庫 0001 的庫存 | mm_d01 | template | WHERE WERKS AND LGORT |
| S-029 | 安全庫存不足的物料清單 | mm_d04 | template | WHERE LABST < threshold |
| S-030 | 哪些物料有批次庫存 | mm_d05 | template | MCHB DISTINCT MATNR |

### Group E: 庫存異動 (MSEG/MKPF) — 簡單

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-031 | 各異動類型的數量統計 | mm_e03 | template | GROUP BY BWART, COUNT(*) |
| S-032 | 上個月庫存異動的總金額 | mm_e06 | template | SUM(DMBTR), WHERE BUDAT |
| S-033 | 異動類型 101 的數量 | mm_e03 | template | WHERE BWART = '101' |
| S-034 | 今年的庫存異動金額 | mm_e06 | template | WHERE BUDAT >= 2026-01-01 |
| S-035 | 哪種異動類型金額最高 | mm_e03 | template | GROUP BY BWART ORDER BY SUM(DMBTR) DESC |

---

## 二、Small LLM 策略 — 中等複雜查詢 (S-036 ~ S-060)

### Group A: 採購多表關聯

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-036 | 採購單 4500000001 的詳細資訊，包含供應商名稱 | mm_a02 | small_llm | JOIN LFA1 取 NAME1 |
| S-037 | 採購金額最高的前 10 種物料 | mm_a05 | small_llm | JOIN MARA 取 MAKTX, ORDER BY DESC LIMIT 10 |
| S-038 | 供應商 V001 上個月賣了什麼物料給我們 | mm_a02 | small_llm | JOIN EKKO+EKPO+LFA1, WHERE LIFNR+AEDAT |
| S-039 | 哪些物料的採購單價超過 1000 | mm_a05 | small_llm | EKPO JOIN MARA, WHERE NETPR > 1000 |
| S-040 | 上個月採購金額前 5 的物料及描述 | mm_a05 | small_llm | JOIN MARA, SUM + ORDER + LIMIT |

### Group B: 供應商分析

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-041 | 各供應商的採購金額統計 | mm_b02 | small_llm | JOIN EKKO+EKPO+LFA1, GROUP BY LIFNR |
| S-042 | 比較供應商 V001 和 V002 的採購金額 | mm_b03 | small_llm | WHERE LIFNR IN, GROUP BY |
| S-043 | 採購金額前 10 的供應商 | mm_b04 | small_llm | JOIN + ORDER + LIMIT |
| S-044 | 哪個供應商交貨最多 | mm_b04 | small_llm | GROUP BY LIFNR, SUM(MENGE) |
| S-045 | 供應商 V003 今年的採購金額趨勢 | mm_b02 | small_llm | WHERE LIFNR, 月度聚合 |

### Group D: 庫存進階

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-046 | 在途庫存有多少 | mm_d08 | small_llm | MSEG+MKPF+MARA, BWART 在途類型 |
| S-047 | 在途物料清單及數量 | mm_d08 | small_llm | JOIN 3 tables, BWART 篩選 |

### Group E: 庫存異動進階

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-048 | 上個月的收貨記錄 | mm_e01 | small_llm | MSEG+MKPF+MARA, BWART=101 |
| S-049 | 上個月的發料記錄 | mm_e02 | small_llm | MSEG+MKPF+MARA, BWART=261 |
| S-050 | 物料憑證 5000000001 的明細 | mm_e05 | small_llm | WHERE MBLNR, JOIN 3 tables |
| S-051 | 上個月的調撥記錄 | mm_e08 | small_llm | BWART=311/312, JOIN 3 tables |
| S-052 | 過去一年的庫存異動趨勢 | mm_e04 | small_llm | 月度聚合, CASE WHEN 收/發 |
| S-053 | 物料 M-0010 上個月的所有異動 | mm_e01 | small_llm | WHERE MATNR + BUDAT, JOIN 3 tables |
| S-054 | 收貨金額前 10 的物料 | mm_e01 | small_llm | WHERE BWART=101, SUM(DMBTR), LIMIT 10 |
| S-055 | 上季度每月的收貨與發料對比 | mm_e04 | small_llm | CASE WHEN + 月度聚合 |
| S-056 | 工廠 1000 的異動記錄 | mm_e01 | small_llm | WHERE WERKS = '1000', JOIN |
| S-057 | 物料 M-0001 今年被領料幾次 | mm_e02 | small_llm | WHERE MATNR+BWART, COUNT |
| S-058 | 上個月有退貨的物料 | mm_e07 | small_llm | BWART=122/161, JOIN MARA |
| S-059 | 哪些物料上個月有調撥進出 | mm_e08 | small_llm | BWART=311/312, DISTINCT MATNR |
| S-060 | 成本中心 CC001 的領料記錄 | mm_e02 | small_llm | WHERE KOSTL = 'CC001' |

---

## 三、Large LLM 策略 — 高複雜度查詢 (S-061 ~ S-080)

### Group B: 供應商深度分析

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-061 | 供應商 V001 供應哪些物料 | mm_b06 | large_llm | 4-table JOIN: EKKO+EKPO+LFA1+MARA |
| S-062 | 每個供應商供應的物料品項數 | mm_b06 | large_llm | COUNT(DISTINCT MATNR) per LIFNR |
| S-063 | 哪個供應商供應最多種物料 | mm_b06 | large_llm | 4-table JOIN + GROUP + ORDER |

### Group E: 退貨跨模組

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-064 | 上個月的退貨統計 | mm_e07 | large_llm | MSEG+MKPF+MARA+EKKO, BWART 退貨 |
| S-065 | 退貨率最高的供應商 | mm_e07 | large_llm | 退貨量/採購量 比率計算 |
| S-066 | 各供應商的退貨金額排名 | mm_e07 | large_llm | JOIN 4 tables + GROUP + ORDER |

### Group F: 跨模組綜合分析

| ID | 自然語言查詢 | 預期意圖 | 預期策略 | 驗證要點 |
|----|-------------|---------|---------|---------|
| S-067 | 採購到收貨的平均前置時間 | mm_f01 | large_llm | 6-table JOIN, AEDAT vs BUDAT 差異 |
| S-068 | 哪些物料的前置時間超過 30 天 | mm_f01 | large_llm | 6-table JOIN + HAVING |
| S-069 | 物料的採購量與消耗量對比 | mm_f02 | large_llm | CTE: purchases vs consumption |
| S-070 | 哪些物料的消耗量遠超採購量 | mm_f02 | large_llm | CTE + 比率計算 |
| S-071 | 各物料的庫存周轉率 | mm_f03 | large_llm | CTE: consumption / avg_stock |
| S-072 | 周轉率低於 2 的滯銷物料 | mm_f03 | large_llm | CTE + HAVING turnover < 2 |
| S-073 | 做一個 ABC 分析 | mm_f04 | large_llm | CTE: cumulative %, 80/15/5 分類 |
| S-074 | A 類物料有哪些 | mm_f04 | large_llm | ABC 分析 WHERE class = 'A' |
| S-075 | 前置時間最長的前 5 個供應商 | mm_f01 | large_llm | 6-table JOIN + GROUP + LIMIT |
| S-076 | 供應商 V001 的平均交貨天數 | mm_f01 | large_llm | WHERE LIFNR, AVG(BUDAT - AEDAT) |
| S-077 | 採購金額佔總額 80% 的核心物料 | mm_f04 | large_llm | Pareto / ABC 分析 |
| S-078 | 各工廠的庫存周轉天數 | mm_f03 | large_llm | CTE + 365/turnover |
| S-079 | 過去半年每月的採購 vs 消耗趨勢圖資料 | mm_f02 | large_llm | CTE + 月度聚合, 兩列對比 |
| S-080 | 哪些物料有採購但從未消耗 | mm_f02 | large_llm | CTE LEFT JOIN WHERE consumption IS NULL |

---

## 四、語義不清 / 模糊查詢 (S-081 ~ S-090)

> 預期行為：系統應識別為 ambiguous 並回傳澄清請求（目前版本可能 fallback 到 large_llm 或回傳最佳猜測）

| ID | 自然語言查詢 | 模糊原因 | 預期行為 |
|----|-------------|---------|---------|
| S-081 | 幫我查一下數據 | 完全無上下文，不知查什麼 | 回傳澄清：請指定查詢主題（物料/採購/庫存/異動） |
| S-082 | 最近的資料 | 「最近」無定義，「資料」過於廣泛 | 回傳澄清：請指定時間範圍及資料類型 |
| S-083 | 多少錢 | 缺少主詞，不知查什麼的金額 | 回傳澄清：請指定查詢對象（採購金額/庫存金額/異動金額） |
| S-084 | 那個東西的量 | 指代不明，無法確定物料或數量類型 | 回傳澄清：請指定物料編號及數量類型（庫存/採購/異動） |
| S-085 | V001 怎麼樣 | 可識別為供應商，但「怎麼樣」意圖不明 | 回傳澄清：請指定查詢面向（基本資料/採購統計/交貨表現） |
| S-086 | 比較一下 | 缺少比較對象和維度 | 回傳澄清：請指定比較對象及比較維度 |
| S-087 | 上個月的情況 | 「情況」過於模糊，涵蓋範圍太廣 | 回傳澄清：請指定查詢主題 |
| S-088 | 有沒有問題 | 「問題」定義不明，可能指低庫存/超期/異常 | 回傳澄清：請指定問題類型（庫存不足/批次過期/異動異常） |
| S-089 | 幫我看看 M-0001 | 可識別物料，但不知要看什麼面向 | 回傳澄清：請指定查詢面向（主檔/庫存/採購歷史/異動記錄） |
| S-090 | 供應商排名 | 缺少排名維度（金額/數量/交期/品質） | 回傳澄清：請指定排名維度 |

---

## 五、執行異常場景 (S-091 ~ S-100)

### Schema / SQL 錯誤

| ID | 自然語言查詢 | 異常類型 | 預期行為 |
|----|-------------|---------|---------|
| S-091 | 查詢 FI 模組的會計憑證 | 不存在的模組/表 | error: 資料湖中不存在 FI 模組相關表（BKPF/BSEG），回傳模組不支援提示 |
| S-092 | 查詢物料的 ABC_NONEXIST_FIELD 欄位 | 不存在的欄位名 | error: schema 中不存在此欄位，回傳可用欄位列表或提示 |
| S-093 | SELECT * FROM users | SQL 注入嘗試（系統表） | error: 僅允許查詢 Parquet 資料湖，拒絕直接 SQL |
| S-094 | DROP TABLE MARA | DDL 攻擊 | error: 僅允許 SELECT 查詢，拒絕 DROP/DELETE/INSERT/UPDATE/ALTER |
| S-095 | 查詢 SD 模組的銷售訂單 VBAK | SD 模組有 schema 但無 Parquet 資料 | error: 資料湖中尚無 SD 模組 Parquet 資料，無法執行查詢 |

### 連線 / 基礎設施異常

| ID | 模擬場景 | 異常類型 | 預期行為 |
|----|---------|---------|---------|
| S-096 | Qdrant 服務停機 | intent-rag 無法連線 | fallback: 跳過意圖匹配，嘗試 LLM 直接生成，或回傳服務暫時不可用 |
| S-097 | Ollama 服務停機 | LLM 不可用 | error: 模板策略仍可運作，LLM 策略回傳 LLM 服務不可用 |
| S-098 | S3 (MinIO) 服務停機 | Parquet 資料無法讀取 | error: DuckDB read_parquet 失敗，回傳資料來源暫時不可用 |
| S-099 | ArangoDB 服務停機 | schema 無法載入 | error: 無法載入 schema 資訊，服務暫時不可用 |
| S-100 | 超長查詢（>2000 字） | 請求超大 | error: 查詢文字超過長度限制，請精簡查詢 |

---

## 執行方式

### 單筆手動測試

```bash
curl -s -X POST http://localhost:8003/query/nl2sql \
  -H "Content-Type: application/json" \
  -d '{"natural_language": "查詢 2025 年 3 月的採購訂單"}' | python3 -m json.tool
```

### 透過 Rust Gateway

```bash
curl -s -X POST http://localhost:6500/api/v1/da/query/nl2sql \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer <token>" \
  -d '{"natural_language": "查詢 2025 年 3 月的採購訂單"}' | python3 -m json.tool
```

### 批次自動化（未來）

```python
import json, httpx

with open("scenarios.json") as f:
    scenarios = json.load(f)

for s in scenarios:
    resp = httpx.post("http://localhost:8003/query/nl2sql",
                      json={"natural_language": s["query"]})
    result = resp.json()
    passed = validate(result, s["expected"])
    print(f"{s['id']}: {'PASS' if passed else 'FAIL'}")
```

---

## 驗證標準

| 項目 | 通過條件 |
|------|---------|
| 意圖匹配 | `matched_intent` 與預期一致 |
| 策略選擇 | `phases` 中使用的策略與預期一致 |
| SQL 生成 | `generated_sql` 語法正確，包含預期的 table 和條件 |
| SQL 驗證 | `validation.is_valid == true`，無 DROP/INSERT/UPDATE |
| 執行結果 | `execution_result` 有資料行（除異常場景外） |
| 回應時間 | template < 2s, small_llm < 15s, large_llm < 30s |
| 異常處理 | 異常場景回傳明確 error message，不回傳 500 |

---

## 修改歷程

| 日期 | 版本 | 更新者 | 變更內容 |
|------|------|--------|----------|
| 2026-03-24 | 1.0.0 | Daniel Chung | 初始版本，100 道測試劇本 |
