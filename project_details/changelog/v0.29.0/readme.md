# v0.29.0 Release Walkthrough

## Summary
Version 0.29.0 turns Studio preset previewing into a single click flow, brings every picker and list into alphabetical order, restyles 3D Objects into the app design language, corrects five effect simulations against real WLED firmware source, and stabilizes the sidebar clock. Group commands now report device failures honestly, and clock style changes apply instantly.

## What Is New & Improved

### 1. Studio Instant Preview
* No Apply Step: Picking a target fires the current effect at it, and every effect card, row, dropdown option, palette, color, and slider commit pushes straight to hardware. A shared `buildPreviewPayload` helper builds every command and rides the primary color along so lights match the simulator.
* Quieter Feedback: Successful previews stay silent because the hardware is the confirmation. Failures still toast errors, so a dead target never looks live. Color drags debounce to one preview per gesture.
* Sandbox Row: Keep changes and Restore now moved from the removed top banner into the Effect Parameters card beside the picker, next to the names of every sandboxed light.
* Reset Preview: Now reselects Solid in addition to restoring sandboxed devices and clearing the target, with a confirming toast.

![Studio Instant Preview](project_details/changelog/v0.29.0/screenshots/studio-immediate-apply.png)

### 2. Alphabetical Effect Browser
* One Helper: A shared `sort.js` module (`sortedByName`, `sortedByLabel`, `sortedStrings`) applies case insensitive natural ordering everywhere, so Strip 2 lands before Strip 10 without mutating source arrays.
* Full Coverage: Effect cards, compact rows, grouped and flat dropdowns, palettes, device and group pickers, rooms, saved matrices, shapes, strategies, LED chips, weather conditions, and time zones all sort A to Z.
* Kept Logical: Fixed enums (view modes, LED density, matrix sizes, on/off toggles) keep their meaningful order, and Local stays pinned first in time zones.

![Alphabetical Effect Browser](project_details/changelog/v0.29.0/screenshots/studio-effects-sorted.png)

### 3. Firmware Faithful Effect Simulations
Each simulation below was corrected against the real WLED firmware implementation and confirmed on hardware behavior descriptions.
* Dynamic: Stepped random rainbow confetti with firmware re-roll timing (`50 + (255 - speed) * 15` ms) instead of a smooth noise shimmer. Static between rolls, steps across them.
* Android: Primary color window sliding over a static palette gradient while breathing in width, replacing the incorrect teal comet.
* Chase Random: Fixed color comet with the background stepping to a new random color behind the head each sweep, replacing the hue changing comet.
* Running and Saw: Firmware exact wave counts driven by intensity. Both effects intentionally look near identical on hardware because they share one firmware engine with sine versus sawtooth waves.

![Firmware Faithful Effect Simulations](project_details/changelog/v0.29.0/screenshots/studio-dynamic-sim.png)

### 4. 3D Objects Designer Refresh
* Token Styling: Cards, titles, labels, inputs, tables, and buttons now use the same type, spacing, and radius tokens as the rest of Studio. Primary actions moved from amber to violet.
* Spring Toggle: The raw structure guide checkbox is now the shared animated Toggle component.
* Same Blueprint: LED layout preview, cut list, power math, injection guidance, and push to device behavior are unchanged.

![3D Objects Designer Refresh](project_details/changelog/v0.29.0/screenshots/studio-objects-restyled.png)

### 5. Sidebar Clock Stability and Realtime
* Collapse Placeholder: The clock chip stays mounted invisibly while the sidebar is collapsed (and while settings load), so the footer keeps its height and the bottom icons never shift up and down.
* Instant Style: Clock display settings live in the shared UI store, so style and timezone changes render immediately with no sidebar toggle dance.

### 6. Honest Group Receipts
* The groups command route always answers HTTP 200 with an `ok`/`count` receipt, so the client now inspects the receipt and throws on `ok:false` or `count:0` instead of trusting the status code. Group cards stay quiet on success and toast only real failures.

## Verification
* Web library suites: 45/45 passing, including new sort helper and preview payload builder tests.
* API suites: full `node --test` run green.
* Production Vite build clean.
* Headless end to end pass in real Chrome against mock WLED hardware: 42/42 checks green across every immediate apply path, reset/keep/restore with hardware payload inspection, alphabetical ordering, Dynamic stepped behavior, and zero page errors, with click to hardware latency between 10 and 86 ms.

## Operational Notes
* Upgrading to v0.29.0 is completely non-destructive. No schema migration ships in this release, so existing installs upgrade with zero database changes.
* In-place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
* Unraid updates pull and recreate the container without losing application state stored in `/app/data`.
