# WLEDashboard: Complete Design and Architecture Specification

---

## 1. Project Vision

WLEDashboard is a premium local-first control surface for WLED firmware devices. It replaces the
utilitarian grid-of-cards paradigm with a spatially aware, motion-rich interface that treats lighting
control as a first-class design discipline. The application must feel as refined to use as the best
creative tools on the market while remaining dead simple for someone who just wants to turn a strip
on and off.

### 1.1 Core Principles

* **Motion Over Material.** The interface earns its premium feel through physics-based animation,
  not through visual gimmicks like frosted glass or transparency blur. Every transition, every panel
  slide, every value change carries physical weight. Elements accelerate, decelerate, overshoot,
  and settle the way real objects do. Think of how a high-end turntable's tonearm swings: the mass
  is palpable.

* **Light as the Hero.** The WLED output is the visual centerpiece, not the UI chrome. Surfaces
  stay dark and restrained so that the actual color data from connected devices dominates the
  visual hierarchy. The dashboard should feel like a control room where the monitors are the show.

* **Scale Gracefully.** The same interface that feels intimate with a single LED strip must remain
  usable and performant with one hundred devices spread across multiple buildings. This is not
  achieved by hiding complexity but by providing the right level of abstraction at each zoom level.

* **Local First, Always.** No cloud accounts, no telemetry, no subscriptions. The entire system
  runs on the user's local network. Data persists in embedded SQLite. Configuration exports to
  portable JSON files. The user owns everything.

---

## 2. Visual Language

### 2.1 Surface Philosophy

**CRITICAL: This project does NOT use glassmorphism, frosted blur, or transparent panel effects.**

The visual identity is built on rich, opaque, layered surfaces with subtle depth separation. The
aesthetic references professional audio hardware, automotive instrument clusters, and cinematic
color grading tools. Panels feel solid and weighted. Depth is communicated through:

* Elevation shadows (soft, directional, multi-layered)
* Subtle surface texture (noise grain at 1-2% opacity on dark panels)
* Border luminance (1px borders at ~6% white opacity that catch the ambient light color)
* Color temperature shifts between elevation layers (deeper surfaces are cooler/bluer, raised
  surfaces are fractionally warmer)

### 2.2 Color System

The palette is built around a near-black foundation with carefully calibrated accent tones. Generic
primary colors (pure red, blue, green) are banned. Every accent is offset, desaturated slightly,
and tuned to sit harmoniously against the dark canvas.

#### Foundation Tones

| Token              | HSL Value              | Usage                                      |
|---------------------|------------------------|---------------------------------------------|
| `--surface-void`    | `hsl(225, 18%, 5%)`   | App-level background, the deepest layer     |
| `--surface-base`    | `hsl(225, 16%, 8%)`   | Primary content area background             |
| `--surface-raised`  | `hsl(225, 14%, 12%)`  | Cards, panels, drawers                      |
| `--surface-overlay` | `hsl(225, 12%, 16%)`  | Modals, popovers, context menus             |
| `--surface-input`   | `hsl(225, 14%, 10%)`  | Text inputs, select boxes, search fields    |

#### Neutral Text

| Token              | HSL Value              | Usage                                      |
|---------------------|------------------------|---------------------------------------------|
| `--text-primary`    | `hsl(220, 12%, 92%)`  | Headings, primary labels                    |
| `--text-secondary`  | `hsl(220, 8%, 64%)`   | Descriptions, metadata, timestamps          |
| `--text-tertiary`   | `hsl(220, 6%, 42%)`   | Disabled labels, placeholder text           |
| `--text-inverse`    | `hsl(225, 18%, 5%)`   | Text on bright accent backgrounds           |

#### Accent Palette

| Token              | HSL Value              | Role                                       |
|---------------------|------------------------|---------------------------------------------|
| `--accent-amber`    | `hsl(38, 92%, 58%)`   | Primary action, power/brightness controls   |
| `--accent-violet`   | `hsl(262, 68%, 62%)`  | Selections, focus rings, active states      |
| `--accent-cyan`     | `hsl(188, 72%, 48%)`  | Connectivity, sync indicators, info states  |
| `--accent-rose`     | `hsl(348, 72%, 58%)`  | Destructive actions, offline indicators     |
| `--accent-emerald`  | `hsl(158, 64%, 42%)`  | Success confirmations, online indicators    |

#### Dynamic Color

The defining visual feature of WLEDashboard is that the interface reflects the actual WLED output.
This manifests as:

* **Ambient Glow.** Each device card emits a soft radial gradient shadow in the current dominant
  color of its LED output. The glow radius scales with brightness (0 radius at 0% brightness,
  maximum 24px blur at 100%).
* **Border Tinting.** The 1px panel borders shift hue to match the dominant color of the nearest
  WLED device, creating a subtle environmental lighting effect across the entire UI.
* **Header Accent.** The top navigation bar carries a 2px bottom border whose color is derived from
  the blended average of all currently active WLED device colors on the network.

### 2.3 Typography

The type system uses two font families from Google Fonts loaded via `@import` with `display=swap`.

| Role       | Font Family       | Weight Range | Usage                                  |
|------------|-------------------|--------------|----------------------------------------|
| Display    | **Outfit**        | 500, 700     | Page titles, section headers, hero text|
| Body       | **Inter**         | 400, 500, 600| All body text, labels, controls, data  |

#### Type Scale (rem based, 16px root)

| Token         | Size    | Line Height | Letter Spacing | Font     |
|---------------|---------|-------------|----------------|----------|
| `--type-hero` | 2.5rem  | 1.1         | -0.03em        | Outfit 700 |
| `--type-h1`   | 1.75rem | 1.2         | -0.02em        | Outfit 700 |
| `--type-h2`   | 1.25rem | 1.3         | -0.01em        | Outfit 500 |
| `--type-h3`   | 1.0rem  | 1.4         | 0              | Inter 600  |
| `--type-body` | 0.875rem| 1.5         | 0              | Inter 400  |
| `--type-small`| 0.75rem | 1.4         | 0.01em         | Inter 500  |
| `--type-micro`| 0.625rem| 1.3         | 0.03em         | Inter 500  |

### 2.4 Spacing and Layout Grid

All spacing derives from a 4px base unit. Components use an 8px rhythm.

