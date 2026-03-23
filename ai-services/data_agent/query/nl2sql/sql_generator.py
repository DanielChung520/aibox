"""
NL→SQL Pipeline - 3-Tier Hybrid SQL Generator

Generates DuckDB-compatible SQL from a JSON Query Plan using one of three tiers:
- Template: Fill placeholders in sql_template (no LLM)
- Small LLM: qwen2.5-coder:7b with focused schema
- Large LLM: qwen3:32b with full reasoning

# Last Update: 2026-03-23 23:24:21
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

SQL_SYSTEM_PROMPT = """You are a DuckDB SQL expert. Generate a SELECT query.

MANDATORY: Tables are stored as Parquet files on S3. You MUST use read_parquet() to access them.
NEVER write FROM EKKO or FROM MARA — ALWAYS write FROM read_parquet('s3://...') AS alias.
The exact read_parquet paths are provided in the schema section. Copy them exactly.

Rules:
1. ONLY generate SELECT statements (no INSERT, UPDATE, DELETE, DROP, ALTER)
2. Use exact field names from schema (they are UPPERCASE: EBELN, BUKRS, MATNR, etc.)
3. Use appropriate JOIN syntax with read_parquet() on both sides
4. Output ONLY valid SQL, no explanation"""

SQL_LARGE_PROMPT = """You are a senior DuckDB SQL expert. Generate a precise SELECT query.

MANDATORY: Tables are Parquet files on S3. You MUST use read_parquet() in FROM/JOIN clauses.
NEVER write FROM EKKO — ALWAYS write FROM read_parquet('s3://sap/mm/ekko/*.parquet') AS e.
The exact read_parquet paths are provided in the schema. Copy them exactly.

DuckDB syntax:
- Date functions: CAST(field AS DATE), date_trunc('month', field)
- String: ILIKE for case-insensitive, || for concat
- Aggregation: COUNT(*), SUM(), AVG(), GROUP BY ALL

Rules:
1. ONLY SELECT statements — never INSERT/UPDATE/DELETE/DROP/ALTER
2. Use exact field names from the provided schema (UPPERCASE: EBELN, BUKRS, etc.)
3. Ensure JOIN conditions match schema relations
4. Apply all filters from the query plan
5. Output ONLY valid SQL, no explanation or markdown"""


async def generate_sql(
    query: str,
    plan: QueryPlan,
    intent: IntentMatch,
    schema: SchemaContext,
    config: PipelineConfig,
    previous_error: str = "",
) -> str:
    """Generate DuckDB SQL from a query plan using the appropriate tier.

    Args:
        query: Original natural language query.
        plan: JSON Query Plan.
        intent: Matched intent with strategy and template.
        schema: Pruned schema context.
        config: Pipeline configuration.
        previous_error: Error message from previous attempt (for self-correction).

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
        query, plan, schema, config, model, system_prompt, previous_error
    )


def _fill_template(
    plan: QueryPlan, intent: IntentMatch, config: PipelineConfig
) -> str:
    """Fill SQL template placeholders with query plan values."""
    template = intent.sql_template
    if not template:
        raise SQLGenerationError("No sql_template found for template-tier intent")

    # Phase 1: Replace time/path placeholders inside existing read_parquet() paths
    template = template.replace("{time_range}", "*")
    template = template.replace("{po_number}", _extract_placeholder(plan, "po_number"))
    template = template.replace("{vendor_list}", _extract_placeholder(plan, "vendor_list"))

    # Phase 2: Replace bare table references with read_parquet (S3 creds via DuckDB SET)
    if "read_parquet" not in intent.sql_template:
        for table in plan.tables:
            module = table.split("_")[0].lower() if "_" in table else "mm"
            tbl_name = table.split("_")[-1].lower() if "_" in table else table.lower()
            parquet_ref = (
                f"read_parquet('s3://{config.s3_bucket}/{module}/{tbl_name}/*.parquet')"
            )
            template = re.sub(
                rf"\b{re.escape(table)}\b",
                parquet_ref,
                template,
                count=1,
            )

    # Phase 4: Build WHERE conditions from plan filters
    if plan.filters:
        conditions = " AND ".join(
            f"{f.field} {f.operator} '{f.value}'" for f in plan.filters
        )
        template = template.replace("{conditions}", conditions)
    else:
        template = template.replace("WHERE {conditions}", "")
        template = template.replace("{conditions}", "1=1")

    # Phase 5: Replace remaining common placeholders
    template = template.replace("{limit}", str(plan.limit))
    template = template.replace("{start_date}", "")
    template = template.replace("{end_date}", "")

    return template.strip()


def _extract_placeholder(plan: QueryPlan, key: str) -> str:
    """Extract a value from plan filters matching a placeholder key."""
    for f in plan.filters:
        if key in f.field.lower() or key in f.value.lower():
            return f.value
    return ""


async def _generate_sql_with_llm(
    query: str,
    plan: QueryPlan,
    schema: SchemaContext,
    config: PipelineConfig,
    model: str,
    system_prompt: str,
    previous_error: str = "",
) -> str:
    """Generate SQL using LLM (Ollama)."""
    schema_desc = _format_schema_brief(schema)
    plan_json = plan.model_dump_json(indent=2)

    error_context = ""
    if previous_error:
        error_context = (
            f"\n\nPREVIOUS ATTEMPT FAILED with error:\n{previous_error}\n"
            f"Fix the error and generate corrected SQL.\n"
        )

    user_prompt = (
        f"Natural language query: {query}\n\n"
        f"Query Plan:\n{plan_json}\n\n"
        f"Available tables (use EXACTLY these FROM clauses):\n"
        f"{schema_desc}\n\n"
        f"CRITICAL: Do NOT use bare table names. "
        f"You MUST use read_parquet('s3://...') as shown above.\n"
        f"ONLY use column names listed in the schema above."
        f"{error_context}\n\n"
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
    """Format schema for LLM prompt — tables shown as FROM-ready SQL snippets."""
    lines: list[str] = []
    alias_map: dict[str, str] = {}
    for tbl in schema.tables:
        fields = [f for f in schema.fields if f.table_name == tbl.table_name]
        field_strs = [
            f"{f.field_name}({f.data_type})" for f in fields
        ]
        module = tbl.module.lower() if tbl.module else "mm"
        table_lower = tbl.table_name.lower()
        # Heuristic: master data tables use /all.parquet, others use /*.parquet
        master_tables = {"mara", "lfa1", "mard", "mchb", "t024", "t001", "t024e"}
        suffix = "all.parquet" if table_lower in master_tables else "*.parquet"
        parquet_path = f"read_parquet('s3://sap/{module}/{table_lower}/{suffix}')"
        alias = table_lower[0]
        # Deduplicate aliases (e.g., ekko=e, ekpo=e2)
        if alias in alias_map.values():
            alias = table_lower[:2]
        alias_map[tbl.table_name] = alias
        lines.append(
            f"-- {tbl.table_name}: FROM {parquet_path} AS {alias}\n"
            f"--   Columns: {', '.join(field_strs)}"
        )

    if schema.relations:
        rels = [
            f"{r.from_table}.{r.from_field}→{r.to_table}.{r.to_field}"
            for r in schema.relations
        ]
        lines.append(f"-- Relations: {'; '.join(rels)}")

    return "\n".join(lines)
