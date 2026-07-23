---
name: Scrollytelling
description: Design architecture, workflows, and code implementations for scroll-triggered 3D model manipulation and interactive "production explosion" views.
---

# Technical Specification: High-Fidelity Scroll-Driven Animations & 3D Scrollytelling

This document provides a comprehensive overview of the design architecture, workflows, libraries, and code implementations required to build a modern, high-performance website featuring scroll-triggered 3D model manipulation and interactive "production explosion" views, similar to premium product landing pages from Microsoft Surface and Apple.

---

## 1. Core Architectural Concepts

To build an impressive scrollytelling experience, you must understand the conceptual architecture that separates traditional scroll behavior from animation-driven scroll behavior.

### A. Scrollytelling & Scroll-Driven Animation
In standard web design, scrolling changes the `window.scrollY` position to reveal lower portions of a page. In high-fidelity scrollytelling, scrolling is intercepted or mapped to a global timeline. The scrollbar essentially becomes the scrubbing thumb of a video player or an animation timeline.

### B. Scroll Pinning (Sticky Viewports)
To keep a product (like a laptop or tablet) centered on the screen while it animates, the container element must be "pinned." This is usually achieved using CSS `position: sticky; top: 0;` or programmatic pinning via JavaScript. The container locks in the viewport while the user scrolls through a designated track of blank vertical space (e.g., `300vh` or 300% of the viewport height). The animation plays over this distance, and once complete, the container unpins, allowing the user to continue down the page.

### C. Exploded Views & Spatial Interpolation
An "exploded view" animation takes a unified 3D object and translates its constituent parts outward along specified axes (typically the Z-axis, or depth axis) relative to the object's origin. 
* **The Math:** Each sub-mesh or component group within the 3D model is assigned a directional vector $V$ and a maximum translation distance $D$. As the scroll progress passes from $0.0$ to $1.0$, the component's position is updated: 
    $$\text{Position} = \text{Base Position} + (V \times D \times \text{Progress})$$

---

## 2. Technical Implementation Strategies

There are two primary ways industry professionals implement production explosion views. The choice depends on performance requirements, asset availability, and asset complexity.

### Strategy 1: Real-Time WebGL / Three.js (True 3D)
The model is loaded into the browser as a 3D asset. JavaScript manipulates the individual mesh nodes in real time based on scroll data.

* **Pros:** Dynamic lighting updates perfectly, infinite camera angle changes are possible, resolution scales natively, interactive hover states can be applied to individual exploded components.
* **Cons:** Highly CPU/GPU intensive, requiring large initial downloads for assets (optimized `.glb` files), complex mesh tracking.

### Strategy 2: High-Fidelity Video/Canvas Scrubbing (Pseudo-3D)
The 3D explosion view is pre-rendered in software like Blender, Cinema 4D, or Maya as a high-quality 4K image sequence (e.g., 120 frames). JavaScript preloads these frames into memory and draws the specific frame to an HTML5 `<canvas>` based on the scroll percentage.

* **Pros:** Runs smoothly even on low-end mobile devices, supports cinematic lighting/shadows that are impossible to render in real time on the web.
* **Cons:** Fixed camera track, cannot rotate freely via mouse interaction, large total file payload across the frame sequence.

---

## 3. Mandatory Engineering Constraints & Guardrails

To ensure production-grade optimization, fluid performance across desktop and mobile browsers, and stable runtime rendering, the architecture must strictly enforce the following rules:

### A. Asset Optimization & Polygon Limits
* **The Constraint:** Raw CAD models exported from hardware engineering tools contain millions of polygons and heavy parametric definitions that will freeze or crash mobile web browsers.
* **Agent Directive:** All 3D assets must be run through a structural pipeline compression tool like `gltf-pipeline` utilizing Draco mesh compression. High-poly surfaces must be baked down to normal maps. Total aggregate payload size for the 3D assets must target sub-5MB limits.

### B. GPU Thread Mitigation & DOM Reflow Avoidance
* **The Constraint:** Updating traditional CSS layout properties (e.g., `width`, `height`, `top`, `margin`) within an active scroll track forces continuous DOM reflows, causing catastrophic frame-rate drops (jank).
* **Agent Directive:** The agent must never write layouts dynamically inside scroll loops. Structural updates must be restricted entirely to hardware-accelerated vectors. Use CSS 3D transforms (`transform: translate3d()`, `opacity`) or direct low-level programmatic WebGL matrix mutations.

