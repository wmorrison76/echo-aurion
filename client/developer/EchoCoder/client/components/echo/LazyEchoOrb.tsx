import { lazy, Suspense, memo } from "react";
import { Loader2 } from "lucide-react";

// Lazy load 3D renderer to reduce initial bundle
const EchoOrbComponent = lazy(() =>
  import("./EchoOrb").then((module) => ({
    default: module.EchoOrb,
  }))
);

interface LazyEchoOrbProps {
  points?: number;
  radius?: number;
  speed?: number;
  wobble?: number;
  colorA?: string;
  colorB?: string;
  compactness?: number;
  className?: string;
  bare?: boolean;
  showRings?: boolean;
  pattern?: "classic" | "waves" | "galaxy" | "fractal" | "tessellation";
}

/**
 * Lazy-loaded 3D Echo Orb with loading fallback
 * Reduces initial bundle by ~400KB by code-splitting three.js
 */
export const LazyEchoOrb = memo(function LazyEchoOrb(
  props: LazyEchoOrbProps
) {
  return (
    <Suspense
      fallback={
        <div className={`flex items-center justify-center ${props.className}`}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className="w-8 h-8 animate-spin text-cyan-400" />
            <p className="text-sm text-muted-foreground">Loading 3D orb...</p>
          </div>
        </div>
      }
    >
      <EchoOrbComponent {...props} />
    </Suspense>
  );
});

LazyEchoOrb.displayName = "LazyEchoOrb";

export default LazyEchoOrb;
