//! Knowledge Base API
//!
//! # Last Update: 2026-03-25 11:47:06
//! # Author: Daniel Chung
//! # Version: 1.0.0

use crate::db::{
    get_db,
    knowledge::{KnowledgeFile, KnowledgeRoot},
};
use axum::{
    extract::{Path, Query},
    http::StatusCode,
    response::IntoResponse,
    Json,
};
use serde_json::json;
use std::collections::HashMap;

pub async fn list_roots(
    Query(params): Query<HashMap<String, String>>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();

    let (query, bind_vars) = if let Some(search) = params.get("search").filter(|s| !s.is_empty()) {
        let lower = search.to_lowercase();
        (
            "FOR r IN knowledge_roots FILTER CONTAINS(LOWER(r.name), @search) || CONTAINS(LOWER(r.description), @search) SORT r.created_at DESC RETURN r".to_string(),
            [("search", json!(lower))].into(),
        )
    } else {
        (
            "FOR r IN knowledge_roots SORT r.created_at DESC RETURN r".to_string(),
            HashMap::new().into(),
        )
    };

    let roots: Vec<KnowledgeRoot> = db
        .aql_bind_vars(&query, bind_vars)
        .await
        .map_err(|_| err_500())?;

    Ok(Json(json!({ "code": 200, "data": roots })))
}

