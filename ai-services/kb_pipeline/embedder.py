"""Ollama embedding client."""

import os

import httpx


class Embedder:
    def __init__(
        self,
        base_url: str | None = None,
        model: str | None = None,
        timeout: float = 120.0,
    ) -> None:
        self.base_url = base_url or os.getenv(
            "OLLAMA_BASE_URL", "http://localhost:11434"
        )
        self.model = model or os.getenv("EMBEDDING_MODEL", "bge-m3:latest")
        self.timeout = timeout

    def embed(self, text: str) -> list[float]:
        with httpx.Client(timeout=self.timeout) as client:
            response = client.post(
                f"{self.base_url}/api/embed",
                json={"model": self.model, "input": text},
            )
            response.raise_for_status()
            embeddings = response.json().get("embeddings", [])
            if embeddings:
                return list(embeddings[0])
            return []

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        with httpx.Client(timeout=self.timeout * len(texts)) as client:
            response = client.post(
                f"{self.base_url}/api/embed",
                json={"model": self.model, "input": texts},
            )
            response.raise_for_status()
            data = response.json()
            return [list(e) if e else [] for e in data.get("embeddings", [])]
