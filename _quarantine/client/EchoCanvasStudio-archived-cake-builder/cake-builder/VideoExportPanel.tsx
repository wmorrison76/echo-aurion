/**
 * Video Export Panel
 * UI for exporting cake design animations as video
 */

import React, { useState, useRef } from "react";
import { Download, AlertCircle, Loader } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getRecommendedExportOptions,
  validateExportOptions,
  VIDEO_QUALITY_PRESETS,
  AnimationFrameCapturer,
  type VideoExportOptions,
  type VideoExportProgress,
} from "@/lib/video-export-service";

interface VideoExportPanelProps {
  canvas: HTMLCanvasElement | null;
  animationDuration?: number;
  onExportStart?: () => void;
  onExportComplete?: (blob: Blob, filename: string) => void;
  onExportError?: (error: Error) => void;
  isAnimating?: boolean;
  animationProgress?: number;
}

export default function VideoExportPanel({
  canvas,
  animationDuration = 10000,
  onExportStart,
  onExportComplete,
  onExportError,
  isAnimating = false,
  animationProgress = 0,
}: VideoExportPanelProps) {
  const [options, setOptions] = useState<VideoExportOptions>(
    getRecommendedExportOptions(animationDuration),
  );

  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<VideoExportProgress>({
    status: "idle",
    currentFrame: 0,
    totalFrames: 0,
    progress: 0,
    message: "Ready to export",
  });

  const [errors, setErrors] = useState<string[]>([]);
  const exportRef = useRef<AnimationFrameCapturer | null>(null);

  // Validate and update options
  const handleOptionsChange = (field: keyof VideoExportOptions, value: any) => {
    const newOptions = { ...options, [field]: value };
    const validation = validateExportOptions(newOptions);

    if (validation.valid) {
      setOptions(newOptions);
      setErrors([]);
    } else {
      setErrors(validation.errors);
    }
  };

  // Apply quality preset
  const applyQualityPreset = (quality: "low" | "medium" | "high") => {
    const preset = VIDEO_QUALITY_PRESETS[quality];
    const newOptions = {
      ...options,
      quality,
      fps: preset.fps,
      bitrate: preset.bitrate,
    };

    const validation = validateExportOptions(newOptions);
    if (validation.valid) {
      setOptions(newOptions);
      setErrors([]);
    } else {
      setErrors(validation.errors);
    }
  };

  // Export video
  const handleExportVideo = async () => {
    if (!canvas) {
      setErrors(["Canvas not available"]);
      return;
    }

    const validation = validateExportOptions(options);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }

    setIsExporting(true);
    setErrors([]);
    onExportStart?.();

    try {
      const capturer = new AnimationFrameCapturer(canvas, options);
      exportRef.current = capturer;

      // Mock animation function - in real scenario, this would be connected to the actual animation
      const animationFn = (progress: number) => {
        // This function would be connected to the actual cake animation
        // For now, it's a placeholder
      };

      setExportProgress({
        status: "capturing",
        currentFrame: 0,
        totalFrames: Math.ceil((options.duration / 1000) * options.fps),
        progress: 0,
        message: "Starting video capture...",
      });

      const blob = await capturer.captureAnimation(animationFn, (progress) => {
        setExportProgress(progress);
      });

      const filename = `cake-animation-${Date.now()}.webm`;
      onExportComplete?.(blob, filename);

      // Auto-download
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename;
      link.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error));
      setErrors([err.message]);
      onExportError?.(err);
      setExportProgress({
        status: "failed",
        currentFrame: 0,
        totalFrames: 0,
        progress: 0,
        message: `Export failed: ${err.message}`,
      });
    } finally {
      setIsExporting(false);
    }
  };

  // Cancel export
  const handleCancelExport = () => {
    if (exportRef.current) {
      exportRef.current.stopCapturing();
    }
    setIsExporting(false);
    setExportProgress({
      status: "idle",
      currentFrame: 0,
      totalFrames: 0,
      progress: 0,
      message: "Export cancelled",
    });
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        padding: "16px",
        backgroundColor: "#1a1a1a",
        borderRadius: "8px",
        border: "1px solid #333",
      }}
    >
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
        <h3
          style={{
            color: "#00f0ff",
            fontSize: "14px",
            fontWeight: "bold",
            margin: 0,
          }}
        >
          🎬 Video Export
        </h3>
      </div>

      {/* Quality Presets */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Quality Preset
        </label>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr 1fr",
            gap: "8px",
          }}
        >
          {(["low", "medium", "high"] as const).map((quality) => (
            <button
              key={quality}
              onClick={() => applyQualityPreset(quality)}
              style={{
                padding: "8px",
                backgroundColor:
                  options.quality === quality ? "#00f0ff" : "#222",
                color: options.quality === quality ? "#000" : "#aaa",
                border: "1px solid #333",
                borderRadius: "4px",
                cursor: "pointer",
                fontWeight: options.quality === quality ? "bold" : "normal",
                fontSize: "12px",
              }}
            >
              {quality.charAt(0).toUpperCase() + quality.slice(1)} (
              {VIDEO_QUALITY_PRESETS[quality].fps}fps)
            </button>
          ))}
        </div>
      </div>

      {/* Resolution */}
      <div
        style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}
      >
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              color: "#aaa",
              fontSize: "12px",
              fontWeight: "500",
              textTransform: "uppercase",
            }}
          >
            Width: {options.width}px
          </label>
          <Slider
            defaultValue={[options.width]}
            min={256}
            max={4096}
            step={256}
            onValueChange={(value) => handleOptionsChange("width", value[0])}
            style={{ width: "100%" }}
          />
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <label
            style={{
              color: "#aaa",
              fontSize: "12px",
              fontWeight: "500",
              textTransform: "uppercase",
            }}
          >
            Height: {options.height}px
          </label>
          <Slider
            defaultValue={[options.height]}
            min={256}
            max={4096}
            step={256}
            onValueChange={(value) => handleOptionsChange("height", value[0])}
            style={{ width: "100%" }}
          />
        </div>
      </div>

      {/* FPS */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Frame Rate: {options.fps} fps
        </label>
        <Slider
          defaultValue={[options.fps]}
          min={12}
          max={60}
          step={6}
          onValueChange={(value) => handleOptionsChange("fps", value[0])}
          style={{ width: "100%" }}
        />
      </div>

      {/* Duration */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Duration: {(options.duration / 1000).toFixed(1)}s
        </label>
        <Slider
          defaultValue={[options.duration / 1000]}
          min={1}
          max={60}
          step={1}
          onValueChange={(value) =>
            handleOptionsChange("duration", value[0] * 1000)
          }
          style={{ width: "100%" }}
        />
      </div>

      {/* Format */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <label
          style={{
            color: "#aaa",
            fontSize: "12px",
            fontWeight: "500",
            textTransform: "uppercase",
          }}
        >
          Format
        </label>
        <Select
          value={options.format}
          onValueChange={(v) => handleOptionsChange("format", v as any)}
        >
          <SelectTrigger
            style={{
              backgroundColor: "#222",
              border: "1px solid #333",
              color: "#fff",
              padding: "8px 12px",
              borderRadius: "4px",
            }}
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="webm">WebM (Recommended)</SelectItem>
            <SelectItem value="mp4">MP4 (Server required)</SelectItem>
            <SelectItem value="gif">GIF (Coming soon)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Estimated File Size */}
      <div
        style={{
          backgroundColor: "#222",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "12px",
          fontSize: "12px",
          color: "#aaa",
        }}
      >
        <div>
          <strong>Estimated File Size:</strong>{" "}
          {options.bitrate
            ? (
                ((options.duration / 1000) * (options.bitrate / 8)) /
                1024 /
                1024
              ).toFixed(1)
            : "0"}
          MB
        </div>
        <div style={{ marginTop: "4px", fontSize: "11px", color: "#888" }}>
          Total Frames: {Math.ceil((options.duration / 1000) * options.fps)}
        </div>
      </div>

      {/* Errors */}
      {errors.length > 0 && (
        <div
          style={{
            backgroundColor: "#300",
            border: "1px solid #900",
            borderRadius: "8px",
            padding: "12px",
            display: "flex",
            gap: "8px",
            alignItems: "flex-start",
          }}
        >
          <AlertCircle size={16} color="#f99" style={{ flexShrink: 0 }} />
          <div>
            <div
              style={{ color: "#f99", fontWeight: "bold", fontSize: "12px" }}
            >
              Validation Errors:
            </div>
            {errors.map((error, i) => (
              <div
                key={i}
                style={{ color: "#f99", fontSize: "11px", marginTop: "4px" }}
              >
                • {error}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Export Progress */}
      {isExporting && (
        <div
          style={{
            backgroundColor: "#1a1a1a",
            border: "1px solid #333",
            borderRadius: "8px",
            padding: "16px",
            display: "flex",
            flexDirection: "column",
            gap: "12px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <Loader
              size={16}
              style={{ animation: "spin 1s linear infinite" }}
              color="#00f0ff"
            />
            <span style={{ color: "#aaa", fontSize: "12px", flex: 1 }}>
              {exportProgress.message}
            </span>
          </div>

          {/* Progress Bar */}
          <div
            style={{
              width: "100%",
              height: "8px",
              backgroundColor: "#333",
              borderRadius: "4px",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${exportProgress.progress}%`,
                backgroundColor: "#00f0ff",
                transition: "width 0.3s",
              }}
            />
          </div>

          {/* Frame count */}
          <div
            style={{
              fontSize: "11px",
              color: "#888",
              textAlign: "center",
            }}
          >
            {exportProgress.currentFrame} / {exportProgress.totalFrames} frames
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "8px",
        }}
      >
        {isExporting ? (
          <Button
            onClick={handleCancelExport}
            style={{
              gridColumn: "1 / -1",
              backgroundColor: "#900",
              color: "#fff",
              border: "1px solid #c00",
              padding: "10px 16px",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "12px",
              fontWeight: "bold",
            }}
          >
            Cancel Export
          </Button>
        ) : (
          <>
            <Button
              disabled={!canvas || errors.length > 0}
              style={{
                gridColumn: "1 / -1",
                backgroundColor:
                  !canvas || errors.length > 0 ? "#333" : "#00f0ff",
                color: !canvas || errors.length > 0 ? "#666" : "#000",
                border: "1px solid #00f0ff",
                padding: "12px 16px",
                borderRadius: "4px",
                cursor:
                  !canvas || errors.length > 0 ? "not-allowed" : "pointer",
                fontSize: "12px",
                fontWeight: "bold",
              }}
              onClick={handleExportVideo}
            >
              <Download size={14} />
              Export Video
            </Button>
          </>
        )}
      </div>

      {/* Info */}
      <div
        style={{
          backgroundColor: "#222",
          border: "1px solid #333",
          borderRadius: "4px",
          padding: "12px",
          fontSize: "11px",
          color: "#888",
        }}
      >
        <strong>Note:</strong> Video export captures the current animation
        timeline. Lower quality settings produce smaller files but reduced
        visual fidelity.
      </div>

      <style>
        {`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
}