| Token      | Value |
|------------|-------|
| `--sp-1`   | 4px   |
| `--sp-2`   | 8px   |
| `--sp-3`   | 12px  |
| `--sp-4`   | 16px  |
| `--sp-5`   | 20px  |
| `--sp-6`   | 24px  |
| `--sp-8`   | 32px  |
| `--sp-10`  | 40px  |
| `--sp-12`  | 48px  |
| `--sp-16`  | 64px  |

The primary layout uses CSS Grid with a 12-column system at `--sp-6` (24px) gutters. Breakpoints:

| Name       | Min Width | Columns | Gutter |
|------------|-----------|---------|--------|
| `compact`  | 0px       | 4       | 16px   |
| `medium`   | 768px     | 8       | 20px   |
| `expanded` | 1200px    | 12      | 24px   |
| `ultra`    | 1800px    | 16      | 24px   |

### 2.5 Border Radius System

Radii follow a deliberate scale that pairs softness with element size.

| Token        | Value | Usage                                      |
|--------------|-------|--------------------------------------------|
| `--radius-s` | 6px   | Buttons, badges, chips, small inputs       |
| `--radius-m` | 10px  | Cards, panels, modals                      |
| `--radius-l` | 16px  | Large containers, sheets, popovers        |
| `--radius-xl`| 24px  | Hero cards, featured elements              |
| `--radius-full` | 9999px | Circular avatars, pill shapes          |

### 2.6 Elevation and Shadow System

Shadows are multi-layered and carry a subtle blue-shift to match the cool surface palette. Each
elevation level adds a new shadow layer rather than simply increasing blur on a single shadow.

```
--shadow-1: 0 1px 2px hsl(225 30% 4% / 0.3),
            0 1px 3px hsl(225 30% 4% / 0.15);

--shadow-2: 0 2px 4px hsl(225 30% 4% / 0.3),
            0 4px 8px hsl(225 30% 4% / 0.15),
            0 1px 2px hsl(225 30% 4% / 0.1);

--shadow-3: 0 4px 8px hsl(225 30% 4% / 0.3),
            0 8px 16px hsl(225 30% 4% / 0.15),
            0 16px 32px hsl(225 30% 4% / 0.08);

--shadow-4: 0 8px 16px hsl(225 30% 4% / 0.35),
            0 16px 32px hsl(225 30% 4% / 0.2),
            0 32px 64px hsl(225 30% 4% / 0.1);
```

---

## 3. Motion System

This is the soul of the interface. Every animated property in WLEDashboard uses spring physics,
not CSS easing curves. The result is motion that feels weighted and organic rather than robotic.

### 3.1 Spring Physics Model

All animations are computed using a damped harmonic oscillator:

```
F = -kx - cv
```

Where `k` is stiffness (spring constant), `c` is the damping coefficient, and `x` is displacement.
The implementation uses a frame-loop interpolation (requestAnimationFrame) rather than CSS
transitions, giving full control over overshoot, settle time, and velocity inheritance.

#### Spring Presets

| Preset Name     | Stiffness | Damping | Mass | Character                              |
|-----------------|-----------|---------|------|----------------------------------------|
| `snappy`        | 400       | 28      | 1.0  | Quick response, minimal overshoot. Buttons, toggles. |
| `responsive`    | 200       | 22      | 1.0  | Balanced spring. Panels, cards, navigation. |
| `gentle`        | 120       | 18      | 1.0  | Soft arrival. Page transitions, modals.|
| `heavy`         | 80        | 14      | 1.5  | Weighted drift. Large containers, 3D camera. |
| `bouncy`        | 300       | 12      | 0.8  | Visible overshoot. Notifications, success states. |
| `molasses`      | 50        | 20      | 2.0  | Slow, viscous. Background parallax layers. |

### 3.2 Motion Principles

* **Velocity Inheritance.** When a user interrupts an in-progress animation (e.g., flicking a
  panel that is still sliding), the new animation inherits the current velocity of the element.
  This prevents the jarring stop-and-restart pattern of CSS transitions.

* **Directional Mass.** Elements moving vertically carry slightly more perceived mass than
  horizontal motion (1.2x damping multiplier on Y-axis) because users subconsciously associate
  vertical movement with gravity.

* **Gesture-Coupled Motion.** During drag/swipe interactions, the element tracks the pointer
  position with a slight spring lag (stiffness: 600, damping: 35) creating a rubberband feel.
  On release, the element either commits to the action or springs back based on velocity and
  displacement thresholds.

* **Stagger Orchestration.** When multiple elements enter the viewport simultaneously (e.g., a
  grid of device cards), they animate in with a 30ms stagger delay per item, using the
  `responsive` spring preset. The stagger direction follows reading order (top-left to
  bottom-right for LTR layouts).

* **Value Animation.** Numeric displays (brightness percentage, color temperature) interpolate
  using the `snappy` spring preset, causing values to overshoot slightly before settling. This
  creates an analog meter feel.

### 3.3 Transition Choreography

Page-level transitions follow a layered exit/enter sequence:

1. **Exit Phase (150ms budget):**
   * Content elements scale to 0.97 and fade to 0 opacity using `responsive` spring
   * Background surface remains stable (no motion on the container itself)

2. **Route Change (0ms):**
   * New route mounts with content at 0 opacity, translated 12px in the navigation direction

3. **Enter Phase (300ms budget):**
   * Background surface subtly shifts (2px translate in navigation direction) using `heavy` spring
   * Content elements stagger in from their offset position using `responsive` spring
   * Focus is programmatically set to the first interactive element

### 3.4 Micro-interactions

| Interaction         | Property           | Spring Preset | Notes                          |
|----------------------|-------------------|---------------|--------------------------------|
| Button press         | scale             | `snappy`      | Scale to 0.96 on pointerdown, 1.0 on release |
| Toggle switch        | translateX        | `bouncy`      | Knob slides with visible overshoot |
| Slider thumb drag    | coupled position  | Direct track  | 1:1 pointer, spring on release |
| Card hover           | translateY, shadow| `responsive`  | Lift 2px, increase shadow to level 3 |
| Card click           | scale             | `snappy`      | Quick press, 0.98 scale        |
| Notification enter   | translateY, opacity| `bouncy`     | Slide down from -20px with overshoot |
| Modal open           | scale, opacity    | `gentle`      | Scale from 0.95 to 1.0         |
| Modal close          | scale, opacity    | `snappy`      | Fast exit, scale to 0.97       |
| Dropdown open        | scaleY, opacity   | `responsive`  | Transform-origin top, unfold   |
| Tooltip appear       | scale, opacity    | `snappy`      | Scale from 0.9 at pointer position |
| Color swatch select  | scale, ring width | `bouncy`      | Ring springs out around swatch |
| Brightness scrub     | value, glow radius| `snappy`      | Glow expands with brightness   |

