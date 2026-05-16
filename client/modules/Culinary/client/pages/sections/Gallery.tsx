import { useEffect, useMemo, useRef, useState } from "react";
import type { MouseEvent } from "react";
import { Dropzone } from "@/components/Dropzone";
import { Button } from "@/components/ui/button";
import "../../luccca-lookbook.css";
import { useAppData } from "@/context/AppDataContext";
import type { GalleryImage } from "@/context/AppDataContext";
import { cn } from "@/lib/utils";
import { useTranslation } from "@/context/LanguageContext";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { GalleryLightbox } from "@/components/GalleryLightbox";
import { LookBookShowcase } from "@/components/LookBookShowcase";
import { GalleryOverlay } from "@/components/gallery/GalleryOverlay";
import { ResponsiveImage as ResponsiveGalleryImage } from "@/components/ResponsiveImage";
import { GallerySidebar } from "@/components/gallery/GallerySidebar";
import { GalleryTileBoards } from "@/components/gallery/GalleryTileBoards";
import { PhotoStudioPanel } from "@/components/gallery/PhotoStudioPanel";
import { PhotoQueuePanel } from "@/components/gallery/PhotoQueuePanel";
import { usePhotoUploadQueue } from "@/hooks/use-photo-upload-queue";
import type { LucideIcon } from "lucide-react";
import {
  Download,
  Droplet,
  Eraser,
  Folder,
  LassoSelect,
  Layers,
  LayoutGrid,
  Link2,
  Move,
  Paintbrush,
  PenTool,
  Pipette,
  Scissors,
  Search,
  SlidersHorizontal,
  Sparkles,
  Stamp,
  Star,
  Trash2,
  UploadCloud,
  Wand2,
} from "lucide-react";

const gridTemplates: Record<"s" | "m" | "l", string> = {
  s: "grid-cols-[repeat(auto-fill,minmax(150px,1fr))]",
  m: "grid-cols-[repeat(auto-fill,minmax(200px,1fr))]",
  l: "grid-cols-[repeat(auto-fill,minmax(260px,1fr))]",
};

const RECENT_DAYS = 30;

const DEFAULT_ADJUSTMENT: AdjustmentState = {
  exposure: 0,
  contrast: 0,
  warmth: 0,
  saturation: 0,
  focus: 0,
};

const ADJUSTMENT_CONTROLS: {
  key: keyof AdjustmentState;
  label: string;
  min: number;
  max: number;
  step?: number;
}[] = [
  { key: "exposure", label: "Exposure", min: -60, max: 60 },
  { key: "contrast", label: "Contrast", min: -50, max: 60 },
  { key: "saturation", label: "Saturation", min: -60, max: 60 },
  { key: "warmth", label: "Warmth", min: -90, max: 90, step: 1 },
  { key: "focus", label: "Focus", min: -40, max: 40 },
];

const ADJUSTMENT_PRESETS: {
  key: string;
  label: string;
  description: string;
  values: AdjustmentState;
}[] = [
  {
    key: "studio",
    label: "Studio glow",
    description: "Soft brightness, lifted warmth",
    values: { exposure: 18, contrast: 8, saturation: 12, warmth: 14, focus: 6 },
  },
  {
    key: "natural",
    label: "Natural light",
    description: "Balanced tone and color",
    values: { exposure: 6, contrast: 4, saturation: 5, warmth: -4, focus: 2 },
  },
  {
    key: "noir",
    label: "Noir high contrast",
    description: "Dramatic monochrome punch",
    values: { exposure: -8, contrast: 28, saturation: -50, warmth: 2, focus: 10 },
  },
];

type AdjustmentState = {
  exposure: number;
  contrast: number;
  warmth: number;
  saturation: number;
  focus: number;
};

type SortMode = "newest" | "oldest" | "favorites" | "name";
type LibraryFilter = "all" | "favorites" | "recent" | "lookbook";

type GalleryCardProps = {
  id: string;
  name: string;
  src?: string;
  tags: string[];
  favorite?: boolean;
  unsupported?: boolean;
  active: boolean;
  selected: boolean;
  thumbSize: "s" | "m" | "l";
  onClick: (event: MouseEvent<HTMLButtonElement>) => void;
  onDoubleClick: () => void;
  onDelete: () => void;
};

type TagCluster = {
  tag: string;
  count: number;
  freshnessLabel: string;
};

type ToolConfig = {
  key: string;
  label: string;
  icon: LucideIcon;
};

type QuickActionConfig = {
  key: string;
  label: string;
  description: string;
  icon: LucideIcon;
};

type LayerInfo = {
  key: string;
  name: string;
  meta: string;
  locked?: boolean;
};

const CREATIVE_TOOLS: ToolConfig[] = [
  { key: "select", label: "Select", icon: Move },
  { key: "lasso", label: "Lasso", icon: LassoSelect },
  { key: "brush", label: "Brush", icon: Paintbrush },
  { key: "pen", label: "Pen", icon: PenTool },
  { key: "smudge", label: "Smudge", icon: Droplet },
  { key: "stamp", label: "Stamp", icon: Stamp },
  { key: "picker", label: "Color pick", icon: Pipette },
  { key: "erase", label: "Erase", icon: Eraser },
  { key: "cut", label: "Cut", icon: Scissors },
  { key: "magic", label: "Magic", icon: Wand2 },
];

const QUICK_ACTIONS: QuickActionConfig[] = [
  {
    key: "remove-bg",
    label: "Remove background",
    description: "Isolate subject automatically",
    icon: Sparkles,
  },
  {
    key: "resize",
    label: "Resize & crop",
    description: "Canvas, ratio and framing",
    icon: Move,
  },
  {
    key: "color",
    label: "Color grade",
    description: "Balance warmth and tone",
    icon: Droplet,
  },
  {
    key: "layers",
    label: "Merge layers",
    description: "Combine selected elements",
    icon: Layers,
  },
  {
    key: "heal",
    label: "Repair details",
    description: "Smudge & clone stamping",
    icon: Stamp,
  },
  {
    key: "composite",
    label: "Add overlay",
    description: "Blend another photo",
    icon: Folder,
  },
];

