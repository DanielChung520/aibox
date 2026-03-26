"""Pipeline orchestrator — composes vectorization and graph extraction."""

from typing import TypedDict

from kb_pipeline.arango_ops import ArangoOps
from kb_pipeline.chunker import chunk_text
from kb_pipeline.embedder import Embedder
from kb_pipeline.graph import GraphExtractor
from kb_pipeline.qdrant_ops import Point, QdrantStore


class VectorizeResult(TypedDict):
    chunks: int
    status: str


class GraphResult(TypedDict):
    entities: int
    relations: int
    status: str


class Pipeline:
    def __init__(
        self,
        arango: ArangoOps | None = None,
        embedder: Embedder | None = None,
        qdrant: QdrantStore | None = None,
        graph: GraphExtractor | None = None,
    ) -> None:
        self.arango = arango or ArangoOps()
        self.embedder = embedder or Embedder()
        self.qdrant = qdrant or QdrantStore()
        self.graph = graph or GraphExtractor()

    def vectorize(self, file_id: str, local_path: str, root_id: str) -> VectorizeResult:
        self.arango.update_status(file_id, vector_status="processing")
        self.arango.log_event(
            file_id, "vectorize", "start", f"Starting vectorization for {file_id}"
        )
        try:
            raw_text = self.arango.read_file(file_id)
            if raw_text is None:
                chunks_raw = self.arango.read_file_chunks(file_id)
                if chunks_raw:
                    raw_text = " ".join(chunks_raw)
                else:
                    from pathlib import Path

                    raw_text = Path(local_path).read_text(
                        encoding="utf-8", errors="replace"
                    )
            text = raw_text.strip()
            if not text:
                self.arango.update_status(file_id, vector_status="completed")
                self.arango.log_event(
                    file_id, "vectorize", "end", "No content to vectorize"
                )
                return VectorizeResult(chunks=0, status="no_content")

            chunks = chunk_text(text)
            self.arango.log_event(
                file_id, "vectorize", "step", f"Chunked into {len(chunks)} pieces"
            )
            embeddings = []
            for i, chunk in enumerate(chunks):
                emb = self.embedder.embed(chunk)
                if emb:
                    embeddings.append(emb)
                if i % 10 == 0:
                    self.arango.log_event(
                        file_id,
                        "vectorize",
                        "step",
                        f"Embedded {i + 1}/{len(chunks)} chunks",
                    )

            if not embeddings:
                reason = "vectorize: no embeddings generated (embedding service returned empty)"
                self.arango.update_status(
                    file_id, vector_status="failed", failed_reason=reason
                )
                self.arango.log_event(file_id, "vectorize", "error", reason)
                return VectorizeResult(chunks=0, status="embedding_failed")

            collection = f"knowledge_{root_id}"
            self.qdrant.ensure_collection(collection)
            import hashlib
            points = [
                Point(
                    id=int(hashlib.md5(f"{file_id}_{i}".encode()).hexdigest()[:12], 16),
                    vector=embeddings[i],
                    file_id=file_id,
                    root_id=root_id,
                    chunk_index=i,
                    text=chunks[i][:500],
                    text_full=chunks[i],
                )
                for i in range(len(chunks))
            ]
            count = self.qdrant.upsert(collection, points)
            self.arango.update_status(file_id, vector_status="completed")
            self.arango.log_event(
                file_id,
                "vectorize",
                "end",
                f"Completed: {count} vectors indexed in collection '{collection}'",
            )
            return VectorizeResult(chunks=count, status="completed")

        except Exception as exc:
            reason = f"vectorize: {type(exc).__name__}: {exc}"
            self.arango.update_status(
                file_id, vector_status="failed", failed_reason=reason
            )
            self.arango.log_error(file_id, "vectorize", reason, exc)
            return VectorizeResult(chunks=0, status="failed")

    def extract_graph(self, file_id: str, local_path: str) -> GraphResult:
        self.arango.update_status(file_id, graph_status="processing")
        self.arango.log_event(
            file_id, "graph", "start", f"Starting graph extraction for {file_id}"
        )
        try:
            raw_text = self.arango.read_file(file_id)
            if raw_text is None:
                chunks_raw = self.arango.read_file_chunks(file_id)
                if chunks_raw:
                    raw_text = " ".join(chunks_raw)
                else:
                    from pathlib import Path

                    raw_text = Path(local_path).read_text(
                        encoding="utf-8", errors="replace"
                    )
            text = raw_text.strip()
            if not text:
                self.arango.update_status(file_id, graph_status="completed")
                self.arango.log_event(
                    file_id, "graph", "end", "No content to extract graph from"
                )
                return GraphResult(entities=0, relations=0, status="no_content")

            self.arango.log_event(
                file_id, "graph", "step", "Calling LLM for entity/relation extraction"
            )
            entities, relations = self.graph.extract(text)
            self.arango.log_event(
                file_id,
                "graph",
                "step",
                f"LLM returned {len(entities)} entities, {len(relations)} relations",
            )
            if entities or relations:
                self.arango.upsert_graph(file_id, entities, relations)

            self.arango.update_status(file_id, graph_status="completed")
            self.arango.log_event(
                file_id,
                "graph",
                "end",
                f"Completed: {len(entities)} entities, {len(relations)} relations stored",
            )
            return GraphResult(
                entities=len(entities),
                relations=len(relations),
                status="completed",
            )

        except Exception as exc:
            reason = f"graph: {type(exc).__name__}: {exc}"
            self.arango.update_status(
                file_id, graph_status="failed", failed_reason=reason
            )
            self.arango.log_error(file_id, "graph", reason, exc)
            return GraphResult(entities=0, relations=0, status="failed")
