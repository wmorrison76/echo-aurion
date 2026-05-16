import React from "react";

import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Maximize2, Minimize2, Square, ZoomIn, ZoomOut } from "lucide-react";

export type OverlayRect = {
  id?: string;
  x: number;
  y: number;
  w: number;
  h: number;
  color?: string;
  page?: number;
};

export type AttachmentInteractionMode = "hybrid" | "pan" | "select";

export interface AttachmentViewerHandle {
  zoomIn: (delta?: number) => void;
  zoomOut: (delta?: number) => void;
  resetZoom: () => void;
  fitToView: () => void;
  getZoom: () => number;
  getActiveIndex: () => number;
  setActiveIndex: (index: number) => void;
}

interface AttachmentViewerProps {
  urls: string[];
  fill?: boolean;
  interactive?: boolean;
  overlayRects?: OverlayRect[];
  onSelectRect?: (rect: OverlayRect) => void;
  interactionMode?: AttachmentInteractionMode;
  showHeader?: boolean;
  showThumbnails?: boolean;
  showControls?: boolean;
  minZoom?: number;
  maxZoom?: number;
  onOverlayPointerDown?: (rect: OverlayRect) => void;
  onOverlayDragEnd?: (rect: OverlayRect) => void;
  onFullscreenToggle?: (isFullscreen: boolean) => void;
}

function clamp(value: number, min: number, max: number) {
  return Math.max(min, Math.min(value, max));
}

const AttachmentViewerComponent = React.forwardRef<
  AttachmentViewerHandle,
  AttachmentViewerProps
