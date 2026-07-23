#!/usr/bin/env bash
# ==============================================================================
#  deploy/setup-lxc.sh
#  Generic robust configuration script for Linux/LXC Nginx deployments.
#  Uses robust awk back-brace insertion to safely register location blocks
#  in shared hosts without escaping/newline errors.
# ==============================================================================
set -euo pipefail

# Dynamic configuration based on parent folders or defaults
PROJECT_NAME="test-site"
if [ -d "/tmp/hub-mai-skill-store-dist" ]; then
    PROJECT_NAME="hub-mai-skill-store"
fi

SITE_DIR="/var/www/${PROJECT_NAME}"
CONF_SRC="$(dirname "$0")/nginx/${PROJECT_NAME}.conf"

# Fallback to default name if file doesn't exist
if [ ! -f "$CONF_SRC" ]; then
    CONF_SRC="$(dirname "$0")/nginx/test-site.conf"
fi

echo "==> Ensuring Nginx is installed..."
if ! command -v nginx &> /dev/null; then
    apt-get update -qq
    apt-get install -y nginx
fi

echo "==> Creating target directory at $SITE_DIR..."
mkdir -p "$SITE_DIR"

echo "==> Copying compiled storefront build assets..."
if [ -d "/tmp/${PROJECT_NAME}-dist/dist" ]; then
    cp -r "/tmp/${PROJECT_NAME}-dist/dist/." "$SITE_DIR/"
else
    cp -r "/tmp/${PROJECT_NAME}-dist/." "$SITE_DIR/"
fi

echo "==> Correcting permissions and www-data ownership..."
chown -R www-data:www-data "$SITE_DIR"
find "$SITE_DIR" -type d -exec chmod 755 {} \;
find "$SITE_DIR" -type f -exec chmod 644 {} \;

echo "==> Registering Nginx location config..."
if [ -d "/etc/nginx/default.d" ]; then
    echo "==> RHEL/CentOS default.d directory detected. Copying location block..."
    cp "$CONF_SRC" "/etc/nginx/default.d/${PROJECT_NAME}.conf"
elif [ -f "/etc/nginx/sites-available/default" ]; then
    echo "==> Debian/Ubuntu default server configuration file detected."
    # Clean up old location block if already registered
    if grep -q "location /${PROJECT_NAME}" "/etc/nginx/sites-available/default"; then
        echo "==> Location block already registered. Overwriting configuration segment..."
        sed -i "/location \/${PROJECT_NAME} {/,/}/d" "/etc/nginx/sites-available/default"
    fi
    
    # Backup configuration file first
    cp "/etc/nginx/sites-available/default" "/etc/nginx/sites-available/default.bak"
    
    # Safely insert the location block inside the server {} block just before the last closing brace using awk
    # This avoids all escaping and newline expansion issues that break standard sed commands
    awk -v conf_path="$CONF_SRC" '
      {
        lines[NR] = $0
      }
      END {
        last_brace_idx = 0
        for (i = NR; i >= 1; i--) {
          if (lines[i] ~ /^[[:space:]]*}[[:space:]]*$/) {
            last_brace_idx = i
            break
          }
        }
        
        for (i = 1; i < last_brace_idx; i++) {
          print lines[i]
        }
        
        print ""
        print "    # ── " conf_path " Block ──"
        while ((getline line < conf_path) > 0) {
          print "    " line
        }
        close(conf_path)
        print ""
        
        for (i = last_brace_idx; i <= NR; i++) {
          print lines[i]
        }
      }
    ' "/etc/nginx/sites-available/default.bak" > "/etc/nginx/sites-available/default"
    echo "==> Successfully appended location block in default server configuration."
else
    echo "==> No standard default block detected. Copying location block directly to conf.d..."
    cp "$CONF_SRC" "/etc/nginx/conf.d/${PROJECT_NAME}.conf"
fi

echo "==> Validating Nginx configuration syntax..."
nginx -t

echo "==> Reloading Nginx service..."
if command -v systemctl &> /dev/null; then
    systemctl reload nginx || systemctl restart nginx
else
    service nginx reload || service nginx restart
fi

echo ""
echo "✅ Site is deployed successfully!"
echo "   Access URL: http://$(hostname -I | awk '{print $1}')/${PROJECT_NAME}/"
