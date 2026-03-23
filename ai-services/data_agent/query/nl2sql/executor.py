"""
NL→SQL Pipeline - DuckDB Executor

Executes validated SQL queries against DuckDB with parquet data sources.
SELECT-only enforcement at execution level as final safety net.

# Last Update: 2026-03-23 18:40:25
# Author: Daniel Chung
# Version: 1.0.0
"""

import time

from data_agent.query.nl2sql.exceptions import ExecutionError
from data_agent.query.nl2sql.models import PipelineConfig, SQLResult


async def execute_sql(
    sql: str, config: PipelineConfig
) -> SQLResult:
    """Execute a validated SQL query using DuckDB.

    Uses DuckDB's httpfs extension for S3/parquet access.

    Args:
        sql: Validated DuckDB-compatible SQL.
        config: Pipeline configuration with S3 credentials.

    Returns:
        SQLResult with rows, columns, count, and timing.

    Raises:
        ExecutionError: When DuckDB execution fails.
    """
    sql_upper = sql.strip().upper()
    if not sql_upper.startswith("SELECT"):
        raise ExecutionError("Only SELECT queries are allowed")

    try:
        import duckdb
    except ImportError as e:
        raise ExecutionError(f"DuckDB not installed: {str(e)}")

    start_ms = time.time() * 1000

    try:
        conn = duckdb.connect(":memory:")

        # Configure S3/httpfs for parquet access
        conn.execute("INSTALL httpfs; LOAD httpfs;")
        if config.s3_endpoint:
            endpoint = config.s3_endpoint.replace("http://", "").replace("https://", "")
            conn.execute(f"SET s3_endpoint='{endpoint}';")
            conn.execute("SET s3_use_ssl=false;")
        if config.s3_access_key:
            conn.execute(
                f"SET s3_access_key_id='{config.s3_access_key}';"
            )
        if config.s3_secret_key:
            conn.execute(
                f"SET s3_secret_access_key='{config.s3_secret_key}';"
            )
        conn.execute("SET s3_url_style='path';")

        result = conn.execute(sql)
        columns = [desc[0] for desc in result.description]
        rows_raw = result.fetchall()

        rows: list[dict[str, object]] = [
            dict(zip(columns, row)) for row in rows_raw
        ]

        elapsed_ms = time.time() * 1000 - start_ms

        return SQLResult(
            sql=sql,
            rows=rows,
            columns=columns,
            row_count=len(rows),
            execution_time_ms=round(elapsed_ms, 2),
        )

    except Exception as e:
        raise ExecutionError(f"DuckDB execution failed: {str(e)}")
