/**
 * VoiceCaptureButton (D2)
 *
 * Big tappable mic button with three modes:
 *
 *   - **Tap to toggle** (default): tap once → record → tap again → upload.
 *     Best for walking the shelves with one hand on the phone.
 *   - **Hold to talk**: pointer-down → record → pointer-up → upload.
 *     Better for short corrections ("scratch that, only five").
 *
 * Reports state visually (idle / recording / uploading / done / error)
 * and exposes the parsed transcript through the onTranscript callback.
 *
 * The component does NOT parse the transcript — that happens in the
 * caller, which has access to the outlet's items and locations and runs
 * parseVoiceInput() from the existing voice-nlp.ts library.
 */

import React, { useEffect } from "react";
import { Mic, Square, Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { useVoiceCapture, type VoiceCaptureState } from "../../hooks/useVoiceCapture";

export interface VoiceCaptureButtonProps {
  mode?: "toggle" | "hold";
  onTranscript: (transcript: string) => void;
  onError?: (message: string) => void;
  /** Optional label override. Defaults vary by mode. */
  label?: string;
  className?: string;
}

const stateLabel: Record<VoiceCaptureState, string> = {
  idle: "Tap to speak",
  "requesting-permission": "Requesting mic…",
  recording: "Listening — tap to finish",
  uploading: "Transcribing…",
  done: "Got it ✓",
  error: "Try again",
};

const stateColor: Record<VoiceCaptureState, string> = {
  idle: "bg-amber-500 hover:bg-amber-600 text-white",
  "requesting-permission": "bg-amber-400 text-white",
  recording: "bg-red-500 text-white animate-pulse",
  uploading: "bg-amber-400 text-white",
  done: "bg-green-500 text-white",
  error: "bg-gray-400 text-white",
};

export function VoiceCaptureButton({
  mode = "toggle",
  onTranscript,
  onError,
  label,
  className,
}: VoiceCaptureButtonProps) {
  const { state, transcript, error, busy, bytes, start, stop, reset } = useVoiceCapture();

  // Surface transcript to the caller exactly once per capture.
  useEffect(() => {
    if (state === "done" && transcript) {
      onTranscript(transcript);
    }
  }, [state, transcript, onTranscript]);

  // Surface errors.
  useEffect(() => {
    if (state === "error" && error) {
      onError?.(error);
    }
  }, [state, error, onError]);

  const handleClick = () => {
    if (mode === "toggle") {
      if (state === "recording") {
        void stop();
      } else if (state === "idle" || state === "done" || state === "error") {
        if (state !== "idle") reset();
        void start();
      }
    }
  };

  const handlePointerDown = () => {
    if (mode === "hold" && (state === "idle" || state === "done" || state === "error")) {
      if (state !== "idle") reset();
      void start();
    }
  };
  const handlePointerUp = () => {
    if (mode === "hold" && state === "recording") {
      void stop();
    }
  };

  const Icon = state === "recording" ? Square
    : state === "uploading" || state === "requesting-permission" ? Loader2
    : state === "error" ? AlertCircle
    : state === "done" ? CheckCircle2
    : Mic;

  return (
    <div className={className}>
      <button
        type="button"
        aria-label={label ?? stateLabel[state]}
        aria-pressed={state === "recording"}
        disabled={state === "uploading" || state === "requesting-permission"}
        onClick={mode === "toggle" ? handleClick : undefined}
        onPointerDown={mode === "hold" ? handlePointerDown : undefined}
        onPointerUp={mode === "hold" ? handlePointerUp : undefined}
        onPointerLeave={mode === "hold" ? handlePointerUp : undefined}
        className={`
          flex items-center justify-center gap-3 w-full
          rounded-xl px-6 py-5 text-lg font-semibold transition-colors
          shadow-md disabled:opacity-60
          ${stateColor[state]}
        `}
      >
        <Icon
          className={`w-7 h-7 ${state === "uploading" || state === "requesting-permission" ? "animate-spin" : ""}`}
          aria-hidden
        />
        <span>{label ?? stateLabel[state]}</span>
      </button>

      {state === "recording" && bytes > 0 && (
        <div className="mt-2 text-xs text-center text-gray-600">
          recording — {(bytes / 1024).toFixed(1)} KB captured
        </div>
      )}

      {state === "error" && error && (
        <div className="mt-2 text-xs text-center text-red-600">
          {error}
        </div>
      )}

      {transcript && state === "done" && (
        <div className="mt-3 rounded-lg bg-gray-50 border border-gray-200 px-3 py-2 text-sm text-gray-800">
          <span className="text-xs uppercase tracking-wider text-gray-500 block mb-1">
            Heard
          </span>
          “{transcript}”
        </div>
      )}
    </div>
  );
}
