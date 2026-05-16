/**
 * Segment Subject Endpoint
 * Uses OpenAI vision API or SAM (Segment Anything Model) for subject detection
 */

import { Router, Request, Response } from "express";
import fetch from "node-fetch";
import FormData from "form-data";
import fs from "fs";
import path from "path";

const router = Router();

interface SegmentationRequest {
  image: Buffer;
}

interface SegmentationResponse {
  maskBase64: string;
  confidence: number;
  boundingBoxes?: Array<{
    label: string;
    confidence: number;
    bbox: { x: number; y: number; width: number; height: number };
  }>;
}

/**
 * POST /api/ai/segment-subject
 * Segment the main subject in an image using ML
 */
router.post("/segment-subject", async (req: Request, res: Response) => {
  try {
    const file = req.files?.image;
    if (!file) {
      return res.status(400).json({ error: "No image provided" });
    }

    const imageBuffer = Array.isArray(file) ? file[0].data : file.data;

    const result = await segmentSubjectWithSAM(imageBuffer);

    res.json(result);
  } catch (error) {
    console.error("Segmentation error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Segmentation failed",
    });
  }
});

/**
 * Segment using SAM (Segment Anything Model)
 * Falls back to simple color-based segmentation if SAM is unavailable
 */
async function segmentSubjectWithSAM(
  imageBuffer: Buffer,
): Promise<SegmentationResponse> {
  try {
    const samApiUrl =
      process.env.SAM_API_URL || "http://localhost:8000/segment";

    const formData = new FormData();
    formData.append("image", imageBuffer, "image.png");

    const response = await fetch(samApiUrl, {
      method: "POST",
      body: formData,
      headers: formData.getHeaders(),
    });

    if (response.ok) {
      const data = (await response.json()) as {
        mask: string;
        confidence?: number;
        objects?: Array<{
          label: string;
          score: number;
          bbox: [number, number, number, number];
        }>;
      };
      return {
        maskBase64: data.mask,
        confidence: data.confidence || 0.95,
        boundingBoxes: data.objects?.map((obj) => ({
          label: obj.label,
          confidence: obj.score,
          bbox: {
            x: obj.bbox[0],
            y: obj.bbox[1],
            width: obj.bbox[2] - obj.bbox[0],
            height: obj.bbox[3] - obj.bbox[1],
          },
        })),
      };
    }
  } catch (error) {
    console.warn("SAM API unavailable, using fallback method:", error);
  }

  return segmentSubjectWithOpenAI(imageBuffer);
}

/**
 * Fallback: Segment using OpenAI vision API
 */
async function segmentSubjectWithOpenAI(
  imageBuffer: Buffer,
): Promise<SegmentationResponse> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    throw new Error("OPENAI_API_KEY not configured");
  }

  const base64Image = imageBuffer.toString("base64");

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openaiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4-vision-preview",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${base64Image}`,
              },
            },
            {
              type: "text",
              text: "Analyze this image and describe the main subject(s). Provide a JSON response with: { subjects: [{name, description, boundingBox: {x, y, width, height}}] }",
            },
          ],
        },
      ],
      max_tokens: 1024,
    }),
  });

  if (!response.ok) {
    throw new Error("OpenAI vision API failed");
  }

  const data = (await response.json()) as {
    choices: Array<{ message: { content: string } }>;
  };
  const content = data.choices[0].message.content;

  let analysisResult = { subjects: [] };
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      analysisResult = JSON.parse(jsonMatch[0]);
    }
  } catch (e) {
    console.warn("Failed to parse OpenAI response");
  }

  const maskCanvas = createMaskFromAnalysis(imageBuffer, analysisResult);
  const maskBase64 = await canvasToBase64(maskCanvas);

  return {
    maskBase64,
    confidence: 0.85,
    boundingBoxes: analysisResult.subjects.map(
      (subject: {
        name: string;
        boundingBox: { x: number; y: number; width: number; height: number };
      }) => ({
        label: subject.name,
        confidence: 0.8,
        bbox: subject.boundingBox,
      }),
    ),
  };
}

/**
 * Create a simple mask canvas from analysis results
 */
function createMaskFromAnalysis(
  imageBuffer: Buffer,
  analysis: {
    subjects: Array<{
      boundingBox?: { x: number; y: number; width: number; height: number };
    }>;
  },
): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  canvas.width = 512;
  canvas.height = 512;

  ctx.fillStyle = "#000";
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = "#fff";
  for (const subject of analysis.subjects) {
    if (subject.boundingBox) {
      const { x, y, width, height } = subject.boundingBox;
      ctx.fillRect(x, y, width, height);
    }
  }

  return canvas;
}

/**
 * Convert canvas to base64 PNG
 */
async function canvasToBase64(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        resolve(reader.result as string);
      };
      if (blob) reader.readAsDataURL(blob);
    }, "image/png");
  });
}

export default router;
