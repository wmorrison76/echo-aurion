import { useState } from "react";
import type { DragEvent, CSSProperties } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { GalleryImage, LookBook } from "@/context/AppDataContext";
import type { LucideIcon } from "lucide-react";
import {
  ChevronDown,
  Eye,
  EyeOff,
  Lock,
  Star,
  Tag,
} from "lucide-react";

export type AdjustmentState = {
  exposure: number;
  contrast: number;
  warmth: number;
  saturation: number;
  focus: number;
};

export type AdjustmentControl = {
  key: keyof AdjustmentState;
  label: string;
  min: number;
  max: number;
  step?: number;
};

export type AdjustmentPreset = {
  key: string;
  label: string;
  description: string;
  values: AdjustmentState;
};

export type ToolDefinition = {
  key: string;
  label: string;
  icon: LucideIcon;
};

export type QuickActionDefinition = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

export type LayerInfo = {
  key: string;
  name: string;
  meta: string;
  locked?: boolean;
};

type PhotoStudioPanelProps = {
  surfaceClassName: string;
  activeImage: GalleryImage | null;
  adjustments: AdjustmentState;
  adjustmentControls: AdjustmentControl[];
  adjustmentPresets: AdjustmentPreset[];
  activePresetKey: string | null;
  onApplyPreset: (presetKey: string) => void;
  onResetAdjustments: () => void;
  onUpdateAdjustment: (key: keyof AdjustmentState, value: number) => void;
  onApplyAdjustmentsToSelection: () => void;
  canApplyAdjustmentsToSelection: boolean;
  selectionCount: number;
  creativeTools: ToolDefinition[];
  quickActions: QuickActionDefinition[];
  activeTool: string;
  activeToolLabel: string;
  onSelectTool: (key: string) => void;
  activeQuickAction: string | null;
  onQuickAction: (action: QuickActionDefinition) => void;
  layerList: LayerInfo[];
  visibleLayers: Record<string, boolean>;
  onToggleLayer: (key: string) => void;
  onToggleFavorite: (id: string) => void;
  inspectorImageStyle: CSSProperties;
  onOpenLightbox: (id: string) => void;
  onLaunchStudio: () => void;
  nameDraft: string;
  onNameDraftChange: (value: string) => void;
  tagDraft: string;
  onTagDraftChange: (value: string) => void;
  onSaveMetadata: () => void;
  onResetMetadata: () => void;
  lookbooks: LookBook[];
  onToggleLookbook: (lookbookId: string, enabled: boolean) => void;
  onDropFiles: (files: File[]) => void;
  urlText: string;
  onUrlTextChange: (value: string) => void;
  urlLoading: boolean;
  onImportByUrl: () => void;
  selectedIdsCount: number;
  isActiveInSelection: boolean;
};

