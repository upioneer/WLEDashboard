# v0.27.0 Release Walkthrough

## Summary
Version 0.27.0 makes Effect Studio non-destructive and hardens the full device command pipeline. Studio now snapshots every touched device and restores it on exit unless you keep the changes. Underneath, per device command queues coalesce to latest intent, stale responses can no longer clobber fresh state, hung commands time out honestly, and WLED WebSockets reconnect with backoff. A manual Refresh State control and reusable saved matrices round out the release.

## What Is New & Improved

### 1. Studio Sandbox (Non-Destructive Studio)
* Lazy Snapshots: The first Studio originated command to a device (Preset Browser device or group apply, 3D Objects push) captures its live state into the studio store before sending. DDP marquee and audio pushes are excluded because live overrides already self revert.
* Exit Restore: Leaving the Studio route sends every unkept snapshot back through the normal command path and clears the sandbox. Offline devices fail honest with a named toast and never block.
* Keep Or Restore Banner: While previews are unkept, Studio shows "Sandbox mode. Leaving Studio restores {names}." with Keep changes and Restore now buttons. Keeping clears the sandbox, and further tweaks start a fresh snapshot from the kept look.
* Punchy Inline Copy: Preset Browser shows "Preview freely. Keep it or lose it on exit." and 3D Objects shows "Sandboxed: your light restores on Studio exit unless you keep it." The Studio guide documents the contract.

![Studio Sandbox Banner](project_details/changelog/v0.27.0/screenshots/studio-sandbox.png)

### 2. Command Pipeline Hardening
* Queue Coalescing: The per device chain keeps at most one waiter behind the active command. New arrivals supersede the waiter, whose caller shares the newer result, so rapid effect and color changes converge on latest intent instead of grinding abandoned backlog. Cross device isolation is preserved.
* Stale Response Guard: `sendCommand` tags every request with a per device sequence number and ignores responses older than the latest request, for both merges and rollbacks. Fast clicking can no longer display or act on fiction.
* Honest Timeouts: Device and group commands abort at 10 seconds (group fan-out stays parallel, firmware uploads untouched), so hung requests reject, roll back, and toast instead of hanging silently.
* WebSocket Reconnect: Dropped WLED sockets reconnect with 1s doubling backoff capped at 30s, reset on open, and stopped by disconnect. Timers are unrefed so they never hold the process open.
* Regression Coverage: New `audio.test.js`, `wledWs.test.js`, and `commands.test.js` suites plus coalescing, refresh, and config tests bring the API suite to 74 passing and the web lib suite to 33 passing.

### 3. Manual Refresh State
* New Endpoint: `POST /api/devices/:id/refresh` forces a live `fetchDeviceState` past the cache, updates subscribers, and returns fresh truth with 404 and 502 honesty.
* Card Control: The device card context menu gains a Refresh State item with spinner state and success or unreachable toasts, giving every screen a "give me truth now" button.

![Refresh State Control](project_details/changelog/v0.27.0/screenshots/dashboard-refresh.png)

### 4. Saved Matrix Recall
* One Click Panels: The marquee tab gains a Saved matrix row backed by the previously orphaned `matrix_configs` API. Pick a config to recall size, target device, and serpentine wiring together, save the current setup under the Name field, or delete it. Configs pointing at removed devices show an honest unbound entry.
* Serpentine Storage: Migration v12 adds a `serpentine` flag to `matrices` with boolean normalization on read and full CRUD test coverage.
* Blank Name Fix: The matrix config schema reordered to `trim().min(1)` so whitespace names reject with 400 instead of persisting (Zod checks run in chain order).

![Saved Matrix Recall](project_details/changelog/v0.27.0/screenshots/studio-saved-matrix.png)

### 5. Marquee Push Safety
* Clear On Stop: Every push stop path (Stop button, mode switch, design load, unmount, hidden tab) now sends a final blank DDP frame through a shared `stopPushWithClear` helper, so signs clear instead of freezing mid scroll.
* Visibility Guard: Hiding the browser tab stops the push with an explanatory toast, since background throttling would otherwise leave a frozen frame.

## Operational Notes
* Upgrading to v0.27.0 is completely non-destructive. Migration v12 (`serpentine` on `matrices`) applies automatically on startup with safe defaults, so existing configs and upgraded databases initialize without crashes.
* In-place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
* Unraid updates pull and recreate the container without losing application state stored in `/app/data`.
