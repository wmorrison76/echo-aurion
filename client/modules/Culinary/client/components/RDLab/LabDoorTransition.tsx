import { useEffect, useState } from "react";
import { Beaker, Sparkles, Loader } from "lucide-react";

interface LabDoorTransitionProps {
  isOpen: boolean;
  onComplete?: () => void;
  labMode: "culinary" | "pastry";
}

export function LabDoorTransition({
  isOpen,
  onComplete,
  labMode,
}: LabDoorTransitionProps) {
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    if (isOpen) {
      // Wait for animation to complete (3.5 seconds)
      const timer = setTimeout(() => {
        setShowContent(true);
        if (onComplete) {
          setTimeout(onComplete, 800);
        }
      }, 3500);
      return () => clearTimeout(timer);
    } else {
      setShowContent(false);
    }
  }, [isOpen, onComplete]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gradient-to-b from-slate-900 via-slate-950 to-black flex items-center justify-center z-50 overflow-hidden">
      {/* Background glow effect */}
      <div className="absolute inset-0 opacity-20">
        <div
          className="absolute top-1/3 left-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background:
              labMode === "pastry"
                ? "radial-gradient(circle, rgba(244,63,94,0.3) 0%, transparent 70%)"
                : "radial-gradient(circle, rgba(34,211,238,0.3) 0%, transparent 70%)",
          }}
        />
        <div
          className="absolute bottom-1/3 right-1/4 w-96 h-96 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(168,85,247,0.2) 0%, transparent 70%)",
          }}
        />
      </div>

      {/* Glass Door Container */}
      <div className="relative z-10 w-full max-w-4xl h-96 mx-4 perspective">
        {/* Left Glass Door */}
        <div
          className="absolute inset-y-0 left-0 w-1/2 origin-right"
          style={{
            animation: isOpen
              ? "slideOutLeftGlass 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              : "none",
          }}
        >
          {/* Glass panel appearance */}
          <div className="absolute inset-0 bg-gradient-to-r from-slate-800/60 via-slate-700/50 to-transparent backdrop-blur-md border-r border-slate-600/30 rounded-r-2xl shadow-2xl">
            {/* Glass reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse">
                {labMode === "pastry" ? (
                  <Sparkles className="h-32 w-32 text-rose-400/40" />
                ) : (
                  <Beaker className="h-32 w-32 text-[#c8a97e]/30" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right Glass Door */}
        <div
          className="absolute inset-y-0 right-0 w-1/2 origin-left"
          style={{
            animation: isOpen
              ? "slideOutRightGlass 3.5s cubic-bezier(0.16, 1, 0.3, 1) forwards"
              : "none",
          }}
        >
          {/* Glass panel appearance */}
          <div className="absolute inset-0 bg-gradient-to-l from-slate-800/60 via-slate-700/50 to-transparent backdrop-blur-md border-l border-slate-600/30 rounded-l-2xl shadow-2xl">
            {/* Glass reflection effect */}
            <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />

            {/* Icon */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="animate-pulse">
                {labMode === "pastry" ? (
                  <Sparkles className="h-32 w-32 text-rose-400/40" />
                ) : (
                  <Beaker className="h-32 w-32 text-[#c8a97e]/30" />
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Center reveal content */}
        {showContent && (
          <div
            className="absolute inset-0 flex flex-col items-center justify-center z-20 animate-in fade-in duration-500"
            style={{
              animation: "fadeInContent 0.8s ease-out forwards",
            }}
          >
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <Loader className="h-12 w-12 text-[#c8a97e] animate-spin" />
              </div>
              <div className="space-y-2">
                <p className="text-2xl font-bold text-white">Lab Initialized</p>
                <p className="text-sm text-slate-300">
                  Setting up your research environment...
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Animations */}
      <style>{`
        @keyframes slideOutLeftGlass {
          0% {
            transform: translateX(0) rotateY(0deg);
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateX(-120%) rotateY(-15deg);
            opacity: 0;
          }
        }

        @keyframes slideOutRightGlass {
          0% {
            transform: translateX(0) rotateY(0deg);
            opacity: 1;
          }
          50% {
            opacity: 0.8;
          }
          100% {
            transform: translateX(120%) rotateY(15deg);
            opacity: 0;
          }
        }

        @keyframes fadeInContent {
          0% {
            opacity: 0;
            transform: scale(0.95);
          }
          100% {
            opacity: 1;
            transform: scale(1);
          }
        }
      `}</style>
    </div>
  );
}
