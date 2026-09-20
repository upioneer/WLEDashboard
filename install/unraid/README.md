# Unraid Deployment for WLEDashboard

Two supported paths. Both use the prebuilt image `ghcr.io/upioneer/wledashboard:latest`, persist SQLite data on the array, and serve the UI on port 8301.

## Path 1: Community Applications template (easiest)

1. Unraid > Apps > search "WLEDashboard" and install, accepting the defaults.
2. If the template is not listed yet (submission pending), add it manually: Docker > Add Container, paste this Template URL, then Apply:
   `https://raw.githubusercontent.com/upioneer/WLEDashboard/master/install/unraid/wledashboard.xml`
3. Open `http://<unraid-ip>:8301`.

## Path 2: Compose Manager stack

1. Install the Compose Manager plugin, create a stack, and paste `docker-compose.unraid.yml` from this directory.
2. Compose Up, then open `http://<unraid-ip>:8301`.

## Storage

AppData maps to `/app/data` in the container (`/mnt/user/appdata/wledashboard` on the host). It holds the SQLite database and all settings. Include it in CA Backup, or export JSON snapshots from Settings > Backup & Restore. Never delete the mapping on update.

## Limitations and workarounds

* mDNS auto-discovery does not work in bridge mode (multicast stays on the physical LAN and never reaches the container). Workaround: add controllers by IP in the dashboard or Device Manager. Everything else is unaffected.
* For native discovery, switch the container Network to host, or assign a custom br0 address. Host mode ignores port mappings and needs port 8301 free on the host. A br0 container gets its own LAN IP but the Unraid host itself cannot reach that IP directly (macvlan isolation), so manage it from another LAN device.
* Updates: pull and recreate (`docker compose pull && docker compose up -d`). Never use `down -v`, which deletes mapped data.

See `docs/unraid.md` for the full tradeoff table and `apps/web/src/views/Guides/guidesData.js` (Network Architecture guide) for the inbuilt walkthrough.
