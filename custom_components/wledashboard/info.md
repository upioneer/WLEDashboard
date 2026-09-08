# WLEDashboard Home Assistant Integration

Official Home Assistant custom integration for [WLEDashboard](https://github.com/upioneer/WLEDashboard).

## Features
* **Spatial 3D Rooms:** Control all light fixtures physically anchored in a room simultaneously.
* **Lighting Groups & Zones:** Native HA control over Zone, Scene, Sync, and Custom clusters with concurrent command distribution.
* **Timeline Animation Routines:** Trigger multi-step routines directly from HA automations, dashboards, and Zigbee buttons.
* **Weather & Spotify Sync Toggles:** Toggle real-time weather effects or album art color extraction per device or group.
* **Custom Services:** Apply Studio gradient palettes, trigger weather simulations, and execute animation timelines.

## Setup
1. In WLEDashboard, navigate to **Settings** -> **Home Assistant & MQTT Integration**.
2. Copy your **Long-Lived API Token**.
3. In Home Assistant, go to **Settings** -> **Devices & Services** -> **Add Integration** -> search **WLEDashboard**.
4. Enter your WLEDashboard server IP, Port (`3001` default), and paste your API Token.
