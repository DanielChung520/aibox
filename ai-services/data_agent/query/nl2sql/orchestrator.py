"""
NL→SQL Pipeline - Orchestrator

Main pipeline entry point that coordinates all phases:
Intent Classification → Schema Retrieval → Query Plan → SQL Gen → Validation → Execution

Includes self-correction loop (1 retry on execution failure).

# Last Update: 2026-03-23 23:24:21
# Author: Daniel Chung
# Version: 1.0.0
"""

import logging
import os
import time

from data_agent.query.nl2sql.exceptions import PipelineError
from data_agent.query.nl2sql.executor import execute_sql
from data_agent.query.nl2sql.intent_classifier import classify_intent
from data_agent.query.nl2sql.models import (
    GenerationStrategy,
    PipelineConfig,
    PipelinePhaseResult,
    PipelineResult,
)
from data_agent.query.nl2sql.plan_generator import generate_query_plan
from data_agent.query.nl2sql.schema_retriever import retrieve_schema
from data_agent.query.nl2sql.sql_generator import generate_sql
from data_agent.query.nl2sql.validator import validate_sql

logger = logging.getLogger(__name__)


def _build_config() -> PipelineConfig:
    """Build pipeline config from environment variables."""
    return PipelineConfig(
        ollama_base_url=os.getenv("OLLAMA_BASE_URL", "http://localhost:11434"),
        small_model=os.getenv("NL2SQL_SMALL_MODEL", "mistral-nemo:12b"),
        large_model=os.getenv("NL2SQL_LARGE_MODEL", "qwen3-coder:30b"),
        embedding_model=os.getenv("EMBEDDING_MODEL", "bge-m3:latest"),
        qdrant_url=os.getenv("QDRANT_URL", "http://localhost:6333"),
        qdrant_collection=os.getenv("QDRANT_COLLECTION", "data_agent_intents"),
        arango_url=os.getenv("ARANGO_URL", "http://localhost:8529"),
        arango_db=os.getenv("ARANGO_DATABASE", "abc_desktop"),
        arango_user=os.getenv("ARANGO_USER", "root"),
        arango_password=os.getenv("ARANGO_PASSWORD", "abc_desktop_2026"),
        s3_endpoint=os.getenv("S3_ENDPOINT", "http://localhost:8334"),
        s3_bucket=os.getenv("S3_BUCKET", "sap"),
        s3_access_key=os.getenv("S3_ACCESS_KEY", "admin"),
        s3_secret_key=os.getenv("S3_SECRET_KEY", "admin123"),
        match_threshold=float(os.getenv("MATCH_THRESHOLD", "0.5")),
        max_retries=int(os.getenv("NL2SQL_MAX_RETRIES", "2")),
    )


