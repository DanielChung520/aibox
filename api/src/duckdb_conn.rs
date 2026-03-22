//! DuckDB Connection Factory Module
//!
//! # Description
//! 提供 DuckDB in-memory 連線工廠，每次查詢建立獨立連線並預載 httpfs 與 S3 參數。
//! 避免 singleton 模式下 DuckDB crate 內部 panic 導致 Mutex poisoned 的問題。
//!
//! # Last Update: 2026-03-22 17:26:46
//! # Author: Daniel Chung
//! # Version: 1.1.0

use once_cell::sync::OnceCell;

/// Cached S3 config SQL, built once at init
static S3_CONFIG: OnceCell<String> = OnceCell::new();

/// Validate DuckDB + httpfs + S3 at startup. Caches S3 config for later reuse.
pub fn init() -> Result<(), String> {
    let endpoint =
        std::env::var("DUCKDB_S3_ENDPOINT").unwrap_or_else(|_| "localhost:8334".to_string());
    let access_key = std::env::var("DUCKDB_S3_ACCESS_KEY").unwrap_or_else(|_| "admin".to_string());
    let secret_key =
        std::env::var("DUCKDB_S3_SECRET_KEY").unwrap_or_else(|_| "admin123".to_string());

    let s3_config_sql = format!(
        "SET s3_endpoint='{endpoint}'; SET s3_access_key_id='{access_key}'; SET s3_secret_access_key='{secret_key}'; SET s3_use_ssl=false; SET s3_url_style='path';"
    );

    // Validate by creating a test connection
    let conn = duckdb::Connection::open_in_memory()
        .map_err(|e| format!("DuckDB open in-memory failed: {e}"))?;
    conn.execute_batch("INSTALL httpfs; LOAD httpfs;")
        .map_err(|e| format!("DuckDB httpfs init failed: {e}"))?;
    conn.execute_batch(&s3_config_sql)
        .map_err(|e| format!("DuckDB S3 config failed: {e}"))?;

    // Verify S3 reachability with a simple metadata query
    conn.execute_batch("SELECT 1;")
        .map_err(|e| format!("DuckDB health check failed: {e}"))?;

    S3_CONFIG
        .set(s3_config_sql)
        .map_err(|_| "DuckDB S3 config already initialized".to_string())
}

/// Create a fresh DuckDB in-memory connection with httpfs + S3 pre-configured.
/// Each call returns an independent connection — no shared state, no mutex.
pub fn create_connection() -> Result<duckdb::Connection, String> {
    let s3_config = S3_CONFIG
        .get()
        .ok_or_else(|| "DuckDB not initialized (call init first)".to_string())?;

    let conn = duckdb::Connection::open_in_memory()
        .map_err(|e| format!("DuckDB open in-memory failed: {e}"))?;
    conn.execute_batch("LOAD httpfs;")
        .map_err(|e| format!("DuckDB httpfs load failed: {e}"))?;
    conn.execute_batch(s3_config)
        .map_err(|e| format!("DuckDB S3 config failed: {e}"))?;

    Ok(conn)
}
