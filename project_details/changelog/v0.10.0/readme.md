# v0.10.0 Changelog

## Features & Improvements
* **Dashboard Sorting Mechanism**: Introduced a new header dropdown supporting five sort states: Manual (Drag & Drop), Group by Room, Alphabetical (A-Z & Z-A), and Date Added.
* **Device Card Quick Actions**: Re-engineered the Device Card chips to be interactive. Clicking on the Effect, LED Count, or LED Density now opens a fast-action modal for instantaneous edits. 
* **LED Density Support**: Upgraded the backend database (migration 006) to officially support and persist `led_density` properties (defaulting to 60 LEDs/m).
* **Enhanced Spatial Physics**: Re-wired the 3D physics engine (`TransformControls`) to capture native event streams. Dragging light elements in the Spatial View now persists their coordinates instantly upon release and physically blocks the element from being dragged through the walls or floor in real-time.
* **UI Polish & Alignment**: Widened the dashboard device cards for better text overflow, matched chip colors, fixed flex alignments, and ensured consistent typography rendering across all elements.
