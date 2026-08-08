# WLEDashboard v0.12.2 Changelog

## Hotfix Overview
This patch release resolves a GitHub Container Registry (`ghcr.io`) pipeline failure.

## Bugfixes
* **GitHub Actions Workflow:** Disabled Docker Buildx provenance attestations (`provenance: false`) in the `docker-publish.yml` workflow. This fixes the `buildx failed with: ERROR: failed to build: unknown blob` error caused by `ghcr.io`'s incompatibility with default buildx attestations.
* **GitHub Actions Dependencies:** Upgraded `docker/build-push-action` to `@v6` to resolve Node.js 20 deprecation warnings.
