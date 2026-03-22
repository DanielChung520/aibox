//! Data Agent Schema API Routes
//!
//! # Description
//! DA 的 Schema CRUD endpoints (tables, fields, relations)
//!
//! # Last Update: 2026-03-22 16:30:34
//! # Author: Daniel Chung
//! # Version: 1.0.0

use crate::db::get_db;
use crate::models::ApiResponse;
use axum::{
    extract::Path,
    http::StatusCode,
    response::IntoResponse,
    routing::{get, put},
    Json, Router,
};
use serde_json::Value;

pub fn create_da_router() -> Router {
    Router::new()
        .route(
            "/api/v1/da/schema/tables",
            get(list_tables).post(create_table),
        )
        .route(
            "/api/v1/da/schema/tables/{table_id}",
            get(get_table).put(update_table).delete(delete_table),
        )
        .route(
            "/api/v1/da/schema/tables/{table_id}/fields",
            get(list_fields).post(create_field),
        )
        .route(
            "/api/v1/da/schema/tables/{table_id}/fields/{field_id}",
            put(update_field).delete(delete_field),
        )
        .route(
            "/api/v1/da/schema/relations",
            get(list_relations).post(create_relation),
        )
        .route(
            "/api/v1/da/schema/relations/{relation_id}",
            put(update_relation).delete(delete_relation),
        )
}

async fn list_tables() -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let tables: Vec<Value> = db
        .aql_str("FOR d IN da_table_info RETURN d")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success(tables)))
}

