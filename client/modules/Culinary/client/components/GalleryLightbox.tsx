import { useEffect } from "react";
import { X, ChevronLeft, ChevronRight, Star } from "lucide-react";
import { cn } from "@/lib/utils";

export function GalleryLightbox({
  open,
  onClose,
  images,
  index,
  onPrev,
  onNext,
  onToggleFavorite,
  className,
}: {
  open: boolean;
  onClose: () => void;
  images: {
    id: string;
    src?: string;
    name: string;
    favorite?: boolean;
    unsupported?: boolean;
  }[];
  index: number;
  onPrev: () => void;
  onNext: () => void;
  onToggleFavorite: (id: string) => void;
  className?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") onPrev();
      if (e.key === "ArrowRight") onNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, onPrev, onNext]);

  if (!open) return null;
  const img = images[index];
  const src = img?.src;

  return (
    <div
      className={cn("fixed inset-0 z-50 bg-black/90 text-white", className)}
      onContextMenu={(e) => e.preventDefault()}
    >
      <button
        className="absolute top-4 right-4 p-2 rounded bg-white/10 hover:bg-white/20"
        onClick={onClose}
        aria-label="Close"
      >
        <X />
      </button>
      <button
        className="absolute left-4 top-1/2 -translate-y-1/2 p-2 rounded bg-white/10 hover:bg-white/20"
        onClick={onPrev}
        aria-label="Previous"
      >
        <ChevronLeft />
      </button>
      <button
        className="absolute right-4 top-1/2 -translate-y-1/2 p-2 rounded bg-white/10 hover:bg-white/20"
        onClick={onNext}
        aria-label="Next"
      >
        <ChevronRight />
      </button>
      <button
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-4 p-2 rounded bg-white/10 hover:bg-white/20",
          img?.favorite && "text-yellow-300",
        )}
        onClick={() => img && onToggleFavorite(img.id)}
        aria-label="Favorite"
      >
        <Star />
      </button>
      <div className="h-full w-full flex items-center justify-center p-6">
        {img?.unsupported ? (
          <div className="text-sm text-white/80">
            Unsupported format for preview: {img?.name}
          </div>
        ) : src ? (
          <img
            src={src}
            alt={img?.name}
            className="max-h-full max-w-full object-contain select-none"
            onError={(e) => {
              const el = e.currentTarget;
              el.onerror = null;
              el.src = "/placeholder.svg";
            }}
          />
        ) : null}
      </div>
    </div>
  );
}
