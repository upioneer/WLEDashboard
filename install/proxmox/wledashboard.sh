#!/usr/bin/env bash
# Copyright (c) 2026 upioneer / WLEDashboard. All Rights Reserved.
# Proprietary: see the project LICENSE.md. This standalone installer is not
# the community-scripts submission; the MIT licensed submission copies live in
# install/proxmox/community/ (ct/wledashboard.sh + install/wledashboard-install.sh).
# Proxmox VE Helper Script: WLEDashboard LXC Container Creator
# Run this script directly on your Proxmox VE host.

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

# Ensure running on Proxmox VE host
if ! command -v pveversion >/dev/null 2>&1; then
  error "This script must be executed on a Proxmox VE host."
  exit 1
fi

# Ensure terminal input is available when executed via curl pipe
if [ ! -t 0 ] && [ -c /dev/tty ]; then
  exec < /dev/tty
fi

# Determine if whiptail interactive dialogs can be rendered
USE_WHIPTAIL=false
if command -v whiptail >/dev/null 2>&1 && [ -t 0 ] && [ -t 1 ]; then
  USE_WHIPTAIL=true
fi

echo -e "${BL}======================================================${CL}"
echo -e "${BL}          WLEDashboard Proxmox VE Installer           ${CL}"
echo -e "${BL}======================================================${CL}"

# Determine initial defaults
NEXT_CTID=$(pvesh get /cluster/nextid 2>/dev/null | tr -dc '0-9' || true)
if [ -z "$NEXT_CTID" ]; then
  NEXT_CTID="100"
fi
CTID="$NEXT_CTID"
HOSTNAME="wledashboard"
CORES="1"
RAM="2048"
SWAP="1024"
DISK_SIZE="4"
BRIDGE="vmbr0"
VLAN=""
IP_INPUT="dhcp"
GATEWAY=""

# Find default storage for containers
STORAGE=$(pvesm status -content rootdir | awk 'NR>1 {print $1; exit}' || true)
STORAGE=$(echo "${STORAGE:-local-lvm}" | xargs)

# Find template storage
TMPL_STORAGE=$(pvesm status -content vztmpl | awk 'NR>1 {print $1; exit}' || true)
TMPL_STORAGE=$(echo "${TMPL_STORAGE:-local}" | xargs)

# 1. Initial Prompt: Proceed?
if [ "$USE_WHIPTAIL" = true ]; then
  whiptail --backtitle "Proxmox VE Helper Scripts" --title "WLEDashboard LXC" \
    --yesno "This will create a New WLEDashboard LXC Container.\n\nProceed?" 10 58 || {
    info "Installation cancelled by user."
    exit 0
  }
else
  read -r -p "This will create a New WLEDashboard LXC Container. Proceed? [Y/n] " PROCEED
  PROCEED=${PROCEED:-Y}
  if [[ ! "$PROCEED" =~ ^[Yy]$ ]]; then
    info "Installation cancelled by user."
    exit 0
  fi
fi

# 2. Select Settings Mode: Default vs Advanced
MODE="default"
if [ "$USE_WHIPTAIL" = true ]; then
  if whiptail --backtitle "Proxmox VE Helper Scripts" --title "SETTINGS TYPE" \
    --yes-button "Default" --no-button "Advanced" \
    --yesno "Select configuration mode:\n\nDefault: ID ${CTID}, 1 Core, 2048MB RAM, 4GB Disk, Hostname '${HOSTNAME}'\nAdvanced: Customize Container ID, Hostname, CPU, RAM, Disk, Storage, Network" 13 70; then
    MODE="default"
  else
    MODE="advanced"
  fi
else
  read -r -p "Use Default Settings? (ID: $CTID, Name: $HOSTNAME, 1 Core, 2GB RAM, 4GB Disk) [Y/n] " MODE_PROMPT
  MODE_PROMPT=${MODE_PROMPT:-Y}
  if [[ ! "$MODE_PROMPT" =~ ^[Yy]$ ]]; then
    MODE="advanced"
  fi
fi