export function PhotoStudioPanel({
  surfaceClassName,
  activeImage,
  adjustments,
  adjustmentControls,
  adjustmentPresets,
  activePresetKey,
  onApplyPreset,
  onResetAdjustments,
  onUpdateAdjustment,
  onApplyAdjustmentsToSelection,
  canApplyAdjustmentsToSelection,
  selectionCount,
  creativeTools,
  quickActions,
  activeTool,
  activeToolLabel,
  onSelectTool,
  activeQuickAction,
  onQuickAction,
  layerList,
  visibleLayers,
  onToggleLayer,
  onToggleFavorite,
  inspectorImageStyle,
  onOpenLightbox,
  onLaunchStudio,
  nameDraft,
  onNameDraftChange,
  tagDraft,
  onTagDraftChange,
  onSaveMetadata,
  onResetMetadata,
  lookbooks,
  onToggleLookbook,
  onDropFiles,
  urlText,
  onUrlTextChange,
  urlLoading,
  onImportByUrl,
  selectedIdsCount,
  isActiveInSelection,
}: PhotoStudioPanelProps) {
  const [dropActive, setDropActive] = useState(false);

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    const files = Array.from(event.dataTransfer?.files || []).filter((file) =>
      file.type.startsWith("image/"),
    );
    if (files.length) {
      onDropFiles(files);
    }
    setDropActive(false);
  };

  const createdAtLabel = activeImage
    ? new Date(Number(activeImage.createdAt || Date.now())).toLocaleString()
    : "";

  const tagLabel = activeImage ? (activeImage.tags || []).join(" · ") : "";

  return (
    <aside className={cn("flex h-full flex-col gap-5 overflow-hidden rounded-[32px] border p-6", surfaceClassName)}>
      <div
        className={cn(
          "rounded-3xl border border-dashed px-4 py-3 text-[11px] uppercase tracking-[0.35em] transition",
          dropActive
            ? "border-sky-400/80 bg-sky-500/15 text-sky-100"
            : "border-slate-300/50 dark:border-white/15 bg-slate-100 dark:bg-black/25 text-slate-700 dark:text-slate-300",
        )}
        onDragEnter={(event) => {
          event.preventDefault();
          setDropActive(true);
        }}
        onDragOver={(event) => {
          event.preventDefault();
        }}
        onDragLeave={(event) => {
          event.preventDefault();
          setDropActive(false);
        }}
        onDrop={handleDrop}
      >
        Drop photos to edit instantly
      </div>

      <div className="flex items-center justify-between text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 dark:text-slate-100">
        <span>Photo studio</span>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full px-3 text-xs uppercase tracking-[0.3em]"
          onClick={onLaunchStudio}
        >
          Open studio
        </Button>
      </div>

      {activeImage ? (
        <div className="flex-1 space-y-4 overflow-y-auto pr-1">
          <div className="overflow-hidden rounded-3xl border border-slate-300/40 dark:border-white/10 bg-white dark:bg-black/40">
            {activeImage.unsupported ? (
              <div className="flex aspect-[4/3] items-center justify-center text-xs uppercase tracking-[0.3em] text-slate-400 dark:text-slate-300">
                No preview available
              </div>
            ) : (
              <img
                src={activeImage.dataUrl || activeImage.blobUrl}
                alt={activeImage.name}
                className="w-full object-cover"
                style={inspectorImageStyle}
              />
            )}
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-300/40 dark:border-white/10">
              <div className="space-y-1">
                <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">{activeImage.name}</div>
                <div className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-300">
                  {tagLabel || "Untagged"}
                </div>
              </div>
              <Button
                size="sm"
                variant={activeImage.favorite ? "default" : "ghost"}
                className={cn(
                  "rounded-full px-4",
                  activeImage.favorite ? "bg-amber-400 text-black" : "text-slate-200",
                )}
                onClick={() => onToggleFavorite(activeImage.id)}
              >
                <Star className="mr-1.5 h-4 w-4" />
                {activeImage.favorite ? "Favorited" : "Favorite"}
              </Button>
            </div>
          </div>

          <ControlSection title="Adjustments" defaultOpen>
            {adjustmentPresets.length > 0 && (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] uppercase tracking-[0.3em] text-slate-700 dark:text-slate-300">
                  <span>Presets</span>
                  <Button
                    size="sm"
                    variant="ghost"
                    className="rounded-full px-3"
                    disabled={!canApplyAdjustmentsToSelection}
                    onClick={onApplyAdjustmentsToSelection}
                  >
                    Sync to selection
                    {selectionCount > 0 ? ` (${selectionCount})` : ""}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {adjustmentPresets.map((preset) => (
                    <PresetPill
                      key={preset.key}
                      label={preset.label}
                      description={preset.description}
                      active={activePresetKey === preset.key}
                      onClick={() => onApplyPreset(preset.key)}
                    />
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-3">
              {adjustmentControls.map((control) => (
                <div key={control.key} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-slate-700 dark:text-slate-300">
                    <span>{control.label}</span>
                    <span>{adjustments[control.key]}</span>
                  </div>
                  <input
                    type="range"
                    min={control.min}
                    max={control.max}
                    step={control.step ?? 1}
                    value={adjustments[control.key]}
                    onChange={(event) => onUpdateAdjustment(control.key, Number(event.target.value))}
                    className="h-1 w-full cursor-pointer appearance-none rounded-full bg-white/20"
                  />
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" className="rounded-full px-3" onClick={onResetAdjustments}>
                  Reset
                </Button>
                <AdjustmentBadge
                  canApply={canApplyAdjustmentsToSelection}
                  selectionCount={selectionCount}
                  isActiveInSelection={isActiveInSelection}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="rounded-full px-3"
                onClick={() => onOpenLightbox(activeImage.id)}
              >
                View live
              </Button>
            </div>
          </ControlSection>

          <div className="flex justify-end">
            <Button
              variant="secondary"
              size="sm"
              className="rounded-full px-4"
              onClick={onLaunchStudio}
            >
              Launch studio overlay
            </Button>
          </div>

          <ControlSection title="Creative tools">
            <div className="grid grid-cols-2 gap-2">
              {creativeTools.map((tool) => (
                <ToolButton
                  key={tool.key}
                  label={tool.label}
                  icon={tool.icon}
                  active={activeTool === tool.key}
                  onClick={() => onSelectTool(tool.key)}
                />
              ))}
            </div>
            <div className="mt-3 text-[11px] uppercase tracking-[0.3em] text-slate-700 dark:text-slate-300">
              Active · {activeToolLabel}
            </div>
          </ControlSection>

          <ControlSection title="Quick actions">
            <div className="grid grid-cols-2 gap-2">
              {quickActions.map((action) => (
                <QuickActionCard
                  key={action.key}
                  label={action.label}
                  description={action.description}
                  icon={action.icon}
                  active={activeQuickAction === action.key}
                  onClick={() => onQuickAction(action)}
                />
              ))}
            </div>
          </ControlSection>

          <ControlSection title="Layers">
            <div className="mb-3 flex justify-end">
              <Button
                size="sm"
                variant="ghost"
                className="rounded-full px-3"
                onClick={() => onQuickAction({
                  key: "new-layer",
                  label: "New layer",
                  description: "Staged for compositing",
                  icon: Eye,
                })}
              >
                + Layer
              </Button>
            </div>
            <div className="space-y-1.5">
              {layerList.map((layer) => (
                <LayerListItem
                  key={layer.key}
                  layer={layer}
                  visible={visibleLayers[layer.key] ?? true}
                  onToggle={() => onToggleLayer(layer.key)}
                />
              ))}
            </div>
          </ControlSection>

          <ControlSection title="Metadata">
            <div className="grid gap-3">
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.35em] text-slate-300">Filename</label>
                <input
                  value={nameDraft}
                  onChange={(event) => onNameDraftChange(event.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[11px] uppercase tracking-[0.35em] text-slate-300">Tags</label>
                <textarea
                  value={tagDraft}
                  onChange={(event) => onTagDraftChange(event.target.value)}
                  className="h-20 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                  placeholder="comma separated"
                />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-300">
              <Button size="sm" className="rounded-full px-4" onClick={onSaveMetadata}>
                Save metadata
              </Button>
              <button
                className="text-[11px] uppercase tracking-[0.35em] text-slate-400 transition hover:text-slate-200"
                onClick={onResetMetadata}
              >
                Reset fields
              </button>
            </div>
          </ControlSection>

          <ControlSection title="Look books">
            <div className="space-y-2">
              {lookbooks.length === 0 && (
                <div className="rounded-xl border border-dashed border-white/20 px-3 py-3 text-xs opacity-70">
                  Create a look book on the left to organise hero dishes.
                </div>
              )}
              {lookbooks.map((book) => {
                const hasImage = activeImage ? book.imageIds.includes(activeImage.id) : false;
                return (
                  <label
                    key={book.id}
                    className="flex items-center justify-between rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-xs"
                  >
                    <span className="flex items-center gap-2">
                      <div className="flex h-6 w-6 items-center justify-center rounded-full border border-white/15 bg-black/40">
                        <svg
                          viewBox="0 0 24 24"
                          className="h-3.5 w-3.5 text-slate-200"
                          aria-hidden="true"
                        >
                          <path
                            d="M4 5h7l2 2h7v12H4z"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="1.6"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          />
                        </svg>
                      </div>
                      {book.name}
                    </span>
                    <input
                      type="checkbox"
                      checked={hasImage}
                      onChange={(event) => onToggleLookbook(book.id, event.target.checked)}
                    />
                  </label>
                );
              })}
            </div>
          </ControlSection>

          <ControlSection title="Import by URL">
            <textarea
              value={urlText}
              onChange={(event) => onUrlTextChange(event.target.value)}
              placeholder="https://example.com/photo.jpg"
              className="mt-1 h-24 w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2 text-xs focus:border-sky-400 focus:outline-none"
            />
            <Button
              size="sm"
              disabled={urlLoading}
              className="mt-3 rounded-full px-4"
              onClick={onImportByUrl}
            >
              {urlLoading ? "Fetching…" : "Add images"}
            </Button>
          </ControlSection>

          <div className="space-y-1 text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <Tag className="h-3.5 w-3.5" />
              {tagLabel || "No tags yet"}
            </div>
            <div>{createdAtLabel}</div>
            <div>{activeImage.type || "Unknown file type"}</div>
          </div>
        </div>
      ) : (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 text-sm text-slate-600 dark:text-slate-200">
          <div className="text-base font-semibold text-slate-900 dark:text-slate-100">Select an image to begin editing.</div>
        </div>
      )}
    </aside>
  );
}

type ControlSectionProps = {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
};

function ControlSection({ title, defaultOpen = false, children }: ControlSectionProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="rounded-3xl border border-slate-300/40 dark:border-white/12 bg-slate-50 dark:bg-black/30 p-4">
      <button
        className="flex w-full items-center justify-between text-[11px] uppercase tracking-[0.35em] text-slate-900 dark:text-slate-200"
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
      {open && <div className="mt-3 space-y-3 text-slate-900 dark:text-slate-100">{children}</div>}
    </div>
  );
}

type ToolButtonProps = {
  label: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
};

function ToolButton({ label, icon: Icon, active, onClick }: ToolButtonProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-2xl border px-3 py-2 text-left text-xs uppercase tracking-[0.3em] transition",
        active
          ? "border-sky-500/60 bg-sky-500/15 text-sky-100 shadow-[0_16px_36px_rgba(14,165,233,0.35)]"
          : "border-slate-300/50 dark:border-white/12 bg-slate-100 dark:bg-black/30 text-slate-900 dark:text-slate-200 hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:bg-sky-500/10",
      )}
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </button>
  );
}

type QuickActionCardProps = {
  label: string;
  description: string;
  icon: LucideIcon;
  active: boolean;
  onClick: () => void;
};

function QuickActionCard({ label, description, icon: Icon, active, onClick }: QuickActionCardProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-2xl border px-3 py-2 text-left transition",
        active
          ? "border-sky-500/60 bg-sky-500/15 text-sky-700 dark:text-sky-100 shadow-[0_16px_36px_rgba(14,165,233,0.35)]"
          : "border-slate-300/50 dark:border-white/12 bg-slate-100 dark:bg-black/25 text-slate-900 dark:text-slate-200 hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:bg-sky-500/10",
      )}
    >
      <span className="flex items-center gap-2 text-xs uppercase tracking-[0.3em]">
        <Icon className="h-3.5 w-3.5" /> {label}
      </span>
      <span className="text-[10px] uppercase tracking-[0.25em] text-slate-400">{description}</span>
    </button>
  );
}

