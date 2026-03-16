use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct User {
    pub _key: String,
    pub username: String,
    pub password_hash: String,
    pub name: String,
    pub role_key: String,
    pub status: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Role {
    pub _key: Option<String>,
    pub name: String,
    pub description: String,
    pub created_at: String,
    pub updated_at: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemParam {
    pub _key: Option<String>,
    pub param_key: String,
    pub param_value: serde_json::Value,
    pub param_type: String,
    pub require_restart: bool,
    pub category: String,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginRequest {
    pub username: String,
    pub password: String,
    pub remember: Option<bool>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct LoginResponse {
    pub token: String,
    pub user: UserInfo,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UserInfo {
    pub _key: String,
    pub username: String,
    pub name: String,
    pub role_key: String,
    pub role_name: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub code: i32,
    pub message: String,
    pub data: Option<T>,
}

impl<T> ApiResponse<T> {
    pub fn success(data: T) -> Self {
        Self {
            code: 200,
            message: "success".to_string(),
            data: Some(data),
        }
    }

    pub fn error(code: i32, message: String) -> Self {
        Self {
            code,
            message,
            data: None,
        }
    }
}
