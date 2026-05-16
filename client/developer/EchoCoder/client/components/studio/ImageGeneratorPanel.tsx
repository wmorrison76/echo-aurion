import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";

const SIZE_OPTIONS = [
  { value: "1024x1024", label: "Square · 1024" },
  { value: "1024x1536", label: "Portrait · 1024×1536" },
  { value: "1536x1024", label: "Landscape · 1536×1024" },
  { value: "auto", label: "Auto (let OpenAI choose)" },
] as const;

const QUALITY_OPTIONS = [
  { value: "high", label: "High fidelity · slower" },
  { value: "medium", label: "Balanced" },
  { value: "low", label: "Fast draft" },
  { value: "auto", label: "Auto (model decides)" },
] as const;

const STORAGE_KEY = "studio.image-generator.gallery";
const MAX_GALLERY_ITEMS = 12;

const DEFAULT_ASSET_FALLBACK = "generated-asset";

type SizeOptionValue = (typeof SIZE_OPTIONS)[number]["value"];
type QualityOptionValue = (typeof QUALITY_OPTIONS)[number]["value"];

type GeneratedAsset = {
  id: string;
  imageUrl: string;
  dataUrl: string;
  prompt: string;
  size: string;
  quality: string;
  cacheHit: boolean;
  createdAt: number;
  name: string;
  saved: boolean;
};

type StoredAsset = Omit<GeneratedAsset, "id"> & { id: string };

type ReferenceState = {
  file: File;
  dataUrl: string;
};

type GeneratedAssetCardProps = {
  asset: GeneratedAsset;
  saving: boolean;
  deleting: boolean;
  onNameChange: (assetId: string, nextName: string) => void;
  onCopyUrl: (asset: GeneratedAsset) => void;
  onDownload: (asset: GeneratedAsset) => void;
  onSave: (asset: GeneratedAsset) => void;
  onDelete: (asset: GeneratedAsset) => void;
  onUseAsReference: (asset: GeneratedAsset) => void;
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, filename: string) {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const match = dataUrl.match(/^data:(.+);base64,(.+)$/);
    if (!match) {
      return null;
    }
    const [, mime, base64] = match;
    const binary = window.atob(base64);
    const length = binary.length;
    const buffer = new Uint8Array(length);
    for (let index = 0; index < length; index += 1) {
      buffer[index] = binary.charCodeAt(index);
    }
    return new File([buffer], filename, { type: mime });
  } catch (error) {
    console.error("dataurl_to_file_error", error);
    return null;
  }
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
}

function defaultNameFromPrompt(prompt: string) {
  const slug = slugify(prompt);
  return slug.length > 0 ? slug : `${DEFAULT_ASSET_FALLBACK}-${Date.now()}`;
}

function sanitizeDownloadName(source: GeneratedAsset) {
  const slug = slugify(source.name || "");
  const base = slug.length > 0 ? slug : `${DEFAULT_ASSET_FALLBACK}-${source.id.slice(0, 8)}`;
  const extension = source.imageUrl.split(".").pop()?.split("?")[0] || "png";
  return `${base}.${extension}`;
}

function restoreGallery(): GeneratedAsset[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredAsset[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed
      .filter((entry) => Boolean(entry?.imageUrl) && Boolean(entry?.dataUrl))
      .map((entry) => ({
        id: entry.id,
        imageUrl: entry.imageUrl,
        dataUrl: entry.dataUrl,
        prompt: entry.prompt,
        size: entry.size,
        quality: entry.quality,
        cacheHit: Boolean(entry.cacheHit),
        createdAt: Number(entry.createdAt) || Date.now(),
        name: entry.name || defaultNameFromPrompt(entry.prompt),
        saved: Boolean(entry.saved),
      }))
      .slice(0, MAX_GALLERY_ITEMS);
  } catch (error) {
    console.error("gallery_restore_error", error);
    return [];
  }
}

function persistGallery(assets: GeneratedAsset[]) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    const payload: StoredAsset[] = assets.map((asset) => ({
      id: asset.id,
      imageUrl: asset.imageUrl,
      dataUrl: asset.dataUrl,
      prompt: asset.prompt,
      size: asset.size,
      quality: asset.quality,
      cacheHit: asset.cacheHit,
      createdAt: asset.createdAt,
      name: asset.name,
      saved: asset.saved,
    }));
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    console.error("gallery_persist_error", error);
  }
}