---

## 4. WLED Integration Layer

### 4.1 Device Discovery

* **mDNS/Bonjour Scanning.** The backend continuously listens for `_wled._tcp` service
  advertisements on the local network. Discovered instances are registered with their IP address,
  hostname, and mDNS metadata.
* **Manual Registration.** Users can manually add devices by IP address for networks where mDNS
  is unreliable or firewalled.
* **Health Monitoring.** Each registered device is polled at a configurable interval (default: 5s)
  via `GET /json/info`. Devices that fail 3 consecutive polls are marked as `unreachable` but
  remain in the database with their last-known state.

### 4.2 State Synchronization

* **Polling Mode (Default).** Each device's `/json/state` endpoint is polled at the configured
  interval. State diffs are computed client-side to minimize re-renders.
* **WebSocket Mode (When Available).** For WLED firmware versions that support WebSocket push
  (0.14+), the backend maintains a persistent WS connection per device and forwards state
  change events to the frontend via Server-Sent Events or the application's own WebSocket bus.
* **Optimistic Updates.** When the user changes a value, the UI updates immediately using the
  intended value. The actual API response is reconciled in the background. If the device rejects
  the command, the UI springs back to the device-reported value using the `bouncy` preset to
  make the correction feel deliberate rather than broken.

### 4.3 Command Execution

* **Batched Writes.** When a user adjusts multiple properties in rapid succession (e.g., dragging
  brightness while also having just changed color), commands are debounced into a single POST to
  `/json/state` with a 50ms window.
* **Group Commands.** When targeting a group, the backend fans out the POST request to all member
  devices concurrently using `Promise.allSettled`. Per-device failures are surfaced in the UI
  without blocking the rest of the group.
* **Segment Addressing.** The UI fully supports WLED's segment model. Each segment is independently
  controllable with its own color, effect, speed, and intensity values.

### 4.4 Data Binding

* **Live Color Mapping.** The dominant color of each device's current state is extracted from the
  `/json/state` `seg[].col` array and used to:
  * Tint the device card's ambient glow
  * Colorize the device's node in the spatial view
  * Contribute to the global header accent blend
* **Brightness-to-Glow.** The `bri` value (0-255) is normalized to a 0-1 range and mapped to the
  CSS `box-shadow` blur radius on the device card: `blur = bri_normalized * 24px`.

---

## 5. Information Architecture and Navigation

### 5.1 Application Shell

The app shell uses a persistent sidebar + content area layout on `expanded` and `ultra`
breakpoints, collapsing to a bottom navigation bar on `compact` and `medium`.

#### Sidebar (Desktop)

* Width: 260px collapsed to 72px (icon-only mode)
* Toggle between expanded and collapsed via a dedicated button at the sidebar footer
* Contains: Navigation links, device count badge, network status indicator, user preferences
* The sidebar background is `--surface-base` with a 1px right border at `--surface-raised`

#### Bottom Bar (Mobile/Tablet)

* Fixed to viewport bottom, 64px height
* Contains: 5 primary navigation destinations as icon + label pairs
* Active destination indicated by `--accent-violet` icon tint and a 3px top indicator bar
* Uses `safe-area-inset-bottom` padding for notched devices

### 5.2 Primary Navigation Destinations

| Destination        | Icon Concept       | Description                                          |
|--------------------|--------------------|------------------------------------------------------|
| **Dashboard**      | Grid layout        | Overview of all devices with quick controls          |
| **Spatial View**   | 3D cube            | The immersive 3D property model with scroll navigation|
| **Groups**         | Stacked layers     | Device group management and bulk control             |
| **Automation**     | Clock with arrows  | Schedules, routines, triggers, and sequences         |
| **Studio**         | Waveform/palette   | Animation builder and effect designer                |

### 5.3 Secondary Navigation (Accessible from Sidebar or Header)

* **Settings:** Application configuration, network settings, theme preferences
* **Device Manager:** Device registration, firmware info, segment configuration
* **Import/Export:** Configuration backup and restore as JSON

---

## 6. View Specifications

### 6.1 Dashboard View (Home)

The default landing view. Optimized for at-a-glance monitoring and rapid single-device control.

#### 6.1.1 Layout

* **Header Strip.** Displays the current time, total active device count, and a global
  power toggle that controls all devices simultaneously. The power toggle uses a satisfying
  spring animation (`bouncy` preset) with a 200ms color transition from `--accent-rose` (off)
  to `--accent-emerald` (on).

* **Quick Scene Bar.** A horizontally scrollable row of scene preset chips. Each chip displays
  the scene name and a miniature color preview swatch. Tapping a chip applies the scene to all
  devices or the currently selected group. The bar uses momentum scrolling with velocity decay.

* **Device Grid.** The primary content area. Devices are displayed in a responsive CSS Grid that
  adapts column count to the viewport:
  * `compact`: 1 column (full width cards)
  * `medium`: 2 columns
  * `expanded`: 3-4 columns
  * `ultra`: 4-6 columns

#### 6.1.2 Device Card Anatomy

Each device card is a self-contained control surface. The card background is `--surface-raised`
with the dynamic ambient glow described in Section 2.2.

```
+---------------------------------------------------------------+
|  [Status Dot]  Device Name                    [Power Toggle]  |
|                                                                |
|  +----------------------------------------------------------+ |
|  |                   COLOR PREVIEW BAR                       | |
|  |  (full width, 6px height, shows current segment colors)  | |
|  +----------------------------------------------------------+ |
|                                                                |
|  [Brightness Slider ===========================O=== 78%]      |
|                                                                |
|  [Effect: Rainbow]   [Speed: 128]   [Intensity: 200]         |
|                                                                |
|  [Color Picker]  [Palette Selector]  [Preset Dropdown]       |
+---------------------------------------------------------------+
```

