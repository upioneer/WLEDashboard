# Hyperframes API Reference

Hyperframes uses standard HTML with `data-*` attributes to define video compositions.

## Stage Attributes
The root element (the stage) typically requires these attributes:
- `data-composition-id`: Unique identifier for the composition.
- `data-width`: Width of the video stage (e.g., "1920").
- `data-height`: Height of the video stage (e.g., "1080").
- `data-duration`: Total duration of the composition in seconds.

## Clip Attributes
Individual elements (videos, images, text, audio) use these attributes:
- `data-start`: Start time of the clip in seconds.
- `data-duration`: Duration of the clip in seconds.
- `data-track-index`: Layering order (Z-index). Higher values are on top.
- `data-volume`: (Audio only) Volume level from 0 to 1.

## Supported Runtimes
Hyperframes supports various animation runtimes through adapters:
- **GSAP**: Recommended for complex timelines.
- **Lottie**: High-quality vector animations.
- **Anime.js**: Lightweight animation library.
- **Three.js**: 3D rendering.
- **CSS Animations**: Standard web animations.
- **WAAPI**: Web Animations API.

## Built-in Components (Blocks)
Blocks can be added via `npx hyperframes add <block-name>`:
- `flash-through-white`: A shader-based transition.
- `instagram-follow`: Social media overlay.
- `data-chart`: Animated charts for data visualization.

## Project Structure
A typical project initialized with `npx hyperframes init` contains:
- `index.html`: The main entry point for the video composition.
- `style.css`: Styling for the video elements.
- `main.js`: Animation logic (e.g., GSAP timelines).
- `assets/`: Directory for images, videos, and audio files.