>(function AttachmentViewer(
  {
    urls,
    fill = false,
    interactive = false,
    overlayRects = [],
    onSelectRect,
    interactionMode = "hybrid",
    showHeader = true,
    showThumbnails = true,
    showControls = true,
    minZoom = 0.25,
    maxZoom = 4,
    onOverlayPointerDown,
    onOverlayDragEnd: _onOverlayDragEnd,
    onFullscreenToggle,
  },
  ref,
) {
  const [idx, setIdx] = React.useState(0);
  const [zoom, setZoom] = React.useState(1);
  const [fitZoom, setFitZoom] = React.useState(1);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const containerRef = React.useRef<HTMLDivElement | null>(null);
  const imgRef = React.useRef<HTMLImageElement | null>(null);
  const viewerRef = React.useRef<HTMLDivElement | null>(null);

  const safeIdx = React.useMemo(
    () => clamp(idx, 0, Math.max(urls.length - 1, 0)),
    [idx, urls.length],
  );
  const cur = urls[safeIdx];

  React.useEffect(() => {
    setIdx((i) => clamp(i, 0, Math.max(urls.length - 1, 0)));
  }, [urls.length]);

  const calculateFitToView = React.useCallback(() => {
    const container = containerRef.current;
    const img = imgRef.current;
    if (!container || !img) return 1;
    const iw = img.naturalWidth || 1;
    const ih = img.naturalHeight || 1;
    const cw = container.clientWidth || 1;
    const ch = container.clientHeight || 1;
    return Math.min(cw / iw, ch / ih);
  }, []);

  React.useEffect(() => {
    const img = imgRef.current;
    if (!img) return;
    const onLoad = () => {
      const f = calculateFitToView();
      setFitZoom(f);
      setZoom((z) => clamp(z, minZoom, maxZoom));
    };
    if (img.complete) onLoad();
    else img.addEventListener("load", onLoad);
    return () => img.removeEventListener("load", onLoad);
  }, [calculateFitToView, cur, maxZoom, minZoom]);

  React.useImperativeHandle(
    ref,
    () => ({
      zoomIn: (delta = 0.2) =>
        setZoom((z) => clamp(z + delta, minZoom, maxZoom)),
      zoomOut: (delta = 0.2) =>
        setZoom((z) => clamp(z - delta, minZoom, maxZoom)),
      resetZoom: () => setZoom(1),
      fitToView: () => setZoom(fitZoom),
      getZoom: () => zoom,
      getActiveIndex: () => safeIdx,
      setActiveIndex: (index: number) =>
        setIdx(clamp(index, 0, Math.max(urls.length - 1, 0))),
    }),
    [fitZoom, maxZoom, minZoom, safeIdx, urls.length, zoom],
  );

  const handleFullscreenToggle = React.useCallback(async () => {
    try {
      if (!isFullscreen && viewerRef.current?.requestFullscreen) {
        await viewerRef.current.requestFullscreen();
        setIsFullscreen(true);
        onFullscreenToggle?.(true);
      } else if (isFullscreen && document.exitFullscreen) {
        await document.exitFullscreen();
        setIsFullscreen(false);
        onFullscreenToggle?.(false);
      }
    } catch {
      /* ignore */
    }
  }, [isFullscreen, onFullscreenToggle]);

  if (!urls.length) return null;

  return (
    <div
      ref={viewerRef}
      className={`grid ${isFullscreen ? "fixed inset-0 z-50 bg-black" : fill ? "h-full" : ""} gap-3`}
    >
      {showHeader ? (
        <div className="flex flex-col gap-3 bg-surface p-3 rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              Attachment {safeIdx + 1} of {urls.length}
            </div>
            {showControls ? (
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setZoom((z) => clamp(z - 0.2, minZoom, maxZoom))
                  }
                  className="h-8 w-8 p-0"
                >
                  <ZoomOut className="h-4 w-4" />
                </Button>

                <div className="flex items-center gap-2 text-xs">
                  <span className="w-10 text-right">
                    {Math.round(zoom * 100)}%
                  </span>
                  <div className="w-40">
                    <Slider
                      min={minZoom}
                      max={maxZoom}
                      step={0.05}
                      value={[zoom]}
                      onValueChange={(v) =>
                        setZoom(clamp(v[0] || 1, minZoom, maxZoom))
                      }
                    />
                  </div>
                </div>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setZoom((z) => clamp(z + 0.2, minZoom, maxZoom))
                  }
                  className="h-8 w-8 p-0"
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setZoom(fitZoom)}
                  className="h-8 w-8 p-0"
                  title="Fit to view"
                >
                  <Square className="h-4 w-4" />
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFullscreenToggle}
                  className="h-8 w-8 p-0"
                >
                  {isFullscreen ? (
                    <Minimize2 className="h-4 w-4" />
                  ) : (
                    <Maximize2 className="h-4 w-4" />
                  )}
                </Button>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      <div
        ref={containerRef}
        className={`${isFullscreen ? "h-[calc(100vh-60px)]" : fill ? "h-full" : "h-[420px]"} w-full overflow-auto rounded border bg-muted/20 ${
          interactionMode === "pan" || interactionMode === "hybrid"
            ? "cursor-grab"
            : interactionMode === "select"
              ? "cursor-crosshair"
              : "cursor-default"
        }`}
      >
        <div
          className="relative origin-top-left"
          style={{ transform: `scale(${zoom})`, transformOrigin: "top left" }}
        >
          <img
            ref={imgRef}
            src={cur}
            alt="attachment"
            loading="lazy"
            className="block select-none"
            draggable={false}
            onClick={() => {
              if (!interactive) return;
              onSelectRect?.({ x: 0, y: 0, w: 1, h: 1, page: safeIdx });
            }}
          />

          {overlayRects
            .filter((r) => (r.page ?? safeIdx) === safeIdx)
            .map((overlay, i) => {
              const key =
                overlay.id ??
                `${i}-${overlay.x}-${overlay.y}-${overlay.w}-${overlay.h}`;
              const borderColor = overlay.color || "rgba(0,200,255,0.6)";
              const background = "rgba(0,200,255,0.15)";
              return (
                <div
                  key={key}
                  className="absolute border-2"
                  style={{
                    left: `${overlay.x * 100}%`,
                    top: `${overlay.y * 100}%`,
                    width: `${overlay.w * 100}%`,
                    height: `${overlay.h * 100}%`,
                    borderColor,
                    background,
                    cursor: interactive ? "pointer" : "default",
                  }}
                  onMouseDown={() => {
                    onOverlayPointerDown?.(overlay);
                  }}
                />
              );
            })}
        </div>
      </div>

      {showThumbnails && urls.length > 1 && !isFullscreen ? (
        <div className="flex gap-2 overflow-x-auto bg-surface p-3 rounded-b-lg">
          {urls.map((u, i) => (
            <button
              key={i}
              onClick={() => setIdx(i)}
              aria-label={`View page ${i + 1}`}
              className={`h-16 w-24 flex-shrink-0 overflow-hidden rounded border ${i === safeIdx ? "ring-2 ring-primary" : ""}`}
            >
              <img
                src={u}
                loading="lazy"
                className="h-full w-full object-cover"
                alt={`Page ${i + 1}`}
              />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
});

AttachmentViewerComponent.displayName = "AttachmentViewer";
export const AttachmentViewer = React.memo(AttachmentViewerComponent);
