//! Intent Router - 意圖檢測 + 工具路由
//!
//! # Last Update: 2026-03-27 20:00:00
//! # Author: Daniel Chung
//! # Version: 1.0.0

use std::collections::HashMap;
use std::pin::Pin;

use axum::response::sse::Event;
use futures::Stream;
use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug)]
pub enum IntentError {
    Reqwest(reqwest::Error),
    Serde(serde_json::Error),
    NoToolMatch,
    ToolExecutionFailed(String),
    OllamaError(String),
}

impl From<reqwest::Error> for IntentError {
    fn from(e: reqwest::Error) -> Self {
        IntentError::Reqwest(e)
    }
}

impl From<serde_json::Error> for IntentError {
    fn from(e: serde_json::Error) -> Self {
        IntentError::Serde(e)
    }
}

#[derive(Debug, Clone, Deserialize)]
struct IntentMatchResult {
    intent_id: String,
    score: f64,
    #[serde(rename = "intent_data")]
    intent_data: IntentData,
}

#[derive(Debug, Clone, Deserialize)]
struct IntentData {
    #[serde(rename = "intent_type", default)]
    intent_type: String,
    #[serde(rename = "tool_name", default)]
    tool_name: String,
    #[serde(rename = "generation_strategy", default)]
    generation_strategy: String,
    #[serde(rename = "nl_examples", default)]
    nl_examples: Vec<String>,
    #[serde(rename = "description", default)]
    description: String,
}

#[derive(Debug, Clone, Deserialize)]
struct IntentMatchResponse {
    query: String,
    matches: Vec<IntentMatchResult>,
    #[serde(rename = "best_match", default)]
    best_match: Option<IntentMatchResult>,
}

#[derive(Debug, Clone, Serialize)]
struct ToolCall {
    tool: String,
    parameters: HashMap<String, Value>,
}

const INTENT_RAG_THRESHOLD: f64 = 0.55;

pub async fn detect_intent(
    client: &reqwest::Client,
    intent_rag_url: &str,
    query: &str,
) -> Result<Option<(IntentMatchResult, String)>, IntentError> {
    let url = format!("{}/intent-rag/intent/match", intent_rag_url);
    let body = serde_json::json!({"query": query, "top_k": 3});

    let resp = client
        .post(&url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(15))
        .send()
        .await?;

    if !resp.status().is_success() {
        return Ok(None);
    }

    let data: IntentMatchResponse = resp.json().await?;

    let best = match data.best_match {
        Some(m) if m.score >= INTENT_RAG_THRESHOLD => m,
        _ => return Ok(None),
    };

    if best.intent_data.intent_type != "tool" {
        return Ok(None);
    }

    let tool_name = best.intent_data.tool_name.clone();
    if tool_name.is_empty() {
        return Ok(None);
    }

    Ok(Some((best, tool_name)))
}

