#!/usr/bin/env bash

set -euo pipefail

echo "========================================="
echo "   Enterprise Linux Deployment Agent     "
echo "   Skill: website-deploy-linux           "
echo "========================================="

# 1. Interactive Pre-Flight Sanity Checks (Tapering Expectations)
echo -e "\n[SANITY CHECK 1/3] Asset Path Verification"
echo "If deploying via Shared Host Subdirectory Path, ensure your frontend code uses relative paths."
echo "Example: Use <img src=\"./logo.png\" /> instead of <img src=\"/logo.png\" /> to prevent 404 errors."
read -p "Have you verified your asset paths are relative? (y/n): " ASSET_CONFIRM
if [ "${ASSET_CONFIRM}" != "y" ] && [ "${ASSET_CONFIRM}" != "Y" ]; then
    echo "Deployment aborted. Please fix asset references to continue." >&2
    exit 1
fi

echo -e "\n[SANITY CHECK 2/3] Environment Variables (.env)"
echo "Production builds do not inherit your local uncommitted .env files."
read -p "Do you need to inject environment variables for this build? (y/n): " ENV_CONFIRM
ENV_INJECTIONS=""
if [ "${ENV_CONFIRM}" == "y" ] || [ "${ENV_CONFIRM}" == "Y" ]; then
    read -p "Enter variables formatted for inline bash (e.g., VITE_API_URL='http://api.internal' VAR2='val'): " ENV_INJECTIONS
fi

echo -e "\n[SANITY CHECK 3/3] Target Specifications"
read -p "Enter the Project Name (e.g., my-app): " PROJECT_NAME
echo "Select Routing Strategy:"
echo "  1) Dedicated Virtual Host (FQDN / Custom Domain)"
echo "  2) Shared Host Subdirectory Path (IP or Hostname Path)"
read -p "Enter Selection (1 or 2): " DEPLOY_TYPE
read -p "Enter Source (Git URL OR Local Path): " SOURCE_PATH

# Conditional path mapping based on strategy choice
if [ "${DEPLOY_TYPE}" == "1" ]; then
    read -p "Enter Fully Qualified Domain Name (e.g., app.enterprise.internal): " SERVER_NAME
    NGINX_CONF="/etc/nginx/conf.d/${PROJECT_NAME}.conf"
else
    SERVER_NAME=""
    NGINX_CONF="/etc/nginx/default.d/${PROJECT_NAME}.conf"
fi

TARGET_DIR="/var/www/${PROJECT_NAME}"
BUILD_WORKSPACE="/tmp/deployment-${PROJECT_NAME}"

echo -e "\n--- Validating Host Environment ---"

# 2. Verify Core Dependencies
REQUIRED_CMDS=("nginx" "node" "npm" "rsync")
if [[ "${SOURCE_PATH}" =~ \.git$ ]] || [[ "${SOURCE_PATH}" == git@* ]] || [[ "${SOURCE_PATH}" == http* ]]; then
    REQUIRED_CMDS+=("git")
fi

for cmd in "${REQUIRED_CMDS[@]}"; do
    if ! command -v "$cmd" &> /dev/null; then
        echo "Error: Required system dependency $cmd is not installed." >&2
        exit 1
    fi
done

# 3. Ensure Headless Browser System Dependencies Exist
echo "Verifying Playwright browser dependencies..."
if ! npx playwright install-deps --dry-run &> /dev/null; then
    echo "Headless browser system libraries missing. Installing native dependencies..."
    sudo npx playwright install-deps
fi

# 4. Pre-flight Conflict Validation (Dedicated Virtual Host Strategy Only)
if [ "${DEPLOY_TYPE}" == "1" ] && [ -d "/etc/nginx/conf.d" ]; then
    echo "Checking for Domain Name Conflicts..."
    CONFLICTING_FILE=$(grep -rl "server_name.*${SERVER_NAME}" /etc/nginx/conf.d/ || true)
    
    if [ -n "${CONFLICTING_FILE}" ]; then
        if [ "${CONFLICTING_FILE}" != "${NGINX_CONF}" ]; then
            echo "Error Conflict detected: The domain ${SERVER_NAME} is already assigned to another project in ${CONFLICTING_FILE}" >&2
            exit 1
        fi
        echo "Domain matches existing configuration for this project. Proceeding with update."
    fi
fi

echo -e "\n--- Fetching Source Code ---"
rm -rf "${BUILD_WORKSPACE}"

