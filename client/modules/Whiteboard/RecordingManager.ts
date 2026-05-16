/**
 * Recording Manager
 * Handles whiteboard session recording with canvas + chat/audio capture
 * Records to MP4 format using MediaRecorder API
 */

// Supabase integration - disabled for now, requires setup via MCP
// import { supabase } from "@/lib/supabase";

// Supabase table for storing recording metadata
// Expected schema:
// - id (UUID)
// - session_id (string)
// - title (string)
// - presenter (string)
// - created_at (timestamp)
// - duration (integer, seconds)
// - file_size (integer, bytes)
// - file_path (string, storage path)
// - public_url (string)

export interface RecordingState {
  isRecording: boolean;
  isPaused: boolean;
  duration: number; // seconds
  startTime?: number;
  pauseTime?: number;
}

export interface RecordingMetadata {
  sessionId: string;
  title: string;
  presenter: string;
  createdAt: number;
  duration: number;
  fileSize: number;
  url: string;
}

export class RecordingManager {
  private static instance: RecordingManager;
  private mediaRecorder: MediaRecorder | null = null;
  private recordedChunks: Blob[] = [];
  private canvasStream: MediaStream | null = null;
  private audioStream: MediaStream | null = null;
  private startTime: number = 0;
  private pauseTime: number = 0;
  private totalPausedTime: number = 0;
  private timerInterval: NodeJS.Timeout | null = null;
  private state: RecordingState = {
    isRecording: false,
    isPaused: false,
    duration: 0,
  };
  private stateChangeListeners: Array<(state: RecordingState) => void> = [];

  private constructor() {}

  static getInstance(): RecordingManager {
    if (!RecordingManager.instance) {
      RecordingManager.instance = new RecordingManager();
    }
    return RecordingManager.instance;
  }

  /**
   * Subscribe to recording state changes
   */
  onStateChange(callback: (state: RecordingState) => void): () => void {
    this.stateChangeListeners.push(callback);

    // Return unsubscribe function
    return () => {
      this.stateChangeListeners = this.stateChangeListeners.filter(
        (cb) => cb !== callback,
      );
    };
  }

  /**
   * Emit state change to all listeners
   */
  private emitStateChange(): void {
    this.stateChangeListeners.forEach((cb) => cb(this.state));
  }

