"""
Intent RAG Router - Qdrant-based intent matching, embedding sync, Ollama models.

Migrated from the standalone da_intent_rag service into the unified data_agent.

# Last Update: 2026-03-23 18:40:25
# Author: Daniel Chung
# Version: 2.0.0
"""

import os
from typing import Optional

import httpx
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from data_agent.config_reader import get_param

router = APIRouter()

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
QDRANT_URL = os.getenv("QDRANT_URL", "http://localhost:6333")
QDRANT_COLLECTION = os.getenv("QDRANT_COLLECTION", "data_agent_intents")
ARANGO_URL = os.getenv("ARANGO_URL", "http://localhost:8529")
ARANGO_DB = os.getenv("ARANGO_DATABASE", "abc_desktop")
ARANGO_USER = os.getenv("ARANGO_USER", "root")
ARANGO_PASSWORD = os.getenv("ARANGO_PASSWORD", "abc_desktop_2026")
MATCH_THRESHOLD = float(os.getenv("MATCH_THRESHOLD", "0.58"))


class IntentMatchRequest(BaseModel):
    """Intent match request body."""
    query: str
    top_k: int = 3


class IntentMatchResult(BaseModel):
    """Single intent match result."""
    intent_id: str
    score: float
    intent_data: dict[str, object]


class IntentMatchResponse(BaseModel):
    """Intent match response."""
    query: str
    matches: list[IntentMatchResult]
    best_match: Optional[IntentMatchResult] = None


class EmbedSyncResponse(BaseModel):
    """Embedding sync response."""
    synced_count: int
    collection: str
    status: str


async def get_embedding(text: str) -> list[float]:
    """Get embedding vector from Ollama using configured model."""
    embedding_model = await get_param("da.embedding_model")
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/embed",
            json={"model": embedding_model, "input": text},
        )
        response.raise_for_status()
        data = response.json()
        embeddings = data.get("embeddings", [])
        if embeddings and len(embeddings) > 0:
            return list(embeddings[0])
        return []


async def fetch_intents_from_arango() -> list[dict[str, object]]:
    """Fetch all intents from ArangoDB da_intents collection."""
    aql = "FOR doc IN da_intents RETURN doc"
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{ARANGO_URL}/_db/{ARANGO_DB}/_api/cursor",
            json={"query": aql},
            auth=(ARANGO_USER, ARANGO_PASSWORD),
        )
        response.raise_for_status()
        data = response.json()
        result: list[dict[str, object]] = data.get("result", [])
        return result


@router.get("/models")
async def list_ollama_models() -> dict[str, object]:
    """List available Ollama models."""
    try:
        async with httpx.AsyncClient(timeout=15.0) as client:
            response = await client.get(f"{OLLAMA_BASE_URL}/api/tags")
            response.raise_for_status()
            data = response.json()
            models_data = data.get("models", [])
            model_names: list[str] = []
            for m in models_data:
                name = m.get("name", "")
                if isinstance(name, str) and name:
                    model_names.append(name)
            result: dict[str, object] = {
                "models": model_names,
                "count": len(model_names),
            }
            return result
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Ollama service unavailable: {str(e)}",
        )


@router.post("/embed-sync", response_model=EmbedSyncResponse)
async def embed_sync() -> EmbedSyncResponse:
    """Sync all intents from ArangoDB to Qdrant with embeddings."""
    try:
        intents = await fetch_intents_from_arango()
        if not intents:
            return EmbedSyncResponse(
                synced_count=0,
                collection=QDRANT_COLLECTION,
                status="no_intents_found",
            )

        embedding_dim = int(await get_param("da.embedding_dimension"))
        async with httpx.AsyncClient(timeout=30.0) as client:
            await client.put(
                f"{QDRANT_URL}/collections/{QDRANT_COLLECTION}",
                json={
                    "vectors": {
                        "size": embedding_dim,
                        "distance": "Cosine",
                    }
                },
            )

        synced = 0
        points: list[dict[str, object]] = []

        for idx, intent in enumerate(intents):
            intent_id = str(intent.get("intent_id", intent.get("_key", "")))
            description = str(intent.get("description", ""))
            nl_examples = intent.get("nl_examples", [])

            # Build embedding text from description + examples
            embed_parts = [description]
            if isinstance(nl_examples, list):
                for ex in nl_examples:
                    if isinstance(ex, str):
                        embed_parts.append(ex)
            embed_text = " ".join(embed_parts)

            embedding = await get_embedding(embed_text)
            if not embedding:
                continue

            point: dict[str, object] = {
                "id": idx + 1,
                "vector": embedding,
                "payload": {
                    "intent_id": intent_id,
                    "description": description,
                    "intent_type": str(intent.get("intent_type", "")),
                    "group": str(intent.get("group", "")),
                    "tables": intent.get("tables", []),
                    "generation_strategy": str(
                        intent.get("generation_strategy", "template")
                    ),
                    "sql_template": str(intent.get("sql_template", "")),
                    "core_fields": intent.get("core_fields", []),
                    "nl_examples": nl_examples,
                    "example_sqls": intent.get("example_sqls", []),
                },
            }
            points.append(point)
            synced += 1

        if points:
            async with httpx.AsyncClient(timeout=120.0) as client:
                await client.put(
                    f"{QDRANT_URL}/collections/{QDRANT_COLLECTION}/points",
                    json={"points": points},
                )

        return EmbedSyncResponse(
            synced_count=synced,
            collection=QDRANT_COLLECTION,
            status="ok",
        )

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Sync failed: {str(e)}")


@router.post("/intent/match", response_model=IntentMatchResponse)
async def match_intent(request: IntentMatchRequest) -> IntentMatchResponse:
    """Match a natural language query to the closest intent(s) via Qdrant."""
    try:
        query_embedding = await get_embedding(request.query)
        if not query_embedding:
            raise HTTPException(
                status_code=500, detail="Failed to generate query embedding"
            )

        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{QDRANT_URL}/collections/{QDRANT_COLLECTION}/points/search",
                json={
                    "vector": query_embedding,
                    "limit": request.top_k,
                    "with_payload": True,
                },
            )
            response.raise_for_status()
            data = response.json()

        results = data.get("result", [])
        matches: list[IntentMatchResult] = []

        for r in results:
            score = float(r.get("score", 0.0))
            if score < MATCH_THRESHOLD:
                continue
            payload = r.get("payload", {})
            matches.append(
                IntentMatchResult(
                    intent_id=str(payload.get("intent_id", "")),
                    score=score,
                    intent_data=payload,
                )
            )

        best = matches[0] if matches else None

        return IntentMatchResponse(
            query=request.query,
            matches=matches,
            best_match=best,
        )

    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=502,
            detail=f"Qdrant service unavailable: {str(e)}",
        )
