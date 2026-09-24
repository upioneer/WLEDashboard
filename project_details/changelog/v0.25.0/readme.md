# v0.25.0 Release Walkthrough

## Summary
Version 0.25.0 introduces comprehensive enhancements across Effect Studio, headlined by the new 3D Objects Designer for custom physical LED installations, custom sizing and enhanced editing tools in the 2D Matrix Canvas, a major overhaul of the live LED strip simulator providing 50 authentic simulation algorithms, and a 2-position Cards versus Dropdown / List view toggle in the Preset Browser.

## What Is New & Improved

### 1. Studio 3D Objects Designer
* Physical Shape Modeling: Added interactive 3D layout modeling for 8 physical installation topologies: Cone Tree, Flat Plane, Sphere, Cylinder, Cube, Ring, Arch, and Spiral.
* Emphasized LED Geometry: Corrected cone spiral and ring sampler geometry to prominently render actual LED string paths while muting structural support scaffolding for clearer visual clarity.
* Auto-Updating Previews: Implemented reactive preview updates upon changing dimensions, density, turns, or layout strategy without requiring manual preview trigger clicks.
* Mandatory Naming & Collision Prevention: Enforced mandatory object naming (`Name *`) with client-side and backend duplicate name validation returning HTTP 409 Conflict.
* Persisted Installation Library: Added persistent database storage with instant recall, live three-dimensional canvas preview, and deletion capabilities.
* Power & Injection Estimator: Embedded real-time electrical math calculating total amperage, wire length (including 5% safety margin), power supplies needed, and recommended wire gauge across WS2812B (5V), WS2811 (12V), and SK6812 (5V) chipsets.

![3D Objects Designer](project_details/changelog/v0.25.0/screenshots/studio_3d_objects.png)

### 2. 2D Matrix Canvas Upgrades
* Custom Dimensions: Introduced a `Custom` size option with dedicated width and height inputs (1 to 64 pixels), dynamically adjusting canvas layouts while preserving existing pixel artwork on resize.
* Viewport Navigation & Zoom: Enforced a minimum readable cell threshold (`16px`) with a scrollable canvas viewport and zoom controls (`-`, `100%`, `+`, and `Ctrl + Wheel`).
* Unified Name Requirements: Enforced mandatory drawing names matching the 3D Objects standard, complete with client and backend collision checks on save.
* Drawing Ergonomics: Implemented click-to-black toggling, drag-to-black eraser mode, and right-click erasure for fast pixel manipulation.
* Gallery Management: Added saved drawings list with live thumbnail previews and fast deletion.

![Custom 2D Matrix Canvas](project_details/changelog/v0.25.0/screenshots/studio_matrix_custom.png)

### 3. Pinned LED Strip Simulator & 50 Authentic Effect Algorithms
* Root Cause of Simulator Uniformity: Prior versions used hardcoded animation routines for only the first 6 basic effects (IDs #00 through #05). All subsequent 44 built-in WLED effects (IDs #06 through #49) defaulted to a single generic sine-wave fallback that ignored active WLED palettes and intensity settings. While physical WLED controllers received valid effect IDs, the web interface gave the appearance that nearly all effects were identical.
* Authentic Simulation Engine: Implemented 50 dedicated mathematical simulation routines reproducing genuine WLED firmware behavior, including Fire 2012 heat diffusion, Pacifica ocean swells, Lightning strobe discharges, ICU focal gaze points, Candle flickers, Multi-Comet trails, and Colorwaves.
* Dynamic Palette Sampling: Added real-time palette sampling (`samplePalette`) supporting Party, Cloud, Lava, Ocean, Forest, Rainbow, Sunset, Cyberpunk, and Amber Glow palettes.
* Pinned Simulator: Affixed the live 60-pixel LED strip canvas simulator (`position: sticky; top: 12px; z-index: 25`) so continuous real-time visual feedback remains anchored while scrolling through the effect catalog.

![Pinned Strip Simulator](project_details/changelog/v0.25.0/screenshots/studio_pinned_simulator.png)

### 4. Preset Browser 2-Position View Mode Toggle
* Viewport Toggle: Added a 2-position segmented toggle in the Preset Browser toolbar to instantly swap between the multi-column **Cards** view and a compact **Dropdown / List** view.
* Instant Dropdown Jumps: Included a category-grouped dropdown selector directly above the list rows for zero-scroll effect selection.
* High-Density Compact List: Added clean rows featuring ID badges, titles, category pills, and active `Previewing` indicators, reducing scrolling footprint by 75%.
* Session Persistence: User view preference is saved locally via `localStorage` (`wled_studio_preset_view_mode`) across page reloads.

![Preset Browser Dropdown and List View](project_details/changelog/v0.25.0/screenshots/studio_preset_list_view.png)

### 5. Documentation & Nomenclature
* Studio Guide Refresh: Updated Studio guide article title to **"Effect Studio, Timelines, 2D Matrix & 3D Objects"** with synchronized tooltips and subtitles across the application.

## Operational Notes
* Upgrading to v0.25.0 is completely non-destructive and requires no manual database migrations.
* In-place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
* Unraid updates pull and recreate the container without losing application state stored in `/app/data`.
