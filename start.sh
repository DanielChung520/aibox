#!/usr/bin/env bash
set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
API_DIR="$SCRIPT_DIR/api"
SERVER_DIR="$SCRIPT_DIR/server"
PID_DIR="$SCRIPT_DIR/.pids"

mkdir -p "$PID_DIR"

source "$API_DIR/.env" 2>/dev/null || true
API_PORT="${PORT:-6500}"

kill_port() {
  local port=$1
  local pid=$(lsof -ti :$port 2>/dev/null)
  if [ -n "$pid" ]; then
    echo "→ Killing process on port $port (PID: $pid)"
    kill -9 $pid 2>/dev/null || true
    sleep 1
  fi
}

check_port() {
  local port=$1
  if lsof -ti :$port >/dev/null 2>&1; then
    echo "Port $port: OCCUPIED"
    return 1
  else
    echo "Port $port: FREE"
    return 0
  fi
}

start_api() {
  echo "═══════════════════════════════════════"
  echo "Starting API Server..."
  echo "═══════════════════════════════════════"
  
  kill_port 6500
  
  cd "$API_DIR"
  cargo run --release > /tmp/abc-api.log 2>&1 &
  echo $! > "$PID_DIR/api.pid"
  
  echo "→ Waiting for API Server (compiling + starting, max 120s)..."
  local elapsed=0
  local max_wait=120
  while [ $elapsed -lt $max_wait ]; do
    if curl -sf http://localhost:6500/health > /dev/null 2>&1; then
      echo "✅ API Server started on http://localhost:6500 (${elapsed}s)"
      return 0
    fi
    # Check if cargo process is still alive
    local pid=$(cat "$PID_DIR/api.pid" 2>/dev/null)
    if [ -n "$pid" ] && ! kill -0 "$pid" 2>/dev/null; then
      echo "❌ API Server process exited unexpectedly"
      cat /tmp/abc-api.log
      return 1
    fi
    sleep 2
    elapsed=$((elapsed + 2))
  done
  echo "❌ API Server failed to start within ${max_wait}s"
  tail -30 /tmp/abc-api.log
}

start_static() {
  echo "═══════════════════════════════════════"
  echo "Starting Static File Server..."
  echo "═══════════════════════════════════════"
  
  kill_port 6000
  
  cd "$SERVER_DIR"
  python3 -m http.server 6000 > /tmp/abc-static.log 2>&1 &
  echo $! > "$PID_DIR/static.pid"
  
  sleep 2
  if lsof -ti :6000 >/dev/null 2>&1; then
    echo "✅ Static Server started on http://localhost:6000"
  else
    echo "❌ Static Server failed to start"
  fi
}

stop_api() {
  if [ -f "$PID_DIR/api.pid" ]; then
    local pid=$(cat "$PID_DIR/api.pid")
    if kill -0 $pid 2>/dev/null; then
      echo "→ Stopping API Server (PID: $pid)"
      kill $pid 2>/dev/null || true
    fi
    rm "$PID_DIR/api.pid"
  fi
  kill_port 6500
}

stop_static() {
  if [ -f "$PID_DIR/static.pid" ]; then
    local pid=$(cat "$PID_DIR/static.pid")
    if kill -0 $pid 2>/dev/null; then
      echo "→ Stopping Static Server (PID: $pid)"
      kill $pid 2>/dev/null || true
    fi
    rm "$PID_DIR/static.pid"
  fi
  kill_port 6000
}

status() {
  echo "═══════════════════════════════════════"
  echo "ABC Services Status"
  echo "═══════════════════════════════════════"
  echo ""
  
  echo "Port 6500 (API):"
  if lsof -ti :6500 >/dev/null 2>&1; then
    local api_pid=$(lsof -ti :6500)
    echo "  ✅ Running (PID: $api_pid)"
  else
    echo "  ❌ Not running"
  fi
  
  echo ""
  echo "Port 6000 (Static):"
  if lsof -ti :6000 >/dev/null 2>&1; then
    local static_pid=$(lsof -ti :6000)
    echo "  ✅ Running (PID: $static_pid)"
  else
    echo "  ❌ Not running"
  fi
  
  echo ""
  echo "ArangoDB: (shared, not managed by this script)"
  
  echo ""
}

build_app() {
  echo "═══════════════════════════════════════"
  echo "Building ABC Desktop App..."
  echo "═══════════════════════════════════════"
  
  cd "$SCRIPT_DIR"
  
  echo "→ Building frontend with production API..."
  VITE_API_URL=https://abcapi.k84.org npm run build
  
  echo "→ Building Tauri (Intel)..."
  cd src-tauri
  cargo build --release --target x86_64-apple-darwin
  cd ../..
  
  echo "→ Building Tauri (ARM)..."
  npm run tauri build
  
  echo "→ Copying Intel binary to bundle..."
  cp src-tauri/target/x86_64-apple-darwin/release/abc-desktop "src-tauri/target/release/bundle/macos/ABC管理系统.app/Contents/MacOS/abc-desktop"
  
  echo "→ Copying frontend to bundle..."
  cp -R dist/* "src-tauri/target/release/bundle/macos/ABC管理系统.app/Contents/Resources/"
  
  echo "→ Creating DMG..."
  hdiutil create -ov -format UDRO -srcfolder "src-tauri/target/release/bundle/macos/ABC管理系统.app" -o "server/abc-desktop.dmg"
  
  echo ""
  echo "✅ Build complete: server/abc-desktop.dmg"
}

case "${1:-status}" in
  start)
    start_api
    start_static
    ;;
  stop)
    stop_api
    stop_static
    echo "✅ All services stopped"
    ;;
  restart)
    stop_api
    stop_static
    sleep 2
    start_api
    start_static
    ;;
  status)
    status
    ;;
  build)
    build_app
    ;;
  *)
    echo "Usage: $0 {start|stop|restart|status|build}"
    exit 1
    ;;
esac
