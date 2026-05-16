/**
 * Video Export Manager for recording whiteboard sessions as time-lapse
 * Uses the RecordingRTC library approach for screen recording
 */

export interface RecordingFrame {
  timestamp: number;
  canvasDataUrl: string;
  duration: number;
}

export interface RecordingSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  frames: RecordingFrame[];
  isRecording: boolean;
  fps: number;
}

/**
 * Manages recording of canvas frames for video export
 */
export class VideoExportManager {
  private session: RecordingSession | null = null;
  private frameIntervalId: NodeJS.Timeout | null = null;
  private fps: number = 30;

  constructor(fps: number = 30) {
    this.fps = fps;
  }

  /**
   * Start a new recording session
   */
  startRecording(sessionId: string): RecordingSession {
    if (this.session?.isRecording) {
      throw new Error("Recording already in progress");
    }

    this.session = {
      sessionId,
      startTime: Date.now(),
      frames: [],
      isRecording: true,
      fps: this.fps,
    };

    return this.session;
  }

  /**
   * Stop the current recording session
   */
  stopRecording(): RecordingSession | null {
    if (!this.session) return null;

    if (this.frameIntervalId) {
      clearInterval(this.frameIntervalId);
      this.frameIntervalId = null;
    }

    this.session.isRecording = false;
    this.session.endTime = Date.now();

    return this.session;
  }

  /**
   * Capture a frame from the canvas
   */
  captureFrame(canvas: HTMLCanvasElement, duration: number = 0): void {
    if (!this.session || !this.session.isRecording) return;

    try {
      const dataUrl = canvas.toDataURL("image/png");
      this.session.frames.push({
        timestamp: Date.now(),
        canvasDataUrl: dataUrl,
        duration,
      });
    } catch (error) {
      console.error("Failed to capture frame:", error);
    }
  }

  /**
   * Start continuous frame capture
   */
  startContinuousCapture(canvas: HTMLCanvasElement): void {
    if (this.frameIntervalId) {
      clearInterval(this.frameIntervalId);
    }

    const frameInterval = 1000 / this.fps;
    this.frameIntervalId = setInterval(() => {
      this.captureFrame(canvas);
    }, frameInterval);
  }

  /**
   * Stop continuous frame capture
   */
  stopContinuousCapture(): void {
    if (this.frameIntervalId) {
      clearInterval(this.frameIntervalId);
      this.frameIntervalId = null;
    }
  }

  /**
   * Get current recording session
   */
  getCurrentSession(): RecordingSession | null {
    return this.session;
  }

  /**
   * Get frame count
   */
  getFrameCount(): number {
    return this.session?.frames.length || 0;
  }

  /**
   * Export recording as WebM video (requires ffmpeg.wasm or similar)
   */
  async exportAsWebM(fileName: string = "recording.webm"): Promise<Blob> {
    if (!this.session || this.session.frames.length === 0) {
      throw new Error("No frames to export");
    }

    // This is a placeholder - actual implementation would require
    // a WebAssembly video encoder like ffmpeg.wasm
    return new Promise((resolve) => {
      const mimeType = 'video/webm;codecs="vp8,vorbis"';
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Failed to get canvas context");
      }

      // Create a simple WebM file header
      // In production, use ffmpeg.wasm or MediaRecorder API
      const blob = new Blob([], { type: mimeType });
      resolve(blob);
    });
  }

  /**
   * Export recording as GIF (requires gif.js library)
   */
  async exportAsGIF(fileName: string = "recording.gif"): Promise<Blob> {
    if (!this.session || this.session.frames.length === 0) {
      throw new Error("No frames to export");
    }

    // This would require gif.js library
    // For now, return a placeholder
    return new Blob([], { type: "image/gif" });
  }

  /**
   * Create time-lapse by sampling frames
   */
  createTimeLapse(samplingRate: number = 10): RecordingFrame[] {
    if (!this.session) return [];

    const lapsedFrames: RecordingFrame[] = [];
    for (let i = 0; i < this.session.frames.length; i += samplingRate) {
      lapsedFrames.push(this.session.frames[i]);
    }

    return lapsedFrames;
  }

  /**
   * Get recording duration in seconds
   */
  getRecordingDuration(): number {
    if (!this.session) return 0;
    const endTime = this.session.endTime || Date.now();
    return (endTime - this.session.startTime) / 1000;
  }

  /**
   * Get recording statistics
   */
  getStatistics() {
    if (!this.session) {
      return null;
    }

    const duration = this.getRecordingDuration();
    const frameCount = this.session.frames.length;
    const actualFps = frameCount / duration;

    return {
      duration,
      frameCount,
      fps: this.fps,
      actualFps: Math.round(actualFps * 100) / 100,
      estimatedFileSize: this.estimateFileSize(),
    };
  }

  /**
   * Estimate file size for export
   */
  private estimateFileSize(): number {
    if (!this.session || this.session.frames.length === 0) return 0;

    // Average PNG frame size estimate
    const avgFrameSize = 50000; // 50KB per frame (rough estimate)
    return this.session.frames.length * avgFrameSize;
  }

  /**
   * Clear current session
   */
  clearSession(): void {
    if (this.frameIntervalId) {
      clearInterval(this.frameIntervalId);
      this.frameIntervalId = null;
    }
    this.session = null;
  }

  /**
   * Export session data as JSON
   */
  exportSessionAsJSON(): string {
    if (!this.session) {
      throw new Error("No active session");
    }

    return JSON.stringify(
      {
        ...this.session,
        frames: this.session.frames.map((f) => ({
          timestamp: f.timestamp,
          duration: f.duration,
          // Don't include dataUrl to keep JSON size reasonable
        })),
      },
      null,
      2,
    );
  }

  /**
   * Convert frames to a sequence of images
   */
  downloadFrameSequence(): void {
    if (!this.session || this.session.frames.length === 0) {
      throw new Error("No frames to download");
    }

    this.session.frames.forEach((frame, index) => {
      const link = document.createElement("a");
      link.href = frame.canvasDataUrl;
      link.download = `frame-${String(index).padStart(5, "0")}.png`;
      link.click();
    });
  }
}

/**
 * Helper function to create a simple video from frames using canvas
 */
export async function createVideoFromFrames(
  frames: RecordingFrame[],
  width: number = 1920,
  height: number = 1080,
  fps: number = 30,
): Promise<Blob> {
  // This is a placeholder implementation
  // In production, you would use ffmpeg.wasm or a similar library
  // to actually encode the frames into a video file

  if (frames.length === 0) {
    throw new Error("No frames provided");
  }

  // Create a simple blob with metadata
  const metadata = {
    width,
    height,
    fps,
    frameCount: frames.length,
    duration: frames.length / fps,
  };

  return new Blob([JSON.stringify(metadata)], {
    type: "application/json",
  });
}

/**
 * Helper function to download a blob as a file
 */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
