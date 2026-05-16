import { useState, useMemo, useRef } from "react";
import type { GalleryImage } from "@/context/AppDataContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";
import {
  Bandage,
  ChevronDown,
  Crop,
  Droplet,
  Eraser,
  Hand,
  History,
  Lasso,
  Maximize2,
  Minus,
  Move,
  PaintBucket,
  Pencil,
  PenTool,
  Pipette,
  Plus,
  Pointer,
  RectangleHorizontal,
  Ruler,
  Scissors,
  Shapes,
  Sparkles,
  Stamp,
  Text,
  Wand2,
  ZoomIn,
  ZoomOut,
} from "lucide-react";

export type GalleryOverlayProps = {
  open: boolean;
  onClose: () => void;
  onSave: () => void;
  image: GalleryImage | null;
  adjustments: {
    exposure: number;
    contrast: number;
    warmth: number;
    saturation: number;
    focus: number;
  };
  activeTool: string;
  onSelectTool: (tool: string) => void;
  layers: { key: string; name: string; meta: string; locked?: boolean }[];
  visibleLayers: Record<string, boolean>;
  onToggleLayer: (key: string) => void;
  onResetAdjustments: () => void;
  onQuickAction: (action: { key: string; label: string }) => void;
  activeQuickAction: string | null;
};

type ToolSpec = {
  key: string;
  label: string;
  icon: LucideIcon;
};

const TOOL_GRID: ToolSpec[] = [
  { key: "crop", label: "Crop", icon: Crop },
  { key: "hand", label: "Pan", icon: Hand },
  { key: "color", label: "Color pick", icon: Pipette },
];

const OVERLAY_QUICK_ACTIONS: { key: string; label: string }[] = [];

const QUICK_PRESETS: { key: string; label: string }[] = [];