async fn get_table(Path(table_id): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let mut tables: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_table_info FILTER d.table_id == @table_id LIMIT 1 RETURN d",
            [("table_id", serde_json::json!(table_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let table = tables.pop().ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(ApiResponse::success(table)))
}

async fn create_table(Json(payload): Json<Value>) -> Result<impl IntoResponse, StatusCode> {
    let table_id = payload
        .get("table_id")
        .and_then(|v| v.as_str())
        .ok_or(StatusCode::BAD_REQUEST)?;

    let db = get_db();
    let existing: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_table_info FILTER d.table_id == @table_id LIMIT 1 RETURN d._key",
            [("table_id", serde_json::json!(table_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    if !existing.is_empty() {
        return Err(StatusCode::CONFLICT);
    }

    let col = db
        .collection("da_table_info")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.create_document(payload.clone(), Default::default())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut created: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_table_info FILTER d.table_id == @table_id LIMIT 1 RETURN d",
            [("table_id", serde_json::json!(table_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let table = created.pop().ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;
    Ok(Json(ApiResponse::success(table)))
}

async fn update_table(
    Path(table_id): Path<String>,
    Json(payload): Json<Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let keys: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_table_info FILTER d.table_id == @table_id LIMIT 1 RETURN d._key",
            [("table_id", serde_json::json!(table_id.clone()))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let doc_key = keys.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

    let col = db
        .collection("da_table_info")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.update_document(&doc_key, payload, Default::default())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut updated: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_table_info FILTER d._key == @key LIMIT 1 RETURN d",
            [("key", serde_json::json!(doc_key))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let table = updated.pop().ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(ApiResponse::success(table)))
}

async fn delete_table(Path(table_id): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let keys: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_table_info FILTER d.table_id == @table_id LIMIT 1 RETURN d._key",
            [("table_id", serde_json::json!(table_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let doc_key = keys.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

    let col = db
        .collection("da_table_info")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.remove_document::<Value>(&doc_key, Default::default(), None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success("Table deleted".to_string())))
}

async fn list_fields(Path(table_id): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let fields: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_field_info FILTER d.table_id == @table_id RETURN d",
            [("table_id", serde_json::json!(table_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success(fields)))
}

async fn create_field(
    Path(table_id): Path<String>,
    Json(payload): Json<Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let field_id = payload
        .get("field_id")
        .and_then(|v| v.as_str())
        .map(str::to_string)
        .ok_or(StatusCode::BAD_REQUEST)?;

    let mut doc = payload;
    let obj = doc.as_object_mut().ok_or(StatusCode::BAD_REQUEST)?;
    obj.insert("table_id".to_string(), serde_json::json!(table_id.clone()));

    let db = get_db();
    let existing: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_field_info FILTER d.table_id == @table_id && d.field_id == @field_id LIMIT 1 RETURN d._key",
            [
                ("table_id", serde_json::json!(table_id.clone())),
                ("field_id", serde_json::json!(field_id.clone())),
            ]
            .into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if !existing.is_empty() {
        return Err(StatusCode::CONFLICT);
    }

    let col = db
        .collection("da_field_info")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.create_document(doc, Default::default())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut created: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_field_info FILTER d.table_id == @table_id && d.field_id == @field_id LIMIT 1 RETURN d",
            [
                ("table_id", serde_json::json!(table_id)),
                ("field_id", serde_json::json!(field_id)),
            ]
            .into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let field = created.pop().ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success(field)))
}

async fn update_field(
    Path((table_id, field_id)): Path<(String, String)>,
    Json(payload): Json<Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let keys: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_field_info FILTER d.table_id == @table_id && d.field_id == @field_id LIMIT 1 RETURN d._key",
            [
                ("table_id", serde_json::json!(table_id.clone())),
                ("field_id", serde_json::json!(field_id.clone())),
            ]
            .into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let doc_key = keys.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

    let col = db
        .collection("da_field_info")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.update_document(&doc_key, payload, Default::default())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut updated: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_field_info FILTER d._key == @key LIMIT 1 RETURN d",
            [("key", serde_json::json!(doc_key))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let field = updated.pop().ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(ApiResponse::success(field)))
}

async fn delete_field(
    Path((table_id, field_id)): Path<(String, String)>,
) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let keys: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_field_info FILTER d.table_id == @table_id && d.field_id == @field_id LIMIT 1 RETURN d._key",
            [
                ("table_id", serde_json::json!(table_id)),
                ("field_id", serde_json::json!(field_id)),
            ]
            .into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let doc_key = keys.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

    let col = db
        .collection("da_field_info")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.remove_document::<Value>(&doc_key, Default::default(), None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success("Field deleted".to_string())))
}

async fn list_relations() -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let relations: Vec<Value> = db
        .aql_str("FOR d IN da_table_relation RETURN d")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success(relations)))
}

async fn create_relation(Json(payload): Json<Value>) -> Result<impl IntoResponse, StatusCode> {
    let relation_id = payload
        .get("relation_id")
        .and_then(|v| v.as_str())
        .ok_or(StatusCode::BAD_REQUEST)?;

    let db = get_db();
    let existing: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_table_relation FILTER d.relation_id == @relation_id LIMIT 1 RETURN d._key",
            [("relation_id", serde_json::json!(relation_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    if !existing.is_empty() {
        return Err(StatusCode::CONFLICT);
    }

    let col = db
        .collection("da_table_relation")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.create_document(payload.clone(), Default::default())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut created: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_table_relation FILTER d.relation_id == @relation_id LIMIT 1 RETURN d",
            [("relation_id", serde_json::json!(relation_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let relation = created.pop().ok_or(StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success(relation)))
}

async fn update_relation(
    Path(relation_id): Path<String>,
    Json(payload): Json<Value>,
) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let keys: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_table_relation FILTER d.relation_id == @relation_id LIMIT 1 RETURN d._key",
            [("relation_id", serde_json::json!(relation_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let doc_key = keys.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

    let col = db
        .collection("da_table_relation")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.update_document(&doc_key, payload, Default::default())
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let mut updated: Vec<Value> = db
        .aql_bind_vars(
            "FOR d IN da_table_relation FILTER d._key == @key LIMIT 1 RETURN d",
            [("key", serde_json::json!(doc_key))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let relation = updated.pop().ok_or(StatusCode::NOT_FOUND)?;

    Ok(Json(ApiResponse::success(relation)))
}

async fn delete_relation(Path(relation_id): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let db = get_db();
    let keys: Vec<String> = db
        .aql_bind_vars(
            "FOR d IN da_table_relation FILTER d.relation_id == @relation_id LIMIT 1 RETURN d._key",
            [("relation_id", serde_json::json!(relation_id))].into(),
        )
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    let doc_key = keys.into_iter().next().ok_or(StatusCode::NOT_FOUND)?;

    let col = db
        .collection("da_table_relation")
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    col.remove_document::<Value>(&doc_key, Default::default(), None)
        .await
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success("Relation deleted".to_string())))
}