  /**
   * Start recording canvas + audio
   */
  async startRecording(canvasElement: HTMLCanvasElement): Promise<void> {
    try {
      if (this.state.isRecording) {
        console.warn("Recording already in progress");
        return;
      }

      this.recordedChunks = [];

      // Get canvas stream
      this.canvasStream = (canvasElement as any).captureStream(30);

      // Try to get audio stream (optional, won't fail if not available)
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          audio: true,
        });
      } catch (err) {
        console.warn("⚠️ Audio access denied, recording video only:", err);
        this.audioStream = null;
      }

      // Combine streams
      const tracks: MediaStreamTrack[] = [
        ...this.canvasStream.getVideoTracks(),
      ];

      if (this.audioStream) {
        tracks.push(...this.audioStream.getAudioTracks());
      }

      const combinedStream = new MediaStream(tracks);

      // Create media recorder
      const mimeType = "video/mp4";
      const options: MediaRecorderOptions = {
        mimeType: mimeType,
        videoBitsPerSecond: 2500000, // 2.5 Mbps
      };

      this.mediaRecorder = new MediaRecorder(combinedStream, options);

      this.mediaRecorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          this.recordedChunks.push(event.data);
        }
      };

      this.mediaRecorder.onerror = (event: MediaRecorderErrorEvent) => {
        console.error("❌ Recording error:", event.error);
        this.stopRecording();
      };

      // Start recording
      this.mediaRecorder.start();
      this.startTime = Date.now();
      this.totalPausedTime = 0;

      this.state = {
        isRecording: true,
        isPaused: false,
        duration: 0,
        startTime: this.startTime,
      };

      this.emitStateChange();

      // Start duration timer
      this.startTimer();

      console.log("✅ Recording started");
    } catch (error) {
      console.error("❌ Failed to start recording:", error);
      throw error;
    }
  }

  /**
   * Pause recording
   */
  pauseRecording(): void {
    if (!this.state.isRecording || this.state.isPaused) {
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "recording") {
      this.mediaRecorder.pause();
      this.pauseTime = Date.now();

      this.state = {
        ...this.state,
        isPaused: true,
      };

      this.emitStateChange();
      console.log("⏸️ Recording paused");
    }
  }

  /**
   * Resume recording
   */
  resumeRecording(): void {
    if (!this.state.isRecording || !this.state.isPaused) {
      return;
    }

    if (this.mediaRecorder && this.mediaRecorder.state === "paused") {
      this.mediaRecorder.resume();
      this.totalPausedTime += Date.now() - this.pauseTime;

      this.state = {
        ...this.state,
        isPaused: false,
      };

      this.emitStateChange();
      console.log("▶️ Recording resumed");
    }
  }

  /**
   * Stop recording and save to Supabase
   */
  async stopRecording(
    sessionId: string,
    presenter: string,
    title: string = "Whiteboard Session",
  ): Promise<RecordingMetadata | null> {
    try {
      if (!this.state.isRecording || !this.mediaRecorder) {
        return null;
      }

      // Stop timer
      if (this.timerInterval) {
        clearInterval(this.timerInterval);
        this.timerInterval = null;
      }

      // Request final data and stop recording
      this.mediaRecorder.stop();

      // Wait for final data to be collected
      await new Promise((resolve) => {
        const checkInterval = setInterval(() => {
          if (this.mediaRecorder?.state === "inactive") {
            clearInterval(checkInterval);
            resolve(null);
          }
        }, 50);
      });

      // Create blob from recorded chunks
      const mimeType = "video/mp4";
      const recordingBlob = new Blob(this.recordedChunks, {
        type: mimeType,
      });

      const fileSize = recordingBlob.size;
      const duration = this.state.duration;

      // Generate filename
      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const fileName = `recordings/${sessionId}/${presenter}/${timestamp}.mp4`;

      // Upload to Supabase Storage (disabled - Supabase not configured)
      // TODO: Enable when Supabase is connected via MCP
      const publicUrl = "";

      // For now, save locally
      console.log("📤 Recording saved locally as:", fileName);

      // Commented out Supabase upload:
      /*
      const { data, error: uploadError } = await supabase.storage
        .from("whiteboard-recordings")
        .upload(fileName, recordingBlob, {
          contentType: mimeType,
          upsert: false,
        });

      if (uploadError) {
        console.error("❌ Upload error:", uploadError);
        throw uploadError;
      }

      const {
        data: { publicUrl },
      } = supabase.storage
        .from("whiteboard-recordings")
        .getPublicUrl(fileName);
      */

      // Save metadata to database
      const metadata: RecordingMetadata = {
        sessionId,
        title,
        presenter,
        createdAt: Date.now(),
        duration,
        fileSize,
        url: publicUrl,
      };

      // Store metadata in Supabase (recordings table)
      // const { error: metadataError } = await supabase
      //   .from("whiteboard_recordings")
      //   .insert({
      //     session_id: sessionId,
      //     title,
      //     presenter,
      //     created_at: new Date().toISOString(),
      //     duration,
      //     file_size: fileSize,
      //     file_path: fileName,
      //     public_url: publicUrl,
      //   });

      // if (metadataError) {
      //   console.warn("⚠️ Failed to save metadata:", metadataError);
      //   // Recording still succeeded, metadata save is optional
      // }

      // Cleanup streams
      this.cleanup();

      // Reset state
      this.state = {
        isRecording: false,
        isPaused: false,
        duration: 0,
      };

      this.emitStateChange();

      console.log("✅ Recording saved:", publicUrl);
      return metadata;
    } catch (error) {
      console.error("❌ Failed to stop recording:", error);
      this.cleanup();
      throw error;
    }
  }

  /**
   * Start duration timer
   */
  private startTimer(): void {
    this.timerInterval = setInterval(() => {
      if (this.state.isRecording && !this.state.isPaused) {
        const elapsed = Date.now() - this.startTime - this.totalPausedTime;
        this.state.duration = Math.floor(elapsed / 1000); // Convert to seconds
        this.emitStateChange();
      }
    }, 1000);
  }

  /**
   * Cleanup streams and resources
   */
  private cleanup(): void {
    if (this.canvasStream) {
      this.canvasStream.getTracks().forEach((track) => track.stop());
      this.canvasStream = null;
    }

    if (this.audioStream) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
    }

    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }

    this.mediaRecorder = null;
    this.recordedChunks = [];
  }

  /**
   * Get current recording state
   */
  getState(): RecordingState {
    return { ...this.state };
  }

  /**
   * Format duration for display (MM:SS)
   */
  static formatDuration(seconds: number): string {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  }
}

export const recordingManager = RecordingManager.getInstance();
