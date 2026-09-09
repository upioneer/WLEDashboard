# v0.15.0 Release Walkthrough

## Summary
Version 0.15.0 introduces the **Dynamic Weather-Reactive Lighting Engine** and the **Official Home Assistant Integration** (supporting both native HACS custom component integration and expanded zero-install MQTT Auto-Discovery), accompanied by long-lived API token access management and HACS CI validation.

---

## What Is New

### 1. Dynamic Weather-Reactive Lighting Engine
* **Real-Time Weather Polling:** Integrates with OpenWeatherMap using local coordinates and API key to monitor outdoor conditions in real time.
* **Automatic Lighting Presets:** Maps live meteorological condition codes to expressive WLED lighting scenes (Thunderstorm lightning strobe, Rain/Drizzle water ripple effects, Snow winter sparkle, Mist/Fog slow breathing haze, Clear Day/Night sunshine and moonlight, Cloudy overcast silver-slate, and Extreme alert pulses).
* **Live Telemetry & Status Card:** Real-time weather card in Settings displaying temperature (Fahrenheit or Celsius), condition badge, humidity %, wind speed, active target counts, and last sync timestamp.
* **Interactive Condition Simulator:** 8 one-click simulation buttons allowing users to test and preview all weather lighting modes across their fixtures on demand.
* **Custom Condition Lighting Editor:** Ability to adjust primary and secondary RGB colors, speed, and intensity per weather condition with persistent storage in SQLite.
* **Weather Automation Triggers:** Added Weather Condition as a first-class trigger in the Schedule and Routine automation builder.

### 2. Official Home Assistant Integration (HACS)
* **Native HACS Custom Component:** Created `custom_components/wledashboard` supporting standard Home Assistant UI Config Flow.
* **Spatial 3D Rooms as Lights:** `light.wledashboard_room_<id>` entities coordinate all fixtures physically anchored inside a 3D procedural room.
* **Lighting Groups & Zones:** `light.wledashboard_grp_<id>` entities control multi-device clusters with concurrent command distribution.
* **Routine & Timeline Buttons:** `button.wledashboard_routine_<id>` entities trigger multi-step Studio animation timelines directly from Home Assistant dashboards, automations, and Zigbee buttons.
* **Sync Switches:** Per-device and per-group switch toggles for Weather Sync and Spotify album art sync.
* **Custom Services:** Home Assistant services for applying Studio palettes (`wledashboard.apply_palette`), executing routines (`wledashboard.execute_routine`), simulating weather (`wledashboard.simulate_weather`), and forcing live weather sync (`wledashboard.sync_weather_now`).

### 3. Expanded MQTT Auto-Discovery Engine
* Upgraded MQTT Auto-Discovery bridge to broadcast full discovery payloads for Spatial Rooms, Groups, Devices, Routines, and Weather Triggers, allowing zero-install Home Assistant integration over any local MQTT broker.

### 4. API Token & Access Management
* Long-lived API access token generation with reveal, copy-to-clipboard, and token regeneration controls in Settings.

### 5. CI/CD & Validation
* Added `.github/workflows/hacs-validation.yml` running automated `hacs/action/validate` and `home-assistant/actions/hassfest` compliance workflows.
