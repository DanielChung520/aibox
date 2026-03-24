# Data Agent 查詢測試報告

**測試時間**: 2026-03-24 13:42:57
**總場景數**: 100
**通過**: 72 (72.0%)
**失敗**: 28 (28.0%)
**平均回應時間**: 765ms

## 分類統計

| 分類 | 總數 | 通過 | 失敗 | 通過率 |
|------|------|------|------|--------|
| 正常查詢 (S-001~S-080) | 80 | 62 | 18 | 77.5% |
| 模糊查詢 (S-081~S-090) | 10 | 3 | 7 | 30.0% |
| 異常場景 (S-091~S-100) | 10 | 7 | 3 | 70.0% |

## 策略準確率 (正常查詢)

| 策略 | 總數 | 通過 | 失敗 | 通過率 |
|------|------|------|------|--------|
| template | 35 | 30 | 5 | 85.7% |
| small_llm | 25 | 17 | 8 | 68.0% |
| large_llm | 20 | 15 | 5 | 75.0% |

## 失敗詳情

| ID | 查詢 | 預期 | 實際 | Score | 原因 |
|-----|------|------|------|-------|------|
| S-007 | 今年 Q1 的採購訂單 | mm_a01 | mm_a03 | 0.6747 | Intent mismatch: expected=mm_a01 actual=mm_a03 |
| S-011 | 供應商 V001 的基本資料 | mm_b01 | mm_b06 | 0.7063 | Intent mismatch: expected=mm_b01 actual=mm_b06 |
| S-018 | 物料 M-0050 的重量是多少 | mm_c01 | (none) | 0.0000 | No match returned |
| S-020 | 物料數量最多的物料類型 | mm_c03 | mm_d07 | 0.6407 | Wrong #1 (mm_d07), but expected in top-3 @ rank 2 |
| S-035 | 哪種異動類型金額最高 | mm_e03 | mm_e06 | 0.5378 | Wrong #1 (mm_e06), but expected in top-3 @ rank 2 |
| S-038 | 供應商 V001 上個月賣了什麼物料給我們 | mm_a02 | mm_b06 | 0.6572 | Intent mismatch: expected=mm_a02 actual=mm_b06 |
| S-044 | 哪個供應商交貨最多 | mm_b04 | mm_b03 | 0.5891 | Wrong #1 (mm_b03), but expected in top-3 @ rank 3 |
| S-054 | 收貨金額前 10 的物料 | mm_e01 | mm_f01 | 0.6218 | Wrong #1 (mm_f01), but expected in top-3 @ rank 3 |
| S-055 | 上季度每月的收貨與發料對比 | mm_e04 | mm_f01 | 0.6274 | Wrong #1 (mm_f01), but expected in top-3 @ rank 3 |
| S-056 | 工廠 1000 的異動記錄 | mm_e01 | mm_e08 | 0.5827 | Intent mismatch: expected=mm_e01 actual=mm_e08 |
| S-057 | 物料 M-0001 今年被領料幾次 | mm_e02 | mm_e01 | 0.5902 | Intent mismatch: expected=mm_e02 actual=mm_e01 |
| S-058 | 上個月有退貨的物料 | mm_e07 | mm_e07 | 0.7141 | Intent OK, strategy mismatch: expected=small_llm actual=larg |
| S-059 | 哪些物料上個月有調撥進出 | mm_e08 | mm_c04 | 0.6187 | Wrong #1 (mm_c04), but expected in top-3 @ rank 2 |
| S-062 | 每個供應商供應的物料品項數 | mm_b06 | mm_b02 | 0.6373 | Wrong #1 (mm_b02), but expected in top-3 @ rank 2 |
| S-076 | 供應商 V001 的平均交貨天數 | mm_f01 | mm_b03 | 0.6395 | Intent mismatch: expected=mm_f01 actual=mm_b03 |
| S-077 | 採購金額佔總額 80% 的核心物料 | mm_f04 | mm_a05 | 0.5696 | Intent mismatch: expected=mm_f04 actual=mm_a05 |
| S-079 | 過去半年每月的採購 vs 消耗趨勢圖資料 | mm_f02 | mm_a04 | 0.7580 | Wrong #1 (mm_a04), but expected in top-3 @ rank 2 |
| S-080 | 哪些物料有採購但從未消耗 | mm_f02 | mm_f01 | 0.5008 | Intent mismatch: expected=mm_f02 actual=mm_f01 |
| S-081 | 幫我查一下數據 | (none) | mm_e08 | 0.5923 | High score 0.5923 on ambiguous query → matched mm_e08 |
| S-082 | 最近的資料 | (none) | mm_c04 | 0.6356 | High score 0.6356 on ambiguous query → matched mm_c04 |
| S-084 | 那個東西的量 | (none) | mm_a04 | 0.5634 | High score 0.5634 on ambiguous query → matched mm_a04 |
| S-086 | 比較一下 | (none) | mm_b03 | 0.5576 | High score 0.5576 on ambiguous query → matched mm_b03 |
| S-087 | 上個月的情況 | (none) | mm_a04 | 0.6103 | High score 0.6103 on ambiguous query → matched mm_a04 |
| S-089 | 幫我看看 M-0001 | (none) | mm_e01 | 0.6173 | High score 0.6173 on ambiguous query → matched mm_e01 |
| S-090 | 供應商排名 | (none) | mm_b04 | 0.7386 | High score 0.7386 on ambiguous query → matched mm_b04 |
| S-091 | 查詢 FI 模組的會計憑證 | (none) | mm_e05 | 0.5985 | Unexpected match mm_e05 score=0.5985 |
| S-092 | 查詢物料的 ABC_NONEXIST_FIELD 欄位 | (none) | mm_f04 | 0.5597 | Unexpected match mm_f04 score=0.5597 |
| S-095 | 查詢 SD 模組的銷售訂單 VBAK | (none) | mm_a01 | 0.5946 | Unexpected match mm_a01 score=0.5946 |

