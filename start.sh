#!/usr/bin/env bash
# ============================================================================
# @file        start.sh
# @description ABC Desktop 服務管理腳本 — Rust API + Static + Python AI Services
# @lastUpdate  2026-03-25 12:41:00
# @author      Daniel Chung
# @version     2.1.0
# ============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$SCRIPT_DIR/api"
SERVER_DIR="$SCRIPT_DIR/server"
AI_DIR="$SCRIPT_DIR/ai-services"
PID_DIR="$SCRIPT_DIR/.pids"
VENV_PYTHON="$AI_DIR/.venv/bin/python"

mkdir -p "$PID_DIR"

source "$API_DIR/.env" 2>/dev/null || true
API_PORT="${PORT:-6500}"

# ─── Python AI Services 定義 ────────────────────────────────────────────────
# 格式: "名稱:端口:模組路徑"
AI_SERVICES=(
  "aitask:8001:aitask.main:app"
  "data_agent:8003:data_agent.main:app"
  "mcp_tools:8004:mcp_tools.main:app"
  "bpa_mm_agent:8005:bpa.mm_agent.main:app"
  "knowledge_agent:8007:knowledge_agent.main:app"
)

# ─── 共用函數 ────────────────────────────────────────────────────────────────

kill_port() {
  local port=$1
  local pid
  pid=$(lsof -ti :"$port" 2>/dev/null || true)
  if [ -n "$pid" ]; then
    echo "  -> Killing process on port $port (PID: $pid)"
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

wait_for_port() {
  local port=$1
  local label=$2
  local max_wait=${3:-60}
  local elapsed=0
  while [ $elapsed -lt $max_wait ]; do
    if curl -sf "http://localhost:$port/health" > /dev/null 2>&1 || \
       curl -sf "http://localhost:$port/docs" > /dev/null 2>&1 || \
       lsof -ti :"$port" > /dev/null 2>&1; then
      echo "  ✅ $label started on port $port (${elapsed}s)"
      return 0
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo "  ❌ $label failed to start within ${max_wait}s"
  return 1
}

# ─── Rust API Gateway (port 6500) ───────────────────────────────────────────

start_api() {
  echo "═══════════════════════════════════════"
  echo " Rust API Gateway (port $API_PORT)"
  echo "═══════════════════════════════════════"

  kill_port "$API_PORT"

  cd "$API_DIR"
  cargo run --release > /tmp/abc-api.log 2>&1 &
  echo $! > "$PID_DIR/api.pid"

  echo "  -> Waiting for API Server (compiling + starting, max 120s)..."
  local elapsed=0
  local max_wait=120
  while [ $elapsed -lt $max_wait ]; do
    if curl -sf "http://localhost:$API_PORT/health" > /dev/null 2>&1; then
      echo "  ✅ API Server started on http://localhost:$API_PORT (${elapsed}s)"
      return 0
    fi
    # Check if cargo process is still alive
    local pid
    pid=$(cat "$PID_DIR/api.pid" 2>/dev/null)
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      echo "  ❌ API Server process exited unexpectedly"
      tail -20 /tmp/abc-api.log
      return 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo "  ❌ API Server failed to start within ${max_wait}s"
  tail -30 /tmp/abc-api.log
  return 1
}

stop_api() {
  if [ -f "$PID_DIR/api.pid" ]; then
    local pid
    pid=$(cat "$PID_DIR/api.pid")
    if kill -0 "$pid" 2>/dev/null; then
      echo "  -> Stopping API Server (PID: $pid)"
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_DIR/api.pid"
  fi
  kill_port "$API_PORT"
}

# ─── Static File Server (port 6000) ─────────────────────────────────────────

start_static() {
  echo "═══════════════════════════════════════"
  echo " Static File Server (port 6000)"
  echo "═══════════════════════════════════════"

  kill_port 6000

  if [ ! -d "$SERVER_DIR" ]; then
    echo "  ⚠️  $SERVER_DIR not found, skipping static server"
    return 0
  fi

  cd "$SERVER_DIR"
  python3 -m http.server 6000 > /tmp/abc-static.log 2>&1 &
  echo $! > "$PID_DIR/static.pid"

  sleep 2
  if lsof -ti :6000 > /dev/null 2>&1; then
    echo "  ✅ Static Server started on http://localhost:6000"
  else
    echo "  ❌ Static Server failed to start"
  fi
}

stop_static() {
  if [ -f "$PID_DIR/static.pid" ]; then
    local pid
    pid=$(cat "$PID_DIR/static.pid")
    if kill -0 "$pid" 2>/dev/null; then
      echo "  -> Stopping Static Server (PID: $pid)"
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_DIR/static.pid"
  fi
  kill_port 6000
}

# ─── Python AI Services ─────────────────────────────────────────────────────

start_ai_service() {
  local name=$1 port=$2 module=$3

  echo "---------------------------------------"
  echo " $name (port $port)"
  echo "---------------------------------------"

  kill_port "$port"

  if [ ! -x "$VENV_PYTHON" ]; then
    echo "  ❌ Python venv not found: $VENV_PYTHON"
    echo "     Run: cd ai-services && python3 -m venv .venv && source .venv/bin/activate && pip install -r requirements.txt"
    return 1
  fi

  "$VENV_PYTHON" -m uvicorn "$module" --host 0.0.0.0 --port "$port" --reload \
    > "/tmp/abc-${name}.log" 2>&1 &
  echo $! > "$PID_DIR/${name}.pid"

  wait_for_port "$port" "$name" 30
}

stop_ai_service() {
  local name=$1 port=$2

  if [ -f "$PID_DIR/${name}.pid" ]; then
    local pid
    pid=$(cat "$PID_DIR/${name}.pid")
    if kill -0 "$pid" 2>/dev/null; then
      echo "  -> Stopping $name (PID: $pid)"
      kill "$pid" 2>/dev/null || true
    fi
    rm -f "$PID_DIR/${name}.pid"
  fi
  kill_port "$port"
}

start_all_ai() {
  echo "═══════════════════════════════════════"
  echo " Python AI Services"
  echo "═══════════════════════════════════════"

  cd "$AI_DIR"
  for entry in "${AI_SERVICES[@]}"; do
    IFS=':' read -r name port module <<< "$entry"
    start_ai_service "$name" "$port" "$module"
  done
}

stop_all_ai() {
  for entry in "${AI_SERVICES[@]}"; do
    IFS=':' read -r name port module <<< "$entry"
    stop_ai_service "$name" "$port"
  done
}

find_ai_service() {
  local target=$1
  for entry in "${AI_SERVICES[@]}"; do
    IFS=':' read -r name port module <<< "$entry"
    if [ "$name" = "$target" ]; then
      echo "$name:$port:$module"
      return 0
    fi
  done
  return 1
}

do_single() {
  local action=$1 target=$2

  case "$target" in
    api)
      [ "$action" = "stop" ] || [ "$action" = "restart" ] && stop_api
      [ "$action" = "start" ] || [ "$action" = "restart" ] && start_api
      ;;
    static)
      [ "$action" = "stop" ] || [ "$action" = "restart" ] && stop_static
      [ "$action" = "start" ] || [ "$action" = "restart" ] && start_static
      ;;
    *)
      local entry
      entry=$(find_ai_service "$target") || {
        echo "❌ Unknown service: $target"
        echo "   Available: api, static, $(printf '%s' "${AI_SERVICES[*]}" | tr ' ' '\n' | cut -d: -f1 | tr '\n' ' ')"
        return 1
      }
      IFS=':' read -r name port module <<< "$entry"
      [ "$action" = "stop" ] || [ "$action" = "restart" ] && stop_ai_service "$name" "$port"
      if [ "$action" = "start" ] || [ "$action" = "restart" ]; then
        cd "$AI_DIR"
        start_ai_service "$name" "$port" "$module"
      fi
      ;;
  esac
}

