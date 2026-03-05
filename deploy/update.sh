#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# update.sh — Pull latest code, rebuild, and redeploy
#
# Supports two deployment modes:
#   1. Docker (Traefik + nginx container) — detected automatically
#   2. System nginx — fallback if no dashboard container is found
#
# Run from the VPS:
#   sudo bash /opt/dashboard/deploy/update.sh
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_DIR="$REPO_ROOT/backend"
WEBROOT="/var/www/dashboard"
SERVICE="pulse"
DASHBOARD_CONTAINER=""

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ── Detect deployment mode ─────────────────────────────────────────────────
detect_mode() {
    # Look for a running or stopped Docker dashboard container
    if command -v docker &>/dev/null; then
        DASHBOARD_CONTAINER=$(docker ps -a --filter "name=dashboard" --format '{{.Names}}' | head -1)
    fi

    if [[ -n "$DASHBOARD_CONTAINER" ]]; then
        log "Detected Docker deployment (container: $DASHBOARD_CONTAINER)"
        echo "docker"
    else
        log "Detected system nginx deployment"
        echo "system"
    fi
}

MODE=$(detect_mode)

log "Pulling latest code from main..."
git -C "$REPO_ROOT" fetch origin main
git -C "$REPO_ROOT" checkout main
git -C "$REPO_ROOT" pull origin main

log "Updating Python dependencies..."
"$BACKEND_DIR/venv/bin/pip" install -r "$BACKEND_DIR/requirements.txt" -q

log "Rebuilding React frontend..."
cd "$FRONTEND_DIR"
yarn install --frozen-lockfile
REACT_APP_BACKEND_URL="" yarn build

log "Deploying frontend to $WEBROOT..."
mkdir -p "$WEBROOT"
rm -rf "$WEBROOT"/*
cp -r build/. "$WEBROOT/"
chown -R www-data:www-data "$WEBROOT"

log "Restarting backend service..."
systemctl restart "$SERVICE"

# ── Reload the correct web server ──────────────────────────────────────────
if [[ "$MODE" == "docker" ]]; then
    log "Copying frontend build into Docker container ($DASHBOARD_CONTAINER)..."
    docker cp "$WEBROOT/." "$DASHBOARD_CONTAINER:/usr/share/nginx/html/"
    docker restart "$DASHBOARD_CONTAINER"
    log "Docker dashboard container restarted."
else
    log "Reloading system nginx..."
    nginx -t && systemctl reload nginx
fi

log "Update complete! Dashboard is live."