## Top-3 分析 (意圖不匹配)

### S-007: 今年 Q1 的採購訂單
- 預期: `mm_a01`
- Top-3:
  1. `mm_a03` (score=0.6747, strategy=template)
  2. `mm_b02` (score=0.6368, strategy=small_llm)
  3. `mm_a04` (score=0.5943, strategy=template)

### S-011: 供應商 V001 的基本資料
- 預期: `mm_b01`
- Top-3:
  1. `mm_b06` (score=0.7063, strategy=large_llm)
  2. `mm_b03` (score=0.6653, strategy=small_llm)
  3. `mm_b02` (score=0.6622, strategy=small_llm)

### S-018: 物料 M-0050 的重量是多少
- 預期: `mm_c01`
- Top-3:

### S-020: 物料數量最多的物料類型
- 預期: `mm_c03`
- Top-3:
  1. `mm_d07` (score=0.6407, strategy=template)
  2. `mm_c03` (score=0.6294, strategy=template)
  3. `mm_a05` (score=0.6191, strategy=small_llm)

### S-035: 哪種異動類型金額最高
- 預期: `mm_e03`
- Top-3:
  1. `mm_e06` (score=0.5378, strategy=template)
  2. `mm_e03` (score=0.5304, strategy=template)

### S-038: 供應商 V001 上個月賣了什麼物料給我們
- 預期: `mm_a02`
- Top-3:
  1. `mm_b06` (score=0.6572, strategy=large_llm)
  2. `mm_b02` (score=0.6527, strategy=small_llm)
  3. `mm_b05` (score=0.6458, strategy=template)

### S-044: 哪個供應商交貨最多
- 預期: `mm_b04`
- Top-3:
  1. `mm_b03` (score=0.5891, strategy=small_llm)
  2. `mm_b02` (score=0.5774, strategy=small_llm)
  3. `mm_b04` (score=0.5667, strategy=small_llm)

### S-054: 收貨金額前 10 的物料
- 預期: `mm_e01`
- Top-3:
  1. `mm_f01` (score=0.6218, strategy=large_llm)
  2. `mm_a05` (score=0.5957, strategy=small_llm)
  3. `mm_e01` (score=0.5676, strategy=small_llm)

### S-055: 上季度每月的收貨與發料對比
- 預期: `mm_e04`
- Top-3:
  1. `mm_f01` (score=0.6274, strategy=large_llm)
  2. `mm_e02` (score=0.6156, strategy=small_llm)
  3. `mm_e04` (score=0.6148, strategy=small_llm)

