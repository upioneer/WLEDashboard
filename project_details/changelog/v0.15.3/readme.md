# v0.15.3 Release Walkthrough

## Summary
Version 0.15.3 fixes the Home Assistant Community Store (HACS) GitHub Action validation workflow and updates the root documentation to feature pre-built Docker container deployment via Docker Compose.

---

## What Is Fixed & Improved

### 1. HACS Action Validation Workflow
* **Space-Separated Ignored Checks:** The HACS validation action (`hacs/action@main`) strictly expects space-separated check identifiers in its `ignore` parameter. In `.github/workflows/hacs-validation.yml`, `ignore: "brands, license"` resulted in HACS checking for `"brands,"`, which failed matching and triggered continuous CI failure emails.
* **Syntax Correction:** Corrected the parameter to `ignore: "brands"`. Because `license` is not an ignorable HACS check and the integration is not yet in the official Home Assistant brands repository, ignoring `brands` correctly permits the validation to pass cleanly.

### 2. Root Docker Compose & Deployment Documentation
* **Pre-built Container Registry Guide:** Updated `README.md` to document container deployments using pre-built images published to GitHub Container Registry (`ghcr.io/upioneer/wledashboard:latest`).
* **Root Compose Workflow:** Provided standard `docker-compose.yml` service definitions pointing to `/app/data` volume persistence and port 3001 mapping.
* **CLI & Networking Notes:** Added Docker run commands and documented networking guidance for bridge port mapping versus host networking for local mDNS device discovery.
