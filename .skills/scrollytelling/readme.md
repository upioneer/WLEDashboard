# Scrollytelling

**Version:** 2
**Target:** `.skills/scrollytelling`

## Description
Design architecture, workflows, and code implementations for scroll triggered 3D model manipulation and interactive 'production explosion' views.

## Capabilities & Use Cases
* **High-Fidelity Scrollytelling Architecture**: Provides deep conceptual frameworks for intercepting standard web scrolling to orchestrate global animation timelines instead of traditional viewport movements.
* **Scroll Pinning & Spatial Interpolation**: Outlines exact methodologies for using `position: sticky` and programmatic pinning to lock viewports, while mathematically calculating spatial interpolation for 3D components based on scroll progression.
* **Real-Time WebGL vs. Pre-Rendered Sequences**: Evaluates and implements two distinct strategies: True 3D (Three.js/WebGL for dynamic lighting and unlimited angles) versus Pseudo-3D (high-fidelity canvas scrubbing of pre-rendered frame sequences for maximum mobile performance).
* **Strict Performance Guardrails**: Enforces critical rendering rules to prevent DOM reflow jank, including mandated Draco mesh compression, strict avoidance of CSS layout mutations within scroll loops, and the decoupling of rendering loops from native scroll threads using `requestAnimationFrame`.
* **Production Library Integration**: Integrates the industry-standard triad of tools: GSAP (GreenSock) for sub-pixel animation, GSAP ScrollTrigger for viewport syncing, and Lenis for smooth scrolling and touch normalization.
* **Complete Template Code**: Includes a fully functional Vanilla JS + GSAP + Three.js blueprint demonstrating a working "exploded product" view mapped dynamically to a scroll track.

## Usage
This skill is built for the Code Scaffold engine. Please refer to the `SKILL.md` file inside this directory for the deep integration guidelines and agentic methodologies.

## Changelog
* **v2** : Expanded capability descriptions
* **v1** : Add Scrollytelling skill for high fidelity 3D web animations
