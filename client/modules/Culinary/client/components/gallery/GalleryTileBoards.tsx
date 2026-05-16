import { useMemo, useState } from "react";
import type { GalleryImage, TileBoard, TileBoardTile } from "@/context/AppDataContext";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FolderPlus,
  ImagePlus,
  Layers,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";

export type GalleryTileBoardsProps = {
  boards: TileBoard[];
  images: GalleryImage[];
  selectedImageIds: string[];
  activeBoardId: string | null;
  onSelectBoard: (id: string) => void;
  onCreateBoard: (name: string) => void;
  onRenameBoard: (id: string, name: string) => void;
  onDeleteBoard: (id: string) => void;
  onAddTiles: (boardId: string, imageIds: string[]) => void;
  onUpdateTile: (boardId: string, tileId: string, patch: Partial<TileBoardTile>) => void;
  onRemoveTile: (boardId: string, tileId: string) => void;
};

export function GalleryTileBoards({
  boards,
  images,
  selectedImageIds,
  activeBoardId,
  onSelectBoard,
  onCreateBoard,
  onRenameBoard,
  onDeleteBoard,
  onAddTiles,
  onUpdateTile,
  onRemoveTile,
}: GalleryTileBoardsProps) {
  const [boardNameDraft, setBoardNameDraft] = useState("");

  const activeBoard = useMemo(
    () => boards.find((board) => board.id === activeBoardId) ?? boards[0] ?? null,
    [boards, activeBoardId],
  );

  const selectedImages = useMemo(
    () => images.filter((image) => selectedImageIds.includes(image.id)),
    [images, selectedImageIds],
  );

  return (
    <div className="flex h-full gap-4">
      <aside className="flex w-[220px] flex-col gap-3 rounded-3xl border border-slate-300/50 dark:border-white/10 bg-slate-100 dark:bg-black/30 p-4">
        <div className="flex items-center justify-between text-xs uppercase tracking-[0.35em] text-slate-900 dark:text-slate-300">
          <span>Tile boards</span>
          <Layers className="h-4 w-4" />
        </div>
        <div className="space-y-2 overflow-y-auto pr-1">
          {boards.map((board) => (
            <button
              key={board.id}
              onClick={() => onSelectBoard(board.id)}
              className={cn(
                "flex w-full flex-col items-start gap-1 rounded-2xl border px-3 py-2 text-left transition",
                activeBoard?.id === board.id
                  ? "border-sky-400 bg-sky-500/15 text-sky-700 dark:text-sky-100 shadow-[0_20px_40px_rgba(14,165,233,0.28)]"
                  : "border-slate-300/50 dark:border-white/12 bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-slate-200 hover:border-sky-300/40 dark:hover:border-sky-300/40 hover:bg-sky-500/10",
              )}
            >
              <span className="text-sm font-semibold">{board.name}</span>
              <span className="text-[10px] uppercase tracking-[0.3em] opacity-60">
                {board.tiles.length} tile{board.tiles.length === 1 ? "" : "s"}
              </span>
            </button>
          ))}
          {boards.length === 0 && (
            <div className="rounded-2xl border border-dashed border-slate-300/50 dark:border-white/20 px-3 py-4 text-[11px] uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">
              No boards yet
            </div>
          )}
        </div>
        <div className="space-y-2 rounded-2xl border border-slate-300/60 dark:border-white/12 bg-slate-50 dark:bg-black/30 p-3">
          <div className="text-[11px] uppercase tracking-[0.35em] text-slate-900 dark:text-slate-300">New board</div>
          <input
            value={boardNameDraft}
            onChange={(event) => setBoardNameDraft(event.target.value)}
            placeholder="Server Notes tiles"
            className="w-full rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
          />
          <Button
            size="sm"
            className="w-full rounded-full"
            onClick={() => {
              const name = boardNameDraft.trim();
              if (!name) return;
              onCreateBoard(name);
              setBoardNameDraft("");
            }}
          >
            <FolderPlus className="mr-2 h-4 w-4" />
            Create board
          </Button>
        </div>
      </aside>

      <section className="flex-1 overflow-hidden rounded-3xl border border-slate-300/50 dark:border-white/10 bg-slate-50 dark:bg-black/25 p-5">
        {activeBoard ? (
          <div className="flex h-full flex-col gap-4">
            <header className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-slate-100">
                  {activeBoard.name}
                  <button
                    className="rounded-full border border-white/15 bg-black/40 p-1 text-xs opacity-70 transition hover:border-sky-400/40 hover:opacity-100"
                    onClick={() => {
                      const next = prompt("Rename board", activeBoard.name)?.trim();
                      if (next && next !== activeBoard.name) onRenameBoard(activeBoard.id, next);
                    }}
                    title="Rename board"
                  >
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                </div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">
                  {activeBoard.description || "Organize hero imagery into shareable tiles."}
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-full"
                  onClick={() => onDeleteBoard(activeBoard.id)}
                >
                  <Trash2 className="mr-2 h-4 w-4" />
                  Remove board
                </Button>
                <Button
                  size="sm"
                  className="rounded-full"
                  onClick={() => {
                    if (!selectedImageIds.length) return;
                    onAddTiles(activeBoard.id, selectedImageIds);
                  }}
                  disabled={selectedImageIds.length === 0}
                >
                  <ImagePlus className="mr-2 h-4 w-4" />
                  Add {selectedImageIds.length || ""} tile{selectedImageIds.length === 1 ? "" : "s"}
                </Button>
              </div>
            </header>

            <div className="grid flex-1 grid-cols-[repeat(auto-fill,minmax(220px,1fr))] gap-4 overflow-y-auto pr-1">
              {activeBoard.tiles.map((tile) => {
                const image = tile.imageId
                  ? images.find((entry) => entry.id === tile.imageId) ?? null
                  : null;
                return (
                  <article
                    key={tile.id}
                    className="flex flex-col gap-3 rounded-3xl border border-slate-300/50 dark:border-white/12 bg-slate-100 dark:bg-black/35 p-4 text-slate-900 dark:text-slate-100 shadow-[0_20px_50px_rgba(14,165,233,0.25)]"
                  >
                    <div className="relative overflow-hidden rounded-2xl border border-slate-300/50 dark:border-white/10 bg-slate-200 dark:bg-black/50">
                      {image ? (
                        <img
                          src={image.dataUrl || image.blobUrl}
                          alt={tile.title}
                          className="h-40 w-full object-cover"
                        />
                      ) : (
                        <div className="flex h-40 items-center justify-center text-xs uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">
                          No image linked
                        </div>
                      )}
                    </div>
                    <input
                      value={tile.title}
                      onChange={(event) =>
                        onUpdateTile(activeBoard.id, tile.id, { title: event.target.value })
                      }
                      className="rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                    />
                    <textarea
                      value={tile.subtitle || ""}
                      onChange={(event) =>
                        onUpdateTile(activeBoard.id, tile.id, { subtitle: event.target.value })
                      }
                      placeholder="Notes"
                      className="h-16 rounded-xl border border-white/10 bg-black/40 px-3 py-2 text-sm focus:border-sky-400 focus:outline-none"
                    />
                    <div className="flex items-center justify-between text-[11px] uppercase tracking-[0.3em] text-slate-700 dark:text-slate-300">
                      <span>{tile.layout}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="rounded-full px-3"
                        onClick={() => onRemoveTile(activeBoard.id, tile.id)}
                      >
                        Remove
                      </Button>
                    </div>
                  </article>
                );
              })}

              {activeBoard.tiles.length === 0 && (
                <div className="flex flex-1 flex-col items-center justify-center gap-3 rounded-3xl border border-dashed border-slate-300/50 dark:border-white/15 bg-slate-100 dark:bg-black/30 p-6 text-center text-sm uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">
                  <Plus className="h-6 w-6" />
                  Drop or select gallery images to start tiles
                </div>
              )}
            </div>

            {selectedImages.length > 0 && (
              <footer className="rounded-2xl border border-slate-300/50 dark:border-white/12 bg-slate-100 dark:bg-black/35 px-4 py-3 text-[11px] uppercase tracking-[0.3em] text-slate-900 dark:text-slate-300">
                {selectedImages.length} gallery image{selectedImages.length === 1 ? "" : "s"} selected
                — click "Add" to convert into tiles.
              </footer>
            )}
          </div>
        ) : (
          <div className="flex h-full items-center justify-center rounded-3xl border border-dashed border-slate-300/50 dark:border-white/15 bg-slate-100 dark:bg-black/35 text-sm uppercase tracking-[0.35em] text-slate-600 dark:text-slate-400">
            Create a tile board to get started.
          </div>
        )}
      </section>
    </div>
  );
}
