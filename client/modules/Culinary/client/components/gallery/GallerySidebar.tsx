import { useState } from "react";
import type { DragEvent } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { LookBook } from "@/context/AppDataContext";
import {
  Clock,
  Folder,
  Image as ImageIcon,
  Plus,
  Star,
} from "lucide-react";

type LibraryFilter = "all" | "favorites" | "recent" | "lookbook";

type TagCluster = {
  tag: string;
  count: number;
  freshnessLabel: string;
};

type GallerySidebarProps = {
  totalCount: number;
  favoriteCount: number;
  recentCount: number;
  activeFilter: LibraryFilter;
  activeLookBookId: string | null;
  tagClusters: TagCluster[];
  lookbooks: LookBook[];
  selectedIdsCount: number;
  surfaceClassName: string;
  onFilterChange: (filter: LibraryFilter) => void;
  onLookbookChange: (id: string | null) => void;
  onTagSelect: (tag: string) => void;
  onRestoreDemo: () => void;
  onCreateLookBook: (name: string) => boolean;
  onPreviewLookbook: () => void;
  onRenameLookBook: (id: string, name: string) => void;
  onDeleteLookBook: (id: string) => void;
  onDropFiles: (files: File[]) => void;
};

export function GallerySidebar({
  totalCount,
  favoriteCount,
  recentCount,
  activeFilter,
  activeLookBookId,
  tagClusters,
  lookbooks,
  selectedIdsCount,
  surfaceClassName,
  onFilterChange,
  onLookbookChange,
  onTagSelect,
  onRestoreDemo,
  onCreateLookBook,
  onPreviewLookbook,
  onRenameLookBook,
  onDeleteLookBook,
  onDropFiles,
}: GallerySidebarProps) {
  const [nameDraft, setNameDraft] = useState("");
  const [dropActive, setDropActive] = useState(false);

  const handleCreateLookBook = () => {
    const value = nameDraft.trim();
    if (!value) return;
    const created = onCreateLookBook(value);
    if (created) {
      setNameDraft("");
    }
  };

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

  return (
    <aside className={cn("flex h-full flex-col overflow-hidden rounded-[32px] border", surfaceClassName)}
    >
      <div className="flex flex-1 flex-col gap-4 px-5 pb-4 pt-5">
        <div>
          <h2 className="text-base font-semibold uppercase tracking-[0.3em] text-slate-900 dark:text-slate-100">Library</h2>
          <p className="text-[11px] uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">Curate & explore</p>
        </div>

        <div className="grid gap-2 text-sm">
          <LibraryItem
            icon={<ImageIcon className="h-4 w-4" />}
            label="All photos"
            count={totalCount}
            active={activeFilter === "all" && !activeLookBookId}
            onClick={() => {
              onFilterChange("all");
              onLookbookChange(null);
            }}
          />
          <LibraryItem
            icon={<Star className="h-4 w-4" />}
            label="Favorites"
            count={favoriteCount}
            active={activeFilter === "favorites"}
            onClick={() => {
              onFilterChange("favorites");
              onLookbookChange(null);
            }}
          />
          <LibraryItem
            icon={<Clock className="h-4 w-4" />}
            label="Last 30 days"
            count={recentCount}
            active={activeFilter === "recent"}
            onClick={() => {
              onFilterChange("recent");
              onLookbookChange(null);
            }}
          />
        </div>

        <AutoCategoryList
          clusters={tagClusters}
          onSelect={(tag) => {
            onFilterChange("all");
            onLookbookChange(null);
            onTagSelect(tag);
          }}
        />

        <div className="space-y-3">
          <div className="flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-700 dark:text-slate-300">
            <span>Look Books</span>
            <button
              className="flex h-7 w-7 items-center justify-center rounded-full border border-white/10 text-white transition hover:bg-white/10"
              onClick={onRestoreDemo}
              title="Restore demo set"
            >
              <RefreshGlyph />
            </button>
          </div>
          <div className="space-y-1.5">
            {lookbooks.map((book) => (
              <LibraryItem
                key={book.id}
                icon={<Folder className="h-4 w-4" />}
                label={book.name}
                count={book.imageIds.length}
                active={activeFilter === "lookbook" && activeLookBookId === book.id}
                onClick={() => {
                  onFilterChange("lookbook");
                  onLookbookChange(book.id);
                }}
                action={
                  <div className="flex items-center gap-1">
                    <button
                      className="rounded-full p-1 text-xs opacity-60 transition hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        const name = prompt("Rename Look Book", book.name)?.trim();
                        if (name) {
                          onRenameLookBook(book.id, name);
                        }
                      }}
                      title="Rename"
                    >
                      ✎
                    </button>
                    <button
                      className="rounded-full p-1 text-xs opacity-60 transition hover:text-red-400 hover:opacity-100"
                      onClick={(event) => {
                        event.stopPropagation();
                        if (confirm("Delete this look book?")) {
                          onDeleteLookBook(book.id);
                        }
                      }}
                      title="Delete"
                    >
                      ×
                    </button>
                  </div>
                }
              />
            ))}
            {lookbooks.length === 0 && (
              <div className="rounded-2xl border border-dashed border-white/20 px-3 py-3 text-xs opacity-70">
                No look books yet.
              </div>
            )}
          </div>
          <FlipbookPreview onOpen={onPreviewLookbook} />
          <div className="space-y-2 rounded-2xl border border-slate-300/60 dark:border-white/12 bg-slate-50 dark:bg-transparent p-3">
            <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-900 dark:text-slate-300">New look book</div>
            <div className="flex items-center gap-2">
              <input
                value={nameDraft}
                placeholder="Name"
                className="flex-1 rounded-full border border-white/10 bg-white/10 px-3 py-1.5 text-xs"
                onChange={(event) => setNameDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    event.preventDefault();
                    handleCreateLookBook();
                  }
                }}
              />
              <Button
                size="sm"
                className="rounded-full px-3"
                onClick={handleCreateLookBook}
                disabled={!nameDraft.trim()}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="text-[10px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
              Use selected images to seed instantly.
            </div>
          </div>
        </div>

        <div
          className={cn(
          "rounded-2xl border border-dashed px-3 py-3 text-[11px] uppercase tracking-[0.3em] transition",
          dropActive
            ? "border-sky-400/80 bg-sky-500/10 text-sky-700 dark:text-sky-200"
            : "border-slate-400/40 bg-slate-100 text-slate-700 dark:border-white/20 dark:bg-white/5 dark:text-slate-200",
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
          Drop to auto-tag with AI themes.
        </div>
      </div>

      <div className="border-t border-slate-300/50 dark:border-white/10 px-5 py-4 text-[11px] uppercase tracking-[0.3em] text-slate-600 dark:text-slate-400">
        {selectedIdsCount > 0
          ? `${selectedIdsCount} image${selectedIdsCount === 1 ? "" : "s"} selected`
          : "Select images to manage metadata."}
      </div>
    </aside>
  );
}

