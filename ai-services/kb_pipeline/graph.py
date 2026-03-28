"""
Knowledge graph extraction using LLM.

@lastUpdate  2026-03-26 22:49:44
@author      Daniel Chung
@version     1.4.0
"""

from __future__ import annotations

import json
import os
import re

import httpx


def _sanitize_llm_json(raw: str) -> str:
    text = raw.strip()
    if text.startswith("```"):
        text = re.sub(r"^```(?:json)?\s*", "", text)
        text = re.sub(r"\s*```$", "", text)
    brace_start = text.find("{")
    brace_end = text.rfind("}")
    if brace_start != -1 and brace_end != -1:
        text = text[brace_start : brace_end + 1]
    elif brace_start != -1:
        text = _repair_truncated_json(text[brace_start:])
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text


def _repair_truncated_json(text: str) -> str:
    bracket_end = text.rfind("]")
    if bracket_end == -1:
        return text
    text = text[: bracket_end + 1]
    last_complete = text.rfind("}")
    if last_complete != -1:
        after = text[last_complete + 1 : bracket_end].strip().rstrip(",").strip()
        if after:
            text = text[: last_complete + 1] + text[bracket_end:]
    open_brackets = text.count("[") - text.count("]")
    text += "]" * max(0, open_brackets)
    open_braces = text.count("{") - text.count("}")
    text += "}" * max(0, open_braces)
    text = re.sub(r",\s*([}\]])", r"\1", text)
    return text


class GraphExtractor:
    def _get_model(self) -> str:
        from kb_pipeline.arango_ops import ArangoOps

        arango = ArangoOps()
        db_model = arango.get_system_param("knowledge.graph_model")
        if db_model:
            return db_model
        return os.getenv("OLLAMA_LLM_MODEL", "llama3.2:latest")

    def _get_num_predict(self) -> int:
        from kb_pipeline.arango_ops import ArangoOps

        arango = ArangoOps()
        val = arango.get_system_param("knowledge.graph_num_predict")
        if val:
            try:
                return int(val)
            except ValueError:
                pass
        return 4096

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
        self.timeout = timeout
        self._model = model or self._get_model()

    @property
    def model(self) -> str:
        return self._model

    def extract(
        self, text: str
    ) -> tuple[list[dict[str, object]], list[dict[str, object]]]:
        """Extract entities and relations from text via LLM.

        Raises on HTTP errors, empty responses, or unparseable JSON
        so the caller (pipeline) can mark the task as failed.
        """
        prompt = self.EXTRACT_PROMPT.format(text=text[:3000])
        num_predict = self._get_num_predict()
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                f"{self.ollama_url}/api/generate",
                json={
                    "model": self.model,
                    "prompt": prompt,
                    "stream": False,
                    "options": {"temperature": 0.1, "num_predict": num_predict},
                },
            )
            response.raise_for_status()
            result_text = response.json().get("response", "").strip()
        if not result_text:
            raise ValueError("LLM returned empty response")
        sanitized = _sanitize_llm_json(result_text)
        parsed: dict[str, object] = json.loads(sanitized)
        entities = parsed.get("entities", [])
        relations = parsed.get("relations", [])
        return (
            list(entities) if isinstance(entities, list) else [],
            list(relations) if isinstance(relations, list) else [],
        )
