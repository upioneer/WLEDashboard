# Playwright

**Version:** 2
**Target:** `.skills/playwright`

## Description
Browser automation and end to end testing with Playwright

## Capabilities & Use Cases
* **Intelligent Dev Server Detection**: Automatically queries and targets active local development environments before initiating headless or visible test suites.
* **Ephemeral Script Injection**: Safely authors and executes isolated Playwright test files directly in the `/tmp` directory to prevent workspace pollution.
* **Responsive Visual Validation**: Executes automated multi-viewport regression tests (Mobile/Desktop) and captures timestamped full-page screenshots.
* **Complex State Testing**: Automates and verifies deep application states including multi-step login flows, persistent cookie banners, and dynamic form submissions.
* **Network & DOM Diagnostics**: Scans and parses the DOM to aggressively validate HTTP status codes across all anchor links to detect dead pathways.
* **Direct Inline Execution**: Supports rapid, file-less inline code execution for simple DOM interrogation or one-off verification tasks.
* **Custom Header Injection**: Spoofs or enforces custom HTTP headers (e.g., `X-Automated-By`) to bypass bot protections or request LLM-optimized backend payloads.

## Usage
This skill is built for the Code Scaffold engine. Please refer to the `SKILL.md` file inside this directory for the deep integration guidelines and agentic methodologies.

## Changelog
* **v2** : Expanded capability descriptions
* **v1** : Add Playwright skill and update documentation to v2.7.0