pub async fn get_root(
    Path(key): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();
    let mut roots: Vec<KnowledgeRoot> = db
        .aql_bind_vars(
            "FOR r IN knowledge_roots FILTER r._key == @key LIMIT 1 RETURN r",
            [("key", json!(key))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    let root = roots.pop().ok_or_else(|| err_404("knowledge root"))?;
    Ok(Json(json!({ "code": 200, "data": root })))
}

pub async fn create_root(
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();
    let col = db.collection("knowledge_roots").await.map_err(|_| err_500())?;

    let now = chrono::Utc::now().to_rfc3339();
    let key = format!("kb_{}", chrono::Utc::now().timestamp_millis());

    let root = KnowledgeRoot {
        _key: Some(key.clone()),
        name: payload.get("name").and_then(|v| v.as_str()).unwrap_or("未命名知識庫").to_string(),
        description: payload.get("description").and_then(|v| v.as_str()).map(String::from),
        ontology_domain: payload.get("ontology_domain").and_then(|v| v.as_str()).unwrap_or("Unknown").to_string(),
        ontology_majors: payload
            .get("ontology_majors")
            .and_then(|v| v.as_array())
            .map(|arr| arr.iter().filter_map(|v| v.as_str().map(String::from)).collect())
            .unwrap_or_default(),
        source_count: 0,
        vector_status: "pending".into(),
        graph_status: "pending".into(),
        is_favorite: false,
        created_at: now.clone(),
        updated_at: now,
    };

    col.create_document(root, Default::default())
        .await
        .map_err(|_| err_500())?;

    Ok((
        StatusCode::CREATED,
        Json(json!({ "code": 201, "data": { "_key": key } })),
    ))
}

pub async fn update_root(
    Path(key): Path<String>,
    Json(payload): Json<serde_json::Value>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();

    let existing: Vec<KnowledgeRoot> = db
        .aql_bind_vars(
            "FOR r IN knowledge_roots FILTER r._key == @key LIMIT 1 RETURN r",
            [("key", json!(key.clone()))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    if existing.is_empty() {
        return Err(err_404("knowledge root"));
    }

    let mut data = payload;
    if let Some(obj) = data.as_object_mut() {
        obj.remove("_key");
        obj.remove("_id");
        obj.remove("created_at");
        obj.insert("updated_at".to_string(), json!(chrono::Utc::now().to_rfc3339()));
    }

    let _: Vec<KnowledgeRoot> = db
        .aql_bind_vars(
            "FOR r IN knowledge_roots FILTER r._key == @key UPDATE r WITH @data IN knowledge_roots RETURN NEW",
            [("key", json!(key)), ("data", data)].into(),
        )
        .await
        .map_err(|_| err_500())?;

    Ok(Json(json!({ "code": 200, "message": "updated" })))
}

pub async fn delete_root(
    Path(key): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();

    let existing: Vec<KnowledgeRoot> = db
        .aql_bind_vars(
            "FOR r IN knowledge_roots FILTER r._key == @key LIMIT 1 RETURN r",
            [("key", json!(key.clone()))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    if existing.is_empty() {
        return Err(err_404("knowledge root"));
    }

    let _: Vec<serde_json::Value> = db
        .aql_bind_vars(
            "FOR f IN knowledge_files FILTER f.knowledge_root_id == @key REMOVE f IN knowledge_files",
            [("key", json!(key.clone()))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    let _: Vec<serde_json::Value> = db
        .aql_bind_vars(
            "REMOVE @key IN knowledge_roots",
            [("key", json!(key))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    Ok(Json(json!({ "code": 200, "message": "deleted" })))
}

pub async fn copy_root(
    Path(key): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();

    let mut roots: Vec<KnowledgeRoot> = db
        .aql_bind_vars(
            "FOR r IN knowledge_roots FILTER r._key == @key LIMIT 1 RETURN r",
            [("key", json!(key.clone()))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    let source = roots.pop().ok_or_else(|| err_404("knowledge root"))?;
    let now = chrono::Utc::now().to_rfc3339();
    let new_key = format!("kb_copy_{}", chrono::Utc::now().timestamp_millis());

    let copy = KnowledgeRoot {
        _key: Some(new_key.clone()),
        name: format!("{} - 副本", source.name),
        description: source.description,
        ontology_domain: source.ontology_domain,
        ontology_majors: source.ontology_majors,
        source_count: 0,
        vector_status: "pending".into(),
        graph_status: "pending".into(),
        is_favorite: false,
        created_at: now.clone(),
        updated_at: now,
    };

    let col = db.collection("knowledge_roots").await.map_err(|_| err_500())?;
    col.create_document(copy, Default::default())
        .await
        .map_err(|_| err_500())?;

    Ok((
        StatusCode::CREATED,
        Json(json!({ "code": 201, "data": { "_key": new_key } })),
    ))
}

pub async fn toggle_favorite(
    Path(key): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();

    let mut roots: Vec<KnowledgeRoot> = db
        .aql_bind_vars(
            "FOR r IN knowledge_roots FILTER r._key == @key LIMIT 1 RETURN r",
            [("key", json!(key.clone()))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    let root = roots.pop().ok_or_else(|| err_404("knowledge root"))?;
    let new_fav = !root.is_favorite;

    let col = db.collection("knowledge_roots").await.map_err(|_| err_500())?;
    col.update_document(
        &key,
        json!({
            "is_favorite": new_fav,
            "updated_at": chrono::Utc::now().to_rfc3339()
        }),
        Default::default(),
    )
    .await
    .map_err(|_| err_500())?;

    Ok(Json(json!({ "code": 200, "data": { "is_favorite": new_fav } })))
}

pub async fn list_files(
    Path(root_id): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();

    let files: Vec<KnowledgeFile> = db
        .aql_bind_vars(
            "FOR f IN knowledge_files FILTER f.knowledge_root_id == @root_id SORT f.upload_time DESC RETURN f",
            [("root_id", json!(root_id))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    Ok(Json(json!({ "code": 200, "data": files })))
}

pub async fn get_file(
    Path(file_key): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();

    let mut files: Vec<KnowledgeFile> = db
        .aql_bind_vars(
            "FOR f IN knowledge_files FILTER f._key == @key LIMIT 1 RETURN f",
            [("key", json!(file_key))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    let file = files.pop().ok_or_else(|| err_404("knowledge file"))?;
    Ok(Json(json!({ "code": 200, "data": file })))
}

pub async fn delete_file(
    Path(file_key): Path<String>,
) -> Result<impl IntoResponse, (StatusCode, Json<serde_json::Value>)> {
    let db = get_db();

    let files: Vec<KnowledgeFile> = db
        .aql_bind_vars(
            "FOR f IN knowledge_files FILTER f._key == @key LIMIT 1 RETURN f",
            [("key", json!(file_key.clone()))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    if files.is_empty() {
        return Err(err_404("knowledge file"));
    }

    let root_id = files[0].knowledge_root_id.clone();

    let _: Vec<serde_json::Value> = db
        .aql_bind_vars(
            "REMOVE @key IN knowledge_files",
            [("key", json!(file_key))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    let _: Vec<serde_json::Value> = db
        .aql_bind_vars(
            "FOR r IN knowledge_roots FILTER r._key == @key UPDATE r WITH { source_count: MAX(0, r.source_count - 1), updated_at: @now } IN knowledge_roots",
            [("key", json!(root_id)), ("now", json!(chrono::Utc::now().to_rfc3339()))].into(),
        )
        .await
        .map_err(|_| err_500())?;

    Ok(Json(json!({ "code": 200, "message": "deleted" })))
}

fn err_500() -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::INTERNAL_SERVER_ERROR,
        Json(json!({ "code": 500, "message": "internal server error" })),
    )
}

fn err_404(resource: &str) -> (StatusCode, Json<serde_json::Value>) {
    (
        StatusCode::NOT_FOUND,
        Json(json!({ "code": 404, "message": format!("{} not found", resource) })),
    )
}
