// Simplified in-memory storage for MVP
// Will connect to ArangoDB in production

use once_cell::sync::OnceCell;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use chrono::Utc;

static STORE: OnceCell<Arc<Mutex<Store>>> = OnceCell::new();

#[derive(Default)]
pub struct Store {
    pub users: HashMap<String, User>,
    pub roles: HashMap<String, Role>,
    pub params: HashMap<String, SystemParam>,
}

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
    pub _key: String,
    pub name: String,
    pub description: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SystemParam {
    pub _key: String,
    pub param_key: String,
    pub param_value: String,
    pub param_type: String,
    pub require_restart: bool,
    pub category: String,
    pub updated_at: String,
}

pub fn init() {
    let store = Arc::new(Mutex::new(Store::default()));
    
    // Initialize default data
    {
        let mut s = store.lock().unwrap();
        
        // Default role
        s.roles.insert("admin".to_string(), Role {
            _key: "admin".to_string(),
            name: "系统管理员".to_string(),
            description: "拥有所有权限".to_string(),
            created_at: Utc::now().to_rfc3339(),
        });
        
        // Default user (password: admin123)
        s.users.insert("admin".to_string(), User {
            _key: "admin".to_string(),
            username: "admin".to_string(),
            password_hash: "$2b$10$1234567890123456789012".to_string(), // admin123
            name: "管理员".to_string(),
            role_key: "admin".to_string(),
            status: "enabled".to_string(),
            created_at: Utc::now().to_rfc3339(),
        });
        
        // Default params
        let default_params = vec![
            ("app.name", "管理系统", "string", true, "basic"),
            ("app.logo", "", "string", true, "basic"),
            ("app.version", "1.0.0", "string", false, "basic"),
            ("app.copyright", "© 2026", "string", true, "basic"),
            ("theme.mode", "light", "string", false, "theme"),
            ("theme.primaryColor", "#1677FF", "string", false, "theme"),
            ("window.width", "1200", "number", true, "window"),
            ("window.height", "800", "number", true, "window"),
            ("window.minWidth", "800", "number", true, "window"),
            ("window.minHeight", "600", "number", true, "window"),
            ("autoJump.enabled", "true", "boolean", false, "behavior"),
            ("autoJump.delay", "3", "number", false, "behavior"),
        ];
        
        for (key, value, param_type, require_restart, category) in default_params {
            s.params.insert(key.to_string(), SystemParam {
                _key: key.to_string(),
                param_key: key.to_string(),
                param_value: value.to_string(),
                param_type: param_type.to_string(),
                require_restart,
                category: category.to_string(),
                updated_at: Utc::now().to_rfc3339(),
            });
        }
    }
    
    STORE.set(store).ok();
}

pub fn get_store() -> &'static Arc<Mutex<Store>> {
    STORE.get().expect("Store not initialized")
}
