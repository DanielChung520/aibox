//! Data Agent Intents API Routes
//!
//! # Description
//! DA 的 Intents CRUD endpoints (意圖記錄管理)
//!
//! # Last Update: 2026-03-22 16:51:11
//! # Author: Daniel Chung
//! # Version: 1.0.0

use crate::db::get_db;
use crate::models::ApiResponse;
use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde_json::Value;
use std::collections::HashMap;

pub fn create_da_intents_router() -> Router {
    Router::new()
        .route("/api/v1/da/intents", get(list_intents))
        .route(
            "/api/v1/da/intents/{intent_id}",
            get(get_intent).delete(delete_intent),
        )
        .route(
            "/api/v1/da/intents/{intent_id}/revectorize",
            post(revectorize_intent),
        )
        .route(
            "/api/v1/da/intents/{intent_id}/template",
            post(mark_intent_template),
        )
}

async fn list_intents(
    Query(params): Query<HashMap<String, String>>,
) -> Result<impl IntoResponse, StatusCode> {
    let page = params
        .get("page")
        .and_then(|v| v.parse::<usize>().ok())
        .filter(|v| *v > 0)
        .unwrap_or(1);
    let page_size = params
        .get("page_size")
        .and_then(|v| v.parse::<usize>().ok())
        .filter(|v| *v > 0)
        .unwrap_or(20);
    let offset = (page - 1) * page_size;

    let mut filters: Vec<String> = Vec::new();
    let mut bind_entries: Vec<(String, Value)> = Vec::new();

    if let Some(intent_type) = params.get("intent_type").filter(|v| !v.trim().is_empty()) {
        filters.push("d.intent_type == @intent_type".to_string());
        bind_entries.push(("intent_type".to_string(), serde_json::json!(intent_type)));
    }

    if let Some(cache_hit_raw) = params.get("cache_hit").filter(|v| !v.trim().is_empty()) {
        let cache_hit = cache_hit_raw
            .parse::<bool>()
            .map_err(|_| StatusCode::BAD_REQUEST)?;
        filters.push("d.cache_hit == @cache_hit".to_string());
        bind_entries.push(("cache_hit".to_string(), serde_json::json!(cache_hit)));
    }

    if let Some(search) = params.get("search").filter(|v| !v.trim().is_empty()) {
        filters.push("d.original_query LIKE CONCAT('%', @search, '%')".to_string());
        bind_entries.push(("search".to_string(), serde_json::json!(search)));
    }

    if let Some(start_date) = params.get("start_date").filter(|v| !v.trim().is_empty()) {
        filters.push("d.created_at >= @start_date".to_string());
        bind_entries.push(("start_date".to_string(), serde_json::json!(start_date)));
    }

    if let Some(end_date) = params.get("end_date").filter(|v| !v.trim().is_empty()) {
        filters.push("d.created_at <= @end_date".to_string());
        bind_entries.push(("end_date".to_string(), serde_json::json!(end_date)));
    }

    let filter_clause = if filters.is_empty() {
        String::new()
    } else {
        format!(" FILTER {}", filters.join(" && "))
    };

    let count_query = format!(
        "FOR d IN da_intents{} COLLECT WITH COUNT INTO length RETURN length",
        filter_clause
    );

    let db = get_db();

    // Build HashMap<&str, Value> for count query
    let count_bind: HashMap<&str, Value> = bind_entries
        .iter()
        .map(|(k, v)| (k.as_str(), v.clone()))
        .collect();

    let total_result: Vec<u64> = db
        .aql_bind_vars(&count_query, count_bind)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let total_count = total_result.into_iter().next().unwrap_or(0);

    // Add pagination params for records query
    bind_entries.push(("offset".to_string(), serde_json::json!(offset)));
    bind_entries.push(("page_size".to_string(), serde_json::json!(page_size)));

    let records_query = format!(
        "FOR d IN da_intents{} SORT d.created_at DESC LIMIT @offset, @page_size RETURN d",
        filter_clause
    );

    let records_bind: HashMap<&str, Value> = bind_entries
        .iter()
        .map(|(k, v)| (k.as_str(), v.clone()))
        .collect();

    let records: Vec<Value> = db
        .aql_bind_vars(&records_query, records_bind)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(serde_json::json!({
        "code": 0,
        "data": {
            "records": records,
            "total": total_count,
            "page": page,
            "page_size": page_size
        }
    })))
}

async fn get_intent(Path(intent_id): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let mut intents: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_intents FILTER d.intent_id == @intent_id LIMIT 1 RETURN d",
            [("intent_id", serde_json::json!(intent_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let intent = intents.pop().ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(ApiResponse::success(intent)))
}

async fn delete_intent(Path(intent_id): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let keys: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_intents FILTER d.intent_id == @intent_id LIMIT 1 RETURN d._key",
            [("intent_id", serde_json::json!(intent_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let doc_key = keys.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

    let col = db
        .collection("da_intents")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.remove_document::<Value>(&doc_key, Default::default(), None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success("Intent deleted".to_string())))
}

async fn revectorize_intent(Path(intent_id): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let keys: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_intents FILTER d.intent_id == @intent_id LIMIT 1 RETURN d._key",
            [("intent_id", serde_json::json!(intent_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let doc_key = keys.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

    let col = db
        .collection("da_intents")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.update_document(
        &doc_key,
        serde_json::json!({
            "updated_at": chrono::Utc::now().to_rfc3339()
        }),
        Default::default(),
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success(
        "Intent re-vectorized successfully".to_string(),
    )))
}

async fn mark_intent_template(
    Path(intent_id): Path<String>,
) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let keys: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_intents FILTER d.intent_id == @intent_id LIMIT 1 RETURN d._key",
            [("intent_id", serde_json::json!(intent_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let doc_key = keys.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

    let col = db
        .collection("da_intents")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.update_document(
        &doc_key,
        serde_json::json!({
            "is_template": true,
            "updated_at": chrono::Utc::now().to_rfc3339()
        }),
        Default::default(),
    )
    .await
    .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut updated: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_intents FILTER d._key == @key LIMIT 1 RETURN d",
            [("key", serde_json::json!(doc_key))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let intent = updated.pop().ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(ApiResponse::success(intent)))
}
