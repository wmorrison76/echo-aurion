import { useState, useMemo } from "react";
import type { QueuedPhoto } from "@/hooks/use-photo-upload-queue";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Trash2,
  Tag,
  X,
} from "lucide-react";

type PhotoQueuePanelProps = {
  queue: QueuedPhoto[];
  isUploading: boolean;
  onRemovePhoto: (id: string) => void;
  onUpdatePhoto: (id: string, patch: Partial<QueuedPhoto>) => void;
  onProcessQueue: () => void;
  onClearQueue: () => void;
  uploadProgress?: Record<string, number>;
};

export function PhotoQueuePanel({
  queue,
  isUploading,
  onRemovePhoto,
  onUpdatePhoto,
  onProcessQueue,
  onClearQueue,
  uploadProgress = {},
}: PhotoQueuePanelProps) {
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = queue.length;
    const pending = queue.filter((p) => p.status === "pending").length;
    const uploading = queue.filter((p) => p.status === "uploading").length;
    const success = queue.filter((p) => p.status === "success").length;
    const error = queue.filter((p) => p.status === "error").length;
    const totalSize = queue.reduce((sum, p) => sum + p.file.size, 0);

    return {
      total,
      pending,
      uploading,
      success,
      error,
      totalSize,
      hasErrors: error > 0,
    };
  }, [queue]);

  if (queue.length === 0) {
    return null;
  }

  return (
    <aside className="flex h-full flex-col gap-3 rounded-[32px] border border-slate-300/50 dark:border-white/15 bg-slate-50 dark:bg-black/25 p-6 overflow-hidden">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold uppercase tracking-[0.3em] text-slate-900 dark:text-slate-100">
            Upload Queue
          </h3>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400 mt-1">
            {stats.total} file{stats.total !== 1 ? "s" : ""} · {(stats.totalSize / 1024 / 1024).toFixed(1)}MB
          </p>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="rounded-full px-3 text-xs uppercase tracking-[0.3em] text-red-600 dark:text-red-400 hover:bg-red-500/10"
          onClick={onClearQueue}
          disabled={isUploading}
        >
          Clear
        </Button>
      </div>

      <div className="flex-1 space-y-2 overflow-y-auto pr-1">
        {queue.map((photo) => {
          const progress = uploadProgress[photo.id] ?? 0;
          const isExpanded = expandedId === photo.id;

          return (
            <div
              key={photo.id}
              className={cn(
                "rounded-2xl border transition overflow-hidden",
                photo.status === "error"
                  ? "border-red-400/50 dark:border-red-500/30 bg-red-50 dark:bg-red-950/20"
                  : photo.status === "success"
                    ? "border-emerald-400/50 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-950/20"
                    : "border-slate-300/50 dark:border-white/10 bg-slate-100 dark:bg-black/30",
              )}
            >
              <button
                onClick={() => setExpandedId(isExpanded ? null : photo.id)}
                className="w-full p-3 text-left transition hover:bg-white/5"
              >
                <div className="flex items-center gap-3">
                  <div className="relative h-12 w-12 rounded-lg overflow-hidden bg-slate-200 dark:bg-slate-700 flex-shrink-0">
                    <img
                      src={photo.preview}
                      alt={photo.name}
                      className="h-full w-full object-cover"
                    />
                    {photo.status === "uploading" && (
                      <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                        <Loader2 className="h-4 w-4 text-white animate-spin" />
                      </div>
                    )}
                    {photo.status === "success" && (
                      <div className="absolute inset-0 bg-emerald-500/20 flex items-center justify-center">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                      </div>
                    )}
                    {photo.status === "error" && (
                      <div className="absolute inset-0 bg-red-500/20 flex items-center justify-center">
                        <AlertCircle className="h-4 w-4 text-red-500" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                      {photo.name}
                    </div>
                    <div className="text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
                      {(photo.file.size / 1024 / 1024).toFixed(1)}MB
                    </div>
                    {photo.status === "uploading" && (
                      <div className="mt-1 h-1 w-full rounded-full bg-slate-300 dark:bg-white/10 overflow-hidden">
                        <div
                          className="h-full bg-sky-500 transition-all"
                          style={{ width: `${progress * 100}%` }}
                        />
                      </div>
                    )}
                    {photo.error && (
                      <div className="text-[10px] text-red-600 dark:text-red-400 mt-1">
                        {photo.error}
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 flex-shrink-0">
                    <StatusBadge status={photo.status} />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onRemovePhoto(photo.id);
                      }}
                      className="p-1.5 rounded-full text-slate-400 dark:text-slate-500 hover:bg-red-500/20 hover:text-red-600 dark:hover:text-red-400 transition"
                      aria-label="Remove photo"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              </button>

              {isExpanded && (
                <div className="border-t border-slate-300/50 dark:border-white/10 p-3 space-y-3 bg-white/5">
                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.35em] text-slate-700 dark:text-slate-300 block">
                      Filename
                    </label>
                    <input
                      type="text"
                      value={photo.name}
                      onChange={(e) => onUpdatePhoto(photo.id, { name: e.target.value })}
                      className="w-full rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 text-sm focus:border-sky-400 focus:outline-none"
                      disabled={photo.status === "uploading" || photo.status === "success"}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-[11px] uppercase tracking-[0.35em] text-slate-700 dark:text-slate-300 block">
                      Tags
                    </label>
                    <textarea
                      value={photo.tags.join(", ")}
                      onChange={(e) =>
                        onUpdatePhoto(photo.id, {
                          tags: e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter(Boolean),
                        })
                      }
                      placeholder="comma separated"
                      className="h-16 w-full rounded-lg border border-white/10 bg-black/35 px-2.5 py-1.5 text-sm resize-none focus:border-sky-400 focus:outline-none"
                      disabled={photo.status === "uploading" || photo.status === "success"}
                    />
                  </div>

                  {photo.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {photo.tags.map((tag) => (
                        <span
                          key={tag}
                          className="inline-flex items-center gap-1 rounded-full border border-sky-400/50 bg-sky-500/15 px-2 py-0.5 text-[10px] uppercase tracking-[0.3em] text-sky-700 dark:text-sky-100"
                        >
                          <Tag className="h-2.5 w-2.5" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 border-t border-slate-300/50 dark:border-white/10 pt-3">
        <div className="grid grid-cols-2 gap-2 text-[10px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-sky-400" />
            Pending: {stats.pending}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-amber-400" />
            Uploading: {stats.uploading}
          </div>
          <div className="flex items-center gap-1.5">
            <div className="h-2 w-2 rounded-full bg-emerald-400" />
            Done: {stats.success}
          </div>
          {stats.error > 0 && (
            <div className="flex items-center gap-1.5">
              <div className="h-2 w-2 rounded-full bg-red-400" />
              Errors: {stats.error}
            </div>
          )}
        </div>

        <Button
          onClick={onProcessQueue}
          disabled={isUploading || stats.pending === 0}
          className="w-full rounded-full bg-sky-500 hover:bg-sky-600 text-white"
        >
          {isUploading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Uploading…
            </>
          ) : (
            <>Upload {stats.pending} File{stats.pending !== 1 ? "s" : ""}</>
          )}
        </Button>
      </div>
    </aside>
  );
}

function StatusBadge({ status }: { status: "pending" | "uploading" | "success" | "error" }) {
  switch (status) {
    case "pending":
      return (
        <div className="h-2 w-2 rounded-full bg-sky-400 animate-pulse" title="Pending" />
      );
    case "uploading":
      return (
        <Loader2 className="h-4 w-4 text-amber-500 animate-spin" />
      );
    case "success":
      return (
        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
      );
    case "error":
      return (
        <AlertCircle className="h-4 w-4 text-red-500" />
      );
  }
}
