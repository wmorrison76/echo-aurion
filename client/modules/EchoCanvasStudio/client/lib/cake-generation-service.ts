/**
 * Cake Generation Service
 * Orchestrates the generation of cake layers via the LayerGeneratorPanel API
 */

import {
  CakeLayerQueueManager,
  type LayerGenerationJob,
} from "./cake-layer-queue";
import { getApiBaseUrl } from "./luccca-integration";

interface LayerGenerationRequest {
  tier?: number;
  style?: "professional" | "artistic" | "rustic" | "elegant";
  transparent?: boolean;
  prompt?: string;
  size?: "1024x1024" | "1024x1792" | "1792x1024";
  quality?: "standard" | "hd";
  designId?: string;
}

interface LayerGenerationResponse {
  success: boolean;
  imageUrl?: string;
  error?: string;
  metadata?: {
    seed: number;
    generatedAt: string;
    width: number;
    height: number;
    hasAlpha: boolean;
    jobId?: string;
    prompt?: string;
  };
}

export class CakeGenerationService {
  private queue: CakeLayerQueueManager;
  private designId: string;
  private isRunning = false;
  private activeJobId: string | null = null;

  constructor(queue: CakeLayerQueueManager, designId: string) {
    this.queue = queue;
    this.designId = designId;
  }

  /**
   * Start processing the queue
   */
  async startQueue(): Promise<void> {
    if (this.isRunning) {
      console.warn("Queue is already running");
      return;
    }

    this.isRunning = true;

    try {
      let nextJob = this.queue.getNextPendingJob();

      while (nextJob && this.isRunning) {
        try {
          await this.generateJob(nextJob);
        } catch (error) {
          console.error(`Failed to generate job ${nextJob.id}:`, error);
          this.queue.failJob(
            nextJob.id,
            error instanceof Error ? error.message : "Unknown error",
          );
        }

        // Get next pending job
        nextJob = this.queue.getNextPendingJob();

        // Small delay between generations to avoid rate limiting
        if (nextJob) {
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
    } finally {
      this.isRunning = false;
      this.activeJobId = null;
    }
  }

  /**
   * Stop processing the queue
   */
  stopQueue(): void {
    this.isRunning = false;
  }

  /**
   * Generate a single job using DALL-E 3 for superior quality (no prompt filtering)
   */
  private async generateJob(job: LayerGenerationJob): Promise<void> {
    this.activeJobId = job.id;
    this.queue.setJobGenerating(job.id);

    try {
      // Enhance prompt with transparency requirement for DALL-E
      const enhancedPrompt = `${job.prompt}. The image must have a transparent background with no surroundings, only the cake component isolated.`;

      // Call the DALL-E image generator API with high quality settings
      // No prompt sanitization - OpenAI's safety system handles filtering
      const response = await fetch(`${getApiBaseUrl()}/generate-image`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt: enhancedPrompt,
          size: "1024x1024",
          quality: "hd",
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.error || `Generation failed with status ${response.status}`,
        );
      }

      const data = (await response.json()) as any;

      if (!data.success || !data.imageUrl) {
        throw new Error(data.error || "Generation returned no image URL");
      }

      // Complete the job with the image
      this.queue.completeJob(job.id, data.imageUrl);
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      this.queue.failJob(job.id, errorMessage);
      throw error;
    } finally {
      this.activeJobId = null;
    }
  }

  /**
   * Regenerate a specific job
   */
  async regenerateJob(jobId: string): Promise<void> {
    const newJob = this.queue.regenerateJob(jobId);
    if (newJob) {
      try {
        await this.generateJob(newJob);
      } catch (error) {
        console.error(`Failed to regenerate job ${jobId}:`, error);
      }
    }
  }

  /**
   * Check if queue is currently running
   */
  isQueueRunning(): boolean {
    return this.isRunning;
  }

  /**
   * Get the currently active job ID
   */
  getActiveJobId(): string | null {
    return this.activeJobId;
  }
}

/**
 * Global generation service instance
 * Create one per design/cake
 */
let generationServiceInstance: CakeGenerationService | null = null;

export function createGenerationService(
  queue: CakeLayerQueueManager,
  designId: string,
): CakeGenerationService {
  generationServiceInstance = new CakeGenerationService(queue, designId);
  return generationServiceInstance;
}

export function getGenerationService(): CakeGenerationService | null {
  return generationServiceInstance;
}

/**
 * Start generation in the background (non-blocking)
 */
export function startGenerationInBackground(
  queue: CakeLayerQueueManager,
  designId: string,
): CakeGenerationService {
  const service = createGenerationService(queue, designId);

  // Start the queue without awaiting
  service.startQueue().catch((error) => {
    console.error("Background generation error:", error);
  });

  return service;
}
