# Manim Reference

## Core Concepts
*   **Mobjects**: Mathematical objects (Circle, Square, Text, MathTex).
*   **Scenes**: A container for your animation. You define logic in the `construct()` method.
*   **Animations**: Actions performed on mobjects (Create, Write, FadeIn, ReplacementTransform).

## Common CLI Commands
*   `manim -pql file.py SceneName`: Render in low quality and preview.
*   `manim -pqm file.py SceneName`: Render in medium quality.
*   `manim -pqh file.py SceneName`: Render in high quality (1080p).
*   `manim checkhealth`: Verify dependencies (FFmpeg, LaTeX).

## Useful Mobjects
*   `Text("Hello")`: Standard text.
*   `MathTex(r"\sum_{i=1}^n i")`: LaTeX formulas.
*   `NumberPlane()`: Coordinate system.
*   `Axes()`: 2D axes.

## Resources
*   [Manim Documentation](https://docs.manim.community/)
*   [Manim Tutorials](https://docs.manim.community/en/stable/tutorials.html)
