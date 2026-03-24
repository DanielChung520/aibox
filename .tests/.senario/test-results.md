# Data Agent 查詢測試報告

**測試時間**: 2026-03-24 14:26:42
**總場景數**: 100
**通過**: 81 (81.0%)
**失敗**: 19 (19.0%)
**平均回應時間**: 351ms

## 分類統計

| 分類 | 總數 | 通過 | 失敗 | 通過率 |
|------|------|------|------|--------|
| 正常查詢 (S-001~S-080) | 80 | 67 | 13 | 83.8% |
| 模糊查詢 (S-081~S-090) | 10 | 5 | 5 | 50.0% |
| 異常場景 (S-091~S-100) | 10 | 9 | 1 | 90.0% |

## 策略準確率 (正常查詢)

| 策略 | 總數 | 通過 | 失敗 | 通過率 |
|------|------|------|------|--------|
| template | 35 | 33 | 2 | 94.3% |
| small_llm | 24 | 19 | 5 | 79.2% |
| large_llm | 21 | 15 | 6 | 71.4% |

## 失敗詳情

| ID | 查詢 | 預期 | 實際 | Score | 原因 |
|-----|------|------|------|-------|------|
| S-007 | 今年 Q1 的採購訂單 | mm_a01 | mm_a03 | 0.6747 | Wrong #1 (mm_a03), but expected in top-3 @ rank 2 |
| S-011 | 供應商 V001 的基本資料 | mm_b01 | mm_b06 | 0.6953 | Wrong #1 (mm_b06), but expected in top-3 @ rank 2 |
| S-038 | 供應商 V001 上個月賣了什麼物料給我們 | mm_a02 | mm_b02 | 0.6527 | Intent mismatch: expected=mm_a02 actual=mm_b02 |
| S-039 | 哪些物料的採購單價超過 1000 | mm_a05 | mm_a02 | 0.6231 | Intent mismatch: expected=mm_a05 actual=mm_a02 |
| S-049 | 上個月的發料記錄 | mm_e02 | mm_c04 | 0.6583 | Wrong #1 (mm_c04), but expected in top-3 @ rank 2 |
| S-053 | 物料 M-0010 上個月的所有異動 | mm_e01 | mm_c04 | 0.6579 | Wrong #1 (mm_c04), but expected in top-3 @ rank 2 |
| S-054 | 收貨金額前 10 的物料 | mm_e01 | mm_f01 | 0.6072 | Wrong #1 (mm_f01), but expected in top-3 @ rank 2 |
| S-063 | 哪個供應商供應最多種物料 | mm_b06 | mm_b04 | 0.6242 | Wrong #1 (mm_b04), but expected in top-3 @ rank 2 |
| S-066 | 各供應商的退貨金額排名 | mm_e07 | mm_b04 | 0.6049 | Wrong #1 (mm_b04), but expected in top-3 @ rank 2 |
| S-074 | A 類物料有哪些 | mm_f04 | (none) | 0.0000 | No match returned |
| S-078 | 各工廠的庫存周轉天數 | mm_f03 | mm_d02 | 0.6250 | Wrong #1 (mm_d02), but expected in top-3 @ rank 2 |
| S-079 | 過去半年每月的採購 vs 消耗趨勢圖資料 | mm_f02 | mm_a04 | 0.7580 | Wrong #1 (mm_a04), but expected in top-3 @ rank 2 |
| S-080 | 哪些物料有採購但從未消耗 | mm_f02 | (none) | 0.0000 | No match returned |
| S-081 | 幫我查一下數據 | (none) | mm_e08 | 0.6015 | High score 0.6015 on ambiguous query → matched mm_e08 |
| S-082 | 最近的資料 | (none) | mm_c04 | 0.6356 | High score 0.6356 on ambiguous query → matched mm_c04 |
| S-087 | 上個月的情況 | (none) | mm_a04 | 0.6103 | High score 0.6103 on ambiguous query → matched mm_a04 |
| S-089 | 幫我看看 M-0001 | (none) | mm_c01 | 0.5981 | High score 0.5981 on ambiguous query → matched mm_c01 |
| S-090 | 供應商排名 | (none) | mm_b04 | 0.7321 | High score 0.7321 on ambiguous query → matched mm_b04 |
| S-091 | 查詢 FI 模組的會計憑證 | (none) | mm_e05 | 0.5985 | Unexpected match mm_e05 score=0.5985 |

## Top-3 分析 (意圖不匹配)

