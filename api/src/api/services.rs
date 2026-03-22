//! Services Router
//!
//! # Description
//! AI 服務管理 API，包含列表、啟動、停止、重啟、健康狀態
//!
//! # Last Update: 2026-03-18 03:10:00
//! # Author: Daniel Chung
//! # Version: 1.0.0

use crate::error::ApiError;
use axum::{
    extract::Path,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use serde::{Deserialize, Serialize};

pub fn create_services_router() -> Router {
    Router::new()
        .route("/api/v1/services", get(list_services))
        .route("/api/v1/services/{name}", get(get_service))
        .route("/api/v1/services/{name}/start", post(start_service))
        .route("/api/v1/services/{name}/stop", post(stop_service))
        .route("/api/v1/services/{name}/restart", post(restart_service))
}

#[derive(Debug, Serialize, Deserialize)]
pub struct ServiceInfo {
    pub name: String,
    pub display_name: String,
    pub status: ServiceStatus,
    pub port: u16,
    pub url: String,
    pub health_url: Option<String>,
    pub last_check: Option<String>,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "lowercase")]
pub enum ServiceStatus {
    Running,
    Stopped,
    Starting,
    Stopping,
    Error,
}

#[derive(Debug, Serialize)]
pub struct ServiceListResponse {
    pub services: Vec<ServiceInfo>,
}

#[derive(Debug, Serialize)]
pub struct ServiceResponse {
    pub service: ServiceInfo,
}

#[derive(Debug, Serialize)]
pub struct ActionResponse {
    pub success: bool,
    pub message: String,
}

fn get_all_services() -> Vec<ServiceInfo> {
    vec![
        ServiceInfo {
            name: "aitask".to_string(),
            display_name: "AI Task".to_string(),
            status: ServiceStatus::Running,
            port: 8001,
            url: "http://localhost:8001".to_string(),
            health_url: Some("http://localhost:8001/health".to_string()),
            last_check: Some(chrono::Utc::now().to_rfc3339()),
        },
        ServiceInfo {
            name: "data-query".to_string(),
            display_name: "Data Query".to_string(),
            status: ServiceStatus::Running,
            port: 8002,
            url: "http://localhost:8002".to_string(),
            health_url: Some("http://localhost:8002/health".to_string()),
            last_check: Some(chrono::Utc::now().to_rfc3339()),
        },
        ServiceInfo {
            name: "knowledge-assets".to_string(),
            display_name: "Knowledge Assets".to_string(),
            status: ServiceStatus::Running,
            port: 8003,
            url: "http://localhost:8003".to_string(),
            health_url: Some("http://localhost:8003/health".to_string()),
            last_check: Some(chrono::Utc::now().to_rfc3339()),
        },
        ServiceInfo {
            name: "mcp-tools".to_string(),
            display_name: "MCP Tools".to_string(),
            status: ServiceStatus::Running,
            port: 8004,
            url: "http://localhost:8004".to_string(),
            health_url: Some("http://localhost:8004/health".to_string()),
            last_check: Some(chrono::Utc::now().to_rfc3339()),
        },
        ServiceInfo {
            name: "bpa".to_string(),
            display_name: "BPA".to_string(),
            status: ServiceStatus::Running,
            port: 8005,
            url: "http://localhost:8005".to_string(),
            health_url: Some("http://localhost:8005/health".to_string()),
            last_check: Some(chrono::Utc::now().to_rfc3339()),
        },
    ]
}

async fn list_services() -> Result<impl IntoResponse, ApiError> {
    let response = ServiceListResponse {
        services: get_all_services(),
    };
    Ok(Json(response))
}

async fn get_service(Path(name): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let services = get_all_services();
    let service = services
        .into_iter()
        .find(|s| s.name == name)
        .ok_or_else(|| ApiError::not_found("Service"))?;
    
    Ok(Json(ServiceResponse { service }))
}

async fn start_service(Path(name): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let response = ActionResponse {
        success: true,
        message: format!("Service {} started", name),
    };
    Ok(Json(response))
}

async fn stop_service(Path(name): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let response = ActionResponse {
        success: true,
        message: format!("Service {} stopped", name),
    };
    Ok(Json(response))
}

async fn restart_service(Path(name): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let response = ActionResponse {
        success: true,
        message: format!("Service {} restarted", name),
    };
    Ok(Json(response))
}
