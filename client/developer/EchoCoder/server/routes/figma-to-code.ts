import express, { Router, Request, Response } from "express";

const router = express.Router();
const ECHO_OPENAI_API_KEY = process.env.ECHO_OPENAI_API_KEY || "";

interface FigmaDesign {
  name?: string;
  description?: string;
  type?: string;
  children?: FigmaDesign[];
  [key: string]: any;
}

interface ConversionRequest {
  method: "json" | "description" | "image";
  input: string;
  outputFormats: ("react" | "html" | "tailwind")[];
  componentScope?: "basic" | "advanced" | "full";
}

// Helper function to call OpenAI API
async function callOpenAI(systemPrompt: string, userPrompt: string) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort("OpenAI request timeout"), 120000);

  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${ECHO_OPENAI_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "gpt-4-turbo",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature: 0.7,
        max_tokens: 4000,
      }),
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const error = await response.json();
      throw new Error(
        `OpenAI API error: ${error.error?.message || "Unknown error"}`,
      );
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("Figma-to-Code generation timed out. Please try again.");
    }
    throw error;
  }
}

// Parse Figma JSON export
function parseFigmaJSON(jsonString: string): FigmaDesign {
  try {
    return JSON.parse(jsonString);
  } catch (error) {
    throw new Error("Invalid Figma JSON format");
  }
}

// Convert Figma JSON to structured design object
function figmaToStructuredDesign(figmaDesign: FigmaDesign): string {
  const traverse = (node: FigmaDesign, depth: number = 0): string => {
    const indent = "  ".repeat(depth);
    let result = `${indent}- ${node.name || "unnamed"} (${node.type || "unknown"})\n`;

    if (node.children && Array.isArray(node.children)) {
      for (const child of node.children) {
        result += traverse(child, depth + 1);
      }
    }

    return result;
  };

  return traverse(figmaDesign);
}

// Route: Convert from JSON
router.post("/convert-json", async (req: Request, res: Response) => {
  try {
    const {
      input,
      outputFormats = ["react"],
      componentScope = "advanced",
    } = req.body as ConversionRequest;

    if (!input) {
      return res
        .status(400)
        .json({ success: false, message: "Figma JSON input required" });
    }

    const figmaDesign = parseFigmaJSON(input);
    const structuredDesign = figmaToStructuredDesign(figmaDesign);

    const systemPrompt = `You are an expert UI/UX developer specializing in converting Figma designs to production-ready code.
Generate ${outputFormats.join(" and ")} code from the design structure.
Include:
- Responsive design patterns
- Tailwind CSS utility classes
- Proper component structure
- Accessibility attributes (ARIA labels)
- Error boundaries for React
- TypeScript types for React components`;

    const userPrompt = `Convert this Figma design structure to ${outputFormats.join(" and ")} code:

${structuredDesign}

Original Figma JSON (for reference):
${JSON.stringify(figmaDesign, null, 2)}

Scope: ${componentScope} (basic = essential components, advanced = full with variants, full = all features)

Return ONLY valid, production-ready code. No explanations.`;

    const generatedCode = await callOpenAI(systemPrompt, userPrompt);

    return res.status(200).json({
      success: true,
      code: generatedCode,
      format: outputFormats[0],
      source: "figma-json",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Code generation failed",
    });
  }
});

// Route: Convert from design description
router.post("/convert-description", async (req: Request, res: Response) => {
  try {
    const {
      input,
      outputFormats = ["react"],
      componentScope = "advanced",
    } = req.body as ConversionRequest;

    if (!input) {
      return res
        .status(400)
        .json({ success: false, message: "Design description required" });
    }

    const systemPrompt = `You are an expert UI/UX developer specializing in converting design descriptions to production-ready code.
Generate ${outputFormats.join(" and ")} code from natural language design specifications.
Include:
- Responsive design patterns (mobile-first)
- Tailwind CSS utility classes
- Proper component structure
- Accessibility attributes (ARIA labels, semantic HTML)
- Error boundaries for React
- TypeScript types and interfaces
- Proper state management patterns
- Reusable component composition`;

    const userPrompt = `Generate ${outputFormats.join(" and ")} code for this design specification:

${input}

Scope: ${componentScope}
Requirements:
- Production-ready code only
- Follow best practices
- Include comments for complex logic
- Support dark/light modes with Tailwind
- Mobile responsive by default

Return ONLY valid, production-ready code with no explanations.`;

    const generatedCode = await callOpenAI(systemPrompt, userPrompt);

    return res.status(200).json({
      success: true,
      code: generatedCode,
      format: outputFormats[0],
      source: "description",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Code generation failed",
    });
  }
});