# 3. Interactive Prompts if Advanced Mode Selected
if [ "$MODE" = "advanced" ]; then
  if [ "$USE_WHIPTAIL" = true ]; then
    # Container ID
    while true; do
      CTID=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "CONTAINER ID" \
        --inputbox "Set Container ID:" 8 58 "$CTID" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
      CTID=$(echo "$CTID" | tr -dc '0-9')
      if [ -z "$CTID" ]; then
        whiptail --backtitle "Proxmox VE Helper Scripts" --title "ERROR" --msgbox "Container ID must be numeric." 8 58
      elif pct status "$CTID" >/dev/null 2>&1 || qm status "$CTID" >/dev/null 2>&1; then
        whiptail --backtitle "Proxmox VE Helper Scripts" --title "ERROR" --msgbox "ID $CTID is already in use by another CT or VM. Please choose a different ID." 8 58
      else
        break
      fi
    done

    # Hostname
    HOSTNAME=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "HOSTNAME" \
      --inputbox "Set Container Hostname:" 8 58 "$HOSTNAME" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    HOSTNAME=$(echo "${HOSTNAME:-wledashboard}" | tr -dc 'a-zA-Z0-9.-')

    # CPU Cores
    CORES=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "CPU CORES" \
      --inputbox "Allocate CPU Cores:" 8 58 "$CORES" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    CORES=$(echo "$CORES" | tr -dc '0-9')
    CORES=${CORES:-1}

    # RAM
    RAM=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "RAM ALLOCATION (MB)" \
      --inputbox "Allocate RAM in Megabytes:" 8 58 "$RAM" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    RAM=$(echo "$RAM" | tr -dc '0-9')
    RAM=${RAM:-1024}

    # Swap
    SWAP=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "SWAP ALLOCATION (MB)" \
      --inputbox "Allocate Swap in Megabytes:" 8 58 "$SWAP" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    SWAP=$(echo "$SWAP" | tr -dc '0-9')
    SWAP=${SWAP:-512}

    # Disk Size (in GB)
    DISK_SIZE=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "DISK SIZE" \
      --inputbox "Set Disk Size in GB (integer, e.g. 4 or 8):" 8 58 "$DISK_SIZE" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    DISK_SIZE=$(echo "$DISK_SIZE" | tr -dc '0-9')
    DISK_SIZE=${DISK_SIZE:-4}

    # Storage Pool
    STORAGE=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "ROOT STORAGE" \
      --inputbox "Set Root Disk Storage Pool:" 8 58 "$STORAGE" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    STORAGE=$(echo "$STORAGE" | xargs)

    # Bridge
    BRIDGE=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "NETWORK BRIDGE" \
      --inputbox "Set Network Bridge:" 8 58 "$BRIDGE" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    BRIDGE=${BRIDGE:-vmbr0}

    # VLAN Tag
    VLAN=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "VLAN TAG" \
      --inputbox "Set VLAN Tag (leave empty for untagged):" 8 58 "$VLAN" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    VLAN=$(echo "$VLAN" | tr -dc '0-9')

    # IP Address
    IP_INPUT=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "IP ADDRESS" \
      --inputbox "Set IP Address ('dhcp' or CIDR static, e.g. 192.168.1.50/24):" 8 58 "$IP_INPUT" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    IP_INPUT=${IP_INPUT:-dhcp}

    if [ "$IP_INPUT" != "dhcp" ]; then
      GATEWAY=$(whiptail --backtitle "Proxmox VE Helper Scripts" --title "GATEWAY IP" \
        --inputbox "Set Gateway IP Address:" 8 58 "192.168.1.1" 3>&1 1>&2 2>&3) || { info "Installation cancelled."; exit 0; }
    fi
  else
    # Terminal text fallback prompts
    while true; do
      read -r -p "Container ID [$CTID]: " INPUT_CTID
      INPUT_CTID=$(echo "$INPUT_CTID" | tr -dc '0-9')
      CTID=${INPUT_CTID:-$CTID}
      if [ -z "$CTID" ]; then
        error "Container ID must be numeric."
      elif pct status "$CTID" >/dev/null 2>&1 || qm status "$CTID" >/dev/null 2>&1; then
        error "ID $CTID is already in use by another CT or VM. Please choose a different ID."
      else
        break
      fi
    done

    read -r -p "Hostname [$HOSTNAME]: " INPUT_HOSTNAME
    INPUT_HOSTNAME=$(echo "$INPUT_HOSTNAME" | tr -dc 'a-zA-Z0-9.-')
    HOSTNAME=${INPUT_HOSTNAME:-$HOSTNAME}

    read -r -p "CPU Cores [$CORES]: " INPUT_CORES
    INPUT_CORES=$(echo "$INPUT_CORES" | tr -dc '0-9')
    CORES=${INPUT_CORES:-$CORES}

    read -r -p "RAM (MB) [$RAM]: " INPUT_RAM
    INPUT_RAM=$(echo "$INPUT_RAM" | tr -dc '0-9')
    RAM=${INPUT_RAM:-$RAM}

    read -r -p "Swap (MB) [$SWAP]: " INPUT_SWAP
    INPUT_SWAP=$(echo "$INPUT_SWAP" | tr -dc '0-9')
    SWAP=${INPUT_SWAP:-$SWAP}

    read -r -p "Disk Size in GB [$DISK_SIZE]: " INPUT_DISK
    INPUT_DISK=$(echo "$INPUT_DISK" | tr -dc '0-9')
    DISK_SIZE=${INPUT_DISK:-$DISK_SIZE}

    read -r -p "Storage Pool [$STORAGE]: " INPUT_STORAGE
    STORAGE=${INPUT_STORAGE:-$STORAGE}
    STORAGE=$(echo "$STORAGE" | xargs)

    read -r -p "Network Bridge [$BRIDGE]: " INPUT_BRIDGE
    BRIDGE=${INPUT_BRIDGE:-$BRIDGE}

    read -r -p "VLAN Tag (empty for none) [$VLAN]: " INPUT_VLAN
    INPUT_VLAN=$(echo "$INPUT_VLAN" | tr -dc '0-9')
    VLAN=${INPUT_VLAN:-$VLAN}

    read -r -p "IP Address ('dhcp' or CIDR) [$IP_INPUT]: " INPUT_IP
    IP_INPUT=${INPUT_IP:-$IP_INPUT}

    if [ "$IP_INPUT" != "dhcp" ]; then
      read -r -p "Gateway IP: " INPUT_GW
      GATEWAY=${INPUT_GW:-$GATEWAY}
    fi
  fi
