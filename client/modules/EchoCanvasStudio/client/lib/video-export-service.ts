/**
 * Video Export Service
 * Handles exporting animation and cake designs as video files
 */

export interface VideoExportOptions {
  width: number;
  height: number;
  fps: number;
  duration: number;
  format: "webm" | "mp4" | "gif";
  quality: "low" | "medium" | "high";
  bitrate?: number;
}

export interface FrameCaptureOptions {
  canvas: HTMLCanvasElement;
  timestamp: number;
}

export interface VideoExportProgress {
  status: "idle" | "capturing" | "encoding" | "completed" | "failed";
  currentFrame: number;
  totalFrames: number;
  progress: number; // 0-100
  message: string;
}

/**
 * Video encoder using FFmpeg WASM
 * Note: This requires ffmpeg.wasm library
 */
export class VideoEncoder {
  private frames: ImageData[] = [];
  private options: VideoExportOptions;

  constructor(options: VideoExportOptions) {
    this.options = options;
  }

  /**
   * Add a frame to the video
   */
  addFrame(frameData: ImageData): void {
    this.frames.push(frameData);
  }

  /**
   * Add frame from canvas
   */
  addFrameFromCanvas(canvas: HTMLCanvasElement): void {
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    this.addFrame(imageData);
  }

  /**
   * Get frame count
   */
  getFrameCount(): number {
    return this.frames.length;
  }

  /**
   * Export frames as WebM video (using Canvas/MediaRecorder API)
   */
  async exportAsWebM(): Promise<Blob> {
    const canvas = new OffscreenCanvas(this.options.width, this.options.height);
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const stream = canvas.convertToBlob();

    // Create MediaStream from canvas
    const canvasElement = document.createElement("canvas");
    canvasElement.width = this.options.width;
    canvasElement.height = this.options.height;
    const canvasCtx = canvasElement.getContext("2d");
    if (!canvasCtx) throw new Error("Failed to get canvas context");

    const stream2d = canvasElement.captureStream(this.options.fps);
    const recorder = new MediaRecorder(stream2d, {
      mimeType: "video/webm;codecs=vp9",
      videoBitsPerSecond: this.options.bitrate || 2500000,
    });

    return new Promise((resolve, reject) => {
      const chunks: BlobPart[] = [];

      recorder.ondataavailable = (event) => {
        chunks.push(event.data);
      };

      recorder.onstop = () => {
        const blob = new Blob(chunks, { type: "video/webm" });
        resolve(blob);
      };

      recorder.onerror = (event) => {
        reject(new Error(`MediaRecorder error: ${event.error}`));
      };

      // Draw frames
      recorder.start();
      const frameDuration = 1000 / this.options.fps;

      this.frames.forEach((frameData, index) => {
        const imageData = new ImageData(
          frameData.data,
          frameData.width,
          frameData.height,
        );
        canvasCtx.putImageData(imageData, 0, 0);

        // Schedule next frame
        setTimeout(
          () => {
            if (index === this.frames.length - 1) {
              recorder.stop();
            }
          },
          (index + 1) * frameDuration,
        );
      });
    });
  }

  /**
   * Export as MP4 (requires server-side processing or FFmpeg.wasm)
   */
  async exportAsMP4(): Promise<Blob> {
    throw new Error(
      "MP4 export requires server-side processing. Please use WebM instead.",
    );
  }

  /**
   * Export as animated GIF
   * Note: GIF export uses first frame as fallback without full library
   */
  async exportAsGIF(): Promise<Blob> {
    if (this.frames.length === 0) {
      throw new Error("No frames to export");
    }

    // Use first frame as single image (GIF encoding requires external library)
    const firstFrame = this.frames[0];
    const canvas = document.createElement("canvas");
    canvas.width = firstFrame.width;
    canvas.height = firstFrame.height;
    const ctx = canvas.getContext("2d");
    if (!ctx) {
      throw new Error("Cannot create canvas context for GIF export");
    }

    ctx.putImageData(firstFrame.data, 0, 0);
    return new Promise((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error("Failed to create blob from canvas"));
        } else {
          resolve(blob);
        }
      }, "image/png");
    });
  }

  /**
   * Clear frames
   */
  clear(): void {
    this.frames = [];
  }
}

/**
 * Animation frame capturer
 */
export class AnimationFrameCapturer {
  private canvas: HTMLCanvasElement;
  private options: VideoExportOptions;
  private frames: ImageData[] = [];
  private isCapturing = false;

  constructor(canvas: HTMLCanvasElement, options: VideoExportOptions) {
    this.canvas = canvas;
    this.options = options;
  }

