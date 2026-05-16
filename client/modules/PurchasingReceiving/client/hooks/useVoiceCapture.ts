/**
 * useVoiceCapture (D2) — browser audio capture + Whisper transcription.
 *
 * Wraps the MediaRecorder API and the /api/voice/transcribe endpoint
 * (D2 server-side) so the inventory voice-count UI gets a single
 * imperative `start()` / `stop()` interface plus reactive state.
 *
 * Usage:
 *   const { state, transcript, error, start, stop, reset } = useVoiceCapture();
 *   <button onPointerDown={start} onPointerUp={stop}>Hold to talk</button>
 *
 * State machine:
 *   idle → requesting-permission → recording → uploading → done | error
 *
 * Permission failure, missing OPENAI_API_KEY (503 from server), and
 * MediaRecorder unavailability all surface as `error` with a message
 * the UI can show. The caller should fall back to manual entry in any
 * error state.
 */

import { useCallback, useRef, useState } from "react";

export type VoiceCaptureState =
  | "idle"
  | "requesting-permission"
  | "recording"
  | "uploading"
  | "done"
  | "error";

export interface UseVoiceCaptureResult {
  state: VoiceCaptureState;
  transcript: string;
  error: string | null;
  /** Truthy while recording or uploading. Useful for disabling other inputs. */
  busy: boolean;
  /** Bytes captured so far (during recording) or last upload size. */
  bytes: number;
  /** Begin capture. Resolves once the mic stream is open and recording starts. */
  start: () => Promise<void>;
  /** Stop capture, upload to /api/voice/transcribe, populate transcript. */
  stop: () => Promise<void>;
  /** Reset to idle — clears transcript and error. */
  reset: () => void;
}

const TRANSCRIBE_URL = "/api/voice/transcribe";

export function useVoiceCapture(): UseVoiceCaptureResult {
  const [state, setState] = useState<VoiceCaptureState>("idle");
  const [transcript, setTranscript] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [bytes, setBytes] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      for (const track of streamRef.current.getTracks()) track.stop();
      streamRef.current = null;
    }
    mediaRecorderRef.current = null;
  }, []);

  const start = useCallback(async () => {
    setError(null);
    setTranscript("");
    setBytes(0);
    chunksRef.current = [];

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setError("Microphone capture not supported in this browser");
      setState("error");
      return;
    }
    if (typeof MediaRecorder === "undefined") {
      setError("MediaRecorder not supported in this browser");
      setState("error");
      return;
    }

    setState("requesting-permission");
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Microphone permission denied");
      setState("error");
      return;
    }
    streamRef.current = stream;

    // Pick a mime the browser supports + Whisper accepts.
    const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
    const mime = candidates.find(
      (m) => typeof MediaRecorder !== "undefined" && (MediaRecorder as any).isTypeSupported?.(m),
    );
    let recorder: MediaRecorder;
    try {
      recorder = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
    } catch (err) {
      cleanupStream();
      setError(err instanceof Error ? err.message : "MediaRecorder construction failed");
      setState("error");
      return;
    }
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (ev) => {
      if (ev.data && ev.data.size > 0) {
        chunksRef.current.push(ev.data);
        setBytes((prev) => prev + ev.data.size);
      }
    };
    recorder.start(250); // emit chunks every 250ms so the byte counter is live
    setState("recording");
  }, [cleanupStream]);

  const stop = useCallback(async () => {
    const recorder = mediaRecorderRef.current;
    if (!recorder || recorder.state === "inactive") {
      // Nothing recording — just go back to idle.
      cleanupStream();
      if (state !== "error") setState("idle");
      return;
    }

    // Wait for the recorder's final 'stop' event before assembling the blob.
    const stopped = new Promise<void>((resolve) => {
      recorder.addEventListener("stop", () => resolve(), { once: true });
    });
    recorder.stop();
    cleanupStream();
    await stopped;

    setState("uploading");
    const audioBlob = new Blob(chunksRef.current, {
      type: recorder.mimeType || "audio/webm",
    });
    if (audioBlob.size === 0) {
      setError("No audio captured");
      setState("error");
      return;
    }

    const ext = (recorder.mimeType || "").includes("mp4") ? "mp4" : "webm";
    const form = new FormData();
    form.append("audio", audioBlob, `inventory-voice.${ext}`);

    try {
      const resp = await fetch(TRANSCRIBE_URL, {
        method: "POST",
        body: form,
        credentials: "include",
      });
      const json = await resp.json().catch(() => ({}));
      if (!resp.ok || json.success === false) {
        setError(json.error || `Transcription failed (${resp.status})`);
        setState("error");
        return;
      }
      setTranscript(json.transcript ?? "");
      setState("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Network error during transcription");
      setState("error");
    }
  }, [cleanupStream, state]);

  const reset = useCallback(() => {
    cleanupStream();
    setError(null);
    setTranscript("");
    setBytes(0);
    setState("idle");
    chunksRef.current = [];
  }, [cleanupStream]);

  const busy = state === "recording" || state === "uploading" || state === "requesting-permission";

  return { state, transcript, error, busy, bytes, start, stop, reset };
}
