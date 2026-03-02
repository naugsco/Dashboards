#!/usr/bin/env bash
set -e

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_DIR="$REPO_ROOT/backend"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

log "Pulling latest code from main..."
git -C "$REPO_ROOT" fetch origin main
git -C "$REPO_ROOT" checkout main
git -C "$REPO_ROOT" pull origin main

log "Updating Python dependencies..."
pip install -r "$BACKEND_DIR/requirements.txt" -q

log "Restarting backend..."
RESTARTED=false
# Try systemd (check common service names)
for svc in dashboard backend dashboard-backend uvicorn; do
    if systemctl is-active --quiet "$svc" 2>/dev/null; then
        systemctl restart "$svc"
        log "Restarted systemd service: $svc"
        RESTARTED=true
        break
    fi
done
# Try supervisord
if ! $RESTARTED && command -v supervisorctl &>/dev/null; then
    if supervisorctl status 2>/dev/null | grep -qiE "backend|uvicorn|dashboard"; then
        supervisorctl restart all
        log "Restarted via supervisorctl"
        RESTARTED=true
    fi
fi
# Try PM2
if ! $RESTARTED && command -v pm2 &>/dev/null; then
    if pm2 list 2>/dev/null | grep -q online; then
        pm2 restart all
        log "Restarted via pm2"
        RESTARTED=true
    fi
fi
if ! $RESTARTED; then
    log "WARNING: Could not detect a process manager. Backend process may need a manual restart."
fi

log "Rebuilding React frontend..."
cd "$FRONTEND_DIR"
yarn install          # no --frozen-lockfile: yarn.lock is not committed to the repo
yarn build
