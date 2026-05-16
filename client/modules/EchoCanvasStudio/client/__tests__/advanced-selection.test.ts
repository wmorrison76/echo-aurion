/**
 * Tests for Advanced Selection System
 */

import { advancedSelectionEngine } from "../lib/advanced-selection";

describe("AdvancedSelectionEngine", () => {
  let canvas: HTMLCanvasElement;

  beforeEach(() => {
    canvas = document.createElement("canvas");
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, 256, 256);
      ctx.fillStyle = "#000000";
      ctx.fillRect(50, 50, 100, 100);
    }
  });

  describe("invertSelection", () => {
    it("should invert selection mask", () => {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = 256;
      maskCanvas.height = 256;
      const ctx = maskCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 256, 256);
        ctx.fillStyle = "#000000";
        ctx.fillRect(50, 50, 100, 100);
      }

      const mask = advancedSelectionEngine["extractMaskFromCanvas"](maskCanvas);
      const inverted = advancedSelectionEngine.invertSelection(mask);

      expect(inverted.width).toBe(mask.width);
      expect(inverted.height).toBe(mask.height);
      expect(inverted.data.length).toBe(mask.data.length);
    });
  });

  describe("combineSelections", () => {
    it("should combine two selections using union", () => {
      const mask1Canvas = document.createElement("canvas");
      mask1Canvas.width = 256;
      mask1Canvas.height = 256;
      const ctx1 = mask1Canvas.getContext("2d");
      if (ctx1) {
        ctx1.fillStyle = "#ffffff";
        ctx1.fillRect(0, 0, 100, 256);
      }

      const mask2Canvas = document.createElement("canvas");
      mask2Canvas.width = 256;
      mask2Canvas.height = 256;
      const ctx2 = mask2Canvas.getContext("2d");
      if (ctx2) {
        ctx2.fillStyle = "#ffffff";
        ctx2.fillRect(100, 0, 100, 256);
      }

      const mask1 =
        advancedSelectionEngine["extractMaskFromCanvas"](mask1Canvas);
      const mask2 =
        advancedSelectionEngine["extractMaskFromCanvas"](mask2Canvas);
      const combined = advancedSelectionEngine.combineSelections(mask1, mask2);

      expect(combined.width).toBe(Math.max(mask1.width, mask2.width));
      expect(combined.height).toBe(Math.max(mask1.height, mask2.height));
    });
  });

  describe("intersectSelections", () => {
    it("should intersect two selections", () => {
      const mask1Canvas = document.createElement("canvas");
      mask1Canvas.width = 256;
      mask1Canvas.height = 256;
      const ctx1 = mask1Canvas.getContext("2d");
      if (ctx1) {
        ctx1.fillStyle = "#ffffff";
        ctx1.fillRect(0, 0, 128, 256);
      }

      const mask2Canvas = document.createElement("canvas");
      mask2Canvas.width = 256;
      mask2Canvas.height = 256;
      const ctx2 = mask2Canvas.getContext("2d");
      if (ctx2) {
        ctx2.fillStyle = "#ffffff";
        ctx2.fillRect(64, 0, 192, 256);
      }

      const mask1 =
        advancedSelectionEngine["extractMaskFromCanvas"](mask1Canvas);
      const mask2 =
        advancedSelectionEngine["extractMaskFromCanvas"](mask2Canvas);
      const intersected = advancedSelectionEngine.intersectSelections(
        mask1,
        mask2,
      );

      expect(intersected.width).toBe(Math.max(mask1.width, mask2.width));
      expect(intersected.height).toBe(Math.max(mask1.height, mask2.height));
    });
  });

  describe("modifySelection", () => {
    it("should expand selection", () => {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = 256;
      maskCanvas.height = 256;
      const ctx = maskCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(100, 100, 50, 50);
      }

      const mask = advancedSelectionEngine["extractMaskFromCanvas"](maskCanvas);
      const expanded = advancedSelectionEngine.modifySelection(
        mask,
        "expand",
        10,
      );

      expect(expanded.width).toBe(mask.width);
      expect(expanded.height).toBe(mask.height);
      expect(expanded.bbox.width).toBeGreaterThanOrEqual(mask.bbox.width);
      expect(expanded.bbox.height).toBeGreaterThanOrEqual(mask.bbox.height);
    });

    it("should contract selection", () => {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = 256;
      maskCanvas.height = 256;
      const ctx = maskCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(50, 50, 150, 150);
      }

      const mask = advancedSelectionEngine["extractMaskFromCanvas"](maskCanvas);
      const contracted = advancedSelectionEngine.modifySelection(
        mask,
        "contract",
        10,
      );

      expect(contracted.width).toBe(mask.width);
      expect(contracted.height).toBe(mask.height);
    });

    it("should feather selection", () => {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = 256;
      maskCanvas.height = 256;
      const ctx = maskCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(100, 100, 50, 50);
      }

      const mask = advancedSelectionEngine["extractMaskFromCanvas"](maskCanvas);
      const feathered = advancedSelectionEngine.modifySelection(
        mask,
        "feather",
        5,
      );

      expect(feathered.width).toBe(mask.width);
      expect(feathered.height).toBe(mask.height);
    });

    it("should smooth selection", () => {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = 256;
      maskCanvas.height = 256;
      const ctx = maskCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(100, 100, 50, 50);
        ctx.fillStyle = "#000000";
        ctx.fillRect(110, 110, 5, 5);
      }

      const mask = advancedSelectionEngine["extractMaskFromCanvas"](maskCanvas);
      const smoothed = advancedSelectionEngine.modifySelection(
        mask,
        "smooth",
        3,
      );

      expect(smoothed.width).toBe(mask.width);
      expect(smoothed.height).toBe(mask.height);
    });
  });

  describe("extractMaskFromCanvas", () => {
    it("should extract mask and calculate bounding box", () => {
      const maskCanvas = document.createElement("canvas");
      maskCanvas.width = 256;
      maskCanvas.height = 256;
      const ctx = maskCanvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(50, 75, 100, 75);
      }

      const mask = advancedSelectionEngine["extractMaskFromCanvas"](maskCanvas);

      expect(mask.width).toBe(256);
      expect(mask.height).toBe(256);
      expect(mask.bbox.x).toBeLessThanOrEqual(50);
      expect(mask.bbox.y).toBeLessThanOrEqual(75);
      expect(mask.bbox.width).toBeGreaterThan(0);
      expect(mask.bbox.height).toBeGreaterThan(0);
    });
  });
});