* **Status Dot.** 8px circle. `--accent-emerald` when online, `--accent-rose` when unreachable,
  pulsing `--accent-amber` when connecting. The pulse animation uses a CSS `@keyframes` opacity
  cycle at 1.5s interval.
* **Power Toggle.** Compact toggle switch with the `bouncy` spring knob animation.
* **Color Preview Bar.** Renders each segment's current color as a proportionally-sized section
  of the bar. If the device has a single segment, it shows a single gradient. Multi-segment
  devices show distinct color blocks with 1px gaps.
* **Brightness Slider.** Custom range input. The track fill color matches the device's dominant
  color. The thumb has a soft glow that intensifies with brightness value. Value changes are
  debounced at 50ms before sending to the WLED API.
* **Quick Controls Row.** Three compact chips showing the current effect name, speed, and
  intensity. Tapping any chip opens an inline editor panel that slides down using the
  `responsive` spring preset.
* **Action Row.** Compact icon buttons for color picker, palette browser, and preset selector.
  Each opens a popover anchored to the button.

#### 6.1.3 Device Card Interactions

* **Long Press / Right Click.** Opens a context menu with options: Edit Device, Assign to Group,
  Identify (flashes the physical strip), Restart Device, Remove Device.
* **Drag to Reorder.** Cards can be drag-reordered. During drag, the card lifts to `--shadow-4`
  elevation and scales to 1.02. Other cards smoothly reflow around the gap using the
  `responsive` spring preset.
* **Swipe Left (Mobile).** Reveals a quick-action tray with Power, Identify, and Group Assign
  buttons.

#### 6.1.4 Scaling: The 100+ Device Problem

When the device count exceeds the comfortable threshold for a flat grid (approximately 20+), the
Dashboard introduces progressive disclosure:

* **Group Clustering.** Devices assigned to groups collapse into a single group card that shows a
  merged color preview and aggregate controls (group brightness, group power). Tapping the group
  card expands it inline to reveal member device cards with a staggered spring animation.
* **Virtual Scrolling.** For extremely large device counts, the grid uses a virtualized scroll
  container that only renders cards within the viewport plus a 200px overscan buffer. This keeps
  DOM node count constant regardless of device count.
* **Search and Filter Bar.** Appears pinned below the header when device count exceeds 12.
  Supports text search (device name, IP), group filter chips, and status filter (online/offline/
  all). Filter transitions use `snappy` spring for chip add/remove.

### 6.2 Spatial View

The immersive 3D property navigation experience. This is the cinematic centerpiece of the
application.

#### 6.2.1 Scene Graph

The 3D scene is rendered with Three.js and uses a hierarchical scene graph:

```
PropertyRoot
  +-- Dwelling (Main House)
  |     +-- Floor (Ground Floor)
  |     |     +-- Room (Living Room)
  |     |     |     +-- Anchor (TV Console) --> WLED Node
  |     |     |     +-- Anchor (Ceiling Crown) --> WLED Node
  |     |     +-- Room (Kitchen)
  |     |           +-- Anchor (Under Cabinet) --> WLED Node
  |     +-- Floor (Upper Floor)
  |           +-- Room (Bedroom)
  |                 +-- Anchor (Desk) --> WLED Node
  +-- Dwelling (Garage)
        +-- Floor (Ground Floor)
              +-- Room (Workshop)
                    +-- Anchor (Workbench) --> WLED Node
```

#### 6.2.2 Camera System

* **Scroll-Driven Navigation.** Vertical scroll input drives the camera along a predefined
  spline path through the 3D space. The camera path is auto-generated based on the spatial
  hierarchy: it starts with an exterior aerial view, descends into the first dwelling, and
  progresses room-by-room.
* **Spring-Damped Camera.** The camera position and look-at target both use the `heavy` spring
  preset. This means the camera has momentum: a fast scroll flick causes the camera to drift
  past the target room and then settle back, like a weighted crane shot.
* **Idle Drift.** When the user is not interacting, the camera enters a subtle orbital drift
  (0.5 degree/second rotation around the current focal point) with a slight vertical bob using
  a sine wave at 0.1Hz. Mouse movement applies a parallax offset to the camera target
  (maximum 5 degree deviation).
* **Focus Isolation.** When the camera reaches a room, that room's geometry renders at full
  material fidelity with WLED color emission. Adjacent rooms fade to a dark wireframe outline
  at 15% opacity. Rooms more than one step away fade to 5% opacity. This transition uses the
  `gentle` spring preset on material opacity.

#### 6.2.3 Light Visualization

* **Emissive Materials.** Each WLED anchor point generates a Three.js `PointLight` with color
  and intensity derived from the live WLED state. The light's `distance` property is set
  proportionally to the brightness value, creating realistic light falloff.
* **Volumetric Glow.** A custom shader pass adds a volumetric bloom effect around light sources.
  The bloom threshold is set to only capture the WLED-driven emissive materials, preventing the
  UI chrome from blooming.
* **Reflection.** Room floor surfaces use a subtle environment reflection (roughness: 0.85) so
  that the WLED colors create soft colored pools on the ground.

#### 6.2.4 Inline Controls

When a room is in focus, a control panel slides in from the right side of the viewport using the
`responsive` spring preset. This panel contains:

* Device cards for all WLED nodes anchored in the focused room
* Room-level aggregate controls (room brightness, room power, room color override)
* A minimap showing the current camera position on the property floorplan

#### 6.2.5 Procedural Layout Engine

For users without a floorplan import:

* A setup wizard collects: number of dwellings, floors per dwelling, rooms per floor, room names
* The engine generates rectangular room volumes with procedural wall placement
* Rooms are stacked vertically by floor and arranged in an L-shaped or linear layout
* Users can drag room positions in a 2D top-down editor before the 3D scene is generated
* The generated layout persists to SQLite and can be refined iteratively

### 6.3 Groups View

Organizes devices into logical groups for bulk control. Groups are orthogonal to the spatial
hierarchy: a group can contain devices from different rooms, floors, and dwellings.

#### 6.3.1 Group Types

| Type         | Purpose                                              | Visual Indicator      |
|--------------|------------------------------------------------------|-----------------------|
| **Zone**     | Physical area grouping (e.g., "Backyard Perimeter")  | Location pin icon     |
| **Scene**    | Preset state for multiple devices (e.g., "Movie Night")| Palette swatch icon |
| **Sync**     | Devices that always mirror each other's state         | Chain link icon       |
| **Custom**   | Freeform grouping                                    | Tag icon              |