### C. Frame Rate Synchronization
* **The Constraint:** Binding animation ticks directly to raw window scroll listener hooks (`window.addEventListener('scroll')`) results in erratic behavior due to differences in scroll event dispatch frequencies between trackpads, mice, and mobile touch surfaces.
* **Agent Directive:** Frame updates must be decoupled from the raw scroll event thread. Synchronize the scene updates using a custom rendering loop powered exclusively by `requestAnimationFrame`. This locks execution cycles tightly to native monitor refresh timings (60Hz / 120Hz).

---

## 4. Recommended Production Libraries

To minimize boilerplate and guarantee cross-browser performance (handling touch smoothing, trackpad inertia, and mobile rendering quirks), the following library stack is standard:

### A. Animation & Scroll Orchestration
* **GSAP (GreenSock Animation Platform):** The industry standard for high-performance web animations. It offers precise timing controls and sub-pixel rendering.
* **GSAP ScrollTrigger:** A plugin specifically built to sync GSAP timelines directly to the viewport scroll position. It natively handles element pinning, scrub delays, and toggle actions.
* **Lenis (by Studio Freight):** A lightweight, open-source smooth scroll library. It normalizes scrolling across trackpads, mouse wheels, and touch devices, eliminating jagged animation updates.

### B. 3D Rendering (For Strategy 1)
* **Three.js:** The underlying low-level WebGL library used to create scenes, cameras, lights, and loaders.
* **React Three Fiber (R3F) / @react-three/drei:** If building in React, this wrapper turns Three.js into declarative components and provides excellent utility hooks like `useScroll` for native scrollytelling syncing.

---

## 5. Complete Code Template (Vanilla JS + GSAP + Three.js)

The following blueprint creates a pinned viewport section, initializes a Three.js environment containing a mock product (a compound group representing a screen and a chassis), and maps a scroll track to explode the components along the Y and Z axes using GSAP ScrollTrigger.

