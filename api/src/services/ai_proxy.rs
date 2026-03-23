//! AI Proxy Service
//!
//! # Description
//! AI 服務代理，負責轉發請求到 Python AI 服務
//!
//! # Last Update: 2026-03-23 18:55:00
//! # Author: Daniel Chung
//! # Version: 1.1.0

use crate::error::ApiError;
use reqwest::Client;
use serde::{Deserialize, Serialize};

pub struct AiProxy {
    client: Client,
    aitask_url: String,
    data_agent_url: String,
    knowledge_agent_url: String,
    mcp_tools_url: String,
    bpa_mm_agent_url: String,
}

impl AiProxy {
    pub fn new() -> Self {
        Self {
            client: Client::new(),
            aitask_url: std::env::var("AITASK_URL")
                .unwrap_or_else(|_| "http://localhost:8001".to_string()),
            data_agent_url: std::env::var("DATA_AGENT_URL")
                .unwrap_or_else(|_| "http://localhost:8003".to_string()),
            knowledge_agent_url: std::env::var("KNOWLEDGE_AGENT_URL")
                .unwrap_or_else(|_| "http://localhost:8007".to_string()),
            mcp_tools_url: std::env::var("MCP_TOOLS_URL")
                .unwrap_or_else(|_| "http://localhost:8004".to_string()),
            bpa_mm_agent_url: std::env::var("BPA_MM_AGENT_URL")
                .unwrap_or_else(|_| "http://localhost:8005".to_string()),
        }
    }

    pub async fn forward_chat(&self, message: &str) -> Result<String, ApiError> {
        let response = self.client
            .post(format!("{}/chat", self.aitask_url))
            .json(&serde_json::json!({ "message": message }))
            .send()
            .await
            .map_err(|e| ApiError::bad_gateway(&e.to_string()))?;

        if !response.status().is_success() {
            return Err(ApiError::bad_gateway("AITask service error"));
        }

        let body: serde_json::Value = response.json().await
            .map_err(|e| ApiError::internal_error(&e.to_string()))?;

        Ok(body.get("message")
            .and_then(|m| m.as_str())
            .unwrap_or("No response")
            .to_string())
    }

    pub async fn forward_query(&self, query: &str) -> Result<serde_json::Value, ApiError> {
        let response = self.client
            .post(format!("{}/query", self.data_agent_url))
            .json(&serde_json::json!({ "natural_language": query }))
            .send()
            .await
            .map_err(|e| ApiError::bad_gateway(&e.to_string()))?;

        if !response.status().is_success() {
            return Err(ApiError::bad_gateway("DataAgent service error"));
        }

        response.json().await
            .map_err(|e| ApiError::internal_error(&e.to_string()))
    }

    pub async fn forward_knowledge(&self, query: &str) -> Result<serde_json::Value, ApiError> {
        let response = self.client
            .post(format!("{}/search", self.knowledge_agent_url))
            .json(&serde_json::json!({ "query": query }))
            .send()
            .await
            .map_err(|e| ApiError::bad_gateway(&e.to_string()))?;

        if !response.status().is_success() {
            return Err(ApiError::bad_gateway("KnowledgeAgent service error"));
        }

        response.json().await
            .map_err(|e| ApiError::internal_error(&e.to_string()))
    }

    pub async fn forward_mcp(&self, tool: &str, params: serde_json::Value) -> Result<serde_json::Value, ApiError> {
        let response = self.client
            .post(format!("{}/execute", self.mcp_tools_url))
            .json(&serde_json::json!({
                "tool": tool,
                "params": params
            }))
            .send()
            .await
            .map_err(|e| ApiError::bad_gateway(&e.to_string()))?;

        if !response.status().is_success() {
            return Err(ApiError::bad_gateway("MCPTools service error"));
        }

        response.json().await
            .map_err(|e| ApiError::internal_error(&e.to_string()))
    }

    pub async fn forward_bpa(&self, workflow: &str, params: serde_json::Value) -> Result<serde_json::Value, ApiError> {
        let response = self.client
            .post(format!("{}/start", self.bpa_mm_agent_url))
            .json(&serde_json::json!({
                "workflow": workflow,
                "params": params
            }))
            .send()
            .await
            .map_err(|e| ApiError::bad_gateway(&e.to_string()))?;

        if !response.status().is_success() {
            return Err(ApiError::bad_gateway("BPA service error"));
        }

        response.json().await
            .map_err(|e| ApiError::internal_error(&e.to_string()))
    }
}

impl Default for AiProxy {
    fn default() -> Self {
        Self::new()
    }
}