# ─── Status ──────────────────────────────────────────────────────────────────

status() {
  echo "═══════════════════════════════════════"
  echo " ABC Desktop Services Status"
  echo "═══════════════════════════════════════"
  echo ""

  printf "  %-22s (port %s): " "Rust API Gateway" "$API_PORT"
  if lsof -ti :"$API_PORT" > /dev/null 2>&1; then
    local api_pid
    api_pid=$(lsof -ti :"$API_PORT" | head -1)
    echo "✅ Running (PID: $api_pid)"
  else
    echo "❌ Not running"
  fi

  printf "  %-22s (port %s): " "Static Server" "6000"
  if lsof -ti :6000 > /dev/null 2>&1; then
    local static_pid
    static_pid=$(lsof -ti :6000 | head -1)
    echo "✅ Running (PID: $static_pid)"
  else
    echo "❌ Not running"
  fi

  for entry in "${AI_SERVICES[@]}"; do
    IFS=':' read -r name port module <<< "$entry"
    printf "  %-22s (port %s): " "$name" "$port"
    if lsof -ti :"$port" > /dev/null 2>&1; then
      local svc_pid
      svc_pid=$(lsof -ti :"$port" | head -1)
      echo "✅ Running (PID: $svc_pid)"
    else
      echo "❌ Not running"
    fi
  done

  echo ""
  echo "  External (not managed by this script):"
  printf "  %-22s (port %s): " "ArangoDB" "8529"
  lsof -ti :8529 > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"
  printf "  %-22s (port %s): " "Qdrant" "6333"
  lsof -ti :6333 > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"
  printf "  %-22s (port %s): " "MinIO (S3)" "8334"
  lsof -ti :8334 > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"
  printf "  %-22s (port %s): " "Ollama" "11434"
  lsof -ti :11434 > /dev/null 2>&1 && echo "✅ Running" || echo "❌ Not running"
  echo ""
}

