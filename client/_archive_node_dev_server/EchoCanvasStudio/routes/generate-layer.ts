/**
 * Generate Layer API Route
 * Generates individual cake tiers/frosting with transparent backgrounds
 *
 * Uses Stable Diffusion XL via Replicate API
 * Supports reproducible generation via seeds
 */

import { Router, Request, Response } from "express";
import type {
  LayerGenerationRequest,
  LayerGenerationResponse,
} from "../../shared/types";

const router = Router();

/**
 * Replicate API configuration
 */
interface ReplicateRequest {
  version: string;
  input: {
    prompt: string;
    negative_prompt: string;
    num_outputs: number;
    scheduler: string;
    num_inference_steps: number;
    guidance_scale: number;
    width: number;
    height: number;
    seed: number;
  };
  webhook?: string;
  webhook_events_filter?: string[];
}

interface ReplicateResponse {
  id: string;
  status: string;
  output?: string[];
  error?: string;
}

/**
 * SDXL Model ID on Replicate
 * stable-diffusion-xl - 39e7e46bde0e309fa3ca36860f26cecc3bbb753829c45374242821981b8cebcd
 */
const SDXL_MODEL_ID =
  "39e7e46bde0e309fa3ca36860f26cecc3bbb753829c45374242821981b8cebcd";

/**
 * Build detailed prompt for cake tier generation
 * Uses the provided prompt if available, otherwise builds from config
 */
function buildLayerPrompt(config: LayerGenerationRequest): string {
  // If a detailed prompt is provided, enhance it further for SDXL
  if (config.prompt && typeof config.prompt === "string") {
    const enhancedPrompt = `${config.prompt}

Ultra high quality 8K professional food photography
Photorealistic texture detail with micro-detail visibility
Perfect studio lighting with soft shadows
Cinematic color grading with rich tones
Professional bakery product photography
No background, isolated subject on transparent
Detailed texture and surface quality emphasis
Sharp focus with perfect depth of field
Professional food styling
Flawless finish with zero artifacts`;

    return enhancedPrompt;
  }

  const { tier, style } = config;

  if (!tier || !style) {
    return "Professional bakery cake tier photograph";
  }

  const prompt = `
    Single perfect cake tier isolated on transparent background
    Shape: ${tier.shape} cake
    Diameter: ${tier.diameter} inches
    Height: ${tier.height} inches

    Frosting type: ${style.frosting}
    Frosting color: ${style.color} (exact hex: ${style.color})
    Frosting texture: ${style.texture} finish
    ${style.pattern ? `Pattern: ${style.pattern} piping` : ""}

    Ultra high quality professional food photography
    Perfect lighting showing frosting texture detail
    Photorealistic with micro-detail visibility
    Sharp focus, no blur, no crumbs
    Clean surfaces with flawless finish
    Isolated on transparent background

    Studio lighting, cinematic quality
    Rich professional color grading
    Detailed texture emphasis
  `.trim();

  return prompt;
}

/**
 * Build negative prompt to exclude unwanted elements
 */
function buildNegativePrompt(): string {
  return [
    "background",
    "other cakes",
    "decorations",
    "flowers",
    "people",
    "hands",
    "utensils",
    "plate",
    "table",
    "crumbs",
    "messy",
    "blurry",
    "low quality",
    "pixelated",
    "artifacts",
    "watermark",
    "text",
    "logo",
    "distorted",
    "deformed",
    "malformed",
    "disfigured",
    "bad quality",
    "amateur",
    "amateur photography",
    "cellphone photo",
    "blurry image",
    "cropped",
    "cut off",
    "people in background",
    "cluttered",
    "messy background",
    "out of focus",
    "shallow depth of field",
    "bad focus",
  ].join(", ");
}

/**
 * Generate seed from request for reproducibility
 */
function generateSeed(config: LayerGenerationRequest): number {
  if (config.seed) {
    // If seed provided, try to convert to number
    const seedNum = parseInt(config.seed, 10);
    if (!isNaN(seedNum)) return seedNum;
  }

  // Generate deterministic seed from config
  const combined = JSON.stringify(config);
  let hash = 0;
  for (let i = 0; i < combined.length; i++) {
    const char = combined.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return Math.abs(hash) % 4294967295; // Max seed value
}

/**
 * Poll Replicate API for prediction completion
 */
async function pollPrediction(
  predictionId: string,
  maxAttempts: number = 60,
): Promise<string[]> {
  const replicateToken = process.env.REPLICATE_API_KEY;

  if (!replicateToken) {
    throw new Error("REPLICATE_API_KEY not configured");
  }

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const response = await fetch(
      `https://api.replicate.com/v1/predictions/${predictionId}`,
      {
        method: "GET",
        headers: {
          Authorization: `Token ${replicateToken}`,
        },
      },
    );

    const prediction = (await response.json()) as ReplicateResponse;

    if (prediction.status === "succeeded") {
      return prediction.output || [];
    }

    if (prediction.status === "failed") {
      throw new Error(
        `Prediction failed: ${prediction.error || "Unknown error"}`,
      );
    }

    // Wait before next poll (exponential backoff)
    const delay = Math.min(1000 * Math.pow(1.1, attempt), 5000);
    await new Promise((resolve) => setTimeout(resolve, delay));
  }

  throw new Error("Prediction polling timeout");
}