type LayerListItemProps = {
  layer: LayerInfo;
  visible: boolean;
  onToggle: () => void;
};

function LayerListItem({ layer, visible, onToggle }: LayerListItemProps) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-2xl border border-slate-300/50 dark:border-white/10 bg-slate-100 dark:bg-black/35 px-3 py-2 text-xs uppercase tracking-[0.3em] text-slate-900 dark:text-slate-200">
      <button
        onClick={onToggle}
        className="rounded-full border border-white/20 bg-black/40 p-1 text-white transition hover:border-sky-400/50 hover:text-sky-200"
        aria-label={visible ? "Hide layer" : "Show layer"}
      >
        {visible ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
      </button>
      <div className="flex flex-1 flex-col gap-0.5">
        <span>{layer.name}</span>
        <span className="text-[9px] text-slate-600 dark:text-slate-400">{layer.meta}</span>
      </div>
      {layer.locked ? (
        <Lock className="h-3.5 w-3.5 text-slate-400" />
      ) : (
        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[9px] text-slate-300">FX</span>
      )}
    </div>
  );
}

type PresetPillProps = {
  label: string;
  description: string;
  active: boolean;
  onClick: () => void;
};

function PresetPill({ label, description, active, onClick }: PresetPillProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-col rounded-2xl border px-3 py-2 text-left text-xs uppercase tracking-[0.3em] transition",
        active
          ? "border-sky-500/70 bg-sky-500/20 text-sky-700 dark:text-sky-100 shadow-[0_12px_30px_rgba(56,189,248,0.35)]"
          : "border-slate-300/50 dark:border-white/12 bg-slate-100 dark:bg-black/30 text-slate-900 dark:text-slate-200 hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:bg-sky-500/10",
      )}
    >
      <span>{label}</span>
      <span className="text-[9px] text-slate-600 dark:text-slate-400 normal-case tracking-[0.2em]">{description}</span>
    </button>
  );
}

type AdjustmentBadgeProps = {
  canApply: boolean;
  selectionCount: number;
  isActiveInSelection: boolean;
};

function AdjustmentBadge({ canApply, selectionCount, isActiveInSelection }: AdjustmentBadgeProps) {
  if (!selectionCount) {
    return (
      <span className="rounded-full border border-slate-300/60 dark:border-white/15 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-slate-700 dark:text-slate-400">
        Select images to sync adjustments
      </span>
    );
  }

  if (!canApply) {
    return (
      <span className="rounded-full border border-amber-300/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-amber-700 dark:text-amber-200">
        Add more selections
      </span>
    );
  }

  return (
    <span className="rounded-full border border-sky-300/40 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-sky-700 dark:text-sky-100">
      {isActiveInSelection ? "Synced selection" : "Active + selection"}
    </span>
  );
}
