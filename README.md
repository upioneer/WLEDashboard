# WLEDashboard

<!-- [![GitHub Release](https://img.shields.io/github/v/release/upioneer/WLEDashboard?color=3b82f6&logo=github&label=Release)](https://github.com/upioneer/WLEDashboard/releases) -->
[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red)](LICENSE.md)
[![Docker Image](https://img.shields.io/badge/Docker-ghcr.io-2496ED?logo=docker&logoColor=white)](https://github.com/upioneer/WLEDashboard/pkgs/container/wledashboard)
[![Proxmox LXC](https://img.shields.io/badge/Proxmox-LXC%20Script-E57000?logo=proxmox&logoColor=white)](install/proxmox/README.md)
[![HACS Integration](https://img.shields.io/badge/HACS-Custom-41BDF5?logo=homeassistant&logoColor=white)](custom_components/wledashboard/)
[![Website](https://img.shields.io/badge/Website-wledashboard.com-8b5cf6?logo=googlechrome&logoColor=white)](https://wledashboard.com)

A high performance, local first control surface for WLED devices. Control 1 to 100+ LED controllers from a single responsive interface with spring physics animations, group management, and automatic mDNS network discovery.

> [!NOTE]
> **Default Port Relocation (v0.21.0+)**: Default application networking has moved from port `3001` to port `8301` to eliminate port collisions with common homelab services such as Z Wave JS UI, Grafana, and Uptime Kuma.
>
> * **New Deployments**: Access WLEDashboard directly at `http://<host-ip>:8301`.
> * **Existing / Upgrading Installations**: Update the `ports` mapping in your `docker-compose.yml` to `"8301:8301"`.
> * **Preserving Existing Port 3001 Bookmarks**: If you wish to retain existing browser bookmarks, Home Assistant dashboard links, or reverse proxy routes on port 3001, map host port 3001 to container port 8301 in your `docker-compose.yml`:
>   ```yaml
>   ports:
>     - "3001:8301"
>   ```

## UI Highlights

### Interactive Demo Mode

Explore the full dashboard, device controls, 3D spatial floorplans, and simulated OTA firmware updates in an in-memory virtualized hardware sandbox with zero physical microcontrollers attached.

![Interactive Demo Mode](project_details/changelog/v0.23.0/screenshots/demo_preview_dashboard.png)

### Virtual Sandbox & Safe Isolation

Safely evaluate features, test multi-room configurations, and flash virtual firmware with complete isolation. Real physical devices and database records remain hidden and untouched while exploring the sandbox.

![Demo Mode Activation Modal](project_details/changelog/v0.23.0/screenshots/demo_preview_modal.png)

### Dashboard

Control all your WLED devices with real time power toggles, dynamic brightness sliders with responsive color glow, anti-aliased conic-gradient color wheel pickers, four corner symmetrical hardware and action chicklets, and live telemetry headers.

![WLEDashboard Main Dashboard](project_details/changelog/v0.18.0/screenshots/01-dashboard-grid.png)

### Group Management

Organize devices into physical zones, synchronized scenes, and custom lighting clusters. Control group power, group brightness, and group colors simultaneously with automatic device command distribution.

![WLEDashboard Groups View](project_details/changelog/v0.18.0/screenshots/02-groups-view.png)

### Group Editor Modal

Easily build and customize lighting groups with custom color palettes, group type classifications (Zone, Scene, Sync, Custom), device member selection, and nested child group clustering.

![Group Editor Modal](project_details/changelog/v0.18.0/screenshots/03-group-modal.png)

### Automation & Schedules

Automate lighting based on fixed times or astronomical sunrise/sunset triggers (`suncalc`). Build multi-step routine timelines with custom delay intervals between step actions.

![Automation & Schedules](project_details/changelog/v0.18.0/screenshots/04-automation-view.png)

### 3D Spatial Viewport

Experience your lighting in 3D space with Three.js and React Three Fiber. View procedural room geometries, wireframe wall bounds, and real-time emissive LED light strips that pulse and glow matching actual device color and brightness. Includes a stunning holographic Earth orbital sequence.

![3D Spatial Viewport](project_details/changelog/v0.23.0/screenshots/demo_preview_spatial.png)

### Studio 3D Objects Designer

Design custom 3D physical lighting installations across 8 geometric topologies including cone trees, rings, spheres, arches, and spirals. Preview real-time LED string routing, visualize muted structural scaffolding, and calculate accurate power injection and wire gauge requirements.

![Studio 3D Objects Designer](project_details/changelog/v0.25.0/screenshots/studio_3d_objects.png)

### Effect Studio & Preset Browser

Explore 50 authentic WLED effect simulations on a pinned live 60-pixel LED strip canvas, toggle between multi-column cards and compact dropdown/list view, design custom 2D matrix artwork with zoom and eraser controls, and compose multi-track keyframe timelines.

![Effect Studio and Preset Browser](project_details/changelog/v0.25.0/screenshots/studio_preset_list_view.png)

### How-To & Architecture Documentation Hub

In-depth documentation hub integrated directly into the application with interactive tables, mobile installation instructions, group synchronization mechanics, and Home Assistant setup guides.

![Documentation Hub](project_details/changelog/v0.18.0/screenshots/07-guides-docs.png)

### Mobile Progressive Web App (PWA)

Install WLEDashboard directly to your mobile home screen on iOS and Android for a seamless full-screen native experience without browser navigation bars or address controls.

![Mobile Progressive Web App](project_details/changelog/v0.18.0/screenshots/08-mobile-dashboard.png)

### Selective Backup Restore

Restore exactly what you need from any backup with per category opt in checkboxes covering devices, groups, presets, settings, automations, spatial layouts, and studio content. A dependency validator keeps parent references coherent by skipping orphaned child records automatically, in both merge and replace modes.

![Selective Backup Restore](project_details/changelog/v0.24.0/screenshots/settings-restore-scope.png)

---

## Core Features

* **Local First Architecture**: SQLite storage with WAL journal mode. Zero cloud dependency, zero external account required, all data stays on your local network.
* **Automatic Device Discovery**: mDNS network scanning (`_wled._tcp`) automatically discovers WLED controllers on your local network and populates MAC addresses, firmware versions, and LED counts.
* **3D Spatial Viewport**: WebGL 3D canvas powered by Three.js & React Three Fiber. Render 3D floor plans, spatial light anchors, and real-time emissive light strip meshes.
* **Spring Physics Motion**: Dynamic damped harmonic oscillator spring engine drives interactive UI controls, toggle switches, hover elevations, and card transitions.
* **Group Management & Nesting**: Organize controllers into Zone, Scene, Sync, or Custom groups. Support for nested child groups and concurrent group command execution.
* **Automation & Schedules Engine**: Astronomical sunrise/sunset calculations (`suncalc`), time-based schedules, step-by-step routine timelines, and a 30s background scheduler loop.
* **Dashboard Group Clustering**: Instant toggle between individual device grid view and group cluster cards for high density setups.
* **JSON Configuration Backup**: Full export and import capabilities for backing up, restoring, or transferring dashboard state and device configurations.
* **Fastify & WebSocket Backend**: Fast Node.js API server with low latency WebSocket connection pushing live WLED state updates instantly to all connected clients.
* **Docker Ready**: Multi stage Docker container support with host networking for seamless local network mDNS multicast discovery.

---

## Architecture Overview

```
+-------------------------------------------------------------+
|                      WLEDashboard Web                       |
|   (Vite + React 19 + Zustand + Spring Physics Engine)       |
+------------------------------+------------------------------+
                               |
                               | HTTP / WebSocket
                               v
+-------------------------------------------------------------+
|                      WLEDashboard API                       |
|   (Fastify + SQLite WAL + mDNS Discovery + Polling Engine)  |
+------------------------------+------------------------------+
                               |
                               | LAN JSON API (/json/state)
                               v
+-------------------------------------------------------------+
|                     WLED Controllers                        |
|        [Device 1]       [Device 2]       [Device 3+]        |
+-------------------------------------------------------------+
```

---

## Deployment (Docker Compose)

WLEDashboard provides pre-built container images published to the GitHub Container Registry (`ghcr.io/upioneer/wledashboard:latest`). To ensure a consistent, zero-configuration environment across all operating systems, deployment via Docker Compose is the recommended installation method.

### Using Docker Compose (Recommended)

Create a `docker-compose.yml` file (or use the one included in the repository root):

```yaml
services:
  wledashboard:
    image: ghcr.io/upioneer/wledashboard:latest
    container_name: wledashboard
    restart: unless-stopped
    ports:
      - "8301:8301"
    volumes:
      - wledashboard_data:/app/data
    environment:
      - NODE_ENV=production

volumes:
  wledashboard_data:
```

Start the container in detached mode:

```bash
docker compose up -d
```

### Using Docker CLI

```bash
docker run -d \
  --name wledashboard \
  -p 8301:8301 \
  -e NODE_ENV=production \
  -e PORT=8301 \
  -e DATA_DIR=/app/data \
  -v wledashboard_data:/app/data \
  --restart unless-stopped \
  ghcr.io/upioneer/wledashboard:latest
```

Access the application in your browser at `http://localhost:8301`.

* Persistence: All configuration, groups, and device states persist in the `wledashboard_data` volume mounted to `/app/data`.
* Local Discovery: Standard bridge port mapping routes web traffic on port 8301 (preventing collisions with Z-Wave JS UI, Grafana, or Uptime Kuma). On Linux bare metal hosts or LXC containers where mDNS broadcast discovery across subnets is required, `network_mode: host` can optionally be configured.

### Updating WLEDashboard (Zero Downtime)

To update to the latest release without losing any configuration or database records:

```bash
docker compose pull && docker compose up -d
```

* Preserving Bookmarks: If upgrading from versions prior to v0.21.0 and you wish to keep browser bookmarks on port 3001, map `3001:8301` under the ports section in your `docker-compose.yml`.
* Automated Updates with Watchtower (Opt-In): The included `docker-compose.yml` provides a commented `com.centurylinklabs.watchtower.enable=true` label. Uncomment this label if you run Watchtower and wish to automate background container updates.

---

## Deployment (Proxmox VE LXC)

Deploy WLEDashboard as an unprivileged Debian 12 LXC container on Proxmox VE with automated systemd service management and dedicated bridge networking:

```bash
bash -c "$(curl -fsSL https://raw.githubusercontent.com/upioneer/WLEDashboard/master/install/proxmox/wledashboard.sh)"
```

* Turnkey Execution: Provisions an LXC container with 1 CPU core, 2048MB RAM, and 1024MB Swap for build headroom (runtime consumption is only ~45MB to 90MB).
* Native Service: Runs as a managed `systemd` service (`wledashboard.service`) listening on port 8301 with auto-restart on boot.
* Direct Host Shell Access: Drop into the container root shell from your Proxmox host via `pct enter <CTID>` (or connect to serial console via `pct console <CTID>`).
* Ad-Hoc Host Commands: Execute commands directly without entering the container using `pct exec <CTID> -- <command>`.
* One-Command Container Updates: To update the LXC installation in the future, run `pct exec <CTID> -- update-wledashboard` from the Proxmox host shell.

---

## Roadmap

* **MagicPlan / Polygon Floorplan Imports**: Interpret complex geometric shapes, L-shaped rooms, and non-rectangular walls to accurately reconstruct advanced 3D spatial layouts from popular floorplan apps.
* **Community Preset Hub**: Browse, download, and share custom pixel art and dynamic WLED effect presets with the community.
* **Multi-Instance Dashboard Sync**: Synchronize configuration across multiple browser tabs and devices in real-time.

---

## License & Terms of Use

Copyright (c) 2026 Jasen Henry. All Rights Reserved.

WLEDashboard is proprietary software. You are welcome to deploy, self-host, and run WLEDashboard for personal, non-commercial home automation.

* **No Redistribution**: Copying, mirroring, redistributing, or publishing the source code, container images, or binaries without explicit written permission is strictly prohibited.
* **No Unauthorized Modifications**: Creating public derivatives, unauthorized forks with modifications, or redistributed builds is not permitted under the copyright terms.
* **Terms & Inquiries**: For full legal provisions, review [LICENSE.md](LICENSE.md). For commercial licensing or inquiries, please contact the repository owner.
