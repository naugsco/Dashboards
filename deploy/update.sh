+21
Lines changed: 21 additions & 0 deletions
Original file line number	Original file line	Diff line number	Diff line change
@@ -0,0 +1,21 @@
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