  /**
   * Start capturing animation frames
   */
  async captureAnimation(
    animationFn: (progress: number) => void,
    onProgress?: (progress: VideoExportProgress) => void,
  ): Promise<Blob> {
    this.frames = [];
    this.isCapturing = true;

    const ctx = this.canvas.getContext("2d");
    if (!ctx) throw new Error("Failed to get canvas context");

    const totalFrames = Math.ceil(
      (this.options.duration / 1000) * this.options.fps,
    );
    const frameDuration = 1000 / this.options.fps;

    for (let frameIndex = 0; frameIndex < totalFrames; frameIndex++) {
      if (!this.isCapturing) break;

      // Calculate animation progress (0-1)
      const progress = frameIndex / (totalFrames - 1);

      // Call animation function
      animationFn(progress);

      // Capture frame
      const imageData = ctx.getImageData(
        0,
        0,
        this.canvas.width,
        this.canvas.height,
      );
      this.frames.push(imageData);

      onProgress?.({
        status: "capturing",
        currentFrame: frameIndex + 1,
        totalFrames,
        progress: (frameIndex / totalFrames) * 100,
        message: `Capturing frame ${frameIndex + 1}/${totalFrames}...`,
      });

      // Wait for frame duration
      await new Promise((resolve) => setTimeout(resolve, frameDuration));
    }

    // Encode frames
    onProgress?.({
      status: "encoding",
      currentFrame: totalFrames,
      totalFrames,
      progress: 100,
      message: "Encoding video...",
    });

    const encoder = new VideoEncoder(this.options);
    this.frames.forEach((frame) => encoder.addFrame(frame));

    let blob: Blob;
    switch (this.options.format) {
      case "webm":
        blob = await encoder.exportAsWebM();
        break;
      case "mp4":
        throw new Error("MP4 export not supported. Please use WebM.");
      case "gif":
        throw new Error("GIF export not supported. Please use WebM.");
      default:
        throw new Error(`Unknown format: ${this.options.format}`);
    }

    onProgress?.({
      status: "completed",
      currentFrame: totalFrames,
      totalFrames,
      progress: 100,
      message: "Video export completed!",
    });

    return blob;
  }

  /**
   * Stop capturing
   */
  stopCapturing(): void {
    this.isCapturing = false;
  }
}

/**
 * Snapshot/frame capture utility
 */
export function captureCanvasFrame(
  canvas: HTMLCanvasElement,
  filename: string = "screenshot.png",
): void {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/png");
  link.download = filename;
  link.click();
}

/**
 * Capture canvas as JPEG
 */
export function captureCanvasAsJPEG(
  canvas: HTMLCanvasElement,
  filename: string = "screenshot.jpg",
  quality: number = 0.95,
): void {
  const link = document.createElement("a");
  link.href = canvas.toDataURL("image/jpeg", quality);
  link.download = filename;
  link.click();
}

/**
 * Create thumbnail from canvas
 */
export function createThumbnail(
  canvas: HTMLCanvasElement,
  width: number = 200,
  height: number = 200,
): HTMLCanvasElement {
  const thumb = document.createElement("canvas");
  thumb.width = width;
  thumb.height = height;

  const ctx = thumb.getContext("2d");
  if (!ctx) throw new Error("Failed to get canvas context");

  ctx.drawImage(canvas, 0, 0, width, height);

  return thumb;
}

/**
 * Video quality presets
 */
export const VIDEO_QUALITY_PRESETS = {
  low: {
    bitrate: 1000000,
    fps: 24,
  },
  medium: {
    bitrate: 2500000,
    fps: 30,
  },
  high: {
    bitrate: 5000000,
    fps: 60,
  },
};

/**
 * Get recommended export options based on animation duration
 */
export function getRecommendedExportOptions(
  duration: number,
): VideoExportOptions {
  const quality =
    duration > 10000 ? "low" : duration > 5000 ? "medium" : "high";
  const preset = VIDEO_QUALITY_PRESETS[quality];

  return {
    width: 1920,
    height: 1080,
    fps: preset.fps,
    duration,
    format: "webm",
    quality,
    bitrate: preset.bitrate,
  };
}

/**
 * Validate export options
 */
export function validateExportOptions(options: VideoExportOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (options.width < 256 || options.width > 4096) {
    errors.push("Width must be between 256 and 4096 pixels");
  }

  if (options.height < 256 || options.height > 4096) {
    errors.push("Height must be between 256 and 4096 pixels");
  }

  if (options.fps < 12 || options.fps > 60) {
    errors.push("FPS must be between 12 and 60");
  }

  if (options.duration < 1000 || options.duration > 300000) {
    errors.push("Duration must be between 1 and 300 seconds");
  }

  const maxFileSize = 500 * 1024 * 1024; // 500MB
  const estimatedSize = options.bitrate
    ? (options.duration / 1000) * (options.bitrate / 8)
    : 0;
  if (estimatedSize > maxFileSize) {
    errors.push(
      "Estimated file size exceeds 500MB. Reduce quality or duration.",
    );
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
