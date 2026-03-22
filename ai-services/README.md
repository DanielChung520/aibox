---
lastUpdate: 2026-03-18 01:59:19
author: Daniel Chung
version: 1.0.0
---

# AI Services

AIBox Python FastAPI 微服務模板，對應 AI Agent 系統規格中的五個服務：

- AITask (`8001`)
- Data Query (`8002`)
- Knowledge Assets (`8003`)
- MCP Tools (`8004`)
- BPA (`8005`)

## 目錄結構

```text
ai-services/
├── requirements.txt
├── aitask/
│   └── main.py
├── data_query/
│   └── main.py
├── knowledge_assets/
│   └── main.py
├── mcp_tools/
│   └── main.py
└── bpa/
    └── main.py
```

## 服務模板能力

每個服務皆提供：

- `GET /`：服務資訊
- `GET /health`：健康檢查
- `GET /docs`：FastAPI 自動 OpenAPI 文件

## 本地啟動

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r ai-services/requirements.txt

uvicorn ai-services.aitask.main:app --port 8001 --reload
uvicorn ai-services.data_query.main:app --port 8002 --reload
uvicorn ai-services.knowledge_assets.main:app --port 8003 --reload
uvicorn ai-services.mcp_tools.main:app --port 8004 --reload
uvicorn ai-services.bpa.main:app --port 8005 --reload
```

## 修改歷程

| 日期 | 版本 | 更新者 | 變更內容 |
|------|------|--------|----------|
| 2026-03-18 | 1.0.0 | Daniel Chung | 初始化 ai-services FastAPI 模板與服務目錄 |
