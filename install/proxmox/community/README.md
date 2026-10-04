# Community Scripts Submission Copies (MIT)

This directory holds the `community-scripts` formatted submission for
WLEDashboard, mirroring their required layout:

* `ct/wledashboard.sh`: container creation plus update handling.
* `install/wledashboard-install.sh`: in-container application install.

License: these two files only are MIT licensed for distribution via
community-scripts. The WLEDashboard application they install remains
proprietary software, All Rights Reserved, per the project `LICENSE.md`.
The standalone installer in `install/proxmox/` stays proprietary.

Submission path: new scripts go to the `community-scripts/ProxmoxVED`
testing repo first (PRs opened directly against ProxmoxVE are closed
without review). Copy these two files into a `ProxmoxVED` fork at the
same `ct/` and `install/` paths, test on a real Proxmox host, and open
the PR there. Maintainers promote accepted scripts to ProxmoxVE.
