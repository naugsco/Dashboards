#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# update.sh — Pull latest code and redeploy the Pulse Dashboard
#
# Run on your VPS as root whenever you push changes:
#   sudo bash /opt/dashboard/deploy/update.sh
# ══════════════════════════════════════════════════════════════════════════════
set -euo pipefail

APP_DIR="/opt/dashboard"
WEBROOT="/var/www/dashboard"
SERVICE="pulse"
BRANCH="main"

GREEN='\033[0;32m'; BOLD='\033[1m'; NC='\033[0m'
step() { echo -e "\n${GREEN}${BOLD}[$(date +%H:%M:%S)]${NC} $*"; }

[[ $EUID -ne 0 ]] && echo "Run as root: sudo bash update.sh" && exit 1

step "Pulling latest code from $BRANCH..."
git -C "$APP_DIR" fetch origin "$BRANCH"
git -C "$APP_DIR" checkout "$BRANCH"
git -C "$APP_DIR" pull origin "$BRANCH"

step "Updating Python dependencies..."
cd "$APP_DIR/backend"
source venv/bin/activate
pip install --quiet -r requirements.txt
deactivate

step "Rebuilding React frontend..."
cd "$APP_DIR/frontend"
yarn install --silent
REACT_APP_BACKEND_URL="" yarn build

cp -r build/. "$WEBROOT/"
chown -R www-data:www-data "$WEBROOT"

step "Restarting backend service..."
systemctl restart "$SERVICE"

echo ""
echo -e "${GREEN}${BOLD}Update complete!${NC}"
echo ""
systemctl status "$SERVICE" --no-pager -l