pub async fn extract_parameters(
    client: &reqwest::Client,
    ollama_url: &str,
    model: &str,
    user_message: &str,
    tool_name: &str,
) -> Result<HashMap<String, Value>, IntentError> {
    let system_prompt = match tool_name {
        "weather" => {
            r#"You are a parameter extraction assistant. Extract parameters from the user message for the weather tool.
The weather tool accepts:
- city: string (optional, city name like "Taipei", "台中", "New York")
- lat: float (optional, latitude)
- lon: float (optional, longitude)
- units: string ("metric" for Celsius, "imperial" for Fahrenheit)

Output ONLY valid JSON. Examples:
- "台北天氣怎樣" → {"city": "台北"}
- "temperature in New York" → {"city": "New York", "units": "imperial"}
- "weather forecast for Tokyo" → {"city": "Tokyo"}
- "今天會下雨嗎" → {}
Output JSON only:"#
        }
        "forecast" => {
            r#"You are a parameter extraction assistant. Extract parameters for the forecast tool.
Accepts: city, lat, lon, days (1-7, default 3), units.
Examples:
- "未來三天天氣" → {"days": 3}
- "一週天氣預報台北" → {"city": "台北", "days": 7}
Output JSON only:"#
        }
        "web_search" => {
            r#"You are a parameter extraction assistant. Extract parameters for the web search tool.
Accepts: query (REQUIRED), num (default 5), location (optional).
Examples:
- "搜尋最新AI新聞" → {"query": "最新AI新聞", "num": 5}
- "search for latest news about climate change" → {"query": "latest news climate change", "num": 5}
- "幫我查一下台北房價" → {"query": "台北房價", "num": 5}
Output JSON only:"#
        }
        _ => r#"Extract parameters as JSON. Output only valid JSON:"#,
    };

    let body = serde_json::json!({
        "model": model,
        "prompt": format!("{}\n\nUser message: {}", system_prompt, user_message),
        "stream": false,
        "options": { "temperature": 0.1, "num_predict": 256 }
    });

    let resp = client
        .post(format!("{}/api/generate", ollama_url))
        .json(&body)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(IntentError::OllamaError("param extraction failed".into()));
    }

    let data: Value = resp.json().await?;
    let raw_output = data
        .get("response")
        .and_then(|v| v.as_str())
        .unwrap_or("{}")
        .trim();

    let json_str = if raw_output.starts_with("```") {
        raw_output
            .lines()
            .skip_while(|l| !l.starts_with('{'))
            .take_while(|l| !l.starts_with("```"))
            .collect::<Vec<_>>()
            .join("\n")
    } else {
        raw_output.to_string()
    };

    let params: Value =
        serde_json::from_str(&json_str).unwrap_or(Value::Object(serde_json::Map::new()));

    let mut result = HashMap::new();
    if let Some(obj) = params.as_object() {
        for (k, v) in obj {
            result.insert(k.clone(), v.clone());
        }
    }

    if tool_name == "web_search" && !result.contains_key("query") {
        result.insert("query".into(), Value::String(user_message.to_string()));
    }
    if tool_name == "web_search" && !result.contains_key("num") {
        result.insert("num".into(), Value::Number(5.into()));
    }
    if tool_name == "forecast" && !result.contains_key("days") {
        result.insert("days".into(), Value::Number(3.into()));
    }

    Ok(result)
}

pub async fn execute_tool(
    client: &reqwest::Client,
    mcp_tools_url: &str,
    tool_name: &str,
    parameters: HashMap<String, Value>,
) -> Result<Value, IntentError> {
    let url = format!("{}/execute", mcp_tools_url);
    let body = ToolCall {
        tool: tool_name.to_string(),
        parameters,
    };

    let resp = client
        .post(&url)
        .json(&body)
        .timeout(std::time::Duration::from_secs(60))
        .send()
        .await?;

    if !resp.status().is_success() {
        let text = resp.text().await.unwrap_or_default();
        return Err(IntentError::ToolExecutionFailed(text));
    }

    let result: Value = resp.json().await?;

    if let Some(success) = result.get("success").and_then(|v| v.as_bool()) {
        if !success {
            let error = result
                .get("error")
                .and_then(|v| v.as_str())
                .unwrap_or("unknown");
            return Err(IntentError::ToolExecutionFailed(error.into()));
        }
    }

    Ok(result)
}