function GalleryCard({
  id,
  name,
  src,
  tags,
  favorite,
  unsupported,
  active,
  selected,
  thumbSize,
  onClick,
  onDoubleClick,
  onDelete,
}: GalleryCardProps) {
  const { t } = useTranslation();
  return (
    <button
      onClick={onClick}
      onDoubleClick={onDoubleClick}
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-3xl border text-left transition duration-300",
        active
          ? "ring-2 ring-sky-400 shadow-[0_35px_70px_rgba(14,165,233,0.35)]"
          : "ring-1 ring-transparent shadow-[0_22px_60px_rgba(15,23,42,0.22)]",
        selected && !active && "ring-2 ring-sky-300",
        unsupported ? "bg-slate-200 dark:bg-slate-900/45" : "bg-white dark:bg-slate-900/30 border-slate-300/50 dark:border-slate-700/60",
      )}
      data-echo-key={`card:gallery:item:${id}`}
    >
      <div className="relative">
        {unsupported ? (
          <div className="flex aspect-[4/3] w-full items-center justify-center bg-slate-300 dark:bg-slate-800 text-xs uppercase tracking-[0.3em] text-slate-700 dark:text-slate-300">
            {t("gallery.noPreview")}
          </div>
        ) : (
          <ResponsiveGalleryImage
            src={src}
            alt={name}
            width={800}
            height={600}
            aspectRatio={
              thumbSize === "s"
                ? "1/1"
                : thumbSize === "l"
                  ? "5/4"
                  : "4/3"
            }
            className={cn(
              "w-full transition duration-500 group-hover:scale-[1.05]"
            )}
            objectFit="cover"
          />
        )}
        {favorite && (
          <div className="pointer-events-none absolute right-3 bottom-3 z-20 flex items-center gap-1 rounded-full bg-black/60 dark:bg-black/60 px-2 py-1 text-[10px] uppercase tracking-[0.3em] text-amber-700 dark:text-amber-200">
            <Star className="h-3 w-3 fill-amber-400 dark:fill-amber-300 text-amber-400 dark:text-amber-300" /> Fav
          </div>
        )}
        {selected && (
          <span className="pointer-events-none absolute left-3 top-3 z-20 flex h-2.5 w-2.5 items-center justify-center rounded-full border border-white/50 bg-sky-400/80 shadow-[0_0_8px_rgba(56,189,248,0.9)]" />
        )}
        <div className="absolute right-3 top-3 z-20 flex gap-2 opacity-0 transition group-hover:opacity-100">
          <span
            role="button"
            tabIndex={0}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onDelete();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault();
                event.stopPropagation();
                onDelete();
              }
            }}
            className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-full bg-slate-300/80 dark:bg-black/70 text-slate-900 dark:text-white backdrop-blur transition hover:bg-red-400 dark:hover:bg-red-600/80 focus:outline-none focus:ring-2 focus:ring-red-300 dark:focus:ring-red-400/70"
            aria-label="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </span>
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-3 px-4 pb-4 pt-3">
        <div className="text-sm font-semibold leading-tight text-slate-900 dark:text-slate-100 line-clamp-2">{name}</div>
        {tags.length > 0 && (
          <div className="flex flex-wrap gap-2 text-[10px] uppercase tracking-[0.25em] text-sky-600 dark:text-sky-100/90">
            {tags.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-sky-400/50 bg-sky-500/15 px-2 py-0.5"
              >
                {tag}
              </span>
            ))}
            {tags.length > 3 && (
              <span className="rounded-full bg-black/40 px-2 py-0.5">+{tags.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </button>
  );
}

export default function GallerySection() {
  const { t } = useTranslation();
  const {
    images,
    lookbooks,
    tileBoards,
    addLookBook,
    addImagesToLookBook,
    removeImagesFromLookBook,
    deleteLookBook,
    updateLookBook,
    addImages,
    linkImagesToRecipesByFilename,
    addTagsToImages,
    updateImage,
    exportAllZip,
    restoreDemo,
    deleteImage,
    createTileBoard,
    updateTileBoard,
    deleteTileBoard,
    addTileToBoard,
    updateTileInBoard,
    removeTileFromBoard,
  } = useAppData();

  const [status, setStatus] = useState<string | null>(null);
  const [showTagDialog, setShowTagDialog] = useState(false);
  const [importTags, setImportTags] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [filter, setFilter] = useState("");
  const [sort, setSort] = useState<SortMode>("newest");
  const [thumbSize, setThumbSize] = useState<"s" | "m" | "l">("s");
  const lucccaMode = true;
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>("all");
  const [activeLookBookId, setActiveLookBookId] = useState<string | null>(null);
  const [openLookBook, setOpenLookBook] = useState(false);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [nameDraft, setNameDraft] = useState("");
  const [tagDraft, setTagDraft] = useState("");
  const [bulkTagDraft, setBulkTagDraft] = useState("");
  const [lightboxOpen, setLightboxOpen] = useState(false);
  const [lightboxIndex, setLightboxIndex] = useState(0);
  const [urlText, setUrlText] = useState("");
  const [urlLoading, setUrlLoading] = useState(false);
  const [adjustments, setAdjustments] = useState<Record<string, AdjustmentState>>({});
  const [presetMap, setPresetMap] = useState<Record<string, string | null>>({});
  const [activeTool, setActiveTool] = useState<string>(CREATIVE_TOOLS[0].key);
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [visibleLayers, setVisibleLayers] = useState<Record<string, boolean>>({});
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [galleryView, setGalleryView] = useState<"grid" | "tiles">("grid");
  const [activeTileBoardId, setActiveTileBoardId] = useState<string | null>(null);
  const [uploadLoading, setUploadLoading] = useState(false);
  const { queue, addPhotos, removePhoto, updatePhoto, clearQueue, stats } = usePhotoUploadQueue();
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});

  const uploadInputRef = useRef<HTMLInputElement | null>(null);

  // File size limits
  const MAX_FILE_SIZE = 50 * 1024 * 1024; // 50MB per file
  const MAX_TOTAL_SIZE = 500 * 1024 * 1024; // 500MB total per batch
  const SUPPORTED_FORMATS = ["image/jpeg", "image/png", "image/webp", "image/gif"];

  const favoriteCount = useMemo(
    () => images.filter((img) => img.favorite).length,
    [images],
  );

  const recentThreshold = useMemo(
    () => Date.now() - RECENT_DAYS * 24 * 60 * 60 * 1000,
    [],
  );

  const recentCount = useMemo(
    () =>
      images.filter((img) =>
        typeof img.createdAt === "number" && img.createdAt > 0
          ? img.createdAt >= recentThreshold
          : false,
      ).length,
    [images, recentThreshold],
  );

  const activeLookBook = useMemo(
    () => lookbooks.find((book) => book.id === activeLookBookId) ?? null,
    [lookbooks, activeLookBookId],
  );

  const tagClusters = useMemo<TagCluster[]>(() => {
    if (!images.length) return [];
    const stats = new Map<string, { count: number; lastSeen: number }>();
    const fallbackTag = "Untagged";

    images.forEach((img) => {
      const createdAt = typeof img.createdAt === "number" ? img.createdAt : 0;
      const tags = img.tags && img.tags.length > 0 ? img.tags : [fallbackTag];
      tags.forEach((raw) => {
        const tag = raw.trim() || fallbackTag;
        const current = stats.get(tag) ?? { count: 0, lastSeen: 0 };
        stats.set(tag, {
          count: current.count + 1,
          lastSeen: Math.max(current.lastSeen, createdAt),
        });
      });
    });

    const now = Date.now();

    return Array.from(stats.entries())
      .sort((a, b) => {
        if (b[1].count !== a[1].count) return b[1].count - a[1].count;
        return b[1].lastSeen - a[1].lastSeen;
      })
      .slice(0, 6)
      .map(([tag, meta]) => {
        const days = meta.lastSeen ? Math.floor((now - meta.lastSeen) / (1000 * 60 * 60 * 24)) : null;
        let freshnessLabel = "Archive";
        if (days === null) {
          freshnessLabel = "Untimed";
        } else if (days <= 2) {
          freshnessLabel = "Fresh";
        } else if (days <= 7) {
          freshnessLabel = "This week";
        } else if (days <= 30) {
          freshnessLabel = "Recent";
        }
        return {
          tag,
          count: meta.count,
          freshnessLabel,
        };
      });
  }, [images]);

  const filtered = useMemo(() => {
    let base = images.slice();

    if (libraryFilter === "favorites") {
      base = base.filter((img) => img.favorite);
    } else if (libraryFilter === "recent") {
      base = base.filter((img) =>
        typeof img.createdAt === "number" && img.createdAt >= recentThreshold,
      );
    } else if (libraryFilter === "lookbook" && activeLookBook) {
      const set = new Set(activeLookBook.imageIds);
      base = base.filter((img) => set.has(img.id));
    }

    if (filter.trim()) {
      const query = filter.trim().toLowerCase();
      base = base.filter((img) => {
        const tagMatch = (img.tags || []).some((tag) => tag.toLowerCase().includes(query));
        return img.name.toLowerCase().includes(query) || tagMatch;
      });
    }

    const sorted = base.slice();
    sorted.sort((a, b) => {
      const aDate = typeof a.createdAt === "number" ? a.createdAt : 0;
      const bDate = typeof b.createdAt === "number" ? b.createdAt : 0;
      switch (sort) {
        case "favorites":
          if (Boolean(b.favorite) !== Boolean(a.favorite)) {
            return Number(b.favorite) - Number(a.favorite);
          }
          return bDate - aDate;
        case "oldest":
          return aDate - bDate;
        case "name":
          return a.name.localeCompare(b.name);
        case "newest":
        default:
          return bDate - aDate;
      }
    });

    return sorted;
  }, [
    images,
    libraryFilter,
    activeLookBook,
    filter,
    sort,
    recentThreshold,
  ]);

  useEffect(() => {
    setSelectedIds((prev) => prev.filter((id) => filtered.some((img) => img.id === id)));
  }, [filtered]);

  useEffect(() => {
    if (!filtered.length) {
      setActiveId(null);
      return;
    }
    if (!activeId || !filtered.some((img) => img.id === activeId)) {
      setActiveId(filtered[0].id);
    }
  }, [filtered, activeId]);

  useEffect(() => {
    if (!activeTileBoardId && tileBoards.length > 0) {
      setActiveTileBoardId(tileBoards[0].id);
    }
  }, [tileBoards, activeTileBoardId]);

  const activeImage = useMemo(
    () => images.find((img) => img.id === activeId) ?? null,
    [images, activeId],
  );

  useEffect(() => {
    if (activeImage) {
      setNameDraft(activeImage.name);
      setTagDraft((activeImage.tags || []).join(", "));
    } else {
      setNameDraft("");
      setTagDraft("");
    }
  }, [activeImage?.id]);

  const layerList = useMemo<LayerInfo[]>(() => {
    if (!activeImage) return [];
    const tags = activeImage.tags || [];
    const overlays = tags.slice(0, 2).map((tag, index) => ({
      key: `tag-${index}`,
      name: `${tag} overlay`,
      meta: "Tag layer",
    }));
    return [
      { key: "base", name: activeImage.name, meta: "Raster", locked: true },
      ...overlays,
      { key: "color-grade", name: "Color grade", meta: "Adjustment" },
      { key: "retouch", name: "Retouch", meta: "Stamp blend" },
    ];
  }, [activeImage]);

  const activeToolLabel = useMemo(
    () => CREATIVE_TOOLS.find((tool) => tool.key === activeTool)?.label ?? "Select",
    [activeTool],
  );

  useEffect(() => {
    setVisibleLayers((prev) => {
      const next: Record<string, boolean> = {};
      layerList.forEach((layer) => {
        next[layer.key] = prev[layer.key] ?? true;
      });
      return next;
    });
  }, [layerList]);

  const toggleLayerVisibility = (layerKey: string) => {
    setVisibleLayers((prev) => ({
      ...prev,
      [layerKey]: !(prev[layerKey] ?? true),
    }));
  };

  const handleQuickAction = (action: QuickActionConfig | { key: string; label: string }) => {
    setActiveQuickAction(action.key);
    setStatus(`${action.label} staged. Fine tune with creative tools.`);
  };

  const activeAdjustment = useMemo<AdjustmentState>(() => {
    if (!activeId) return { ...DEFAULT_ADJUSTMENT };
    const stored = adjustments[activeId] ?? DEFAULT_ADJUSTMENT;
    return {
      exposure: stored.exposure ?? 0,
      contrast: stored.contrast ?? 0,
      warmth: stored.warmth ?? 0,
      saturation: stored.saturation ?? 0,
      focus: stored.focus ?? 0,
    };
  }, [activeId, adjustments]);

  const activePresetKey = activeId ? presetMap[activeId] ?? null : null;
  const peerSelectionCount = activeId ? selectedIds.filter((id) => id !== activeId).length : selectedIds.length;
  const isActiveInSelection = activeId ? selectedIds.includes(activeId) : false;
  const canApplyAdjustmentsToSelection = peerSelectionCount > 0;

  const inspectorImageStyle = useMemo(() => {
    const { exposure, contrast, warmth, saturation, focus } = activeAdjustment;
    const filterParts = [
      `brightness(${(1 + exposure / 80).toFixed(3)})`,
      `contrast(${(1 + contrast / 80 + Math.max(focus, 0) / 140).toFixed(3)})`,
      `saturate(${(1 + saturation / 80).toFixed(3)})`,
      `hue-rotate(${warmth}deg)`,
    ];
    if (focus < 0) {
      filterParts.push(`blur(${(Math.abs(focus) / 14).toFixed(2)}px)`);
    }
    const boxShadow = focus > 10
      ? `0 28px 60px rgba(14,165,233,${Math.min(0.45, 0.2 + focus / 120).toFixed(2)})`
      : "0 26px 60px rgba(15,23,42,0.3)";
    return {
      filter: filterParts.join(" "),
      boxShadow,
    } as const;
  }, [activeAdjustment]);

  const handleFiles = (files: File[]) => {
    if (!files.length) return;
    const { added, errors } = addPhotos(files);

    if (errors.length > 0) {
      setStatus(`⚠️ ${errors[0]}`);
    }

    if (added.length > 0) {
      setStatus(`✓ Added ${added.length} file${added.length !== 1 ? "s" : ""} to queue. ${stats.total - added.length} more can be added.`);
    }
  };

  const handleProcessQueue = async () => {
    const filesToUpload = queue.filter((p) => p.status === "pending");
    if (filesToUpload.length === 0) return;

    setUploadLoading(true);
    setStatus(`Uploading ${filesToUpload.length} file${filesToUpload.length !== 1 ? "s" : ""}...`);

    let successCount = 0;
    const newProgress: Record<string, number> = {};

    for (const queuedPhoto of filesToUpload) {
      updatePhoto(queuedPhoto.id, { status: "uploading" });
      newProgress[queuedPhoto.id] = 0;
      setUploadProgress(newProgress);

      try {
        // Simulate upload progress
        for (let i = 1; i <= 10; i++) {
          await new Promise((resolve) => setTimeout(resolve, 50));
          newProgress[queuedPhoto.id] = i / 10;
          setUploadProgress({ ...newProgress });
        }

        // Add images with tags
        const added = await addImages([queuedPhoto.file], { tags: queuedPhoto.tags });
        if (added > 0) {
          updatePhoto(queuedPhoto.id, { status: "success" });
          successCount += added;
        } else {
          updatePhoto(queuedPhoto.id, { status: "error", error: "Failed to process image" });
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : "Unknown error";
        updatePhoto(queuedPhoto.id, { status: "error", error: errorMessage });
        console.error("Error uploading photo:", error);
      }
    }

    setUploadLoading(false);
    const failedCount = filesToUpload.length - successCount;
    const summary = `✓ Uploaded ${successCount} image${successCount === 1 ? "" : "s"}`;
    const errorSummary = failedCount > 0 ? ` (${failedCount} file${failedCount !== 1 ? "s" : ""} failed)` : "";
    setStatus(summary + errorSummary);
  };

  const handleConfirmImport = async () => {
    const files: File[] = (window as any).__pending_files || [];
    if (!files.length) {
      setShowTagDialog(false);
      return;
    }
    const tags = importTags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    setShowTagDialog(false);

    // Validate files before uploading
    const validationErrors: string[] = [];
    let totalSize = 0;
    const validFiles: File[] = [];

    for (const file of files) {
      // Check file size
      if (file.size > MAX_FILE_SIZE) {
        validationErrors.push(`${file.name}: File exceeds 50MB limit (${(file.size / 1024 / 1024).toFixed(1)}MB)`);
        continue;
      }

      // Check file format
      if (!SUPPORTED_FORMATS.includes(file.type)) {
        validationErrors.push(`${file.name}: Unsupported format. Only JPEG, PNG, WebP, and GIF are supported.`);
        continue;
      }

      totalSize += file.size;
      validFiles.push(file);
    }

    // Check total size
    if (totalSize > MAX_TOTAL_SIZE) {
      validationErrors.push(`Total upload size exceeds 500MB limit. Please upload fewer files.`);
    }

    // Report validation errors
    if (validationErrors.length > 0) {
      setStatus(`⚠️ ${validationErrors[0]} (${validationErrors.length} file${validationErrors.length !== 1 ? "s" : ""} failed validation)`);
      console.warn("File validation errors:", validationErrors);
    }

    if (validFiles.length === 0) {
      setStatus("❌ No valid files to upload. Please check file formats and sizes.");
      (window as any).__pending_files = undefined;
      return;
    }

    setUploadLoading(true);
    setStatus(`Uploading ${validFiles.length} file${validFiles.length !== 1 ? "s" : ""}...`);
    console.debug("Starting image import with tags:", tags);
    try {
      const added = await addImages(validFiles, { tags });
      if (added === 0) {
        setStatus(`⚠️ No images added. ${validationErrors.length > 0 ? validationErrors[0] : "Please check file formats."}`);
        console.warn("No images were successfully added");
      } else {
        const summary = `✓ Added ${added} image${added === 1 ? "" : "s"}`;
        const failedCount = validFiles.length - added;
        const errorSummary = failedCount > 0 ? ` (${failedCount} file${failedCount !== 1 ? "s" : ""} could not be processed)` : "";
        setStatus(summary + errorSummary);
        console.info("Successfully added", added, "images");
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      setStatus(`❌ Error uploading images: ${errorMessage}`);
      console.error("Error importing images:", error);
    } finally {
      setUploadLoading(false);
    }
    (window as any).__pending_files = undefined;
  };

  const handleUploadClick = () => {
    uploadInputRef.current?.click();
  };

  const handleSelectCard = (event: MouseEvent<HTMLButtonElement>, id: string) => {
    const multi = event.metaKey || event.ctrlKey;
    setActiveId(id);
    if (multi) {
      setSelectedIds((prev) =>
        prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
      );
    } else {
      setSelectedIds([id]);
    }
  };

  const handleOpenLightbox = (id: string) => {
    const index = filtered.findIndex((img) => img.id === id);
    if (index >= 0) {
      setLightboxIndex(index);
      setLightboxOpen(true);
    }
  };

  const toggleFavorite = (id: string) => {
    const current = images.find((img) => img.id === id);
    if (!current) return;
    updateImage(id, { favorite: !current.favorite });
  };

  const handleDeleteImage = (id: string) => {
    if (!confirm("Delete this image?")) return;
    deleteImage(id);
    setStatus(t("common.delete"));
  };

  const handleBulkTagSubmit = () => {
    const tags = bulkTagDraft
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    if (!tags.length || !selectedIds.length) return;
    addTagsToImages(selectedIds, tags);
    setBulkTagDraft("");
    setStatus(`Tagged ${selectedIds.length} image${selectedIds.length === 1 ? "" : "s"}.`);
    setSelectedIds([]);
  };

  const handleSaveMetadata = () => {
    if (!activeImage) return;
    const name = nameDraft.trim();
    if (!name) {
      setStatus(t("gallery.nameCannotBeEmpty"));
      return;
    }
    const tags = tagDraft
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    updateImage(activeImage.id, { name, tags });
    setStatus(t("gallery.preparingExport"));
  };

  const handleResetMetadata = () => {
    if (!activeImage) return;
    setNameDraft(activeImage.name);
    setTagDraft((activeImage.tags || []).join(", "));
    setStatus(t("gallery.clearSelection"));
  };

  const handleToggleLookbookMembership = (lookbookId: string, enabled: boolean) => {
    if (!activeImage) return;
    if (enabled) {
      addImagesToLookBook(lookbookId, [activeImage.id]);
    setStatus(t("gallery.preparingExport"));
    } else {
      removeImagesFromLookBook(lookbookId, [activeImage.id]);
    setStatus(t("gallery.clearSelection"));
    }
  };

  const handleAddImagesFromUrls = async () => {
    const urls = urlText
      .split(/\s+/)
      .map((value) => value.trim())
      .filter((value) => /^https?:\/\//i.test(value));
    if (!urls.length) {
    setStatus(t("gallery.preparingExport"));
      return;
    }
    setUrlLoading(true);
    setUploadLoading(true);
    try {
      const files: File[] = [];
      const failedUrls: string[] = [];
      for (const url of urls) {
        try {
          console.debug("Fetching image from URL:", url);
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);
          const blob = await response.blob();
          const filename =
            url.split("?")[0].split("#")[0].split("/").pop() || `image-${Date.now()}.jpg`;
          files.push(
            new File([blob], filename.replace(/[^A-Za-z0-9_.-]/g, "_"), {
              type: blob.type || "image/jpeg",
            }),
          );
        } catch (error: any) {
          console.warn("Failed to fetch image from URL:", url, error);
          failedUrls.push(url);
          setStatus(t("gallery.failedFetch").replace("{url}", url).replace("{error}", error?.message ?? "error"));
        }
      }
      if (files.length) {
        console.debug("Adding", files.length, "images from URLs");
        const added = await addImages(files, { tags: [] });
        if (added > 0) {
          setStatus(`✓ Added ${added} image${added === 1 ? "" : "s"} from URLs.${failedUrls.length > 0 ? ` (${failedUrls.length} failed)` : ""}`);
          setUrlText("");
        } else {
        setStatus(t("gallery.noImagesAdded"));
        }
      } else if (failedUrls.length > 0) {
        setStatus(t("gallery.failedFetchUrls").replace("{count}", String(failedUrls.length)));
      }
    } catch (error) {
      console.error("Error importing images from URLs:", error);
      setStatus(t("gallery.errorImportingImages"));
    } finally {
      setUrlLoading(false);
      setUploadLoading(false);
    }
  };

  const handleExportAll = async () => {
    setStatus(t("gallery.preparingExport"));
    try {
      await exportAllZip();
      setStatus(t("gallery.exportReady"));
    } catch (error) {
      const message = error instanceof Error ? error.message : null;
      setStatus(t("gallery.exportFailed"));
    }
  };

  const handleLinkRecipes = () => {
    linkImagesToRecipesByFilename();
    setStatus(t("gallery.linkRecipes"));
  };

  const handleCreateLookBook = (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return false;
    const id = addLookBook(trimmed, selectedIds);
    setSelectedIds([]);
    setActiveLookBookId(id);
    setLibraryFilter("lookbook");
    setOpenLookBook(true);
    setStatus(`Look book "${trimmed}" created.`);
    return true;
  };

  const handlePreviewLookbook = () => {
    if (activeLookBook) {
      setOpenLookBook(true);
      return;
    }
    if (lookbooks.length > 0) {
      setActiveLookBookId(lookbooks[0].id);
      setLibraryFilter("lookbook");
      setOpenLookBook(true);
      return;
    }
    setStatus("Create a look book to preview flip motion.");
  };

  const handleRenameLookBook = (id: string, name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    updateLookBook(id, { name: trimmed });
    setStatus(`Look book renamed to ${trimmed}.`);
  };

  const handleDeleteLookBook = (id: string) => {
    deleteLookBook(id);
    if (activeLookBookId === id) {
      setActiveLookBookId(null);
      setLibraryFilter("all");
    }
    setStatus("Look book removed.");
  };

  const updateAdjustment = (key: keyof AdjustmentState, value: number) => {
    if (!activeId) return;
    setAdjustments((prev) => {
      const existing = prev[activeId] ?? DEFAULT_ADJUSTMENT;
      const next = { ...existing, [key]: value };
      return { ...prev, [activeId]: next };
    });
    setPresetMap((prev) => ({ ...prev, [activeId]: null }));
  };

  const resetAdjustments = () => {
    if (!activeId) return;
    setAdjustments((prev) => {
      const next = { ...prev };
      delete next[activeId];
      return next;
    });
    setPresetMap((prev) => {
      const next = { ...prev };
      delete next[activeId];
      return next;
    });
  };

  const applyPresetToActive = (presetKey: string) => {
    if (!activeId) return;
    const preset = ADJUSTMENT_PRESETS.find((item) => item.key === presetKey);
    if (!preset) return;
    setAdjustments((prev) => ({ ...prev, [activeId]: { ...preset.values } }));
    setPresetMap((prev) => ({ ...prev, [activeId]: presetKey }));
    setStatus(`Preset "${preset.label}" applied.`);
  };

  const applyAdjustmentsToSelection = () => {
    if (!activeId) return;
    const peers = selectedIds.filter((id) => id !== activeId);
    if (peers.length === 0) return;
    const current = adjustments[activeId] ?? DEFAULT_ADJUSTMENT;
    setAdjustments((prev) => {
      const next = { ...prev };
      peers.forEach((peer) => {
        next[peer] = { ...current };
      });
      return next;
    });
    setPresetMap((prev) => {
      const next = { ...prev };
      const presetKey = prev[activeId] ?? null;
      peers.forEach((peer) => {
        next[peer] = presetKey;
      });
      return next;
    });
    setStatus(`Synced adjustments to ${peers.length} image${peers.length === 1 ? "" : "s"}.`);
  };

  const handleBulkFavorite = (favorite: boolean) => {
    if (!selectedIds.length) return;
    selectedIds.forEach((id) => {
      const current = images.find((img) => img.id === id);
      if (current && current.favorite !== favorite) {
        updateImage(id, { favorite });
      }
    });
    setStatus(
      favorite
        ? `Marked ${selectedIds.length} image${selectedIds.length === 1 ? "" : "s"} as favorite.`
        : `Removed favorite from ${selectedIds.length} image${selectedIds.length === 1 ? "" : "s"}.`,
    );
    if (!favorite) {
      setSelectedIds([]);
    }
  };

  const shellClass = lucccaMode
    ? "luccca-theme border-slate-800/70 bg-slate-950/92 text-slate-100 shadow-[0_90px_200px_rgba(14,165,233,0.4)]"
    : "border-slate-300/80 bg-white text-slate-900 shadow-[0_20px_60px_rgba(15,23,42,0.16),0_8px_20px_rgba(59,130,246,0.12)]";

  const navSurface = lucccaMode
    ? "border-slate-700/60 bg-slate-900/75"
    : "border-slate-300/70 bg-gradient-to-b from-slate-50 to-white shadow-sm";
  const mainSurface = lucccaMode
    ? "border-slate-700/60 bg-slate-900/70"
    : "border-slate-300/70 bg-white shadow-sm";
  const detailSurface = lucccaMode
    ? "border-slate-700/60 bg-slate-900/75"
    : "border-slate-300/70 bg-white shadow-sm";
  const subtleSurface = lucccaMode
    ? "border-slate-700/50 bg-slate-900/60 text-slate-200"
    : "border-slate-300/60 bg-slate-50 text-slate-800";

  return (
    <div
      className={cn(
        "relative mx-auto max-w-[1640px] space-y-4 rounded-[48px] border px-4 py-5 sm:px-8 lg:px-10 lg:py-7",
        shellClass,
      )}
      data-echo-key="page:recipes:gallery"
    >
      <div className="grid gap-5 lg:min-h-[calc(100vh-170px)] lg:grid-cols-[230px_minmax(0,1fr)_320px] xl:min-h-[calc(100vh-190px)]">
        <GallerySidebar
          totalCount={images.length}
          favoriteCount={favoriteCount}
          recentCount={recentCount}
          activeFilter={libraryFilter}
          activeLookBookId={activeLookBookId}
          tagClusters={tagClusters}
          lookbooks={lookbooks}
          selectedIdsCount={selectedIds.length}
          surfaceClassName={navSurface}
          onFilterChange={(value) => {
            setLibraryFilter(value);
            if (value !== "lookbook") {
              setActiveLookBookId(null);
            }
            if (value !== "all") {
              setFilter("");
            }
          }}
          onLookbookChange={(id) => {
            if (id) {
              setActiveLookBookId(id);
              setLibraryFilter("lookbook");
            } else {
              setActiveLookBookId(null);
              setLibraryFilter("all");
            }
          }}
          onTagSelect={(tag) => {
            setFilter(tag);
          }}
          onRestoreDemo={() => {
            restoreDemo();
            setStatus("Demo gallery restored.");
          }}
          onCreateLookBook={handleCreateLookBook}
          onPreviewLookbook={handlePreviewLookbook}
          onRenameLookBook={handleRenameLookBook}
          onDeleteLookBook={handleDeleteLookBook}
          onDropFiles={handleFiles}
        />

        <Dropzone
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif"
          onFiles={handleFiles}
          busy={uploadLoading}
          className={cn("relative overflow-hidden rounded-[32px] border", mainSurface)}
        >
          <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(125,211,252,0.14),_transparent_70%)]" />
          <div className="relative flex h-full flex-col">
            <div className="relative z-20 flex flex-col gap-4 px-6 pt-6 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2 rounded-full border border-slate-300/50 dark:border-white/10 bg-slate-100 dark:bg-black/45 px-4 py-2 text-[11px] uppercase tracking-[0.35em] text-slate-900 dark:text-slate-200">
                  <button
                    type="button"
                    onClick={() => setGalleryView("grid")}
                    className={cn(
                      "rounded-full px-3 py-1 transition",
                      galleryView === "grid"
                        ? "bg-sky-500 text-black"
                        : "bg-transparent text-slate-900 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-200",
                    )}
                  >
                    Photo grid
                  </button>
                  <button
                    type="button"
                    onClick={() => setGalleryView("tiles")}
                    className={cn(
                      "rounded-full px-3 py-1 transition",
                      galleryView === "tiles"
                        ? "bg-sky-500 text-black"
                        : "bg-transparent text-slate-900 dark:text-slate-200 hover:text-sky-700 dark:hover:text-sky-200",
                    )}
                  >
                    Tile boards
                  </button>
                </div>
              </div>
              <div className="space-y-2">
                <div className="rounded-lg border border-[#c8a97e]/30 bg-gradient-to-r from-[#c8a97e]/5 to-blue-500/5 px-4 py-2 text-xs text-[#c8a97e]/80/80">
                  💡 <span className="font-medium">Quick tip:</span> {t("gallery.quickTip")}
                </div>
                <div className="rounded-lg border border-emerald-400/30 bg-gradient-to-r from-emerald-500/5 to-green-500/5 px-4 py-2 text-xs text-emerald-200/80">
                  ✓ <span className="font-medium">Production ready:</span> {t("gallery.productionReady")}
                </div>
              </div>
              {galleryView === "grid" && (
                <div className="flex justify-center">
                  <GalleryToolbar
                    filter={filter}
                    onFilterChange={setFilter}
                    sort={sort}
                    onSortChange={setSort}
                    thumbSize={thumbSize}
                    onThumbSizeChange={setThumbSize}
                    onUpload={handleUploadClick}
                    onExport={handleExportAll}
                    onLink={handleLinkRecipes}
                  />
                </div>
              )}
            </div>

            <div className="relative flex-1">
              {galleryView === "grid" && selectedIds.length > 0 && (
                <div className="pointer-events-none absolute inset-x-0 bottom-6 z-30 flex justify-center px-3">
                  <GalleryBulkActions
                    count={selectedIds.length}
                    bulkTagDraft={bulkTagDraft}
                    onBulkTagChange={setBulkTagDraft}
                    onApplyTags={handleBulkTagSubmit}
                    onClear={() => setSelectedIds([])}
                    onFavorite={() => handleBulkFavorite(true)}
                    onUnfavorite={() => handleBulkFavorite(false)}
                  />
                </div>
              )}

              <div className="pointer-events-none absolute bottom-6 left-6 z-30 hidden max-w-[320px] md:block">
                <GalleryDropHint t={t} />
              </div>

              {galleryView === "grid" ? (
                <GalleryGrid
                  images={filtered}
                  thumbSize={thumbSize}
                  activeId={activeId}
                  selectedIds={selectedIds}
                  onSelect={handleSelectCard}
                  onOpenLightbox={handleOpenLightbox}
                  onDelete={handleDeleteImage}
                  gridTemplates={gridTemplates}
                  onRestoreDemo={() => {
                    restoreDemo();
                    setStatus("Demo gallery restored.");
                  }}
                />
              ) : (
                <div className="flex h-full flex-col overflow-hidden">
                  <GalleryTileBoards
                    boards={tileBoards}
                    images={images}
                    selectedImageIds={selectedIds}
                    activeBoardId={activeTileBoardId}
                    onSelectBoard={(id) => setActiveTileBoardId(id)}
                    onCreateBoard={(name) => {
                      const newId = createTileBoard({
                        name,
                        category: "custom",
                        imageIds: selectedIds,
                      });
                      setActiveTileBoardId(newId);
                      setStatus(`Tile board "${name}" created.`);
                    }}
                    onRenameBoard={(id, name) => {
                      updateTileBoard(id, { name });
                      setStatus(`Board renamed to ${name}.`);
                    }}
                    onDeleteBoard={(id) => {
                      deleteTileBoard(id);
                      setActiveTileBoardId((prev) =>
                        prev === id
                          ? tileBoards.filter((board) => board.id !== id)[0]?.id ?? null
                          : prev,
                      );
                      setStatus("Board removed.");
                    }}
                    onAddTiles={(boardId, imageIds) => {
                      if (!imageIds.length) return;
                      const unique = Array.from(new Set(imageIds));
                      unique.forEach((imageId, index) => {
                        const image = images.find((item) => item.id === imageId) ?? null;
                        addTileToBoard(boardId, {
                          title: image?.name ?? `Tile ${index + 1}`,
                          subtitle: image ? "Imported from gallery" : undefined,
                          imageId: image?.id ?? null,
                          tags: image?.tags ?? [],
                          layout: index % 2 === 0 ? "landscape" : "portrait",
                          accent: ["#38bdf8", "#f472b6", "#a855f7", "#facc15"][index % 4],
                        });
                      });
                      setStatus(`Added ${unique.length} tile${unique.length === 1 ? "" : "s"} to board.`);
                      setSelectedIds([]);
                    }}
                    onUpdateTile={(boardId, tileId, patch) => {
                      updateTileInBoard(boardId, tileId, patch);
                      setStatus("Tile updated.");
                    }}
                    onRemoveTile={(boardId, tileId) => {
                      removeTileFromBoard(boardId, tileId);
                      setStatus("Tile removed.");
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </Dropzone>

        {queue.length > 0 ? (
          <PhotoQueuePanel
            queue={queue}
            isUploading={uploadLoading}
            onRemovePhoto={removePhoto}
            onUpdatePhoto={updatePhoto}
            onProcessQueue={handleProcessQueue}
            onClearQueue={clearQueue}
            uploadProgress={uploadProgress}
          />
        ) : (
          <PhotoStudioPanel
            surfaceClassName={detailSurface}
            activeImage={activeImage}
            adjustments={activeAdjustment}
            adjustmentControls={ADJUSTMENT_CONTROLS}
            adjustmentPresets={ADJUSTMENT_PRESETS}
            activePresetKey={activePresetKey}
            onApplyPreset={applyPresetToActive}
            onResetAdjustments={resetAdjustments}
            onUpdateAdjustment={updateAdjustment}
            onApplyAdjustmentsToSelection={applyAdjustmentsToSelection}
            canApplyAdjustmentsToSelection={canApplyAdjustmentsToSelection}
            selectionCount={selectedIds.length}
            creativeTools={CREATIVE_TOOLS}
            quickActions={QUICK_ACTIONS}
            activeTool={activeTool}
            activeToolLabel={activeToolLabel}
            onSelectTool={setActiveTool}
            activeQuickAction={activeQuickAction}
            onQuickAction={handleQuickAction}
            layerList={layerList}
            visibleLayers={visibleLayers}
            onToggleLayer={toggleLayerVisibility}
            onToggleFavorite={toggleFavorite}
            inspectorImageStyle={inspectorImageStyle}
            onOpenLightbox={handleOpenLightbox}
            onLaunchStudio={() => setOverlayOpen(true)}
            nameDraft={nameDraft}
            onNameDraftChange={setNameDraft}
            tagDraft={tagDraft}
            onTagDraftChange={setTagDraft}
            onSaveMetadata={handleSaveMetadata}
            onResetMetadata={handleResetMetadata}
            lookbooks={lookbooks}
            onToggleLookbook={handleToggleLookbookMembership}
            onDropFiles={handleFiles}
            urlText={urlText}
            onUrlTextChange={setUrlText}
            urlLoading={urlLoading}
            onImportByUrl={handleAddImagesFromUrls}
            selectedIdsCount={selectedIds.length}
            isActiveInSelection={isActiveInSelection}
          />
        )}
      </div>

      {status && (
        <div className={cn("rounded-[24px] border px-4 py-3 text-sm", subtleSurface)}>{status}</div>
      )}

      <input
        ref={uploadInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(event) => {
          const files = Array.from(event.target.files || []);
          if (files.length) handleFiles(files);
          if (uploadInputRef.current) uploadInputRef.current.value = "";
        }}
      />

      <Dialog open={showTagDialog} onOpenChange={setShowTagDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Tag images on import</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <input
              value={importTags}
              onChange={(event) => setImportTags(event.target.value)}
              placeholder={t("recipeSearch.searchByName")}
              className="w-full rounded-md border bg-background px-3 py-2"
            />
            <div className="flex justify-end gap-2">
              <Button variant="secondary" onClick={() => setShowTagDialog(false)}>
                Cancel
              </Button>
              <Button onClick={handleConfirmImport}>Import</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <GalleryLightbox
        open={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
        images={filtered.map((image) => ({
          id: image.id,
          src: image.dataUrl || image.blobUrl,
          name: image.name,
          favorite: image.favorite,
          unsupported: image.unsupported,
        }))}
        index={lightboxIndex}
        onPrev={() => setLightboxIndex((index) => (index - 1 + filtered.length) % filtered.length)}
        onNext={() => setLightboxIndex((index) => (index + 1) % filtered.length)}
        onToggleFavorite={toggleFavorite}
        className={lucccaMode ? "luccca-theme lightbox-overlay" : ""}
      />

      <LookBookShowcase
        open={openLookBook}
        onClose={() => setOpenLookBook(false)}
        title={activeLookBook?.name}
        images={(activeLookBook?.imageIds || []).map((id) => {
          const img = images.find((item) => item.id === id);
          const tags = img?.tags || [];
          return {
            id,
            src: img?.dataUrl || img?.blobUrl,
            name: img?.name,
            tags,
            description:
              tags.length > 0
                ? `Highlights ${tags.slice(0, 3).join(" · ")}${tags.length > 3 ? " +" : ""}`
                : undefined,
          };
        })}
        className={lucccaMode ? "luccca-theme" : ""}
      />

      <GalleryOverlay
        open={overlayOpen}
        onClose={() => setOverlayOpen(false)}
        image={activeImage}
        adjustments={activeAdjustment}
        activeTool={activeTool}
        onSelectTool={setActiveTool}
        layers={layerList}
        visibleLayers={visibleLayers}
        onToggleLayer={toggleLayerVisibility}
        onResetAdjustments={resetAdjustments}
        onQuickAction={handleQuickAction}
        activeQuickAction={activeQuickAction}
        onSave={() => setStatus("Overlay changes saved.")}
      />
    </div>
  );
}

type GalleryToolbarProps = {
  filter: string;
  onFilterChange: (value: string) => void;
  sort: SortMode;
  onSortChange: (mode: SortMode) => void;
  thumbSize: "s" | "m" | "l";
  onThumbSizeChange: (size: "s" | "m" | "l") => void;
  onUpload: () => void;
  onExport: () => void;
  onLink: () => void;
};

function GalleryToolbar({
  filter,
  onFilterChange,
  sort,
  onSortChange,
  thumbSize,
  onThumbSizeChange,
  onUpload,
  onExport,
  onLink,
}: GalleryToolbarProps) {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-auto flex w-full max-w-3xl flex-col gap-4 rounded-[28px] border border-slate-300/50 dark:border-white/12 bg-slate-100 dark:bg-[radial-gradient(circle_at_top,_rgba(14,23,42,0.95),_rgba(14,25,48,0.72))] px-6 py-4 shadow-[0_28px_80px_rgba(15,23,42,0.55)] backdrop-blur-xl">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[220px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-sky-600 dark:text-sky-200/70" />
          <input
            value={filter}
            onChange={(event) => onFilterChange(event.target.value)}
            placeholder={t("recipeSearch.searchByName")}
            className="w-full rounded-full border border-slate-300/50 dark:border-white/15 bg-white dark:bg-white/10 pl-10 pr-3 py-2 text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-600 dark:placeholder:text-slate-300/80 focus:border-sky-400 focus:outline-none focus:ring-0"
          />
        </div>
        <div className="flex items-center gap-2 text-xs">
          <div className="flex items-center gap-1 rounded-full border border-slate-300/50 dark:border-white/14 bg-slate-200 dark:bg-black/30 px-3 py-1.5 text-slate-900 dark:text-slate-100 shadow-[0_12px_30px_rgba(8,15,30,0.38)]">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            <select
              value={sort}
              onChange={(event) => onSortChange(event.target.value as SortMode)}
              className="bg-transparent text-xs focus:outline-none text-slate-900 dark:text-slate-100"
            >
              <option value="newest">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="favorites">Favorites</option>
              <option value="name">Name</option>
            </select>
          </div>
          <div className="flex items-center gap-1 rounded-full border border-slate-300/50 dark:border-white/10 bg-slate-200 dark:bg-black/25 px-3 py-1.5 text-slate-900 dark:text-slate-100">
            <LayoutGrid className="h-3.5 w-3.5" />
            <select
              value={thumbSize}
              onChange={(event) => onThumbSizeChange(event.target.value as "s" | "m" | "l")}
              className="bg-transparent text-xs focus:outline-none text-slate-900 dark:text-slate-100"
            >
              <option value="s">Small</option>
              <option value="m">Medium</option>
              <option value="l">Large</option>
            </select>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button onClick={onUpload} className="rounded-full bg-gradient-to-r from-sky-400 via-sky-500 to-sky-400 px-5 text-black shadow-[0_18px_36px_rgba(56,189,248,0.35)] hover:from-sky-300 hover:to-sky-400">
          <UploadCloud className="mr-2 h-4 w-4" /> Upload
        </Button>
        <Button
          variant="outline"
          onClick={onExport}
          className="rounded-full border-white/30 bg-white/10 px-4 text-white hover:bg-white/20"
        >
          <Download className="mr-2 h-4 w-4" /> Export ZIP
        </Button>
        <Button
          variant="secondary"
          onClick={onLink}
          className="rounded-full bg-white/90 px-4 text-slate-900 shadow-[0_18px_36px_rgba(255,255,255,0.25)] hover:bg-white"
        >
          <Link2 className="mr-2 h-4 w-4" /> Link recipes
        </Button>
      </div>
    </div>
  );
}

type GalleryBulkActionsProps = {
  count: number;
  bulkTagDraft: string;
  onBulkTagChange: (value: string) => void;
  onApplyTags: () => void;
  onClear: () => void;
  onFavorite: () => void;
  onUnfavorite: () => void;
};

function GalleryBulkActions({
  count,
  bulkTagDraft,
  onBulkTagChange,
  onApplyTags,
  onClear,
  onFavorite,
  onUnfavorite,
}: GalleryBulkActionsProps) {
  const { t } = useTranslation();
  return (
    <div className="pointer-events-auto flex max-w-2xl flex-wrap items-center gap-3 rounded-full border border-slate-300/50 dark:border-white/12 bg-slate-100 dark:bg-black/65 px-5 py-3 text-xs text-slate-900 dark:text-slate-100 shadow-[0_20px_60px_rgba(15,23,42,0.45)] backdrop-blur-lg">
      <span className="font-semibold uppercase tracking-[0.3em]">{count} selected</span>
      <input
        value={bulkTagDraft}
        onChange={(event) => onBulkTagChange(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            onApplyTags();
          }
        }}
        placeholder={t("gallery.applyTags")}
        className="flex-1 rounded-full border border-transparent bg-slate-200 dark:bg-black/30 px-3 py-1 text-xs text-slate-900 dark:text-slate-100 placeholder:text-slate-600 dark:placeholder:text-slate-400 focus:border-sky-400 focus:outline-none"
      />
      <Button size="sm" className="rounded-full px-4" onClick={onApplyTags}>
        {t("gallery.applyTags")}
      </Button>
      <Button size="sm" variant="ghost" className="rounded-full px-4" onClick={onFavorite}>
        {t("gallery.markFavorite")}
      </Button>
      <Button size="sm" variant="ghost" className="rounded-full px-4" onClick={onUnfavorite}>
        {t("gallery.clearFavorite")}
      </Button>
      <Button size="sm" variant="ghost" className="rounded-full px-4" onClick={onClear}>
        {t("gallery.clearSelection")}
      </Button>
    </div>
  );
}

function GalleryDropHint({ t }: { t: (key: string) => string }) {
  return (
    <div className="pointer-events-none rounded-2xl border border-dashed border-[#c8a97e]/40 bg-gradient-to-r from-[#c8a97e]/10 to-blue-500/10 px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-[#c8a97e]/80 shadow-lg shadow-[#c8a97e]-500/20">
      💡 {t("gallery.dragDropHint")}
    </div>
  );
}

type GalleryGridProps = {
  images: GalleryImage[];
  thumbSize: "s" | "m" | "l";
  activeId: string | null;
  selectedIds: string[];
  onSelect: (event: MouseEvent<HTMLButtonElement>, id: string) => void;
  onOpenLightbox: (id: string) => void;
  onDelete: (id: string) => void;
  gridTemplates: Record<"s" | "m" | "l", string>;
  onRestoreDemo: () => void;
};

function GalleryGrid({
  images,
  thumbSize,
  activeId,
  selectedIds,
  onSelect,
  onOpenLightbox,
  onDelete,
  gridTemplates,
  onRestoreDemo,
}: GalleryGridProps) {
  const { t } = useTranslation();
  if (!images.length) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-6 text-sm">
        <div className="max-w-xs text-center space-y-2">
          <UploadCloud className="mx-auto h-12 w-12 text-slate-300 dark:text-slate-600" />
          <div className="text-lg font-semibold text-slate-900 dark:text-slate-100">
            No images in gallery
          </div>
          <p className="text-sm text-slate-600 dark:text-slate-400">
            Drag and drop images here, or use the upload button to add photos to your gallery.
          </p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button variant="outline" className="rounded-full" onClick={() => onRestoreDemo()}>
            Load demo images
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto px-6 pb-10">
      <div
        className={cn(
          "grid gap-5",
          gridTemplates[thumbSize],
        )}
        data-echo-key="section:gallery:grid"
      >
        {images.map((image) => (
          <GalleryCard
            key={image.id}
            id={image.id}
            name={image.name}
            src={image.dataUrl || image.blobUrl}
            tags={image.tags || []}
            favorite={image.favorite}
            unsupported={image.unsupported}
            active={activeId === image.id}
            selected={selectedIds.includes(image.id)}
            thumbSize={thumbSize}
            onClick={(event) => onSelect(event, image.id)}
            onDoubleClick={() => onOpenLightbox(image.id)}
            onDelete={() => onDelete(image.id)}
          />
        ))}
      </div>
    </div>
  );
}
