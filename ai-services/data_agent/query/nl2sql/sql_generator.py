"""
NL→SQL Pipeline - 3-Tier Hybrid SQL Generator

Generates DuckDB-compatible SQL from a JSON Query Plan using one of three tiers:
- Template: Fill placeholders in sql_template (no LLM)
- Small LLM: qwen2.5-coder:7b with focused schema
- Large LLM: qwen3:32b with full reasoning

# Last Update: 2026-03-23 18:40:25
# Author: Daniel Chung
# Version: 1.0.0
"""

import re

import httpx

from data_agent.query.nl2sql.exceptions import SQLGenerationError
from data_agent.query.nl2sql.models import (
    GenerationStrategy,
    IntentMatch,
    PipelineConfig,
    QueryPlan,
    SchemaContext,
)

SQL_SYSTEM_PROMPT = """You are a DuckDB SQL expert. Generate a SELECT query from \
the given query plan and schema.

Rules:
1. Use read_parquet() for table sources: read_parquet('s3://{bucket}/{table}/*.parquet')
2. ONLY generate SELECT statements (no INSERT, UPDATE, DELETE, DROP, ALTER)
3. Use exact field names from schema
4. Use appropriate JOIN syntax
5. Output ONLY valid SQL, no explanation
6. Alias tables for readability (e.g., EKKO AS e)"""

SQL_LARGE_PROMPT = """You are a senior DuckDB SQL expert. Generate a precise \
SELECT query from the given query plan, schema, and natural language query.

DuckDB-specific syntax:
- Table source: read_parquet('s3://{bucket}/{table}/*.parquet')
- Date functions: CAST(field AS DATE), date_trunc('month', field)
- String: ILIKE for case-insensitive, || for concat
- Aggregation: COUNT(*), SUM(), AVG(), GROUP BY ALL

Rules:
1. ONLY SELECT statements — never INSERT/UPDATE/DELETE/DROP/ALTER
2. Use exact field names from the provided schema
3. Alias tables (e.g., EKKO AS e, EKPO AS p)
4. Ensure JOIN conditions match schema relations
5. Apply all filters from the query plan
6. Respect ordering and limits
7. Output ONLY valid SQL, no explanation or markdown"""


async def generate_sql(
    query: str,
    plan: QueryPlan,
    intent: IntentMatch,
    schema: SchemaContext,
    config: PipelineConfig,
) -> str:
    """Generate DuckDB SQL from a query plan using the appropriate tier.

    Args:
        query: Original natural language query.
        plan: JSON Query Plan.
        intent: Matched intent with strategy and template.
        schema: Pruned schema context.
        config: Pipeline configuration.

    Returns:
        DuckDB-compatible SELECT SQL string.

    Raises:
        SQLGenerationError: When SQL generation fails.
    """
    if intent.generation_strategy == GenerationStrategy.TEMPLATE:
        return _fill_template(plan, intent, config)

    model = (
        config.small_model
        if intent.generation_strategy == GenerationStrategy.SMALL_LLM
        else config.large_model
    )

    system_prompt = (
        SQL_LARGE_PROMPT
        if intent.generation_strategy == GenerationStrategy.LARGE_LLM
        else SQL_SYSTEM_PROMPT
    )

    return await _generate_sql_with_llm(
        query, plan, schema, config, model, system_prompt
    )


def _fill_template(
    plan: QueryPlan, intent: IntentMatch, config: PipelineConfig
) -> str:
    """Fill SQL template placeholders with query plan values."""
    template = intent.sql_template
    if not template:
        raise SQLGenerationError("No sql_template found for template-tier intent")

    # Replace table references with read_parquet
    for table in plan.tables:
        parquet_ref = (
            f"read_parquet('s3://{config.s3_bucket}/{table}/*.parquet',"
            f" s3_endpoint='{config.s3_endpoint}',"
            f" s3_access_key_id='{config.s3_access_key}',"
            f" s3_secret_access_key='{config.s3_secret_key}')"
        )
        # Replace bare table name in FROM/JOIN (case-insensitive)
        template = re.sub(
            rf"\b{table}\b(?!\s*\.\s*parquet)",
            parquet_ref,
            template,
            count=1,
        )

    # Build WHERE conditions from plan filters
    if plan.filters:
        conditions = " AND ".join(
            f"{f.field} {f.operator} '{f.value}'" for f in plan.filters
        )
        template = template.replace("{conditions}", conditions)
    else:
        template = template.replace("WHERE {conditions}", "")
        template = template.replace("{conditions}", "1=1")

    # Replace common placeholders
    template = template.replace("{limit}", str(plan.limit))
    template = template.replace("{start_date}", "")
    template = template.replace("{end_date}", "")
    template = template.replace("{vendor_list}", "")

    return template.strip()


async def _generate_sql_with_llm(
    query: str,
    plan: QueryPlan,
    schema: SchemaContext,
    config: PipelineConfig,
    model: str,
    system_prompt: str,
) -> str:
    """Generate SQL using LLM (Ollama)."""
    schema_desc = _format_schema_brief(schema)
    plan_json = plan.model_dump_json(indent=2)

    user_prompt = (
        f"Natural language query: {query}\n\n"
        f"Query Plan:\n{plan_json}\n\n"
        f"Schema:\n{schema_desc}\n\n"
        f"S3 config: bucket={config.s3_bucket}, "
        f"endpoint={config.s3_endpoint}\n\n"
        f"Generate the DuckDB SQL query."
    )

    try:
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{config.ollama_base_url}/api/chat",
                json={
                    "model": model,
                    "messages": [
                        {"role": "system", "content": system_prompt},
                        {"role": "user", "content": user_prompt},
                    ],
                    "stream": False,
                    "temperature": 0.1,
                },
            )
            response.raise_for_status()
            data = response.json()
            content = str(data.get("message", {}).get("content", ""))

        return _extract_sql(content)

    except httpx.HTTPError as e:
        raise SQLGenerationError(f"LLM service unavailable: {str(e)}")


def _extract_sql(content: str) -> str:
    """Extract SQL from LLM response, handling markdown code blocks."""
    sql_match = re.search(r"```(?:sql)?\s*([\s\S]*?)```", content)
    if sql_match:
        return sql_match.group(1).strip()

    cleaned = content.strip()
    if cleaned.upper().startswith("SELECT"):
        return cleaned

    raise SQLGenerationError(f"No valid SQL in LLM response: {content[:200]}")


def _format_schema_brief(schema: SchemaContext) -> str:
    """Format schema for LLM prompt (compact)."""
    lines: list[str] = []
    for tbl in schema.tables:
        fields = [f for f in schema.fields if f.table_name == tbl.table_name]
        field_strs = [
            f"{f.field_name}({f.data_type})" for f in fields
        ]
        lines.append(f"{tbl.table_name}: {', '.join(field_strs)}")

    if schema.relations:
        rels = [
            f"{r.from_table}.{r.from_field}→{r.to_table}.{r.to_field}"
            for r in schema.relations
        ]
        lines.append(f"Relations: {'; '.join(rels)}")

    return "\n".join(lines)