#### 6.3.2 Group Card

```
+---------------------------------------------------------------+
|  [Group Color Swatch]  Group Name              [Sync Badge]   |
|  "5 devices, 4 online"                         [Power Toggle] |
|                                                                |
|  +----------------------------------------------------------+ |
|  |  [Dev1 Mini] [Dev2 Mini] [Dev3 Mini] [+2 more]           | |
|  +----------------------------------------------------------+ |
|                                                                |
|  [Brightness ============================O===== 85%]          |
|  [Effect Selector]    [Color Picker]    [Apply Scene]         |
+---------------------------------------------------------------+
```

* **Device Mini Previews.** Small (32x32px) circles showing each member device's current dominant
  color. Overflow uses a `+N more` chip.
* **Aggregate Brightness.** Adjusting the group brightness slider computes a proportional
  adjustment for each member device, preserving relative brightness differences.
* **Scene Application.** Groups of type `Scene` have a one-tap "Apply" action that pushes the
  saved state snapshot to all member devices simultaneously.
* **Sync Groups.** When a device in a `Sync` group changes state (from any source, including
  physical button or third-party app), the change propagates to all other members within the
  polling interval.

#### 6.3.3 Group Management

* **Create Group.** Modal dialog with: name input, type selector, device multi-select checklist
  with search, optional color assignment.
* **Edit Group.** Same modal with pre-populated values. Devices can be added/removed by toggling
  checkboxes.
* **Drag-to-Group.** On the Dashboard view, dragging a device card onto a group chip in the
  Quick Scene Bar adds the device to that group.
* **Nested Groups.** Groups can contain other groups, enabling hierarchies like "All Outdoor" >
  "Backyard Perimeter" + "Front Porch".

### 6.4 Automation View

Manages time-based and event-based automation for WLED devices.

#### 6.4.1 Schedules

A schedule is a time-triggered action that fires once or on a recurring cadence.

**Schedule Builder UI:**

```
+---------------------------------------------------------------+
|  Schedule: "Sunset Warmup"                       [Enabled]    |
|                                                                |
|  Trigger: Daily at Sunset - 15min    [Edit Trigger]           |
|  Target:  Group "Living Room"        [Change Target]          |
|                                                                |
|  Action:                                                       |
|  +----------------------------------------------------------+ |
|  |  Transition to:                                           | |
|  |  Color: #FF8844  Brightness: 60%  Effect: Solid          | |
|  |  Transition Duration: 30 seconds (fade)                   | |
|  +----------------------------------------------------------+ |
|                                                                |
|  [Delete]                              [Save]   [Test Now]    |
+---------------------------------------------------------------+
```

**Trigger Types:**

| Trigger          | Parameters                                            |
|------------------|-------------------------------------------------------|
| **Time of Day**  | Hour:Minute, timezone-aware                           |
| **Sunrise/Sunset** | Offset in minutes (before/after), requires lat/lon |
| **Interval**     | Every N minutes/hours                                 |
| **Day of Week**  | Select specific days                                  |
| **Date Range**   | Start date to end date (for seasonal schedules)       |

**Actions:**

| Action              | Description                                        |
|---------------------|----------------------------------------------------|
| **Set State**       | Apply color, brightness, effect, palette            |
| **Toggle Power**    | Turn on or off                                     |
| **Apply Scene**     | Activate a saved scene/group preset                 |
| **Transition**      | Gradually fade from current state to target state   |
| **Run Routine**     | Execute a multi-step routine (see 6.4.2)            |

#### 6.4.2 Routines

A routine is an ordered sequence of actions with timing between steps. Think of it as a
lightweight macro system.

**Routine Builder UI:**

A vertical timeline with draggable step cards:

```
+---------------------------------------------------------------+
|  Routine: "Morning Wake-Up"                     [Play] [Edit] |
|                                                                |
|  1. [=] Set "Bedroom" to 5% Warm White          [0:00]       |
|     |                                                          |
|     | wait 5 minutes                                           |
|     v                                                          |
|  2. [=] Transition "Bedroom" to 40% Daylight    [5:00]       |
|     |   over 10 minutes                                        |
|     | wait 10 minutes                                          |
|     v                                                          |
|  3. [=] Set "Kitchen" to 80% Cool White          [15:00]     |
|     |                                                          |
|     | wait 0 seconds                                           |
|     v                                                          |
|  4. [=] Set "Hallway" to 50% Warm White          [15:00]     |
|                                                                |
|  Total Duration: 15 minutes                                    |
|                                                                |
|  [Add Step]                           [Save]   [Test Run]     |
+---------------------------------------------------------------+
```

* **Step Types:** Same actions as schedules, plus: Wait (pause for duration), Loop (repeat a
  subset of steps N times), Conditional (if device X is on, do Y, else do Z).
* **Drag Reorder.** Steps are draggable to reorder. The timeline automatically recalculates
  cumulative timestamps.
* **Inline Preview.** A "Test Run" button executes the routine in real-time with a progress
  indicator overlay showing the current step.
* **Trigger Binding.** Routines can be bound to schedule triggers, manual buttons, or API
  webhooks.

#### 6.4.3 Automation Timeline

A visual calendar/timeline view showing all scheduled events:

* **Day View.** 24-hour vertical timeline with schedule blocks positioned at their trigger times.
  Recurring schedules show as repeating blocks.
* **Week View.** 7-column grid with schedule indicators as colored dots at their time positions.
* **Upcoming List.** A flat chronological list of the next 20 scheduled events with countdown
  timers.

### 6.5 Studio View (Animation Builder)

A creative workspace for designing custom LED animations and effect sequences.

#### 6.5.1 Canvas

The Studio is divided into three panels:

```
+-------------------+-----------------------------+
|                   |                             |
|   EFFECT          |      PREVIEW STRIP          |
|   LIBRARY         |   (horizontal LED sim)      |
|                   |                             |
|   * Solid         +-----------------------------+
|   * Rainbow       |                             |
|   * Chase         |      TIMELINE               |
|   * Breathe       |   (keyframe editor)         |
|   * Fire          |                             |
|   * Twinkle       |   [====|====|====|====]     |
|   * [Custom...]   |                             |
|                   +-----------------------------+
|                   |   PROPERTIES PANEL          |
|                   |   Speed: [====O===]         |
|                   |   Intensity: [======O=]     |
|                   |   Palette: [Selector]       |
+-------------------+-----------------------------+
```

