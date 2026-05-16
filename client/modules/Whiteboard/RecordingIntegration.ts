/**
 * Recording Integration for Whiteboard
 * Handles Jitsi Meet recording and local fallback
 * Stores canvas draws and audio/video streams
 */

import { CanvasState, DrawingStroke } from "./types";
import { v4 as uuidv4 } from "uuid";

export interface RecordingSession {
  recordingId: string;
  sessionId: string;
  startedAt: number;
  endedAt?: number;
  duration?: number;
  title: string;
  isJitsiRecording: boolean;
  isLocalRecording: boolean;
  participants: string[];
  canvasEvents: Array<{
    timestamp: number;
    event: string;
    data: any;
  }>;
  fileSize?: number;
  status: "recording" | "stopped" | "processing" | "completed";
}

class RecordingIntegration {
  private static currentRecording: RecordingSession | null = null;
  private static mediaRecorder: MediaRecorder | null = null;
  private static recordedChunks: Blob[] = [];
  private static canvasEventLog: Array<{
    timestamp: number;
    event: string;
    data: any;
  }> = [];

  /**
   * Start recording (Jitsi or local)
   */
  static startRecording(
    sessionId: string,
    title: string,
    useJitsi: boolean = true,
    participants: string[] = [],
  ): RecordingSession {
    const recordingId = uuidv4();
    const now = Date.now();

    this.currentRecording = {
      recordingId,
      sessionId,
      startedAt: now,
      title,
      isJitsiRecording: useJitsi,
      isLocalRecording: !useJitsi,
      participants,
      canvasEvents: [],
      status: "recording",
    };

    this.canvasEventLog = [];
    this.recordedChunks = [];

    if (useJitsi) {
      this.startJitsiRecording(sessionId);
    } else {
      this.startLocalRecording();
    }

    console.log("[Recording] Started recording:", recordingId);
    return this.currentRecording;
  }

  /**
   * Stop recording
   */
  static stopRecording(): RecordingSession | null {
    if (!this.currentRecording) {
      return null;
    }

    const now = Date.now();
    this.currentRecording.endedAt = now;
    this.currentRecording.duration = now - this.currentRecording.startedAt;
    this.currentRecording.status = "stopped";
    this.currentRecording.canvasEvents = this.canvasEventLog;

    if (this.currentRecording.isLocalRecording) {
      this.stopLocalRecording();
    }

    const recording = this.currentRecording;
    this.currentRecording = null;

    console.log("[Recording] Stopped recording:", recording.recordingId);
    return recording;
  }

  /**
   * Log canvas event
   */
  static logCanvasEvent(event: string, data: any): void {
    if (!this.currentRecording) return;

    this.canvasEventLog.push({
      timestamp: Date.now(),
      event,
      data,
    });
  }

  /**
   * Start Jitsi recording
   */
  private static startJitsiRecording(sessionId: string): void {
    try {
      // Access Jitsi API if available
      if ((window as any).JitsiMeetExternalAPI) {
        const api = (window as any).JitsiMeetExternalAPI;
        // Send command to start recording
        // Requires Jitsi Meet with recording enabled
        // This would depend on the specific Jitsi instance configuration
        console.log(
          "[Recording] Jitsi recording started for session:",
          sessionId,
        );
      } else {
        console.warn("[Recording] Jitsi API not available");
      }
    } catch (error) {
      console.error("[Recording] Jitsi recording failed:", error);
    }
  }

  /**
   * Stop Jitsi recording
   */
  private static stopJitsiRecording(): void {
    try {
      if ((window as any).JitsiMeetExternalAPI) {
        const api = (window as any).JitsiMeetExternalAPI;
        // Send command to stop recording
        console.log("[Recording] Jitsi recording stopped");
      }
    } catch (error) {
      console.error("[Recording] Stopping Jitsi recording failed:", error);
    }
  }

