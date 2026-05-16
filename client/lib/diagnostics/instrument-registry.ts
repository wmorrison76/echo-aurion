/**
 * Instrument panel registry loaders to record import start/success/failure in diagnostic core.
 * Call instrumentPanelRegistry() once at app init when diag is enabled.
 */

import { PANEL_REGISTRY } from "@/lib/panel-registry";
import { diag } from "./diagnostic-core";

export function instrumentPanelRegistry(): void {
  if (!diag.isEnabled()) return;

  const keys = Object.keys(PANEL_REGISTRY) as (keyof typeof PANEL_REGISTRY)[];
  for (const key of keys) {
    const loader = PANEL_REGISTRY[key];
    if (typeof loader !== "function") continue;

    const path = `registry:${key}`;
    (PANEL_REGISTRY as Record<string, () => Promise<{ default: unknown }>>)[key] = async () => {
      diag.importStart(key, path);
      try {
        const module = await loader();
        diag.importSuccess(key, path);
        return module;
      } catch (error) {
        diag.importFailure(key, path, error instanceof Error ? error : new Error(String(error)));
        throw error;
      }
    };
  }
}
