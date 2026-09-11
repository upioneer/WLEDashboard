// Guide Catalog Data for WLEDashboard How-To & Documentation Hub

export const GUIDE_CATEGORIES = [
  { id: "all", label: "All Guides" },
  { id: "groups", label: "Groups & Sync" },
  { id: "traveling", label: "Multi-Controller" },
  { id: "spatial", label: "3D Spatial" },
  { id: "studio", label: "Effect Studio" },
  { id: "automations", label: "Automations" },
  { id: "networking", label: "Networking & Docker" },
]

export const GUIDES = [
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
    tags: ["docker", "compose", "mdns", "networking", "sqlite", "lan", "http", "clipboard"],
    sections: [
      {
        title: "Automatic Device Discovery (mDNS)",
        content: "WLEDashboard scans the local subnet using multicast DNS (mDNS for service type _wled._tcp). When a WLED device is turned on, the discovery service automatically identifies its IP address, MAC address, device name, and hardware configuration.",
      },
      {
        title: "Docker Compose Deployment",
        content: "Deploying WLEDashboard in Docker provides a self-contained production stack with pre-built images from GitHub Container Registry:",
        code: {
          language: "yaml",
          description: "Standard docker-compose.yml configuration",
          content: [
            "version: \"3.8\"",
            "",
            "services:",
            "  wledashboard:",
            "    image: ghcr.io/upioneer/wledashboard:latest",
            "    container_name: wledashboard",
            "    ports:",
            "      - \"3001:3001\"",
            "    environment:",
            "      - NODE_ENV=production",
            "      - DATA_DIR=/app/data",
            "    volumes:",
            "      - wledashboard_data:/app/data",
            "    restart: unless-stopped",
            "",
            "volumes:",
            "  wledashboard_data:"
          ].join("\n"),
        },
      },
      {
        title: "Bridge Mode vs Host Networking",
        content: "When running Docker containers on Linux hosts or Proxmox LXC containers:",
        steps: [
          "Bridge Networking (Default): Exposes port 3001 for browser access. Suitable for direct IP device management.",
          "Host Networking (network_mode: host): Required if you want the containerized backend to receive raw mDNS multicast UDP broadcasts (_wled._tcp) across physical subnet boundaries."
        ],
      },
      {
        title: "LAN HTTP vs Secure Contexts (Clipboard Copying)",
        content: "Modern browsers disable the async navigator.clipboard API on non-HTTPS origins (except localhost). When accessing WLEDashboard over local IP (e.g. http://192.168.1.50:3001), WLEDashboard uses a specialized universal fallback utility (clipboard.js) to guarantee click-to-copy functionality for IP addresses and credentials across all browser environments.",
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
]
