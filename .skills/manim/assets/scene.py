from manim import *

class HelloWorld(Scene):
    def construct(self):
        # Create text
        text = Text("Hello, Manim!", color=BLUE)
        
        # Create a square
        square = Square()
        square.set_fill(YELLOW, opacity=0.5)
        
        # Animations
        self.play(Write(text))
        self.wait(1)
        self.play(ReplacementTransform(text, square))
        self.wait(1)
        self.play(FadeOut(square))
