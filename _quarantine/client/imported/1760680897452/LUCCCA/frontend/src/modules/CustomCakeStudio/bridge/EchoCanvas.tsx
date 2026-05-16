// src/modules/CustomCakeStudio/bridge/EchoCanvas.tsx
import { lazy, Suspense } from "react";

// Load the Studio page directly (no barrels, no star re-exports)
const Studio = lazy(() => import("../pages/Studio"));

export default function EchoCanvas(): JSX.Element {
  return (
    <Suspense fallback={<div className="p-3 text-xs opacity-70">Loading EchoCanvas…</div>}>
      <Studio />
    </Suspense>
  );
}

// Optional named export (handy for some import styles)
export { EchoCanvas };
