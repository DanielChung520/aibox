"""
AITask Service - AI Chat Service

Provides natural language conversation with streaming support,
and 5W1H tagging for chat sessions.
Supports both Ollama-native and OpenAI-compatible API formats.

# Last Update: 2026-03-29 20:53:38
# Author: Daniel Chung
# Version: 1.3.0
"""

import json
import logging
import os
from typing import AsyncGenerator, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

logger = logging.getLogger("aitask")

app = FastAPI(
    title="AIBox AITask Service",
    description="AI Chat service with streaming support and 5W1H tagging.",
    version="1.1.0",
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")


class ChatMessage(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    messages: list[ChatMessage]
    model: Optional[str] = None
    stream: bool = True
    temperature: float = 0.7
    max_tokens: Optional[int] = None
    provider_base_url: Optional[str] = None
    api_key: Optional[str] = None


class ChatResponse(BaseModel):
    model: str
    message: ChatMessage
    done: bool


class ServiceInfo(BaseModel):
    service: str
    description: str
    version: str
    port: int
    status: str


class HealthResponse(BaseModel):
    status: str
    service: str


class TaggingMessage(BaseModel):
    role: str
    content: str


class Tag5W1HRequest(BaseModel):
    session_key: str
    messages: list[TaggingMessage]
    model: Optional[str] = None


class Tag5W1HResponse(BaseModel):
    session_key: str
    tags: dict[str, str]


@app.get("/", response_model=ServiceInfo)
def root() -> ServiceInfo:
    return ServiceInfo(
        service="aitask",
        description="AI Chat service with streaming",
        version="1.0.0",
        port=8001,
        status="running",
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="aitask")


def _is_ollama_provider(base_url: str) -> bool:
    return "localhost" in base_url or "127.0.0.1" in base_url


def _build_ollama_payload(
    model: str, messages: list[dict], temperature: float, stream: bool
) -> dict:
    return {
        "model": model,
        "messages": messages,
        "stream": stream,
        "temperature": temperature,
    }


def _build_openai_payload(
    model: str,
    messages: list[dict],
    temperature: float,
    stream: bool,
    max_tokens: Optional[int] = None,
) -> dict:
    payload: dict = {
        "model": model,
        "messages": messages,
        "stream": stream,
        "temperature": temperature,
    }
    if max_tokens is not None:
        payload["max_tokens"] = max_tokens
    return payload


def _build_headers(api_key: Optional[str]) -> dict[str, str]:
    headers: dict[str, str] = {"Content-Type": "application/json"}
    if api_key:
        headers["Authorization"] = f"Bearer {api_key}"
    return headers


async def stream_ollama(
    url: str, model: str, messages: list[dict], temperature: float
) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{url}/api/chat",
                json=_build_ollama_payload(model, messages, temperature, stream=True),
                timeout=120.0,
            )
            response.raise_for_status()
            async for line in response.aiter_lines():
                if line.strip():
                    yield f"data: {line}\n\n"
            yield "data: [DONE]\n\n"
        except httpx.HTTPError as e:
            yield f'data: {{"error": "Ollama connection failed: {str(e)}"}}\n\n'


async def stream_openai_compatible(
    url: str,
    model: str,
    messages: list[dict],
    temperature: float,
    max_tokens: Optional[int],
    api_key: Optional[str],
) -> AsyncGenerator[str, None]:
    headers = _build_headers(api_key)
    payload = _build_openai_payload(
        model, messages, temperature, stream=True, max_tokens=max_tokens
    )
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            async with client.stream(
                "POST",
                f"{url}/chat/completions",
                json=payload,
                headers=headers,
                timeout=120.0,
            ) as response:
                response.raise_for_status()
                async for line in response.aiter_lines():
                    line = line.strip()
                    if not line:
                        continue
                    if line.startswith("data: "):
                        raw = line[6:]
                        if raw == "[DONE]":
                            yield "data: [DONE]\n\n"
                            break
                        try:
                            chunk = json.loads(raw)
                            delta = chunk.get("choices", [{}])[0].get("delta", {})
                            content = delta.get("content", "")
                            reasoning = delta.get("reasoning_content", "")
                            if content or reasoning:
                                msg_part: dict[str, str] = {
                                    "role": "assistant",
                                    "content": content,
                                }
                                if reasoning:
                                    msg_part["reasoning_content"] = reasoning
                                ollama_chunk = {
                                    "message": msg_part,
                                    "done": False,
                                }
                                yield f"data: {json.dumps(ollama_chunk)}\n\n"
                        except json.JSONDecodeError:
                            continue
                yield "data: [DONE]\n\n"
        except httpx.HTTPError as e:
            yield f'data: {{"error": "LLM connection failed: {str(e)}"}}\n\n'


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest) -> StreamingResponse:
    model = request.model or DEFAULT_MODEL
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    base_url = request.provider_base_url or OLLAMA_BASE_URL
    is_ollama = _is_ollama_provider(base_url)

    if request.stream:
        if is_ollama:
            gen = stream_ollama(base_url, model, messages, request.temperature)
        else:
            gen = stream_openai_compatible(
                base_url,
                model,
                messages,
                request.temperature,
                request.max_tokens,
                request.api_key,
            )
        return StreamingResponse(gen, media_type="text/event-stream")

    if is_ollama:
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{base_url}/api/chat",
                    json=_build_ollama_payload(
                        model, messages, request.temperature, stream=False
                    ),
                )
                response.raise_for_status()
                data = response.json()
                return StreamingResponse(
                    iter([f"data: {json.dumps(data)}\n\n"]),
                    media_type="text/event-stream",
                )
            except httpx.HTTPError as e:
                raise HTTPException(
                    status_code=502, detail=f"Ollama connection failed: {str(e)}"
                )
    else:
        headers = _build_headers(request.api_key)
        payload = _build_openai_payload(
            model,
            messages,
            request.temperature,
            stream=False,
            max_tokens=request.max_tokens,
        )
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                oai_data = response.json()
                content = (
                    oai_data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                ollama_format = {
                    "model": oai_data.get("model", model),
                    "message": {"role": "assistant", "content": content},
                    "done": True,
                }
                return StreamingResponse(
                    iter([f"data: {json.dumps(ollama_format)}\n\n"]),
                    media_type="text/event-stream",
                )
            except httpx.HTTPError as e:
                raise HTTPException(
                    status_code=502, detail=f"LLM connection failed: {str(e)}"
                )


@app.post("/chat")
async def chat(request: ChatRequest) -> dict:
    model = request.model or DEFAULT_MODEL
    messages = [{"role": m.role, "content": m.content} for m in request.messages]
    base_url = request.provider_base_url or OLLAMA_BASE_URL
    is_ollama = _is_ollama_provider(base_url)

    if is_ollama:
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{base_url}/api/chat",
                    json=_build_ollama_payload(
                        model, messages, request.temperature, stream=False
                    ),
                )
                response.raise_for_status()
                data = response.json()
                return {
                    "model": data.get("model", model),
                    "message": data.get("message", {}),
                    "done": data.get("done", True),
                }
            except httpx.HTTPError as e:
                raise HTTPException(
                    status_code=502, detail=f"Ollama connection failed: {str(e)}"
                )
    else:
        headers = _build_headers(request.api_key)
        payload = _build_openai_payload(
            model,
            messages,
            request.temperature,
            stream=False,
            max_tokens=request.max_tokens,
        )
        async with httpx.AsyncClient(timeout=120.0) as client:
            try:
                response = await client.post(
                    f"{base_url}/chat/completions",
                    json=payload,
                    headers=headers,
                )
                response.raise_for_status()
                oai_data = response.json()
                content = (
                    oai_data.get("choices", [{}])[0]
                    .get("message", {})
                    .get("content", "")
                )
                return {
                    "model": oai_data.get("model", model),
                    "message": {"role": "assistant", "content": content},
                    "done": True,
                }
            except httpx.HTTPError as e:
                raise HTTPException(
                    status_code=502, detail=f"LLM connection failed: {str(e)}"
                )


