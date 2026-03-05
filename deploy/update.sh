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
SCRIPT_PATH="$REPO_ROOT/deploy/update.sh"
FRONTEND_DIR="$REPO_ROOT/frontend"
BACKEND_DIR="$REPO_ROOT/backend"
WEBROOT="/var/www/dashboard"
SERVICE="pulse"

log() { echo "[$(date '+%H:%M:%S')] $*"; }

# ── Detect deployment mode ─────────────────────────────────────────────────
DASHBOARD_CONTAINER=""
if command -v docker &>/dev/null; then
    DASHBOARD_CONTAINER=$(docker ps -a --filter "name=dashboard" --format '{{.Names}}' | head -1)
fi

if [[ -n "$DASHBOARD_CONTAINER" ]]; then
    MODE="docker"
    log "Detected Docker deployment (container: $DASHBOARD_CONTAINER)"
else
    MODE="system"
    log "Detected system nginx deployment"
fi

# ── Pull latest code ──────────────────────────────────────────────────────
log "Pulling latest code from main..."
git -C "$REPO_ROOT" fetch origin main
git -C "$REPO_ROOT" checkout main
git -C "$REPO_ROOT" pull origin main

# Re-exec the updated script if it changed during git pull
if [[ "${UPDATE_REEXEC:-}" != "1" ]]; then
    log "Re-executing updated script..."
    UPDATE_REEXEC=1 exec bash "$SCRIPT_PATH"
fi

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

    # Ensure host.docker.internal resolves inside the container
    HOST_IP=$(ip -4 addr show docker0 2>/dev/null | grep -oP '(?<=inet\s)\d+(\.\d+){3}' || echo "172.17.0.1")
    docker exec "$DASHBOARD_CONTAINER" sh -c \
        "grep -q host.docker.internal /etc/hosts 2>/dev/null || echo '$HOST_IP host.docker.internal' >> /etc/hosts"

    # Copy the Docker-specific nginx config (proxies /api/ to host backend)
    docker cp "$REPO_ROOT/deploy/nginx-dashboard-docker.conf" \
        "$DASHBOARD_CONTAINER:/etc/nginx/conf.d/default.conf"
    # Copy the built frontend files
    docker cp "$WEBROOT/." "$DASHBOARD_CONTAINER:/usr/share/nginx/html/"
    docker restart "$DASHBOARD_CONTAINER"
    log "Docker dashboard container restarted."
else
    log "Reloading system nginx..."
    nginx -t && systemctl reload nginx
fi

log "Update complete! Dashboard is live."
