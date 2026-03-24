"""
Query Router - NL→AQL and NL→SQL query endpoints.

Provides:
- NL→AQL: Natural language to ArangoDB AQL conversion + execution
- NL→SQL: 3-tier hybrid NL→SQL pipeline (template/small_llm/large_llm)
  over Parquet data lake via DuckDB

# Last Update: 2026-03-23 21:23:16
# Author: Daniel Chung
# Version: 2.1.0
"""

import logging
import os
import time
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from data_agent.query.nl2sql import run_nl2sql_pipeline

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


logger = logging.getLogger(__name__)


class QueryRequest(BaseModel):
    natural_language: str
    collection: Optional[str] = None
    context: Optional[dict[str, object]] = None


class ExplainRequest(BaseModel):
    aql: str


class NL2SqlRequest(BaseModel):
    natural_language: str


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
        raise HTTPException(status_code=502, detail=f"Service unavailable: {str(e)}")
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
        raise HTTPException(status_code=502, detail=f"ArangoDB unavailable: {str(e)}")


@router.post("/nl2sql")
async def nl2sql(request: NL2SqlRequest) -> dict[str, object]:
    """NL→SQL pipeline: natural language → DuckDB SQL over Parquet data lake."""
    try:
        result = await run_nl2sql_pipeline(query=request.natural_language)
        return result.model_dump()
    except Exception as e:
        logger.error("NL→SQL endpoint error: %s", str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/tables/{table_name}/preview")
async def preview_table_data(
    table_name: str,
    offset: int = 0,
    limit: int = 20,
) -> dict[str, object]:
    try:
        aql_info = """
            FOR t IN da_table_info
            FILTER t.table_name == @table_name
            LIMIT 1
            RETURN t
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            info_resp = await client.post(
                f"{ARANGO_URL}/_db/{ARANGO_DB}/_api/cursor",
                json={"query": aql_info, "bindVars": {"table_name": table_name}},
                auth=(ARANGO_USER, ARANGO_PASSWORD),
            )
            info_resp.raise_for_status()
            info_data = info_resp.json()
            table_info = (
                info_data.get("result", [{}])[0] if info_data.get("result") else {}
            )

        table_id = table_info.get("table_id", table_name)

        aql_fields = """
            FOR f IN da_field_info
            FILTER f.table_id == @table_id
            SORT f.field_name ASC
            RETURN f
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            fields_resp = await client.post(
                f"{ARANGO_URL}/_db/{ARANGO_DB}/_api/cursor",
                json={"query": aql_fields, "bindVars": {"table_id": table_id}},
                auth=(ARANGO_USER, ARANGO_PASSWORD),
            )
            fields_resp.raise_for_status()
            fields_data = fields_resp.json()
            fields = fields_data.get("result", [])

        collection_name = table_info.get("table_name", table_id)
        total = 0
        rows: list[dict[str, object]] = []

        aql_count = """
            FOR doc IN @@collection
            COLLECT WITH COUNT INTO total
            RETURN total
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            count_resp = await client.post(
                f"{ARANGO_URL}/_db/{ARANGO_DB}/_api/cursor",
                json={"query": aql_count, "bindVars": {"@collection": collection_name}},
                auth=(ARANGO_USER, ARANGO_PASSWORD),
            )
            if 200 <= count_resp.status_code < 300:
                count_data = count_resp.json()
                total = (
                    count_data.get("result", [0])[0] if count_data.get("result") else 0
                )

        aql_rows = """
            FOR doc IN @@collection
            SORT doc._key ASC
            LIMIT @offset, @limit
            RETURN doc
        """
        async with httpx.AsyncClient(timeout=15.0) as client:
            rows_resp = await client.post(
                f"{ARANGO_URL}/_db/{ARANGO_DB}/_api/cursor",
                json={
                    "query": aql_rows,
                    "bindVars": {
                        "@collection": collection_name,
                        "offset": offset,
                        "limit": limit,
                    },
                },
                auth=(ARANGO_USER, ARANGO_PASSWORD),
            )
            if 200 <= rows_resp.status_code < 300:
                rows_data = rows_resp.json()
                rows = rows_data.get("result", [])

        return {
            "table_name": table_name,
            "table_id": table_id,
            "table_info": table_info,
            "fields": fields,
            "rows": rows,
            "total": total,
            "offset": offset,
            "limit": limit,
        }

    except httpx.HTTPStatusError:
        raise HTTPException(status_code=404, detail="Table not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/health")
def query_health() -> dict[str, str]:
    return {"status": "ok", "sub_service": "query", "version": "2.1.0"}
