# Excalidraw Diagram Skill

## Description
This skill grants the agent the ability to design, generate, and edit professional visual diagrams using the Excalidraw JSON format. It focuses on creating diagrams that argue a concept rather than just displaying boxes and lines, utilizing evidence artifacts such as real code snippets and data structures within the canvas.

## Inputs
* Diagram Intent: A description of the architecture, flowchart, or mental model to visualize.
* Depth Level: Abstract (high level), Technical (detailed), or Comprehensive (full documentation).
* Existing File: A `.excalidraw` or `.excalidraw.json` file to modify.

## Actions
1. Perform a Depth Assessment to determine the level of detail required for the request.
2. Conduct research on specific technical components (APIs, protocols, or file structures) to include as evidence artifacts.
3. Generate Excalidraw JSON elements based on the Visual Pattern Library:
    * Fan-out: For one-to-many relationships.
    * Convergence: For aggregation or many-to-one flows.
    * Assembly Line: For sequential pipelines.
4. Apply the color palette from the project references to ensure brand consistency.
5. Segment large diagrams into logical sections to remain within token limits during generation.
6. Validate the layout by reviewing the rendered output (if a renderer is available) to fix overlapping text or misaligned arrows.

## Outputs
* Excalidraw File: A valid `.excalidraw.json` file.
* Summary: A text based explanation of the components and relationships created in the diagram.

## Constraints
* Always use `opacity: 100` for elements to ensure professional clarity.
* Use font size and weight to create hierarchy instead of placing every piece of text in a container.
* No emoji or hyphens should be used in the documentation of the diagram elements.
* The JSON text property must contain only readable words.
* For complex systems, you must build the JSON one section at a time rather than in a single pass.
