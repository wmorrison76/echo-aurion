import { Router, Request, Response } from "express";
import type {
  GenerateImageRequest,
  GenerateImageResponse,
} from "../../shared/types";
const router = Router();
export async function generateImage(
  prompt: string,
  size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024",
  quality: "standard" | "hd" = "standard",
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    throw new Error("OpenAI API key not configured");
  }
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({ prompt, n: 1, size, model: "dall-e-3", quality }),
  }); // Read response body only once const responseData = await response.json(); if (!response.ok) { throw new Error(responseData.error?.message ||"Failed to generate image"); } const azureUrl = responseData.data[0].url; // Return a proxied URL to avoid CORS issues // The proxy endpoint will fetch the image from Azure and serve it with proper CORS headers const proxiedUrl = `/api/proxy-image?url=${encodeURIComponent(azureUrl)}`; return proxiedUrl;
}
router.post("/generate-image", async (req: Request, res: Response) => {
  try {
    const {
      prompt,
      size = "1024x1024",
      quality = "standard",
    } = req.body as any;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({
        success: false,
        error: "Prompt is required and must be a string",
      } as GenerateImageResponse);
    }
    const imageUrl = await generateImage(prompt, size as any, quality as any);
    res.json({ success: true, imageUrl: imageUrl } as GenerateImageResponse);
  } catch (error) {
    console.error("Image generation error:", error);
    res.status(500).json({
      success: false,
      error:
        error instanceof Error ? error.message : "Failed to generate image",
    } as GenerateImageResponse);
  }
});
export default router;
