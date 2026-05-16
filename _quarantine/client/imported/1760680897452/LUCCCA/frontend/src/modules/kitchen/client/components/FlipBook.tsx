import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ChevronLeft, ChevronRight } from "lucide-react";

export type FlipBookImage = { id: string; src?: string; name?: string };

export function FlipBook({
  open,
  onClose,
  images,
  title,
  className,
}: {
  open: boolean;
  onClose: () => void;
  images: FlipBookImage[];
  title?: string;
  className?: string;
}) {
  const [page, setPage] = useState(0);
  const [flipping, setFlipping] = useState<null | "next" | "prev">(null);
  const [tilt, setTilt] = useState<{ rx: number; ry: number }>({
    rx: -3,
    ry: 0,
  });
  const [autoFlips, setAutoFlips] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  const spreads = useMemo(() => {
    const out: [FlipBookImage | null, FlipBookImage | null][] = [];
    for (let i = 0; i < images.length; i += 2)
      out.push([images[i] ?? null, images[i + 1] ?? null]);
    return out;
  }, [images]);

  useEffect(() => {
    if (open) {
      setPage(0);
      setFlipping(null);
      setAutoFlips(0);
      setTilt({ rx: -3, ry: 0 });
    }
  }, [open]);

  const canPrev = page > 0;
  const canNext = page < Math.max(spreads.length - 1, 0);

  const goPrev = () => {
    if (!canPrev || flipping) return;
    setFlipping("prev");
    setTimeout(() => {
      setPage((p) => p - 1);
      setFlipping(null);
    }, 1100);
  };
  const goNext = () => {
    if (!canNext || flipping) return;
    setFlipping("next");
    setTimeout(() => {
      setPage((p) => p + 1);
      setFlipping(null);
    }, 1100);
  };

  // Keyboard controls
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!open) return;
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") goPrev();
      if (e.key === "ArrowRight") goNext();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, canPrev, canNext, flipping]);

  // Mouse tilt parallax
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const r = el.getBoundingClientRect();
      const cx = r.left + r.width / 2,
        cy = r.top + r.height / 2;
      const rx = ((e.clientY - cy) / r.height) * -8; // rotateX
      const ry = ((e.clientX - cx) / r.width) * 8; // rotateY
      setTilt({ rx, ry });
    };
    const onLeave = () => setTilt({ rx: -3, ry: 0 });
    el.addEventListener("mousemove", onMove);
    el.addEventListener("mouseleave", onLeave);
    return () => {
      el.removeEventListener("mousemove", onMove);
      el.removeEventListener("mouseleave", onLeave);
    };
  }, [open]);

  // Auto-play a couple flips on open to showcase multiple pages; cancel on interaction
  useEffect(() => {
    if (!open || images.length < 4) return;
    let canc = false;
    const cancel = () => {
      canc = true;
      setAutoFlips(3);
    };
    window.addEventListener("pointerdown", cancel, { once: true });
    window.addEventListener("keydown", cancel, { once: true });
    const id = setInterval(() => {
      setAutoFlips((n) => {
        if (canc || n >= 2) {
          clearInterval(id);
          return n;
        }
        if (page < spreads.length - 1 && !flipping) goNext();
        return n + 1;
      });
    }, 1600);
    return () => {
      clearInterval(id);
      window.removeEventListener("pointerdown", cancel);
      window.removeEventListener("keydown", cancel);
    };
  }, [open, images.length, spreads.length, page, flipping]);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
      }}
    >
      <DialogContent
        className={`max-w-6xl w-full text-white p-4 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(56,189,248,0.14),transparent_65%),radial-gradient(900px_500px_at_90%_-20%,rgba(99,102,241,0.12),transparent_65%),linear-gradient(180deg,#0b1020_0%,#05070d_100%)] ${className || ""}`}
      >
        <DialogHeader>
          <DialogTitle className="text-sm opacity-80">
            Look Book{title ? ` — ${title}` : ""}
          </DialogTitle>
        </DialogHeader>
        <div
          ref={containerRef}
          className="relative w-full aspect-video rounded-xl overflow-hidden shadow-[inset_0_0_40px_rgba(0,0,0,.55)] ring-1 ring-white/10 bg-[radial-gradient(900px_500px_at_10%_-10%,rgba(56,189,248,0.10),transparent_65%),radial-gradient(900px_500px_at_90%_-20%,rgba(99,102,241,0.10),transparent_65%),linear-gradient(180deg,#0b1020_0%,#05070d_100%)]"
          style={{
            transform: `rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
            transition: flipping ? "transform .2s" : "transform .35s ease",
          }}
        >
          <style>{`
            .book { perspective: 2600px; }
            .page { position: relative; transform-style: preserve-3d; }
            .page > .side { position: relative; overflow:hidden; }
            .page > .side::before{ content:''; position:absolute; inset:0; border-radius: 0; box-shadow: inset 0 0 120px rgba(0,0,0,.32), inset 0 0 0 1px rgba(255,255,255,.06); pointer-events:none; }
            .page > .side.left::after{ content:''; position:absolute; top:0; bottom:0; left:0; width:16px; background: linear-gradient(90deg, rgba(0,0,0,.45), rgba(0,0,0,.0)); pointer-events:none; mix-blend:multiply; }
            .page > .side.right::after{ content:''; position:absolute; top:0; bottom:0; right:0; width:16px; background: linear-gradient(270deg, rgba(0,0,0,.45), rgba(0,0,0,.0)); pointer-events:none; mix-blend:multiply; }
            .leaf { position:absolute; inset:0; backface-visibility:hidden; }
            .leaf::before{ content:''; position:absolute; inset:-18% -12%; background: radial-gradient(140% 100% at 0% 50%, rgba(255,255,255,0.16), transparent 62%); mix-blend: screen; pointer-events:none; opacity:.55; }
            .leaf::after{ content:''; position:absolute; inset:0; box-shadow: inset 0 0 90px rgba(0,0,0,.50), inset 0 0 0 1px rgba(255,255,255,.06); pointer-events:none; }
            .frame{ position:absolute; inset:3.5% 4.5%; border-radius:12px; background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03)); box-shadow: 0 0 0 1px rgba(56,189,248,0.26), 0 18px 48px rgba(56,189,248,0.16); }
            .dark .frame{ background: linear-gradient(180deg, rgba(2,6,23,.82), rgba(2,6,23,.62)); }
            .frame::after{ content:''; position:absolute; inset:0; border-radius:12px; box-shadow: inset 0 0 0 1px rgba(255,255,255,.06), inset 0 20px 40px rgba(0,0,0,.45); pointer-events:none; }
            .art{ position:absolute; inset:6% 6.5%; border-radius:10px; overflow:hidden; background: radial-gradient(600px 320px at 10% -10%, rgba(56,189,248,0.10), transparent 65%), radial-gradient(600px 320px at 90% -20%, rgba(99,102,241,0.10), transparent 65%), linear-gradient(180deg, #0b1020 0%, #05070d 100%); }
            .art img{ position:absolute; inset:0; width:100%; height:100%; object-fit:contain; }
            .shine{ position:absolute; inset:0; background: linear-gradient(90deg, transparent, rgba(255,255,255,.28), transparent); mix-blend: screen; opacity:0; pointer-events:none; }
            .flip-next .right { transform-origin: left center; transform: rotateY(-180deg); transition: transform 1.1s cubic-bezier(.22,.61,.36,1), box-shadow 1.1s; z-index:10; box-shadow: 0 30px 70px rgba(0,0,0,.55); }
            .flip-prev .left { transform-origin: right center; transform: rotateY(180deg); transition: transform 1.1s cubic-bezier(.22,.61,.36,1), box-shadow 1.1s; z-index:10; box-shadow: 0 30px 70px rgba(0,0,0,.55); }
            .flip-next .right .frame, .flip-prev .left .frame { animation: bend 1s ease-in-out forwards; }
            .flip-next .right .shine, .flip-prev .left .shine { animation: shineMove 1s ease-in-out forwards; }
            @keyframes bend { 0%{ transform: perspective(1200px) translateZ(0) rotateY(0) skewY(0deg); } 35%{ transform: perspective(1200px) translateZ(18px) skewY(-4deg); } 65%{ transform: perspective(1200px) translateZ(14px) skewY(3deg); } 100%{ transform: perspective(1200px) translateZ(0) skewY(0deg); } }
            @keyframes shineMove { 0% { opacity:.0; transform: translateX(-40%); } 35% { opacity:.7; } 65% { opacity:.45; } 100% { opacity:0; transform: translateX(140%); } }
            @media (prefers-reduced-motion: reduce){
              .flip-next .right, .flip-prev .left { transition-duration: .2s; }
              .flip-next .right .frame, .flip-prev .left .frame, .flip-next .right .shine, .flip-prev .left .shine { animation: none; }
            }
            .gutter{ position:absolute; top:0; bottom:0; left:50%; width:6px; background: linear-gradient(180deg, rgba(255,255,255,.10), rgba(255,255,255,.02)); box-shadow: inset 0 0 12px rgba(0,0,0,.55), 0 0 0 1px rgba(0,0,0,.35); transform: translateX(-3px); border-radius:3px; }
            .label{ position:absolute; bottom:.5rem; left:50%; transform:translateX(-50%); font-size:11px; opacity:.85; background:rgba(0,0,0,.38); padding:.125rem .375rem; border-radius:.25rem; }
          `}</style>

          <button
            className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full backdrop-blur bg-black/50 hover:bg-black/70 shadow-lg disabled:opacity-40 opacity-80 transition-opacity"
            onClick={goPrev}
            disabled={!canPrev}
            aria-label="Previous spread"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full backdrop-blur bg-black/50 hover:bg-black/70 shadow-lg disabled:opacity-40 opacity-80 transition-opacity"
            onClick={goNext}
            disabled={!canNext}
            aria-label="Next spread"
          >
            <ChevronRight className="w-6 h-6" />
          </button>

          <div
            className="book w-full h-full"
            onTouchStart={(e) => {
              (e.currentTarget as any)._sx = e.touches[0].clientX;
            }}
            onTouchEnd={(e) => {
              const sx = (e.currentTarget as any)._sx;
              const dx = (e.changedTouches[0]?.clientX || 0) - (sx || 0);
              if (Math.abs(dx) > 40) {
                if (dx < 0) goNext();
                else goPrev();
              }
            }}
          >
            <div
              className={`page grid grid-cols-2 w-full h-full ${flipping === "next" ? "flip-next" : ""} ${flipping === "prev" ? "flip-prev" : ""}`}
            >
              <div className="gutter" aria-hidden />
              {(["left", "right"] as const).map((side, idx) => {
                const item = spreads[page]?.[idx as 0 | 1];
                return (
                  <div
                    key={side}
                    className={`side ${side} relative border-white/10 ${side === "left" ? "border-r" : ""}`}
                    onClick={side === "left" ? goPrev : goNext}
                    role="button"
                    aria-label={side === "left" ? "Previous page" : "Next page"}
                  >
                    <div className="leaf">
                      <div className="frame"></div>
                      <div className="art">
                        {item?.src ? (
                          <img src={item.src} alt={item?.name || ""} />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-sm opacity-70">
                            Empty
                          </div>
                        )}
                        <div className="shine" />
                      </div>
                      {item?.name && <div className="label">{item.name}</div>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
        <div className="mt-2 flex items-center justify-between text-xs opacity-90">
          <div>
            Page {page + 1} / {Math.max(spreads.length, 1)}
          </div>
          <div>{images.length} images</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default FlipBook;
