import { lazy } from "react";

/** Wrap a dynamic import so we always hand React.lazy a default export */
function lazyDefault<T extends object>(loader: () => Promise<any>) {
  return lazy(async () => {
    const m = await loader();
    // Prefer m.default; otherwise pick a likely component (named export)
    const candidate =
      m.default ??
      m.EchoCanvas ??               // our bridge named export
      m.CustomCakeStudio ??         // if someone imported the page directly
      Object.values(m).find((v) => typeof v === "function");
    return { default: candidate as any };
  });
}

/** Map your panels by slug/key to concrete files (no folder barrels) */
export const PANEL_COMPONENTS: Record<string, React.ComponentType<any>> = {
  // Baking & Pastry should point straight to the bridge file
  "baking-pastry": lazyDefault(() =>
    import("@/modules/CustomCakeStudio/bridge/EchoCanvas")
  ),

  // add more panels here the same way, always pointing at a file:
  // "inventory": lazyDefault(() => import("@/modules/Inventory/Panel")),
  // "orders":    lazyDefault(() => import("@/modules/Orders/Panel")),
};
