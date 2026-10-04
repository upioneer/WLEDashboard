#!/usr/bin/env bash
# Copyright (c) 2026 upioneer / WLEDashboard. All Rights Reserved.
# Proprietary: see the project LICENSE.md. The MIT licensed community-scripts
# submission copy lives in install/proxmox/community/install/.
# WLEDashboard Native LXC Installation Script (runs inside the container)

set -Eeuo pipefail

YW=$(echo "\033[33m")
BL=$(echo "\033[36m")
RD=$(echo "\033[01;31m")
GN=$(echo "\033[1;92m")
CL=$(echo "\033[m")

info() {
  echo -e "${BL}[INFO]${CL} $1"
}

success() {
  echo -e "${GN}[OK]${CL} $1"
}

warn() {
  echo -e "${YW}[WARN]${CL} $1"
}

error() {
  echo -e "${RD}[ERROR]${CL} $1"
}

# 1. Update package lists and install base dependencies
info "Updating container packages..."
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get upgrade -y
apt-get install -y --no-install-recommends \
  curl \
  sudo \
  git \
  ca-certificates \
  gnupg \
  build-essential \
  python3 \
  libstdc++6

success "Base packages installed."

# 2. Install Node.js 22 LTS (NodeSource)
info "Setting up Node.js 22 LTS repository..."
mkdir -p /etc/apt/keyrings
curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" > /etc/apt/sources.list.d/nodesource.list

apt-get update -y
apt-get install -y nodejs
success "Node.js $(node -v) and npm $(npm -v) installed."

# 3. Setup WLEDashboard application directory
APP_DIR="/opt/wledashboard"
DATA_DIR="${APP_DIR}/data"

if [ -d "$APP_DIR" ]; then
  info "Existing installation found at ${APP_DIR}, updating..."
  cd "$APP_DIR"
  git fetch --all --tags
  git reset --hard origin/master
else
  info "Cloning WLEDashboard repository..."
  git clone https://github.com/upioneer/WLEDashboard.git "$APP_DIR"
  cd "$APP_DIR"
fi

mkdir -p "$DATA_DIR"

# 4. Install npm dependencies and build frontend
info "Installing npm dependencies across workspaces..."
npm install

info "Compiling web frontend (production build)..."
export NODE_OPTIONS="--max-old-space-size=1536"
npm run build --workspace=apps/web
success "Web frontend compiled to ${APP_DIR}/apps/web/dist."

# 5. Create systemd service
info "Configuring systemd service..."
NODE_BIN=$(command -v node || echo "/usr/bin/node")
cat << EOF > /etc/systemd/system/wledashboard.service
[Unit]
Description=WLEDashboard Controller Service
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=/opt/wledashboard
Environment=NODE_ENV=production
Environment=PORT=8301
Environment=DATA_DIR=/opt/wledashboard/data
ExecStart=${NODE_BIN} /opt/wledashboard/apps/api/src/server.js
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable wledashboard.service
systemctl restart wledashboard.service

# Verify service is active
info "Verifying WLEDashboard service status..."
SERVICE_ACTIVE=false
for i in {1..15}; do
  if systemctl is-active --quiet wledashboard.service; then
    SERVICE_ACTIVE=true
    break
  fi
  sleep 1
done

if [ "$SERVICE_ACTIVE" = false ]; then
  error "WLEDashboard service failed to start. Logs:"
  journalctl -u wledashboard.service -n 30 --no-pager
  exit 1
fi
success "WLEDashboard systemd service is active and running."

# 6. Create in-container update script
cat << 'EOF' > /opt/wledashboard/update.sh
#!/usr/bin/env bash
set -Eeuo pipefail
echo "[INFO] Updating WLEDashboard..."
systemctl stop wledashboard
cd /opt/wledashboard
git fetch --all --tags
git pull origin master
npm install
export NODE_OPTIONS="--max-old-space-size=1536"
npm run build --workspace=apps/web
systemctl start wledashboard
echo "[OK] WLEDashboard updated successfully."
EOF

chmod +x /opt/wledashboard/update.sh
ln -sf /opt/wledashboard/update.sh /usr/local/bin/update-wledashboard

# 7. Clean up apt caches
apt-get autoremove -y
apt-get clean
rm -rf /var/lib/apt/lists/*

success "Container installation complete!"
