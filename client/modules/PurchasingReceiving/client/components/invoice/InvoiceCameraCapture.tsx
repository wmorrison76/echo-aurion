import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import jsQR from "jsqr";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { logger } from "@/lib/logger";
interface InvoiceCameraCaptureProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCapture: (files: File[]) => void;
  onScanCode?: (code: string) => Promise<boolean> | boolean;
  hideGallery?: boolean;
}
type FacingMode = "environment" | "user";
interface CapturedFrame {
  blob: Blob;
  previewUrl: string;
  timestamp: number;
  status: "scanning" | "processing" | "ready";
  message: string;
}
export function InvoiceCameraCapture({
  open,
  onOpenChange,
  onCapture,
  onScanCode,
  hideGallery = false,
}: InvoiceCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const openRef = useRef(open);
  const isMobile = useIsMobile();
  const [initializing, setInitializing] = useState(false);
  const [streamReady, setStreamReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<FacingMode>("environment");
  const [captured, setCaptured] = useState<CapturedFrame[]>([]);
  const [shutterActive, setShutterActive] = useState(false);
  const [autoCountdown, setAutoCountdown] = useState<number | null>(null);
  const releasePreview = useCallback((url: string) => {
    try {
      URL.revokeObjectURL(url);
    } catch {}
  }, []);
  const capturedRef = useRef<CapturedFrame[]>([]);
  useEffect(() => {
    capturedRef.current = captured;
  }, [captured]);
  useEffect(() => {
    openRef.current = open;
  }, [open]);
  const updateFrame = useCallback(
    (timestamp: number, patch: Partial<CapturedFrame>) => {
      setCaptured((prev) =>
        prev.map((frame) =>
          frame.timestamp === timestamp ? { ...frame, ...patch } : frame,
        ),
      );
    },
    [],
  );
  const scheduleFrameProgress = useCallback(
    (
      timestamp: number,
      overrides?: { processing?: string; ready?: string },
    ) => {
      setTimeout(() => {
        updateFrame(timestamp, {
          status: "processing",
          message: overrides?.processing ?? "Image processing…",
        });
      }, 450);
      setTimeout(() => {
        updateFrame(timestamp, {
          status: "ready",
          message: overrides?.ready ?? "Ready to upload",
        });
      }, 1150);
    },
    [updateFrame],
  );
  const clearCaptured = useCallback(() => {
    setCaptured((prev) => {
      prev.forEach((frame) => releasePreview(frame.previewUrl));
      return [];
    });
  }, [releasePreview]);
  useEffect(() => {
    return () => {
      capturedRef.current.forEach((frame) => releasePreview(frame.previewUrl));
    };
  }, [releasePreview]);
  const stopStream = useCallback(() => {
    const stream = streamRef.current;
    if (stream) {
      stream.getTracks().forEach((track) => {
        try {
          track.stop();
        } catch {}
      });
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setStreamReady(false);
  }, []);
  const waitForVideoMetadata = useCallback((video: HTMLVideoElement) => {
    if (video.readyState >= HTMLMediaElement.HAVE_METADATA) {
      return Promise.resolve();
    }
    return new Promise<void>((resolve, reject) => {
      const handleLoaded = () => {
        cleanup();
        resolve();
      };
      const handleError = () => {
        cleanup();
        reject(new Error("Camera feed error"));
      };
      const cleanup = () => {
        video.removeEventListener("loadedmetadata", handleLoaded);
        video.removeEventListener("error", handleError);
      };
      video.addEventListener("loadedmetadata", handleLoaded, { once: true });
      video.addEventListener("error", handleError, { once: true });
    });
  }, []);
  const startStream = useCallback(
    async (mode: FacingMode) => {
      if (
        typeof navigator === "undefined" ||
        !navigator.mediaDevices?.getUserMedia
      ) {
        setError("Camera not supported on this device.");
        return false;
      }
      setInitializing(true);
      setStreamReady(false);
      setError(null);
      setAutoCountdown(null);
      stopStream();
      try {
        const constraintSets: MediaStreamConstraints[] = [
          {
            video: {
              facingMode: { ideal: mode },
              width: { ideal: isMobile ? 1920 : 1280 },
              height: { ideal: isMobile ? 1080 : 720 },
              aspectRatio: 3 / 4,
            },
            audio: false,
          },
          {
            video: {
              facingMode: { ideal: mode },
              width: { ideal: 1280 },
              height: { ideal: 720 },
            },
            audio: false,
          },
          { video: { facingMode: mode }, audio: false },
          { video: true, audio: false },
        ];
        let stream: MediaStream | null = null;
        let lastError: unknown = null;
        for (const constraints of constraintSets) {
          try {
            stream = await navigator.mediaDevices.getUserMedia(constraints);
            break;
          } catch (err) {
            lastError = err;
          }
        }
        if (!stream) {
          logger.error(lastError);
          setError(
            "Unable to access the camera. Please verify permissions and close other apps using the camera.",
          );
          return false;
        }
        const video = videoRef.current;
        streamRef.current = stream;
        if (!video) {
          setError("Camera preview unavailable.");
          stopStream();
          return false;
        }
        video.srcObject = stream;
        try {
          const metadataPromise = waitForVideoMetadata(video);
          await Promise.all([
            video.play().catch(() => undefined),
            metadataPromise,
          ]);
        } catch (err) {
          logger.error(
            "Unable to start camera preview",
            err instanceof Error ? err : undefined,
          );
          setError("Unable to start camera preview. Please try again.");
          stopStream();
          return false;
        }
        if (!openRef.current) {
          stopStream();
          return false;
        }
        setStreamReady(true);
        return true;
      } finally {
        setInitializing(false);
      }
    },
    [stopStream, waitForVideoMetadata, isMobile],
  );
  useEffect(() => {
    if (!open) {
      stopStream();
      clearCaptured();
      setStreamReady(false);
      setAutoCountdown(null);
      setError(null);
      return;
    }
    const preferredFacing = isMobile ? "environment" : "user";
    setFacingMode((prev) =>
      prev === preferredFacing ? prev : preferredFacing,
    );
    clearCaptured();
    setError(null);
    setAutoCountdown(null);
    return () => {
      stopStream();
      setAutoCountdown(null);
    };
  }, [open, isMobile, stopStream, clearCaptured]);
  const handleCapture = useCallback(async () => {
    const video = videoRef.current;
    const canvas = canvasRef.current;
    if (!video || !canvas) return;
    if (!streamReady) {
      setError(
        "Camera is still initializing. Please wait for the live preview.",
      );
      return;
    }
    const width = video.videoWidth || video.clientWidth;
    const height = video.videoHeight || video.clientHeight;
    if (!width || !height) {
      setError("Camera is still initializing. Please try again.");
      return;
    }
    const context = canvas.getContext("2d");
    if (!context) {
      setError("Unable to capture frame. Canvas context unavailable.");
      return;
    }
    canvas.width = width;
    canvas.height = height;
    context.drawImage(video, 0, 0, width, height);
    setShutterActive(true);
    setTimeout(() => setShutterActive(false), 120);
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob((value) => resolve(value), "image/jpeg", 0.95),
    );
    if (!blob) {
      setError("Failed to capture image from camera.");
      return;
    }
    const previewUrl = URL.createObjectURL(blob);
    const timestamp = Date.now();
    setCaptured((prev) => [
      ...prev,
      {
        blob,
        previewUrl,
        timestamp,
        status: "scanning",
        message: onScanCode ? "Detecting barcode…" : "Scanning surface…",
      },
    ]);
    setAutoCountdown(null);
    if (onScanCode) {
      (async () => {
        try {
          const imageData = context.getImageData(0, 0, width, height);
          const result = jsQR(imageData.data, width, height, {
            inversionAttempts: "attemptBoth",
          });
          if (result?.data) {
            updateFrame(timestamp, {
              status: "processing",
              message: "Validating code…",
            });
            const valid = await Promise.resolve(onScanCode(result.data.trim()));
            updateFrame(timestamp, {
              status: "ready",
              message: valid ? "Barcode valid" : "Barcode mismatch",
            });
          } else {
            updateFrame(timestamp, {
              status: "ready",
              message: "No barcode detected",
            });
          }
        } catch (scanError) {
          logger.error(scanError);
          updateFrame(timestamp, { status: "ready", message: "Scan error" });
        }
      })();
      return;
    }
    scheduleFrameProgress(timestamp);
  }, [onScanCode, scheduleFrameProgress, streamReady, updateFrame]);
  useEffect(() => {
    if (!open || initializing || !streamReady) return;
    if (capturedRef.current.length > 0) return;
    const countdownStart = 3;
    setAutoCountdown(countdownStart);
    const interval = window.setInterval(() => {
      setAutoCountdown((prev) => {
        if (prev === null) return prev;
        if (prev <= 1) {
          window.clearInterval(interval);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
    const timer = window.setTimeout(() => {
      if (capturedRef.current.length === 0) {
        void handleCapture();
      }
    }, countdownStart * 1000);
    return () => {
      window.clearInterval(interval);
      window.clearTimeout(timer);
    };
  }, [open, initializing, streamReady, handleCapture]);
  const handleRemove = useCallback(
    (index: number) => {
      setCaptured((prev) => {
        const next = [...prev];
        const [frame] = next.splice(index, 1);
        if (frame) {
          releasePreview(frame.previewUrl);
        }
        return next;
      });
    },
    [releasePreview],
  );
  const handleSubmit = useCallback(() => {
    if (!captured.length) {
      setError("Capture at least one page before submitting.");
      return;
    }
    const now = Date.now();
    const files = captured.map(
      (frame, index) =>
        new File([frame.blob], `invoice-capture-${now}-${index + 1}.jpg`, {
          type: frame.blob.type || "image/jpeg",
        }),
    );
    onCapture(files);
    clearCaptured();
    onOpenChange(false);
  }, [captured, onCapture, onOpenChange, clearCaptured]);
  const toggleFacingMode = useCallback(() => {
    setFacingMode((prev) => (prev === "environment" ? "user" : "environment"));
  }, []);
  useEffect(() => {
    if (open) {
      void startStream(facingMode);
    }
  }, [facingMode, open, startStream]);
  const facingLabel = useMemo(
    () => (facingMode === "environment" ? "Rear Camera" : "Front Camera"),
    [facingMode],
  );
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {" "}
      <DialogContent className="sm:max-w-2xl">
        {" "}
        <DialogHeader>
          {" "}
          <DialogTitle>Scan Invoice</DialogTitle>{" "}
          <DialogDescription>
            {" "}
            Align the invoice in the frame and tap capture. Save multiple pages
            before submitting.{" "}
          </DialogDescription>{" "}
        </DialogHeader>{" "}
        <div className="space-y-4">
          {" "}
          {error && (
            <Alert variant="destructive">
              {" "}
              <AlertDescription>{error}</AlertDescription>{" "}
            </Alert>
          )}{" "}
          <div
            className={cn(
              "relative aspect-[3/4] w-full overflow-hidden rounded-xl border bg-black",
              shutterActive &&
                "after:absolute after:inset-0 after:bg-background after:animate-in after:fade-in-50",
            )}
          >
            {" "}
            <video
              ref={videoRef}
              className="h-full w-full object-contain"
              playsInline
              muted
              autoPlay
            />{" "}
            <canvas ref={canvasRef} className="hidden" />{" "}
            {initializing && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
                {" "}
                <span className="text-sm font-medium">
                  Starting camera…
                </span>{" "}
              </div>
            )}{" "}
            {!initializing && !streamReady && (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/70 text-white">
                {" "}
                <span className="text-sm font-medium">
                  {" "}
                  Waiting for camera to focus…{" "}
                </span>{" "}
                <span className="text-xs text-white/80">
                  {" "}
                  Hold the invoice steady in view.{" "}
                </span>{" "}
              </div>
            )}{" "}
            {autoCountdown !== null && !initializing && streamReady && (
              <div className="absolute bottom-3 right-3 rounded-full bg-black/70 px-3 py-1 text-xs font-medium text-white shadow-lg">
                {" "}
                Auto capture in {autoCountdown}s{" "}
              </div>
            )}{" "}
          </div>{" "}
          <div className="flex flex-wrap items-center justify-between gap-2">
            {" "}
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              {" "}
              <span>{facingLabel}</span>{" "}
              <Button
                variant="outline"
                size="sm"
                onClick={toggleFacingMode}
                disabled={initializing}
              >
                {" "}
                Flip Camera{" "}
              </Button>{" "}
            </div>{" "}
            <div className="flex items-center gap-2">
              {" "}
              {!hideGallery && (
                <Button
                  variant="outline"
                  onClick={clearCaptured}
                  disabled={!captured.length}
                >
                  {" "}
                  Clear Captures{" "}
                </Button>
              )}{" "}
              <Button
                onClick={handleCapture}
                disabled={initializing || !streamReady}
              >
                {" "}
                {onScanCode ? "Scan" : "Capture Page"}{" "}
              </Button>{" "}
            </div>{" "}
          </div>{" "}
          {!hideGallery && captured.length > 0 && (
            <div className="space-y-3">
              {" "}
              <div className="text-sm font-medium">Captured Pages</div>{" "}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {" "}
                {captured.map((frame, index) => (
                  <div
                    key={frame.timestamp}
                    className="group relative overflow-hidden rounded-lg border bg-muted/20"
                  >
                    {" "}
                    <img
                      src={frame.previewUrl}
                      alt={`Captured page ${index + 1}`}
                      loading="lazy"
                      className={cn(
                        "h-40 w-full object-cover transition-all duration-500",
                        frame.status !== "ready"
                          ? "scale-[1.03] blur-sm brightness-75"
                          : "scale-100 blur-0 brightness-100",
                      )}
                    />{" "}
                    {frame.status !== "ready" ? (
                      <div
                        className={cn(
                          "absolute inset-0 flex flex-col items-center justify-center text-xs font-medium text-white",
                          frame.status === "scanning"
                            ? "camera-scan-overlay"
                            : "bg-black/55",
                        )}
                      >
                        {" "}
                        <span className="relative z-10">
                          {frame.message}
                        </span>{" "}
                        {frame.status === "processing" && (
                          <span className="relative z-10 mt-1 text-[0.7rem] text-white/75">
                            {" "}
                            Enhancing text…{" "}
                          </span>
                        )}{" "}
                      </div>
                    ) : (
                      <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-black/60 px-2 py-1 text-xs text-white">
                        {" "}
                        <span className="flex items-center gap-2">
                          {" "}
                          <span>Page {index + 1}</span>{" "}
                          <span className="rounded-full bg-background px-2 py-0.5 text-[0.65rem] uppercase tracking-wide">
                            {" "}
                            {frame.message}{" "}
                          </span>{" "}
                        </span>{" "}
                        <button
                          type="button"
                          onClick={() => handleRemove(index)}
                          className="opacity-80 transition hover:opacity-100"
                        >
                          {" "}
                          Remove{" "}
                        </button>{" "}
                      </div>
                    )}{" "}
                  </div>
                ))}{" "}
              </div>{" "}
            </div>
          )}{" "}
        </div>{" "}
        <DialogFooter className="gap-2">
          {" "}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {" "}
            {hideGallery ? "Close" : "Cancel"}{" "}
          </Button>{" "}
          {!hideGallery && (
            <Button onClick={handleSubmit} disabled={!captured.length}>
              {" "}
              Save & Process{" "}
            </Button>
          )}{" "}
        </DialogFooter>{" "}
      </DialogContent>{" "}
    </Dialog>
  );
}