fi

# Ensure disk size is strictly an integer in GB without any 'G' suffix
DISK_SIZE_GB=$(echo "$DISK_SIZE" | tr -dc '0-9')
DISK_SIZE_GB=${DISK_SIZE_GB:-4}

# Build network configuration string
NET0="name=eth0,bridge=${BRIDGE}"
NET_DESC="${BRIDGE}"
if [ -n "${VLAN:-}" ]; then
  NET0="${NET0},tag=${VLAN}"
  NET_DESC="${NET_DESC} (VLAN ${VLAN})"
fi

if [ "$IP_INPUT" = "dhcp" ]; then
  NET0="${NET0},ip=dhcp"
  NET_DESC="DHCP on ${NET_DESC}"
else
  NET0="${NET0},ip=${IP_INPUT}"
  if [ -n "${GATEWAY:-}" ]; then
    NET0="${NET0},gw=${GATEWAY}"
  fi
  NET_DESC="${IP_INPUT} on ${NET_DESC}"
fi
NET0="${NET0},type=veth"

info "Container Configuration:"
echo -e "  Container ID:  ${GN}${CTID}${CL}"
echo -e "  Hostname:      ${GN}${HOSTNAME}${CL}"
echo -e "  Cores:         ${GN}${CORES}${CL}"
echo -e "  RAM:           ${GN}${RAM} MB${CL}"
echo -e "  Swap:          ${GN}${SWAP} MB${CL}"
echo -e "  Disk Size:     ${GN}${DISK_SIZE_GB} GB${CL}"
echo -e "  Root Storage:  ${GN}${STORAGE}${CL}"
echo -e "  Network:       ${GN}${NET_DESC}${CL}"

if [ "$MODE" = "advanced" ]; then
  if [ "$USE_WHIPTAIL" = true ]; then
    whiptail --backtitle "Proxmox VE Helper Scripts" --title "CONFIRM CREATION" \
      --yesno "Ready to create container with the selected configuration?\n\nContainer ID: $CTID\nHostname: $HOSTNAME\nCores: $CORES | RAM: ${RAM}MB | Disk: ${DISK_SIZE_GB}GB\nStorage: $STORAGE\nNetwork: $NET_DESC" 14 62 || {
      info "Installation cancelled by user."
      exit 0
    }
  else
    read -r -p "Proceed with container creation? [Y/n] " CONFIRM
    CONFIRM=${CONFIRM:-Y}
    if [[ ! "$CONFIRM" =~ ^[Yy]$ ]]; then
      info "Installation cancelled by user."
      exit 0
    fi
  fi
