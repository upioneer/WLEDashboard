# Website Deploy Linux

**Version:** 6
**Target:** `.skills/website-deploy-linux`

## Description
Enterprise Linux Deployment Agent for deploying static sites and SPAs to Nginx locally or remotely via PuTTY CLI (plink/pscp) or SSH, featuring upfront architectural prompting, automatic .env setups, reference scripts, and non destructive folder structures

## Capabilities & Use Cases
* **Interactive Architectural Prompting:** Intelligently gathers target parameters (dedicated LXC vs shared hosting, domain availability, route methodology) to construct a deployment strategy before modifying files
* **Automated Secure Credential Injection:** Verifies and automatically populates root `.env` files with secure SSH keys and passwords
* **Non-Destructive Workspaces:** Strict structural safeguards to scaffold, build, and isolate compilation outputs without overwriting custom source code or existing directories
* **Windows PuTTY Interoperability:** Uses `plink.exe` and `pscp.exe` pipelines to orchestrated batched deployments from Windows to Linux targets without interactive prompts
* **Advanced Target Provisioning:** Transports execution scripts, asserts remote Playwright/Node system dependencies, modifies folder ACLs (`nginx:nginx`, `755`/`644`), and explicitly triggers SELinux context `restorecon` policies
* **Dynamic Nginx Routing Configurations:** Supports two distinct topologies mapping either directly to domains via Dedicated Virtual Hosts or to IP subsets using Shared Subdirectory Aliasing (`npm run build -- --base=/${PROJECT_NAME}/`)
* **Safe Pre-Flight Execution Approvals:** Assembles comprehensive Markdown deployment summaries explicitly pausing workflow execution for user review and sign-off

## Usage
This skill is built for the Code Scaffold engine. Please refer to the `SKILL.md` file inside this directory for the deep integration guidelines and agentic methodologies.

## Changelog
* **v6** : Expanded capability descriptions
* **v5** : Restore remote changes lost in bad merge (env parsing + success message)
* **v4** : Improve environment variable handling and success message
* **v3** : Enhance setup lxc.sh for dynamic site deployment
* **v2** : Refactor deploy.ps1 for improved automation and safety
* **v1** : Add SEO GEO AEO Auditor and Website Deploy Linux skills
