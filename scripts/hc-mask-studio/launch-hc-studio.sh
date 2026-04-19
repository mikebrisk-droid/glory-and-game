#!/bin/zsh

set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "$0")" && pwd)"
REPO_DIR="$(cd -- "$SCRIPT_DIR/../.." && pwd)"
STUDIO_URL="http://localhost:4242/"
APP_URL="http://localhost:4321/"
LOG_DIR="$REPO_DIR/.hc-studio"
STUDIO_LOG_FILE="$LOG_DIR/server.log"
APP_LOG_FILE="$LOG_DIR/app.log"
NPM_BIN="/opt/homebrew/bin/npm"
NODE_BIN="/opt/homebrew/bin/node"

mkdir -p "$LOG_DIR"

export PATH="/opt/homebrew/bin:/opt/homebrew/sbin:/usr/local/bin:/usr/bin:/bin:/usr/sbin:/sbin:$PATH"

is_studio_running() {
  curl -sf "${STUDIO_URL}api/config" >/dev/null 2>&1
}

is_app_running() {
  curl -sf "$APP_URL" >/dev/null 2>&1
}

start_studio_server() {
  cd "$REPO_DIR"
  nohup "$NPM_BIN" run hc-studio >>"$STUDIO_LOG_FILE" 2>&1 &
}

start_app_server() {
  cd "$REPO_DIR"
  nohup "$NPM_BIN" run dev >>"$APP_LOG_FILE" 2>&1 &
}

if ! is_studio_running; then
  start_studio_server

  for _ in {1..30}; do
    if is_studio_running; then
      break
    fi
    sleep 1
  done
fi

if ! is_app_running; then
  start_app_server

  for _ in {1..30}; do
    if is_app_running; then
      break
    fi
    sleep 1
  done
fi

open "$APP_URL"
open "$STUDIO_URL"
