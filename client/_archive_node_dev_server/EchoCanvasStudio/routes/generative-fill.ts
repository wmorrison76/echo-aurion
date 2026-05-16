import OpenAI from "openai";
import { getSubmoduleOpenAIClient } from "@/modules/_shared/openai-client";
const openai = getSubmoduleOpenAIClient();
export async function generateFillImage(
  prompt: string,
  size: "1024x1024" | "1024x1792" | "1792x1024" = "1024x1024",
  quality: "standard" | "hd" = "standard",
): Promise<string> {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("OpenAI API key not configured");
  }
  try {
    const response = await openai.images.generate({
      prompt: `Generate a seamless fill that matches and extends the surrounding context. ${prompt}. Style: photorealistic, detailed, high quality. Ensure the result tiles seamlessly.`,
      n: 1,
      size,
      quality,
      model: "dall-e-3",
    });
    if (!response.data || response.data.length === 0) {
      throw new Error("No image was generated");
    }
    return response.data[0].url || "";
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(`Failed to generate fill image: ${error.message}`);
    }
    throw error;
  }
}
export default async function handler(req: any, res: any) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }
  try {
    const { prompt, size = "1024x1024", quality = "standard" } = req.body;
    if (!prompt) {
      return res.status(400).json({ error: "Prompt is required" });
    }
    const imageUrl = await generateFillImage(
      prompt,
      size as "1024x1024" | "1024x1792" | "1792x1024",
      quality as "standard" | "hd",
    );
    return res.status(200).json({ imageUrl });
  } catch (error) {
    console.error("Generative fill error:", error);
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Failed to generate fill",
    });
  }
}