if [[ "${SOURCE_PATH}" =~ \.git$ ]] || [[ "${SOURCE_PATH}" == git@* ]] || [[ "${SOURCE_PATH}" == http* ]]; then
    git clone "${SOURCE_PATH}" "${BUILD_WORKSPACE}"
else
    if [ -d "${SOURCE_PATH}" ]; then
        mkdir -p "${BUILD_WORKSPACE}"
        rsync -avz --exclude 'node_modules' --exclude '.git' --exclude 'dist' --exclude 'build' "${SOURCE_PATH}/" "${BUILD_WORKSPACE}/"
    else
        echo "Error: Source path is neither a valid Git URL nor an existing directory." >&2
        exit 1
    fi
fi

cd "${BUILD_WORKSPACE}"

echo -e "\n--- Processing Project Build ---"
if [ -f "package.json" ]; then
    npm install
    
    if grep -q '"build":' package.json; then
        if [ "${DEPLOY_TYPE}" == "2" ]; then
            echo "Compiling frontend with base subdirectory path: /${PROJECT_NAME}/"
            # Eval allows safe parsing of dynamic optional environment variables pre-pended to the build string
            eval "${ENV_INJECTIONS} npm run build -- --base=/${PROJECT_NAME}/"
        else
            eval "${ENV_INJECTIONS} npm run build"
        fi
        
        if [ -d "dist" ]; then
            BUILD_SOURCE="dist"
        elif [ -d "build" ]; then
            BUILD_SOURCE="build"
        else
            echo "Error: Build completed but could not locate build or dist output directory." >&2
            exit 1
        fi
    else
        BUILD_SOURCE="."
    fi
else
    BUILD_SOURCE="."
fi

echo -e "\n--- Deploying Assets to Web Root ---"
sudo mkdir -p "${TARGET_DIR}"
# Safe atomic copy ensuring stale files from old builds are deleted automatically
sudo rsync -avz --delete "${BUILD_WORKSPACE}/${BUILD_SOURCE}/" "${TARGET_DIR}/"

sudo chown -R nginx:nginx "${TARGET_DIR}"
sudo find "${TARGET_DIR}" -type d -exec chmod 755 {} \;
sudo find "${TARGET_DIR}" -type f -exec chmod 644 {} \;

if command -v getenforce &> /dev/null && [ "$(getenvforce)" != "Disabled" ] 2>/dev/null; then
    sudo semanage fcontext -a -t httpd_sys_content_t "${TARGET_DIR}(/.*)?" 2>/dev/null || true
    sudo restorecon -Rv "${TARGET_DIR}" > /dev/null
fi

echo -e "\n--- Configuring Nginx ---"
if [ "${DEPLOY_TYPE}" == "1" ]; then
    sudo tee "${NGINX_CONF}" > /dev/null <<EOF
server {
    listen 80;
    server_name ${SERVER_NAME};

    root ${TARGET_DIR};
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    access_log /var/log/nginx/${PROJECT_NAME}_access.log;
    error_log /var/log/nginx/${PROJECT_NAME}_error.log;
}
EOF
else
    sudo mkdir -p /etc/nginx/default.d
    sudo tee "${NGINX_CONF}" > /dev/null <<EOF
location /${PROJECT_NAME} {
    alias ${TARGET_DIR}/;
    index index.html;
    try_files \$uri \$uri/ /${PROJECT_NAME}/index.html;
}
EOF
fi

echo "Validating and Reloading Nginx Configuration..."
if sudo nginx -t; then
    sudo systemctl reload nginx
    echo "Server configuration reloaded successfully."
else
    echo "Error: Nginx configuration test failed. Rolling back local changes." >&2
    sudo rm -f "${NGINX_CONF}"
    exit 1
fi

rm -rf "${BUILD_WORKSPACE}"

# 5. Formulate Target Destination and Fire Automation Testing Suite
if [ "${DEPLOY_TYPE}" == "1" ]; then
    export VALIDATION_URL="http://${SERVER_NAME}"
else
    LOCAL_IP=$(ip route get 1.1.1.1 | awk '{print $7; exit}')
    export VALIDATION_URL="http://${LOCAL_IP}/${PROJECT_NAME}"
fi

echo -e "\n--- Running Post-Deployment Validation Tests ---"
echo "Target Test Environment URL: ${VALIDATION_URL}"
node /opt/agent/skills/validate_site.js