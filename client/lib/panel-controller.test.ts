/**
 * Panel Controller — minimal contract test
 * Layout shape and bounds; no browser required.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  calculateGridLayout,
  calculateCascadeLayout,
  applyPanelLayout,
  dispatchDockAction,
  dispatchOpenPanel,
  type PanelLayout,
  type DockAction,
} from "./panel-controller";

describe("panel-controller", () => {
  describe("calculateGridLayout", () => {
    it("returns empty positions for no panelIds", () => {
      const layout = calculateGridLayout(
        [],
        1200,
        800,
        {},
        {},
      );
      expect(layout.type).toBe("grid");
      expect(layout.positions).toEqual({});
      expect(Object.keys(layout.positions)).toHaveLength(0);
    });

    it("returns correct shape for one panel", () => {
      const layout = calculateGridLayout(
        ["a"],
        1200,
        800,
        { a: 400 },
        { a: 300 },
      );
      expect(layout.type).toBe("grid");
      expect(layout.positions).toHaveProperty("a");
      expect(layout.positions.a).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
      expect(layout.sizes).toHaveProperty("a");
      expect(layout.sizes!.a).toMatchObject({ width: expect.any(Number), height: expect.any(Number) });
    });

    it("returns positions within container bounds (sidebar 256, titleBar 48)", () => {
      const layout = calculateGridLayout(
        ["p1", "p2"],
        1000,
        600,
        { p1: 300, p2: 300 },
        { p1: 250, p2: 250 },
      );
      const sidebarWidth = 256;
      const titleBarHeight = 48;
      const padding = 12;
      Object.values(layout.positions).forEach((pos) => {
        expect(pos.x).toBeGreaterThanOrEqual(sidebarWidth + padding);
        expect(pos.y).toBeGreaterThanOrEqual(titleBarHeight + padding);
        expect(pos.x).toBeLessThanOrEqual(1000 - padding);
        expect(pos.y).toBeLessThanOrEqual(600 - padding);
      });
    });
  });

  describe("calculateCascadeLayout", () => {
    it("returns empty positions for no panelIds", () => {
      const layout = calculateCascadeLayout([], 1200, 800);
      expect(layout.type).toBe("cascade");
      expect(layout.positions).toEqual({});
    });

    it("returns one position per panelId", () => {
      const layout = calculateCascadeLayout(["a", "b", "c"], 1200, 800);
      expect(layout.type).toBe("cascade");
      expect(Object.keys(layout.positions)).toHaveLength(3);
      expect(layout.positions.a).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
      expect(layout.positions.b).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
      expect(layout.positions.c).toMatchObject({ x: expect.any(Number), y: expect.any(Number) });
    });

    it("cascade offsets increase with index", () => {
      const layout = calculateCascadeLayout(["a", "b"], 1200, 800);
      expect(layout.positions.b.x).toBeGreaterThanOrEqual(layout.positions.a.x);
      expect(layout.positions.b.y).toBeGreaterThanOrEqual(layout.positions.a.y);
    });
  });

  describe("applyPanelLayout", () => {
    it("invokes callback for each panel in positions", () => {
      const layout: PanelLayout = {
        type: "grid",
        positions: { id1: { x: 10, y: 20 }, id2: { x: 30, y: 40 } },
      };
      const cb = vi.fn();
      applyPanelLayout(layout, cb);
      expect(cb).toHaveBeenCalledTimes(2);
      expect(cb).toHaveBeenCalledWith("id1", { x: 10, y: 20 });
      expect(cb).toHaveBeenCalledWith("id2", { x: 30, y: 40 });
    });
  });

  describe("dispatchDockAction / dispatchOpenPanel", () => {
    let listener: (e: Event) => void;
    beforeEach(() => {
      listener = vi.fn();
      if (typeof window !== "undefined") {
        window.addEventListener("dock-action", listener);
        window.addEventListener("open-panel", listener);
      }
    });
    afterEach(() => {
      if (typeof window !== "undefined") {
        window.removeEventListener("dock-action", listener);
        window.removeEventListener("open-panel", listener);
      }
    });

    it("dispatchDockAction dispatches dock-action with detail.action", () => {
      if (typeof window === "undefined") return;
      dispatchDockAction("close-all");
      expect(listener).toHaveBeenCalled();
      const e = listener.mock.calls.find((c) => (c[0] as CustomEvent).detail?.action === "close-all")?.[0] as CustomEvent;
      expect(e?.detail?.action).toBe("close-all");
    });

    it("dispatchOpenPanel dispatches open-panel with detail.id", () => {
      if (typeof window === "undefined") return;
      dispatchOpenPanel("dashboard");
      expect(listener).toHaveBeenCalled();
      const e = listener.mock.calls.find((c) => (c[0] as CustomEvent).detail?.id === "dashboard")?.[0] as CustomEvent;
      expect(e?.detail?.id).toBe("dashboard");
    });
  });
});
