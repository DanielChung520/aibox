"""
Data Query Service - Natural Language to Database Query

Converts natural language queries into ArangoDB AQL queries.

# Last Update: 2026-03-18 03:35:00
# Author: Daniel Chung
# Version: 1.0.0
"""

import os
import time
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="AIBox Data Query Service",
    description="Convert natural language to database queries.",
    version="1.0.0",
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")
ARANGO_URL = os.getenv("ARANGO_URL", "http://localhost:8529")
ARANGO_DB = os.getenv("ARANGO_DATABASE", "abc_desktop")
ARANGO_USER = os.getenv("ARANGO_USER", "root")
ARANGO_PASSWORD = os.getenv("ARANGO_PASSWORD", "abc_desktop_2026")


class QueryRequest(BaseModel):
    natural_language: str
    collection: Optional[str] = None
    context: Optional[dict] = None


class AQLResult(BaseModel):
    aql: str
    results: list[dict]
    execution_time: float


class ServiceInfo(BaseModel):
    service: str
    description: str
    version: str
    port: int
    status: str


class HealthResponse(BaseModel):
    status: str
    service: str


SYSTEM_PROMPT = """You are a database expert. Convert the user's natural language query into an ArangoDB AQL query.

Rules:
1. Only query collections: users, roles, system_params, functions, role_functions
2. Use FOR...FILTER...RETURN pattern
3. Always use parameterized values with @ symbol
4. Return ONLY valid AQL, no explanation
5. If query is not about data, say "NO_QUERY"

Examples:
- "show all users" -> FOR u IN users RETURN u
- "get admin user" -> FOR u IN users FILTER u.username == @username RETURN u
- "list enabled users" -> FOR u IN users FILTER u.status == 'enabled' RETURN u
"""


@app.get("/", response_model=ServiceInfo)
def root() -> ServiceInfo:
    return ServiceInfo(
        service="data_query",
        description="Natural language to database query",
        version="1.0.0",
        port=8002,
        status="running",
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="data_query")


async def generate_aql(natural_language: str) -> str:
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
        return data.get("message", {}).get("content", "").strip()


async def execute_aql_query(aql_query: str) -> tuple[list[dict], float]:
    start = time.time()

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{ARANGO_URL}/_api/cursor",
            json={"query": aql_query},
            auth=(ARANGO_USER, ARANGO_PASSWORD),
        )
        response.raise_for_status()
        data = response.json()
        results = data.get("result", [])

    execution_time = time.time() - start
    return results, execution_time


@app.post("/query")
async def query(request: QueryRequest) -> dict:
    try:
        aql = await generate_aql(request.natural_language)

        if "NO_QUERY" in aql.upper():
            return {
                "natural_language": request.natural_language,
                "aql": "",
                "results": [],
                "message": "Query could not be generated from input",
            }

        if not aql.upper().startswith("FOR"):
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


@app.post("/explain")
async def explain_aql(aql: str) -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{ARANGO_URL}/_api/explain",
            json={"query": aql},
            auth=(ARANGO_USER, ARANGO_PASSWORD),
        )
        response.raise_for_status()
        return response.json()
