# v0.31.0 Release Walkthrough

## Summary
Version 0.31.0 is a minor release headlined by Virtual Strips, a sidebar page that chains controllers into continuous 1D runs with firmware sourced LED bookends and per member reverse direction. It also resolves the effect ID drift defect by resolving effects by name, pushes matrix draw art to hardware, restyles cards and controls in a flat hairline language, and aligns every page header on one pattern.

## What Is New & Improved

### 1. Virtual Strips Page
* A new sidebar page and route build ordered 1D runs from multiple controllers, with pattern transport, per member health, fallback snapshots, and auto resume.
* Six starter patterns ship: Solid, Chase, Wipe, Rainbow, Gradient, and Theater Chase.
* Studio keeps a slim play and stop panel that replays each strip's last performance, plus a link to the full page.
* Strips are automation citizens with start and stop routine and schedule actions, and timeline keyframes carry the strip performance shape.
* Limits stay documented in the guide: 1500 total LEDs, 8 members, 30 fps, 1D only.

![Virtual Strip Playing](project_details/changelog/v0.31.0/screenshots/strips-running.png)

### 2. LED Count Sync And Hard Bookends
* A new sync endpoint pulls configured LED counts from firmware, preferring the info LED count with a segment stop fallback, and Settings gains a Sync LED Counts button beside names.
* The Device Manager already accepted manual counts, which remain the fallback for unreachable controllers.
* Strip member ranges are hard bookended by the device max on the server, and the builder edits inclusive Start and End with clamps, max badges, and unknown max guidance.
* The swap button reverses travel direction through a member, with traversal order display and reversed DDP slices on hardware. Each device can appear in a strip only once.

![Strip Builder With Bookends](project_details/changelog/v0.31.0/screenshots/strips-page.png)

### 3. Effect IDs Resolved By Name
* Fixes #6: static effect ids drift across firmware, so sends now resolve the stable effect name against each controller live list at send time, including per member fanout for mixed firmware groups.
* Studio pickers show the target full live list, the simulator keys by name with a fallback wave, and timelines store effect names.
* The 50 entry catalog is audited against 0.16.1: 5 renames aliased, 5 removals degrade to numeric fallback with a warning.
* Weather effects map by name, also fixing Snow and Thunderstorm on modern firmware.

### 4. Matrix Draw Push
* The 2D matrix draw mode gains its own hardware push with the shared keepalive row and serpentine addressing, matching marquee push semantics including clear behavior.

### 5. Flat Hairline Restyle
* Device and group cards drop colored outer glow for depth shadow plus a 1px border tinted with the live color at 38 percent. Lit only; offline cards stay neutral.
* The preview strip gains real flat bar geometry after shipping with no defined shape, and selection states across toggles, pills, swatches, badges, and buttons flatten to border and tint affordances.
* Offline cards render uniform dark grey marching ants on the strip with dashed dimmed borders, while the name row stays crisp above the blur so unreachable devices stay identifiable.
* Focus rings, status dots, the timeline playhead, the identifying pulse, and artwork reactive player glow remain as functional affordances.

![Flat Hairline Dashboard](project_details/changelog/v0.31.0/screenshots/dashboard-hairline.png)

![Offline Marching Ants](project_details/changelog/v0.31.0/screenshots/offline-ants.png)

![Flat Group Cards](project_details/changelog/v0.31.0/screenshots/groups-flat.png)

### 6. Consistent Page Headers
* Every page now presents the same header pattern: h1 title with tight tracking, body secondary subtitle, and header actions at right.
* Studio moves off its centered narrow column onto the standard full width shell with the simulator, tabs, and panels flowing below.
* Device Manager subtitle and header structure plus Advanced spacing align to canon. Spatial View stays exempt as a fullscreen canvas.

![Aligned Studio Header](project_details/changelog/v0.31.0/screenshots/studio-header.png)

## Verification
* API suites: 124/124 passing, including strip CRUD, player DDP order and reversal, bookend validation, LED sync paths, and effect name resolution.
* Web suites: 87/87 passing, including range helpers, display order, and store coverage.
* Production Vite build clean.
* Live headed probes against the preview database: over max rejected, exact max accepted, sync route live, swap toggles traversal both directions, duplicate devices greyed out, offline borders neutral while online borders tint.
* Release screenshots captured in headless Chrome with created fixtures cleaned up afterward.

## Operational Notes
* Upgrading to v0.31.0 is non destructive. Migration 013 adds the virtual_strips table only; no existing table changes, and both fresh installs and upgraded databases initialize cleanly.
* In place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
* Unraid updates pull and recreate the container without losing application state stored in `/app/data`.