#### 6.5.2 Preview Strip

A real-time CSS/Canvas visualization of the LED output:

* Renders a horizontal strip of individually-colored "LED" circles
* LED count matches the target device's configured LED count
* Updates at 30fps minimum using requestAnimationFrame
* Can be toggled between linear strip, circular ring, and matrix grid layouts to match
  the physical installation shape

#### 6.5.3 Timeline Editor

A horizontal keyframe timeline for sequencing effects:

* **Tracks.** Each track represents a segment or the entire strip. Multiple tracks stack
  vertically for multi-segment choreography.
* **Keyframes.** Diamond-shaped markers on the timeline. Each keyframe stores: effect ID,
  primary/secondary/tertiary colors, speed, intensity, palette ID.
* **Interpolation.** Between keyframes, values interpolate linearly by default. Users can
  select spring interpolation for organic transitions.
* **Playback Controls.** Play, pause, scrub, loop toggle, playback speed (0.25x to 4x).
* **Export.** Exports the timeline as a WLED preset JSON that can be pushed to a device or
  saved to the library.

#### 6.5.4 Effect Library

* **Built-in Effects.** Mirrors the WLED firmware's built-in effect list with preview thumbnails.
* **Custom Presets.** User-created timeline compositions saved as reusable presets.
* **Import/Export.** Preset packs, animation timelines, and palettes export as self-contained JSON files. Users can share these manually (Discord, GitHub Gists, forums) without any server dependency. The import flow validates the JSON schema before applying.
* **Community Hub (Pinned, Future Release).** A read-only browse experience for community-submitted packs. Downloading is anonymous. Uploading requires an account. This feature is explicitly out of scope until the core product is stable and will be addressed as a scheduled release.

#### 6.5.5 Palette Designer

An inline tool for creating custom color palettes:

* **Gradient Editor.** A horizontal gradient bar with draggable color stops. Each stop has a
  color picker and position slider.
* **Preset Palettes.** Quick-select from WLED's built-in palette list.
* **Harmony Generators.** Buttons to auto-generate complementary, analogous, triadic, and
  split-complementary palettes from a base color.
* **Export.** Palettes export as WLED-compatible JSON arrays.

### 6.6 Device Manager

Accessed from the sidebar's secondary navigation. Handles device-level configuration that is
separate from day-to-day control.

#### 6.6.1 Device Detail Panel

* **Identity:** Editable device name, IP address (read-only from discovery), firmware version,
  hardware platform, LED count, max current draw
* **Segments:** List of segments with add/edit/delete. Each segment shows: start LED, stop LED,
  assigned effect, color assignment
* **GPIO Configuration:** Pin assignments (read from WLED info)
* **Firmware Actions:** Restart, factory reset (with confirmation modal), OTA update trigger
* **Network:** Signal strength (if WiFi), connection uptime, average response latency
* **Danger Zone:** Remove device from WLEDashboard (does not affect the WLED device itself)

### 6.7 Settings View

#### 6.7.1 Application Settings

* **Network:** mDNS scan interval, polling interval per device, WebSocket preference toggle
* **Appearance:** Force light/dark mode or follow system, accent color override, animation
  intensity (full / reduced / off for accessibility), card density (compact / comfortable)
* **Data:** Export all configuration as JSON, import configuration, reset to defaults
* **Geolocation:** Latitude/longitude for sunrise/sunset schedule triggers (manual entry, no
  GPS request)

#### 6.7.2 Spatial Configuration

* **Dwelling Editor:** Add/remove/rename dwellings
* **Floor Editor:** Add/remove/rename floors per dwelling, set floor elevation values
* **Room Editor:** Add/remove/rename rooms per floor, set room dimensions (width x depth in
  meters)
* **Anchor Editor:** Add/remove placement anchors per room. Each anchor has: name, type
  (desk, ceiling, baseboard, wall, shelf, custom), position offset (x, y, z), assigned WLED
  device

---

## 7. Component Library

### 7.1 Core Components

| Component          | Description                                              |
|--------------------|----------------------------------------------------------|
| `Button`           | Primary, secondary, ghost, danger variants. Spring press animation. |
| `IconButton`       | Circular button with icon only. Tooltip on hover.        |
| `Toggle`           | Binary switch with spring-animated knob and color transition. |
| `Slider`           | Range input with custom track/thumb. Supports glow effect. |
| `ColorPickerCompact` | Inline HSL strip layout (horizontal hue bar, separate saturation and lightness sliders). Used directly on device cards. Outputs hex, RGB, and WLED-compatible values. |
| `ColorPickerFull`  | Full HSV wheel in a `Popover`. Triggered by expanding the compact strip. Includes a color history row of the last 8 picked colors. |
| `Select`           | Custom dropdown with spring-animated open/close.         |
| `Chip`             | Compact label with optional close button. Used for filters and tags. |
| `Card`             | Elevated surface container with ambient glow support.    |
| `Modal`            | Centered overlay with backdrop. Spring scale animation.  |
| `Drawer`           | Slide-in panel from any edge. Spring translateX/Y animation. |
| `Toast`            | Notification banner. Spring translateY enter, auto-dismiss. |
| `Popover`          | Anchored floating panel. Spring scale from anchor point. |
| `Tabs`             | Horizontal tab bar with spring-animated active indicator. |
| `SearchInput`      | Text input with search icon, debounced onChange (200ms). |
| `SegmentBar`       | Horizontal bar divided into colored segments proportionally. |
| `MiniSwatch`       | Small circle showing a single color. Used in group previews. |
| `Timeline`         | Horizontal draggable timeline with keyframe markers.     |
| `StepList`         | Vertical timeline for routine steps with drag reorder.   |

### 7.2 Composite Components

| Component             | Composed From                                       |
|------------------------|-----------------------------------------------------|
| `DeviceCard`           | Card + Toggle + Slider + SegmentBar + Chips + ColorPickerCompact |
| `GroupCard`            | Card + Toggle + Slider + MiniSwatch array           |
| `ScheduleCard`        | Card + Chips + Button                                |
| `RoutineTimeline`     | StepList + Button + Modal                            |
| `SpatialRoomPanel`    | Drawer + DeviceCard array + Slider                   |
| `EffectPreview`       | Canvas + animation loop                              |
| `PaletteDesigner`     | ColorPickerFull + gradient editor + Slider array     |

