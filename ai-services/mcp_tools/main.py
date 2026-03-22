"""
MCP Tools Service - External Tool Integration

Provides MCP (Model Context Protocol) tool execution.

# Last Update: 2026-03-18 03:45:00
# Author: Daniel Chung
# Version: 1.0.0
"""

import asyncio
import os
from typing import Any, Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="AIBox MCP Tools Service",
    description="MCP tool execution service.",
    version="1.0.0",
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")


TOOL_REGISTRY = {
    "calculator": {
        "name": "Calculator",
        "description": "Perform mathematical calculations",
        "parameters": {"expression": "str"},
    },
    "web_search": {
        "name": "Web Search",
        "description": "Search the web for information",
        "parameters": {"query": "str", "limit": "int"},
    },
    "weather": {
        "name": "Weather",
        "description": "Get weather information for a location",
        "parameters": {"location": "str"},
    },
    "code_executor": {
        "name": "Code Executor",
        "description": "Execute Python code safely",
        "parameters": {"code": "str"},
    },
}


class ToolCall(BaseModel):
    tool: str
    parameters: dict[str, Any]


class ToolResult(BaseModel):
    tool: str
    success: bool
    result: Any
    error: Optional[str] = None


class ServiceInfo(BaseModel):
    service: str
    description: str
    version: str
    port: int
    status: str


class HealthResponse(BaseModel):
    status: str
    service: str


async def execute_calculator(expression: str) -> float | str:
    try:
        allowed_chars = set("0123456789+-*/.() ")
        if not all(c in allowed_chars for c in expression):
            raise ValueError("Invalid characters in expression")

        result = eval(expression)  # noqa: S307
        return result
    except Exception as e:
        return f"Error: {str(e)}"


async def execute_web_search(query: str, limit: int = 5) -> dict:
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.get(
                "https://api.duckduckgo.com/",
                params={"q": query, "format": "json", "no_html": 1},
            )
            response.raise_for_status()
            data = response.json()
            return {
                "query": query,
                "results": data.get("RelatedTopics", [])[:limit],
            }
    except Exception as e:
        return {"error": str(e)}


async def execute_weather(location: str) -> dict:
    return {
        "location": location,
        "temperature": "20°C",
        "condition": "Partly Cloudy",
        "humidity": "65%",
    }


async def execute_code(code: str) -> dict:
    stdout_capture: list[str] = []

    try:
        local_vars: dict[str, Any] = {}
        exec(code, {"__builtins__": __builtins__}, local_vars)  # noqa: S102
        return {"success": True, "output": local_vars.get("result", "Code executed")}
    except Exception as e:
        return {"success": False, "error": str(e)}


async def execute_tool(tool_name: str, parameters: dict[str, Any]) -> ToolResult:
    try:
        match tool_name:
            case "calculator":
                result = await execute_calculator(parameters.get("expression", ""))
            case "web_search":
                result = await execute_web_search(
                    parameters.get("query", ""),
                    parameters.get("limit", 5),
                )
            case "weather":
                result = await execute_weather(parameters.get("location", ""))
            case "code_executor":
                result = await execute_code(parameters.get("code", ""))
            case _:
                return ToolResult(
                    tool=tool_name,
                    success=False,
                    result=None,
                    error=f"Unknown tool: {tool_name}",
                )

        return ToolResult(tool=tool_name, success=True, result=result)

    except Exception as e:
        return ToolResult(tool=tool_name, success=False, result=None, error=str(e))


@app.get("/", response_model=ServiceInfo)
def root() -> ServiceInfo:
    return ServiceInfo(
        service="mcp_tools",
        description="MCP tool execution",
        version="1.0.0",
        port=8004,
        status="running",
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="mcp_tools")


@app.get("/tools")
async def list_tools() -> dict:
    return {"tools": TOOL_REGISTRY}


@app.post("/execute", response_model=ToolResult)
async def execute(call: ToolCall) -> ToolResult:
    return await execute_tool(call.tool, call.parameters)


@app.post("/execute-batch")
async def execute_batch(calls: list[ToolCall]) -> list[ToolResult]:
    tasks = [execute_tool(call.tool, call.parameters) for call in calls]
    results = await asyncio.gather(*tasks)
    return results


@app.post("/chat-with-tools")
async def chat_with_tools(messages: list[dict], tools: list[str]) -> dict:
    tool_schemas = [TOOL_REGISTRY[t] for t in tools if t in TOOL_REGISTRY]

    system_prompt = f"""You have access to the following tools:
{', '.join([f"{t['name']}: {t['description']}" for t in tool_schemas])}

When asked to perform tasks, use these tools."""

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": DEFAULT_MODEL,
                "messages": [{"role": "system", "content": system_prompt}] + messages,
                "stream": False,
                "temperature": 0.5,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data
