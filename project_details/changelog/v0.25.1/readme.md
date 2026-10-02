# v0.25.1 Release Walkthrough

## Summary
Version 0.25.1 answers the clock sync question: a live server clock in the sidebar footer, a Time & Clock settings section, and documented host NTP guidance. Schedules and automations run on server time, which follows the host clock on every supported platform, so no in-app NTP was built.

## What Is New & Improved

### 1. Sidebar Clock Chip
* Live server clock rendered in the sidebar footer above the collapse toggle, hidden when the sidebar is collapsed.
* Three styles: Full (time with seconds plus date), Compact (time plus zone abbreviation), and Minimal (time only).
* Timezone selectable in Settings, defaulting to the browser locale. The chip syncs against `GET /api/system/time` with client delta correction every five minutes and ticks locally every second, so it shows true server time even when the viewing device clock drifts.

### 2. Time & Clock Settings Section
* New leading Settings section with sidebar clock on/off toggle, clock style select, and display timezone select (Local plus 19 IANA zones).
* Live server time and server timezone readout inline, plus a one paragraph statement that automations follow the host clock and no separate NTP setup exists inside WLEDashboard.

### 3. Server Time Endpoint & Guides
* New `GET /api/system/time` returning ISO server time, server timezone name, and UTC offset, with a committed API test.
* Automations guide gains a Server Time, Host NTP & Sidebar Clock section with per platform guidance for Docker (`timedatectl`), Proxmox (Datacenter time sync), and Unraid (Settings > Date and Time).

### 4. Gallery & Docs
* New UI Highlights card: Sidebar Clock & Time Settings with `project_details/changelog/v0.25.1/screenshots/settings-time-clock.png` so the website gallery picks it up via the README scraper format.

## Operational Notes
* Upgrading to v0.25.1 is completely non-destructive and requires no manual database migrations. Settings keys default sensibly on fresh and existing installs (chip on, compact style, local timezone).
* If automations fire at the wrong hour, check the host timezone first: the container and LXC runtimes inherit the host clock, and the app intentionally provides no clock of its own to go stale.
