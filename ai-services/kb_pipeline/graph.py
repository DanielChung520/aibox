"""Knowledge graph extraction using LLM."""

from __future__ import annotations

import json
import os

import httpx


class GraphExtractor:
    EXTRACT_PROMPT = """你是一個知識圖譜提取專家。請從以下文本中提取實體和關係。

文本：
{text}

請以JSON格式返回，結構如下（只返回JSON，不要任何其他文字）：
{{
  "entities": [
    {{"entity": "實體名稱", "entity_type": "人物|組織|概念|技術|地點|事件", "description": "簡短描述"}}
  ],
  "relations": [
    {{"source": "實體A名稱", "target": "實體B名稱", "relation": "關係描述"}}
  ]
}}

規則：
- 只提取與文本內容直接相關的實體
- 實體類型必須是上述類型之一
- 關係應反映實體之間的實際聯繫
- entities 和 relations 都可以為空陣列
"""

    def __init__(
        self,
        ollama_url: str | None = None,
        model: str | None = None,
        timeout: float = 120.0,
    ) -> None:
        self.ollama_url = ollama_url or os.getenv(
            "OLLAMA_BASE_URL", "http://localhost:11434"
        )
        self.model = model or os.getenv("OLLAMA_LLM_MODEL", "llama3.2:latest")
        self.timeout = timeout

    def extract(
        self, text: str
    ) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
        prompt = self.EXTRACT_PROMPT.format(text=text[:3000])
        try:
            with httpx.Client(timeout=self.timeout) as client:
                response = client.post(
                    f"{self.ollama_url}/api/generate",
                    json={
                        "model": self.model,
                        "prompt": prompt,
                        "stream": False,
                        "options": {"temperature": 0.1, "num_predict": 512},
                    },
                )
                response.raise_for_status()
                result_text = response.json().get("response", "").strip()
            parsed: dict[str, object] = json.loads(result_text)
            entities = parsed.get("entities", [])
            relations = parsed.get("relations", [])
            return (
                list(entities) if isinstance(entities, list) else [],
                list(relations) if isinstance(relations, list) else [],
            )
        except Exception:
            return [], []