/**
 * Generate layer image using Stable Diffusion XL
 */
async function generateLayerImage(
  config: LayerGenerationRequest,
): Promise<string> {
  const replicateToken = process.env.REPLICATE_API_KEY;

  if (!replicateToken) {
    throw new Error("REPLICATE_API_KEY not configured");
  }

  const prompt = buildLayerPrompt(config);
  const negativePrompt = buildNegativePrompt();
  const seed = generateSeed(config);

  const replicateRequest: ReplicateRequest = {
    version: SDXL_MODEL_ID,
    input: {
      prompt,
      negative_prompt: negativePrompt,
      num_outputs: 1,
      scheduler: "DPM++ 2M Karras",
      num_inference_steps: 50,
      guidance_scale: 8.5,
      width: 1024,
      height: 1024,
      seed,
      refine: "expert_ensemble_refiner",
      high_noise_frac: 0.7,
    },
  };

  // Create prediction
  const createResponse = await fetch(
    "https://api.replicate.com/v1/predictions",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Token ${replicateToken}`,
      },
      body: JSON.stringify(replicateRequest),
    },
  );

  if (!createResponse.ok) {
    const error = await createResponse.text();
    throw new Error(`Failed to create prediction: ${error}`);
  }

  const prediction = (await createResponse.json()) as ReplicateResponse;

  // Poll for completion
  const output = await pollPrediction(prediction.id);

  if (!output || output.length === 0) {
    throw new Error("No output generated");
  }

  return output[0];
}

/**
 * POST /api/generate-layer
 * Generate a transparent cake layer image
 */
router.post("/generate-layer", async (req: Request, res: Response) => {
  try {
    const config = req.body as LayerGenerationRequest;

    // Validate input
    if (!config.tier || !config.style) {
      return res.status(400).json({
        success: false,
        error: "Missing tier or style configuration",
      } as LayerGenerationResponse);
    }

    if (!config.tier.diameter || !config.tier.height) {
      return res.status(400).json({
        success: false,
        error: "Tier must specify diameter and height",
      } as LayerGenerationResponse);
    }

    if (
      !config.style.frosting ||
      !config.style.color ||
      !config.style.texture
    ) {
      return res.status(400).json({
        success: false,
        error: "Style must specify frosting type, color, and texture",
      } as LayerGenerationResponse);
    }

    // Check for API key
    if (!process.env.REPLICATE_API_KEY) {
      return res.status(500).json({
        success: false,
        error: "Image generation not configured (REPLICATE_API_KEY missing)",
      } as LayerGenerationResponse);
    }

    console.log("[GenerateLayer] Creating layer image", {
      diameter: config.tier.diameter,
      frosting: config.style.frosting,
      color: config.style.color,
    });

    // Generate image
    const imageUrl = await generateLayerImage(config);
    const seed = generateSeed(config);

    console.log("[GenerateLayer] Layer generated successfully", {
      imageUrl: imageUrl.substring(0, 50) + "...",
    });

    res.json({
      success: true,
      imageUrl,
      metadata: {
        tier: config.tier,
        style: config.style,
        hasAlpha: config.transparent,
        width: 1024,
        height: 1024,
        seed: seed.toString(),
        generatedAt: new Date().toISOString(),
      },
    } as LayerGenerationResponse);
  } catch (error) {
    console.error("[GenerateLayer] Generation failed", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate layer";

    res.status(500).json({
      success: false,
      error: errorMessage,
    } as LayerGenerationResponse);
  }
});

/**
 * POST /api/generate-layer/batch
 * Generate multiple layers at once
 */
router.post("/generate-layer/batch", async (req: Request, res: Response) => {
  try {
    const configs = req.body.configs as LayerGenerationRequest[];

    if (!Array.isArray(configs) || configs.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Configs must be non-empty array",
      });
    }

    if (configs.length > 5) {
      return res.status(400).json({
        success: false,
        error: "Maximum 5 layers per batch",
      });
    }

    console.log("[GenerateLayer] Starting batch generation", {
      count: configs.length,
    });

    // Generate all layers in parallel
    const results = await Promise.allSettled(
      configs.map((config) => generateLayerImage(config)),
    );

    const images = results
      .map((result) => {
        if (result.status === "fulfilled") {
          return result.value;
        } else {
          console.error("Layer generation failed", result.reason);
          return null;
        }
      })
      .filter((url) => url !== null) as string[];

    if (images.length === 0) {
      throw new Error("All layers failed to generate");
    }

    console.log("[GenerateLayer] Batch completed", {
      successful: images.length,
      failed: configs.length - images.length,
    });

    res.json({
      success: true,
      images,
      metadata: {
        requested: configs.length,
        successful: images.length,
        failed: configs.length - images.length,
        generatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[GenerateLayer] Batch generation failed", error);

    const errorMessage =
      error instanceof Error ? error.message : "Failed to generate layers";

    res.status(500).json({
      success: false,
      error: errorMessage,
    });
  }
});

export default router;
