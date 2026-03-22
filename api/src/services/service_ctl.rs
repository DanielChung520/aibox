//! Service Control
//!
//! # Description
//! 服務控制，負責啟動、停止、重啟 AI 服務
//!
//! # Last Update: 2026-03-18 03:35:00
//! # Author: Daniel Chung
//! # Version: 1.0.0

use crate::error::ApiError;
use std::process::Command;

pub struct ServiceController {
    service_dir: String,
}

impl ServiceController {
    pub fn new(service_dir: &str) -> Self {
        Self {
            service_dir: service_dir.to_string(),
        }
    }

    pub fn start(&self, service_name: &str) -> Result<String, ApiError> {
        let script = format!("{}/start_{}.sh", self.service_dir, service_name);
        
        let output = Command::new("bash")
            .arg(&script)
            .output()
            .map_err(|e| ApiError::internal_error(&format!("Failed to start service: {}", e)))?;

        if output.status.success() {
            Ok(format!("Service {} started successfully", service_name))
        } else {
            let error = String::from_utf8_lossy(&output.stderr);
            Err(ApiError::internal_error(&format!("Failed to start: {}", error)))
        }
    }

    pub fn stop(&self, service_name: &str) -> Result<String, ApiError> {
        let script = format!("{}/stop_{}.sh", self.service_dir, service_name);
        
        let output = Command::new("bash")
            .arg(&script)
            .output()
            .map_err(|e| ApiError::internal_error(&format!("Failed to stop service: {}", e)))?;

        if output.status.success() {
            Ok(format!("Service {} stopped successfully", service_name))
        } else {
            let error = String::from_utf8_lossy(&output.stderr);
            Err(ApiError::internal_error(&format!("Failed to stop: {}", error)))
        }
    }

    pub fn restart(&self, service_name: &str) -> Result<String, ApiError> {
        self.stop(service_name)?;
        self.start(service_name)?;
        Ok(format!("Service {} restarted successfully", service_name))
    }

    pub fn status(&self, service_name: &str) -> Result<ServiceStatus, ApiError> {
        let port = match service_name {
            "aitask" => 8001,
            "data-query" => 8002,
            "knowledge-assets" => 8003,
            "mcp-tools" => 8004,
            "bpa" => 8005,
            _ => return Err(ApiError::not_found("Service")),
        };

        let output = Command::new("lsof")
            .args(["-i", &format!(":{}", port)])
            .output()
            .map_err(|e| ApiError::internal_error(&e.to_string()))?;

        if output.status.success() && !output.stdout.is_empty() {
            Ok(ServiceStatus::Running)
        } else {
            Ok(ServiceStatus::Stopped)
        }
    }
}

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "lowercase")]
pub enum ServiceStatus {
    Running,
    Stopped,
    Error,
}
