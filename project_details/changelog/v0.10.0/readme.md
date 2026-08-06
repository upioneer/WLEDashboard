# WLEDashboard v0.10.0 Changelog

## Phase 10: Virtual Scrolling & 3D Setup Wizard

Release Date: August 5, 2026

### Overview

WLEDashboard v0.10.0 introduces two major scaling and onboarding features. The Dashboard has been re-architected with viewport virtualization to support hundreds of WLED devices without degrading performance, and the 3D Spatial View now includes a first-run setup wizard for procedurally generating property layouts.

---

### Key Improvements & Fixes

* **Dashboard Virtual Scrolling (`Dashboard.jsx`)**: Re-engineered the CSS Grid layout to utilize `@tanstack/react-virtual` viewport row virtualization. This lazily renders rows within the viewport (with a 2-row overscan buffer) while preserving the native responsive grid layout and CSS animations. This eliminates the memory and CPU overhead of `useSpring` and heavy DOM nodes for off-screen devices, allowing seamless 60fps interaction with 100+ connected devices.
* **3D Procedural Setup Wizard (`SpatialView.jsx`)**: Introduced a guided `SpatialSetupWizard` that automatically appears when the spatial hierarchy is empty. This wizard allows users to quickly define their property name, set up multiple floors, and select from common room templates (Living Room, Kitchen, Bedroom, etc.) to immediately generate a foundational 3D layout in the SQLite database.
* **Spatial Store Mutations (`spatialStore.js`)**: Added robust `createDwelling` and `createFloor` mutations to support the initial setup sequence and future structural editing.