export function GalleryOverlay({
  open,
  onClose,
  onSave,
  image,
  adjustments,
  activeTool,
  onSelectTool,
  layers,
  visibleLayers,
  onToggleLayer,
  onResetAdjustments,
  onQuickAction,
  activeQuickAction,
}: GalleryOverlayProps) {
  const [zoom, setZoom] = useState(100);
  const [gridSize, setGridSize] = useState(32);
  const [showRulers, setShowRulers] = useState(true);
  const [cropBox, setCropBox] = useState({ x: 10, y: 10, width: 80, height: 80 });
  const [isDraggingCrop, setIsDraggingCrop] = useState<string | null>(null);

  const layerMeta = useMemo(
    () =>
      layers.map((layer, index) => ({
        ...layer,
        order: index,
      })),
    [layers],
  );

  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingCrop) return;

    const deltaX = e.movementX;
    const deltaY = e.movementY;
    const sensitivity = 0.1;

    setCropBox((prev) => {
      const newBox = { ...prev };
      const handle = isDraggingCrop;

      if (handle.includes("w")) {
        newBox.x = Math.max(0, Math.min(prev.x + deltaX * sensitivity, prev.x + prev.width - 5));
        newBox.width = Math.max(5, Math.min(100, prev.width - deltaX * sensitivity));
      }
      if (handle.includes("e")) {
        newBox.width = Math.max(5, Math.min(100 - newBox.x, prev.width + deltaX * sensitivity));
      }
      if (handle.includes("n")) {
        newBox.y = Math.max(0, Math.min(prev.y + deltaY * sensitivity, prev.y + prev.height - 5));
        newBox.height = Math.max(5, Math.min(100, prev.height - deltaY * sensitivity));
      }
      if (handle.includes("s")) {
        newBox.height = Math.max(5, Math.min(100 - newBox.y, prev.height + deltaY * sensitivity));
      }

      return newBox;
    });
  };

  const handleMouseUp = () => {
    setIsDraggingCrop(null);
  };

  if (!open) return null;

  return (
    <div
      ref={containerRef}
      className="fixed inset-0 z-[200] flex items-center justify-center bg-gradient-to-br from-black/70 via-slate-900/65 to-slate-950/80 backdrop-blur-lg"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(51,133,255,0.25),_transparent_60%)] opacity-50" />

      <div className="relative z-[210] mx-auto flex h-[92vh] w-[92vw] flex-col overflow-hidden rounded-[36px] border border-slate-300/50 dark:border-slate-700/60 bg-white dark:bg-slate-950/95 shadow-[0_40px_160px_rgba(15,23,42,0.55)]">
        <header className="flex items-center justify-between border-b border-slate-300/50 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/80 px-8 py-4 text-xs uppercase tracking-[0.35em] text-slate-900 dark:text-slate-200">
          <div className="flex items-center gap-4">
            <span>Studio overlay</span>
            <span className="rounded-full border border-slate-300/60 dark:border-slate-500/50 bg-slate-100 dark:bg-black/30 px-3 py-1 text-[11px] text-slate-700 dark:text-slate-300">
              {image?.name ?? "No image"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="rounded-full bg-sky-500 px-5 text-black hover:bg-sky-400"
              onClick={onSave}
            >
              Save
            </Button>
            {activeTool === "crop" && (
              <Button
                size="sm"
                className="rounded-full px-4 bg-amber-600 hover:bg-amber-700 text-white"
                onClick={onSave}
              >
                Apply Crop
              </Button>
            )}
            <Button
              size="sm"
              variant="secondary"
              className="rounded-full px-4"
              onClick={onClose}
            >
              Close
            </Button>
          </div>
        </header>

        <div className="flex flex-1 gap-4 overflow-hidden px-6 py-6">
          <aside className="flex w-[120px] flex-col gap-3 rounded-3xl border border-slate-300/50 dark:border-slate-700/60 bg-slate-100 dark:bg-black/35 p-4">
            <div className="text-[10px] uppercase tracking-[0.35em] text-slate-900 dark:text-slate-300">Tools</div>
            <div className="grid grid-cols-2 gap-2">
              {TOOL_GRID.map((tool) => (
                <button
                  key={tool.key}
                  onClick={() => onSelectTool(tool.key)}
                  className={cn(
                    "flex aspect-square items-center justify-center rounded-xl border transition",
                    activeTool === tool.key
                      ? "border-sky-400 bg-sky-500/20 text-sky-700 dark:text-sky-100"
                      : "border-slate-300/50 dark:border-slate-700/60 text-slate-900 dark:text-slate-200 bg-slate-200 dark:bg-black/30 hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:bg-sky-500/10",
                  )}
                  aria-label={tool.label}
                >
                  <tool.icon className="h-4 w-4" />
                </button>
              ))}
            </div>
          </aside>

          <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-3xl border border-slate-300/50 dark:border-slate-700/60 bg-slate-50 dark:bg-slate-900/80">
            <div className="flex items-center justify-between border-b border-slate-300/50 dark:border-slate-700/60 bg-slate-100 dark:bg-black/30 px-5 py-3 text-[11px] uppercase tracking-[0.3em] text-slate-900 dark:text-slate-300">
              <div className="flex items-center gap-3">
                <button
                  className="rounded-full border border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/40 p-2 text-slate-900 dark:text-slate-200 transition hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:text-sky-700 dark:hover:text-sky-200"
                  onClick={() => setGridSize((size) => Math.max(8, size - 4))}
                  aria-label="Decrease grid size"
                >
                  <Minus className="h-4 w-4" />
                </button>
                <span className="rounded-full border border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/30 px-3 py-1 text-[10px] text-slate-900 dark:text-slate-100">
                  Grid {gridSize}px
                </span>
                <button
                  className="rounded-full border border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/40 p-2 text-slate-900 dark:text-slate-200 transition hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:text-sky-700 dark:hover:text-sky-200"
                  onClick={() => setGridSize((size) => Math.min(96, size + 4))}
                  aria-label="Increase grid size"
                >
                  <Plus className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="rounded-full border border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/40 p-2 text-slate-900 dark:text-slate-200 transition hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:text-sky-700 dark:hover:text-sky-200"
                  onClick={() => setZoom((value) => Math.max(25, value - 10))}
                  aria-label="Zoom out"
                >
                  <ZoomOut className="h-4 w-4" />
                </button>
                <span className="rounded-full border border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/30 px-3 py-1 text-[10px] text-slate-900 dark:text-slate-100">
                  {zoom}%
                </span>
                <button
                  className="rounded-full border border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/40 p-2 text-slate-900 dark:text-slate-200 transition hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:text-sky-700 dark:hover:text-sky-200"
                  onClick={() => setZoom((value) => Math.min(400, value + 10))}
                  aria-label="Zoom in"
                >
                  <ZoomIn className="h-4 w-4" />
                </button>
              </div>
              <div className="flex items-center gap-2 text-[10px]">
                <button
                  className="rounded-full border border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/40 p-2 text-slate-900 dark:text-slate-200 transition hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:text-sky-700 dark:hover:text-sky-200"
                  onClick={() => setZoom(100)}
                  aria-label="Reset view"
                >
                  <Move className="h-4 w-4" />
                </button>
                <button
                  className="rounded-full border border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/40 p-2 text-slate-900 dark:text-slate-200 transition hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:text-sky-700 dark:hover:text-sky-200"
                  onClick={() => setZoom(150)}
                  aria-label="Fit to screen"
                >
                  <Maximize2 className="h-4 w-4" />
                </button>
                <button
                  className={cn(
                    "rounded-full border p-2 transition",
                    showRulers
                      ? "border-sky-400/60 bg-sky-500/20 text-sky-700 dark:text-sky-100"
                      : "border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/40 text-slate-900 dark:text-slate-200 hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:text-sky-700 dark:hover:text-sky-200",
                  )}
                  onClick={() => setShowRulers((prev) => !prev)}
                  aria-label="Toggle rulers"
                >
                  <Ruler className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="relative flex-1 overflow-auto">
              {showRulers && (
                <>
                  <div className="pointer-events-none absolute left-0 right-0 top-0 z-20 h-8 bg-[repeating-linear-gradient(to_right,rgba(148,163,184,0.45),rgba(148,163,184,0.45)_1px,transparent_1px,transparent_24px)] opacity-70" />
                  <div className="pointer-events-none absolute bottom-0 top-0 left-0 z-20 w-8 bg-[repeating-linear-gradient(to_bottom,rgba(148,163,184,0.45),rgba(148,163,184,0.45)_1px,transparent_1px,transparent_24px)] opacity-70" />
                </>
              )}
              <div className="relative h-full w-full">
                <div
                  className={cn(
                    "absolute inset-0 flex items-center justify-center",
                    showRulers ? "pl-16 pt-16 pr-10 pb-10" : "p-10",
                  )}
                >
                  <div
                    className="relative flex h-full w-full min-h-[520px] min-w-[520px] items-center justify-center rounded-[32px]"
                    style={{
                      backgroundImage:
                        "linear-gradient(0deg, transparent calc(100% - 1px), rgba(148,163,184,0.25) calc(100% - 1px)), linear-gradient(90deg, transparent calc(100% - 1px), rgba(148,163,184,0.25) calc(100% - 1px))",
                      backgroundSize: `${gridSize}px ${gridSize}px`,
                      transform: `scale(${zoom / 100})`,
                      transformOrigin: "center center",
                    }}
                  >
                    {image ? (
                      <div className="relative inline-block">
                        <img
                          src={image.dataUrl || image.blobUrl}
                          alt={image.name}
                          className="max-h-[70vh] max-w-[70vw] rounded-3xl border border-white/10 shadow-[0_45px_80px_rgba(14,165,233,0.35)]"
                        />
                        {activeTool === "crop" && (
                          <div
                            className="absolute inset-0 rounded-3xl"
                            style={{
                              background: "rgba(0, 0, 0, 0.5)",
                              border: "2px dashed rgb(59, 130, 246)",
                              boxSizing: "border-box",
                              left: `${cropBox.x}%`,
                              top: `${cropBox.y}%`,
                              width: `${cropBox.width}%`,
                              height: `${cropBox.height}%`,
                            }}
                          >
                            {["nw", "n", "ne", "w", "e", "sw", "s", "se"].map((handle) => (
                              <div
                                key={handle}
                                onMouseDown={() => setIsDraggingCrop(handle)}
                                className="absolute w-3 h-3 bg-blue-400 border border-white cursor-move hover:bg-blue-500"
                                style={{
                                  ...(handle === "nw" && { top: "-6px", left: "-6px", cursor: "nwse-resize" }),
                                  ...(handle === "n" && { top: "-6px", left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" }),
                                  ...(handle === "ne" && { top: "-6px", right: "-6px", cursor: "nesw-resize" }),
                                  ...(handle === "w" && { top: "50%", left: "-6px", transform: "translateY(-50%)", cursor: "ew-resize" }),
                                  ...(handle === "e" && { top: "50%", right: "-6px", transform: "translateY(-50%)", cursor: "ew-resize" }),
                                  ...(handle === "sw" && { bottom: "-6px", left: "-6px", cursor: "nesw-resize" }),
                                  ...(handle === "s" && { bottom: "-6px", left: "50%", transform: "translateX(-50%)", cursor: "ns-resize" }),
                                  ...(handle === "se" && { bottom: "-6px", right: "-6px", cursor: "nwse-resize" }),
                                }}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-3xl border border-dashed border-slate-300/60 dark:border-slate-600/60 bg-slate-200 dark:bg-black/40 px-12 py-16 text-center text-xs uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">
                        No image selected
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <footer className="flex items-center justify-between border-t border-slate-700/60 bg-black/30 px-5 py-3 text-[10px] uppercase tracking-[0.3em] text-slate-300">
              <span>Metadata · AI warm-up ready</span>
              <span className="rounded-full border border-slate-600/60 bg-black/30 px-3 py-1 text-[10px]">
                Exposure {adjustments.exposure} · Contrast {adjustments.contrast}
              </span>
            </footer>
          </main>

          <aside className="flex w-[260px] flex-col gap-3 rounded-3xl border border-slate-700/60 bg-black/35 p-4">
            <OverlayPanel title="Adjustments" defaultOpen>
              <div className="space-y-4 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                <div>
                  <span className="flex items-center justify-between mb-2">Exposure {adjustments.exposure}</span>
                  <div className="flex items-center gap-2">
                    <input type="range" min="-100" max="100" value={adjustments.exposure} className="flex-1 h-1 cursor-pointer" disabled style={{opacity: 0.5}} />
                  </div>
                </div>
                <div>
                  <span className="flex items-center justify-between mb-2">Contrast {adjustments.contrast}</span>
                  <div className="flex items-center gap-2">
                    <input type="range" min="-100" max="100" value={adjustments.contrast} className="flex-1 h-1 cursor-pointer" disabled style={{opacity: 0.5}} />
                  </div>
                </div>
                <div>
                  <span className="flex items-center justify-between mb-2">Warmth {adjustments.warmth}</span>
                  <div className="flex items-center gap-2">
                    <input type="range" min="-100" max="100" value={adjustments.warmth} className="flex-1 h-1 cursor-pointer" disabled style={{opacity: 0.5}} />
                  </div>
                </div>
                <div>
                  <span className="flex items-center justify-between mb-2">Saturation {adjustments.saturation}</span>
                  <div className="flex items-center gap-2">
                    <input type="range" min="-100" max="100" value={adjustments.saturation} className="flex-1 h-1 cursor-pointer" disabled style={{opacity: 0.5}} />
                  </div>
                </div>
                <div>
                  <span className="flex items-center justify-between mb-2">Focus {adjustments.focus}</span>
                  <div className="flex items-center gap-2">
                    <input type="range" min="-100" max="100" value={adjustments.focus} className="flex-1 h-1 cursor-pointer" disabled style={{opacity: 0.5}} />
                  </div>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="mt-3 rounded-full px-4 w-full"
                onClick={onResetAdjustments}
              >
                Reset
              </Button>
              <div className="text-[10px] text-slate-400 mt-2">
                💡 Adjustments are displayed in the preview. Save to apply changes.
              </div>
            </OverlayPanel>

            <OverlayPanel title="Layers">
              <div className="space-y-2">
                {layerMeta.map((layer) => (
                  <div
                    key={layer.key}
                    className="flex items-center justify-between gap-2 rounded-2xl border border-slate-700/60 bg-black/30 px-3 py-2 text-[11px] uppercase tracking-[0.3em] text-slate-200"
                  >
                    <span>{layer.name}</span>
                    <div className="flex items-center gap-2">
                      <button
                        className="rounded-full border border-slate-600/60 bg-black/40 px-2 text-[10px] transition hover:border-sky-400/40"
                        onClick={() => onToggleLayer(layer.key)}
                      >
                        {visibleLayers[layer.key] ?? true ? "Hide" : "Show"}
                      </button>
                      {layer.locked ? <span className="text-[10px] text-slate-400">Locked</span> : null}
                    </div>
                  </div>
                ))}
              </div>
            </OverlayPanel>

            <OverlayPanel title="Quick actions">
              <div className="grid gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                {OVERLAY_QUICK_ACTIONS.map((action) => (
                  <button
                    key={action.key}
                    onClick={() => onQuickAction(action)}
                    className={cn(
                      "rounded-2xl border border-slate-700/60 bg-black/30 px-3 py-2 text-left transition",
                      activeQuickAction === action.key && "border-sky-400 bg-sky-500/15 text-sky-100",
                    )}
                  >
                    {action.label}
                  </button>
                ))}
              </div>
            </OverlayPanel>

            <OverlayPanel title="Presets">
              <div className="grid gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-300">
                {QUICK_PRESETS.map((preset) => (
                  <button
                    key={preset.key}
                    onClick={() => onQuickAction(preset)}
                    className={cn(
                      "rounded-2xl border border-slate-700/60 bg-black/30 px-3 py-2 text-left transition",
                      activeQuickAction === preset.key && "border-sky-400 bg-sky-500/15 text-sky-100",
                    )}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </OverlayPanel>
          </aside>
        </div>
      </div>
    </div>
  );
}

type OverlayPanelProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function OverlayPanel({ title, defaultOpen = false, children }: OverlayPanelProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-2xl border border-slate-700/60 bg-black/30 p-3">
      <button
        className="flex w-full items-center justify-between text-[11px] uppercase tracking-[0.35em] text-slate-200"
        onClick={() => setOpen((prev) => !prev)}
      >
        <span>{title}</span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            open ? "rotate-0" : "-rotate-90",
          )}
        />
      </button>
      {open && <div className="mt-3 space-y-3 text-slate-100">{children}</div>}
    </div>
  );
}
