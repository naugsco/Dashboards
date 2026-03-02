
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
log "Rebuilding React frontend..."
cd "$FRONTEND_DIR"
yarn install --frozen-lockfile
yarn build