function GeneratedAssetCard({
  asset,
  saving,
  deleting,
  onNameChange,
  onCopyUrl,
  onDownload,
  onSave,
  onDelete,
  onUseAsReference,
}: GeneratedAssetCardProps) {
  const formattedTime = useMemo(
    () =>
      new Date(asset.createdAt).toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
    [asset.createdAt],
  );

  return (
    <div className="space-y-3 rounded-md border border-border/60 bg-background/60 p-3">
      <div className="relative aspect-square overflow-hidden rounded-md border bg-muted/10">
        <img src={asset.dataUrl} alt={asset.prompt} className="h-full w-full object-contain" />
      </div>
      <div className="space-y-2 text-[11px] text-muted-foreground">
        <div className="font-medium text-foreground">{asset.prompt}</div>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="secondary">{asset.size}</Badge>
          <Badge variant="outline">{asset.quality}</Badge>
          {asset.cacheHit ? (
            <Badge variant="outline" className="uppercase tracking-[0.2em]">
              Cached
            </Badge>
          ) : null}
          <Badge variant={asset.saved ? "default" : "outline"}>
            {asset.saved ? "Saved to library" : "Unsaved"}
          </Badge>
          <span>{formattedTime}</span>
        </div>
      </div>
      <div className="space-y-1 text-[11px] text-muted-foreground">
        <label className="flex flex-col gap-1 text-left">
          <span className="font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Asset name
          </span>
          <Input
            value={asset.name}
            onChange={(event) => onNameChange(asset.id, event.target.value)}
            placeholder="echo-orb-icon"
            className="h-8 text-xs"
            disabled={saving || deleting}
          />
        </label>
        {!asset.saved ? (
          <span>Choose a descriptive name before saving to the asset library.</span>
        ) : null}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => onUseAsReference(asset)}
          disabled={deleting || saving}
        >
          Use as reference
        </Button>
        <Button
          size="sm"
          variant="secondary"
          type="button"
          onClick={() => onSave(asset)}
          disabled={saving || deleting || asset.name.trim().length === 0}
        >
          {saving ? "Saving…" : asset.saved ? "Resave" : "Save to library"}
        </Button>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => onCopyUrl(asset)}
          disabled={deleting || saving}
        >
          Copy URL
        </Button>
        <Button
          size="sm"
          variant="outline"
          type="button"
          onClick={() => onDownload(asset)}
          disabled={deleting || saving}
        >
          Download PNG
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => onDelete(asset)}
          disabled={deleting || saving}
        >
          {deleting ? "Deleting…" : "Delete"}
        </Button>
      </div>
    </div>
  );
}

