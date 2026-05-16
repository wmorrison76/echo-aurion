import { useEffect, useState } from "react";

export default function FloatingLoadingOrb() {
  const [isVisible, setIsVisible] = useState(true);
  const [isReducedMotion, setIsReducedMotion] = useState(false);

  useEffect(() => {
    // Check for both system prefers-reduced-motion and app's system-preferences setting
    const prefersReducedMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;

    // Check app's custom reduce motion setting
    let appReduceMotion = false;
    try {
      const saved = window.localStorage.getItem("system-preferences");
      if (saved) {
        const prefs = JSON.parse(saved);
        appReduceMotion = prefs.accessibility?.reduceMotion || false;
      }
    } catch {
      appReduceMotion = false;
    }

    const hasReduceMotion = prefersReducedMotion || appReduceMotion;
    setIsReducedMotion(hasReduceMotion);

    // Auto-hide after reasonable loading time only if motion is not reduced
    let timer: NodeJS.Timeout | null = null;
    if (!hasReduceMotion) {
      timer = setTimeout(() => setIsVisible(false), 30000);
    }

    return () => {
      if (timer) clearTimeout(timer);
    };
  }, []);

  // Listen for system preference changes
  useEffect(() => {
    const handlePreferencesChange = (e: Event) => {
      try {
        const detail = (e as CustomEvent).detail;
        if (
          detail?.category === "accessibility" &&
          detail?.key === "reduceMotion"
        ) {
          setIsReducedMotion(detail.value);
          // When reduce motion is turned off, show the orb again
          if (!detail.value) {
            setIsVisible(true);
          }
        } else {
          // Also check localStorage in case the event doesn't have details
          const saved = window.localStorage.getItem("system-preferences");
          if (saved) {
            const prefs = JSON.parse(saved);
            const appReduceMotion = prefs.accessibility?.reduceMotion || false;
            setIsReducedMotion(appReduceMotion);
            // When reduce motion is turned off, show the orb again
            if (!appReduceMotion) {
              setIsVisible(true);
            }
          }
        }
      } catch {
        // Silently fail
      }
    };

    window.addEventListener("preferences-changed", handlePreferencesChange);
    return () => {
      window.removeEventListener(
        "preferences-changed",
        handlePreferencesChange,
      );
    };
  }, []);

  // Hide completely when reduce motion is enabled
  if (isReducedMotion) return null;
  if (!isVisible) return null;

  return (
    <div
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 ${isReducedMotion ? "opacity-40" : ""}`}
    >
      <style>{`
        @keyframes pulse-sphere {
          0%, 100% {
            transform: scale(1);
          }
          50% {
            transform: scale(1.05);
          }
        }

        .loading-orb {
          position: fixed;
          bottom: 32px;
          right: 32px;
          width: 80px;
          height: 80px;
          border-radius: 50%;
          background: radial-gradient(circle at 35% 35%, rgba(0, 149, 255, 0.9), rgba(0, 117, 214, 0.6));
          box-shadow: 0 0 30px rgba(0, 149, 255, 0.6), 0 8px 24px rgba(0, 0, 0, 0.3);
          animation: ${isReducedMotion ? "none" : "pulse-sphere 2s ease-in-out infinite"};
        }

        .progress-text {
          position: absolute;
          bottom: 120px;
          right: 32px;
          text-align: center;
          font-size: 12px;
          color: var(--foreground);
          opacity: ${isReducedMotion ? "0.3" : "0.6"};
        }

        .dot {
          display: inline-block;
          width: 4px;
          height: 4px;
          border-radius: 50%;
          background: currentColor;
          margin: 0 2px;
          animation: ${isReducedMotion ? "none" : "pulse 1.4s ease-in-out infinite"};
        }

        .dot:nth-child(1) {
          animation-delay: 0s;
        }

        .dot:nth-child(2) {
          animation-delay: 0.2s;
        }

        .dot:nth-child(3) {
          animation-delay: 0.4s;
        }

        @keyframes pulse {
          0%, 60%, 100% {
            opacity: 0.3;
            transform: scale(1);
          }
          30% {
            opacity: 1;
            transform: scale(1.2);
          }
        }
      `}</style>

      <div className="loading-orb" />

      <div className="progress-text">
        <p className="text-sm">
          <span className="dot" />
          <span className="dot" />
          <span className="dot" />
        </p>
      </div>
    </div>
  );
}
