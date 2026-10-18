# v0.30.0 Release Walkthrough

## Summary
Version 0.30.0 is a minor release bundling Device Manager sort options, app wide ambient background patterns, a tags based update check fallback, secure context guards for the microphone and location features, and a new Settings flow that syncs device friendly names straight from the controllers. It also thanks three more community members.

## What Is New & Improved

### 1. Device Manager Sort Options
* The Device Manager header gains a sort dropdown with Manual Order, Alphabetical A-Z (the new default), Alphabetical Z-A, Online First, Updates First, and Date Added.
* Sorting runs through the shared natural order helper, so Deck 2 correctly precedes Deck 10 and casing never skews the list.
* The choice persists per browser across visits.

![Device Manager Sorts](project_details/changelog/v0.30.0/screenshots/device-manager-sorts.png)

### 2. Ambient Background Patterns
* Seven subtle shell patterns (Aurora, Diagonal Stripes, Dots, Grid, Matrix Rain, Shapes, Waves) plus a None default, picked in Settings under Background and Ambiance.
* Color follows a custom pick or live device and group state, motion respects reduced motion settings, and the treatment now shows on every view including Studio, whose opaque root previously hid it.

![Dashboard Ambient Background](project_details/changelog/v0.30.0/screenshots/dashboard-bg.png)

### 3. Device Name Sync
* Settings gains a Device Names section that pulls the friendly name stored on each controller and saves it locally, with per device checkboxes, Select All, Clear, and Sync Now.
* The new endpoint reports updated, unchanged, and failed counts with per device errors, so unreachable controllers and empty names surface honestly instead of failing silently.
* The list renders alphabetically and Settings now fetches devices on direct navigation so the section is never mysteriously empty.

![Device Name Sync](project_details/changelog/v0.30.0/screenshots/settings-names.png)

### 4. Microphone And Location Guards
* The Studio microphone button and the Settings Auto Detect Location button now probe for a secure context and API availability before rendering. Unsupported browsers get a disabled button, an explanatory tooltip, and an inline notice instead of dead clicks or raw browser errors.
* Denial, missing hardware, busy device, timeout, and abort cases each map to plain language error toasts that name the remedy.

![Location Guard Notice](project_details/changelog/v0.30.0/screenshots/settings-geo-notice.png)

### 5. Update Check Tags Fallback
* The sidebar update check now falls back to the repository tags endpoint when the releases endpoint has no published release, matching the tags only shipping flow so outdated installs actually see the badge.

### 6. Community Thanks
* Special Thanks welcomes piiotre, tablatronix, and railstop on GitHub. railstop also appears under the Reddit identity, since dual platform contributors now get one entry per platform.

## Verification
* API suites: 83/83 passing, including the new name sync endpoint tests covering changed, unchanged, unreachable, empty name, unknown id, all devices, and timeout paths.
* Web suites: 73/73 passing, including the new microphone and geolocation support helper tests.
* Production Vite build clean.
* Headless end to end in real Chrome against mock hardware: 27/27 checks green with zero page errors across the mic guard, name sync flow, location guard, and time settings persistence probes.

## Operational Notes
* Upgrading to v0.30.0 is completely non destructive. No schema migration ships in this release, so existing installs upgrade with zero database changes.
* In-place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
* Unraid updates pull and recreate the container without losing application state stored in `/app/data`.
