#!/usr/bin/env bash
# ══════════════════════════════════════════════════════════════════════════════
# setup-vps.sh — First-time setup for Pulse Dashboard on Ubuntu 20.04/22.04
#
# Run on your VPS as root:
#   sudo bash setup-vps.sh
#
# What this script does:
#   1. Updates system packages
#   2. Adds 1GB swap (prevents out-of-memory during React build on low-RAM VPS)
#   3. Installs nginx, Python 3, Node.js 18
#   4. Clones the repository to /opt/dashboard
#   5. Creates Python virtual environment and installs dependencies
#   6. Builds the React frontend
#   7. Configures nginx to serve the frontend and proxy API calls
#   8. Installs and enables the systemd background service
# ══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

APP_DIR="/opt/dashboard"
WEBROOT="/var/www/dashboard"
SERVICE="pulse"
BRANCH="main"

# Colour helpers
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
step()  { echo -e "\n${GREEN}${BOLD}[$(date +%H:%M:%S)]${NC} $*"; }
warn()  { echo -e "${YELLOW}[WARN]${NC} $*"; }
die()   { echo -e "${RED}[ERROR]${NC} $*"; exit 1; }

[[ $EUID -ne 0 ]] && die "Run this script as root: sudo bash setup-vps.sh"

echo -e "${BOLD}════════════════════════════════════════════════${NC}"
echo -e "${BOLD}   Pulse Dashboard — VPS Setup                  ${NC}"
echo -e "${BOLD}════════════════════════════════════════════════${NC}"
echo ""
echo "This will install all dependencies and deploy your dashboard."
echo ""

# Get repository URL
read -rp "Enter your GitHub repository URL: " REPO_URL
[[ -z "$REPO_URL" ]] && die "Repository URL is required."

# ── 1. System update ──────────────────────────────────────────────────────────
step "1/7 Updating system packages..."
apt-get update -q
apt-get upgrade -y -q

# ── 2. Swap file ──────────────────────────────────────────────────────────────
step "2/7 Setting up swap (prevents OOM during build)..."
if [[ ! -f /swapfile ]]; then
    fallocate -l 1G /swapfile
    chmod 600 /swapfile
    mkswap /swapfile
    swapon /swapfile
    echo '/swapfile none swap sw 0 0' >> /etc/fstab
    echo "  Created 1GB swap file."
else
    warn "Swap already exists — skipping."
fi

# ── 3. System dependencies ────────────────────────────────────────────────────
step "3/7 Installing system packages..."
apt-get install -y -q nginx python3 python3-pip python3-venv git curl

echo "  Installing Node.js 18 LTS..."
curl -fsSL https://deb.nodesource.com/setup_18.x | bash - > /dev/null 2>&1
apt-get install -y -q nodejs

echo "  Installing Yarn..."
npm install -g yarn
echo "  Node $(node -v) | Yarn $(yarn -v)"

# ── 4. Clone repository ───────────────────────────────────────────────────────
step "4/7 Cloning repository to $APP_DIR..."
if [[ -d "$APP_DIR/.git" ]]; then
    warn "$APP_DIR already exists — pulling latest changes..."
    git -C "$APP_DIR" fetch origin "$BRANCH"
    git -C "$APP_DIR" checkout "$BRANCH"
    git -C "$APP_DIR" pull origin "$BRANCH"
else
    git clone --branch "$BRANCH" "$REPO_URL" "$APP_DIR"
fi

# ── 5. Python virtual environment ─────────────────────────────────────────────
step "5/7 Installing Python backend dependencies..."
cd "$APP_DIR/backend"
python3 -m venv venv
source venv/bin/activate
pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt
deactivate
echo "  Python dependencies installed."

# ── 6. Build React frontend ───────────────────────────────────────────────────
step "6/7 Building React frontend (takes 1–3 minutes)..."
cd "$APP_DIR/frontend"
yarn install --frozen-lockfile
REACT_APP_BACKEND_URL="" yarn build

mkdir -p "$WEBROOT"
cp -r build/. "$WEBROOT/"
chown -R www-data:www-data "$WEBROOT"
echo "  Frontend built and copied to $WEBROOT"

# ── 7. Nginx + systemd ────────────────────────────────────────────────────────
step "7/7 Configuring nginx and systemd..."

# Nginx
cp "$APP_DIR/deploy/nginx-dashboard.conf" /etc/nginx/sites-available/dashboard
ln -sf /etc/nginx/sites-available/dashboard /etc/nginx/sites-enabled/dashboard
rm -f /etc/nginx/sites-enabled/default
nginx -t
systemctl enable nginx
systemctl restart nginx
echo "  Nginx configured."

# Give www-data ownership of backend directory
chown -R www-data:www-data "$APP_DIR/backend"

# Systemd service
cp "$APP_DIR/deploy/pulse.service" /etc/systemd/system/
systemctl daemon-reload
systemctl enable "$SERVICE"
echo "  Systemd service installed (not started yet — .env needed first)."

# ── Done ──────────────────────────────────────────────────────────────────────
VPS_IP=$(curl -s ifconfig.me 2>/dev/null || echo "YOUR_VPS_IP")

echo ""
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════${NC}"
echo -e "${GREEN}${BOLD}  Setup complete!                                ${NC}"
echo -e "${GREEN}${BOLD}════════════════════════════════════════════════${NC}"
echo ""
echo -e "${BOLD}Two steps left before your dashboard goes live:${NC}"
echo ""
echo -e "${BOLD}STEP A — Create your .env file:${NC}"
echo ""
echo "   cp $APP_DIR/deploy/backend.env.example $APP_DIR/backend/.env"
echo "   nano $APP_DIR/backend/.env"
echo ""
echo "   Fill in these three values:"
echo "     MONGO_URL    — from MongoDB Atlas (cloud.mongodb.com, free M0 tier)"
echo "     DB_NAME      — e.g. pulse_dashboard"
echo "     NEWS_API_KEY — from newsapi.org (free, 100 req/day)"
echo ""
echo -e "${BOLD}STEP B — Start the backend:${NC}"
echo ""
echo "   systemctl start $SERVICE"
echo "   systemctl status $SERVICE"
echo ""
echo -e "Your dashboard will then be live at: ${BOLD}http://$VPS_IP${NC}"
echo ""
echo -e "  TIP: Get a domain (~\$10/yr at cloudflare.com or namecheap.com)"
echo -e "       then enable free HTTPS:"
echo -e "         apt-get install -y certbot python3-certbot-nginx"
echo -e "         certbot --nginx -d yourdomain.com"
echo ""
