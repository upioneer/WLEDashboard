# v0.15.2 Release Walkthrough

## Summary
Version 0.15.2 addresses clipboard copying functionality across insecure local network (HTTP/LAN) environments and ensures dashboard view configurations (sort order, presentation layout, category filters) persist across page transitions and browser reloads.

---

## What Is Fixed

### 1. Universal Clipboard Copy Utility
* **LAN Host Compatibility:** Modern browsers restrict the asynchronous `navigator.clipboard` API strictly to secure contexts (HTTPS or localhost). On local area network deployments accessed via IP address (such as `http://192.168.x.x:3001`), `navigator.clipboard` was undefined, causing IP copying to fail silently.
* **Dual Execution Path:** Created `apps/web/src/lib/clipboard.js` providing a unified `copyToClipboard` function. It leverages `navigator.clipboard.writeText` when `window.isSecureContext` is available and automatically switches to an off-screen DOM `document.execCommand('copy')` fallback for HTTP IP contexts.
* **Component Integration:** Integrated the new utility into device IP chips and context menu actions in `DeviceCard.jsx`, as well as API token and redirect URI copy buttons in `Settings.jsx`.
* **User Feedback:** Copy actions now provide clear visual toast notifications reflecting actual success or error states.

### 2. Dashboard View & Sort State Persistence
* **Store-Level Preferences:** Moved `sortMode`, `viewMode`, and `filter` states from local component memory into `uiStore.js` backed by persistent `localStorage`.
* **State Retention:** Returning to the Dashboard from any view (Groups, Spatial, Studio, Automations, Settings) preserves the user's previously chosen sort preference (Manual Drag & Drop, Group by Room, Alphabetical A-Z, Alphabetical Z-A, Date Added), view mode (Grid, Compact, Rooms, Groups, Media, Favorites), and status filter (All, Online, Offline, On, Off).
* **Expanded Controls:** Enabled sort ordering controls in Compact List view.

### 3. UI Formatting & Compliance
* Stripped emoji characters from select menus and card action chips in compliance with project style rules.
