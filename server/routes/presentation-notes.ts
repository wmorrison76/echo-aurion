import type { RequestHandler } from "express";

interface NoteGenerationRequest {
  title: string;
  content: string;
  shapeType?: string;
  shapeColor?: string;
  shapeSize?: string;
  slideIndex?: number;
  totalSlides?: number;
}

async function callOpenAIForNotes(
  prompt: string,
  apiKey: string,
  model: string
): Promise<string> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: "system",
            content:
              "You are a professional presentation coach. Generate concise, actionable speaker notes for presentations.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
        max_tokens: 150,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`);
    }

    const data = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const notes = data.choices?.[0]?.message?.content || "";

    return notes.trim();
  } catch (error) {
    console.error("Error calling OpenAI for notes:", error);
    throw error;
  }
}

const generateNotesHandler: RequestHandler = async (req, res) => {
  try {
    const {
      title,
      content,
      shapeType,
      shapeColor,
      shapeSize,
      slideIndex,
      totalSlides,
    } = req.body as NoteGenerationRequest;

    const apiKey =
      process.env.ECHO_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({
        error: "OpenAI API key not configured",
        notes: generateBasicNotes(title, content, {
          shapeType,
          shapeColor,
          shapeSize,
          slideIndex,
          totalSlides,
        }),
      });
    }

    const model = process.env.ECHO_OPENAI_MODEL || "gpt-3.5-turbo";

    const prompt = `You are a professional presentation coach. Generate concise, actionable speaker notes for this slide.

Title: "${title}"
Content: "${content}"
${shapeType ? `Visual element: ${shapeType} (${shapeColor})` : ""}

Provide 2-3 bullet points that:
1. Explain the key message
2. Suggest delivery tips
3. Include transition to next slide

Keep notes under 100 words. Be specific and practical.`;

    const notes = await callOpenAIForNotes(prompt, apiKey, model);

    res.json({
      notes,
      aiGenerated: true,
      model,
      slideIndex,
      totalSlides,
    });
  } catch (error) {
    console.error("Presentation notes generation error:", error);

    // Fallback to basic notes
    const { title, content, shapeType, shapeColor, shapeSize, slideIndex, totalSlides } = req.body as NoteGenerationRequest;

    const basicNotes = generateBasicNotes(title, content, {
      shapeType,
      shapeColor,
      shapeSize,
      slideIndex,
      totalSlides,
    });

    res.status(200).json({
      notes: basicNotes,
      aiGenerated: false,
      fallback: true,
    });
  }
};

function generateBasicNotes(
  title: string,
  content: string,
  context: {
    shapeType?: string;
    shapeColor?: string;
    shapeSize?: string;
    slideIndex?: number;
    totalSlides?: number;
  }
): string {
  const notes: string[] = [];

  // Key message
  notes.push(
    `• Key Message: "${title}" - ${content.substring(0, 50)}...`
  );

  // Delivery tips
  if (context.shapeType) {
    notes.push(
      `• Visual: Use the ${context.shapeType} to illustrate this point. Pause here for questions.`
    );
  } else {
    notes.push(
      "• Delivery: Speak clearly and engage with audience. Pause for questions."
    );
  }

  // Transition
  if (context.slideIndex !== undefined && context.totalSlides) {
    if (context.slideIndex < context.totalSlides - 1) {
      notes.push(
        `• Next: Moving to the next section (${context.slideIndex + 1} of ${context.totalSlides})`
      );
    } else {
      notes.push(
        "• Conclusion: Thank audience and open for final questions."
      );
    }
  }

  return notes.join("\n");
}

export const notesRouter = {
  post: "/presentation/notes",
  handler: generateNotesHandler,
};

export default generateNotesHandler;