// Route: Convert from image/screenshot
router.post("/convert-image", async (req: Request, res: Response) => {
  try {
    const {
      input,
      outputFormats = ["react"],
      componentScope = "advanced",
    } = req.body as ConversionRequest;

    if (!input) {
      return res
        .status(400)
        .json({ success: false, message: "Image URL or base64 required" });
    }

    const systemPrompt = `You are an expert UI/UX developer specializing in analyzing design mockups and converting them to production-ready code.
Analyze the provided image and generate ${outputFormats.join(" and ")} code that recreates the design.
Include:
- Layout structure and component hierarchy
- Colors, fonts, and spacing exactly as shown
- Responsive design patterns
- Tailwind CSS utility classes
- Accessibility attributes
- Interactive elements and hover states
- TypeScript types and proper typing`;

    const userPrompt = `Analyze this design mockup and generate ${outputFormats.join(" and ")} code:

Image: ${input}

Scope: ${componentScope}
Requirements:
- Recreate the exact visual design
- Use Tailwind CSS for styling
- Make it responsive
- Add accessibility features
- Production-ready code only

Return ONLY valid, production-ready code with no explanations.`;

    const generatedCode = await callOpenAI(systemPrompt, userPrompt);

    return res.status(200).json({
      success: true,
      code: generatedCode,
      format: outputFormats[0],
      source: "image",
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Code generation failed",
    });
  }
});

// Route: Convert to multiple formats
router.post("/convert-all-formats", async (req: Request, res: Response) => {
  try {
    const {
      method,
      input,
      componentScope = "advanced",
    } = req.body as ConversionRequest;
    const formats = ["react", "html", "tailwind"];

    if (!input || !method) {
      return res
        .status(400)
        .json({ success: false, message: "Input and method required" });
    }

    let structuredInput = input;

    if (method === "json") {
      const figmaDesign = parseFigmaJSON(input);
      structuredInput = figmaToStructuredDesign(figmaDesign);
    }

    const systemPrompt = `You are an expert UI/UX developer.
Generate React/TypeScript, HTML/CSS/JS, and Tailwind CSS code from design input.
For each format:
- React: Full component with TypeScript, hooks, proper state management
- HTML: Semantic HTML with embedded CSS
- Tailwind: HTML with Tailwind utility classes
All must be production-ready with accessibility, responsiveness, and error handling.`;

    const userPrompt = `Generate React, HTML, and Tailwind code for this ${method} design:

${structuredInput}

Scope: ${componentScope}

Return JSON with format: { react: "code", html: "code", tailwind: "code" }
ONLY valid code, no explanations.`;

    const generatedResponse = await callOpenAI(systemPrompt, userPrompt);

    let allCode = { react: "", html: "", tailwind: "" };
    try {
      allCode = JSON.parse(generatedResponse);
    } catch {
      return res.status(200).json({
        success: true,
        code: generatedResponse,
        formats: formats,
        source: method,
      });
    }

    return res.status(200).json({
      success: true,
      code: allCode,
      formats: formats,
      source: method,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Code generation failed",
    });
  }
});

// Route: Analyze design complexity
router.post("/analyze", async (req: Request, res: Response) => {
  try {
    const { input, method } = req.body as ConversionRequest;

    if (!input) {
      return res
        .status(400)
        .json({ success: false, message: "Input required" });
    }

    const systemPrompt = `You are a UX architecture expert. Analyze design complexity and requirements.
Return JSON: { complexity: "simple|moderate|complex", components: count, estimatedTime: "Xh", recommendations: [] }`;

    const userPrompt = `Analyze this ${method} design:
${input}

Return ONLY valid JSON, no explanations.`;

    const analysis = await callOpenAI(systemPrompt, userPrompt);

    let parsed = {
      complexity: "moderate",
      components: 5,
      estimatedTime: "2h",
      recommendations: [],
    };
    try {
      parsed = JSON.parse(analysis);
    } catch {}

    return res.status(200).json({
      success: true,
      analysis: parsed,
    });
  } catch (error: any) {
    return res.status(500).json({
      success: false,
      message: error.message || "Analysis failed",
    });
  }
});

export default router;
