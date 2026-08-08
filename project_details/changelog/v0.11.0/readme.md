# WLEDashboard v0.11.0 Changelog

## Phase 11: AI Control & MCP Integration (Part 1)

Release Date: August 7, 2026

### Overview

WLEDashboard v0.11.0 introduces native support for the Model Context Protocol (MCP), enabling external AI agents and LLMs to interact with and control WLED devices using natural language. This lays the foundational architecture for intelligent, voice-and-text automated ambient lighting.

---

### Key Improvements & Fixes

* **AI Agent & LLM Control Integration (MCP)**: Implemented a native Model Context Protocol (MCP) server directly into the Fastify backend.
* **Server-Sent Events (SSE) Transport**: Added `/api/mcp/sse` and `/api/mcp/messages` endpoints to allow external agents (e.g., Claude Desktop) to connect to the dashboard securely and stream commands.
* **Native MCP Tools for WLED**: Exposed `list_devices`, `set_device_state`, and `apply_preset` tools to allow external LLMs to read the full state of all discovered devices and issue natural language commands (e.g., "turn the living room red" or "apply the sunset preset to the office").
* **Roadmap Expansion**: Updated the project backlog to include Phase 11 (Spotify "Now Playing" Sync) and Phase 12 (Dynamic Weather Sync & Community Hub).
