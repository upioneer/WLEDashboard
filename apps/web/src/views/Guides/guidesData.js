// Guide Catalog Data for WLEDashboard How-To & Documentation Hub

export const GUIDE_CATEGORIES = [
  { id: "all", label: "All Guides" },
  { id: "architecture", label: "OEM vs WLEDashboard" },
  { id: "homeassistant", label: "Home Assistant" },
  { id: "mobile", label: "Mobile & PWA" },
  { id: "groups", label: "Groups & Sync" },
  { id: "traveling", label: "Multi-Controller" },
  { id: "spatial", label: "3D Spatial" },
  { id: "studio", label: "Effect Studio" },
  { id: "automations", label: "Automations" },
  { id: "networking", label: "Networking & Docker" },
]

export const GUIDES = [
  {
    id: "oem-vs-wledashboard",
    category: "architecture",
    title: "Why WLEDashboard? Capabilities Beyond the OEM Interface",
    summary: "How WLED native microcontroller firmware and WLEDashboard centralized orchestration layer complement each other.",
    readTime: "5 min read",
    tags: ["oem", "wled", "architecture", "comparison", "orchestration", "spatial", "fleet", "studio", "sync", "automation"],
    sections: [
      {
        title: "The Foundation: What Makes Native WLED Extraordinary",
        content: "WLED firmware, created by Christian Schwinne (Aircoookie) and the open source community, is the premier real-time LED control engine for ESP32 and ESP8266 microcontrollers. Operating bare-metal directly on the hardware, WLED provides microsecond-precise PWM, RMT, and SPI signaling for addressable LED chipsets (WS2812B, SK6812 RGBW, APA102, and analog fixtures), frame-accurate segment rendering, over 150 built-in effects, and strict electrical safety limiters. The native WLED web interface remains the essential tool for initial physical hardware setup, including assigning GPIO data pins, setting hardware color orders, and calibrating voltage/current limiters.",
        callout: {
          type: "note",
          title: "Hardware Bedrock",
          text: "WLEDashboard does not replace WLED firmware. WLED remains the dedicated real-time hardware driver executing directly on your ESP devices, while WLEDashboard acts as the centralized fleet conductor and spatial intelligence layer communicating over local JSON APIs, WebSockets, and real-time DDP streaming.",
        },
      },
      {
        title: "The Multi-Device Challenge with Native OEM Control",
        content: "While native WLED excels at controlling single strips or matrices, managing multiple controllers across a home or architectural installation introduces operational hurdles:",
        steps: [
          "Siloed Management: Each controller operates as an isolated island on its own IP address, requiring multiple browser bookmarks, separate logins, and constant tab switching.",
          "No Global Fleet Visibility: Native WLED provides no consolidated view of aggregate power draw, offline device alerts, total LED counts, or collective room brightness.",
          "Microcontroller Flash Constraints: ESP chips have limited onboard flash storage (LittleFS / SPIFFS), restricting the number of stored presets, playlist steps, and animation frame buffers.",
          "Lack of Cross-Controller Choreography: Native WLED provides basic UDP synchronization, but cannot natively coordinate sequential traveling wave animations that physically flow from one ESP controller to another across a room.",
          "Absence of Physical 3D Spatial Awareness: The native firmware operates in 1D pixel indexes or 2D matrix grids without understanding real-world 3D coordinates (X, Y, Z meters), physical rooms, or spatial orientation."
        ],
      },
      {
        title: "Key Capabilities Unlocked by WLEDashboard",
        content: "WLEDashboard extends WLED installations into an enterprise-grade lighting system with the following architectural capabilities:",
        steps: [
          "Single Pane of Glass Fleet Management: Monitor and control your entire fleet of controllers from a unified interface with real-time heartbeat monitoring, live power telemetry, instant search, and master controls.",
          "3D Spatial Layout & Virtual Light Anchors: Position fixtures in a 3D WebGL viewport using real-world metric dimensions. Group lights by physical room volumes, coordinate multi-fixture directional lighting, and export spatial rooms to Home Assistant.",
          "Continuous Traveling Waves & Multi-Controller Choreography: Create animations that smoothly cross physical controller boundaries using virtual DDP routing, segment cascading, and automated routine phase delays.",
          "Studio Keyframe Timelines & 2D Matrix Canvas: Design complex multi-track keyframe timelines, custom color palette interpolations, frame-by-frame pixel matrix art, and real-time audio FFT frequency visualizations.",
          "Astronomical & Meteorological Automations: Leverage SunCalc-powered astronomical triggers (sunrise, sunset, dusk, dawn, golden hour) and live OpenWeatherMap condition polling for dynamic weather-reactive lighting (lightning strobes, rain ripple, snowfall sparkle).",
          "Real-Time Spotify Synchronization: Extract dominant color palettes from active Spotify album artwork in real time and distribute dynamic ambient lighting across selected rooms or zones.",
          "Unified Home Assistant Integration: Eliminate dozens of manual entities with automatic discovery and consolidated Room Lights, Group Lights, and Studio Routine buttons over native HACS and MQTT Auto-Discovery.",
          "Fleet Backups & Instant Disaster Recovery: One-click export and import of all groups, spatial layouts, routines, and device metadata, safeguarded in SQLite off the microcontroller flash."
        ],
      },
      {
        title: "Architecture Comparison: Native WLED vs WLEDashboard",
        content: "A side-by-side comparison of architectural responsibilities and capabilities:",
        table: {
          headers: ["Capability", "Native WLED (OEM Interface)", "WLEDashboard Central Layer"],
          rows: [
            [
              "Operational Focus",
              "Microcontroller hardware driver, GPIO pin control, and bare-metal LED rendering.",
              "Centralized fleet management, 3D spatial layout, multi-controller choreography, and automation."
            ],
            [
              "Device Management",
              "Single device per browser tab; manual navigation by IP address.",
              "Unified single pane of glass; manage dozens of controllers with live status and power draw."
            ],
            [
              "Multi-Controller Choreography",
              "Basic UDP sync (duplicate effects on all strips simultaneously).",
              "Sequential traveling waves, spatial wave propagation, and synchronized routine timelines."
            ],
            [
              "Spatial Modeling",
              "1D strip indexes (0 to N) or flat 2D matrix grids.",
              "Interactive 3D WebGL space with real-world meter coordinates and spatial light anchors."
            ],
            [
              "Data Persistence",
              "Limited ESP32/ESP8266 flash memory (LittleFS / SPIFFS).",
              "Local-first SQLite database with unlimited routines, palettes, and device history."
            ],
            [
              "Segment Architecture",
              "Volatile RAM segments (max 16-32); raw start/stop index math; wiped on uncommitted reboot.",
              "Dashboard-mastered persistent segments, auto-balanced pixel math, 3D bend angles, and instant hardware compilation."
            ],
            [
              "Schedules & Automations",
              "Basic local time-of-day clock triggers stored on ESP.",
              "Astronomical sun elevation triggers (sunrise, sunset, golden hour) and live weather conditions."
            ],
            [
              "Media Reactivity",
              "Audio reactive requires dedicated I2S/analog mic hardware on each ESP.",
              "Host-level Web Audio FFT visualizer and real-time Spotify album art color extraction."
            ],
            [
              "Home Assistant Integration",
              "Individual entity per controller; manual entity organization.",
              "Native HACS and MQTT Auto-Discovery with consolidated 3D Room and Group entities."
            ],
            [
              "Fleet Backups",
              "Manual backup of cfg.json and presets.json device-by-device.",
              "Single-click full backup, export, and migration across your entire controller network."
            ]
          ]
        },
      },
      {
        title: "Conscious Architecture: WLEDashboard Segments vs Microcontroller Firmware Segments",
        content: "A core architectural decision in WLEDashboard is treating the centralized database as the master authority for strip segments, rather than pulling volatile segment definitions from microcontroller firmware. This design is rooted in data-driven reliability and usability advantages:",
        steps: [
          "Immunity to Power Brownouts & Volatility: Native WLED firmware holds active segments in volatile microcontroller RAM. Unsaved segment layouts vanish on sudden power loss or reboots. WLEDashboard commits segment topologies permanently to local SQLite, pushing compiled layouts atomically to hardware and eliminating LittleFS flash memory wear.",
          "Transcending Hardware Memory Limits: Physical ESP32 microcontrollers enforce a hard limit of 16 to 32 segments (and ESP8266 caps at 10 to 16). WLEDashboard decouples logical room division from hardware memory constraints, allowing arbitrarily detailed layouts and 3D geometric bend anchors.",
          "Zero-Math Ergonomics & Auto-Balancing: Native WLED requires calculating error-prone start and stop pixel index numbers. WLEDashboard auto-balances unassigned pixel counts across segments, accepts intuitive relative physical bend angles (+90°, -45°), and guarantees hardware LED count parity.",
          "High-Efficiency Silicon Execution: Rather than streaming high-bandwidth raw pixel arrays over Wi-Fi (which suffers from jitter, packet drops, and host sleep interruptions), WLEDashboard compiles segment topologies into native WLED JSON commands. The microcontroller continues executing rendering locally in silicon at 42+ FPS with zero network overhead.",
          "Instant Hardware Replacement & Recovery: If an ESP32 microcontroller burns out, swapping hardware requires only entering the new IP address and clicking 'Push Configuration'. WLEDashboard reprovisions the entire multi-segment installation in seconds without tedious manual re-entry in the OEM web interface."
        ],
      },
      {
        title: "How They Work Together",
        content: "WLED and WLEDashboard operate in perfect harmony. WLED handles the time-critical microsecond LED signaling on your hardware, while WLEDashboard acts as the brain and conductor across your network:",
        diagram: [
          "+-------------------------------------------------------------------------+",
          "|                         WLEDashboard Central Layer                      |",
          "|   [3D Spatial Engine]  [Studio Timelines]  [Automations]  [Spotify / Wx] |",
          "+-------------------------------------------------------------------------+",
          "                                    |",
          "           Local LAN (JSON REST / WebSockets / Real-Time DDP)",
          "           +------------------------+------------------------+",
          "           |                        |                        |",
          "           v                        v                        v",
          "    +--------------+         +--------------+         +--------------+",
          "    | WLED ESP32 #1|         | WLED ESP32 #2|         | WLED ESP32 #3|",
          "    | (Under-Cabinet)        | (Ceiling Cove)         | (Desk Matrix)|",
          "    +--------------+         +--------------+         +--------------+",
          "           |                        |                        |",
          "      [WS2812B Strip]          [SK6812 RGBW]            [16x16 Matrix]"
        ].join("\n"),
        callout: {
          type: "tip",
          title: "Best Practice Workflow",
          text: "Use the native WLED web UI during initial hardware assembly to configure Wi-Fi, assign GPIO pins, set maximum current limits, and verify physical wiring. Once your controller is online, manage daily lighting, spatial arrangements, group scenes, and multi-device animations through WLEDashboard.",
        },
      },
      {
        title: "Quick Reference: When to Use Which Interface",
        content: "Guidelines for when to leverage the native WLED web UI versus WLEDashboard:",
        steps: [
          "Use Native WLED OEM Interface for: Initial Wi-Fi provisioning, GPIO pin assignment, LED count configuration, power supply amp limiters, hardware relay pins, color channel order calibration (RGB/GRB/RGBW), and flashing OTA firmware updates.",
          "Use WLEDashboard for: Daily lighting control, grouping controllers by room, multi-strip traveling wave animations, 3D spatial layout design, keyframe timeline authoring, Spotify artwork reactive sync, weather-based lighting automations, and unified Home Assistant integration."
        ],
      },
    ],
  },
  {
    id: "home-assistant-integration",
    category: "homeassistant",
    title: "Home Assistant Integration: Manual Setup, HACS & MQTT Auto-Discovery",
    summary: "Complete setup guide for connecting WLEDashboard with Home Assistant to expose 3D Spatial Rooms, lighting groups, and studio routines without waiting on store approval.",
    readTime: "5 min read",
    tags: ["home assistant", "hacs", "manual", "mqtt", "integration", "rooms", "groups", "routines", "entities", "custom_components"],
    sections: [
      {
        title: "Overview: Zero Waiting on App Stores or Default Repositories",
        content: "WLEDashboard provides first-class Home Assistant integration right now. You do not need to wait for inclusion in the official HACS default store to install and use it. WLEDashboard supports three separate deployment methods to fit your exact Home Assistant setup:",
        steps: [
          "Method 1: Direct Manual Component Copy (Recommended for offline, local-first environments)",
          "Method 2: HACS Custom Repository (Recommended for automated in-UI update notifications)",
          "Method 3: Native MQTT Auto-Discovery (Zero Python installation required; instant entity creation via Mosquitto)"
        ],
        callout: {
          type: "note",
          title: "Architecture Benefit",
          text: "Instead of creating dozens of unorganized micro-entities for every raw ESP pin, WLEDashboard consolidates your lights into physical 3D Room entities, synchronized group lights, and one-click routine trigger buttons.",
        },
      },
      {
        title: "Method 1: Manual Custom Component Installation",
        content: "You can copy the integration files directly into your Home Assistant installation folder in less than two minutes:",
        steps: [
          "From your WLEDashboard installation or GitHub repository, locate the directory: custom_components/wledashboard.",
          "Copy the entire 'wledashboard' directory into your Home Assistant configuration directory under 'custom_components/' (for Home Assistant OS / Supervised: /config/custom_components/wledashboard/manifest.json).",
          "Restart Home Assistant (Settings > System > Restart).",
          "In Home Assistant, navigate to Settings > Devices & Services > Add Integration.",
          "Search for 'WLEDashboard' and select it.",
          "Enter your WLEDashboard host IP, port (default: 8301 or custom mapped port), and paste your Long-Lived API Token (retrieved from WLEDashboard Settings > Home Assistant & MQTT).",
          "Click Submit. Your spatial rooms, groups, and routines will be created as native Home Assistant entities immediately."
        ],
        callout: {
          type: "tip",
          title: "Locating the API Token",
          text: "In WLEDashboard, open Settings and scroll to Home Assistant & MQTT. Click 'Copy API Token' to place the required secret on your clipboard.",
        },
      },
      {
        title: "Method 2: HACS Custom Repository Installation",
        content: "If you use HACS (Home Assistant Community Store), you can add WLEDashboard as a custom repository for one-click downloads and upgrade tracking:",
        steps: [
          "In Home Assistant, click on 'HACS' in your sidebar.",
          "Click on 'Integrations', then click the three vertical dots (•••) in the top-right corner and select 'Custom repositories'.",
          "In the Repository field, enter: https://github.com/upioneer/WLEDashboard",
          "In the Type / Category dropdown, select 'Integration'.",
          "Click 'Add'. The repository will be parsed and validated immediately.",
          "Search for 'WLEDashboard Integration' in HACS, click 'Download', and confirm.",
          "Restart Home Assistant, then add the integration via Settings > Devices & Services as described above."
        ],
      },
      {
        title: "Method 3: Native MQTT Auto-Discovery (Zero Installation)",
        content: "If you prefer not to manage custom Python components, WLEDashboard includes a built-in MQTT discovery service:",
        steps: [
          "Ensure your Home Assistant has the official MQTT Integration configured with your Mosquitto broker.",
          "In WLEDashboard, navigate to Settings > MQTT Broker Configuration.",
          "Toggle 'Enable MQTT Auto-Discovery' to ON.",
          "Enter your MQTT broker URL (e.g. mqtt://homeassistant.local:1883 or internal IP), along with your username and password.",
          "Click Save Settings.",
          "WLEDashboard immediately publishes Home Assistant auto-discovery payloads (homeassistant/light/.../config). Your spatial rooms and groups appear instantly in Home Assistant without restarting."
        ],
      },
      {
        title: "Entities and Capabilities Exposed to Home Assistant",
        content: "Once connected, WLEDashboard dynamically exposes the following entities:",
        table: {
          headers: ["Entity Type", "Identifier Format", "Description", "Available Actions"],
          rows: [
            [
              "Room Lights",
              "light.room_<room_id>",
              "Consolidated control for all fixtures physically anchored inside a 3D spatial room.",
              "On/off, brightness slider, color temperature, full RGB color selection."
            ],
            [
              "Group Lights",
              "light.group_<group_id>",
              "Controls all controllers grouped into Zones, Scenes, or Sync sets.",
              "Concurrent brightness and color distribution across all group devices."
            ],
            [
              "Routine Buttons",
              "button.routine_<routine_id>",
              "Triggers multi-step Studio timeline animations and sequential sweeps.",
              "Execute from Home Assistant dashboards, automations, NFC tags, or Zigbee buttons."
            ],
            [
              "Weather Sync Switches",
              "switch.weather_sync_<device_id>",
              "Toggles real-time meteorological animation effects on target controllers.",
              "Turn weather reactive lighting on or off per fixture."
            ],
            [
              "Spotify Sync Switches",
              "switch.spotify_sync_<device_id>",
              "Toggles real-time album artwork color synchronization.",
              "Automate music lighting when a media player starts playing."
            ]
          ]
        },
      },
      {
        title: "Custom Services for Home Assistant Automations",
        content: "The integration also registers dedicated Home Assistant services for automation scripts:",
        steps: [
          "wledashboard.execute_routine: Execute any timeline routine by routine_id with optional transition overrides.",
          "wledashboard.apply_palette: Apply a Studio custom palette across specified target devices or groups.",
          "wledashboard.simulate_weather: Trigger instant weather simulations (such as thunderstorm lightning or snowfall) directly from Home Assistant automations."
        ],
      },
    ],
  },
  {
    id: "mobile-pwa-install",
    category: "mobile",
    title: "Mobile App Installation: Add to Home Screen (iOS & Android)",
    summary: "How to install WLEDashboard as a full-screen, standalone mobile web app on iPhone, iPad, and Android devices without an app store.",
    readTime: "4 min read",
    tags: ["mobile", "pwa", "ios", "android", "standalone", "homescreen", "safari", "chrome", "edge"],
    sections: [
      {
        title: "Overview: Native App Feel, Zero App Store Bloat",
        content: "WLEDashboard is engineered as a modern Progressive Web App (PWA). When added to your mobile home screen, it launches in standalone mode: browser navigation bars, tab switchers, and URL bars are completely removed, providing a native, full-screen control surface for your LED lighting network. No app store download, third-party account, or cloud telemetry is required.",
        callout: {
          type: "note",
          title: "Standalone Windowing",
          text: "Once added to your home screen, WLEDashboard appears as an independent app tile in your iOS and Android multitasking app switchers, persisting state and maintaining real-time WebSocket connectivity seamlessly.",
        },
      },
      {
        title: "Installing on Apple iOS (iPhone & iPad Safari)",
        content: "Apple iOS requires web app installation to be initiated through Safari's built-in system Share sheet:",
        steps: [
          "Open Safari on your iPhone or iPad and navigate to your WLEDashboard instance URL.",
          "Tap the Share button in the bottom toolbar on iPhone (or top navigation bar on iPad).",
          "Scroll down in the share sheet options and tap 'Add to Home Screen'.",
          "Confirm the app name 'WLEDashboard' and inspect the custom solar icon badge.",
          "Tap 'Add' in the top right corner of the screen.",
          "The WLEDashboard icon is now pinned to your Home Screen. Tap it anytime to launch in full-screen standalone mode."
        ],
        callout: {
          type: "tip",
          title: "Browser Requirement on iOS",
          text: "Due to iOS WebKit constraints, the 'Add to Home Screen' action must be performed in Apple Safari. Third-party iOS browsers (like Chrome or Firefox for iOS) lack system permission to create standalone home screen web apps.",
        },
      },
      {
        title: "Installing on Android (Google Chrome & Microsoft Edge)",
        content: "On Android, modern Chromium browsers (both Microsoft Edge and Google Chrome) utilize WLEDashboard's integrated Service Worker and Web App Manifest to mint a true native WebAPK. This installs WLEDashboard into your Android App Drawer as a standalone app with its own process, splash screen, and full-screen windowing, completely removing Edge/Chrome browser tabs and address bars:",
        steps: [
          "Open Google Chrome or Microsoft Edge on your Android smartphone or tablet.",
          "Navigate to your WLEDashboard instance over HTTPS (such as your Cloudflare Tunnel domain) or localhost.",
          "If prompted by the in-app mobile header bar, tap 'Install' to trigger the native installation dialog immediately.",
          "Alternatively, tap the browser menu (three dots in Chrome top-right, or bottom center/right toolbar in Edge).",
          "Select 'Install app' or 'Install WLEDashboard' (or 'Add to phone') from the menu.",
          "Confirm the installation dialog. Android will compile and install WLEDashboard directly into your home screen and native Android app drawer."
        ],
        callout: {
          type: "tip",
          title: "Shortcut vs Native WebAPK Troubleshooting",
          text: "If tapping 'Add to phone' in Edge previously created a browser shortcut that reopens inside Edge with URL bars and tabs, this happens when added before the Service Worker registers or when loaded over unencrypted HTTP. To fix: delete the existing shortcut from your home screen, navigate to your HTTPS tunnel domain, refresh once to allow the Service Worker to activate, and select 'Install WLEDashboard' from the browser menu.",
        },
      },
      {
        title: "Local Network (HTTP) vs Secure HTTPS Domains",
        content: "Browser security standards enforce different PWA capabilities depending on whether the dashboard is accessed over plain HTTP or secure HTTPS:",
        steps: [
          "Direct Local IP over HTTP (e.g. http://192.168.1.100:8301): Apple Safari supports Add to Home Screen over internal HTTP. Android browsers will allow basic bookmark shortcuts, but modern Chromium restricts automated WebAPK compilation without a secure HTTPS context.",
          "Reverse Proxy or Cloudflare Tunnel with HTTPS: Provides the required secure context (HTTPS) enabling automatic Service Worker caching, immediate 'Install app' browser prompts, and native Android WebAPK generation."
        ],
        callout: {
          type: "note",
          title: "Zero Cloud Dependency",
          text: "Whether installed over plain local IP or an encrypted HTTPS tunnel, WLEDashboard communicates directly with your ESP microcontrollers over your local LAN. No external internet connectivity is required for daily operation.",
        },
      },
      {
        title: "Feature Comparison: Browser Tab vs Installed Mobile App",
        content: "A comparison of standard mobile browser tabs versus the installed home screen experience:",
        table: {
          headers: ["Feature", "Standard Mobile Browser Tab", "Installed Home Screen Web App"],
          rows: [
            [
              "Viewport Real Estate",
              "Reduced by browser URL address bar and bottom toolbar.",
              "100% full-screen immersive display with edge-to-edge layout."
            ],
            [
              "Multitasking Switcher",
              "Buried inside browser tabs among other open websites.",
              "Dedicated application tile in iOS and Android app switchers."
            ],
            [
              "Launch Access",
              "Requires opening browser, navigating bookmarks, or entering IP.",
              "Instant one-tap launch directly from your mobile home screen."
            ],
            [
              "Accidental Navigation",
              "Swipe gestures can accidentally trigger page back or reload.",
              "Standalone application container prevents accidental navigation exits."
            ],
            [
              "Status Bar Integration",
              "Standard browser chrome coloring.",
              "Seamless translucent dark status bar matching dashboard palette."
            ]
          ]
        },
      },
    ],
  },
  {
    id: "group-sync-scaling",
    category: "groups",
    title: "Group Synchronization & Varying LED Counts",
    summary: "How WLED and WLEDashboard synchronize lighting across multiple controllers with different pixel counts.",
    readTime: "4 min read",
    tags: ["groups", "sync", "led count", "phase", "udp", "segments", "zones"],
    sections: [
      {
        title: "Overview",
        content: "When controlling a group of lighting strips across a room, individual controllers often have vastly different hardware specs. One fixture might have 30 LEDs (e.g. an under-shelf accent) while another has 300 LEDs (e.g. a ceiling perimeter). WLED and WLEDashboard ensure these fixtures remain visually in lockstep without requiring identical hardware.",
      },
      {
        title: "Normalized Phase Math in WLED Firmware",
        content: "WLED effects (Rainbow, Sweep, Wipe, Breathe, Chase, and others) do not operate on fixed pixel counts. Instead, the firmware calculates animation progress as a normalized percentage of the segment length (from 0% to 100%). When both controllers run at the same speed value, both complete a cycle in the exact same millisecond interval.",
        diagram: [
          "+---------------------------------------------------------+",
          "| Controller A (30 LEDs):  [=======>                      ] 33% |",
          "| Controller B (300 LEDs): [=================>            ] 33% |",
          "+---------------------------------------------------------+",
          "Both strips reach midpoint and cycle completion at the identical millisecond."
        ].join("\n"),
        callout: {
          type: "note",
          title: "Hardware Density Difference",
          text: "The 300-LED strip displays higher spatial fidelity and smoother gradients, while the 30-LED strip displays coarser steps, but their temporal frequency and motion phase remain identical.",
        },
      },
      {
        title: "WLED Native UDP Sync (Clock Locking)",
        content: "WLED devices can communicate directly over the local network via UDP sync packets on port 21324. When enabled in WLED Network Settings, controllers synchronize their internal microsecond clock timer (strip.now). This prevents animation phase drift over long running sessions.",
        steps: [
          "Open each device web UI and navigate to Config > Sync Interfaces.",
          "Ensure WLED Broadcast is enabled with the same UDP port (default: 21324).",
          "Assign sync group numbers (Group 1 is enabled by default across all devices).",
          "In WLEDashboard Groups, create a group with Type set to \"Sync\"."
        ],
      },
      {
        title: "Group Types in WLEDashboard",
        content: "WLEDashboard supports four distinct group classifications designed for different operational workflows:",
        steps: [
          "Zone: Logical physical area (e.g. Living Room, Patio). Commands are broadcast concurrently.",
          "Scene: Preset snapshot of colors, brightness, and effects applied simultaneously.",
          "Sync: Controllers configured to leverage WLED hardware UDP sync broadcast.",
          "Custom: Arbitrary clusters with support for nested child groups."
        ],
        code: {
          language: "json",
          description: "Example WLED JSON API group payload distributed concurrently",
          content: JSON.stringify({
            on: true,
            bri: 255,
            transition: 7,
            seg: [
              {
                id: 0,
                fx: 9,
                sx: 128,
                ix: 128,
                col: [[255, 0, 85], [0, 255, 204], [139, 92, 246]]
              }
            ]
          }, null, 2),
        },
      },
    ],
  },
  {
    id: "sequential-traveling-waves",
    category: "traveling",
    title: "Continuous Traveling Animations Across Controllers",
    summary: "Techniques for creating seamless animations that flow sequentially from one controller into another.",
    readTime: "5 min read",
    tags: ["traveling", "sequential", "virtual", "ddp", "matrix", "routines", "multi-strip"],
    sections: [
      {
        title: "The Challenge of Multi-Controller Traversal",
        content: "By default, group effects trigger on all strips simultaneously (parallel animation). If you want an animation to begin on Strip 1, travel along its length, and seamlessly exit Strip 1 to enter Strip 2 and Strip 3 as one continuous physical path, additional coordination is required.",
        diagram: [
          "+-----------------------------------------------------------------+",
          "| [ Controller 1: 60 LEDs ] ---> [ Controller 2: 120 LEDs ] ---> [ Controller 3: 30 LEDs ] |",
          "| Pixels 0 - 59                  Pixels 60 - 179                 Pixels 180 - 209          |",
          "+-----------------------------------------------------------------+"
        ].join("\n"),
      },
      {
        title: "Method 1: WLED Virtual DDP Outputs (Recommended for Standalone)",
        content: "Starting in WLED v0.14+, you can configure one master ESP32 controller with virtual DDP output buses pointing to the IP addresses of other controllers on your LAN. The master controller addresses all LEDs as a single contiguous array.",
        steps: [
          "On the primary controller, go to Config > LED Preferences.",
          "Under Hardware Setup, add a new LED output and select Type: DDP RGB (or DDP Network).",
          "Enter the IP address of the second controller and specify its LED count.",
          "The primary controller now controls both physical pins and remote network pixels as a single continuous canvas."
        ],
        callout: {
          type: "tip",
          title: "Network Requirement",
          text: "Ensure both controllers are on low-latency 2.4GHz Wi-Fi or Ethernet. DDP streams UDP frames directly between the ESP controllers with minimal latency.",
        },
      },
      {
        title: "Method 2: WLEDashboard Routine Timelines",
        content: "If you do not want to alter WLED hardware bus configurations, you can use WLEDashboard Automations & Routines to trigger sequential steps with millisecond delays matching the animation travel time.",
        code: {
          language: "json",
          description: "Routine timeline step structure",
          content: JSON.stringify({
            name: "Sequential Perimeter Sweep",
            steps: [
              { action: "device_command", deviceId: "dev-kitchen-1", payload: { seg: [{ fx: 3, sx: 180 }] } },
              { action: "delay", delay_ms: 1200 },
              { action: "device_command", deviceId: "dev-kitchen-2", payload: { seg: [{ fx: 3, sx: 180 }] } },
              { action: "delay", delay_ms: 2400 },
              { action: "device_command", deviceId: "dev-kitchen-3", payload: { seg: [{ fx: 3, sx: 180 }] } }
            ]
          }, null, 2),
        },
      },
      {
        title: "Method 3: Central DDP Streaming via Spatial Coordinates",
        content: "For full freedom over 2D and 3D spatial coordinate animation, WLEDashboard includes a built-in DDP streaming socket in audioService.js (port 4048). The host calculates pixel states globally across physical coordinates and streams UDP slices to each target IP concurrently.",
      },
    ],
  },
  {
    id: "spatial-3d-anchors",
    category: "spatial",
    title: "3D Spatial Layout & Light Anchors",
    summary: "Model your physical living spaces in 3D WebGL and anchor WLED strips to real-world geometric coordinates.",
    readTime: "4 min read",
    tags: ["spatial", "3d", "webgl", "threejs", "anchors", "dwellings", "rooms", "floors"],
    sections: [
      {
        title: "Spatial Hierarchy Structure",
        content: "WLEDashboard organizes spatial light geometry in a four-tier relational hierarchy: Dwellings > Floors > Rooms > Anchors. Each anchor binds a specific WLED controller or segment to physical coordinates in 3D space.",
        diagram: [
          "Dwelling (e.g. Main Residence)",
          "  +-- Floor (e.g. Ground Floor, Elevation: 0m)",
          "        +-- Room (e.g. Living Room: 6m x 5m)",
          "              +-- Anchor A: Linear Strip (Backlight)",
          "              +-- Anchor B: Perimeter Strip (Ceiling Cove)"
        ].join("\n"),
      },
      {
        title: "Anchor Properties & Parameters",
        content: "When editing an anchor in the Spatial Viewport, you configure the following real-world dimensions:",
        steps: [
          "Offset X, Y, Z: Position in meters relative to room origin center.",
          "Rotation Y: Angular orientation in degrees around the vertical axis.",
          "Physical Length: Real-world strip length in meters.",
          "LED Density: Hardware density (e.g. 30, 60, or 144 LEDs per meter).",
          "Anchor Type: strip_linear (straight strip), strip_perimeter (room boundary), or fixture_spot (recessed downlight)."
        ],
      },
      {
        title: "Interactive WebGL Viewport Controls",
        content: "The 3D spatial viewport is rendered using Three.js and React Three Fiber with bloom post-processing:",
        steps: [
          "Orbit / Rotate: Left click and drag to orbit around the room.",
          "Pan: Right click and drag (or two-finger drag on trackpad) to pan the camera.",
          "Zoom: Mouse wheel or pinch gesture to zoom in and out.",
          "Room Inspection: Click any room bounding box to focus camera view and inspect real-time emissive strip glow."
        ],
      },
    ],
  },
  {
    id: "studio-timelines-matrix",
    category: "studio",
    title: "Effect Studio, Timelines & 2D Matrix Canvas",
    summary: "Design custom keyframe animation timelines, browse WLED presets, and paint 2D matrix pixel artwork.",
    readTime: "5 min read",
    tags: ["studio", "timeline", "keyframes", "presets", "palettes", "matrix", "audio"],
    sections: [
      {
        title: "Preset Browser",
        content: "Effect Studio provides access to all 50+ built-in WLED effects and 20 color palettes. You can live-preview effects on an interactive 60-pixel canvas simulator and adjust effect speed (sx) and intensity (ix) with immediate visual feedback.",
      },
      {
        title: "Timeline Animator",
        content: "The Timeline Animator allows you to compose multi-track keyframe sequences over customizable durations (from 1 second to 60 seconds).",
        steps: [
          "Set the sequence duration in milliseconds (e.g. 5000ms).",
          "Scrub the playhead to the desired timestamp.",
          "Configure effect, color palette, speed, and intensity.",
          "Click Add Keyframe to lock in the state at that timestamp.",
          "Press Play to loop the sequence or Save Sequence to store it in SQLite."
        ],
      },
      {
        title: "2D Matrix Canvas Designer",
        content: "For users with WS2812B or WS2811 LED matrices (e.g. 16x16, 8x32, 64x64), the Matrix Editor provides an interactive pixel grid for drawing custom color artwork, icons, and text patterns with direct preset saving.",
      },
      {
        title: "Audio Visualizer Streaming",
        content: "The Audio Visualizer captures microphone or system audio input in the browser, processes fast Fourier transform (FFT) frequency spectrum bands, and streams real-time color frames directly to your WLED controller over UDP DDP packets (port 4048).",
      },
    ],
  },
  {
    id: "automations-routines",
    category: "automations",
    title: "Automations, Schedules & Astronomical Triggers",
    summary: "Automate your lighting with time-of-day schedules, astronomical sunrise/sunset triggers, and multi-step routines.",
    readTime: "4 min read",
    tags: ["automations", "schedules", "routines", "suncalc", "sunrise", "sunset", "cron"],
    sections: [
      {
        title: "Background Scheduler Engine",
        content: "WLEDashboard runs an internal background scheduler loop every 30 seconds within the Fastify backend (automationService.js). The engine monitors active schedule conditions and executes commands against target devices or groups without requiring external cloud accounts.",
      },
      {
        title: "Astronomical Triggers (SunCalc)",
        content: "You can trigger lighting routines based on natural solar positions calculated for your geographic latitude and longitude:",
        steps: [
          "Sunrise / Dawn: Gradually illuminate warm lighting as the sun rises.",
          "Sunset / Dusk: Trigger evening accent scenes automatically as darkness falls.",
          "Solar Noon / Golden Hour: Align color temperatures with ambient daylight cycles."
        ],
        callout: {
          type: "tip",
          title: "Configuring Coordinates",
          text: "Set your home latitude and longitude in Settings > Location using the visual map picker to ensure astronomical calculations match your exact locale.",
        },
      },
      {
        title: "Multi-Step Routine Timelines",
        content: "Routines execute structured chains of actions across multiple controllers with configurable transition delays. For example: turn on patio lights, wait 5 seconds, fade in pathway ground lights, wait 10 seconds, then set living room cove to evening ambient glow.",
      },
    ],
  },
  {
    id: "networking-docker",
    category: "networking",
    title: "Network Architecture, Docker & mDNS Discovery",
    summary: "Best practices for containerized deployment, local network discovery, and persistent SQLite storage.",
    readTime: "5 min read",
    tags: ["docker", "compose", "mdns", "networking", "sqlite", "lan", "http", "clipboard", "update", "watchtower", "upgrade", "backup", "restore", "export", "import", "migrate"],
    sections: [
      {
        title: "Zero-Configuration Local Discovery & Security Safeguards",
        content: "WLEDashboard pairs passive mDNS monitoring with intelligent local network discovery to automatically identify and synchronize WLED controllers across your home, studio, or commercial space. Engineered for high security and stability, the discovery engine incorporates multi-layer safeguards:",
        steps: [
          "Private Network Containment (RFC 1918): Automated discovery is strictly restricted to private network boundaries (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16). The engine will never probe public WAN endpoints or external internet addresses.",
          "Remote & Cloudflare Tunnel Isolation: When accessing WLEDashboard remotely over Cloudflare Tunnels, public domain names, or cellular data, external network probing is decoupled to ensure no unauthorized outbound traffic occurs.",
          "VPN & Mesh Overlay Protection: Recognizes Carrier-Grade NAT (CGNAT) address ranges such as Tailscale (100.64.0.0/10) and virtual overlays, preventing scanning across virtual peer-to-peer tunnels.",
          "Container Virtualization Guards: Safely differentiates between internal Docker container bridge subnets and physical local area networks to eliminate unnecessary container-to-container queries.",
          "Enterprise & Custom Subnet Expansion: For commercial spaces, production studios, or businesses using segmented lighting VLANs, administrators can expand the scan scope by defining custom CIDR ranges under the Advanced management view.",
          "Router & Hardware Protection: Discovery queries enforce strict concurrency ceilings and low-latency timeouts to ensure small business routers, Wi-Fi access points, and microcontrollers remain responsive and unburdened."
        ],
      },
      {
        title: "Docker Compose Deployment",
        content: "Deploying WLEDashboard in Docker provides a self-contained production stack with pre-built images from GitHub Container Registry. Port 8301 is used by default to prevent port collisions with other popular home automation services such as Z-Wave JS UI, Grafana, and Uptime Kuma (ports 3000 and 3001):",
        code: {
          language: "yaml",
          description: "Standard docker-compose.yml configuration",
          content: [
            "services:",
            "  wledashboard:",
            "    image: ghcr.io/upioneer/wledashboard:latest",
            "    container_name: wledashboard",
            "    restart: unless-stopped",
            "    ports:",
            "      - \"8301:8301\"",
            "    volumes:",
            "      - wledashboard_data:/app/data",
            "    environment:",
            "      - NODE_ENV=production",
            "",
            "volumes:",
            "  wledashboard_data:"
          ].join("\n"),
        },
      },
      {
        title: "Proxmox VE LXC Deployment (Automated Helper Script)",
        content: "For Proxmox VE homelab environments, WLEDashboard provides an automated helper script to create and configure an unprivileged Debian 12 LXC container with native systemd service management and direct LAN multicast access for zero-configuration mDNS controller discovery:",
        code: {
          language: "bash",
          description: "Run directly in your Proxmox VE host shell (or web shell)",
          content: "bash -c \"$(curl -fsSL https://raw.githubusercontent.com/upioneer/WLEDashboard/master/install/proxmox/wledashboard.sh)\"",
        },
        steps: [
          "Native Performance: Uses between 45MB and 90MB of RAM, running directly on the Linux host kernel without virtualization overhead.",
          "Identical Execution: Compiles and runs the exact same Node.js 22 LTS environment, Fastify server, and Vite production bundle as the Docker container.",
          "Native LAN Subnet: Bridges directly to vmbr0 with its own IP address, allowing seamless WLED sync and broadcast discovery across your local network.",
          "Host Shell Access: Log directly into the container from your Proxmox host shell with 'pct enter <CTID>' (type 'exit' to return to host). You can also run ad-hoc commands via 'pct exec <CTID> -- <command>'.",
          "Serial Console: Connect to the virtual console using 'pct console <CTID>' (detach using Ctrl+O).",
          "Simple Updates: Update your container at any time by running 'pct exec <CTID> -- update-wledashboard' from the Proxmox host shell."
        ],
        callout: {
          type: "tip",
          title: "Proxmox Hardware Allocation",
          text: "The installer automatically detects your default container storage (such as local-lvm) and provisions a 4GB virtual disk with 2048MB RAM and 1024MB Swap to provide headroom for the Vite frontend compilation step. During normal operation, the container consumes under 90MB of RAM.",
        },
      },
      {
        title: "Unraid Deployment (Community Applications Template & Compose Stack)",
        content: "On Unraid, WLEDashboard deploys from the prebuilt image ghcr.io/upioneer/wledashboard:latest with no build step. Install the Community Applications template from Apps (or sideload install/unraid/wledashboard.xml via Docker > Add Container), or paste install/unraid/docker-compose.unraid.yml into a Compose Manager stack. Both paths serve the UI on port 8301 and map AppData (/mnt/user/appdata/wledashboard) to /app/data in the container:",
        code: {
          language: "bash",
          description: "Manual template URL for Docker > Add Container",
          content: "https://raw.githubusercontent.com/upioneer/WLEDashboard/master/install/unraid/wledashboard.xml",
        },
        steps: [
          "Bridge Mode (Default): Works everywhere with zero setup. Web UI on port 8301. Limitation: UDP multicast mDNS discovery (224.0.0.251:5353) never crosses the docker0 bridge, so add controllers by typing their LAN IP in the dashboard or Device Manager. Polling, control, groups, spatial, automations, and MQTT are unaffected.",
          "Host Mode Workaround: Switch the container Network to host for native mDNS auto-discovery. Tradeoff: port mappings are ignored, port 8301 must be free on the Unraid host, and the container shares the host firewall surface.",
          "Custom br0 Workaround: Assign the container its own LAN IP for discovery without host port conflicts (reserve the IP in your DHCP server). Quirk: the Unraid host cannot reach br0 container IPs directly because of macvlan isolation, so open the UI from another LAN device.",
          "Updates: Pull and recreate (docker compose pull && docker compose up -d). Never use down -v, which deletes mapped data. Keep /mnt/user/appdata/wledashboard in CA Backup and export JSON snapshots from Settings > Backup & Restore.",
        ],
      },
      {
        title: "Updating Your Container (Zero Downtime & Persistence)",
        content: "Upgrading WLEDashboard to a new release is safe, instant, and preserves all user configurations, device associations, spatial layouts, routines, and custom color palettes:",
        code: {
          language: "bash",
          description: "Pull the latest container image and recreate the service",
          content: [
            "# 1. Pull the latest multi-architecture image from GitHub Container Registry",
            "docker compose pull",
            "",
            "# 2. Recreate and restart the container in background mode with zero configuration loss",
            "docker compose up -d",
            "",
            "# Optional: Verify running status and health check",
            "docker compose ps"
          ].join("\n"),
        },
        steps: [
          "Data Volume Persistence: All application data and SQLite databases reside in the wledashboard_data Docker volume mounted to /app/data. Tearing down or upgrading the container never deletes your data.",
          "Bookmark Preservation on Port 3001: If you previously deployed WLEDashboard before v0.21.0 and have browser bookmarks or home dashboard links pointing to port 3001, you can keep them intact by updating your compose file ports section to '3001:8301'.",
          "Automated Background Updates with Watchtower (Opt-In): If you use Watchtower to manage container updates automatically across your homelab, uncomment the labels section in docker-compose.yml containing com.centurylinklabs.watchtower.enable=true.",
          "In-App Update Indicator: The Settings page in WLEDashboard automatically queries GitHub Releases for updates. When a newer version is released, an update banner displays with one-click Copy Command buttons for both Docker Compose and Proxmox VE.",
          "Proxmox VE LXC Updates: If running in a Proxmox VE LXC container, execute 'pct exec <CTID> -- update-wledashboard' from the Proxmox host shell, or execute 'update-wledashboard' directly inside the container console to pull the latest release, recompile, and restart systemd with zero data loss."
        ],
        callout: {
          type: "tip",
          title: "Safe Upgrades",
          text: "Never use 'docker compose down -v' when updating. The -v flag deletes named volumes and will erase your SQLite database. Always use 'docker compose pull && docker compose up -d' for seamless, safe upgrades.",
        },
      },
      {
        title: "Backup & Restore: Full Configuration Snapshot",
        content: "WLEDashboard supports a full JSON backup and restore covering all 17 database tables: devices, groups, group memberships, presets, schedules, routines, routine steps, spatial dwellings, floors, rooms, anchors, animations, palettes, matrices, matrix drawings, and settings. Backups are performed from Settings > Backup & Restore.",
        steps: [
          "Export: Click Download Backup in Settings. A timestamped JSON file (e.g. wledashboard-backup-v0.21.0-2026-09-16.json) downloads to your browser. No server restart required. Safe to run at any time.",
          "Migrate Between Hosts: Copy the backup file to the new host, launch the container, and use Restore from Backup to load the file. All devices, spatial layouts, automations, and palettes transfer instantly.",
          "Merge Mode (Default): Adds or updates records from the backup file without touching data that is not in the backup. Useful for importing partial configurations or merging setups.",
          "Replace Mode: Clears all existing user tables first, then imports the backup in full. Use this for a clean restore. A two-click confirmation is required to prevent accidental data loss.",
        ],
        callout: {
          type: "warning",
          title: "Restoring a Backup from an Older Version",
          text: "When you restore a backup file from an older version of WLEDashboard onto a newer instance, the restore preview panel will display a version mismatch warning: 'This backup is from v0.14.0 and you are running v0.21.0. Features added since that version will not be in this backup and will remain empty after restore.' This is expected and safe. All tables introduced in the newer version will simply remain empty rather than being overwritten. Your existing data for those newer features is preserved in Merge mode. In Replace mode, newer-version tables are cleared then left empty since the older backup has no rows for them.",
        },
      },
      {
        title: "Bridge Mode vs Host Networking (Understanding mDNS in Docker)",
        content: "mDNS discovery operates over UDP multicast (224.0.0.251:5353). Because Docker's virtual bridge network (docker0) isolates multicast packets from the physical LAN by default, understanding your deployment network mode is key:",
        steps: [
          "Bridge Networking (Default & Recommended): Runs out of the box on Linux, macOS, Windows, Synology, and Unraid. Web traffic routes via port 8301 with zero port collision risk. Devices are managed directly by typing their local IP address in the dashboard or Device Manager.",
          "Host Networking (network_mode: host): Recommended strictly for native Linux hosts (Ubuntu, Debian, Proxmox LXC) if zero-configuration mDNS auto-discovery is desired. Docker Desktop on macOS and Windows does NOT support host mode and will make the container unreachable. When enabling host mode, comment out the 'ports:' mapping section in docker-compose.yml.",
          "Happy Medium 1 - Host mDNS Reflector (Avahi): On Linux hosts running avahi-daemon, enable 'enable-reflector=yes' in /etc/avahi/avahi-daemon.conf. Avahi automatically forwards physical LAN multicast packets into the docker0 bridge, allowing containers in standard bridge mode to receive mDNS announcements.",
          "Happy Medium 2 - Docker Macvlan / Ipvlan: Assigns the container an independent IP directly on your physical home subnet. The container receives native multicast mDNS while keeping host ports and localhost processes isolated."
        ],
      },
      {
        title: "LAN HTTP vs Secure Contexts (Clipboard Copying)",
        content: "Modern browsers disable the async navigator.clipboard API on non-HTTPS origins (except localhost). When accessing WLEDashboard over local IP (e.g. http://192.168.1.50:8301), WLEDashboard uses a specialized universal fallback utility (clipboard.js) to guarantee click-to-copy functionality for IP addresses and credentials across all browser environments.",
      },
      {
        title: "Reverse Proxies, SSL & WebSockets (Nginx Proxy Manager & Cloudflare)",
        content: "When hosting WLEDashboard behind a reverse proxy (such as Nginx Proxy Manager, Cloudflared Tunnel, Caddy, or Traefik) protected by SSL/HTTPS, ensure the following configurations are applied:",
        steps: [
          "Enable Websockets Support in NPM: In Nginx Proxy Manager, open your Proxy Host edit window and ensure the 'Websockets Support' toggle switch is enabled. This forwards the HTTP 'Upgrade' and 'Connection: Upgrade' headers required by the backend /ws endpoint.",
          "Automatic Protocol Negotiation: WLEDashboard dynamically detects the browser protocol. When loaded over HTTPS, it automatically negotiates secure WebSocket connections (wss://) using the active host, avoiding Mixed Content browser security blocks.",
          "Cloudflare Tunnel / Zero Trust: If using Cloudflare Access or Tunnel, ensure WebSocket traffic is allowed in your Cloudflare network dashboard. Session authentication headers are preserved automatically across same-origin WebSocket handshakes.",
          "Spotify OAuth Behind HTTPS: Set your Spotify Developer Dashboard redirect URI to https://your-domain.com/api/spotify/callback. The dashboard will automatically handle token exchanges without exposing internal ports."
        ],
      },
    ],
  },
  {
    id: "cloudflare-tunnel-reverse-proxy",
    category: "networking",
    title: "Remote Access: Cloudflare Tunnel, Reverse Proxies & Spotify OAuth",
    summary: "End-to-end setup guide for hosting WLEDashboard securely behind Cloudflare Tunnels (cloudflared) or reverse proxies, including SSL encryption, WebSockets, Spotify OAuth configuration, and native PWA installation.",
    readTime: "6 min read",
    tags: ["cloudflare", "cloudflared", "tunnel", "reverse-proxy", "ssl", "https", "spotify", "oauth", "pwa", "webapk", "networking", "remote-access", "edge", "chrome", "android", "fastify", "trustproxy"],
    sections: [
      {
        title: "Overview: Why Deploy Behind Cloudflare Tunnel?",
        content: "Cloudflare Tunnel (cloudflared) enables secure remote access to your self-hosted WLEDashboard instance without opening incoming firewall ports or configuring router NAT port forwarding. The cloudflared lightweight daemon creates outbound-only encrypted connections directly to Cloudflare edge nodes, providing automated TLS termination, DDoS mitigation, and a custom public hostname (for example, https://wledashboard.yourdomain.com).",
        callout: {
          type: "note",
          title: "LAN Hardware Protection",
          text: "Your physical ESP32 and ESP8266 WLED controllers remain strictly isolated on your internal local network. Microcontrollers are never exposed to the public internet; WLEDashboard orchestrates them locally while acting as your secure, authenticated gateway.",
        },
      },
      {
        title: "Cloudflare Tunnel Configuration Checklist",
        content: "When creating a Public Hostname tunnel for WLEDashboard in the Cloudflare Zero Trust dashboard (or local config.yml), apply the following settings:",
        steps: [
          "Public Hostname: Assign your desired subdomain and root domain (for example, wledashboard.yourdomain.com).",
          "Service Type: Select HTTP.",
          "Service URL: Point to your container address, such as localhost:8301 (or your host LAN IP, e.g. 192.168.1.50:8301 if cloudflared is running on a different machine).",
          "Network WebSockets Toggle: Navigate to Network settings in your Cloudflare dashboard and verify WebSockets is toggled ON. WLEDashboard relies on WebSockets (/ws) for real-time heartbeat status, power draw, and 3D spatial updates.",
          "SSL/TLS Encryption Mode: Set your Cloudflare SSL mode to Full or Flexible to prevent HTTP redirect loops."
        ],
      },
      {
        title: "Spotify Developer App: Website vs Redirect URIs",
        content: "When connecting Spotify to WLEDashboard for real-time album artwork color extraction, the Spotify Developer Dashboard requires two separate web address fields. Understanding the distinction is essential:",
        steps: [
          "Website Field (Informational Only): Enter the official project website (https://wledashboard.com) or your personal root domain. Spotify uses this field purely as display metadata in your developer portal. It does not affect authorization, token exchanges, or callback redirects.",
          "Redirect URIs Field (Strict & Required): Enter the exact public URL of your personal WLEDashboard instance followed by /api/spotify/callback (for example, https://wledashboard.yourdomain.com/api/spotify/callback).",
          "Protocol Strictness: Spotify strictly mandates HTTPS for all redirect URIs unless the hostname is localhost. Your Cloudflare Tunnel domain satisfies this requirement.",
          "Exact Match Requirement: Spotify validates the redirect URI character for character against the callback request. If the configured URI in Spotify does not match your active browser address, Spotify rejects authorization with the error: redirect_uri: Not matching configuration."
        ],
        callout: {
          type: "tip",
          title: "Copy with One Click",
          text: "WLEDashboard automatically calculates your active external origin and generates the exact callback string in Settings under Spotify Integration. Click the Copy button next to the Redirect URI field to copy it directly into your Spotify app settings.",
        },
      },
      {
        title: "Transparent Reverse Proxy Handling in WLEDashboard",
        content: "To support reverse proxies, Cloudflare Tunnels, and container bridge networks seamlessly, WLEDashboard incorporates several architectural safeguards:",
        steps: [
          "Fastify Proxy Trust: The backend server is configured with trustProxy enabled, allowing Fastify to respect X-Forwarded-Proto, X-Forwarded-Host, and X-Forwarded-For headers passed by cloudflared and Nginx.",
          "State-Preserved Redirects: When initiating Spotify authorization, the dashboard stores the origin domain inside Spotify's cryptographically secure state parameter. When Spotify redirects back, the backend extracts the exact matching URI to complete the token exchange without host header spoofing issues.",
          "WebSocket Auto-Negotiation: The frontend client detects window.location.protocol. When loaded over HTTPS, it automatically negotiates secure WebSocket connections (wss://) to your tunnel domain."
        ],
      },
      {
        title: "Progressive Web App (PWA) & WebAPK Native Installation",
        content: "Hosting behind HTTPS unlocks complete Progressive Web App capabilities on mobile and desktop browsers:",
        steps: [
          "Native Standalone WebAPK: On Android devices using Microsoft Edge or Google Chrome, WLEDashboard installs as a native WebAPK in your Android App Drawer rather than a simple browser shortcut.",
          "Window Isolation: The installed app runs in standalone mode without browser URL bars, navigation buttons, or tab bars, providing a native application experience.",
          "Service Worker Caching: The service worker precaches application shell assets while enforcing strict network bypass for all /api and /ws endpoints, guaranteeing that real-time hardware commands are never stale.",
          "Troubleshooting Shortcuts: If an existing home screen shortcut opens with Edge browser chrome, delete the shortcut from your phone. Open https://wledashboard.yourdomain.com in Edge, refresh once to ensure the service worker registers, then select 'Install WLEDashboard' from the browser menu or in-app modal."
        ],
      },
      {
        title: "Traditional Reverse Proxies (Nginx, Caddy, Traefik)",
        content: "If you operate a self-hosted reverse proxy instead of Cloudflare Tunnels, ensure your virtual host forwards standard proxy and WebSocket upgrade headers:",
        code: {
          language: "nginx",
          description: "Sample Nginx reverse proxy configuration snippet",
          content: [
            "location / {",
            "    proxy_pass http://127.0.0.1:8301;",
            "    proxy_http_version 1.1;",
            "    proxy_set_header Upgrade $http_upgrade;",
            "    proxy_set_header Connection \"upgrade\";",
            "    proxy_set_header Host $host;",
            "    proxy_set_header X-Real-IP $remote_addr;",
            "    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;",
            "    proxy_set_header X-Forwarded-Proto $scheme;",
            "    proxy_set_header X-Forwarded-Host $host;",
            "}"
          ].join("\n"),
        },
      },
    ],
  },
]
