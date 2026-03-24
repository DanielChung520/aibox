"""
NL→SQL Pipeline - Intent Classifier

Classifies natural language queries by matching against Qdrant-indexed intents.
Wraps the existing intent_rag /intent/match endpoint.

# Last Update: 2026-03-23 18:40:25
# Author: Daniel Chung
# Version: 1.0.0
"""

import httpx

from data_agent.query.nl2sql.exceptions import IntentNotFoundError
from data_agent.query.nl2sql.models import (
    GenerationStrategy,
    IntentMatch,
    PipelineConfig,
)


async def classify_intent(
    query: str, config: PipelineConfig
) -> IntentMatch:
    """Classify a natural language query by matching to the closest intent.

    Uses the Qdrant-indexed intents via the local intent_rag /intent/match
    endpoint (same service, different router).

    Args:
        query: Natural language query string.
        config: Pipeline configuration.

    Returns:
        IntentMatch with best matching intent details.

    Raises:
        IntentNotFoundError: When no intent matches above threshold.
    """
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            response = await client.post(
                f"{config.qdrant_url}/collections/"
                f"{config.qdrant_collection}/points/search",
                json={
                    "vector": await _get_query_embedding(query, config),
                    "limit": 3,
                    "with_payload": True,
                },
            )
            response.raise_for_status()
            data = response.json()

        results: list[dict[str, object]] = data.get("result", [])

        for r in results:
            score = float(r.get("score", 0.0))
            if score < config.match_threshold:
                continue

            payload: dict[str, object] = r.get("payload", {})
            strategy_str = str(payload.get("generation_strategy", "template"))
            try:
                strategy = GenerationStrategy(strategy_str)
            except ValueError:
                strategy = GenerationStrategy.TEMPLATE

            tables_raw = payload.get("tables", [])
            tables = [str(t) for t in tables_raw] if isinstance(tables_raw, list) else []

            core_fields_raw = payload.get("core_fields", [])
            core_fields = (
                [str(f) for f in core_fields_raw]
                if isinstance(core_fields_raw, list)
                else []
            )

            nl_examples_raw = payload.get("nl_examples", [])
            nl_examples = (
                [str(e) for e in nl_examples_raw]
                if isinstance(nl_examples_raw, list)
                else []
            )

            example_sqls_raw = payload.get("example_sqls", [])
            example_sqls = (
                [str(s) for s in example_sqls_raw]
                if isinstance(example_sqls_raw, list)
                else []
            )

            return IntentMatch(
                intent_id=str(payload.get("intent_id", "")),
                score=score,
                generation_strategy=strategy,
                sql_template=str(payload.get("sql_template", "")),
                tables=tables,
                core_fields=core_fields,
                description=str(payload.get("description", "")),
                intent_type=str(payload.get("intent_type", "")),
                group=str(payload.get("group", "")),
                nl_examples=nl_examples,
                example_sqls=example_sqls,
            )

        raise IntentNotFoundError(
            f"No intent matched above threshold {config.match_threshold} "
            f"for query: {query}"
        )

    except httpx.HTTPError as e:
        raise IntentNotFoundError(
            f"Qdrant service unavailable: {str(e)}"
        )


async def _get_query_embedding(
    text: str, config: PipelineConfig
) -> list[float]:
    """Get embedding vector for a query via Ollama."""
    async with httpx.AsyncClient(timeout=60.0) as client:
        response = await client.post(
            f"{config.ollama_base_url}/api/embed",
            json={"model": config.embedding_model, "input": text},
        )
        response.raise_for_status()
        data = response.json()
        embeddings = data.get("embeddings", [])
        if embeddings and len(embeddings) > 0:
            result: list[float] = list(embeddings[0])
            return result
        return []
