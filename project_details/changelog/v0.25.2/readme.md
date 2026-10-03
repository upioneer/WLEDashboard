# v0.25.2 Release Walkthrough

## Summary
Version 0.25.2 is a patch release fixing Home Assistant validation for the 0.25.x line. The v0.25.1 tag shipped a HACS manifest listing `aiohttp` as a requirement, which current Hassfest rejects because Home Assistant core provides that dependency itself. This release removes the listing. No behavior changes.

## What Is New & Improved

### 1. HACS Manifest Fix
* Removed `aiohttp>=3.9.0` from `custom_components/wledashboard/manifest.json` requirements. The integration code continues to import `aiohttp` normally: inside Home Assistant that import resolves from core, which is exactly why Hassfest forbids listing it.
* Unblocks Hassfest validation and HACS installs pinned to the 0.25.x tags.

## Operational Notes
* Upgrading to v0.25.2 is completely non-destructive and requires no manual database migrations.
* The v0.25.1 tag was left untouched per release hygiene (no public tag moves). HACS users should target v0.25.2 or later.
