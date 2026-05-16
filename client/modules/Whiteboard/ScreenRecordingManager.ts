/** * Screen Recording Manager * Handles screen recording of whiteboard sessions with MediaRecorder API */ import {
  CanvasState,
  RecordingSession,
  RecordingFrame,
} from "./types";
import { v4 as uuidv4 } from "uuid";
interface RecordingOptions {
  mimeType?: string;
  bitrate?: number;
  frameRate?: number;
  captureAudio?: boolean;
}
class ScreenRecordingManager {
  private static mediaRecorder: MediaRecorder | null = null;
  private static recordedChunks: Blob[] = [];
  private static recordingSession: RecordingSession | null = null;
  private static frameBuffer: RecordingFrame[] = [];
  private static animationFrameId: number | null = null;
  private static isRecording = false;
  private static captureCanvas: HTMLCanvasElement | null = null;
  private static captureContext: CanvasRenderingContext2D | null = null;
  static async startRecording(
    canvasElement: HTMLCanvasElement,
    sessionId: string,
    userId: string,
    title: string,
    options: RecordingOptions = {},
  ): Promise<RecordingSession> {
    try {
      const mimeType = options.mimeType || "video/webm;codecs=vp8,opus";
      const frameRate = options.frameRate || 30;
      const canvas = await this.setupCaptureCanvas(canvasElement);
      const stream = canvas.captureStream(frameRate);
      if (options.captureAudio) {
        try {
          const audioStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true },
          });
          audioStream
            .getAudioTracks()
            .forEach((track) => stream.addTrack(track));
        } catch (error) {
          console.warn(
            "[Recording] Audio capture not available, continuing without audio",
          );
        }
      }
      this.mediaRecorder = new MediaRecorder(stream, { mimeType });
      this.recordedChunks = [];
      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };
      this.recordingSession = {
        id: uuidv4(),
        sessionId,
        title,
        startTime: Date.now(),
        isProcessing: false,
        recordedBy: userId,
        frameCount: 0,
      };
      this.mediaRecorder.start();
      this.isRecording = true;
      this.captureCanvasFrames();
      console.log("[Recording] Started recording");
      return this.recordingSession;
    } catch (error) {
      console.error("[Recording] Failed to start:", error);
      throw error;
    }
  }
  private static async setupCaptureCanvas(
    sourceCanvas: HTMLCanvasElement,
  ): Promise<HTMLCanvasElement> {
    this.captureCanvas = document.createElement("canvas");
    this.captureCanvas.width = sourceCanvas.width;
    this.captureCanvas.height = sourceCanvas.height;
    this.captureContext = this.captureCanvas.getContext("2d");
    if (!this.captureContext) {
      throw new Error("Failed to get canvas context");
    }
    return this.captureCanvas;
  }
  private static captureCanvasFrames(): void {
    if (!this.isRecording) return;
    this.animationFrameId = requestAnimationFrame(() => {
      this.captureCanvasFrames();
    });
  }
  static recordFrame(canvasState: CanvasState): void {
    if (!this.isRecording || !this.captureContext || !this.captureCanvas) {
      return;
    }
    const frame: RecordingFrame = {
      timestamp: Date.now(),
      canvasState: { ...canvasState },
    };
    this.frameBuffer.push(frame);
    if (this.recordingSession) {
      this.recordingSession.frameCount =
        (this.recordingSession.frameCount || 0) + 1;
    }
  }
  static async stopRecording(): Promise<RecordingSession | null> {
    if (!this.isRecording || !this.mediaRecorder) {
      console.warn("[Recording] No active recording");
      return null;
    }
    try {
      return new Promise((resolve) => {
        if (!this.mediaRecorder) {
          resolve(null);
          return;
        }
        this.mediaRecorder.onstop = async () => {
          this.isRecording = false;
          if (this.recordingSession) {
            const videoBlob = new Blob(this.recordedChunks, {
              type: "video/webm",
            });
            this.recordingSession.videoBlob = videoBlob;
            this.recordingSession.videoUrl = URL.createObjectURL(videoBlob);
            this.recordingSession.endTime = Date.now();
            this.recordingSession.duration =
              (this.recordingSession.endTime -
                this.recordingSession.startTime) /
              1000;
            this.recordingSession.thumbnail = await this.generateThumbnail();
            const session = this.recordingSession;
            this.cleanup();
            resolve(session);
          } else {
            this.cleanup();
            resolve(null);
          }
        };
        this.mediaRecorder.stop();
      });
    } catch (error) {
      console.error("[Recording] Failed to stop:", error);
      this.cleanup();
      throw error;
    }
  }
  private static generateThumbnail(): Promise<string> {
    return new Promise((resolve) => {
      if (!this.captureCanvas) {
        resolve("");
        return;
      }
      const canvas = document.createElement("canvas");
      canvas.width = 320;
      canvas.height = 180;
      const ctx = canvas.getContext("2d");
      if (ctx && this.captureCanvas) {
        ctx.drawImage(this.captureCanvas, 0, 0, 320, 180);
        resolve(canvas.toDataURL("image/jpeg", 0.7));
      } else {
        resolve("");
      }
    });
  }
  static isRecordingActive(): boolean {
    return this.isRecording;
  }
  static getRecordingSession(): RecordingSession | null {
    return this.recordingSession;
  }
  static getFrameBuffer(): RecordingFrame[] {
    return [...this.frameBuffer];
  }
  static clearFrameBuffer(): void {
    this.frameBuffer = [];
  }
  static async saveRecording(recording: RecordingSession): Promise<boolean> {
    if (!recording.videoBlob) {
      console.error("[Recording] No video data to save");
      return false;
    }
    try {
      const url = URL.createObjectURL(recording.videoBlob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `${recording.title}-${recording.id}.webm`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      console.log("[Recording] Saved successfully");
      return true;
    } catch (error) {
      console.error("[Recording] Failed to save:", error);
      return false;
    }
  }
  static async uploadRecording(
    recording: RecordingSession,
    uploadUrl: string,
  ): Promise<boolean> {
    if (!recording.videoBlob) {
      console.error("[Recording] No video data to upload");
      return false;
    }
    try {
      recording.isProcessing = true;
      const formData = new FormData();
      formData.append("video", recording.videoBlob, `${recording.id}.webm`);
      formData.append("title", recording.title);
      formData.append("sessionId", recording.sessionId);
      const response = await fetch(uploadUrl, {
        method: "POST",
        body: formData,
      });
      if (!response.ok) {
        throw new Error(`Upload failed: ${response.statusText}`);
      }
      const result = await response.json();
      recording.videoUrl = result.url || recording.videoUrl;
      recording.isProcessing = false;
      console.log("[Recording] Uploaded successfully");
      return true;
    } catch (error) {
      recording.isProcessing = false;
      console.error("[Recording] Upload failed:", error);
      return false;
    }
  }
  private static cleanup(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    if (this.mediaRecorder && this.mediaRecorder.state !== "inactive") {
      this.mediaRecorder.stop();
    }
    this.mediaRecorder = null;
    this.recordedChunks = [];
    this.captureCanvas = null;
    this.captureContext = null;
    this.recordingSession = null;
    this.frameBuffer = [];
  }
  static getRecordingDuration(): number {
    if (!this.recordingSession) return 0;
    const endTime = this.recordingSession.endTime || Date.now();
    return Math.floor((endTime - this.recordingSession.startTime) / 1000);
  }
  static formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    if (hours > 0) {
      return `${hours}:${String(minutes).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
    }
    return `${minutes}:${String(secs).padStart(2, "0")}`;
  }
}
export default ScreenRecordingManager;
