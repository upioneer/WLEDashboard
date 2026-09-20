# v0.24.0 Release Walkthrough

## Summary
Version 0.24.0 delivers AI natural language control foundations, granular backup restores, and Unraid deployment support. The MCP server now exposes backlog named tools (`get_devices`, `set_state`, `apply_palette`) with a discoverable tool catalog. Backup restore gains per category opt in checkboxes with a dependency validator that keeps partial restores coherent. Unraid joins the supported deployment targets with a Community Applications template, a Compose Manager stack, and full bridge versus host networking documentation.

## What Is New & Improved

### 1. Phase 11 AI Control (MCP Tools)
* Backlog Named Tools: Registered `get_devices`, `set_state`, and `apply_palette` on the Fastify MCP server. Legacy names (`list_devices`, `set_device_state`, `apply_preset`) remain as aliases so existing AI clients keep working.
* New `apply_palette` Tool: Applies a stored custom palette by id or name, an inline hex color list, or a WLED built-in palette number through the existing device command proxy. Unknown devices and palettes return structured errors without touching the network.
* Tool Catalog Endpoint: Added `GET /api/mcp/tools` so AI clients can discover available tools over plain HTTP next to the existing SSE transport.
* Version Sync: The MCP server version now tracks `apps/api/package.json` instead of a stale hardcoded string.
* Regression Tests: Added `apps/api/test/mcp.test.js` covering the tool catalog and unknown device handling.

### 2. Phase 15 Selective Backup Restore
* Seven Restore Categories: Devices, groups, presets, settings, automations, spatial layouts, and studio content cover all 17 backup tables exactly once, exposed via `GET /api/config/categories` and an optional `categories` field on `POST /api/config/import`.
* Dependency Graph Validator: Child rows whose parents are missing from both the backup selection and the surviving database (group members, group children, floors, rooms, anchors, routine steps) are skipped with counts, while optional references (preset groups, anchor and matrix devices) are unlinked instead of dropped. Results return `skipped` and `warnings` alongside `stats`.
* Scoped Replace Mode: Replace mode now deletes only the selected tables in FK safe order. Settings still merge key by key and are never cleared.
* Restore Preview UI: Settings > Backup & Restore shows per category checkboxes with live record counts, blocks commit with no selection, names the selected scope in the replace warning, and surfaces skip counts and validator warnings in toasts.
* Regression Tests: Added `apps/api/test/configSelective.test.js` covering scoped merge, orphan dropping, scoped replace, and unknown category rejection.

### 3. Unraid Deployment Support
* Community Applications Template: Added `install/unraid/wledashboard.xml` (bridge default, port 8301, AppData to `/app/data`) ready for Apps listing or manual sideload via Template URL.
* Compose Manager Stack: Added `install/unraid/docker-compose.unraid.yml` with commented bridge versus host versus br0 guidance and upgrade warnings inline for advanced users.
* Documentation: Added `install/unraid/README.md` and `docs/unraid.md` with a networking tradeoff table, plus a new Unraid Deployment section in the inbuilt Network Architecture guide. All Unraid docs cover bridge mDNS limitations and host/br0 workarounds.
* Validation: Added `project_details/playbooks/screenshot-v0.24.0.js` and automated XML/YAML validation proof.

### 4. Gallery & Docs
* New UI Highlights Card: Added a Selective Backup Restore showcase card with `project_details/changelog/v0.24.0/screenshots/settings-restore-scope.png` so the website gallery picks it up via the README scraper format.

## Operational Notes
* Upgrading to v0.24.0 is completely non-destructive and requires no manual database migrations.
* In-place container upgrades on Docker can be performed with `docker compose pull && docker compose up -d`.
* Proxmox LXC containers can be upgraded directly from the Proxmox host shell via `pct exec <CTID> -- update-wledashboard`.
* Unraid updates pull and recreate the container. Never use `down -v`. Keep `/mnt/user/appdata/wledashboard` in CA Backup.
* Outstanding external items: Community Applications template PR and Proxmox helper script PR submissions are tracked for the next release.
