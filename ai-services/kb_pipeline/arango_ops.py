"""ArangoDB operations for knowledge base files."""

import os
import traceback as tb_module
from datetime import datetime, timezone
from pathlib import Path

import httpx

ARANGO_URL = os.getenv("ARANGO_URL", "http://localhost:8529")
ARANGO_DB = os.getenv("ARANGO_DATABASE", "abc_desktop")
ARANGO_USER = os.getenv("ARANGO_USER", "root")
ARANGO_PASSWORD = os.getenv("ARANGO_PASSWORD", "abc_desktop_2026")


class ArangoOps:
    def __init__(
        self,
        url: str | None = None,
        db: str | None = None,
        user: str | None = None,
        password: str | None = None,
    ) -> None:
        self.url = url or ARANGO_URL
        self.db = db or ARANGO_DB
        self.user = user or ARANGO_USER
        self.password = password or ARANGO_PASSWORD
        self.auth = (self.user, self.password)

    def _client(self) -> httpx.Client:
        return httpx.Client(timeout=30.0, auth=self.auth)

    def read_file(self, file_id: str) -> str | None:
        with self._client() as client:
            doc_resp = client.get(
                f"{self.url}/_db/{self.db}/_api/document/knowledge_files/{file_id}"
            )
            if doc_resp.status_code not in (200, 201):
                return None
            doc = doc_resp.json()
            local_path = doc.get("local_path")
            if not local_path:
                return None

            if local_path.startswith("http://") or local_path.startswith("https://"):
                try:
                    file_resp = client.get(local_path, timeout=60.0)
                    if file_resp.status_code != 200:
                        return None
                    content = file_resp.content
                except Exception:
                    return None
            elif Path(local_path).exists():
                content = Path(local_path).read_bytes()
            else:
                return None

            ext = local_path.rsplit(".", 1)[-1].lower() if "." in local_path else ""
            if ext == "pdf":
                try:
                    import io

                    import pdfplumber

                    with pdfplumber.open(io.BytesIO(content)) as pdf:
                        pages: list[str] = []
                        for page in pdf.pages:
                            text = page.extract_text()
                            if text:
                                pages.append(text)
                        return "\n\n".join(pages) if pages else ""
                except Exception:
                    return None

            try:
                return content.decode("utf-8", errors="replace")
            except Exception:
                return None

    def read_file_chunks(self, file_id: str) -> list[str]:
        with self._client() as client:
            resp = client.post(
                f"{self.url}/_db/{self.db}/_api/cursor",
                json={
                    "query": """
                        FOR d IN knowledge_chunks
                        FILTER d.file_id == @file_id
                        SORT d.chunk_index
                        RETURN d.text
                    """,
                    "bindVars": {"file_id": file_id},
                },
            )
            if resp.status_code in (200, 201):
                result: list[str] = resp.json().get("result", [])
                return result
            return []

    def update_status(
        self,
        file_id: str,
        vector_status: str | None = None,
        graph_status: str | None = None,
        failed_reason: str | None = None,
    ) -> None:
        patch: dict[str, object] = {}
        if vector_status is not None:
            patch["vector_status"] = vector_status
        if graph_status is not None:
            patch["graph_status"] = graph_status
        if failed_reason is not None:
            patch["failed_reason"] = failed_reason
        if not patch:
            return
        with self._client() as client:
            client.patch(
                f"{self.url}/_db/{self.db}/_api/document/knowledge_files/{file_id}",
                json=patch,
            )

    def set_task_id(
        self,
        file_id: str,
        vector_task_id: str | None = None,
        graph_task_id: str | None = None,
    ) -> None:
        patch: dict[str, object] = {}
        if vector_task_id is not None:
            patch["vector_task_id"] = vector_task_id
        if graph_task_id is not None:
            patch["graph_task_id"] = graph_task_id
        if not patch:
            return
        with self._client() as client:
            client.patch(
                f"{self.url}/_db/{self.db}/_api/document/knowledge_files/{file_id}",
                json=patch,
            )

    def get_file(self, file_id: str) -> dict[str, object] | None:
        with self._client() as client:
            resp = client.get(
                f"{self.url}/_db/{self.db}/_api/document/knowledge_files/{file_id}"
            )
            if resp.status_code == 200:
                return dict(resp.json())
            return None

    def get_system_param(self, key: str) -> str | None:
        with self._client() as client:
            resp = client.get(
                f"{self.url}/_db/{self.db}/_api/document/system_params/{key}"
            )
            if resp.status_code == 200:
                return str(resp.json().get("param_value", ""))
            return None

    def ensure_graph_collections(self) -> None:
        with self._client() as client:
            for name, edge_type in [("knowledge_graphs", 3), ("knowledge_graph_edges", 2)]:
                resp = client.get(
                    f"{self.url}/_db/{self.db}/_api/collection/{name}"
                )
                if resp.status_code == 404:
                    client.post(
                        f"{self.url}/_db/{self.db}/_api/collection",
                        json={"name": name, "type": edge_type},
                    )

    def upsert_graph(
        self,
        file_id: str,
        nodes: list[dict[str, object]],
        edges: list[dict[str, object]],
    ) -> None:
        self.ensure_graph_collections()
        nodes_data = [
            {
                "_key": f"{file_id}_node_{i}",
                "file_id": file_id,
                "entity": n["entity"],
                "entity_type": n.get("entity_type", "concept"),
                "description": n.get("description", ""),
            }
            for i, n in enumerate(nodes)
        ]
        entity_index: dict[str, int] = {
            str(n["entity"]): i for i, n in enumerate(nodes)
        }
        edges_data = []
        for i, e in enumerate(edges):
            src_raw = str(e["source"])
            tgt_raw = str(e["target"])
            src_idx = entity_index.get(src_raw, int(src_raw) if src_raw.isdigit() else -1)
            tgt_idx = entity_index.get(tgt_raw, int(tgt_raw) if tgt_raw.isdigit() else -1)
            if src_idx < 0 or tgt_idx < 0 or src_idx >= len(nodes) or tgt_idx >= len(nodes):
                continue
            edges_data.append({
                "_key": f"{file_id}_edge_{i}",
                "_from": f"knowledge_graphs/{file_id}_node_{src_idx}",
                "_to": f"knowledge_graphs/{file_id}_node_{tgt_idx}",
                "file_id": file_id,
                "relation": e.get("relation", "related_to"),
                "source": f"{file_id}_node_{src_idx}",
                "target": f"{file_id}_node_{tgt_idx}",
            })
        with self._client() as client:
            for node in nodes_data:
                resp = client.post(
                    f"{self.url}/_db/{self.db}/_api/document/knowledge_graphs",
                    json=node,
                )
                if resp.status_code not in (200, 201, 202, 409):
                    raise RuntimeError(
                        f"Failed to insert node {node['_key']}: "
                        f"{resp.status_code} {resp.text}"
                    )
            for edge in edges_data:
                aql_resp = client.post(
                    f"{self.url}/_db/{self.db}/_api/cursor",
                    json={
                        "query": """
                            INSERT {
                                _key: @key,
                                _from: @from,
                                _to: @to,
                                file_id: @file_id,
                                relation: @relation,
                                source: @source,
                                target: @target
                            } INTO knowledge_graph_edges
                            OPTIONS { ignoreErrors: true }
                        """,
                        "bindVars": {
                            "key": edge["_key"],
                            "from": edge["_from"],
                            "to": edge["_to"],
                            "file_id": edge["file_id"],
                            "relation": edge["relation"],
                            "source": edge["source"],
                            "target": edge["target"],
                        },
                    },
                )
                if aql_resp.status_code not in (200, 201):
                    raise RuntimeError(
                        f"Failed to insert edge {edge['_key']}: "
                        f"{aql_resp.status_code} {aql_resp.text}"
                    )

    def ensure_job_logs_collection(self) -> None:
        with self._client() as client:
            resp = client.get(f"{self.url}/_db/{self.db}/_api/collection/job_logs")
            if resp.status_code == 404:
                client.post(
                    f"{self.url}/_db/{self.db}/_api/collection",
                    json={"name": "job_logs"},
                )

    def log_event(
        self,
        file_id: str,
        task_type: str,
        event: str,
        message: str,
        detail: str | None = None,
    ) -> None:
        self.ensure_job_logs_collection()
        doc: dict[str, object] = {
            "file_id": file_id,
            "task_type": task_type,
            "event": event,
            "message": message,
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
        if detail:
            doc["detail"] = detail
        with self._client() as client:
            client.post(
                f"{self.url}/_db/{self.db}/_api/document/job_logs",
                json=doc,
            )

    def log_error(
        self,
        file_id: str,
        task_type: str,
        message: str,
        exc: BaseException,
    ) -> None:
        self.log_event(
            file_id=file_id,
            task_type=task_type,
            event="error",
            message=message,
            detail=tb_module.format_exc(),
        )

    def get_job_logs(self, file_id: str) -> list[dict[str, object]]:
        with self._client() as client:
            resp = client.post(
                f"{self.url}/_db/{self.db}/_api/cursor",
                json={
                    "query": """
                        FOR log IN job_logs
                        FILTER log.file_id == @file_id
                        SORT log.timestamp ASC
                        RETURN log
                    """,
                    "bindVars": {"file_id": file_id},
                },
            )
            if resp.status_code in (200, 201):
                return resp.json().get("result", [])
            return []

    def get_graph(self, file_id: str) -> dict[str, object]:
        with self._client() as client:
            # Fetch nodes from knowledge_graphs collection
            nodes_resp = client.post(
                f"{self.url}/_db/{self.db}/_api/cursor",
                json={
                    "query": "FOR n IN knowledge_graphs FILTER n.file_id == @file_id RETURN n",
                    "bindVars": {"file_id": file_id},
                },
            )
            raw_nodes: list[dict[str, object]] = []
            if nodes_resp.status_code in (200, 201):
                raw_nodes = nodes_resp.json().get("result", [])

            # Fetch edges from knowledge_graph_edges collection
            edges_resp = client.post(
                f"{self.url}/_db/{self.db}/_api/cursor",
                json={
                    "query": "FOR e IN knowledge_graph_edges FILTER e.file_id == @file_id RETURN e",
                    "bindVars": {"file_id": file_id},
                },
            )
            raw_edges: list[dict[str, object]] = []
            if edges_resp.status_code in (200, 201):
                raw_edges = edges_resp.json().get("result", [])

        nodes: list[dict[str, object]] = []
        node_id_map: dict[int, str] = {}
        for i, n in enumerate(raw_nodes):
            node_id_map[i] = str(n.get("_key", f"node_{i}"))
            nodes.append({
                "id": node_id_map[i],
                "label": str(n.get("entity", "unknown")),
                "type": str(n.get("entity_type", "concept")),
                "properties": {
                    "description": str(n.get("description", "")),
                },
            })

        edges: list[dict[str, object]] = []
        for e in raw_edges:
            src_node_id = str(e.get("source", ""))
            tgt_node_id = str(e.get("target", ""))
            if src_node_id and tgt_node_id:
                edges.append({
                    "source": src_node_id,
                    "target": tgt_node_id,
                    "label": str(e.get("relation", "related_to")),
                })

        return {"nodes": nodes, "edges": edges}
