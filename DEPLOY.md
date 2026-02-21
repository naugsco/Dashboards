# Deploying Pulse Dashboard to Your Hostinger VPS

## Before You Start — Gather These Three Things

### 1. MongoDB Atlas connection string (free)
1. Sign up at **cloud.mongodb.com**
2. Create a cluster → choose **M0 Free**
3. Click **Connect** → **Drivers** → copy the connection string
   - It looks like: `mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/`
4. In **Network Access**, add `0.0.0.0/0` (allow from anywhere)

### 2. NewsAPI key (free)
1. Sign up at **newsapi.org**
2. Copy your API key from the dashboard

### 3. Your GitHub repository URL
- Public repo: `https://github.com/yourname/yourrepo.git`
- Private repo: `https://<PERSONAL_ACCESS_TOKEN>@github.com/yourname/yourrepo.git`
  - Generate a token at GitHub → Settings → Developer settings → Personal access tokens → **Tokens (classic)**
  - Minimum scope: `repo`

---

## Step 1 — Open Port 80 in Hostinger

In the **Hostinger control panel**:
1. Go to your VPS → **Firewall**
2. Add a rule: **Port 80, TCP, Allow**

> The setup script cannot do this — it must be done in the panel.

---

## Step 2 — SSH into Your VPS and Run the Setup Script

```bash
ssh root@YOUR_VPS_IP
```

Then run the setup script directly from the repo:

```bash
bash <(curl -fsSL https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/claude/deploy-dashboard-live-BlXG5/deploy/setup-vps.sh)
```

> **Or**, if you prefer to inspect it first:
> ```bash
> curl -O https://raw.githubusercontent.com/YOUR_USER/YOUR_REPO/claude/deploy-dashboard-live-BlXG5/deploy/setup-vps.sh
> cat setup-vps.sh   # read it
> bash setup-vps.sh
> ```

The script will prompt you for your **GitHub repository URL** then run for **3–5 minutes**.

**What it does automatically:**
- Updates Ubuntu packages
- Adds 1 GB swap (prevents out-of-memory during React build)
- Installs nginx, Python 3, Node.js 18
- Clones the repo to `/opt/dashboard`
- Installs Python dependencies in a virtual environment
- Builds the React frontend
- Configures nginx and systemd

---

## Step 3 — Fill In Your Environment Variables

When the script finishes it will print two final steps. Run them:

```bash
cp /opt/dashboard/deploy/backend.env.example /opt/dashboard/backend/.env
nano /opt/dashboard/backend/.env
```

Fill in the three values:

```
MONGO_URL=mongodb+srv://user:pass@cluster0.xxxxx.mongodb.net/?retryWrites=true&w=majority
DB_NAME=pulse_dashboard
NEWS_API_KEY=your_newsapi_key_here
CORS_ORIGINS=*
```

Save and exit (`Ctrl+O`, `Enter`, `Ctrl+X`).

---

## Step 4 — Start the Backend Service

```bash
systemctl start pulse
systemctl status pulse
```

You should see `Active: active (running)`.

**Your dashboard is now live at `http://YOUR_VPS_IP`**

---

## Verify Everything Is Working

```bash
# Backend API responds:
curl http://localhost/api/news

# View live backend logs:
journalctl -u pulse -f

# Check nginx is running:
systemctl status nginx
```

Open `http://YOUR_VPS_IP` in a browser — news cards should appear within 30 seconds of first start.

---

## Deploying Future Updates

After pushing new code to GitHub:

```bash
ssh root@YOUR_VPS_IP
bash /opt/dashboard/deploy/update.sh
```

This pulls the latest code, reinstalls dependencies if needed, rebuilds the frontend, and restarts the service.

---

## Adding a Domain + HTTPS (Optional, When Ready)

1. Point your domain's DNS A record to `YOUR_VPS_IP`
2. SSH into the VPS and run:

```bash
apt-get install -y certbot python3-certbot-nginx
certbot --nginx -d yourdomain.com
```

Certbot automatically configures nginx for HTTPS and sets up auto-renewal.

3. Open port 443 in the Hostinger firewall (same way as port 80).

---

## Troubleshooting

| Symptom | Check |
|---|---|
| Site not loading | Port 80 open in Hostinger firewall? `systemctl status nginx` |
| "502 Bad Gateway" | Backend running? `systemctl status pulse` / `journalctl -u pulse -n 50` |
| No news showing | `.env` values correct? MongoDB IP whitelist includes `0.0.0.0/0`? |
| Service won't start | `journalctl -u pulse -n 50` — usually a bad `.env` value |
| Build ran out of memory | Swap was created by setup script; re-run if you added more RAM |