async def run_nl2sql_pipeline(
    query: str,
    config: PipelineConfig | None = None,
) -> PipelineResult:
    """Run the full NL→SQL pipeline.

    Phases:
    1. Intent Classification (Qdrant)
    2. Schema Retrieval (ArangoDB)
    3. Query Plan Generation (template or LLM)
    4. SQL Generation (3-tier hybrid)
    5. SQL Validation (3-layer)
    6. DuckDB Execution

    Args:
        query: Natural language query string.
        config: Pipeline configuration (built from env if None).

    Returns:
        PipelineResult with all phase outcomes.
    """
    if config is None:
        config = _build_config()

    start_time = time.time() * 1000
    phases: list[PipelinePhaseResult] = []

    try:
        # Phase 1: Intent Classification
        t0 = time.time() * 1000
        intent = await classify_intent(query, config)
        phases.append(PipelinePhaseResult(
            phase="intent_classification",
            duration_ms=round(time.time() * 1000 - t0, 2),
        ))
        logger.info(
            "Intent classified: %s (score=%.3f, strategy=%s)",
            intent.intent_id, intent.score, intent.generation_strategy.value,
        )

        # Phase 2: Schema Retrieval
        t0 = time.time() * 1000
        schema = await retrieve_schema(intent.tables, config)
        phases.append(PipelinePhaseResult(
            phase="schema_retrieval",
            duration_ms=round(time.time() * 1000 - t0, 2),
        ))
        logger.info(
            "Schema retrieved: %d tables, %d fields, %d relations",
            len(schema.tables), len(schema.fields), len(schema.relations),
        )

        # Phase 3: Query Plan Generation
        t0 = time.time() * 1000
        plan = await generate_query_plan(query, intent, schema, config)
        phases.append(PipelinePhaseResult(
            phase="plan_generation",
            duration_ms=round(time.time() * 1000 - t0, 2),
        ))
        logger.info("Query plan generated: %s", plan.intent_type)

        # Phase 4-6: SQL Generation → Validation → Execution (with retry)
        generated_sql = ""
        validation = None
        last_error = ""
        for attempt in range(config.max_retries + 1):
            # Phase 4: SQL Generation
            t0 = time.time() * 1000
            generated_sql = await generate_sql(
                query, plan, intent, schema, config, last_error
            )
            phases.append(PipelinePhaseResult(
                phase=f"sql_generation_attempt_{attempt + 1}",
                duration_ms=round(time.time() * 1000 - t0, 2),
            ))
            logger.info("SQL generated (attempt %d): %s...", attempt + 1,
                        generated_sql[:100])

            # Phase 5: SQL Validation
            t0 = time.time() * 1000
            run_semantic = (
                intent.generation_strategy == GenerationStrategy.LARGE_LLM
            )
            validation = await validate_sql(
                generated_sql, schema, config,
                run_semantic_check=run_semantic,
            )
            phases.append(PipelinePhaseResult(
                phase=f"sql_validation_attempt_{attempt + 1}",
                duration_ms=round(time.time() * 1000 - t0, 2),
                success=validation.is_valid,
            ))

            if not validation.is_valid:
                last_error = str([e.message for e in validation.errors])
                if attempt < config.max_retries:
                    logger.warning("Validation failed, retrying: %s", last_error)
                    continue
                return PipelineResult(
                    success=False,
                    query=query,
                    matched_intent=intent,
                    query_plan=plan,
                    generated_sql=generated_sql,
                    validation=validation,
                    error="SQL validation failed after retries",
                    phases=phases,
                    total_time_ms=round(time.time() * 1000 - start_time, 2),
                )

            # Phase 6: Execution
            t0 = time.time() * 1000
            try:
                result = await execute_sql(generated_sql, config)
                phases.append(PipelinePhaseResult(
                    phase="execution",
                    duration_ms=round(time.time() * 1000 - t0, 2),
                ))
                logger.info("Execution complete: %d rows", result.row_count)

                return PipelineResult(
                    success=True,
                    query=query,
                    matched_intent=intent,
                    query_plan=plan,
                    generated_sql=generated_sql,
                    validation=validation,
                    execution_result=result,
                    phases=phases,
                    total_time_ms=round(time.time() * 1000 - start_time, 2),
                )
            except PipelineError as exec_err:
                phases.append(PipelinePhaseResult(
                    phase=f"execution_attempt_{attempt + 1}",
                    duration_ms=round(time.time() * 1000 - t0, 2),
                    success=False,
                    error=str(exec_err),
                ))
                last_error = str(exec_err)
                if attempt < config.max_retries:
                    logger.warning("Execution failed, retrying: %s",
                                   last_error[:200])
                    continue
                return PipelineResult(
                    success=False,
                    query=query,
                    matched_intent=intent,
                    query_plan=plan,
                    generated_sql=generated_sql,
                    validation=validation,
                    error=f"[execution] {last_error}",
                    phases=phases,
                    total_time_ms=round(time.time() * 1000 - start_time, 2),
                )

        return PipelineResult(
            success=False,
            query=query,
            matched_intent=intent,
            query_plan=plan,
            generated_sql=generated_sql,
            validation=validation,
            error=f"Pipeline exhausted retries: {last_error}",
            phases=phases,
            total_time_ms=round(time.time() * 1000 - start_time, 2),
        )

    except PipelineError as e:
        logger.error("Pipeline error at %s: %s", e.phase, str(e))
        phases.append(PipelinePhaseResult(
            phase=e.phase,
            duration_ms=0,
            success=False,
            error=str(e),
        ))
        return PipelineResult(
            success=False,
            query=query,
            error=f"[{e.phase}] {str(e)}",
            phases=phases,
            total_time_ms=round(time.time() * 1000 - start_time, 2),
        )
    except Exception as e:
        logger.error("Unexpected pipeline error: %s", str(e))
        return PipelineResult(
            success=False,
            query=query,
            error=f"Unexpected error: {str(e)}",
            phases=phases,
            total_time_ms=round(time.time() * 1000 - start_time, 2),
        )