### S-007: 今年 Q1 的採購訂單
- 預期: `mm_a01`
- Top-3:
  1. `mm_a03` (score=0.6747, strategy=template)
  2. `mm_a01` (score=0.6575, strategy=template)
  3. `mm_b02` (score=0.6368, strategy=small_llm)

### S-011: 供應商 V001 的基本資料
- 預期: `mm_b01`
- Top-3:
  1. `mm_b06` (score=0.6953, strategy=large_llm)
  2. `mm_b01` (score=0.6872, strategy=template)
  3. `mm_b03` (score=0.6653, strategy=small_llm)

### S-038: 供應商 V001 上個月賣了什麼物料給我們
- 預期: `mm_a02`
- Top-3:
  1. `mm_b02` (score=0.6527, strategy=small_llm)
  2. `mm_b05` (score=0.6458, strategy=template)
  3. `mm_b06` (score=0.6411, strategy=large_llm)

### S-039: 哪些物料的採購單價超過 1000
- 預期: `mm_a05`
- Top-3:
  1. `mm_a02` (score=0.6231, strategy=small_llm)

### S-049: 上個月的發料記錄
- 預期: `mm_e02`
- Top-3:
  1. `mm_c04` (score=0.6583, strategy=template)
  2. `mm_e02` (score=0.6493, strategy=small_llm)
  3. `mm_e04` (score=0.6088, strategy=small_llm)

### S-053: 物料 M-0010 上個月的所有異動
- 預期: `mm_e01`
- Top-3:
  1. `mm_c04` (score=0.6579, strategy=template)
  2. `mm_e01` (score=0.6525, strategy=small_llm)
  3. `mm_e08` (score=0.6313, strategy=small_llm)

### S-054: 收貨金額前 10 的物料
- 預期: `mm_e01`
- Top-3:
  1. `mm_f01` (score=0.6072, strategy=large_llm)
  2. `mm_e01` (score=0.5959, strategy=small_llm)
  3. `mm_a05` (score=0.5957, strategy=small_llm)

### S-063: 哪個供應商供應最多種物料
- 預期: `mm_b06`
- Top-3:
  1. `mm_b04` (score=0.6242, strategy=small_llm)
  2. `mm_b06` (score=0.6028, strategy=large_llm)

### S-066: 各供應商的退貨金額排名
- 預期: `mm_e07`
- Top-3:
  1. `mm_b04` (score=0.6049, strategy=small_llm)
  2. `mm_e07` (score=0.5976, strategy=large_llm)

### S-074: A 類物料有哪些
- 預期: `mm_f04`
- Top-3:

### S-078: 各工廠的庫存周轉天數
- 預期: `mm_f03`
- Top-3:
  1. `mm_d02` (score=0.625, strategy=template)
  2. `mm_f03` (score=0.6147, strategy=large_llm)

### S-079: 過去半年每月的採購 vs 消耗趨勢圖資料
- 預期: `mm_f02`
- Top-3:
  1. `mm_a04` (score=0.758, strategy=template)
  2. `mm_f02` (score=0.7054, strategy=large_llm)
  3. `mm_e04` (score=0.662, strategy=small_llm)

### S-080: 哪些物料有採購但從未消耗
- 預期: `mm_f02`
- Top-3:


## 全量結果

