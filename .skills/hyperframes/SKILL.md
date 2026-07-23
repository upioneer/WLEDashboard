---
name: hyperframes
description: Video rendering framework that allows creating videos using HTML, CSS, and JS. Use when the user wants to generate, preview, or render videos programmatically or through "vibe-coding" with AI.
---

# Hyperframes

Hyperframes is an open-source video rendering framework from HeyGen. It allows you to write standard HTML/CSS and render it into high-quality video files (MP4).

> **Note**: This skill can be officially added to compatible AI agents (like Claude Code or Cursor) using the command: `npx skills add heygen-com/hyperframes`.

## Core Concepts

- **HTML-Native**: Define your video structure using familiar HTML tags.
- **Data Attributes**: Use `data-*` attributes to control timing and metadata.
- **Deterministic**: Every render produces the exact same output.
- **Animation Agnostic**: Works with GSAP, Lottie, Three.js, and CSS animations.

## Workflow

### 1. Project Setup
Initialize a new project using the CLI:
```bash
npx hyperframes init my-video
```

### 2. Previewing
Open the live-preview in your browser to see changes in real-time:
```bash
npx hyperframes preview
```

### 3. Rendering
When ready, render the composition to an MP4 file:
```bash
npx hyperframes render
```

### 4. Adding Components
Add pre-built blocks (components) to your project:
```bash
npx hyperframes add [component-name]
```

## Creating a Composition

A basic composition in `index.html` looks like this:

```html
<div data-composition-id="my-video" 
     data-width="1920" 
     data-height="1080" 
     data-duration="10">
  <h1 data-start="1" data-duration="5">Hello Hyperframes</h1>
</div>
```

## Advanced Usage

For a detailed list of attributes and supported runtimes, see [api_reference.md](references/api_reference.md).

### AI Agent "Vibe-Coding"
As an AI agent, you should focus on:
1.  **Defining the structure**: Use semantic HTML with appropriate `data-*` attributes.
2.  **Styling**: Use Vanilla CSS for layouts.
3.  **Animation**: Propose GSAP code for complex transitions or simple CSS transitions for basic ones.
4.  **Assets**: Reference local assets in the `assets/` folder.