# ─── Build ───────────────────────────────────────────────────────────────────

build_app() {
  echo "═══════════════════════════════════════"
  echo " Building ABC Desktop App..."
  echo "═══════════════════════════════════════"

  cd "$SCRIPT_DIR"

  echo "  -> Building frontend with production API..."
  VITE_API_URL=https://abcapi.k84.org npm run build

  echo "  -> Building Tauri (Intel)..."
  cd src-tauri
  cargo build --release --target x86_64-apple-darwin
  cd ..

  echo "  -> Building Tauri (ARM)..."
  npm run tauri build

  echo "  -> Copying Intel binary to bundle..."
  cp src-tauri/target/x86_64-apple-darwin/release/abc-desktop \
    "src-tauri/target/release/bundle/macos/ABC管理系统.app/Contents/MacOS/abc-desktop"

  echo "  -> Copying frontend to bundle..."
  cp -R dist/* "src-tauri/target/release/bundle/macos/ABC管理系统.app/Contents/Resources/"

  echo "  -> Creating DMG..."
  hdiutil create -ov -format UDRO \
    -srcfolder "src-tauri/target/release/bundle/macos/ABC管理系统.app" \
    -o "server/abc-desktop.dmg"

  echo ""
  echo "  ✅ Build complete: server/abc-desktop.dmg"
}

# ─── Logs ────────────────────────────────────────────────────────────────────

logs() {
  local target=${2:-all}
  local lines=${3:-30}

  if [ "$target" = "all" ]; then
    echo "=== API Server ===" && tail -"$lines" /tmp/abc-api.log 2>/dev/null || true
    echo ""
    for entry in "${AI_SERVICES[@]}"; do
      IFS=':' read -r name port module <<< "$entry"
      echo "=== $name ===" && tail -"$lines" "/tmp/abc-${name}.log" 2>/dev/null || true
      echo ""
    done
  else
    tail -"$lines" "/tmp/abc-${target}.log" 2>/dev/null || echo "No log found for $target"
  fi
}

# ─── Main ────────────────────────────────────────────────────────────────────

case "${1:-status}" in
  start)
    if [ -n "${2:-}" ]; then
      do_single start "$2"
    else
      start_api
      start_static
      start_all_ai
      echo ""
      echo "═══════════════════════════════════════"
      echo " All services started!"
      echo "═══════════════════════════════════════"
      status
    fi
    ;;
  stop)
    if [ -n "${2:-}" ]; then
      do_single stop "$2"
    else
      stop_api
      stop_static
      stop_all_ai
      echo "  ✅ All services stopped"
    fi
    ;;
  restart)
    if [ -n "${2:-}" ]; then
      do_single restart "$2"
    else
      stop_api
      stop_static
      stop_all_ai
      sleep 2
      start_api
      start_static
      start_all_ai
      echo ""
      status
    fi
    ;;
  start-ai)
    start_all_ai
    ;;
  stop-ai)
    stop_all_ai
    echo "  ✅ All AI services stopped"
    ;;
  restart-ai)
    stop_all_ai
    sleep 1
    start_all_ai
    ;;
  status)
    status
    ;;
  build)
    build_app
    ;;
  logs)
    logs "$@"
    ;;
  help|*)
    echo "Usage: $0 <command> [service]"
    echo ""
    echo "Batch Commands:"
    echo "  start           Start all services (API + Static + AI)"
    echo "  stop            Stop all services"
    echo "  restart         Restart all services"
    echo "  start-ai        Start all Python AI services"
    echo "  stop-ai         Stop all Python AI services"
    echo "  restart-ai      Restart all Python AI services"
    echo ""
    echo "Single Service Commands:"
    echo "  start   <name>  Start a single service"
    echo "  stop    <name>  Stop a single service"
    echo "  restart <name>  Restart a single service"
    echo ""
    echo "Available services:"
    echo "  api               Rust API Gateway (port $API_PORT)"
    echo "  static            Static File Server (port 6000)"
    for entry in "${AI_SERVICES[@]}"; do
      IFS=':' read -r name port module <<< "$entry"
      printf "  %-18s  Python AI service (port %s)\n" "$name" "$port"
    done
    echo ""
    echo "Other Commands:"
    echo "  status          Show all service status"
    echo "  build           Build Tauri desktop app"
    echo "  logs [name]     Show service logs (default: all)"
    echo "  help            Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0 restart api          Restart only Rust API"
    echo "  $0 start aitask         Start only aitask service"
    echo "  $0 stop data_agent      Stop only data_agent"
    echo "  $0 logs aitask          Show aitask logs"
    exit 1
    ;;
esac
