# WLEDashboard v0.12.1 Changelog

## Hotfix Overview
This patch release resolves a pipeline deployment failure and corrects formatting issues in the v0.12.0 documentation.

## Bugfixes
* **Docker Build Pipeline:** Corrected the Vite build command in the `Dockerfile` from `npm run build:web` to `npm run build --workspace=apps/web`. This resolves the `exit code: 1` failure in the `ghcr.io` GitHub Actions deployment workflow.
* **Documentation Formatting:** Stripped all emojis from the v0.12.0 release changelog to comply with strict documentation standards.
