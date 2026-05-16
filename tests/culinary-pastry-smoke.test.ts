/**
 * Culinary & Pastry smoke tests
 *
 * What these tests verify:
 * - Module load: loader resolves, default export is a React component (function/class).
 * - Registry: every sidebar panel has a loader and metadata.
 *
 * What these tests do NOT verify:
 * - Actual render: that the component shows visible content when mounted in the panel.
 *   (That would require mounting with React Testing Library and asserting on DOM text,
 *   or e2e tests in a browser. Load-only tests can pass while the panel content is blank.)
 *
 * Panel layout fixes (PanelHost + Culinary/Pastry wrapper + Index roots) ensure the
 * content area gets flex height so modules can fill and display; verify in the app.
 */

import { describe, it, expect } from "vitest";
import {
  PANEL_REGISTRY,
  PANEL_METADATA,
  isValidPanelKey,
  type PanelKey,
} from "@/lib/panel-registry";

// Panel IDs used by the main Sidebar (client/components/site/Sidebar.tsx NAV_ITEMS)
const SIDEBAR_PANEL_IDS: string[] = [
  "dashboard",
  "ekg",
  "maestro-bqt",
  "culinary",
  "pastry",
  "schedule",
  "inventory",
  "mixology_sommelier",
  "purchasing-receiving",
  "aurum",
  "stratus",
  "forecast-hub",
  "echo-events",
  "layout",
  "trace-viewer",
  "chefnet",
  "support",
  "module-status",
];

describe("Culinary & Pastry smoke", () => {
  describe("sidebar modules have registry entries", () => {
    it("every sidebar panel ID is a valid panel key", () => {
      for (const id of SIDEBAR_PANEL_IDS) {
        expect(isValidPanelKey(id), `Sidebar panel "${id}" should be a valid PanelKey`).toBe(
          true
        );
      }
    });

    it("every sidebar panel has a loader in PANEL_REGISTRY", () => {
      for (const id of SIDEBAR_PANEL_IDS) {
        const loader = PANEL_REGISTRY[id as PanelKey];
        expect(loader, `PANEL_REGISTRY should have loader for "${id}"`).toBeDefined();
        expect(typeof loader, `Loader for "${id}" should be a function`).toBe("function");
      }
    });

    it("every sidebar panel has metadata in PANEL_METADATA", () => {
      for (const id of SIDEBAR_PANEL_IDS) {
        const meta = PANEL_METADATA[id as PanelKey];
        expect(meta, `PANEL_METADATA should have entry for "${id}"`).toBeDefined();
        expect(meta?.key).toBe(id);
        expect(meta?.label).toBeDefined();
      }
    });
  });

  describe("Culinary module loads and exports component", () => {
    it("culinary loader resolves to module with default export", async () => {
      const loader = PANEL_REGISTRY["culinary"];
      expect(loader).toBeDefined();
      const mod = await loader();
      expect(mod).toBeDefined();
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");
    });

    it("culinary default export is a React component (renderable)", async () => {
      const loader = PANEL_REGISTRY["culinary"];
      const mod = await loader();
      const Component = mod.default;
      expect(Component).toBeDefined();
      // Component may be a function or a class with render
      const isFunctionComponent = typeof Component === "function";
      const isClassComponent =
        typeof Component === "function" &&
        Component.prototype &&
        typeof Component.prototype.render === "function";
      expect(
        isFunctionComponent || isClassComponent,
        "Culinary default export should be a React component"
      ).toBe(true);
    });
  });

  describe("Pastry module loads and exports component", () => {
    it("pastry loader resolves to module with default export", async () => {
      const loader = PANEL_REGISTRY["pastry"];
      expect(loader).toBeDefined();
      const mod = await loader();
      expect(mod).toBeDefined();
      expect(mod.default).toBeDefined();
      expect(typeof mod.default).toBe("function");
    });

    it("pastry default export is a React component (renderable)", async () => {
      const loader = PANEL_REGISTRY["pastry"];
      const mod = await loader();
      const Component = mod.default;
      expect(Component).toBeDefined();
      const isFunctionComponent = typeof Component === "function";
      const isClassComponent =
        typeof Component === "function" &&
        Component.prototype &&
        typeof Component.prototype.render === "function";
      expect(
        isFunctionComponent || isClassComponent,
        "Pastry default export should be a React component"
      ).toBe(true);
    });
  });

  describe("all sidebar modules load without throwing", () => {
    for (const id of SIDEBAR_PANEL_IDS) {
      it(`${id} loader resolves`, async () => {
        const loader = PANEL_REGISTRY[id as PanelKey];
        expect(loader).toBeDefined();
        const mod = await loader();
        expect(mod).toBeDefined();
        expect(mod.default).toBeDefined();
        expect(typeof mod.default).toBe("function");
      });
    }
  });
});
