# v0.29.1 Release Walkthrough

## Summary
Version 0.29.1 is a patch release fixing the Studio target dead end reported after refreshing or deep linking straight into `/studio`, plus a sidebar clock fade polish. Studio now loads its own target data, and the preview bar explains itself when groups are missing or loads fail.

## What Is New & Improved

### 1. Studio Target Self Loading
* Root Cause: Studio read the shared device and group stores but never fetched them, relying on other views to have loaded first. A refresh or bookmark into `/studio` left both stores empty: a device only dropdown, no Device/Group toggle, and a disabled Reset with no path forward.
* Ensure On Entry: Studio now fetches devices and groups on mount whenever the stores are empty. Re entering Studio also self heals a failed first load.
* Honest Slot: The toggle position now resolves through a tested `resolveTargetSlot` helper. Load failures show a "Targets failed to load. Retry" affordance that refetches both stores, and a loaded but empty store shows a "No groups yet. Create one" link to the Groups view instead of dead silence.

![Studio No Groups Hint](project_details/changelog/v0.29.1/screenshots/studio-no-groups-hint.png)

### 2. Sidebar Clock Fade In
* Expanding the sidebar now fades and rises the clock chip in over 320ms on the shared expo easing, matching the 280ms sidebar width motion. Collapsing hides instantly.
* The animation replays through a class swap with no remount and no settings refetch, and it disables under `prefers-reduced-motion`.

## Verification
* Web library and store suites: 52/52 passing, including the new slot decision helper tests (written failing first) and group store fetch contract tests. The web test script now also runs `src/stores/*.test.js`.
* API suites: full `node --test` run green.
* Production Vite build clean.
* Headless end to end regression in real Chrome against mock hardware: direct `/studio` deep link shows the toggle with populated targets and a selectable group, and zero groups shows the creation hint linking to `/groups`. 6/6 checks green with zero page errors.

## Operational Notes
* Upgrading to v0.29.1 is completely non-destructive. No schema migration ships in this release, so existing installs upgrade with zero database changes.
* In-place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
* Unraid updates pull and recreate the container without losing application state stored in `/app/data`.
