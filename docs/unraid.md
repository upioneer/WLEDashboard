# WLEDashboard on Unraid

WLEDashboard ships as a prebuilt multi-architecture image (`ghcr.io/upioneer/wledashboard:latest`), so deploying on Unraid is metadata only: no build step, no helper script to run on the host.

## Install options

* Community Applications template: `install/unraid/wledashboard.xml`. Install from Apps, or sideload via Docker > Add Container with the raw template URL.
* Compose Manager stack: `install/unraid/docker-compose.unraid.yml`. Paste into a new stack and Compose Up.

Both paths publish the web UI on port 8301 and map AppData (`/mnt/user/appdata/wledashboard`) to `/app/data` in the container.

## Networking tradeoffs

| Mode | mDNS auto-discovery | Port conflicts | Notes |
| --- | --- | --- | --- |
| bridge (default) | No | None | Zero setup. Add controllers by IP. |
| host | Yes | Port 8301 must be free on host | Port mappings ignored. Best on trusted LAN. |
| custom br0 | Yes | None (own LAN IP) | Reserve the IP in DHCP. Host cannot reach br0 IPs directly. |

Limitations in detail:

* Bridge mode blocks UDP multicast (224.0.0.251:5353), so zero-configuration discovery finds nothing. This is a Docker networking property, not a WLEDashboard bug. Polling, control, groups, spatial, automations, MQTT, and media sync all work normally; only discovery needs IPs entered manually.
* Host mode shares the Unraid network stack, so discovery works, but the container inherits the host firewall surface and any port clash on 8301 prevents startup.
* Custom br0 gives the container its own LAN address with discovery and no clashes, at the cost of managing another IP. Because of macvlan host isolation, open the UI from another LAN device, not from the Unraid host itself.

## Updates and backups

Update with pull plus recreate, never `down -v`. Keep `/mnt/user/appdata/wledashboard` in CA Backup, and export JSON snapshots from Settings > Backup & Restore before major version jumps. To migrate between Unraid and any other host (Docker, Proxmox LXC), export JSON on the old host and restore it on the new one.
