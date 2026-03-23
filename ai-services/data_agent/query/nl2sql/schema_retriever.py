"""
NL→SQL Pipeline - Schema Retriever

Retrieves pruned schema context from ArangoDB for the tables
identified by intent classification. Never sends full schema to LLM.

# Last Update: 2026-03-23 18:40:25
# Author: Daniel Chung
# Version: 1.0.0
"""

import httpx

from data_agent.query.nl2sql.exceptions import SchemaError
from data_agent.query.nl2sql.models import (
    FieldSchema,
    JoinPath,
    PipelineConfig,
    SchemaContext,
    TableRelation,
    TableSchema,
)


async def retrieve_schema(
    tables: list[str], config: PipelineConfig
) -> SchemaContext:
    """Retrieve pruned schema for specified tables from ArangoDB.

    Only fetches metadata for the requested tables, not the full schema.

    Args:
        tables: List of table names to retrieve schema for.
        config: Pipeline configuration with ArangoDB credentials.

    Returns:
        SchemaContext with tables, fields, relations, and join graph.

    Raises:
        SchemaError: When ArangoDB is unreachable or query fails.
    """
    if not tables:
        raise SchemaError("No tables specified for schema retrieval")

    try:
        table_schemas = await _fetch_tables(tables, config)
        field_schemas = await _fetch_fields(tables, config)
        relations = await _fetch_relations(tables, config)
        join_graph = _build_join_graph(relations)

        return SchemaContext(
            tables=table_schemas,
            fields=field_schemas,
            relations=relations,
            join_graph=join_graph,
        )

    except httpx.HTTPError as e:
        raise SchemaError(f"ArangoDB unavailable: {str(e)}")


async def _fetch_tables(
    tables: list[str], config: PipelineConfig
) -> list[TableSchema]:
    """Fetch table metadata from da_table_info collection."""
    table_list = ", ".join(f'"{t}"' for t in tables)
    aql = (
        f"FOR t IN da_table_info "
        f"FILTER t.table_name IN [{table_list}] "
        f"RETURN t"
    )

    results = await _execute_aql(aql, config)
    return [
        TableSchema(
            table_name=str(r.get("table_name", "")),
            description=str(r.get("description", "")),
            row_count=int(r.get("row_count", 0)),
            module=str(r.get("module", "")),
        )
        for r in results
    ]


async def _fetch_fields(
    tables: list[str], config: PipelineConfig
) -> list[FieldSchema]:
    """Fetch field metadata from da_field_info collection."""
    table_list = ", ".join(f'"{t}"' for t in tables)
    aql = (
        f"FOR f IN da_field_info "
        f"FILTER f.table_name IN [{table_list}] "
        f"RETURN f"
    )

    results = await _execute_aql(aql, config)
    return [
        FieldSchema(
            table_name=str(r.get("table_name", "")),
            field_name=str(r.get("field_name", "")),
            data_type=str(r.get("data_type", "")),
            description=str(r.get("description", "")),
            is_key=bool(r.get("is_key", False)),
        )
        for r in results
    ]


async def _fetch_relations(
    tables: list[str], config: PipelineConfig
) -> list[TableRelation]:
    """Fetch table relations from da_table_relation collection."""
    table_list = ", ".join(f'"{t}"' for t in tables)
    aql = (
        f"FOR r IN da_table_relation "
        f"FILTER r.from_table IN [{table_list}] "
        f"OR r.to_table IN [{table_list}] "
        f"RETURN r"
    )

    results = await _execute_aql(aql, config)
    return [
        TableRelation(
            from_table=str(r.get("from_table", "")),
            from_field=str(r.get("from_field", "")),
            to_table=str(r.get("to_table", "")),
            to_field=str(r.get("to_field", "")),
            relation_type=str(r.get("relation_type", "INNER")),
        )
        for r in results
    ]


def _build_join_graph(
    relations: list[TableRelation],
) -> dict[str, list[JoinPath]]:
    """Build a join graph from table relations for quick lookup."""
    graph: dict[str, list[JoinPath]] = {}

    for rel in relations:
        if rel.from_table not in graph:
            graph[rel.from_table] = []
        graph[rel.from_table].append(
            JoinPath(
                target_table=rel.to_table,
                from_field=rel.from_field,
                to_field=rel.to_field,
                join_type=rel.relation_type,
            )
        )

        # Bidirectional: also add reverse
        if rel.to_table not in graph:
            graph[rel.to_table] = []
        graph[rel.to_table].append(
            JoinPath(
                target_table=rel.from_table,
                from_field=rel.to_field,
                to_field=rel.from_field,
                join_type=rel.relation_type,
            )
        )

    return graph


async def _execute_aql(
    aql: str, config: PipelineConfig
) -> list[dict[str, object]]:
    """Execute an AQL query and return results."""
    async with httpx.AsyncClient(timeout=30.0) as client:
        response = await client.post(
            f"{config.arango_url}/_db/{config.arango_db}/_api/cursor",
            json={"query": aql},
            auth=(config.arango_user, config.arango_password),
        )
        response.raise_for_status()
        data = response.json()
        result: list[dict[str, object]] = data.get("result", [])
        return result