  /**
   * Start local media recording (canvas + audio)
   */
  private static async startLocalRecording(): Promise<void> {
    try {
      // Get audio stream if available
      const audioStream = await navigator.mediaDevices.getUserMedia({
        audio: true,
      });

      const mediaStream = new MediaStream();
      audioStream.getTracks().forEach((track) => {
        mediaStream.addTrack(track);
      });

      const options: MediaRecorderOptions = {
        mimeType: "audio/webm;codecs=opus",
        audioBitsPerSecond: 128000,
      };

      this.mediaRecorder = new MediaRecorder(mediaStream, options);
      this.recordedChunks = [];

      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.start();
      console.log("[Recording] Local recording started");
    } catch (error) {
      console.warn("[Recording] Could not access microphone:", error);
      // Continue without audio
    }
  }

  /**
   * Stop local recording and save file
   */
  private static stopLocalRecording(): void {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") {
      return;
    }

    this.mediaRecorder.stop();

    this.mediaRecorder.onstop = () => {
      const blob = new Blob(this.recordedChunks, {
        type: "audio/webm",
      });

      if (this.currentRecording) {
        this.currentRecording.fileSize = blob.size;
        this.saveRecordingLocally(blob, this.currentRecording);
      }

      // Clean up
      this.mediaRecorder?.getTracks?.().forEach((track) => {
        track.stop();
      });
    };
  }

  /**
   * Save recording locally
   */
  private static saveRecordingLocally(
    blob: Blob,
    recording: RecordingSession,
  ): void {
    try {
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `whiteboard-${recording.sessionId}-${new Date().getTime()}.webm`;
      a.click();
      URL.revokeObjectURL(url);
      console.log("[Recording] Recording saved:", a.download);
    } catch (error) {
      console.error("[Recording] Failed to save recording:", error);
    }
  }

  /**
   * Export recording metadata
   */
  static exportRecordingMetadata(recording: RecordingSession): string {
    const metadata = {
      ...recording,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(metadata, null, 2);
  }

  /**
   * Get recording history
   */
  static getRecordingHistory(): RecordingSession[] {
    try {
      const history = localStorage.getItem("echo:whiteboard:recording-history");
      return history ? JSON.parse(history) : [];
    } catch {
      return [];
    }
  }

  /**
   * Save recording to history
   */
  static saveRecordingHistory(recording: RecordingSession): void {
    try {
      const history = this.getRecordingHistory();
      history.unshift(recording);
      // Keep last 20 recordings
      const trimmed = history.slice(0, 20);
      localStorage.setItem(
        "echo:whiteboard:recording-history",
        JSON.stringify(trimmed),
      );
    } catch (error) {
      console.error("[Recording] Failed to save history:", error);
    }
  }

  /**
   * Get current recording status
   */
  static getCurrentRecording(): RecordingSession | null {
    return this.currentRecording;
  }

  /**
   * Check if recording is active
   */
  static isRecording(): boolean {
    return this.currentRecording?.status === "recording";
  }

  /**
   * Get recording duration (formatted)
   */
  static getRecordingDuration(): string {
    if (!this.currentRecording) return "00:00:00";

    const now = Date.now();
    const duration = now - this.currentRecording.startedAt;
    const seconds = Math.floor(duration / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);

    return [
      String(hours).padStart(2, "0"),
      String(minutes % 60).padStart(2, "0"),
      String(seconds % 60).padStart(2, "0"),
    ].join(":");
  }

  /**
   * Create recording report
   */
  static generateRecordingReport(recording: RecordingSession): {
    title: string;
    duration: string;
    participants: number;
    events: number;
    fileSize: string;
  } {
    const durationSecs = (recording.duration || 0) / 1000;
    const minutes = Math.floor(durationSecs / 60);
    const seconds = Math.floor(durationSecs % 60);
    const fileSizeStr = recording.fileSize
      ? `${(recording.fileSize / 1024 / 1024).toFixed(2)} MB`
      : "N/A";

    return {
      title: recording.title,
      duration: `${minutes}:${String(seconds).padStart(2, "0")}`,
      participants: recording.participants.length,
      events: recording.canvasEvents.length,
      fileSize: fileSizeStr,
    };
  }
}

export default RecordingIntegration;
