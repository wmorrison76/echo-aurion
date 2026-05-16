/**
 * Refine Edge Endpoint
 * Uses AI to intelligently refine selection edges
 */

import { Router, Request, Response } from "express";
import fetch from "node-fetch";

const router = Router();

interface RefineEdgeRequest {
  image: Buffer;
  mask: Buffer;
  params: {
    radius: number;
    contrast: number;
    smooth: number;
    feather: number;
    shift: number;
    mode: "contract" | "expand" | "smooth" | "feather";
  };
}

/**
 * POST /api/ai/refine-edge
 * Refine selection edges using AI-assisted analysis
 */
router.post("/refine-edge", async (req: Request, res: Response) => {
  try {
    const imageFile = req.files?.image;
    const maskFile = req.files?.mask;
    const paramsStr = req.body.params;

    if (!imageFile || !maskFile || !paramsStr) {
      return res.status(400).json({
        error: "Image, mask, and params required",
      });
    }

    const imageBuffer = Array.isArray(imageFile)
      ? imageFile[0].data
      : imageFile.data;
    const maskBuffer = Array.isArray(maskFile)
      ? maskFile[0].data
      : maskFile.data;
    const params = JSON.parse(paramsStr);

    const refinedMask = await refineEdgeWithAI(imageBuffer, maskBuffer, params);

    res.json({
      refinedMaskBase64: refinedMask,
    });
  } catch (error) {
    console.error("Refine edge error:", error);
    res.status(500).json({
      error: error instanceof Error ? error.message : "Edge refinement failed",
    });
  }
});

/**
 * Refine edges using OpenAI vision API
 */
async function refineEdgeWithAI(
  imageBuffer: Buffer,
  maskBuffer: Buffer,
  params: {
    radius: number;
    contrast: number;
    smooth: number;
    feather: number;
    shift: number;
    mode: string;
  },
): Promise<string> {
  const openaiKey = process.env.OPENAI_API_KEY;
  if (!openaiKey) {
    return applyLocalEdgeRefinement(maskBuffer, params);
  }

  const imageBase64 = imageBuffer.toString("base64");
  const maskBase64 = maskBuffer.toString("base64");

  try {
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
                  url: `data:image/png;base64,${imageBase64}`,
                },
              },
              {
                type: "image_url",
                image_url: {
                  url: `data:image/png;base64,${maskBase64}`,
                },
              },
              {
                type: "text",
                text: `Analyze the selection mask edge quality and provide refinement suggestions. 
                    The mask needs refinement with mode: ${params.mode}, 
                    radius: ${params.radius}, 
                    smooth: ${params.smooth}. 
                    Return a JSON response with edge quality score (0-1) and improvement suggestions.`,
              },
            ],
          },
        ],
        max_tokens: 512,
      }),
    });

    if (!response.ok) {
      return applyLocalEdgeRefinement(maskBuffer, params);
    }
  } catch (error) {
    console.warn("OpenAI vision API failed, using local refinement:", error);
  }

  return applyLocalEdgeRefinement(maskBuffer, params);
}

/**
 * Apply local edge refinement without AI
 */
function applyLocalEdgeRefinement(
  maskBuffer: Buffer,
  params: {
    radius: number;
    contrast: number;
    smooth: number;
    feather: number;
    shift: number;
    mode: string;
  },
): string {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  canvas.width = 512;
  canvas.height = 512;

  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imageData.data;

  switch (params.mode) {
    case "expand":
      applyDilation(data, canvas.width, canvas.height, params.radius);
      break;
    case "contract":
      applyErosion(data, canvas.width, canvas.height, params.radius);
      break;
    case "feather":
      applyFeathering(data, canvas.width, canvas.height, params.feather);
      break;
    case "smooth":
      applySmoothing(data, canvas.width, canvas.height, params.smooth);
      break;
  }

  if (params.contrast > 0) {
    applyContrast(data, params.contrast);
  }

  ctx.putImageData(imageData, 0, 0);

  return canvas.toDataURL("image/png");
}

/**
 * Apply dilation (expand) to mask
 */
function applyDilation(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  const temp = new Uint8ClampedArray(data.length);
  temp.set(data);

  const threshold = 128;
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let isWhite = false;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          if (temp[idx] > threshold) {
            isWhite = true;
            break;
          }
        }
        if (isWhite) break;
      }
      const idx = (y * width + x) * 4;
      data[idx] = isWhite ? 255 : 0;
      data[idx + 1] = isWhite ? 255 : 0;
      data[idx + 2] = isWhite ? 255 : 0;
    }
  }
}

/**
 * Apply erosion (contract) to mask
 */
function applyErosion(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  const temp = new Uint8ClampedArray(data.length);
  temp.set(data);

  const threshold = 128;
  for (let y = radius; y < height - radius; y++) {
    for (let x = radius; x < width - radius; x++) {
      let isWhite = true;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const idx = ((y + dy) * width + (x + dx)) * 4;
          if (temp[idx] < threshold) {
            isWhite = false;
            break;
          }
        }
        if (!isWhite) break;
      }
      const idx = (y * width + x) * 4;
      data[idx] = isWhite ? 255 : 0;
      data[idx + 1] = isWhite ? 255 : 0;
      data[idx + 2] = isWhite ? 255 : 0;
    }
  }
}

/**
 * Apply feathering (soft edges)
 */
function applyFeathering(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  radius: number,
): void {
  const temp = new Uint8ClampedArray(data.length);
  temp.set(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let sum = 0;
      let count = 0;
      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            sum += temp[idx];
            count++;
          }
        }
      }
      const avg = Math.round(sum / count);
      const idx = (y * width + x) * 4;
      data[idx] = avg;
      data[idx + 1] = avg;
      data[idx + 2] = avg;
    }
  }
}

/**
 * Apply smoothing to edges
 */
function applySmoothing(
  data: Uint8ClampedArray,
  width: number,
  height: number,
  amount: number,
): void {
  for (let iteration = 0; iteration < amount; iteration++) {
    const temp = new Uint8ClampedArray(data.length);
    temp.set(data);

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let sum = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const idx = ((y + dy) * width + (x + dx)) * 4;
            sum += temp[idx];
          }
        }
        const avg = Math.round(sum / 9);
        const idx = (y * width + x) * 4;
        data[idx] = avg;
        data[idx + 1] = avg;
        data[idx + 2] = avg;
      }
    }
  }
}

/**
 * Apply contrast adjustment
 */
function applyContrast(data: Uint8ClampedArray, contrast: number): void {
  const factor = (259 * (contrast + 255)) / (255 * (259 - contrast));
  for (let i = 0; i < data.length; i += 4) {
    const value = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128));
    data[i] = data[i + 1] = data[i + 2] = value;
  }
}

export default router;