| ID | 查詢 | 類別 | 預期意圖 | 實際意圖 | Score | 策略 | 結果 | 耗時ms |
|-----|------|------|----------|----------|-------|------|------|--------|
| S-001 | 查詢 2025 年 3 月的採購訂單 | normal | mm_a01 | mm_a01 | 0.7350 | template | ✅ | 499 |
| S-002 | 2024 年的採購訂單有哪些 | normal | mm_a01 | mm_a01 | 0.5956 | template | ✅ | 502 |
| S-003 | 上個月的採購總金額是多少 | normal | mm_a03 | mm_a03 | 0.7054 | template | ✅ | 531 |
| S-004 | 各工廠的採購金額比較 | normal | mm_a06 | mm_a06 | 0.7309 | template | ✅ | 551 |
| S-005 | 各幣別的採購金額分布 | normal | mm_a07 | mm_a07 | 0.7991 | template | ✅ | 502 |
| S-006 | 過去一年的採購趨勢 | normal | mm_a04 | mm_a04 | 0.7169 | template | ✅ | 383 |
| S-007 | 今年 Q1 的採購訂單 | normal | mm_a01 | mm_a03 | 0.6747 | template | ❌ | 311 |
| S-008 | 工廠 1000 的採購金額 | normal | mm_a06 | mm_a06 | 0.6110 | template | ✅ | 390 |
| S-009 | 列出所有供應商 | normal | mm_b01 | mm_b01 | 0.6598 | template | ✅ | 255 |
| S-010 | 台灣的供應商有哪些 | normal | mm_b01 | mm_b01 | 0.6481 | template | ✅ | 331 |
| S-011 | 供應商 V001 的基本資料 | normal | mm_b01 | mm_b06 | 0.6953 | large_llm | ❌ | 245 |
| S-012 | 供應商 V001 過去半年的月度採購趨勢 | normal | mm_b05 | mm_b05 | 0.8563 | template | ✅ | 255 |
| S-013 | 查詢物料 M-0001 的資料 | normal | mm_c01 | mm_c01 | 0.7413 | template | ✅ | 343 |
| S-014 | 列出所有原物料 | normal | mm_c02 | mm_c02 | 0.6548 | template | ✅ | 366 |
| S-015 | 各物料群組有多少物料 | normal | mm_c03 | mm_c03 | 0.6326 | template | ✅ | 360 |
| S-016 | 這個月新增了哪些物料 | normal | mm_c04 | mm_c04 | 0.6827 | template | ✅ | 575 |
| S-017 | 半成品物料有幾個 | normal | mm_c02 | mm_c02 | 0.7361 | template | ✅ | 362 |
| S-018 | 物料 M-0050 的重量是多少 | normal | mm_c01 | mm_c01 | 0.6503 | template | ✅ | 417 |
| S-019 | 列出所有成品物料 | normal | mm_c02 | mm_c02 | 0.6865 | template | ✅ | 396 |
| S-020 | 物料數量最多的物料類型 | normal | mm_c03 | mm_c03 | 0.6775 | template | ✅ | 428 |
| S-021 | 物料 M-0001 的庫存多少 | normal | mm_d01 | mm_d01 | 0.7031 | template | ✅ | 302 |
| S-022 | 各工廠的庫存總量 | normal | mm_d02 | mm_d02 | 0.7420 | template | ✅ | 287 |
| S-023 | 目前庫存總覽 | normal | mm_d03 | mm_d03 | 0.6853 | template | ✅ | 257 |
| S-024 | 庫存低於 100 的物料 | normal | mm_d04 | mm_d04 | 0.7682 | template | ✅ | 256 |
| S-025 | 批次 B001 的庫存 | normal | mm_d05 | mm_d05 | 0.7188 | template | ✅ | 313 |
| S-026 | 30 天內即將過期的批次 | normal | mm_d06 | mm_d06 | 0.8073 | template | ✅ | 280 |
| S-027 | 庫存量最多的前 20 種物料 | normal | mm_d07 | mm_d07 | 0.7216 | template | ✅ | 333 |
| S-028 | 工廠 1000 倉庫 0001 的庫存 | normal | mm_d01 | mm_d01 | 0.6740 | template | ✅ | 496 |
| S-029 | 安全庫存不足的物料清單 | normal | mm_d04 | mm_d04 | 0.6940 | template | ✅ | 326 |
| S-030 | 哪些物料有批次庫存 | normal | mm_d05 | mm_d05 | 0.6790 | template | ✅ | 268 |
| S-031 | 各異動類型的數量統計 | normal | mm_e03 | mm_e03 | 0.7498 | template | ✅ | 378 |
| S-032 | 上個月庫存異動的總金額 | normal | mm_e06 | mm_e06 | 0.7785 | template | ✅ | 252 |
| S-033 | 異動類型 101 的數量 | normal | mm_e03 | mm_e03 | 0.6034 | template | ✅ | 301 |
| S-034 | 今年的庫存異動金額 | normal | mm_e06 | mm_e06 | 0.6878 | template | ✅ | 421 |
| S-035 | 哪種異動類型金額最高 | normal | mm_e03 | mm_e03 | 0.6434 | template | ✅ | 342 |
| S-036 | 採購單 4500000001 的詳細資訊，包含供應 | normal | mm_a02 | mm_a02 | 0.7506 | small_llm | ✅ | 336 |
| S-037 | 採購金額最高的前 10 種物料 | normal | mm_a05 | mm_a05 | 0.7618 | small_llm | ✅ | 264 |
| S-038 | 供應商 V001 上個月賣了什麼物料給我們 | normal | mm_a02 | mm_b02 | 0.6527 | small_llm | ❌ | 296 |
| S-039 | 哪些物料的採購單價超過 1000 | normal | mm_a05 | mm_a02 | 0.6231 | small_llm | ❌ | 339 |
| S-040 | 上個月採購金額前 5 的物料及描述 | normal | mm_a05 | mm_a05 | 0.6931 | small_llm | ✅ | 390 |
| S-041 | 各供應商的採購金額統計 | normal | mm_b02 | mm_b02 | 0.7746 | small_llm | ✅ | 411 |
| S-042 | 比較供應商 V001 和 V002 的採購金額 | normal | mm_b03 | mm_b03 | 0.8217 | small_llm | ✅ | 419 |
| S-043 | 採購金額前 10 的供應商 | normal | mm_b04 | mm_b04 | 0.7360 | small_llm | ✅ | 336 |
| S-044 | 哪個供應商交貨最多 | normal | mm_b04 | mm_b04 | 0.6813 | small_llm | ✅ | 311 |
| S-045 | 供應商 V003 今年的採購金額趨勢 | normal | mm_b02 | mm_b02 | 0.7636 | small_llm | ✅ | 280 |
| S-046 | 在途庫存有多少 | normal | mm_d08 | mm_d08 | 0.6631 | small_llm | ✅ | 388 |
| S-047 | 在途物料清單及數量 | normal | mm_d08 | mm_d08 | 0.6637 | small_llm | ✅ | 299 |
| S-048 | 上個月的收貨記錄 | normal | mm_e01 | mm_e01 | 0.6767 | small_llm | ✅ | 297 |
| S-049 | 上個月的發料記錄 | normal | mm_e02 | mm_c04 | 0.6583 | template | ❌ | 258 |
| S-050 | 物料憑證 5000000001 的明細 | normal | mm_e05 | mm_e05 | 0.7657 | small_llm | ✅ | 339 |
| S-051 | 上個月的調撥記錄 | normal | mm_e08 | mm_e08 | 0.7049 | small_llm | ✅ | 360 |
| S-052 | 過去一年的庫存異動趨勢 | normal | mm_e04 | mm_e04 | 0.7199 | small_llm | ✅ | 385 |
| S-053 | 物料 M-0010 上個月的所有異動 | normal | mm_e01 | mm_c04 | 0.6579 | template | ❌ | 441 |
| S-054 | 收貨金額前 10 的物料 | normal | mm_e01 | mm_f01 | 0.6072 | large_llm | ❌ | 536 |
| S-055 | 上季度每月的收貨與發料對比 | normal | mm_e04 | mm_e04 | 0.7347 | small_llm | ✅ | 413 |
| S-056 | 工廠 1000 的異動記錄 | normal | mm_e01 | mm_e01 | 0.5994 | small_llm | ✅ | 388 |
| S-057 | 物料 M-0001 今年被領料幾次 | normal | mm_e02 | mm_e02 | 0.6634 | small_llm | ✅ | 434 |
| S-058 | 上個月有退貨的物料 | normal | mm_e07 | mm_e07 | 0.7141 | large_llm | ✅ | 320 |
| S-059 | 哪些物料上個月有調撥進出 | normal | mm_e08 | mm_e08 | 0.6675 | small_llm | ✅ | 390 |
| S-060 | 成本中心 CC001 的領料記錄 | normal | mm_e02 | mm_e02 | 0.7349 | small_llm | ✅ | 370 |
| S-061 | 供應商 V001 供應哪些物料 | normal | mm_b06 | mm_b06 | 0.6962 | large_llm | ✅ | 321 |
| S-062 | 每個供應商供應的物料品項數 | normal | mm_b06 | mm_b06 | 0.6946 | large_llm | ✅ | 288 |
| S-063 | 哪個供應商供應最多種物料 | normal | mm_b06 | mm_b04 | 0.6242 | small_llm | ❌ | 282 |
| S-064 | 上個月的退貨統計 | normal | mm_e07 | mm_e07 | 0.7226 | large_llm | ✅ | 363 |
| S-065 | 退貨率最高的供應商 | normal | mm_e07 | mm_e07 | 0.6191 | large_llm | ✅ | 333 |
| S-066 | 各供應商的退貨金額排名 | normal | mm_e07 | mm_b04 | 0.6049 | small_llm | ❌ | 338 |
| S-067 | 採購到收貨的平均前置時間 | normal | mm_f01 | mm_f01 | 0.7596 | large_llm | ✅ | 336 |
| S-068 | 哪些物料的前置時間超過 30 天 | normal | mm_f01 | mm_f01 | 0.6161 | large_llm | ✅ | 375 |
| S-069 | 物料的採購量與消耗量對比 | normal | mm_f02 | mm_f02 | 0.7487 | large_llm | ✅ | 301 |
| S-070 | 哪些物料的消耗量遠超採購量 | normal | mm_f02 | mm_f02 | 0.5878 | large_llm | ✅ | 361 |
| S-071 | 各物料的庫存周轉率 | normal | mm_f03 | mm_f03 | 0.7257 | large_llm | ✅ | 343 |
| S-072 | 周轉率低於 2 的滯銷物料 | normal | mm_f03 | mm_f03 | 0.6265 | large_llm | ✅ | 342 |
| S-073 | 做一個 ABC 分析 | normal | mm_f04 | mm_f04 | 0.6214 | large_llm | ✅ | 305 |
| S-074 | A 類物料有哪些 | normal | mm_f04 | — | 0.0000 | — | ❌ | 242 |
| S-075 | 前置時間最長的前 5 個供應商 | normal | mm_f01 | mm_f01 | 0.6711 | large_llm | ✅ | 341 |
| S-076 | 供應商 V001 的平均交貨天數 | normal | mm_f01 | mm_f01 | 0.6592 | large_llm | ✅ | 321 |
| S-077 | 採購金額佔總額 80% 的核心物料 | normal | mm_f04 | mm_f04 | 0.6898 | large_llm | ✅ | 370 |
| S-078 | 各工廠的庫存周轉天數 | normal | mm_f03 | mm_d02 | 0.6250 | template | ❌ | 368 |
| S-079 | 過去半年每月的採購 vs 消耗趨勢圖資料 | normal | mm_f02 | mm_a04 | 0.7580 | template | ❌ | 322 |
| S-080 | 哪些物料有採購但從未消耗 | normal | mm_f02 | — | 0.0000 | — | ❌ | 379 |
| S-081 | 幫我查一下數據 | ambiguous | — | mm_e08 | 0.6015 | small_llm | ❌ | 311 |
| S-082 | 最近的資料 | ambiguous | — | mm_c04 | 0.6356 | template | ❌ | 378 |
| S-083 | 多少錢 | ambiguous | — | — | 0.0000 | — | ✅ | 436 |
| S-084 | 那個東西的量 | ambiguous | — | — | 0.0000 | — | ✅ | 386 |
| S-085 | V001 怎麼樣 | ambiguous | — | — | 0.0000 | — | ✅ | 486 |
| S-086 | 比較一下 | ambiguous | — | — | 0.0000 | — | ✅ | 409 |
| S-087 | 上個月的情況 | ambiguous | — | mm_a04 | 0.6103 | template | ❌ | 372 |
| S-088 | 有沒有問題 | ambiguous | — | — | 0.0000 | — | ✅ | 334 |
| S-089 | 幫我看看 M-0001 | ambiguous | — | mm_c01 | 0.5981 | template | ❌ | 307 |
| S-090 | 供應商排名 | ambiguous | — | mm_b04 | 0.7321 | small_llm | ❌ | 290 |
| S-091 | 查詢 FI 模組的會計憑證 | error | — | mm_e05 | 0.5985 | small_llm | ❌ | 329 |
| S-092 | 查詢物料的 ABC_NONEXIST_FIELD  | error | — | — | 0.0000 | — | ✅ | 391 |
| S-093 | SELECT * FROM users | error | — | — | 0.0000 | — | ✅ | 310 |
| S-094 | DROP TABLE MARA | error | — | — | 0.0000 | — | ✅ | 352 |
| S-095 | 查詢 SD 模組的銷售訂單 VBAK | error | — | — | 0.0000 | — | ✅ | 229 |
| S-096 | 查詢 2025 年的採購訂單 | error | — | mm_a01 | 0.7529 | template | ✅ | 258 |
| S-097 | 列出所有供應商 | error | — | mm_b01 | 0.6598 | template | ✅ | 203 |
| S-098 | 物料 M-0001 的庫存 | error | — | mm_d01 | 0.7307 | template | ✅ | 232 |
| S-099 | 各工廠的庫存總量 | error | — | mm_d02 | 0.7420 | template | ✅ | 280 |
| S-100 | AAAAAAAAAAAAAAAAAAAAAAAAA | error | — | — | 0.0000 | — | ✅ | 386 |