#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# update.sh — Pull latest code, rebuild, and redeploy
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

log() { echo "[$(date '+%H:%M:%S')] $*"; }

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

log "Reloading nginx..."
nginx -t && systemctl reload nginx

log "Update complete! Dashboard is live."
