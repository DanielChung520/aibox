# Data Agent 查詢測試報告

**測試時間**: 2026-03-24 20:12:32
**總場景數**: 100
**通過**: 98 (98.0%)
**失敗**: 2 (2.0%)
**平均回應時間**: 2651ms

## 分類統計

| 分類 | 總數 | 通過 | 失敗 | 通過率 |
|------|------|------|------|--------|
| 正常查詢 (S-001~S-080) | 80 | 79 | 1 | 98.8% |
| 模糊查詢 (S-081~S-090) | 10 | 10 | 0 | 100.0% |
| 異常場景 (S-091~S-100) | 10 | 9 | 1 | 90.0% |

## 策略準確率 (正常查詢)

| 策略 | 總數 | 通過 | 失敗 | 通過率 |
|------|------|------|------|--------|
| template | 35 | 35 | 0 | 100.0% |
| small_llm | 24 | 23 | 1 | 95.8% |
| large_llm | 21 | 21 | 0 | 100.0% |

## 失敗詳情

| ID | 查詢 | 預期 | 實際 | Score | 原因 |
|-----|------|------|------|-------|------|
| S-038 | 供應商 V001 上個月賣了什麼物料給我們 | mm_a02 | mm_b02 | 0.6527 | Intent mismatch: expected=mm_a02 actual=mm_b02 |
| S-091 | 查詢 FI 模組的會計憑證 | (none) | (none) | 0.0000 | error_type mismatch: expected=intent_not_found, actual=(none |

## Top-3 分析 (意圖不匹配)

### S-038: 供應商 V001 上個月賣了什麼物料給我們
- 預期: `mm_a02`
- Top-3:
  1. `mm_b02` (score=0.6527, strategy=small_llm)
  2. `mm_b05` (score=0.6458, strategy=template)
  3. `mm_b03` (score=0.6152, strategy=small_llm)


## 全量結果

| ID | 查詢 | 類別 | 預期意圖 | 實際意圖 | Score | 策略 | 結果 | 耗時ms |
|-----|------|------|----------|----------|-------|------|------|--------|
| S-001 | 查詢 2025 年 3 月的採購訂單 | normal | mm_a01 | mm_a01 | 0.7044 | template | ✅ | 277 |
| S-002 | 2024 年的採購訂單有哪些 | normal | mm_a01 | mm_a01 | 0.5665 | template | ✅ | 306 |
| S-003 | 上個月的採購總金額是多少 | normal | mm_a03 | mm_a03 | 0.6814 | template | ✅ | 286 |
| S-004 | 各工廠的採購金額比較 | normal | mm_a06 | mm_a06 | 0.7309 | template | ✅ | 307 |
| S-005 | 各幣別的採購金額分布 | normal | mm_a07 | mm_a07 | 0.7991 | template | ✅ | 252 |
| S-006 | 過去一年的採購趨勢 | normal | mm_a04 | mm_a04 | 0.6859 | template | ✅ | 117 |
| S-007 | 今年 Q1 的採購訂單 | normal | mm_a01 | mm_a01 | 0.6753 | template | ✅ | 122 |
| S-008 | 工廠 1000 的採購金額 | normal | mm_a06 | mm_a06 | 0.6110 | template | ✅ | 134 |
| S-009 | 列出所有供應商 | normal | mm_b01 | mm_b01 | 0.6657 | template | ✅ | 152 |
| S-010 | 台灣的供應商有哪些 | normal | mm_b01 | mm_b01 | 0.6529 | template | ✅ | 133 |
| S-011 | 供應商 V001 的基本資料 | normal | mm_b01 | mm_b01 | 0.6884 | template | ✅ | 136 |
| S-012 | 供應商 V001 過去半年的月度採購趨勢 | normal | mm_b05 | mm_b05 | 0.8563 | template | ✅ | 162 |
| S-013 | 查詢物料 M-0001 的資料 | normal | mm_c01 | mm_c01 | 0.7413 | template | ✅ | 178 |
| S-014 | 列出所有原物料 | normal | mm_c02 | mm_c02 | 0.6548 | template | ✅ | 162 |
| S-015 | 各物料群組有多少物料 | normal | mm_c03 | mm_c03 | 0.6326 | template | ✅ | 164 |
| S-016 | 這個月新增了哪些物料 | normal | mm_c04 | mm_c04 | 0.6827 | template | ✅ | 143 |
| S-017 | 半成品物料有幾個 | normal | mm_c02 | mm_c02 | 0.7361 | template | ✅ | 133 |
| S-018 | 物料 M-0050 的重量是多少 | normal | mm_c01 | mm_c01 | 0.6503 | template | ✅ | 111 |
| S-019 | 列出所有成品物料 | normal | mm_c02 | mm_c02 | 0.6865 | template | ✅ | 122 |
| S-020 | 物料數量最多的物料類型 | normal | mm_c03 | mm_c03 | 0.6775 | template | ✅ | 117 |
| S-021 | 物料 M-0001 的庫存多少 | normal | mm_d01 | mm_d01 | 0.7031 | template | ✅ | 111 |
| S-022 | 各工廠的庫存總量 | normal | mm_d02 | mm_d02 | 0.7420 | template | ✅ | 113 |
| S-023 | 目前庫存總覽 | normal | mm_d03 | mm_d03 | 0.6853 | template | ✅ | 113 |
| S-024 | 庫存低於 100 的物料 | normal | mm_d04 | mm_d04 | 0.7682 | template | ✅ | 113 |
| S-025 | 批次 B001 的庫存 | normal | mm_d05 | mm_d05 | 0.7188 | template | ✅ | 113 |
| S-026 | 30 天內即將過期的批次 | normal | mm_d06 | mm_d06 | 0.8073 | template | ✅ | 110 |
| S-027 | 庫存量最多的前 20 種物料 | normal | mm_d07 | mm_d07 | 0.7216 | template | ✅ | 175 |
| S-028 | 工廠 1000 倉庫 0001 的庫存 | normal | mm_d01 | mm_d01 | 0.6740 | template | ✅ | 216 |
| S-029 | 安全庫存不足的物料清單 | normal | mm_d04 | mm_d04 | 0.6940 | template | ✅ | 422 |
| S-030 | 哪些物料有批次庫存 | normal | mm_d05 | mm_d05 | 0.6790 | template | ✅ | 255 |
| S-031 | 各異動類型的數量統計 | normal | mm_e03 | mm_e03 | 0.7498 | template | ✅ | 457 |
| S-032 | 上個月庫存異動的總金額 | normal | mm_e06 | mm_e06 | 0.7785 | template | ✅ | 392 |
| S-033 | 異動類型 101 的數量 | normal | mm_e03 | mm_e03 | 0.6034 | template | ✅ | 413 |
| S-034 | 今年的庫存異動金額 | normal | mm_e06 | mm_e06 | 0.6878 | template | ✅ | 372 |
| S-035 | 哪種異動類型金額最高 | normal | mm_e03 | mm_e03 | 0.6434 | template | ✅ | 308 |
| S-036 | 採購單 4500000001 的詳細資訊，包含供應 | normal | mm_a02 | mm_a02 | 0.7173 | small_llm | ✅ | 302 |
| S-037 | 採購金額最高的前 10 種物料 | normal | mm_a05 | mm_a05 | 0.7497 | small_llm | ✅ | 295 |
| S-038 | 供應商 V001 上個月賣了什麼物料給我們 | normal | mm_a02 | mm_b02 | 0.6527 | small_llm | ❌ | 279 |
| S-039 | 哪些物料的採購單價超過 1000 | normal | mm_a05 | mm_a05 | 0.6611 | small_llm | ✅ | 227 |
| S-040 | 上個月採購金額前 5 的物料及描述 | normal | mm_a05 | mm_a05 | 0.7209 | small_llm | ✅ | 190 |
| S-041 | 各供應商的採購金額統計 | normal | mm_b02 | mm_b02 | 0.7746 | small_llm | ✅ | 156 |
| S-042 | 比較供應商 V001 和 V002 的採購金額 | normal | mm_b03 | mm_b03 | 0.8217 | small_llm | ✅ | 138 |
| S-043 | 採購金額前 10 的供應商 | normal | mm_b04 | mm_b04 | 0.7277 | small_llm | ✅ | 133 |
| S-044 | 哪個供應商交貨最多 | normal | mm_b04 | mm_b04 | 0.5982 | small_llm | ✅ | 158 |
| S-045 | 供應商 V003 今年的採購金額趨勢 | normal | mm_b02 | mm_b02 | 0.7636 | small_llm | ✅ | 171 |
| S-046 | 在途庫存有多少 | normal | mm_d08 | mm_d08 | 0.6631 | small_llm | ✅ | 256 |
| S-047 | 在途物料清單及數量 | normal | mm_d08 | mm_d08 | 0.6637 | small_llm | ✅ | 257 |
| S-048 | 上個月的收貨記錄 | normal | mm_e01 | mm_e01 | 0.7082 | small_llm | ✅ | 251 |
| S-049 | 上個月的發料記錄 | normal | mm_e02 | mm_e02 | 0.6596 | small_llm | ✅ | 234 |
| S-050 | 物料憑證 5000000001 的明細 | normal | mm_e05 | mm_e05 | 0.7657 | small_llm | ✅ | 181 |
| S-051 | 上個月的調撥記錄 | normal | mm_e08 | mm_e08 | 0.7049 | small_llm | ✅ | 109 |
| S-052 | 過去一年的庫存異動趨勢 | normal | mm_e04 | mm_e04 | 0.7199 | small_llm | ✅ | 100 |
| S-053 | 物料 M-0010 上個月的所有異動 | normal | mm_e01 | mm_e01 | 0.6801 | small_llm | ✅ | 105 |
| S-054 | 收貨金額前 10 的物料 | normal | mm_e01 | mm_e01 | 0.6257 | small_llm | ✅ | 116 |
| S-055 | 上季度每月的收貨與發料對比 | normal | mm_e04 | mm_e04 | 0.7347 | small_llm | ✅ | 132 |
| S-056 | 工廠 1000 的異動記錄 | normal | mm_e01 | mm_e01 | 0.6305 | small_llm | ✅ | 188 |
| S-057 | 物料 M-0001 今年被領料幾次 | normal | mm_e02 | mm_e02 | 0.7028 | small_llm | ✅ | 252 |
| S-058 | 上個月有退貨的物料 | normal | mm_e07 | mm_e07 | 0.6736 | large_llm | ✅ | 262 |
| S-059 | 哪些物料上個月有調撥進出 | normal | mm_e08 | mm_e08 | 0.6675 | small_llm | ✅ | 305 |
| S-060 | 成本中心 CC001 的領料記錄 | normal | mm_e02 | mm_e02 | 0.7515 | small_llm | ✅ | 370 |
| S-061 | 供應商 V001 供應哪些物料 | normal | mm_b06 | mm_b06 | 0.6753 | large_llm | ✅ | 348 |
| S-062 | 每個供應商供應的物料品項數 | normal | mm_b06 | mm_b06 | 0.6955 | large_llm | ✅ | 323 |
| S-063 | 哪個供應商供應最多種物料 | normal | mm_b06 | mm_b06 | 0.6741 | large_llm | ✅ | 253 |
| S-064 | 上個月的退貨統計 | normal | mm_e07 | mm_e07 | 0.7228 | large_llm | ✅ | 228 |
| S-065 | 退貨率最高的供應商 | normal | mm_e07 | mm_e07 | 0.6411 | large_llm | ✅ | 153 |
| S-066 | 各供應商的退貨金額排名 | normal | mm_e07 | mm_e07 | 0.6494 | large_llm | ✅ | 166 |
| S-067 | 採購到收貨的平均前置時間 | normal | mm_f01 | mm_f01 | 0.7596 | large_llm | ✅ | 169 |
| S-068 | 哪些物料的前置時間超過 30 天 | normal | mm_f01 | mm_f01 | 0.6161 | large_llm | ✅ | 177 |
| S-069 | 物料的採購量與消耗量對比 | normal | mm_f02 | mm_f02 | 0.7475 | large_llm | ✅ | 194 |
| S-070 | 哪些物料的消耗量遠超採購量 | normal | mm_f02 | mm_f02 | 0.5966 | large_llm | ✅ | 218 |
| S-071 | 各物料的庫存周轉率 | normal | mm_f03 | mm_f03 | 0.7358 | large_llm | ✅ | 233 |
| S-072 | 周轉率低於 2 的滯銷物料 | normal | mm_f03 | mm_f03 | 0.6590 | large_llm | ✅ | 364 |
| S-073 | 做一個 ABC 分析 | normal | mm_f04 | mm_f04 | 0.6307 | large_llm | ✅ | 478 |
| S-074 | A 類物料有哪些 | normal | mm_f04 | mm_f04 | 0.5731 | large_llm | ✅ | 573 |
| S-075 | 前置時間最長的前 5 個供應商 | normal | mm_f01 | mm_f01 | 0.6711 | large_llm | ✅ | 583 |
| S-076 | 供應商 V001 的平均交貨天數 | normal | mm_f01 | mm_f01 | 0.6592 | large_llm | ✅ | 532 |
| S-077 | 採購金額佔總額 80% 的核心物料 | normal | mm_f04 | mm_f04 | 0.6859 | large_llm | ✅ | 407 |
| S-078 | 各工廠的庫存周轉天數 | normal | mm_f03 | mm_f03 | 0.6366 | large_llm | ✅ | 312 |
| S-079 | 過去半年每月的採購 vs 消耗趨勢圖資料 | normal | mm_f02 | mm_f02 | 0.7409 | large_llm | ✅ | 194 |
| S-080 | 哪些物料有採購但從未消耗 | normal | mm_f02 | mm_f02 | 0.5631 | large_llm | ✅ | 187 |
| S-081 | 幫我查一下數據 | ambiguous | — | — | 0.0000 | — | ✅ | 53 |
| S-082 | 最近的資料 | ambiguous | — | — | 0.0000 | — | ✅ | 37 |
| S-083 | 多少錢 | ambiguous | — | — | 0.0000 | — | ✅ | 36 |
| S-084 | 那個東西的量 | ambiguous | — | — | 0.0000 | — | ✅ | 19 |
| S-085 | V001 怎麼樣 | ambiguous | — | — | 0.0000 | — | ✅ | 4 |
| S-086 | 比較一下 | ambiguous | — | — | 0.0000 | — | ✅ | 5 |
| S-087 | 上個月的情況 | ambiguous | — | — | 0.0000 | — | ✅ | 11 |
| S-088 | 有沒有問題 | ambiguous | — | — | 0.0000 | — | ✅ | 12 |
| S-089 | 幫我看看 M-0001 | ambiguous | — | — | 0.0000 | — | ✅ | 10133 |
| S-090 | 供應商排名 | ambiguous | — | — | 0.0000 | — | ✅ | 60004 |
| S-091 | 查詢 FI 模組的會計憑證 | error | — | — | 0.0000 | — | ❌ | 13239 |
| S-092 | 查詢物料的 ABC_NONEXIST_FIELD  | error | — | — | 0.0000 | — | ✅ | 24885 |
| S-093 | SELECT * FROM users | error | — | — | 0.0000 | — | ✅ | 46342 |
| S-094 | DROP TABLE MARA | error | — | — | 0.0000 | — | ✅ | 30499 |
| S-095 | 查詢 SD 模組的銷售訂單 VBAK | error | — | — | 0.0000 | — | ✅ | 60001 |
| S-096 | 查詢 2025 年的採購訂單 | error | — | mm_a01 | 0.7248 | template | ✅ | 522 |
| S-097 | 列出所有供應商 | error | — | mm_b01 | 0.6657 | template | ✅ | 138 |
| S-098 | 物料 M-0001 的庫存 | error | — | mm_d01 | 0.7307 | template | ✅ | 137 |
| S-099 | 各工廠的庫存總量 | error | — | mm_d02 | 0.7420 | template | ✅ | 114 |
| S-100 | AAAAAAAAAAAAAAAAAAAAAAAAA | error | — | — | 0.0000 | — | ✅ | 444 |