type LibraryItemProps = {
  icon: React.ReactNode;
  label: string;
  count: number;
  active: boolean;
  onClick: () => void;
  action?: React.ReactNode;
};

function LibraryItem({ icon, label, count, active, onClick, action }: LibraryItemProps) {
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onClick}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onClick();
        }
      }}
      className={cn(
        "flex w-full items-center justify-between gap-2 rounded-2xl border px-3 py-1.5 text-left text-xs transition",
        active
          ? "border-sky-400/60 bg-sky-500/15 text-sky-700 dark:text-sky-100 shadow-[0_18px_40px_rgba(14,165,233,0.32)]"
          : "border-slate-300/60 bg-slate-100 text-slate-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 hover:border-sky-300/40 hover:bg-sky-500/10",
      )}
    >
      <div className="flex items-center gap-2">
        <span className="rounded-full bg-slate-200 dark:bg-black/35 p-1 text-slate-700 dark:text-slate-100">{icon}</span>
        <span>{label}</span>
      </div>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em]">
        <span>{count}</span>
        {action}
      </div>
    </div>
  );
}

type AutoCategoryListProps = {
  clusters: TagCluster[];
  onSelect: (tag: string) => void;
};

function AutoCategoryList({ clusters, onSelect }: AutoCategoryListProps) {
  if (!clusters.length) {
    return null;
  }

  return (
    <div className="space-y-1.5">
      <div className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-900 dark:text-slate-300">AI catalogued themes</div>
      <div className="grid gap-1.5">
        {clusters.map((cluster) => (
          <button
            key={cluster.tag}
            onClick={() => onSelect(cluster.tag)}
            className="flex items-center justify-between rounded-2xl border border-slate-300/50 dark:border-white/12 bg-slate-100 dark:bg-white/5 px-3 py-1.5 text-left text-[11px] uppercase tracking-[0.3em] text-slate-900 dark:text-slate-200 transition hover:border-sky-300/40 dark:hover:border-sky-400/40 hover:bg-sky-500/10"
          >
            <span className="flex flex-col gap-0.5 text-left">
              <span className="text-slate-900 dark:text-slate-100">{cluster.tag}</span>
              <span className="text-[9px] text-slate-400">{cluster.freshnessLabel}</span>
            </span>
            <span className="rounded-full bg-black/25 px-2 py-0.5 text-[9px] font-semibold tracking-[0.35em] text-slate-200">
              {cluster.count}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

type FlipbookPreviewProps = {
  onOpen: () => void;
};

function FlipbookPreview({ onOpen }: FlipbookPreviewProps) {
  const [turning, setTurning] = useState(false);

  return (
    <button
      className="group relative h-28 w-full overflow-hidden rounded-2xl border border-slate-300/50 dark:border-white/20 bg-slate-100 dark:bg-black/35 text-left text-xs uppercase tracking-[0.3em] text-slate-900 dark:text-slate-200"
      style={{ perspective: "1200px" }}
      onClick={() => {
        setTurning(true);
        setTimeout(() => setTurning(false), 900);
        onOpen();
      }}
      onMouseEnter={() => setTurning(true)}
      onMouseLeave={() => setTurning(false)}
      aria-label="Open flip book"
    >
      <div className="absolute inset-0 flex flex-col justify-center gap-1 p-4">
        <span className="text-[11px] font-semibold uppercase tracking-[0.35em] text-slate-900 dark:text-slate-100">Flip book</span>
        <span className="text-[10px] text-slate-600 dark:text-slate-300">Pages animated with every turn</span>
      </div>
      <div
        className="absolute inset-y-4 left-6 w-32 rounded-xl bg-gradient-to-br from-sky-400/60 via-sky-500/40 to-sky-300/30 shadow-[0_18px_40px_rgba(56,189,248,0.35)]"
        style={{
          transformStyle: "preserve-3d",
          transform: turning ? "rotateY(-25deg)" : "rotateY(0deg)",
          transformOrigin: "left center",
          transition: "transform 0.8s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
      <div
        className="absolute inset-y-6 left-10 w-28 rounded-xl border border-white/25 bg-white/10 shadow-[0_12px_30px_rgba(15,23,42,0.3)]"
        style={{
          transformStyle: "preserve-3d",
          transform: turning ? "rotateY(-12deg) translateX(12px)" : "rotateY(0deg)",
          transformOrigin: "left center",
          transition: "transform 0.7s cubic-bezier(0.22, 1, 0.36, 1)",
        }}
      />
    </button>
  );
}

type RefreshGlyphProps = React.SVGProps<SVGSVGElement>;

function RefreshGlyph(props: RefreshGlyphProps) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-3.5 w-3.5" {...props}>
      <path
        d="M21 12a9 9 0 1 1-2.64-6.36"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M21 3v6h-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
