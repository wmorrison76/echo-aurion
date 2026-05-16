import React, { useState, useRef, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import type { VideoConferenceRecording } from "./types/VideoConferenceTypes";

const CAPTION_LANGUAGES = [
  { value: "en", label: "English" },
  { value: "es", label: "Spanish" },
  { value: "fr", label: "French" },
  { value: "de", label: "German" },
] as const;

const PLAYBACK_SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2] as const;

interface RecordingReplayViewProps {
  recording: VideoConferenceRecording;
  onClose: () => void;
  userId?: string;
}

function reportView(
  recordingId: string,
  payload: {
    progressPct?: number;
    lastPositionSec?: number;
    completedAt?: string;
    device?: string;
  },
  userId?: string
) {
  if (!userId) return;
  fetch(`/api/video-conference/recordings/${recordingId}/view`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...payload,
      device:
        typeof navigator !== "undefined"
          ? navigator.userAgent?.includes("Mobile")
            ? "mobile"
            : "desktop"
          : undefined,
    }),
  }).catch(() => {});
}

export const RecordingReplayView: React.FC<RecordingReplayViewProps> = ({
  recording,
  onClose,
  userId,
}) => {
  const meta = recording.metadata || {};
  const isTraining = meta.type === "training";
  const defaultCaptionLang =
    isTraining
      ? "en"
      : (meta.defaultCaptionLanguage as string) || "en";
  const [captionLanguage, setCaptionLanguage] = useState<string>(defaultCaptionLang);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const videoRef = useRef<HTMLVideoElement>(null);
  const captionsEn = (meta.captionsEn || meta.captions || "") as string;
  const captionsByLang = (meta.captionsByLanguage || {}) as Record<string, string>;
  const captionText =
    captionLanguage === "en"
      ? captionsEn
      : captionsByLang[captionLanguage] ||
        captionsEn ||
        "Transcript will appear here when available.";

  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;
    v.playbackRate = playbackRate;
  }, [playbackRate]);

  useEffect(() => {
    if (!recording.id || !userId) return;
    reportView(recording.id, { progressPct: 0, lastPositionSec: 0 }, userId);
    const interval = setInterval(() => {
      const v = videoRef.current;
      if (!v || v.readyState < 2) return;
      const pct = recording.durationSeconds
        ? Math.min(100, Math.round((v.currentTime / recording.durationSeconds) * 100))
        : 0;
      reportView(
        recording.id,
        { progressPct: pct, lastPositionSec: Math.round(v.currentTime) },
        userId
      );
    }, 15000);
    return () => {
      clearInterval(interval);
      const v = videoRef.current;
      const pct =
        v && recording.durationSeconds
          ? Math.min(100, Math.round((v.currentTime / recording.durationSeconds) * 100))
          : 0;
      reportView(
        recording.id,
        {
          progressPct: pct,
          lastPositionSec: v ? Math.round(v.currentTime) : 0,
          completedAt: pct >= 90 ? new Date().toISOString() : undefined,
        },
        userId
      );
    };
  }, [recording.id, recording.durationSeconds, userId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="flex flex-col w-full max-w-2xl max-h-[90vh] bg-background border border-border/30 rounded-lg overflow-hidden shadow-xl">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-border/30 bg-background/50">
          <h3 className="font-semibold text-foreground">
            Play recording {isTraining && "(Training)"}
          </h3>
          <Button size="sm" variant="ghost" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-hidden flex flex-col bg-black">
          {/* Video */}
          <div
            className="flex-1 min-h-[200px] flex items-center justify-center bg-black/80 text-white/70 text-sm"
            style={{ minHeight: "240px" }}
          >
            {recording.recordingUrl ? (
              <video
                ref={videoRef}
                src={recording.recordingUrl}
                controls
                className="w-full h-full max-h-[50vh] object-contain"
              />
            ) : (
              <span>Recording playback will appear here when URL is available.</span>
            )}
          </div>

          {/* Captions */}
          <div className="flex flex-col gap-2 p-3 bg-black/90 text-white border-t border-white/10">
            <div className="flex items-center justify-between gap-2">
              <label className="text-xs font-medium text-white/80">
                Caption language
              </label>
              <select
                value={captionLanguage}
                onChange={(e) => setCaptionLanguage(e.target.value)}
                className="rounded bg-white/10 text-white text-xs px-2 py-1.5 border border-white/20"
                aria-label="Caption language for replay"
              >
                {CAPTION_LANGUAGES.map(({ value, label }) => (
                  <option key={value} value={value}>
                    {label}
                    {value === defaultCaptionLang && " (default)"}
                  </option>
                ))}
              </select>
            </div>
            <p className="min-h-[2.5em] text-sm text-center text-white/90 px-2">
              {captionText}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