### S-056: 工廠 1000 的異動記錄
- 預期: `mm_e01`
- Top-3:
  1. `mm_e08` (score=0.5827, strategy=small_llm)
  2. `mm_e06` (score=0.5403, strategy=template)
  3. `mm_e03` (score=0.5374, strategy=template)

### S-057: 物料 M-0001 今年被領料幾次
- 預期: `mm_e02`
- Top-3:
  1. `mm_e01` (score=0.5902, strategy=small_llm)
  2. `mm_d01` (score=0.5615, strategy=template)
  3. `mm_c01` (score=0.5582, strategy=template)

### S-059: 哪些物料上個月有調撥進出
- 預期: `mm_e08`
- Top-3:
  1. `mm_c04` (score=0.6187, strategy=template)
  2. `mm_e08` (score=0.6156, strategy=small_llm)
  3. `mm_e04` (score=0.5857, strategy=small_llm)

### S-062: 每個供應商供應的物料品項數
- 預期: `mm_b06`
- Top-3:
  1. `mm_b02` (score=0.6373, strategy=small_llm)
  2. `mm_b06` (score=0.6298, strategy=large_llm)
  3. `mm_c03` (score=0.6197, strategy=template)

### S-076: 供應商 V001 的平均交貨天數
- 預期: `mm_f01`
- Top-3:
  1. `mm_b03` (score=0.6395, strategy=small_llm)
  2. `mm_b02` (score=0.6247, strategy=small_llm)
  3. `mm_b05` (score=0.6027, strategy=template)

### S-077: 採購金額佔總額 80% 的核心物料
- 預期: `mm_f04`
- Top-3:
  1. `mm_a05` (score=0.5696, strategy=small_llm)
  2. `mm_f01` (score=0.5479, strategy=large_llm)
  3. `mm_a03` (score=0.5193, strategy=template)

### S-079: 過去半年每月的採購 vs 消耗趨勢圖資料
- 預期: `mm_f02`
- Top-3:
  1. `mm_a04` (score=0.758, strategy=template)
  2. `mm_f02` (score=0.6807, strategy=large_llm)
  3. `mm_a03` (score=0.6594, strategy=template)

### S-080: 哪些物料有採購但從未消耗
- 預期: `mm_f02`
- Top-3:
  1. `mm_f01` (score=0.5008, strategy=large_llm)


## 全量結果

