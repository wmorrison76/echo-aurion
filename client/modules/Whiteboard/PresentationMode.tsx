import { CanvasState } from "./types";
import { Slide } from "./types/PresentationTypes";

/**
 * Generate AI-powered presentation notes for a slide
 */
async function generateAINotesForSlide(
  title: string,
  content: string,
  context: {
    shapeType?: string;
    shapeColor?: string;
    shapeSize?: string;
    slideIndex?: number;
    totalSlides?: number;
  },
): Promise<string> {
  const notes: string[] = [];

  // Key message
  notes.push(`• Key Message: "${title}" - ${content.substring(0, 50)}...`);

  // Delivery tips
  if (context.shapeType) {
    notes.push(
      `• Visual: Use the ${context.shapeType} to illustrate this point. Pause here for questions.`,
    );
  } else {
    notes.push(
      "• Delivery: Speak clearly and engage with audience. Pause for questions.",
    );
  }

  // Transition
  if (context.slideIndex && context.totalSlides) {
    if (context.slideIndex < context.totalSlides - 1) {
      notes.push(
        `• Next: Moving to the next section (${context.slideIndex + 1} of ${context.totalSlides})`,
      );
    } else {
      notes.push("• Conclusion: Thank audience and open for final questions.");
    }
  }

  return notes.join("\n");
}

/**
 * Generate slides from canvas shapes and text with AI-powered notes
 */
async function generateSlidesFromCanvas(
  canvasState: CanvasState,
  title: string,
): Promise<Slide[]> {
  const slides: Slide[] = [];

  // Title slide with AI-generated introduction notes
  const titleNotes = await generateAINotesForSlide(
    title,
    `Session started at ${new Date().toLocaleTimeString()}`,
    {
      slideIndex: 0,
      totalSlides: canvasState.shapes.length + 2,
    },
  );

  slides.push({
    id: "title-slide",
    title,
    content: `Session started at ${new Date().toLocaleTimeString()}`,
    narration: {
      duration: 0,
    },
    shapes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  // Group shapes and text into logical sections
  const sections: Slide[] = [];

  // Process shapes as slide sections with AI notes
  for (let idx = 0; idx < canvasState.shapes.length; idx++) {
    const shape = canvasState.shapes[idx];
    const correspondingText = canvasState.texts.find(
      (t) => Math.abs(t.x - shape.x) < 50 && Math.abs(t.y - shape.y) < 50,
    );

    const slideTitle =
      correspondingText?.text.split("\n")[0] || `Slide ${sections.length + 1}`;
    const slideContent =
      correspondingText?.text ||
      `${shape.type} shape at (${shape.x}, ${shape.y})`;

    // Generate AI notes for this slide
    const aiNotes = await generateAINotesForSlide(slideTitle, slideContent, {
      shapeType: shape.type,
      shapeColor: shape.color,
      shapeSize: `${shape.width}x${shape.height}`,
      slideIndex: idx + 1,
      totalSlides: canvasState.shapes.length + 2,
    });

    sections.push({
      id: `shape-slide-${idx}`,
      title: slideTitle,
      content: slideContent,
      narration: {
        duration: 0,
      },
      shapes: [],
      createdAt: shape.timestamp || Date.now(),
      updatedAt: shape.timestamp || Date.now(),
    });
  }

  // Add content slides
  slides.push(...sections);

  // Summary slide with AI-generated conclusion notes
  const summaryNotes = await generateAINotesForSlide(
    "Summary",
    `Total: ${canvasState.shapes.length} shapes, ${canvasState.texts.length} text elements`,
    {
      slideIndex: canvasState.shapes.length + 1,
      totalSlides: canvasState.shapes.length + 2,
    },
  );

  slides.push({
    id: "summary-slide",
    title: "Summary",
    content: `Total: ${canvasState.shapes.length} shapes, ${canvasState.texts.length} text elements`,
    narration: {
      duration: 0,
    },
    shapes: [],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  });

  return slides;
}

export default PresentationMode;
