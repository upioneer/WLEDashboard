# Home Assistant Integration for WLEDashboard

WLEDashboard provides comprehensive integration with Home Assistant through two flexible pathways:
1. **Direct HACS Custom Component (`custom_components/wledashboard`)**: Full UI Config Flow with live REST and WebSocket synchronization.
2. **Enhanced MQTT Auto-Discovery**: Instant zero-install auto-discovery via any MQTT broker.

---

## Capabilities Overview

* **Spatial 3D Rooms as Light Entities:** Control all physically anchored light strips in a room simultaneously.
* **Lighting Groups & Zones:** Native HA control over Zone, Scene, Sync, and Custom groups with concurrent command execution.
* **Timeline Animation Routines:** Trigger multi-step routines directly from HA automations, dashboards, and Zigbee buttons.
* **Weather & Spotify Sync Toggles:** Toggle real-time weather effects or album art extraction per device or group.
* **Custom Services:** Apply Studio gradient palettes, trigger weather simulations, and execute animation timelines.

---

## Method 1: HACS Custom Integration Setup

### Installation via HACS
1. Open **Home Assistant** -> **HACS** -> **Integrations**.
2. Click the three dots in the top right -> **Custom repositories**.
3. Enter your repository URL: `https://github.com/upioneer/WLEDashboard` with category **Integration**.
4. Click **Add**, find **WLEDashboard**, and click **Download**.
5. Restart Home Assistant.

### Configuration
1. Go to **Settings** -> **Devices & Services** -> **Add Integration**.
2. Search for **WLEDashboard**.
3. Enter your WLEDashboard server IP (`Host`), port (`3001` default), and **Long-Lived API Token** (copied from WLEDashboard -> Settings -> Integrations).
4. Click **Submit**.

---

## Method 2: MQTT Auto-Discovery (Zero Installation)

1. In WLEDashboard, navigate to **Settings** -> **Home Assistant & MQTT Integration**.
2. Set **Enable Home Assistant MQTT Bridge** to `Enabled`.
3. Enter your MQTT Broker URL (e.g. `mqtt://homeassistant.local:1883`).
4. Click **Publish HA Discovery Payload**.
5. Home Assistant will automatically discover all Devices, Groups, 3D Rooms, and Routine buttons under the **MQTT** integration.

---

## Available Entities

| Domain | Entity Pattern | Description |
| --- | --- | --- |
| `light` | `light.wledashboard_dev_<id>` | Individual WLED controller with RGB, brightness, and effect control. |
| `light` | `light.wledashboard_grp_<id>` | Multi-device Zone or Scene lighting group. |
| `light` | `light.wledashboard_room_<id>` | 3D Spatial Room coordinating all anchored fixtures. |
| `button` | `button.wledashboard_routine_<id>` | Executes a multi-step animation timeline routine. |
| `button` | `button.wledashboard_btn_weather_sync_now` | Triggers immediate outdoor weather polling and sync. |
| `button` | `button.wledashboard_btn_mdns_rescan` | Triggers network scan for new WLED controllers. |
| `switch` | `switch.wledashboard_sw_weather_dev_<id>` | Toggles weather-reactive lighting on a device. |
| `switch` | `switch.wledashboard_sw_spotify_dev_<id>` | Toggles Spotify album art color sync on a device. |

---

## Custom Home Assistant Services

### `wledashboard.apply_palette`
Applies a custom Studio multi-stop gradient color palette across a selected room, group, or device.

```yaml
service: wledashboard.apply_palette
data:
  palette_id: "sunset_glow"
  room_id: "living_room_id"
```

### `wledashboard.execute_routine`
Fires an animation timeline routine created in WLEDashboard Studio.

```yaml
service: wledashboard.execute_routine
data:
  routine_id: "morning_sunrise_routine_id"
```

### `wledashboard.simulate_weather`
Forces an outdoor weather condition effect across all active weather-synced fixtures.

```yaml
service: wledashboard.simulate_weather
data:
  condition: "thunderstorm"
```
