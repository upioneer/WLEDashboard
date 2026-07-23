---
name: manim
description: Mathematical animations using the Manim library. Use this skill when the user wants to create high-quality programmatic animations for math, science, or technical explanations.
---

# Manim Skill

This skill provides a starting point for creating mathematical animations with `Manim`.

## Prerequisites

Manim requires several system-level dependencies:
-   **Python 3.7+**
-   **FFmpeg** (for video encoding)
-   **LaTeX** (optional, for mathematical formulas)
-   **Pango** (for text rendering)

Install the Python library:
```bash
pip install manim
```

## Quick Start

1.  **Scaffold a scene:**
    Use the provided `assets/scene.py` as a template.

2.  **Render the scene:**
    Run the following command in your terminal:
    ```bash
    manim -pql scene.py HelloWorld
    ```
    -   `-p`: Preview after rendering.
    -   `-ql`: Low quality (faster rendering).

## Core Concepts

In Manim, you define a `Scene` and implement the `construct()` method to add objects and animations.

```python
from manim import *

class MyScene(Scene):
    def construct(self):
        circle = Circle()
        self.play(Create(circle))
```

## References
-   [manim_ref.md](references/manim_ref.md) - Common commands, mobjects, and resources.
