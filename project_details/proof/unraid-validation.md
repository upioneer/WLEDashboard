# Proof: Unraid deployment artifacts (2026-09-20)

## Files
* install/unraid/wledashboard.xml (Community Applications template v2, bridge default, port 8301, AppData /app/data)
* install/unraid/docker-compose.unraid.yml (Compose Manager stack, commented bridge vs host vs br0 guidance, upgrade warning)
* install/unraid/README.md (both install paths, storage, limitations/workarounds)
* docs/unraid.md (tradeoff table, update/backup notes)
* apps/web/src/views/Guides/guidesData.js (new "Unraid Deployment" section in Network Architecture guide)

## Validation (project_details/playbooks style scratch run, sandbox temp)
* install/unraid/wledashboard.xml: well-formed XML, required CA fields present (Name, Repository, Network=bridge, WebUI, Overview, Category), Port 8301 + Path /app/data configs present.
* install/unraid/docker-compose.unraid.yml: parses as YAML, image ghcr.io/upioneer/wledashboard:latest, ports 8301:8301, appdata bind mount present, host/br0/down -v guidance comments present.
* README.md + docs/unraid.md: each mentions bridge, host, br0, mDNS, multicast, down -v.
* guidesData.js: node --check passes. Web unit tests 15/15 pass.

## Outstanding (user owned, external)
* Community Applications listing submission (external templates repo PR + moderator review), same status as the pending TrueNAS official channel PR. Needs explicit user go ahead per push consent rules.
* No version bump, changelog walkthrough, commit, tag, or push performed: all require explicit user approval.
