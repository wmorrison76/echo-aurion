import React, { Suspense } from "react";
import { PANEL_COMPONENTS } from "./registry";

export function PanelHost({ slug }: { slug: string }) {
  const Cmp = PANEL_COMPONENTS[slug];
  if (!Cmp) return <div className="p-3 text-red-400">Unknown panel: {slug}</div>;
  return (
    <Suspense fallback={<div className="p-3 opacity-70">Loading…</div>}>
      <Cmp />
    </Suspense>
  );
}