fi

# Update appliance template cache
info "Updating Proxmox template cache..."
pveam update >/dev/null 2>&1 || true

# Locate Debian 12 (bookworm) standard template
DEBIAN_TMPL=$(pveam available -section system | awk '{print $2}' | grep -E '^debian-12-standard_.*_amd64\.tar\.(zst|xz|gz)$' | sort -V | tail -n1)

if [ -z "$DEBIAN_TMPL" ]; then
  error "Unable to locate Debian 12 LXC template in Proxmox appliance repository."
  exit 1
fi

# Check if template is already downloaded, if not download it
if ! pveam list "$TMPL_STORAGE" | grep -q "$DEBIAN_TMPL"; then
  info "Downloading Debian 12 template ($DEBIAN_TMPL) to storage $TMPL_STORAGE..."
  pveam download "$TMPL_STORAGE" "$DEBIAN_TMPL"
fi

TMPL_PATH="${TMPL_STORAGE}:vztmpl/${DEBIAN_TMPL}"

# Create unprivileged LXC container
info "Creating LXC container $CTID..."
pct create "$CTID" "$TMPL_PATH" \
  --ostype debian \
  --hostname "$HOSTNAME" \
  --cores "$CORES" \
  --memory "$RAM" \
  --swap "$SWAP" \
  --rootfs "${STORAGE}:${DISK_SIZE_GB}" \
  --net0 "$NET0" \
  --unprivileged 1 \
  --features nesting=1 \
  --onboot 1 \
  --start 0

# Start container
info "Starting LXC container $CTID..."
pct start "$CTID"

# Network resolution
if [ "$IP_INPUT" = "dhcp" ]; then
  info "Waiting for container network to acquire IP via DHCP..."
  for i in {1..30}; do
    if pct exec "$CTID" -- ip -4 addr show eth0 2>/dev/null | grep -q 'inet '; then
      break
    fi
    sleep 1
  done

  IP=$(pct exec "$CTID" -- ip -4 addr show eth0 2>/dev/null | awk '/inet / {print $2}' | cut -d/ -f1 | head -n1)

  if [ -z "$IP" ]; then
    warn "Container started but DHCP lease was not immediately detected. Check router DHCP lease."
    IP="<CONTAINER_IP>"
  else
    success "Container acquired IP: $IP"
  fi
else
  IP=$(echo "$IP_INPUT" | cut -d/ -f1)
  success "Container configured with static IP: $IP"
fi

# Run in-container setup script
info "Downloading and transferring setup script to container..."
INSTALL_URL="https://raw.githubusercontent.com/upioneer/WLEDashboard/master/install/proxmox/wledashboard-install.sh"
curl -fsSL "$INSTALL_URL" -o /tmp/wledashboard-install.sh
pct push "$CTID" /tmp/wledashboard-install.sh /tmp/wledashboard-install.sh
rm -f /tmp/wledashboard-install.sh

info "Executing WLEDashboard setup script inside container..."
pct exec "$CTID" -- bash /tmp/wledashboard-install.sh
pct exec "$CTID" -- rm -f /tmp/wledashboard-install.sh

# Verify HTTP endpoint is responding
info "Verifying WLEDashboard HTTP server on port 8301..."
HTTP_OK=false
for i in {1..20}; do
  if pct exec "$CTID" -- curl -fs -o /dev/null "http://127.0.0.1:8301/api/health" 2>/dev/null; then
    HTTP_OK=true
    break
  fi
  sleep 1
done

if [ "$HTTP_OK" = false ]; then
  warn "Service is active but HTTP health endpoint on port 8301 has not responded yet. Status:"
  pct exec "$CTID" -- systemctl status wledashboard.service --no-pager || true
fi

echo ""
echo -e "${GN}======================================================${CL}"
echo -e "${GN}       WLEDashboard Installed Successfully!           ${CL}"
echo -e "${GN}======================================================${CL}"
echo -e "Access the web dashboard in your browser at:"
echo -e "  ${BL}http://${IP}:8301${CL}"
echo ""
echo -e "Container Details:"
echo -e "  Container ID:  $CTID"
echo -e "  Status:        Running (auto-starts on boot)"
echo -e "  Data Path:     /opt/wledashboard/data"
echo ""
echo -e "To update WLEDashboard in the future, run:"
echo -e "  ${YW}pct exec $CTID -- update-wledashboard${CL}"
echo -e "======================================================"