pub fn build_summarize_prompt(
    user_message: &str,
    tool_name: &str,
    tool_result: &Value,
    history: &[Value],
) -> String {
    let result_str = serde_json::to_string_pretty(&tool_result).unwrap_or_default();

    let history_summary = if history.is_empty() {
        String::new()
    } else {
        history
            .iter()
            .rev()
            .take(4)
            .filter_map(|m| {
                let role = m.get("role")?.as_str()?;
                let content = m.get("content")?.as_str()?;
                Some(format!("{}: {}", role, content))
            })
            .collect::<Vec<_>>()
            .join("\n")
    };

    format!(
        r#"你是一個助手，用戶詢問了：「{}」

以下是工具執行結果（JSON 格式）：
{}

{}

請根據工具結果，用流暢自然的語言回應用戶。不要提及"根據工具結果"或"數據顯示"等字眼，直接用自然的句子回答。
如果用戶用繁體中文提問，請用繁體中文回答。

重要格式要求：
- 如果結果包含網頁連結，請使用 Markdown 格式：[標題](連結URL)
- 搜尋結果請條列說明，每項包含可點擊的連結
- 天氣資訊直接以自然語言表達

範例格式：
1. [AI | 世界新聞網](https://example.com) - 最新AI相關報導和深度分析
2. [TechNews 科技新報](https://technews.tw) - AI技術發展和產業動態"#,
        user_message,
        result_str,
        if history_summary.is_empty() {
            String::new()
        } else {
            format!("\n\n參考對話歷史：\n{}", history_summary)
        }
    )
}

pub async fn summarize_result_stream(
    client: &reqwest::Client,
    ollama_url: &str,
    model: &str,
    user_message: &str,
    tool_name: &str,
    tool_result: &Value,
    history: &[Value],
) -> Result<impl Stream<Item = Result<Event, std::convert::Infallible>>, IntentError> {
    let prompt = build_summarize_prompt(user_message, tool_name, tool_result, history);

    let body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": true,
        "options": { "temperature": 0.7, "num_predict": 1024 }
    });

    let resp = client
        .post(format!("{}/api/generate", ollama_url))
        .json(&body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(IntentError::OllamaError("summarize failed".into()));
    }

    let text = resp.text().await.map_err(|_| IntentError::OllamaError("read failed".into()))?;

    let mut events: Vec<Result<Event, std::convert::Infallible>> = Vec::new();
    for line in text.lines() {
        if let Ok(data) = serde_json::from_str::<Value>(line) {
            let content = data.get("response").and_then(|v| v.as_str()).unwrap_or("");
            let done = data.get("done").and_then(|v| v.as_bool()).unwrap_or(false);
            events.push(Ok(Event::default()
                .event(if done { "chat_done" } else { "chat_chunk" })
                .data(serde_json::json!({ "content": content, "done": done }).to_string())));
        }
    }

    Ok(futures::stream::iter(events))
}

pub fn sse_text_to_stream(
    text: String,
) -> Pin<Box<dyn Stream<Item = Result<Event, std::convert::Infallible>> + Send>> {
    if text.trim().is_empty() {
        return Box::pin(futures::stream::iter(Vec::<Result<Event, std::convert::Infallible>>::new()));
    }

    let events: Vec<_> = text
        .lines()
        .filter_map(|line| {
            if line.trim().is_empty() {
                return None;
            }
            serde_json::from_str::<Value>(line).ok().map(|data| {
                let content = data.get("response").and_then(|v| v.as_str()).unwrap_or("");
                let done = data.get("done").and_then(|v| v.as_bool()).unwrap_or(false);
                Ok(Event::default()
                    .event(if done { "chat_done" } else { "chat_chunk" })
                    .data(serde_json::json!({ "content": content, "done": done }).to_string()))
            })
        })
        .collect();

    Box::pin(futures::stream::iter(events))
}

pub async fn summarize_text(
    client: &reqwest::Client,
    ollama_url: &str,
    model: &str,
    user_message: &str,
    tool_name: &str,
    tool_result: &Value,
    history: &[Value],
) -> Result<String, IntentError> {
    let prompt = build_summarize_prompt(user_message, tool_name, tool_result, history);

    let body = serde_json::json!({
        "model": model,
        "prompt": prompt,
        "stream": true,
        "options": { "temperature": 0.7, "num_predict": 1024 }
    });

    let resp = client
        .post(format!("{}/api/generate", ollama_url))
        .json(&body)
        .timeout(std::time::Duration::from_secs(120))
        .send()
        .await?;

    if !resp.status().is_success() {
        return Err(IntentError::OllamaError("summarize failed".into()));
    }

    let text = resp.text().await.map_err(|_| IntentError::OllamaError("read failed".into()))?;
    Ok(text)
}

#[derive(Debug, Clone, Serialize)]
pub struct ToolIntentResult {
    pub tool_name: String,
    pub score: f64,
    pub success: bool,
    pub result: Value,
}

pub async fn route_tool_intent(
    client: &reqwest::Client,
    intent_rag_url: &str,
    mcp_tools_url: &str,
    ollama_url: &str,
    ollama_model: &str,
    user_message: &str,
    history: &[Value],
) -> Result<Option<ToolIntentResult>, IntentError> {
    let detect_result = detect_intent(client, intent_rag_url, user_message).await;
    let Some((intent_match, tool_name)) = detect_result? else {
        return Ok(None);
    };

    let params = extract_parameters(client, ollama_url, ollama_model, user_message, &tool_name).await?;
    let result = execute_tool(client, mcp_tools_url, &tool_name, params).await?;

    Ok(Some(ToolIntentResult {
        tool_name,
        score: intent_match.score,
        success: true,
        result,
    }))
}
