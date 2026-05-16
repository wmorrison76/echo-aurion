import type { RequestHandler } from "express";

interface HandwritingRecognitionRequest {
  imageData: string; // base64 encoded image
  region?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

async function recognizeHandwritingWithVision(
  imageBase64: string,
  apiKey: string,
  model: string
): Promise<{ text: string; confidence: number }> {
  try {
    // Check if model supports vision (gpt-4-vision)
    const supportsVision = model.includes("vision") || model === "gpt-4o";

    if (!supportsVision) {
      // Fallback for models that don't support vision
      return recognizeHandwritingWithOCR(imageBase64);
    }

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "gpt-4-vision-preview",
        messages: [
          {
            role: "user",
            content: [
              {
                type: "text",
                text: 'Please read and transcribe all handwritten text in this image. Return ONLY the transcribed text, nothing else. If there is no handwritten text, respond with "NO_TEXT_FOUND".',
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${imageBase64}`,
                },
              },
            ],
          },
        ],
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      console.error("Vision API error:", response.statusText);
      return recognizeHandwritingWithOCR(imageBase64);
    }

    const data = await response.json();
    const recognizedText = data.choices?.[0]?.message?.content || "";

    if (recognizedText === "NO_TEXT_FOUND") {
      return {
        text: "",
        confidence: 0,
      };
    }

    return {
      text: recognizedText.trim(),
      confidence: 85, // Vision API doesn't provide confidence scores, so estimate
    };
  } catch (error) {
    console.error("Error recognizing handwriting with vision:", error);
    return recognizeHandwritingWithOCR(imageBase64);
  }
}

function recognizeHandwritingWithOCR(
  imageBase64: string
): { text: string; confidence: number } {
  // Fallback OCR using pattern recognition
  // In a production environment, you would use Tesseract.js or Google Cloud Vision
  // For now, return a placeholder response

  // Simple heuristic: detect common patterns in the canvas
  try {
    // Decode base64 to check image characteristics
    const binaryString = atob(imageBase64);
    const bytes = new Uint8Array(binaryString.length);

    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }

    // Count non-white pixels to detect if there's drawing
    // This is a simplistic approach
    const nonWhitePixels = bytes.filter(
      (byte) => byte > 200
    ).length;
    const totalPixels = bytes.length / 4; // RGBA

    const hasContent = nonWhitePixels > totalPixels * 0.1;

    if (hasContent) {
      return {
        text: "[Handwriting detected - enable vision AI for text extraction]",
        confidence: 50,
      };
    } else {
      return {
        text: "",
        confidence: 0,
      };
    }
  } catch (error) {
    console.error("Error in OCR fallback:", error);
    return {
      text: "",
      confidence: 0,
    };
  }
}

const recognizeHandwritingHandler: RequestHandler = async (req, res) => {
  try {
    const { imageData, region } = req.body as HandwritingRecognitionRequest;

    if (!imageData) {
      return res.status(400).json({
        error: "imageData is required",
      });
    }

    // Remove data URI prefix if present
    const base64Image = imageData.replace(
      /^data:image\/(png|jpg|jpeg|gif);base64,/,
      ""
    );

    const apiKey =
      process.env.ECHO_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    const model = process.env.ECHO_OPENAI_MODEL || "gpt-4o";

    let result: { text: string; confidence: number };

    if (apiKey && model.includes("vision") || model === "gpt-4o") {
      result = await recognizeHandwritingWithVision(base64Image, apiKey, model);
    } else {
      result = recognizeHandwritingWithOCR(base64Image);
    }

    res.json({
      ...result,
      region,
      timestamp: Date.now(),
    });
  } catch (error) {
    console.error("Handwriting recognition error:", error);

    res.status(500).json({
      error: "Handwriting recognition failed",
      text: "",
      confidence: 0,
    });
  }
};

export default recognizeHandwritingHandler;
