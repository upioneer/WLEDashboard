# WLEDashboard Operational User Guide & Deployment Manual

Welcome to WLEDashboard, a high performance, local first control surface for WLED LED controllers.

---

## 1. System Requirements & Architecture

* **API Server**: Node.js 22+ with Fastify, SQLite WAL mode, and WebSocket server (`:3001`).
* **Web Client**: Vite + React 19 single page application with spring physics engine (`:5173`).
* **Network Discovery**: Multicast DNS (`_wled._tcp`) via `bonjour-service`.
* **Direct Streaming**: WLED 0.14+ WebSocket proxy (`ws://<device_ip>/ws`) for sub-millisecond state updates.

---

## 2. Views & Feature Reference

### Dashboard (`/`)

* **Device Cards**: Live power toggle, dynamic brightness slider with fill glow, primary color picker, and segment preview bar.
* **Category Filters**: Interactive stat pills (`Devices`, `Online`, `Offline`, `ON`, `OFF`) for instant device filtering.
* **Identify Mode**: Pulsing gold alert effect with state snapshot restoration.

### 3D Spatial View (`/spatial`)

* **3D Canvas**: Three.js & React Three Fiber WebGL viewport rendering rooms, wireframe boundaries, and physical 3D LED light strip bar meshes.
* **3D Light Alignment**: Click "Align 3D" to adjust height elevation presets (Ceiling, Wall Mid, Floor), X/Y/Z offsets, physical length, and 3D Y-axis rotation angle.
* **Room Editor & Device Transfer**: Edit room dimensions and transfer light anchors atomically between rooms.

### Effect Studio (`/studio`)

* **Preset Browser**: Browse WLED built-in effect catalog, adjust speed and intensity, choose WLED palettes, and apply live configs to devices or groups.
* **Timeline Animator**: Multi-track keyframe sequence builder with playhead scrub bar (0ms to 60,000ms), play/pause controls, keyframe inspector, and database saving.
* **Palette Creator**: Multi-stop linear gradient designer supporting up to 8 custom color stops with live linear gradient previews.

### Group Management (`/groups`)

* **Group Types**: Zone, Scene, Sync, and Custom clusters with nested child group support.

### Automation & Schedules (`/automation`)

* **Schedules**: Fixed time, sunrise, or sunset automated execution.
* **Routines**: Multi-step sequential timeline routines with step delays.

### Settings (`/settings`)

* **Location Map Picker**: Visual OpenStreetMap pin drop with 15km privacy radius circle for automatic sun times calculation.
* **Unit System**: Switch room dimensions between Imperial (`ft`) and Metric (`m`).

---

## 3. Docker Deployment Guide

To run WLEDashboard in Docker with host networking for mDNS discovery:

```bash
docker compose up -d --build
```
