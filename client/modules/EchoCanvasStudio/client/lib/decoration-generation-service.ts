/**
 * Decoration Generation Service
 * Handles AI-powered image generation for cake decorations
 */

import type { Decoration } from "@/lib/decoration-types";

interface GenerationOptions {
  apiEndpoint?: string;
  maxRetries?: number;
  timeout?: number;
  onProgress?: (message: string) => void;
  onError?: (error: Error) => void;
}

interface GenerationResult {
  success: boolean;
  imageUrl?: string;
  error?: string;
  generatedAt?: string;
  generationTimeMs?: number;
}

/**
 * Generate image for a decoration using the backend API
 */
export async function generateDecorationImage(
  decoration: Decoration,
  prompt: string,
  options: GenerationOptions = {},
): Promise<GenerationResult> {
  const {
    apiEndpoint = "/api/generate-image",
    maxRetries = 3,
    timeout = 120000,
    onProgress,
    onError,
  } = options;

  const startTime = Date.now();
  let lastError: Error | null = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      onProgress?.(
        `Generating decoration image (attempt ${attempt}/${maxRetries})...`,
      );

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort("Decoration generation request timeout"), timeout);

      const response = await fetch(apiEndpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          size: "512x512",
          project_id: "cake-decorations",
          metadata: {
            decorationType: decoration.type,
            decorationId: decoration.id,
          },
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`API error: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Generation failed");
      }

      if (!data.image_url) {
        throw new Error("No image URL returned from API");
      }

      onProgress?.("Decoration image generated successfully!");

      return {
        success: true,
        imageUrl: data.image_url,
        generatedAt: new Date().toISOString(),
        generationTimeMs: Date.now() - startTime,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt === maxRetries) {
        onError?.(lastError);
        return {
          success: false,
          error: lastError.message,
        };
      }

      // Wait before retrying (exponential backoff)
      const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  const error =
    lastError || new Error("Generation failed after maximum retries");
  onError?.(error);

  return {
    success: false,
    error: error.message,
  };
}

/**
 * Batch generate images for multiple decorations
 */
export async function batchGenerateDecorationImages(
  decorations: Array<{ decoration: Decoration; prompt: string }>,
  options: GenerationOptions = {},
): Promise<Map<string, GenerationResult>> {
  const results = new Map<string, GenerationResult>();

  for (const { decoration, prompt } of decorations) {
    const result = await generateDecorationImage(decoration, prompt, options);
    results.set(decoration.id, result);

    // Add delay between requests to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return results;
}

/**
 * Stream decoration generation with progress updates
 */
export async function* streamDecorationGeneration(
  decorations: Array<{ decoration: Decoration; prompt: string }>,
  options: GenerationOptions = {},
) {
  for (const { decoration, prompt } of decorations) {
    const result = await generateDecorationImage(decoration, prompt, options);
    yield {
      decorationId: decoration.id,
      ...result,
    };
  }
}

/**
 * Check if a generated image is valid
 */
export async function validateGeneratedImage(
  imageUrl: string,
): Promise<boolean> {
  try {
    const response = await fetch(imageUrl, { method: "HEAD" });
    return response.ok;
  } catch (error) {
    console.error("Image validation failed:", error);
    return false;
  }
}

/**
 * Cache generated decoration images
 */
class DecorationImageCache {
  private cache = new Map<string, { url: string; timestamp: number }>();
  private readonly maxAge = 24 * 60 * 60 * 1000; // 24 hours

  set(key: string, url: string): void {
    this.cache.set(key, {
      url,
      timestamp: Date.now(),
    });
  }

  get(key: string): string | null {
    const item = this.cache.get(key);
    if (!item) return null;

    // Check if cached item has expired
    if (Date.now() - item.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return item.url;
  }

  clear(): void {
    this.cache.clear();
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }
}

export const decorationImageCache = new DecorationImageCache();

/**
 * Generate decoration with caching
 */
export async function generateDecorationImageWithCache(
  decoration: Decoration,
  prompt: string,
  options: GenerationOptions = {},
): Promise<GenerationResult> {
  const cacheKey = `${decoration.id}-${prompt}`;

  // Check cache first
  const cached = decorationImageCache.get(cacheKey);
  if (cached) {
    return {
      success: true,
      imageUrl: cached,
    };
  }

  // Generate new image
  const result = await generateDecorationImage(decoration, prompt, options);

  // Cache successful result
  if (result.success && result.imageUrl) {
    decorationImageCache.set(cacheKey, result.imageUrl);
  }

  return result;
}

/**
 * Pre-cache a set of decoration images
 */
export async function precacheDecorationImages(
  decorations: Array<{ decoration: Decoration; prompt: string }>,
  options: GenerationOptions = {},
): Promise<Map<string, boolean>> {
  const precacheResults = new Map<string, boolean>();

  for (const { decoration, prompt } of decorations) {
    const cacheKey = `${decoration.id}-${prompt}`;

    // Skip if already cached
    if (decorationImageCache.has(cacheKey)) {
      precacheResults.set(decoration.id, true);
      continue;
    }

    const result = await generateDecorationImage(decoration, prompt, options);

    if (result.success && result.imageUrl) {
      decorationImageCache.set(cacheKey, result.imageUrl);
      precacheResults.set(decoration.id, true);
    } else {
      precacheResults.set(decoration.id, false);
    }

    // Add delay between requests
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return precacheResults;
}

/**
 * Get generation statistics
 */
export function getGenerationStats(): {
  cachedCount: number;
  totalCached: number;
} {
  // Returns actual cache statistics from internal cache state
  return {
    cachedCount: decorationImageCache["cache"]?.size || 0,
    totalCached: decorationImageCache["cache"]?.size || 0,
  };
}
