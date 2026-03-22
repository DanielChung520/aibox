"""
Knowledge Assets Service - RAG-based Knowledge Retrieval

Provides RAG (Retrieval-Augmented Generation) for knowledge base queries.

# Last Update: 2026-03-18 03:40:00
# Author: Daniel Chung
# Version: 1.0.0
"""

import os
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI(
    title="AIBox Knowledge Assets Service",
    description="RAG-based knowledge retrieval service.",
    version="1.0.0",
)

OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
DEFAULT_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2:latest")
ARANGO_URL = os.getenv("ARANGO_URL", "http://localhost:8529")
ARANGO_DB = os.getenv("ARANGO_DATABASE", "abc_desktop")
ARANGO_USER = os.getenv("ARANGO_USER", "root")
ARANGO_PASSWORD = os.getenv("ARANGO_PASSWORD", "abc_desktop_2026")


class KnowledgeRequest(BaseModel):
    query: str
    collection: Optional[str] = "knowledge"
    limit: Optional[int] = 5


class Document(BaseModel):
    _key: str
    content: str
    source: Optional[str] = None
    metadata: Optional[dict] = None


class KnowledgeResponse(BaseModel):
    query: str
    results: list[Document]
    context: str
    answer: Optional[str] = None


class ServiceInfo(BaseModel):
    service: str
    description: str
    version: str
    port: int
    status: str


class HealthResponse(BaseModel):
    status: str
    service: str


async def get_embedding(text: str) -> list[float]:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/embeddings",
            json={"model": "nomic-embed-text:latest", "prompt": text},
        )
        response.raise_for_status()
        data = response.json()
        return data.get("embedding", [])


async def search_similar(embedding: list[float], collection: str, limit: int) -> list[dict]:
    aql = f"""
    FOR doc IN {collection}
        SORT BM25(doc) DESC
        LIMIT {limit}
        RETURN doc
    """

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{ARANGO_URL}/_api/cursor",
            json={"query": aql},
            auth=(ARANGO_USER, ARANGO_PASSWORD),
        )
        response.raise_for_status()
        data = response.json()
        return data.get("result", [])


async def generate_answer(query: str, context: str) -> str:
    prompt = f"""Based on the following knowledge base context, answer the user's question.

Context:
{context}

Question: {query}

Answer:"""

    async with httpx.AsyncClient(timeout=120.0) as client:
        response = await client.post(
            f"{OLLAMA_BASE_URL}/api/chat",
            json={
                "model": DEFAULT_MODEL,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "temperature": 0.5,
            },
        )
        response.raise_for_status()
        data = response.json()
        return data.get("message", {}).get("content", "").strip()


@app.get("/", response_model=ServiceInfo)
def root() -> ServiceInfo:
    return ServiceInfo(
        service="knowledge_assets",
        description="RAG-based knowledge retrieval",
        version="1.0.0",
        port=8003,
        status="running",
    )


@app.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    return HealthResponse(status="ok", service="knowledge_assets")


@app.post("/search", response_model=KnowledgeResponse)
async def search(request: KnowledgeRequest) -> KnowledgeResponse:
    try:
        embedding = await get_embedding(request.query)

        results = await search_similar(embedding, request.collection, request.limit or 5)

        if not results:
            return KnowledgeResponse(
                query=request.query,
                results=[],
                context="",
                answer="No relevant knowledge found.",
            )

        context_parts = []
        documents = []

        for doc in results:
            content = doc.get("content", "")
            context_parts.append(content)
            documents.append(
                Document(
                    _key=doc.get("_key", ""),
                    content=content,
                    source=doc.get("source"),
                    metadata=doc.get("metadata"),
                )
            )

        context = "\n\n".join(context_parts)

        answer = await generate_answer(request.query, context)

        return KnowledgeResponse(
            query=request.query,
            results=documents,
            context=context,
            answer=answer,
        )

    except httpx.HTTPError as e:
        raise HTTPException(status_code=502, detail=f"Service unavailable: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.post("/add")
async def add_document(collection: str, content: str, source: Optional[str] = None) -> dict:
    doc = {
        "content": content,
        "source": source or "manual",
        "created_at": "2026-03-18",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{ARANGO_URL}/_api/document/{collection}",
            json=doc,
            auth=(ARANGO_USER, ARANGO_PASSWORD),
        )
        response.raise_for_status()
        return response.json()


@app.get("/collections")
async def list_collections() -> dict:
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.get(
            f"{ARANGO_URL}/_api/collection",
            auth=(ARANGO_USER, ARANGO_PASSWORD),
        )
        response.raise_for_status()
        return response.json()
