"""
Query Router - NL→AQL query execution and explain endpoints.

Provides natural language to ArangoDB AQL query conversion,
query execution, and AQL explain plan functionality.

# Last Update: 2026-03-23 18:40:25
# Author: Daniel Chung
# Version: 2.0.0
"""

import os
import time
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "qwen2.5-coder:7b")
ARANGO_URL = os.getenv("ARANGO_URL", "http://localhost:8529")
ARANGO_DB = os.getenv("ARANGO_DATABASE", "abc_desktop")
ARANGO_USER = os.getenv("ARANGO_USER", "root")
ARANGO_PASSWORD = os.getenv("ARANGO_PASSWORD", "abc_desktop_2026")

SYSTEM_PROMPT = """You are a database expert. Convert the user's natural language \
query into an ArangoDB AQL query.

Rules:
1. Only query collections: users, roles, system_params, functions, role_functions, \
da_intents, da_table_info, da_field_info, da_table_relation
2. Use FOR...FILTER...RETURN pattern
3. Always use parameterized values with @ symbol
4. Return ONLY valid AQL, no explanation
5. If query is not about data, say "NO_QUERY"

Examples:
- "show all users" -> FOR u IN users RETURN u
- "get admin user" -> FOR u IN users FILTER u.username == @username RETURN u
- "list enabled users" -> FOR u IN users FILTER u.status == 'enabled' RETURN u
"""


class QueryRequest(BaseModel):
    """Query request body."""
    natural_language: str
    collection: Optional[str] = None
    context: Optional[dict[str, object]] = None


class ExplainRequest(BaseModel):
    """AQL explain request body."""
    aql: str


async def generate_aql(natural_language: str) -> str:
    """Generate AQL from natural language via Ollama."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": DEFAULT_MODEL,
                "messages": [
                    {"role": "system", "content": SYSTEM_PROMPT},
                    {"role": "user", "content": natural_language},
                ],
                "stream": False,
                "temperature": 0.3,
            },
        )
        response.raise_for_status()
        data = response.json()
        content: str = data.get("message", {}).get("content", "").strip()
        return content


async def execute_aql_query(aql_query: str) -> tuple[list[dict[str, object]], float]:
    """Execute AQL query against ArangoDB."""
    start = time.time()
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{ARANGO_URL}/_db/{ARANGO_DB}/_api/cursor",
            json={"query": aql_query},
            auth=(ARANGO_USER, ARANGO_PASSWORD),
        )
        response.raise_for_status()
        data = response.json()
        results: list[dict[str, object]] = data.get("result", [])
    execution_time = time.time() - start
    return results, execution_time


@router.post("/query")
async def query(request: QueryRequest) -> dict[str, object]:
    """Convert natural language to AQL and execute."""
    try:
        aql = await generate_aql(request.natural_language)

        if "NO_QUERY" in aql.upper():
            return {
                "natural_language": request.natural_language,
                "aql": "",
                "results": [],
                "message": "Query could not be generated from input",
            }

        if not aql.upper().strip().startswith("FOR"):
            return {
                "natural_language": request.natural_language,
                "aql": aql,
                "results": [],
                "message": "Invalid AQL generated",
            }

        results, execution_time = await execute_aql_query(aql)

        return {
            "natural_language": request.natural_language,
            "aql": aql,
            "results": results,
            "execution_time": execution_time,
        }

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502, detail=f"Service unavailable: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/explain")
async def explain_aql(request: ExplainRequest) -> dict[str, object]:
    """Get AQL explain plan."""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{ARANGO_URL}/_db/{ARANGO_DB}/_api/explain",
                json={"query": request.aql},
                auth=(ARANGO_USER, ARANGO_PASSWORD),
            )
            response.raise_for_status()
            result: dict[str, object] = response.json()
            return result
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502, detail=f"ArangoDB unavailable: {str(e)}"
        )


@router.get("/health")
def query_health() -> dict[str, str]:
    """Query sub-service health check."""
    return {"status": "ok", "sub_service": "query", "version": "2.0.0"}
