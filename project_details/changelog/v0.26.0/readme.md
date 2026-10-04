# v0.26.0 Release Walkthrough

## Summary
Version 0.26.0 introduces the Studio Marquee Maker, a scrolling LED text sign designer with multi row Minimsg style layouts, live preview, and one click DDP push to physical matrices. The release also hardens Studio pattern delivery with a per device command queue and honest failure reporting, adds a Spatial View mouse button swap preference, documents the host driven time policy, and clarifies Proxmox packaging licenses.

## What Is New & Improved

### 1. Studio Marquee Maker
* Scrolling Sign Designer: Added a Marquee tab to the 2D Matrix Canvas with per row text inputs, per row colors, background color, speed slider (1 to 60 px/s), scroll direction, and serpentine wiring toggle for zigzag wired panels.
* Clean Room 3x5 Font: Ships a purpose built uppercase 3x5 pixel font (A to Z, 0 to 9, punctuation) at a 6px row pitch with a 1px inter row gap for crisp small matrix text.
* Automatic Row Capacity: Row support follows maxRows = floor((H - 2) / 6), so 8px banners fit one row, 16px panels fit two, and 32px panels fit five, with rows vertically centered for even top and bottom buffers. Matrices shorter than 7px show guidance instead of broken text.
* Live Scroll Preview: The matrix grid renders the scrolling sign in real time at a 10 fps relay clock, restarting cleanly whenever text, size, or direction changes.
* One Click DDP Push: Pushes live frames to any online controller over DDP (UDP port 4048) via the new `POST /api/matrix/stream-ddp` endpoint backed by a shared DDP service extracted from the audio relay. The controller shows the marquee as a live override and returns to its previous effect when pushing stops.
* Savable Marquee Presets: Signs persist as `kind: marquee` drawings (migration v11 adds `kind` and `params_json`) storing text, colors, speed, direction, size, and wiring, and reload into the Marquee tab from the Saved Designs gallery.
* In App Guide: Added a Marquee Text Scroller section to the Studio guide covering row capacity math, DDP networking requirements, serpentine wiring, and Docker bridge behavior.

![Studio Marquee Maker](project_details/changelog/v0.26.0/screenshots/studio_marquee_maker.png)

### 2. Studio Pattern Delivery Reliability
* Root Cause: `sendDeviceCommand` returned `{ok: true}` even when the WLED POST failed or timed out, sent every command twice (WebSocket plus HTTP), and never serialized requests, so rapid pattern changes collided on single connection ESP HTTP servers and the UI showed optimistic patterns until the next poll overwrote them.
* Per Device Command Queue: Commands now serialize per device with a 75ms settle delay so follow up commands survive on busy ESP servers.
* WebSocket Fast Path: An open WLED WebSocket delivers the command in real time and skips the redundant HTTP POST, halving ESP load.
* Honest Failures: Failed commands return `{ok: false}` so the UI rolls back instead of pretending, and the API surfaces HTTP 502 for real device errors. All ten call sites were audited for honest failure tolerance.
* Regression Coverage: Added `deviceCommands.test.js` proving ordered delivery plus both failure modes.

### 3. Spatial View Mouse Button Swap
* Preference Toggle: Added a `spatial_swap_mouse` setting with a switch in Settings > Spatial View (fulfills the inline TODO in the 3D canvas).
* Honored by the 3D Canvas: When enabled, left drag rotates and right drag pans, instead of the default left pan and right rotate. Default behavior is unchanged.

![Spatial View Mouse Swap](project_details/changelog/v0.26.0/screenshots/settings-spatial-mouse-swap.png)

### 4. Time Policy Documentation
* Decided by Design: Dashboard clock display (sidebar footer chip, shipped v0.25.1), NTP/manual entry (declined in favor of host driven time), and the automation time source policy (server local time only, surfaced via the sidebar clock plus Settings readout) are reconciled in the backlog with Guides documentation.
* No Dead Toggles: Schedules and automations follow the host NTP synchronized clock on every platform with no separate setup and no user facing source switch.

### 5. Proxmox Packaging & License Clarity
* Submission Copies: Added MIT licensed community-scripts submission copies under `install/proxmox/community/` (`ct/wledashboard.sh` plus `install/wledashboard-install.sh`), ready for the upstream PR channel.
* Proprietary Headers: Corrected the standalone installer headers to All Rights Reserved per `LICENSE.md` with pointers to the MIT licensed submission copies.

## Operational Notes
* Upgrading to v0.26.0 is completely non-destructive. Migration v11 (`kind`, `params_json` on `matrix_drawings`) applies automatically on startup with safe defaults, so existing drawings and upgraded databases initialize without crashes.
* In-place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
* Unraid updates pull and recreate the container without losing application state stored in `/app/data`.
