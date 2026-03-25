from typing import Any

from celery_app.app import app


@app.task(bind=True, max_retries=3)  # type: ignore[misc]
def vectorize_task(
    self: Any, file_id: str, local_path: str, root_id: str
) -> dict[str, Any]:
    from kb_pipeline.pipeline import Pipeline

    pipeline = Pipeline()
    result = pipeline.vectorize(file_id, local_path, root_id)
    return {"file_id": file_id, **result}


@app.task(bind=True, max_retries=3)  # type: ignore[misc]
def graph_task(self: Any, file_id: str, local_path: str) -> dict[str, Any]:
    from kb_pipeline.pipeline import Pipeline

    pipeline = Pipeline()
    result = pipeline.extract_graph(file_id, local_path)
    return {"file_id": file_id, **result}


@app.task(bind=True, max_retries=3)  # type: ignore[misc]
def process_file_task(
    self: Any, file_id: str, local_path: str, root_id: str
) -> dict[str, Any]:
    from kb_pipeline.pipeline import Pipeline

    pipeline = Pipeline()
    v_result = pipeline.vectorize(file_id, local_path, root_id)
    g_result = pipeline.extract_graph(file_id, local_path)
    return {"file_id": file_id, "vector": v_result, "graph": g_result}
