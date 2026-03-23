"""
Data Agent Service - Unified Data Query & Intent Management

Combines intent RAG (Qdrant-based intent matching, embedding sync)
and query execution (NL→AQL, NL→SQL pipeline) under a single FastAPI app.

# Last Update: 2026-03-23 18:40:25
# Author: Daniel Chung
# Version: 2.0.0
"""

import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from data_agent.intent_rag.router import router as intent_rag_router
from data_agent.query.router import router as query_router

app = FastAPI(
    title="AIBox Data Agent Service",
    description="Unified data query and intent management service.",
    version="2.0.0",
)

# CORS configuration
ALLOWED_ORIGINS = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:1420,http://localhost:6500",
).split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount sub-routers
app.include_router(intent_rag_router, prefix="/intent-rag", tags=["Intent RAG"])
app.include_router(query_router, prefix="/query", tags=["Query"])


@app.get("/")
def root() -> dict[str, str]:
    """Service information."""
    return {
        "service": "data_agent",
        "description": "Unified data query and intent management",
        "version": "2.0.0",
        "port": "8003",
        "status": "running",
    }


@app.get("/health")
def health() -> dict[str, str]:
    """Health check."""
    return {"status": "ok", "service": "data_agent"}
