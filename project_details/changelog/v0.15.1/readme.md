# v0.15.1 Release Walkthrough

## Summary
Version 0.15.1 delivers critical stability fixes for production container deployments and clean SQLite database volume initializations, along with improved static asset resolution and Alpine runtime library compatibility.

---

## What Is Fixed

### 1. Database Migration Resolution for Clean Volumes
* Resolved a schema conflict where `anchors` defined `rotation_y` and `length` in `migration_001` while `migration_003` attempted an identical column addition.
* Implemented resilient migration statement execution that safely bypasses duplicate column additions, preventing uncaught runtime exceptions during container startup.
* Validated that migrations v1 through v9 execute cleanly on empty SQLite databases.

### 2. Fastify Production Asset Routing
* Corrected the production static file path in the Fastify backend server to reliably locate the compiled Vite distribution bundle under `apps/web/dist`.
* Added fallback checks and warning logging to prevent unhandled path crashes.
* Configured `/api/health` to dynamically report the current semantic version.

### 3. Docker Container Environment Hardening
* Installed `libstdc++` in the Dockerfile runner stage to provide required runtime libraries for Alpine native C++ addons.
* Added a root `.dockerignore` file to exclude local `node_modules`, git metadata, and development artifacts from the Docker build context.
* Updated `bump_version.ps1` to automatically sync version metadata across all workspace components, including the Home Assistant integration manifest.
