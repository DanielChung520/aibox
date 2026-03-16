mod api;
mod auth;
mod db;
mod models;

use api::create_router;
use std::net::SocketAddr;

#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

async fn start_api_server() {
    let app = create_router();

    let addr = SocketAddr::from(([127, 0, 0, 1], 3001));
    println!("API server running on http://{}", addr);

    let listener = tokio::net::TcpListener::bind(addr).await.unwrap();
    axum::serve(listener, app).await.unwrap();
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    // Initialize in-memory store
    db::init();
    println!("Data store initialized");

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .setup(|_app| {
            tauri::async_runtime::spawn(async move {
                start_api_server().await;
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![greet])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
