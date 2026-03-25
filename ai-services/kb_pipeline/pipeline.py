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
                return VectorizeResult(chunks=0, status="no_content")

            chunks = chunk_text(text)
            embeddings = []
            for chunk in chunks:
                emb = self.embedder.embed(chunk)
                if emb:
                    embeddings.append(emb)

            if not embeddings:
                self.arango.update_status(file_id, vector_status="failed")
                return VectorizeResult(chunks=0, status="embedding_failed")

            collection = f"knowledge_{root_id}"
            self.qdrant.ensure_collection(collection)
            points = [
                Point(
                    id=int(f"{file_id}_{i}".encode().hex()[:12], 16),
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
            return VectorizeResult(chunks=count, status="completed")

        except Exception as exc:
            reason = f"vectorize: {type(exc).__name__}: {exc}"
            self.arango.update_status(file_id, vector_status="failed", failed_reason=reason)
            return VectorizeResult(chunks=0, status="failed")

    def extract_graph(self, file_id: str, local_path: str) -> GraphResult:
        self.arango.update_status(file_id, graph_status="processing")
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
                return GraphResult(entities=0, relations=0, status="no_content")

            entities, relations = self.graph.extract(text)
            if entities or relations:
                self.arango.upsert_graph(file_id, entities, relations)

            self.arango.update_status(file_id, graph_status="completed")
            return GraphResult(
                entities=len(entities),
                relations=len(relations),
                status="completed",
            )

        except Exception as exc:
            reason = f"graph: {type(exc).__name__}: {exc}"
            self.arango.update_status(file_id, graph_status="failed", failed_reason=reason)
            return GraphResult(entities=0, relations=0, status="failed")