| ID | 查詢 | 類別 | 預期意圖 | 實際意圖 | Score | 策略 | 結果 | 耗時ms |
|-----|------|------|----------|----------|-------|------|------|--------|
| S-001 | 查詢 2025 年 3 月的採購訂單 | normal | mm_a01 | mm_a01 | 0.7753 | template | ✅ | 1075 |
| S-002 | 2024 年的採購訂單有哪些 | normal | mm_a01 | mm_a01 | 0.5220 | template | ✅ | 1064 |
| S-003 | 上個月的採購總金額是多少 | normal | mm_a03 | mm_a03 | 0.7054 | template | ✅ | 1059 |
| S-004 | 各工廠的採購金額比較 | normal | mm_a06 | mm_a06 | 0.7309 | template | ✅ | 1150 |
| S-005 | 各幣別的採購金額分布 | normal | mm_a07 | mm_a07 | 0.7991 | template | ✅ | 1121 |
| S-006 | 過去一年的採購趨勢 | normal | mm_a04 | mm_a04 | 0.7169 | template | ✅ | 867 |
| S-007 | 今年 Q1 的採購訂單 | normal | mm_a01 | mm_a03 | 0.6747 | template | ❌ | 780 |
| S-008 | 工廠 1000 的採購金額 | normal | mm_a06 | mm_a06 | 0.6110 | template | ✅ | 774 |
| S-009 | 列出所有供應商 | normal | mm_b01 | mm_b01 | 0.6991 | template | ✅ | 716 |
| S-010 | 台灣的供應商有哪些 | normal | mm_b01 | mm_b01 | 0.6801 | template | ✅ | 765 |
| S-011 | 供應商 V001 的基本資料 | normal | mm_b01 | mm_b06 | 0.7063 | large_llm | ❌ | 435 |
| S-012 | 供應商 V001 過去半年的月度採購趨勢 | normal | mm_b05 | mm_b05 | 0.8563 | template | ✅ | 500 |
| S-013 | 查詢物料 M-0001 的資料 | normal | mm_c01 | mm_c01 | 0.7628 | template | ✅ | 547 |
| S-014 | 列出所有原物料 | normal | mm_c02 | mm_c02 | 0.6548 | template | ✅ | 494 |
| S-015 | 各物料群組有多少物料 | normal | mm_c03 | mm_c03 | 0.6395 | template | ✅ | 486 |
| S-016 | 這個月新增了哪些物料 | normal | mm_c04 | mm_c04 | 0.6827 | template | ✅ | 400 |
| S-017 | 半成品物料有幾個 | normal | mm_c02 | mm_c02 | 0.7361 | template | ✅ | 340 |
| S-018 | 物料 M-0050 的重量是多少 | normal | mm_c01 | — | 0.0000 | — | ❌ | 298 |
| S-019 | 列出所有成品物料 | normal | mm_c02 | mm_c02 | 0.6865 | template | ✅ | 280 |
| S-020 | 物料數量最多的物料類型 | normal | mm_c03 | mm_d07 | 0.6407 | template | ❌ | 553 |
| S-021 | 物料 M-0001 的庫存多少 | normal | mm_d01 | mm_d01 | 0.7031 | template | ✅ | 514 |
| S-022 | 各工廠的庫存總量 | normal | mm_d02 | mm_d02 | 0.7420 | template | ✅ | 504 |
| S-023 | 目前庫存總覽 | normal | mm_d03 | mm_d03 | 0.6853 | template | ✅ | 490 |
| S-024 | 庫存低於 100 的物料 | normal | mm_d04 | mm_d04 | 0.7682 | template | ✅ | 487 |
| S-025 | 批次 B001 的庫存 | normal | mm_d05 | mm_d05 | 0.7188 | template | ✅ | 235 |
| S-026 | 30 天內即將過期的批次 | normal | mm_d06 | mm_d06 | 0.8073 | template | ✅ | 783 |
| S-027 | 庫存量最多的前 20 種物料 | normal | mm_d07 | mm_d07 | 0.7216 | template | ✅ | 905 |
| S-028 | 工廠 1000 倉庫 0001 的庫存 | normal | mm_d01 | mm_d01 | 0.6740 | template | ✅ | 1337 |
| S-029 | 安全庫存不足的物料清單 | normal | mm_d04 | mm_d04 | 0.6940 | template | ✅ | 776 |
| S-030 | 哪些物料有批次庫存 | normal | mm_d05 | mm_d05 | 0.6790 | template | ✅ | 1355 |
| S-031 | 各異動類型的數量統計 | normal | mm_e03 | mm_e03 | 0.7622 | template | ✅ | 913 |
| S-032 | 上個月庫存異動的總金額 | normal | mm_e06 | mm_e06 | 0.7785 | template | ✅ | 974 |
| S-033 | 異動類型 101 的數量 | normal | mm_e03 | mm_e03 | 0.5983 | template | ✅ | 832 |
| S-034 | 今年的庫存異動金額 | normal | mm_e06 | mm_e06 | 0.6878 | template | ✅ | 424 |
| S-035 | 哪種異動類型金額最高 | normal | mm_e03 | mm_e06 | 0.5378 | template | ❌ | 402 |
| S-036 | 採購單 4500000001 的詳細資訊，包含供應 | normal | mm_a02 | mm_a02 | 0.7448 | small_llm | ✅ | 1079 |
| S-037 | 採購金額最高的前 10 種物料 | normal | mm_a05 | mm_a05 | 0.7618 | small_llm | ✅ | 1004 |
| S-038 | 供應商 V001 上個月賣了什麼物料給我們 | normal | mm_a02 | mm_b06 | 0.6572 | large_llm | ❌ | 997 |
| S-039 | 哪些物料的採購單價超過 1000 | normal | mm_a05 | mm_a05 | 0.5755 | small_llm | ✅ | 1002 |
| S-040 | 上個月採購金額前 5 的物料及描述 | normal | mm_a05 | mm_a05 | 0.6931 | small_llm | ✅ | 993 |
| S-041 | 各供應商的採購金額統計 | normal | mm_b02 | mm_b02 | 0.7746 | small_llm | ✅ | 907 |
| S-042 | 比較供應商 V001 和 V002 的採購金額 | normal | mm_b03 | mm_b03 | 0.8217 | small_llm | ✅ | 893 |
| S-043 | 採購金額前 10 的供應商 | normal | mm_b04 | mm_b04 | 0.7514 | small_llm | ✅ | 888 |
| S-044 | 哪個供應商交貨最多 | normal | mm_b04 | mm_b03 | 0.5891 | small_llm | ❌ | 873 |
| S-045 | 供應商 V003 今年的採購金額趨勢 | normal | mm_b02 | mm_b02 | 0.7636 | small_llm | ✅ | 883 |
| S-046 | 在途庫存有多少 | normal | mm_d08 | mm_d08 | 0.6631 | small_llm | ✅ | 1000 |
| S-047 | 在途物料清單及數量 | normal | mm_d08 | mm_d08 | 0.6637 | small_llm | ✅ | 1000 |
| S-048 | 上個月的收貨記錄 | normal | mm_e01 | mm_e01 | 0.7144 | small_llm | ✅ | 1005 |
| S-049 | 上個月的發料記錄 | normal | mm_e02 | mm_e02 | 0.6718 | small_llm | ✅ | 1003 |
| S-050 | 物料憑證 5000000001 的明細 | normal | mm_e05 | mm_e05 | 0.7657 | small_llm | ✅ | 994 |
| S-051 | 上個月的調撥記錄 | normal | mm_e08 | mm_e08 | 0.7502 | small_llm | ✅ | 969 |
| S-052 | 過去一年的庫存異動趨勢 | normal | mm_e04 | mm_e04 | 0.7242 | small_llm | ✅ | 967 |
| S-053 | 物料 M-0010 上個月的所有異動 | normal | mm_e01 | mm_e01 | 0.6701 | small_llm | ✅ | 972 |
| S-054 | 收貨金額前 10 的物料 | normal | mm_e01 | mm_f01 | 0.6218 | large_llm | ❌ | 1159 |
| S-055 | 上季度每月的收貨與發料對比 | normal | mm_e04 | mm_f01 | 0.6274 | large_llm | ❌ | 1148 |
| S-056 | 工廠 1000 的異動記錄 | normal | mm_e01 | mm_e08 | 0.5827 | small_llm | ❌ | 466 |
| S-057 | 物料 M-0001 今年被領料幾次 | normal | mm_e02 | mm_e01 | 0.5902 | small_llm | ❌ | 366 |
| S-058 | 上個月有退貨的物料 | normal | mm_e07 | mm_e07 | 0.7141 | large_llm | ❌ | 383 |
| S-059 | 哪些物料上個月有調撥進出 | normal | mm_e08 | mm_c04 | 0.6187 | template | ❌ | 816 |
| S-060 | 成本中心 CC001 的領料記錄 | normal | mm_e02 | mm_e02 | 0.7365 | small_llm | ✅ | 441 |
| S-061 | 供應商 V001 供應哪些物料 | normal | mm_b06 | mm_b06 | 0.7269 | large_llm | ✅ | 711 |
| S-062 | 每個供應商供應的物料品項數 | normal | mm_b06 | mm_b02 | 0.6373 | small_llm | ❌ | 695 |
| S-063 | 哪個供應商供應最多種物料 | normal | mm_b06 | mm_b06 | 0.6064 | large_llm | ✅ | 961 |
| S-064 | 上個月的退貨統計 | normal | mm_e07 | mm_e07 | 0.7226 | large_llm | ✅ | 751 |
| S-065 | 退貨率最高的供應商 | normal | mm_e07 | mm_e07 | 0.6191 | large_llm | ✅ | 421 |
| S-066 | 各供應商的退貨金額排名 | normal | mm_e07 | mm_e07 | 0.5976 | large_llm | ✅ | 404 |
| S-067 | 採購到收貨的平均前置時間 | normal | mm_f01 | mm_f01 | 0.7599 | large_llm | ✅ | 419 |
| S-068 | 哪些物料的前置時間超過 30 天 | normal | mm_f01 | mm_f01 | 0.6255 | large_llm | ✅ | 763 |
| S-069 | 物料的採購量與消耗量對比 | normal | mm_f02 | mm_f02 | 0.7874 | large_llm | ✅ | 827 |
| S-070 | 哪些物料的消耗量遠超採購量 | normal | mm_f02 | mm_f02 | 0.6074 | large_llm | ✅ | 825 |
| S-071 | 各物料的庫存周轉率 | normal | mm_f03 | mm_f03 | 0.7669 | large_llm | ✅ | 1118 |
| S-072 | 周轉率低於 2 的滯銷物料 | normal | mm_f03 | mm_f03 | 0.6536 | large_llm | ✅ | 1145 |
| S-073 | 做一個 ABC 分析 | normal | mm_f04 | mm_f04 | 0.6571 | large_llm | ✅ | 879 |
| S-074 | A 類物料有哪些 | normal | mm_f04 | mm_f04 | 0.5801 | large_llm | ✅ | 869 |
| S-075 | 前置時間最長的前 5 個供應商 | normal | mm_f01 | mm_f01 | 0.5909 | large_llm | ✅ | 932 |
| S-076 | 供應商 V001 的平均交貨天數 | normal | mm_f01 | mm_b03 | 0.6395 | small_llm | ❌ | 661 |
| S-077 | 採購金額佔總額 80% 的核心物料 | normal | mm_f04 | mm_a05 | 0.5696 | small_llm | ❌ | 624 |
| S-078 | 各工廠的庫存周轉天數 | normal | mm_f03 | mm_f03 | 0.6548 | large_llm | ✅ | 830 |
| S-079 | 過去半年每月的採購 vs 消耗趨勢圖資料 | normal | mm_f02 | mm_a04 | 0.7580 | template | ❌ | 673 |
| S-080 | 哪些物料有採購但從未消耗 | normal | mm_f02 | mm_f01 | 0.5008 | large_llm | ❌ | 790 |
| S-081 | 幫我查一下數據 | ambiguous | — | mm_e08 | 0.5923 | small_llm | ❌ | 878 |
| S-082 | 最近的資料 | ambiguous | — | mm_c04 | 0.6356 | template | ❌ | 828 |
| S-083 | 多少錢 | ambiguous | — | — | 0.0000 | — | ✅ | 570 |
| S-084 | 那個東西的量 | ambiguous | — | mm_a04 | 0.5634 | template | ❌ | 546 |
| S-085 | V001 怎麼樣 | ambiguous | — | mm_b03 | 0.5484 | small_llm | ✅ | 429 |
| S-086 | 比較一下 | ambiguous | — | mm_b03 | 0.5576 | small_llm | ❌ | 381 |
| S-087 | 上個月的情況 | ambiguous | — | mm_a04 | 0.6103 | template | ❌ | 356 |
| S-088 | 有沒有問題 | ambiguous | — | mm_d06 | 0.5264 | template | ✅ | 949 |
| S-089 | 幫我看看 M-0001 | ambiguous | — | mm_e01 | 0.6173 | small_llm | ❌ | 905 |
| S-090 | 供應商排名 | ambiguous | — | mm_b04 | 0.7386 | small_llm | ❌ | 906 |
| S-091 | 查詢 FI 模組的會計憑證 | error | — | mm_e05 | 0.5985 | small_llm | ❌ | 816 |
| S-092 | 查詢物料的 ABC_NONEXIST_FIELD  | error | — | mm_f04 | 0.5597 | large_llm | ❌ | 875 |
| S-093 | SELECT * FROM users | error | — | — | 0.0000 | — | ✅ | 596 |
| S-094 | DROP TABLE MARA | error | — | — | 0.0000 | — | ✅ | 591 |
| S-095 | 查詢 SD 模組的銷售訂單 VBAK | error | — | mm_a01 | 0.5946 | template | ❌ | 864 |
| S-096 | 查詢 2025 年的採購訂單 | error | — | mm_a01 | 0.7566 | template | ✅ | 612 |
| S-097 | 列出所有供應商 | error | — | mm_b01 | 0.6991 | template | ✅ | 543 |
| S-098 | 物料 M-0001 的庫存 | error | — | mm_d01 | 0.7307 | template | ✅ | 929 |
| S-099 | 各工廠的庫存總量 | error | — | mm_d02 | 0.7420 | template | ✅ | 875 |
| S-100 | AAAAAAAAAAAAAAAAAAAAAAAAA | error | — | — | 0.0000 | — | ✅ | 939 |