```html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Advanced Product Explosion Scrollytelling</title>
    <style>
        * {
            box-sizing: border-box;
            margin: 0;
            padding: 0;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background-color: #0b0b0c;
            color: #ffffff;
            overflow-x: hidden;
        }

        .scroll-section {
            width: 100%;
            height: 100vh;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 2rem;
            background-color: #111112;
        }

        /* The container that defines the length of the animation track */
        .scrolly-container {
            position: relative;
            width: 100%;
            height: 300vh; /* 3 viewports long */
            background-color: #0b0b0c;
        }

        /* The viewport-locked frame holding the WebGL Canvas and Text overlays */
        .sticky-viewport {
            position: sticky;
            top: 0;
            width: 100%;
            height: 100vh;
            overflow: hidden;
        }

        #webgl-canvas {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 1;
        }

        .ui-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            z-index: 2;
            pointer-events: none;
        }

        .text-step {
            position: absolute;
            left: 10%;
            top: 50%;
            transform: translateY(-50%);
            max-width: 400px;
            opacity: 0;
        }

        .text-step h2 {
            font-size: 3rem;
            margin-bottom: 1rem;
            color: #f5f5f7;
        }

        .text-step p {
            font-size: 1.2rem;
            line-height: 1.5;
            color: #86868b;
        }
    </style>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/gsap.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.2/ScrollTrigger.min.js"></script>
</head>
<body>

    <section class="scroll-section">
        <h1>Scroll Down to Explore Architecture</h1>
    </section>

    <div class="scrolly-container" id="trigger-track">
        <div class="sticky-viewport">
            
            <canvas id="webgl-canvas"></canvas>

            <div class="ui-overlay">
                <div class="text-step" id="step-1">
                    <h2>Premium Engineering</h2>
                    <p>Every component is meticulously organized to balance power, thermal dispersion, and architectural elegance.</p>
                </div>
                <div class="text-step" id="step-2">
                    <h2>Exploded Architecture</h2>
                    <p>Advanced layered components slide away along microscopic vectors to expose internal cooling modules.</p>
                </div>
            </div>

        </div>
    </div>

    <section class="scroll-section">
        <h1>End of Experience</h1>
    </section>

    <script>
        // Register GSAP ScrollTrigger Plugin
        gsap.registerPlugin(ScrollTrigger);

        // --- THREE.JS SETUP ---
        const canvas = document.querySelector('#webgl-canvas');
        const scene = new THREE.Scene();
        
        // Perspective Camera
        const camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
        camera.position.set(0, 0, 8);

        const renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

        // Lighting System
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.4);
        scene.add(ambientLight);

        const dirLight1 = new THREE.DirectionalLight(0x3a86ff, 1.5);
        dirLight1.position.set(5, 10, 7);
        scene.add(dirLight1);

        const dirLight2 = new THREE.DirectionalLight(0xff007f, 0.8);
        dirLight2.position.set(-5, -5, 2);
        scene.add(dirLight2);

        // Geometry Generation: Creating mock layers representing product parts
        const geometryChassis = new THREE.BoxGeometry(3, 2, 0.2);
        const materialChassis = new THREE.MeshStandardMaterial({ color: 0x333335, roughness: 0.2, metalness: 0.8 });
        const chassisMesh = new THREE.Mesh(geometryChassis, materialChassis);

        const geometryScreen = new THREE.BoxGeometry(2.9, 1.9, 0.05);
        const materialScreen = new THREE.MeshStandardMaterial({ color: 0x0077ff, emissive: 0x002255, roughness: 0.1 });
        const screenMesh = new THREE.Mesh(geometryScreen, materialScreen);
        // Position screen slightly forward along Z axis relative to chassis
        screenMesh.position.z = 0.15; 

        const geometryInternals = new THREE.BoxGeometry(2.6, 1.6, 0.1);
        const materialInternals = new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.5, wireframe: false });
        const internalsMesh = new THREE.Mesh(geometryInternals, materialInternals);
        internalsMesh.position.z = 0.0;

        // Parent item group to allow shared rotation adjustments
        const productGroup = new THREE.Group();
        productGroup.add(chassisMesh);
        productGroup.add(internalsMesh);
        productGroup.add(screenMesh);
        scene.add(productGroup);

        // Initial default orientation slant
        productGroup.rotation.x = 0.3;
        productGroup.rotation.y = -0.4;

        // Render loop using requestAnimationFrame for optimal FPS matching
        function animate() {
            renderer.render(scene, camera);
            requestAnimationFrame(animate);
        }
        animate();

        // Handle viewport adjustments dynamically
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });


        // --- GSAP TIMELINE & SCROLLTRIGGER CONTROL ---
        
        // Master timeline tied directly to scroll progress
        const tl = gsap.timeline({
            scrollTrigger: {
                trigger: "#trigger-track",
                start: "top top",      // Start when container top hits viewport top
                end: "bottom bottom",  // End when container bottom hits viewport bottom
                scrub: 1,              // Smoothly catch up with scroll position (takes 1 second)
            }
        });

        // Step 1: Fade in text step 1, subtly rotate product group
        tl.to("#step-1", { opacity: 1, x: 20, duration: 1 })
          .to(productGroup.rotation, { y: 0.2, x: 0.5, duration: 2 }, "-=1")
          
          // Step 2: Fade out step 1, initiate product explosion layout transformation via hardware-accelerated parameters
          .to("#step-1", { opacity: 0, y: -20, duration: 1 })
          .to(screenMesh.position, { z: 1.5, duration: 2 }, "-=0.5")        // Push screen forward
          .to(chassisMesh.position, { z: -1.5, duration: 2 }, "-=2")       // Push chassis backward
          .to(internalsMesh.position, { y: 1.0, duration: 2 }, "-=2")       // Push motherboard upward out of alignment
          .to(productGroup.rotation, { y: 1.1, x: 0.2, duration: 2 }, "-=2") // Rotate whole construction during explosion
          
          // Step 3: Reveal final explanatory UI text overlay
          .to("#step-2", { opacity: 1, x: 20, duration: 1 });
    </script>
</body>
</html>
```