export default function ImageGeneratorPanel() {
  const [prompt, setPrompt] = useState("");
  const [size, setSize] = useState<SizeOptionValue>("1024x1024");
  const [quality, setQuality] = useState<QualityOptionValue>("high");
  const [reference, setReference] = useState<ReferenceState | null>(null);
  const [busy, setBusy] = useState(false);
  const [gallery, setGallery] = useState<GeneratedAsset[]>([]);
  const [activeSaveId, setActiveSaveId] = useState<string | null>(null);
  const [activeDeleteId, setActiveDeleteId] = useState<string | null>(null);
  const [progress, setProgress] = useState<{ value: number; label: string } | null>(null);
  const progressClearTimeout = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const canGenerate = prompt.trim().length > 0 && !busy;

  useEffect(() => {
    setGallery(restoreGallery());
  }, []);

  useEffect(() => {
    persistGallery(gallery);
  }, [gallery]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && progressClearTimeout.current) {
        window.clearTimeout(progressClearTimeout.current);
      }
    };
  }, []);

  const referenceName = useMemo(() => reference?.file.name ?? "", [reference]);

  const updateAsset = useCallback((assetId: string, patch: Partial<GeneratedAsset>) => {
    setGallery((prev) =>
      prev.map((entry) => (entry.id === assetId ? { ...entry, ...patch, id: entry.id } : entry)),
    );
  }, []);

  const scheduleProgressClear = useCallback((delay = 800) => {
    if (typeof window === "undefined") {
      setProgress(null);
      return;
    }
    if (progressClearTimeout.current) {
      window.clearTimeout(progressClearTimeout.current);
    }
    progressClearTimeout.current = window.setTimeout(() => {
      setProgress(null);
      progressClearTimeout.current = null;
    }, delay);
  }, []);

  const updateProgress = useCallback((value: number, label: string) => {
    setProgress({ value, label });
  }, []);

  const handleUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please choose an image file.");
      return;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error("Reference image must be smaller than 4 MB.");
      return;
    }
    try {
      const dataUrl = await readFileAsDataUrl(file);
      setReference({ file, dataUrl });
      toast.success("Reference pinned.");
    } catch (error) {
      console.error("reference_read_error", error);
      toast.error("Failed to read the image. Try another file.");
    }
  }, []);

  const clearReference = useCallback(() => {
    setReference(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }, []);

  const handleGenerate = useCallback(async () => {
    if (!canGenerate) return;
    setBusy(true);
    updateProgress(
      reference ? 25 : 15,
      reference ? "Packaging reference image…" : "Preparing prompt…",
    );
    try {
      updateProgress(45, "Contacting OpenAI…");
      const response = await fetch("/api/images/generate", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          prompt,
          size,
          quality,
          referenceImage: reference
            ? { dataUrl: reference.dataUrl, name: reference.file.name }
            : null,
        }),
      });
      updateProgress(70, "Receiving image payload…");
      const result = await response.json().catch(() => ({}));
      if (!response.ok || !result?.ok) {
        throw new Error(result?.error || "Image generation failed.");
      }
      updateProgress(90, "Compositing preview…");
      const createdAt = Number(result.generatedAt) || Date.now();
      const resolvedQuality = String(result.quality || quality);
      const name = defaultNameFromPrompt(result.prompt || prompt);
      const asset: GeneratedAsset = {
        id: crypto.randomUUID(),
        imageUrl: result.imageUrl,
        dataUrl: result.dataUrl,
        prompt: result.prompt,
        size: result.size,
        quality: resolvedQuality,
        cacheHit: Boolean(result.cacheHit),
        createdAt,
        name,
        saved: false,
      };
      setGallery((prev) => {
        const filtered = prev.filter((entry) => entry.imageUrl !== asset.imageUrl && entry.id !== asset.id);
        const next = [asset, ...filtered];
        return next.slice(0, MAX_GALLERY_ITEMS);
      });
      toast.success(asset.cacheHit ? "Served instantly from cache" : "New asset generated");
      updateProgress(100, "Finalizing gallery…");
      scheduleProgressClear();
    } catch (error: any) {
      console.error("generate_error", error);
      updateProgress(100, "Generation failed");
      scheduleProgressClear(1500);
      toast.error(error?.message || "Unable to generate image");
    } finally {
      setBusy(false);
    }
  }, [canGenerate, prompt, quality, reference, scheduleProgressClear, size, updateProgress]);

  const handleCopyUrl = useCallback((asset: GeneratedAsset) => {
    if (typeof navigator === "undefined" || typeof window === "undefined") {
      toast.error("Clipboard unavailable in this environment.");
      return;
    }
    const isAbsolute = asset.imageUrl.startsWith("http://") || asset.imageUrl.startsWith("https://");
    const text = isAbsolute ? asset.imageUrl : `${window.location.origin}${asset.imageUrl}`;
    navigator.clipboard
      .writeText(text)
      .then(() => toast.success("Copied link to clipboard"))
      .catch(() => toast.error("Copy failed. Copy manually from the gallery."));
  }, []);

  const handleDownload = useCallback((asset: GeneratedAsset) => {
    if (typeof document === "undefined") {
      toast.error("Downloads unavailable in this environment.");
      return;
    }
    const link = document.createElement("a");
    link.href = asset.dataUrl;
    link.download = sanitizeDownloadName(asset);
    link.click();
  }, []);

  const handleUseAssetAsReference = useCallback(
    (asset: GeneratedAsset) => {
      const preferredBase = asset.name.trim().length > 0 ? asset.name : asset.prompt;
      const slugBase = slugify(preferredBase);
      const fallbackBase = `${DEFAULT_ASSET_FALLBACK}-${asset.id.slice(0, 8)}`;
      const baseName = slugBase.length > 0 ? slugBase : fallbackBase;
      const extension = asset.imageUrl.split(".").pop()?.split("?")[0] || "png";
      const fileName = `${baseName}.${extension}`;
      const file = dataUrlToFile(asset.dataUrl, fileName);
      if (!file) {
        toast.error("Unable to prepare the image for editing.");
        return;
      }
      setReference({ file, dataUrl: asset.dataUrl });
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setPrompt(asset.prompt);
      if (SIZE_OPTIONS.some((option) => option.value === asset.size)) {
        setSize(asset.size as SizeOptionValue);
      }
      if (QUALITY_OPTIONS.some((option) => option.value === asset.quality)) {
        setQuality(asset.quality as QualityOptionValue);
      }
      toast.success("Loaded into the editor for quick edits.");
    },
    [setQuality, setSize],
  );

  const handleDeleteAsset = useCallback(
    async (asset: GeneratedAsset) => {
      setActiveDeleteId(asset.id);
      try {
        const response = await fetch("/api/images/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl: asset.imageUrl }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.ok) {
          throw new Error(result?.error || "Failed to delete image");
        }
        setGallery((prev) => prev.filter((entry) => entry.id !== asset.id));
        toast.success("Deleted from library");
      } catch (error: any) {
        console.error("image_delete_error", error);
        toast.error(error?.message || "Unable to delete image");
      } finally {
        setActiveDeleteId(null);
      }
    },
    [],
  );

  const handleSaveAsset = useCallback(
    async (asset: GeneratedAsset) => {
      const trimmedName = asset.name.trim();
      if (!trimmedName) {
        toast.error("Provide a name before saving.");
        return;
      }
      setActiveSaveId(asset.id);
      try {
        const response = await fetch("/api/images/save", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ imageUrl: asset.imageUrl, name: trimmedName }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok || !result?.ok) {
          throw new Error(result?.error || "Failed to save image");
        }
        updateAsset(asset.id, { imageUrl: result.imageUrl, saved: true, name: trimmedName });
        toast.success(`Saved as ${trimmedName}`);
      } catch (error: any) {
        console.error("image_save_error", error);
        toast.error(error?.message || "Unable to save image");
      } finally {
        setActiveSaveId(null);
      }
    },
    [updateAsset],
  );

  return (
    <div className="space-y-4 text-sm">
      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Prompt
          </span>
          <Badge variant="outline">OpenAI · gpt-image-1</Badge>
        </div>
        <Textarea
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          placeholder="Generate a high-contrast EchoCoder logo with neon blue glow"
          className="min-h-[120px] text-sm"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-[repeat(3,minmax(0,1fr))]">
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Size
          </span>
          <Select value={size} onValueChange={(value) => setSize(value as SizeOptionValue)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select size" />
            </SelectTrigger>
            <SelectContent>
              {SIZE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Quality
          </span>
          <Select value={quality} onValueChange={(value) => setQuality(value as QualityOptionValue)}>
            <SelectTrigger className="h-8 text-xs">
              <SelectValue placeholder="Select quality" />
            </SelectTrigger>
            <SelectContent>
              {QUALITY_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="text-[11px] text-muted-foreground">
            High fidelity yields richer detail. Fast draft is best for quick previews.
          </div>
        </label>
        <label className="space-y-2">
          <span className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Reference image (optional)
          </span>
          <div className="flex items-center gap-2">
            <Input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleUpload}
              className="h-8 text-xs"
            />
            {reference ? (
              <Button type="button" size="sm" variant="ghost" onClick={clearReference}>
                Clear
              </Button>
            ) : null}
          </div>
          {reference ? (
            <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-2 text-[11px] text-muted-foreground">
              Using {referenceName || "reference.png"}
            </div>
          ) : (
            <div className="text-[11px] text-muted-foreground">
              Provide an existing icon or logo to steer the style.
            </div>
          )}
        </label>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button size="sm" disabled={!canGenerate} onClick={handleGenerate}>
          {busy ? "Generating…" : "Generate asset"}
        </Button>
        <Button
          size="sm"
          variant="ghost"
          type="button"
          onClick={() => {
            setPrompt("");
            clearReference();
            setQuality("high");
          }}
          disabled={busy || (!prompt && !reference)}
        >
          Reset
        </Button>
      </div>

      {progress ? (
        <div className="space-y-1">
          <div className="text-[11px] text-muted-foreground">{progress.label}</div>
          <Progress value={progress.value} className="h-1" />
        </div>
      ) : null}

      <div className="space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-semibold uppercase tracking-[0.24em] text-muted-foreground">
            Recent outputs
          </div>
          <div className="text-[11px] text-muted-foreground">
            Save favorites to reuse them across the studio and share with your team.
          </div>
        </div>
        {gallery.length === 0 ? (
          <div className="rounded-md border border-dashed border-border/60 bg-muted/20 p-4 text-xs text-muted-foreground">
            Run a prompt to populate your icon library.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {gallery.map((asset) => (
              <GeneratedAssetCard
                key={asset.id}
                asset={asset}
                saving={activeSaveId === asset.id}
                deleting={activeDeleteId === asset.id}
                onNameChange={(assetId, value) => {
                  const trimmedNext = value.trim();
                  const trimmedCurrent = asset.name.trim();
                  updateAsset(assetId, {
                    name: value,
                    saved: asset.saved && trimmedNext === trimmedCurrent,
                  });
                }}
                onCopyUrl={handleCopyUrl}
                onDownload={handleDownload}
                onSave={handleSaveAsset}
                onDelete={handleDeleteAsset}
                onUseAsReference={handleUseAssetAsReference}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
