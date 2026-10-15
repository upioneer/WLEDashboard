# v0.28.0 Release Walkthrough

## Summary
Version 0.28.0 finishes the Studio sandbox story with honest delivery feedback and a reworked preview target picker. Applies now toast success only on confirmed delivery and say plainly when a device or group does not respond. The Preset Browser apply bar becomes a Device/Group toggle plus a single target dropdown plus explicit Apply and Reset preview controls, backed by one shared restore routine used everywhere.

## What Is New & Improved

### 1. Preview Target Picker
* Kind Toggle: A Device/Group segmented control (hidden when no groups exist) drives a single conditional target dropdown, replacing the two auto firing selects. Switching kinds clears the selection so device and group previews never tangle.
* Explicit Apply: The Apply button stays clickable, so re applying after a speed, intensity, or palette tweak finally works. It disables only when no target is chosen.
* Reset Preview: A Reset preview button restores all sandboxed devices and clears the target in one click, with a confirming toast. It disables when nothing is sandboxed. 3D Objects gets the same Reset preview control next to its Apply for consistency.

![Studio Preview Target Picker](project_details/changelog/v0.28.0/screenshots/studio-target-picker.png)

### 2. Honest Apply Toasts
* Delivery Receipts: `sendCommand` now reports `{ ok, stale }` instead of resolving silently. Superseded commands stay quiet because the newer command owns feedback.
* Awaited Applies: Preset Browser (device and group) and 3D Objects await the result. Success keeps the existing confirmation; failure shows `"X" did not respond to the effect` as an error instead of claiming a win.
* Diagnostic Value: The toast now distinguishes transport failure (error toast) from ESP side no-ops (success toast, dark strip), which directs the next debugging step instead of guessing.

### 3. Shared Restore Routine
* One Path: A `restoreSandbox` store action sends every snapshot back through the normal command path and clears the sandbox, returning the restored count.
* Three Callers: The Studio banner Restore now button, the new Reset preview buttons, and the Studio exit unmount hook all use the same action, so banner, buttons, and exit behave identically.

## Operational Notes
* Upgrading to v0.28.0 is completely non-destructive. No schema migration ships in this release, so existing installs upgrade with zero database changes.
* In-place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
* Unraid updates pull and recreate the container without losing application state stored in `/app/data`.
