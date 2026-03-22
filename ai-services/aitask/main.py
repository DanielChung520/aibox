"""
AITask Service - AI Chat Service

Provides natural language conversation with streaming support.

# Last Update: 2026-03-18 03:30:00
# Author: Daniel Chung
# Version: 1.0.0
"""

import os
from typing import AsyncGenerator, Optional

import httpx
from fastapi import FastAPI, HTTPException
from fastapi.responses import StreamingResponse
from pydantic import BaseModel

app = FastAPI(
    title="AIBox AITask Service",
    description="AI Chat service with streaming support.",
    version="1.0.0",
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


async def stream_chat(ollama_url: str, model: str, messages: list[dict], temperature: float) -> AsyncGenerator[str, None]:
    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{ollama_url}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": True,
                    "temperature": temperature,
                },
                timeout=120.0,
            )
            response.raise_for_status()

            async for line in response.aiter_lines():
                if line.strip():
                    yield f"data: {line}\n\n"

            yield "data: [DONE]\n\n"

        except httpx.HTTPError as e:
            yield f'data: {{"error": "Ollama connection failed: {str(e)}"}}\n\n'


@app.post("/v1/chat/completions")
async def chat_completions(request: ChatRequest) -> StreamingResponse:
    model = request.model or DEFAULT_MODEL
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    if request.stream:
        return StreamingResponse(
            stream_chat(OLLAMA_BASE_URL, model, messages, request.temperature),
            media_type="text/event-stream",
        )

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "temperature": request.temperature,
                },
            )
            response.raise_for_status()
            data = response.json()
            return StreamingResponse(
                iter([f'data: {data}\n\n']),
                media_type="text/event-stream",
            )
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Ollama connection failed: {str(e)}")


@app.post("/chat")
async def chat(request: ChatRequest) -> dict:
    model = request.model or DEFAULT_MODEL
    messages = [{"role": m.role, "content": m.content} for m in request.messages]

    async with httpx.AsyncClient(timeout=120.0) as client:
        try:
            response = await client.post(
                f"{OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": model,
                    "messages": messages,
                    "stream": False,
                    "temperature": request.temperature,
                },
            )
            response.raise_for_status()
            data = response.json()
            return {
                "model": data.get("model", model),
                "message": data.get("message", {}),
                "done": data.get("done", True),
            }
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Ollama connection failed: {str(e)}")


@app.get("/models")
async def list_models() -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            return response.json()
        except httpx.HTTPError as e:
            raise HTTPException(status_code=502, detail=f"Ollama connection failed: {str(e)}")
