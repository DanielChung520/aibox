"""Qdrant vector store operations."""

import os
from dataclasses import dataclass

import httpx

EMBEDDING_DIM = 1024


@dataclass
class Point:
    id: int
    vector: list[float]
    file_id: str
    root_id: str
    chunk_index: int
    text: str
    text_full: str


class QdrantStore:
    def __init__(self, url: str | None = None, timeout: float = 60.0) -> None:
        self.url = url or os.getenv("QDRANT_URL", "http://localhost:6333")
        self.timeout = timeout

    def _client(self) -> httpx.Client:
        return httpx.Client(timeout=self.timeout)

    def ensure_collection(self, name: str) -> None:
        with self._client() as client:
            resp = client.get(f"{self.url}/collections/{name}")
            if resp.status_code == 200:
                return
            client.put(
                f"{self.url}/collections/{name}",
                json={
                    "vectors": {"size": EMBEDDING_DIM, "distance": "Cosine"},
                    "optimizers_config": {"indexing_threshold": 10000},
                },
            )

    def upsert(self, collection: str, points: list[Point]) -> int:
        if not points:
            return 0
        payload = {
            "points": [
                {
                    "id": p.id,
                    "vector": p.vector,
                    "payload": {
                        "file_id": p.file_id,
                        "root_id": p.root_id,
                        "chunk_index": p.chunk_index,
                        "text": p.text[:500],
                        "text_full": p.text_full,
                    },
                }
                for p in points
            ]
        }
        with self._client() as client:
            resp = client.put(
                f"{self.url}/collections/{collection}/points", json=payload
            )
            if resp.status_code >= 400:
                raise Exception(f"Qdrant upsert failed: {resp.status_code} {resp.text}")
        return len(points)

    def search(
        self, collection: str, vector: list[float], limit: int = 5
    ) -> list[dict[str, object]]:
        with self._client() as client:
            resp = client.post(
                f"{self.url}/collections/{collection}/points/search",
                json={"vector": vector, "limit": limit, "with_payload": True},
            )
            resp.raise_for_status()
            result_data = resp.json().get("result")
            return list(result_data) if result_data else []

    def count(self, collection: str) -> int:
        with self._client() as client:
            resp = client.post(
                f"{self.url}/collections/{collection}/points/count", json={}
            )
            if resp.status_code == 200:
                result: dict[str, object] = resp.json().get("result", {})
                raw_count = result.get("count", 0)
                if isinstance(raw_count, (int, float)):
                    return int(raw_count)
            return 0
