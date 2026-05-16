import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";
import { ChevronLeft, ChevronRight, Download, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";

export type LookBookImage = {
  id: string;
  src?: string;
  name?: string;
  description?: string;
  tags?: string[];
};

type LookBookShowcaseProps = {
  open: boolean;
  onClose: () => void;
  images: LookBookImage[];
  title?: string;
  className?: string;
};

export function LookBookShowcase({
  open,
  onClose,
  images,
  title,
  className,
}: LookBookShowcaseProps) {
  const [index, setIndex] = useState(0);
  const total = images.length || 1;

  useEffect(() => {
    if (open) setIndex(0);
  }, [open]);

  const active = images[index] ?? null;
  const progress = ((index + 1) / total) * 100;

  const descriptors = useMemo(() => {
    if (!active) return [] as string[];
    const tokens = new Set<string>();
    if (active.name) tokens.add(active.name);
    (active.tags || []).forEach((tag) => tokens.add(tag));
    return Array.from(tokens);
  }, [active]);

  const handlePrev = () => setIndex((prev) => (prev - 1 + total) % total);
  const handleNext = () => setIndex((prev) => (prev + 1) % total);

  const downloadCurrent = () => {
    if (!active?.src) return;
    const anchor = document.createElement("a");
    anchor.href = active.src;
    anchor.download = `${active.name || "lookbook"}.jpg`;
    anchor.rel = "noreferrer";
    anchor.click();
  };

  return (
    <Dialog open={open} onOpenChange={(value) => !value && onClose()}>
      <DialogContent
        className={cn(
          "max-w-6xl w-full border-0 bg-[radial-gradient(circle_at_top,_rgba(23,37,84,0.68),_rgba(15,23,42,0.88))] text-white shadow-2xl",
          "p-0 md:p-6",
          className,
        )}
      >
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 px-6 pt-6">
          <div>
            <DialogTitle className="text-lg font-semibold tracking-wide">
              Look Book{title ? ` · ${title}` : ""}
            </DialogTitle>
            <p className="text-xs uppercase tracking-[0.24em] text-white/60">
              {index + 1} / {total}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="ghost"
              className="h-9 w-9 rounded-full border border-white/20 text-white hover:bg-white/10"
              onClick={onClose}
              aria-label="Close look book"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>

        <div className="grid gap-6 px-6 pb-6 md:grid-cols-[minmax(0,1fr),260px]">
          <div className="relative isolate overflow-hidden rounded-2xl border border-white/10 bg-[radial-gradient(circle_at_center,_rgba(255,255,255,0.12),_transparent_70%)] p-6">
            <div className="absolute inset-0 -z-10 bg-[linear-gradient(120deg,rgba(59,130,246,0.12),rgba(236,72,153,0.06))]" />
            {active?.src ? (
              <img
                key={active.id}
                src={active.src}
                alt={active.name || "Look book item"}
                className="h-full w-full rounded-xl object-contain shadow-[0_40px_120px_rgba(14,165,233,0.35)] transition duration-500"
              />
            ) : (
              <div className="flex h-[420px] items-center justify-center rounded-xl border border-dashed border-white/20 text-sm text-white/70">
                Image unavailable
              </div>
            )}
            <button
              type="button"
              className="absolute left-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-lg backdrop-blur transition hover:bg-black/60"
              onClick={handlePrev}
              aria-label="Previous"
            >
              <ChevronLeft className="h-5 w-5" />
            </button>
            <button
              type="button"
              className="absolute right-5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-black/40 text-white shadow-lg backdrop-blur transition hover:bg-black/60"
              onClick={handleNext}
              aria-label="Next"
            >
              <ChevronRight className="h-5 w-5" />
            </button>
            <div className="absolute left-6 right-6 bottom-6 space-y-3 rounded-xl bg-black/40 p-4 backdrop-blur">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-base font-semibold">
                    {active?.name || "Untitled capture"}
                  </h3>
                  <p className="text-sm text-white/70">
                    {active?.description || "Captured in the Echo lab collection."}
                  </p>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="border-white/30 text-white hover:bg-white/10"
                  onClick={downloadCurrent}
                >
                  <Download className="h-4 w-4" />
                  Download
                </Button>
              </div>
              <div className="flex flex-wrap gap-2">
                {descriptors.length === 0 ? (
                  <Badge variant="outline" className="border-white/30 text-white/80">
                    Untagged
                  </Badge>
                ) : (
                  descriptors.map((tag) => (
                    <Badge
                      key={tag}
                      variant="outline"
                      className="border-white/30 text-white/80"
                    >
                      {tag}
                    </Badge>
                  ))
                )}
              </div>
              <Progress value={progress} className="h-1.5" />
            </div>
          </div>

          <div className="flex flex-col gap-4">
            <div className="rounded-xl border border-white/10 bg-white/5 p-4 shadow-inner">
              <h4 className="text-sm font-semibold uppercase tracking-[0.2em] text-white/70">
                Storyboard
              </h4>
              <p className="mt-2 text-xs text-white/70">
                Use the column to jump quickly between curated captures. Notes sync with feedback threads in the
                collaboration panel for frictionless review.
              </p>
            </div>
            <ScrollArea className="h-[420px] rounded-xl border border-white/10 bg-white/5">
              <div className="space-y-2 p-3">
                {images.map((item, itemIndex) => {
                  const isActive = itemIndex === index;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setIndex(itemIndex)}
                      className={cn(
                        "flex w-full items-center gap-3 rounded-lg border px-3 py-2 text-left transition",
                        isActive
                          ? "border-white/60 bg-white/15 text-white shadow-lg"
                          : "border-white/10 text-white/70 hover:border-white/30 hover:bg-white/10",
                      )}
                    >
                      <div className="flex h-14 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-md border border-white/15 bg-black/30">
                        {item.src ? (
                          <img
                            src={item.src}
                            alt={item.name || "Look book item"}
                            className="h-full w-full object-cover"
                          />
                        ) : (
                          <span className="text-[10px]">No image</span>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="truncate text-sm font-semibold">
                          {item.name || "Untitled"}
                        </div>
                        <div className="truncate text-[11px] text-white/60">
                          {(item.tags && item.tags.join(", ")) || "No tags"}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </ScrollArea>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
