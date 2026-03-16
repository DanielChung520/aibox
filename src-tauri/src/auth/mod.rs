use jsonwebtoken::{decode, encode, DecodingKey, EncodingKey, Header, TokenData, Validation};
use serde::{Deserialize, Serialize};
use std::time::{SystemTime, UNIX_EPOCH};

const JWT_SECRET: &str = "abc-desktop-secret-key-2026";

#[derive(Debug, Serialize, Deserialize)]
pub struct Claims {
    pub sub: String,      // user key
    pub username: String,  // username
    pub role: String,      // role key
    pub exp: u64,          // expiration timestamp
}

pub fn create_jwt(user_key: &str, username: &str, role: &str) -> Result<String, String> {
    let expiration = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| e.to_string())?
        .as_secs()
        + 86400; // 24 hours

    let claims = Claims {
        sub: user_key.to_string(),
        username: username.to_string(),
        role: role.to_string(),
        exp: expiration,
    };

    encode(
        &Header::default(),
        &claims,
        &EncodingKey::from_secret(JWT_SECRET.as_bytes()),
    )
    .map_err(|e| e.to_string())
}

pub fn verify_jwt(token: &str) -> Result<TokenData<Claims>, String> {
    decode::<Claims>(
        token,
        &DecodingKey::from_secret(JWT_SECRET.as_bytes()),
        &Validation::default(),
    )
    .map_err(|e| e.to_string())
}
