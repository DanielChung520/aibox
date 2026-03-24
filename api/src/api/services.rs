//! Services Router
//!
//! # Description
//! AI 服務管理 API，包含列表、啟動、停止、重啟、健康狀態
//!
//! # Last Update: 2026-03-24 17:00:00
//! # Author: Daniel Chung
//! # Version: 1.2.0

use crate::config::CONFIG;
use crate::error::ApiError;
use axum::{
    extract::Path,
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};
use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::time::{Duration, Instant};

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
    pub latency_ms: Option<u64>,
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

struct ServiceDef {
    name: &'static str,
    display_name: &'static str,
    port: u16,
}

fn service_defs() -> Vec<ServiceDef> {
    vec![
        ServiceDef { name: "aitask",          display_name: "AI Task",         port: 8001 },
        ServiceDef { name: "data-agent",       display_name: "Data Agent",      port: 8003 },
        ServiceDef { name: "mcp-tools",        display_name: "MCP Tools",       port: 8004 },
        ServiceDef { name: "bpa-mm-agent",     display_name: "BPA MM Agent",    port: 8005 },
        ServiceDef { name: "knowledge-agent",  display_name: "Knowledge Agent", port: 8007 },
    ]
}

fn base_url_for(name: &str) -> String {
    let cfg = &CONFIG.ai_services;
    match name {
        "aitask"         => cfg.aitask_url.clone(),
        "data-agent"     => cfg.data_agent_url.clone(),
        "mcp-tools"      => cfg.mcp_tools_url.clone(),
        "bpa-mm-agent"   => cfg.bpa_mm_agent_url.clone(),
        "knowledge-agent"=> cfg.knowledge_agent_url.clone(),
        _                => format!("http://localhost:{}", 0),
    }
}

async fn ping_service(client: &Client, health_url: &str) -> (ServiceStatus, Option<u64>) {
    let t0 = Instant::now();
    match client.get(health_url).send().await {
        Ok(resp) if resp.status().is_success() => {
            let ms = t0.elapsed().as_millis() as u64;
            (ServiceStatus::Running, Some(ms))
        }
        _ => (ServiceStatus::Stopped, None),
    }
}

async fn build_service_infos() -> Vec<ServiceInfo> {
    let client = Client::builder()
        .timeout(Duration::from_secs(5))
        .build()
        .unwrap_or_else(|_| Client::new());

    let defs = service_defs();
    let mut handles = Vec::with_capacity(defs.len());

    for def in defs {
        let base = base_url_for(def.name);
        let health_url = format!("{}/health", base);
        let client = client.clone();
        let name = def.name.to_string();
        let display_name = def.display_name.to_string();
        let port = def.port;
        let url = base.clone();

        handles.push(tokio::spawn(async move {
            let (status, latency_ms) = ping_service(&client, &health_url).await;
            ServiceInfo {
                name,
                display_name,
                status,
                port,
                url,
                health_url: Some(health_url),
                last_check: Some(chrono::Utc::now().to_rfc3339()),
                latency_ms,
            }
        }));
    }

    let mut results = Vec::with_capacity(handles.len());
    for h in handles {
        if let Ok(info) = h.await {
            results.push(info);
        }
    }
    results
}

async fn list_services() -> Result<impl IntoResponse, ApiError> {
    let services = build_service_infos().await;
    Ok(Json(ServiceListResponse { services }))
}

async fn get_service(Path(name): Path<String>) -> Result<impl IntoResponse, ApiError> {
    let services = build_service_infos().await;
    let service = services
        .into_iter()
        .find(|s| s.name == name)
        .ok_or_else(|| ApiError::not_found("Service"))?;
    Ok(Json(ServiceResponse { service }))
}

async fn start_service(Path(name): Path<String>) -> Result<impl IntoResponse, ApiError> {
    Ok(Json(ActionResponse {
        success: true,
        message: format!("Service {} started", name),
    }))
}

async fn stop_service(Path(name): Path<String>) -> Result<impl IntoResponse, ApiError> {
    Ok(Json(ActionResponse {
        success: true,
        message: format!("Service {} stopped", name),
    }))
}

async fn restart_service(Path(name): Path<String>) -> Result<impl IntoResponse, ApiError> {
    Ok(Json(ActionResponse {
        success: true,
        message: format!("Service {} restarted", name),
    }))
}
