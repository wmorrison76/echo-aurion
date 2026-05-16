/**
 * Pathway Panel Load Smoke Test
 *
 * Verifies that each pathway module's panel entry can be loaded without throwing.
 * Pathway modules: prospect-to-plate and invoice-to-plate (Dashboard, Culinary,
 * Schedule, MaestroBQT, Pastry, PurchasingReceiving, EchoAurum, EchoEventStudio).
 * Records which key fails and with what error for incremental fixing.
 *
 * @see INDUSTRY_STANDARD_OS_ARCHITECTURE.md
 * @see .cursor/plans/pathway_audit_and_loading_fix (Section 5)
 */

import { describe, it, expect } from "vitest";
import { PANEL_REGISTRY, type PanelKey } from "@/lib/panel-registry";

const PATHWAY_PANEL_KEYS: PanelKey[] = [
  "dashboard",
  "culinary",
  "schedule",
  "maestro-bqt",
  "pastry",
  "purchasing-receiving",
  "aurum",
  "events",
];

describe("Pathway panel load smoke", () => {
  it("should load each pathway panel module without throwing", async () => {
    const failures: { key: string; error: string }[] = [];

    for (const key of PATHWAY_PANEL_KEYS) {
      const loader = PANEL_REGISTRY[key];
      if (!loader) {
        failures.push({ key, error: "No loader in PANEL_REGISTRY" });
        continue;
      }
      try {
        const mod = await loader();
        if (!mod?.default) {
          failures.push({
            key,
            error: "Module loaded but default export is undefined",
          });
        }
      } catch (err) {
        const message =
          err instanceof Error
            ? err.message
            : typeof err === "object" && err !== null && "message" in err
              ? String((err as { message: unknown }).message)
              : String(err);
        const stack = err instanceof Error ? err.stack : undefined;
        failures.push({
          key,
          error: stack ? `${message}\n${stack}` : message,
        });
      }
    }

    if (failures.length > 0) {
      const report = failures
        .map((f) => `  - ${f.key}: ${f.error.split("\n")[0]}`)
        .join("\n");
      expect(
        failures,
        `Pathway panel load failures (fix these to restore connected modules):\n${report}`,
      ).toHaveLength(0);
    }
  }, 60000);
});
