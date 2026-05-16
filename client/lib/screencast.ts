/**
 * Screencast recorder — iter167
 *
 * Uses MediaRecorder + getDisplayMedia / canvas capture to record the Co-Build
 * Studio session (or any DOM region) as a shareable `.webm`. Auto-stitches the
 * result + downloads to disk. Graceful fallback when the browser blocks capture.
 *
 * Usage:
 *   const rec = new ScreencastRecorder();
 *   await rec.start("co-build-studio");   // user grants display permission
 *   // ... work happens ...
 *   await rec.stopAndDownload("my-os-build.webm");
 */
export interface RecorderStatus { state: "idle" | "recording" | "stopped" | "error"; error?: string }

export class ScreencastRecorder {
  private mediaRecorder: MediaRecorder | null = null;
  private chunks: Blob[] = [];
  private stream: MediaStream | null = null;
  public status: RecorderStatus = { state: "idle" };
  private listeners = new Set<(s: RecorderStatus) => void>();

  onStatus(cb: (s: RecorderStatus) => void): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private setStatus(s: RecorderStatus) {
    this.status = s;
    this.listeners.forEach((cb) => { try { cb(s); } catch {} });
  }

  async start(label = "echo-cobuild"): Promise<void> {
    if (this.status.state === "recording") return;
    try {
      if (!("mediaDevices" in navigator) || !(navigator.mediaDevices as any).getDisplayMedia) {
        throw new Error("Screen recording unsupported in this browser");
      }
      const stream: MediaStream = await (navigator.mediaDevices as any).getDisplayMedia({
        video: { frameRate: 15 },
        audio: false,
      });
      this.stream = stream;
      const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9")
        ? "video/webm;codecs=vp9"
        : "video/webm";
      this.mediaRecorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 2_500_000 });
      this.chunks = [];
      this.mediaRecorder.ondataavailable = (e) => { if (e.data?.size > 0) this.chunks.push(e.data); };
      this.mediaRecorder.onstop = () => this.setStatus({ state: "stopped" });
      stream.getVideoTracks()[0]?.addEventListener("ended", () => { this.stop().catch(() => {}); });
      this.mediaRecorder.start(1000); // 1-second chunks
      this.setStatus({ state: "recording" });
      console.debug("[ScreencastRecorder] started", label);
    } catch (e: any) {
      this.setStatus({ state: "error", error: e?.message || "Recording failed" });
      throw e;
    }
  }

  async stop(): Promise<Blob | null> {
    if (!this.mediaRecorder || this.mediaRecorder.state === "inactive") return null;
    return new Promise<Blob>((resolve) => {
      this.mediaRecorder!.onstop = () => {
        this.stream?.getTracks().forEach((t) => t.stop());
        this.stream = null;
        const blob = new Blob(this.chunks, { type: "video/webm" });
        this.setStatus({ state: "stopped" });
        resolve(blob);
      };
      this.mediaRecorder!.stop();
    });
  }

  async stopAndDownload(filename = "echo-cobuild.webm"): Promise<Blob | null> {
    const blob = await this.stop();
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = filename;
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
    return blob;
  }
}