---

## 8. Technology Stack

### 8.1 Frontend

| Layer              | Technology                | Rationale                                   |
|--------------------|---------------------------|---------------------------------------------|
| Framework          | **React 19+** (Vite)      | Component model, ecosystem, concurrent features |
| 3D Rendering       | **Three.js + R3F**        | Declarative Three.js via React Three Fiber  |
| Animation          | **Custom spring engine**  | Purpose-built spring physics (no dependency on GSAP licensing) |
| Scroll Management  | **Lenis** or custom       | Smooth scroll normalization for spatial view |
| State Management   | **Zustand**               | Lightweight, framework-agnostic stores      |
| Styling            | **Vanilla CSS** (modules) | Full control, no framework lock-in, CSS custom properties |
| Data Fetching      | **TanStack Query**        | Polling, caching, background refetch for WLED state |
| Virtualization     | **TanStack Virtual**      | Virtual scroll for large device grids       |
| Drag and Drop      | **dnd-kit**               | Accessible, spring-animation-friendly DnD   |

### 8.2 Backend

| Layer              | Technology                | Rationale                                   |
|--------------------|---------------------------|---------------------------------------------|
| Runtime            | **Node.js 22+ LTS**      | Ecosystem compatibility, async I/O          |
| Framework          | **Fastify**               | High-performance HTTP, schema validation    |
| mDNS               | **bonjour-service**       | Zero-config device discovery                |
| Database           | **better-sqlite3**        | Synchronous SQLite, embedded, zero-config   |
| WebSocket          | **ws** (via Fastify plugin)| Device WS connections and client push       |
| Task Scheduling    | **node-cron**             | In-process cron for schedules and routines  |
| Validation         | **Zod**                   | Runtime type validation for API boundaries  |

### 8.3 Deployment Targets

| Target       | Technology              | Notes                                                         |
|--------------|-------------------------|---------------------------------------------------------------|
| **Docker**   | Multi-stage Dockerfile  | Primary deployment target. Single `docker-compose up` deploys the full stack: Fastify API + Vite static frontend in one container. Bind-mounted SQLite database volume for persistence. |
| **Native Desktop** | Tauri              | Optional wrapper around the web app. System tray icon, auto-start on login. Bundles to ~10MB versus Electron's ~150MB. Rust-based security boundary. |
| **Browser (no Docker)** | `npm run start` | Fallback for users who want to run directly on Node without containerization. Serves both API and frontend from the same Fastify process. |

---

## 9. Data Architecture

### 9.1 SQLite Schema (Core Tables)

```sql
-- Discovered or manually added WLED devices
CREATE TABLE devices (
  id TEXT PRIMARY KEY,           -- UUID v4
  name TEXT NOT NULL,
  ip_address TEXT NOT NULL,
  mac_address TEXT,
  firmware_version TEXT,
  led_count INTEGER,
  is_online INTEGER DEFAULT 1,
  last_seen_at TEXT,             -- ISO 8601
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now')),
  updated_at TEXT DEFAULT (datetime('now'))
);

-- Logical groups of devices
CREATE TABLE groups (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('zone', 'scene', 'sync', 'custom')),
  color TEXT,                    -- Hex color for visual identification
  sort_order INTEGER DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Many-to-many: devices in groups
CREATE TABLE group_members (
  group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  device_id TEXT NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  PRIMARY KEY (group_id, device_id)
);

-- Nested groups (group can contain other groups)
CREATE TABLE group_children (
  parent_group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  child_group_id TEXT NOT NULL REFERENCES groups(id) ON DELETE CASCADE,
  PRIMARY KEY (parent_group_id, child_group_id)
);

-- Saved state snapshots for scenes and presets
CREATE TABLE presets (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  group_id TEXT REFERENCES groups(id) ON DELETE SET NULL,
  state_json TEXT NOT NULL,      -- WLED-compatible JSON state per device
  created_at TEXT DEFAULT (datetime('now'))
);

-- Time and event triggered automations
CREATE TABLE schedules (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  trigger_type TEXT NOT NULL,    -- 'time', 'sunrise', 'sunset', 'interval'
  trigger_config TEXT NOT NULL,  -- JSON: {hour, minute, offset, days[], interval}
  action_type TEXT NOT NULL,     -- 'set_state', 'toggle', 'apply_scene', 'run_routine'
  action_config TEXT NOT NULL,   -- JSON: target, state, scene_id, routine_id
  target_type TEXT NOT NULL,     -- 'device', 'group'
  target_id TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Multi-step automated sequences
CREATE TABLE routines (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  is_enabled INTEGER DEFAULT 1,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Individual steps within a routine
CREATE TABLE routine_steps (
  id TEXT PRIMARY KEY,
  routine_id TEXT NOT NULL REFERENCES routines(id) ON DELETE CASCADE,
  step_order INTEGER NOT NULL,
  action_type TEXT NOT NULL,
  action_config TEXT NOT NULL,   -- JSON
  delay_ms INTEGER DEFAULT 0,   -- Wait before this step executes
  target_type TEXT,
  target_id TEXT
);

-- Spatial hierarchy
CREATE TABLE dwellings (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE floors (
  id TEXT PRIMARY KEY,
  dwelling_id TEXT NOT NULL REFERENCES dwellings(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  elevation REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE rooms (
  id TEXT PRIMARY KEY,
  floor_id TEXT NOT NULL REFERENCES floors(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  width REAL DEFAULT 4.0,
  depth REAL DEFAULT 4.0,
  position_x REAL DEFAULT 0,
  position_y REAL DEFAULT 0,
  sort_order INTEGER DEFAULT 0
);

CREATE TABLE anchors (
  id TEXT PRIMARY KEY,
  room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
  device_id TEXT REFERENCES devices(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  type TEXT NOT NULL,            -- 'desk', 'ceiling', 'baseboard', 'wall', 'shelf', 'custom'
  offset_x REAL DEFAULT 0,
  offset_y REAL DEFAULT 0,
  offset_z REAL DEFAULT 0
);

-- User preferences
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

-- Animation presets created in Studio
CREATE TABLE animations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  timeline_json TEXT NOT NULL,   -- Keyframe data
  duration_ms INTEGER NOT NULL,
  created_at TEXT DEFAULT (datetime('now'))
);

-- Custom color palettes
CREATE TABLE palettes (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  colors_json TEXT NOT NULL,     -- Array of {position, color} stops
  created_at TEXT DEFAULT (datetime('now'))
);
```

