# PROJECT BACKLOG (TODO)

## COMPLETED: PHASE 1 (Foundation)

* [x] Root npm workspace (package.json)
* [x] bump_version.ps1 script
* [x] API: Fastify server with CORS, rate limiting, WebSocket
* [x] API: SQLite schema with versioned migration runner
* [x] API: Device CRUD routes with Zod validation
* [x] API: Settings routes
* [x] API: mDNS device discovery (bonjour-service)
* [x] API: WLED polling engine with miss-counting and offline detection
* [x] API: WLED command proxy with debounce
* [x] API: WebSocket live state push to frontend
* [x] Web: Vite + React 19 scaffold
* [x] Web: Full CSS design system (tokens, typography, reset, utilities)
* [x] Web: Custom spring physics engine (6 presets, useSpring, useSpringGroup, usePresence, useGestureDrag)
* [x] Web: Color utilities (HSL/RGB/Hex/WLED conversions, glow, blend)
* [x] Web: API client (all endpoints)
* [x] Web: Zustand device store with optimistic updates
* [x] Web: Zustand UI store (sidebar, toasts, modals, header accent)
* [x] Web: WebSocket hook with exponential backoff reconnection
* [x] Web: Button component (4 variants, spring press)
* [x] Web: Toggle component (bouncy spring knob)
* [x] Web: Slider component (dynamic color fill + glow)
* [x] Web: ColorPickerCompact (inline HSL strip)
* [x] Web: SegmentBar (proportional segment color blocks)
* [x] Web: DeviceCard (full device control surface)
* [x] Web: Sidebar (5 nav destinations, collapse, inline SVG icons)
* [x] Web: AppLayout (shell with accent bar)
* [x] Web: Dashboard view (grid, stats, skeleton, empty, error states)
* [x] Web: React Router (all 5 views, placeholder views for future phases)
* [x] Docker: Multi-stage Dockerfile
* [x] Docker: docker-compose.yml (host networking for mDNS)
* [x] Playbooks: dev.md

## COMPLETED: PHASE 2 (Control Depth)

* [x] Toast notification component and system
* [x] Device card context menu (right-click / dots menu: rename, identify, copy IP, remove)
* [x] Device Manager view (`/devices` route with full device CRUD)
* [x] Settings view (`/settings` route with persisted polling/scan intervals)
* [x] Search and filter bar (by name, IP, online/offline status)
* [x] Device reorder with dnd-kit drag-and-drop
* [x] Auto-enrichment of MAC, firmware version, and LED count on first poll
* [x] Playwright screenshot and functional testing automation (`test-v0.2.0.js`)
* [x] pino-pretty devDependency and production transport guard


## COMPLETED: PHASE 3 (Organization)

* [x] Group types (zone, scene, sync, custom)
* [x] Group card component
* [x] Group management (create, edit, delete, nest)
* [x] Dashboard group clustering (devices vs groups mode)
* [x] JSON export/import for devices, groups, settings, and presets
* [x] Fastify Group & Config Backup APIs
* [x] 15/15 passing functional test suite and Playwright screenshot automation


## COMPLETED: PHASE 4 (Automation)

* [x] Schedule builder (fixed time, sunrise, sunset)
* [x] Sunrise/sunset support (suncalc integration)
* [x] Routine timeline builder (multi-step timeline with delay intervals)
* [x] Routine execution engine & 30s background scheduler loop
* [x] 17/17 passing functional test suite and Playwright screenshot automation


## COMPLETED: PHASE 5 (Spatial View)

* [x] Three.js & React Three Fiber WebGL 3D Canvas viewport
* [x] Spatial hierarchy CRUD & SQLite schema tables
* [x] Procedural 3D room geometry renderer with floor plans & wireframe walls
* [x] Real-time emissive LED light strip mesh rendering with live WLED color/brightness sync
* [x] Interactive floating quick-control light overlay
* [x] Spatial hierarchy side editor panel with device-to-anchor bindings
* [x] 9/9 passing functional test suite and Playwright screenshot automation

## COMPLETED: PHASE 6 (Studio)

* [x] Studio view layout & navigation tabs (Preset Browser, Timeline Animator, Palette Creator)
* [x] Live 60-pixel LED strip HTML5 Canvas simulator (`PixelStripCanvas.jsx`)
* [x] WLED built-in effect catalog browser with speed/intensity sliders and live device/group application
* [x] Timeline keyframe animation editor with playhead scrubber and SQLite persistence
* [x] Multi-stop gradient color palette designer with custom library storage
* [x] 7/7 passing functional test suite and Playwright screenshot automation

## COMPLETED: PHASE 7 (Polish)

* [x] Direct WLED 0.14+ real-time WebSocket state streaming client (`wledWsService.js`)
* [x] WCAG 2.1 AA accessibility audit and keyboard focus/ARIA live region polish
* [x] Tauri native desktop app packaging scaffold (`tauri.conf.json`, `Cargo.toml`)
* [x] Operational user guide, deployment manual, and playbook documentation (`user_guide.md`)
* [x] 4/4 passing functional test suite and Playwright screenshot automation

## COMPLETED: PHASE 8 (HA MQTT Bridge, Audio DDP, 2D Matrix)

* [x] Home Assistant & MQTT Integration Bridge with auto-discovery and bi-directional control (`mqttService.js` & `routes/mqtt.js`)
* [x] Real-time audio-reactive Web Audio FFT frequency visualizer with 40 FPS DDP UDP streaming (`AudioVisualizer.jsx` & `audioService.js`)
* [x] 2D LED Matrix Canvas editor with pixel tools, multi-size support, and SQLite drawing library storage (`MatrixEditor.jsx` & `matrixService.js`)
* [x] 7/7 passing functional test suite and Playwright screenshot automation

## COMPLETED: PHASE 9 (Release Candidate / Beta v0.9.0)

* [x] Modal overlay z-index layering fix (`z-index: 100000`) and Drei Html zIndexRange scoping (`[10, 0]`)
* [x] Interactive floating room card controls fix (`sendCommand` parameter resolution & `onPointerDown` event propagation guard)
* [x] 3D Navigation Controls Legend overlay component added to Spatial View canvas
* [x] Panel widening (440px), single-line Edit Room button formatting, and text truncation polish
* [x] Automated Playwright test playbooks & screenshot generation (`screenshot-v0.9.0.js`)

## COMPLETED: PHASE 10 (Virtual Scrolling & 3D Setup Wizard)

* [x] Implement Virtual Scrolling for the Dashboard (handling 100+ devices)
* [x] Implement the Setup Wizard for the 3D Procedural Layout Engine

## PLANNED: PHASE 11 (AI Control & Media Sync)

* [ ] Fastify MCP (Model Context Protocol) / ACP Server integration
* [ ] Expose MCP tools (`get_devices`, `set_state`, `apply_palette`) for AI Natural Language Control
* [x] Spotify "Now Playing" API OAuth & Webhook integration
* [x] Real-time album art dominant color extraction (via `node-vibrant`) and WLED palette application

## PLANNED: PHASE 12 (Weather & Community Hub)

* [x] Dynamic Weather Sync (OpenWeatherMap API, Live Status Widget, Condition Simulator, and Automation Triggers)
* [ ] Pixel Art & Preset Community Hub
