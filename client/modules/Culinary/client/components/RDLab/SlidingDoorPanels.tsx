import { useState, useEffect } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface SlidingDoorPanelsProps {
  isOpen: boolean;
  children: React.ReactNode;
  onToggle?: (isOpen: boolean) => void;
  labMode?: "culinary" | "pastry";
}

export function SlidingDoorPanels({
  isOpen,
  children,
  onToggle,
  labMode = "culinary",
}: SlidingDoorPanelsProps) {
  const [displayOpen, setDisplayOpen] = useState(isOpen);

  useEffect(() => {
    setDisplayOpen(isOpen);
  }, [isOpen]);

  const handleToggle = () => {
    const newState = !displayOpen;
    setDisplayOpen(newState);
    onToggle?.(newState);
  };

  const peekWidth = 20; // 20px peek when closed

  return (
    <div className="fixed inset-0 z-40">
      {/* Left Door Panel */}
      <div
        className="absolute left-0 top-0 bottom-0 w-1/2 origin-right"
        style={{
          transform: displayOpen ? "translateX(0)" : `translateX(calc(-50% + ${peekWidth}px))`,
          transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="relative h-full w-full bg-gradient-to-r from-slate-900/40 via-slate-800/30 to-transparent backdrop-blur-md border-r border-slate-600/30 shadow-2xl">
          {/* Glass reflection effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />

          {/* Pulsing glow */}
          {displayOpen && (
            <div className="absolute inset-0 bg-gradient-to-r from-[#c8a97e]/10 via-transparent to-transparent animate-pulse pointer-events-none" />
          )}
        </div>
      </div>

      {/* Right Door Panel */}
      <div
        className="absolute right-0 top-0 bottom-0 w-1/2 origin-left"
        style={{
          transform: displayOpen ? "translateX(0)" : `translateX(calc(50% - ${peekWidth}px))`,
          transition: "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        <div className="relative h-full w-full bg-gradient-to-l from-slate-900/40 via-slate-800/30 to-transparent backdrop-blur-md border-l border-slate-600/30 shadow-2xl">
          {/* Glass reflection effect */}
          <div className="absolute inset-0 bg-gradient-to-b from-white/5 to-transparent opacity-50" />

          {/* Pulsing glow */}
          {displayOpen && (
            <div className="absolute inset-0 bg-gradient-to-l from-rose-500/10 via-transparent to-transparent animate-pulse pointer-events-none" />
          )}
        </div>
      </div>

      {/* Content behind doors (revealed when open) */}
      {displayOpen && (
        <div className="relative z-50 w-full h-full animate-in fade-in duration-700">
          {children}
        </div>
      )}

      {/* Toggle button - visible when doors are closed */}
      {!displayOpen && (
        <button
          onClick={handleToggle}
          className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-50 flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-900/80 border border-slate-700/50 hover:border-[#c8a97e]/50 backdrop-blur-sm transition-all duration-300 group"
          title="Open Lab"
        >
          <ChevronRight className="h-5 w-5 text-[#c8a97e] group-hover:translate-x-1 transition-transform" />
          <span className="text-sm font-medium text-slate-300 group-hover:text-[#c8a97e] transition-colors">
            Open Lab
          </span>
          <ChevronLeft className="h-5 w-5 text-[#c8a97e] group-hover:-translate-x-1 transition-transform" />
        </button>
      )}

      {/* Peek indicators on door edges */}
      <div
        className="absolute left-0 top-0 bottom-0 pointer-events-none"
        style={{
          width: peekWidth,
          background:
            "linear-gradient(to right, rgba(100, 200, 255, 0.1), transparent)",
          borderRight: "1px solid rgba(100, 200, 255, 0.2)",
          opacity: displayOpen ? 0 : 1,
          transition: "opacity 0.4s ease-out",
        }}
      />
      <div
        className="absolute right-0 top-0 bottom-0 pointer-events-none"
        style={{
          width: peekWidth,
          background: "linear-gradient(to left, rgba(100, 200, 255, 0.1), transparent)",
          borderLeft: "1px solid rgba(100, 200, 255, 0.2)",
          opacity: displayOpen ? 0 : 1,
          transition: "opacity 0.4s ease-out",
        }}
      />

      {/* Close hint when open */}
      {displayOpen && (
        <button
          onClick={handleToggle}
          className="absolute top-6 left-6 z-50 text-slate-400 hover:text-slate-200 transition-colors opacity-60 hover:opacity-100"
          title="Close Lab (minimize to peek)"
        >
          <ChevronLeft className="h-6 w-6" />
        </button>
      )}
    </div>
  );
}