### 9.2 Client State Architecture (Zustand Stores)

| Store              | Responsibilities                                       |
|--------------------|--------------------------------------------------------|
| `useDeviceStore`   | Device registry, live state cache, optimistic updates  |
| `useGroupStore`    | Group definitions, membership, aggregate state         |
| `useScheduleStore` | Schedule and routine definitions, execution state      |
| `useSpatialStore`  | Dwelling/floor/room/anchor hierarchy, 3D camera state  |
| `useStudioStore`   | Timeline state, keyframes, playback position           |
| `useUIStore`       | Sidebar state, active view, modal stack, toasts        |
| `useSettingsStore` | User preferences, sync with backend settings table     |

---

## 10. Accessibility

* **Reduced Motion.** When `prefers-reduced-motion: reduce` is detected, all spring animations
  are replaced with instant state changes (0ms duration). The UI remains fully functional.
* **Keyboard Navigation.** All interactive elements are focusable. The spatial view has keyboard
  shortcuts for room navigation (arrow keys). The tab order follows visual reading order.
* **ARIA Labels.** All controls have descriptive `aria-label` attributes. Device cards use
  `role="article"` with `aria-labelledby` referencing the device name.
* **Color Contrast.** Text on `--surface-raised` meets WCAG AA (minimum 4.5:1 contrast ratio).
  The `--text-primary` on `--surface-raised` achieves 7.2:1.
* **Screen Reader Announcements.** State changes (device goes offline, schedule fires) are
  announced via `aria-live="polite"` regions.

---

## 11. Performance Budgets

| Metric                          | Target              |
|---------------------------------|----------------------|
| First Contentful Paint          | < 1.2s              |
| Time to Interactive             | < 2.5s              |
| Largest Contentful Paint        | < 2.0s              |
| Cumulative Layout Shift         | < 0.05              |
| JS Bundle (gzipped, no 3D)     | < 120KB             |
| 3D Module (lazy loaded)        | < 250KB gzipped     |
| Animation frame budget          | < 8ms per frame (120fps target) |
| Max DOM nodes (100 devices)    | < 3000 (virtualized) |
| WLED API roundtrip (LAN)       | < 50ms p95           |
| SQLite query time               | < 5ms p95            |

---

## 12. Security

* **No Authentication by Default.** The application runs on a local network and trusts all
  local clients. Authentication is an optional plugin.
* **WLED API Proxying.** All WLED API calls route through the backend proxy. The frontend never
  makes direct requests to WLED device IPs. This centralizes rate limiting and error handling.
* **Input Sanitization.** All user-supplied text (device names, group names, schedule names) is
  sanitized before storage and before rendering to prevent XSS via stored data.
* **Rate Limiting.** The backend API enforces rate limits: 100 requests/second per client IP for
  read endpoints, 30 requests/second for write endpoints.
* **CORS.** Strict origin policy. Only the served frontend origin is allowed.
* **No Remote Code Execution.** The animation builder and routine system execute through a
  constrained action vocabulary. There is no eval, no user-supplied scripts, no plugin system
  that runs arbitrary code.

---

## 13. Implementation Phases

> The Spatial View (Three.js experience) runs as a **parallel development track** alongside
> Phases 1-4 in a separate branch. It does not block functional progress and will be merged
> once the core control surfaces are stable. This allows the spatial work to be validated
> visually and iterated on independently without creating release dependencies.

### Phase 1: Foundation (MVP)

* Project scaffolding (Vite + React + Fastify)
* Design system: CSS custom properties, typography, color tokens, shadow system
* Spring animation engine (custom implementation)
* Backend: Fastify server, SQLite schema, device CRUD API
* mDNS device discovery
* WLED state polling and command proxy
* Dashboard view with device cards (single device control)
* Device card: power toggle, brightness slider, ColorPickerCompact (HSL strip inline), ColorPickerFull (HSV wheel popover)
* Responsive layout (4 breakpoints)
* Docker multi-stage build and `docker-compose.yml`

### Phase 2: Control Depth

* Full effect and palette selectors
* Segment-level control in device cards
* Device detail panel (settings, firmware info)
* Device reorder (drag and drop)
* Search and filter bar
* Toast notification system
* Settings view
* JSON import/export for device configuration

### Phase 3: Organization

* Groups (all four types: zone, scene, sync, custom)
* Group cards with aggregate controls
* Nested groups
* Dashboard group clustering for scale
* Virtual scrolling for 50+ devices
* JSON import/export for groups and presets

### Phase 4: Automation

* Schedule builder (all trigger types)
* Sunrise/sunset calculations (suncalc library)
* Routine builder with step timeline
* Routine execution engine (backend)
* Automation timeline calendar view
* Schedule/routine test execution
* JSON import/export for schedules and routines

### Phase 5: Spatial Experience (Parallel Track, Merge Here)

* Three.js + React Three Fiber integration
* Spatial hierarchy editors (dwelling/floor/room/anchor)
* Procedural room layout engine
* Scroll-driven camera spline system
* Spring-damped camera physics
* Emissive materials and volumetric bloom
* Inline room control panels
* Idle drift and mouse parallax
* Merge spatial branch into main

### Phase 6: Creative Tools

* Studio view layout (library + preview + timeline + properties)
* LED strip preview renderer (Canvas)
* Timeline keyframe editor
* Playback engine with transport controls
* Palette designer with gradient editor
* Harmony generators
* Export to WLED preset JSON
* JSON import/export for animation timelines and palettes

### Phase 7: Polish and Distribution

* WebSocket mode for WLED 0.14+
* Tauri desktop wrapper (system tray, auto-start)
* Performance profiling and optimization pass
* Accessibility audit
* Documentation site

---

## 14. Licensing Disclaimer

WLEDashboard is an independent community project. It is not affiliated with, maintained by, or
endorsed by the official WLED project or Christian Schwinne.