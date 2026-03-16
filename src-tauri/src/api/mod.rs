use crate::auth::verify_jwt;
use crate::db::{get_store, Role, SystemParam, User};
use crate::models::*;
use axum::{
    extract::Path,
    http::{header::AUTHORIZATION, HeaderMap, StatusCode},
    response::IntoResponse,
    routing::{get, post},
    Json, Router,
};

pub fn create_router() -> Router {
    Router::new()
        .route("/api/v1/auth/login", post(login))
        .route("/api/v1/auth/logout", post(logout))
        .route("/api/v1/auth/me", get(me))
        .route("/api/v1/users", get(list_users).post(create_user))
        .route("/api/v1/users/:key", get(get_user).post(update_user).delete(delete_user))
        .route("/api/v1/users/:key/reset-password", post(reset_password))
        .route("/api/v1/roles", get(list_roles).post(create_role))
        .route("/api/v1/roles/:key", get(get_role).post(update_role).delete(delete_role))
        .route("/api/v1/system-params", get(list_params))
        .route("/api/v1/system-params/:key", get(get_param).post(update_param))
}

async fn login(Json(payload): Json<LoginRequest>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let users = store.lock().unwrap().users.clone();
    
    let user = users.get(&payload.username).ok_or(StatusCode::UNAUTHORIZED)?;

    if !bcrypt::verify(&payload.password, &user.password_hash).unwrap_or(false) {
        return Err(StatusCode::UNAUTHORIZED);
    }

    let role_name = store.lock().unwrap()
        .roles.get(&user.role_key)
        .map(|r| r.name.clone())
        .unwrap_or_default();

    let token = crate::auth::create_jwt(&user.username, &user.username, &user.role_key)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response = LoginResponse {
        token,
        user: UserInfo {
            _key: user.username.clone(),
            username: user.username.clone(),
            name: user.name.clone(),
            role_key: user.role_key.clone(),
            role_name,
        },
    };

    Ok(Json(ApiResponse::success(response)))
}

async fn logout() -> Result<impl IntoResponse, StatusCode> {
    Ok(Json(ApiResponse::success("Logged out".to_string())))
}

async fn me(headers: HeaderMap) -> Result<impl IntoResponse, StatusCode> {
    let token = headers
        .get(AUTHORIZATION)
        .and_then(|v| v.to_str().ok())
        .and_then(|v| v.strip_prefix("Bearer "))
        .ok_or(StatusCode::UNAUTHORIZED)?;
    
    let claims = verify_jwt(token).map_err(|_| StatusCode::UNAUTHORIZED)?;

    let store = get_store();
    let users = store.lock().unwrap().users.clone();
    
    let user = users.get(&claims.claims.sub).ok_or(StatusCode::NOT_FOUND)?;
    
    let role_name = store.lock().unwrap()
        .roles.get(&user.role_key)
        .map(|r| r.name.clone())
        .unwrap_or_default();

    Ok(Json(ApiResponse::success(UserInfo {
        _key: user.username.clone(),
        username: user.username.clone(),
        name: user.name.clone(),
        role_key: user.role_key.clone(),
        role_name,
    })))
}

async fn list_users() -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let users: Vec<User> = store.lock().unwrap().users.values().cloned().collect();
    Ok(Json(ApiResponse::success(users)))
}

async fn create_user(Json(payload): Json<User>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let mut s = store.lock().unwrap();
    
    if s.users.contains_key(&payload.username) {
        return Err(StatusCode::CONFLICT);
    }
    
    let password_hash = bcrypt::hash(&payload.password_hash, 10)
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let user = User {
        _key: payload.username.clone(),
        username: payload.username,
        password_hash,
        name: payload.name,
        role_key: payload.role_key,
        status: payload.status,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    s.users.insert(user.username.clone(), user.clone());
    Ok(Json(ApiResponse::success(user)))
}

async fn get_user(Path(key): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let user = store.lock().unwrap()
        .users.get(&key)
        .cloned()
        .ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(ApiResponse::success(user)))
}

async fn update_user(Path(key): Path<String>, Json(payload): Json<User>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let mut s = store.lock().unwrap();
    
    let user = s.users.get_mut(&key).ok_or(StatusCode::NOT_FOUND)?;
    user.name = payload.name;
    user.role_key = payload.role_key;
    user.status = payload.status;

    Ok(Json(ApiResponse::success(user.clone())))
}

async fn delete_user(Path(key): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let mut s = store.lock().unwrap();
    s.users.remove(&key).ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(ApiResponse::success("User deleted".to_string())))
}

async fn reset_password(Path(key): Path<String>, Json(payload): Json<serde_json::Value>) -> Result<impl IntoResponse, StatusCode> {
    let new_password = payload.get("password").and_then(|v| v.as_str()).ok_or(StatusCode::BAD_REQUEST)?;
    
    let store = get_store();
    let mut s = store.lock().unwrap();
    
    let user = s.users.get_mut(&key).ok_or(StatusCode::NOT_FOUND)?;
    user.password_hash = bcrypt::hash(new_password, 10).map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    Ok(Json(ApiResponse::success("Password reset successfully".to_string())))
}

async fn list_roles() -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let roles: Vec<Role> = store.lock().unwrap().roles.values().cloned().collect();
    Ok(Json(ApiResponse::success(roles)))
}

async fn create_role(Json(payload): Json<Role>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let mut s = store.lock().unwrap();
    
    let key = payload.name.to_lowercase().replace(' ', "_");
    if s.roles.contains_key(&key) {
        return Err(StatusCode::CONFLICT);
    }

    let role = Role {
        _key: key,
        name: payload.name,
        description: payload.description,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    s.roles.insert(role._key.clone(), role.clone());
    Ok(Json(ApiResponse::success(role)))
}

async fn get_role(Path(key): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let role = store.lock().unwrap()
        .roles.get(&key)
        .cloned()
        .ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(ApiResponse::success(role)))
}

async fn update_role(Path(key): Path<String>, Json(payload): Json<Role>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let mut s = store.lock().unwrap();
    
    let role = s.roles.get_mut(&key).ok_or(StatusCode::NOT_FOUND)?;
    role.name = payload.name;
    role.description = payload.description;

    Ok(Json(ApiResponse::success(role.clone())))
}

async fn delete_role(Path(key): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let mut s = store.lock().unwrap();
    s.roles.remove(&key).ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(ApiResponse::success("Role deleted".to_string())))
}

async fn list_params() -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let params: Vec<SystemParam> = store.lock().unwrap().params.values().cloned().collect();
    Ok(Json(ApiResponse::success(params)))
}

async fn get_param(Path(key): Path<String>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let param = store.lock().unwrap()
        .params.get(&key)
        .cloned()
        .ok_or(StatusCode::NOT_FOUND)?;
    Ok(Json(ApiResponse::success(param)))
}

async fn update_param(Path(key): Path<String>, Json(payload): Json<SystemParam>) -> Result<impl IntoResponse, StatusCode> {
    let store = get_store();
    let mut s = store.lock().unwrap();
    
    let param = s.params.get_mut(&key).ok_or(StatusCode::NOT_FOUND)?;
    param.param_value = payload.param_value;
    param.updated_at = chrono::Utc::now().to_rfc3339();

    Ok(Json(ApiResponse::success(param.clone())))
}
