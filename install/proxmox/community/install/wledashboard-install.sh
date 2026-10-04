#!/usr/bin/env bash

# Copyright (c) 2026 upioneer
# Author: upioneer
# License: MIT
# NOTE: This installer script file only is MIT licensed for community-scripts
# distribution. The WLEDashboard application it installs remains proprietary
# software, All Rights Reserved (see https://github.com/upioneer/WLEDashboard LICENSE.md).
# Source: https://wledashboard.com | Github: https://github.com/upioneer/WLEDashboard

source /dev/stdin <<<"$FUNCTIONS_FILE_PATH"
color
verb_ip6
catch_errors
setting_up_container
network_check
update_os

setup_deb_based() {
  msg_info "Installing base dependencies"
  $STD apt-get install -y --no-install-recommends \
    curl \
    sudo \
    git \
    ca-certificates \
    gnupg \
    build-essential \
    python3 \
    libstdc++6
  msg_ok "Installed base dependencies"

  msg_info "Setting up Node.js 22 LTS (NodeSource)"
  mkdir -p /etc/apt/keyrings
  curl -fsSL https://deb.nodesource.com/gpgkey/nodesource-repo.gpg.key | gpg --dearmor --yes -o /etc/apt/keyrings/nodesource.gpg
  echo "deb [signed-by=/etc/apt/keyrings/nodesource.gpg] https://deb.nodesource.com/node_22.x nodistro main" >/etc/apt/sources.list.d/nodesource.list
  $STD apt-get update
  $STD apt-get install -y nodejs
  msg_ok "Installed Node.js $(node -v)"

  msg_info "Cloning WLEDashboard"
  $STD git clone https://github.com/upioneer/WLEDashboard.git /opt/wledashboard
  mkdir -p /opt/wledashboard/data
  msg_ok "Cloned WLEDashboard"

  msg_info "Installing npm dependencies (this takes a while)"
  cd /opt/wledashboard
  $STD npm install
  msg_ok "Installed npm dependencies"

  msg_info "Compiling web frontend (production build)"
  export NODE_OPTIONS="--max-old-space-size=1536"
  $STD npm run build --workspace=apps/web
  msg_ok "Compiled web frontend"

  msg_info "Creating Service"
  cat <<EOF >/etc/systemd/system/wledashboard.service
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
ExecStart=/usr/bin/node /opt/wledashboard/apps/api/src/server.js
Restart=always
RestartSec=5
LimitNOFILE=65536

[Install]
WantedBy=multi-user.target
EOF
  systemctl enable -q --now wledashboard.service
  msg_ok "Created Service"

  msg_info "Creating update helper"
  cat <<'EOF' >/opt/wledashboard/update.sh
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
  msg_ok "Created update helper"
}

run_os_setup

motd_ssh
customize
cleanup_lxc