@app.get("/models")
async def list_models() -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=502, detail=f"Ollama connection failed: {str(e)}"
            )


TAGGING_MODEL = os.getenv("TAGGING_MODEL", "qwen3-coder:30b")

TAG_5W1H_PROMPT = """分析以下對話內容，提取 5W1H 標籤。
回覆必須是嚴格的 JSON 格式，包含以下欄位（值使用繁體中文，若無法判斷則填 "未知"）：
{
  "who": "涉及的人或角色",
  "what": "討論的主題或事項",
  "when": "涉及的時間",
  "where": "涉及的地點或範圍",
  "why": "目的或原因",
  "how": "方法或方式"
}

對話內容：
"""


def _build_tagging_messages(conversation: list[TaggingMessage]) -> list[dict[str, str]]:
    conversation_text = "\n".join(
        f"[{m.role}]: {m.content}" for m in conversation if m.content.strip()
    )
    return [
        {
            "role": "system",
            "content": "你是一個標籤提取助手，只輸出 JSON，不要輸出其他內容。",
        },
        {"role": "user", "content": f"{TAG_5W1H_PROMPT}{conversation_text}"},
    ]


def _parse_tags_response(raw: str) -> dict[str, str]:
    cleaned = raw.strip()
    if cleaned.startswith("```"):
        lines = cleaned.split("\n")
        lines = [l for l in lines if not l.strip().startswith("```")]
        cleaned = "\n".join(lines).strip()

    try:
        parsed = json.loads(cleaned)
    except json.JSONDecodeError:
        start = cleaned.find("{")
        end = cleaned.rfind("}")
        if start != -1 and end != -1 and end > start:
            parsed = json.loads(cleaned[start : end + 1])
        else:
            raise

    default_keys = ("who", "what", "when", "where", "why", "how")
    return {k: str(parsed.get(k, "未知")) for k in default_keys}


@app.post("/v1/chat/tag-5w1h", response_model=Tag5W1HResponse)
async def tag_5w1h(request: Tag5W1HRequest) -> Tag5W1HResponse:
    model = request.model or TAGGING_MODEL
    messages = _build_tagging_messages(request.messages)

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "temperature": 0.3,
                },
            )
            response.raise_for_status()
            data = response.json()
            raw_content: str = data.get("message", {}).get("content", "")
        except httpx.HTTPError as e:
            raise HTTPException(
                status_code=502,
                detail=f"Ollama connection failed: {str(e)}",
            )

    try:
        tags = _parse_tags_response(raw_content)
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(
            "5W1H parse failed for session %s: %s | raw: %s",
            request.session_key,
            e,
            raw_content,
        )
        tags = {k: "未知" for k in ("who", "what", "when", "where", "why", "how")}

    return Tag5W1HResponse(session_key=request.session_key, tags=tags)
