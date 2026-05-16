/**
 * Tests for Color Management System
 */

import { ColorManagementEngine } from "../lib/color-management";

describe("ColorManagementEngine", () => {
  let engine: ColorManagementEngine;

  beforeEach(() => {
    engine = new ColorManagementEngine();
  });

  describe("RGB to CMYK conversion", () => {
    it("should convert pure red (RGB 255, 0, 0) to CMYK", () => {
      const cmyk = engine.rgbToCmyk({ red: 255, green: 0, blue: 0 });
      expect(cmyk.cyan).toBe(0);
      expect(cmyk.magenta).toBe(100);
      expect(cmyk.yellow).toBe(100);
      expect(cmyk.black).toBe(0);
    });

    it("should convert pure green (RGB 0, 255, 0) to CMYK", () => {
      const cmyk = engine.rgbToCmyk({ red: 0, green: 255, blue: 0 });
      expect(cmyk.cyan).toBe(100);
      expect(cmyk.magenta).toBe(0);
      expect(cmyk.yellow).toBe(100);
      expect(cmyk.black).toBe(0);
    });

    it("should convert pure blue (RGB 0, 0, 255) to CMYK", () => {
      const cmyk = engine.rgbToCmyk({ red: 0, green: 0, blue: 255 });
      expect(cmyk.cyan).toBe(100);
      expect(cmyk.magenta).toBe(100);
      expect(cmyk.yellow).toBe(0);
      expect(cmyk.black).toBe(0);
    });

    it("should convert white (RGB 255, 255, 255) to CMYK", () => {
      const cmyk = engine.rgbToCmyk({ red: 255, green: 255, blue: 255 });
      expect(cmyk.cyan).toBe(0);
      expect(cmyk.magenta).toBe(0);
      expect(cmyk.yellow).toBe(0);
      expect(cmyk.black).toBe(0);
    });

    it("should convert black (RGB 0, 0, 0) to CMYK", () => {
      const cmyk = engine.rgbToCmyk({ red: 0, green: 0, blue: 0 });
      expect(cmyk.cyan).toBe(0);
      expect(cmyk.magenta).toBe(0);
      expect(cmyk.yellow).toBe(0);
      expect(cmyk.black).toBe(100);
    });

    it("should convert gray (RGB 128, 128, 128) to CMYK", () => {
      const cmyk = engine.rgbToCmyk({ red: 128, green: 128, blue: 128 });
      expect(cmyk.black).toBeGreaterThan(0);
      expect(cmyk.black).toBeLessThan(100);
    });
  });

  describe("CMYK to RGB conversion", () => {
    it("should convert pure cyan (CMYK 100, 0, 0, 0) back to RGB", () => {
      const rgb = engine.cmykToRgb({
        cyan: 100,
        magenta: 0,
        yellow: 0,
        black: 0,
      });
      expect(rgb.red).toBe(0);
      expect(rgb.green).toBeGreaterThan(0);
      expect(rgb.blue).toBeGreaterThan(0);
    });

    it("should convert CMYK black (0, 0, 0, 100) to RGB black", () => {
      const rgb = engine.cmykToRgb({
        cyan: 0,
        magenta: 0,
        yellow: 0,
        black: 100,
      });
      expect(rgb.red).toBe(0);
      expect(rgb.green).toBe(0);
      expect(rgb.blue).toBe(0);
    });

    it("should convert CMYK white (0, 0, 0, 0) to RGB white", () => {
      const rgb = engine.cmykToRgb({
        cyan: 0,
        magenta: 0,
        yellow: 0,
        black: 0,
      });
      expect(rgb.red).toBe(255);
      expect(rgb.green).toBe(255);
      expect(rgb.blue).toBe(255);
    });
  });

  describe("RGB to LAB conversion", () => {
    it("should convert white to LAB", () => {
      const lab = engine.rgbToLab({ red: 255, green: 255, blue: 255 });
      expect(lab.lightness).toBeGreaterThan(95);
      expect(Math.abs(lab.a)).toBeLessThan(5);
      expect(Math.abs(lab.b)).toBeLessThan(5);
    });

    it("should convert black to LAB", () => {
      const lab = engine.rgbToLab({ red: 0, green: 0, blue: 0 });
      expect(lab.lightness).toBeLessThan(5);
    });

    it("should convert red to LAB", () => {
      const lab = engine.rgbToLab({ red: 255, green: 0, blue: 0 });
      expect(lab.lightness).toBeGreaterThan(40);
      expect(lab.a).toBeGreaterThan(50);
    });
  });

  describe("LAB to RGB conversion", () => {
    it("should convert LAB back to RGB", () => {
      const original = { red: 255, green: 0, blue: 0 };
      const lab = engine.rgbToLab(original);
      const converted = engine.labToRgb(lab);

      expect(Math.abs(converted.red - original.red)).toBeLessThan(5);
      expect(Math.abs(converted.green - original.green)).toBeLessThan(5);
      expect(Math.abs(converted.blue - original.blue)).toBeLessThan(5);
    });
  });

  describe("Color space transformations", () => {
    it("should handle RGB to CMYK to RGB roundtrip", () => {
      const original = { red: 100, green: 150, blue: 200 };
      const cmyk = engine.rgbToCmyk(original);
      const back = engine.cmykToRgb(cmyk);

      expect(Math.abs(back.red - original.red)).toBeLessThan(5);
      expect(Math.abs(back.green - original.green)).toBeLessThan(5);
      expect(Math.abs(back.blue - original.blue)).toBeLessThan(5);
    });
  });

  describe("Color Separation", () => {
    it("should generate color separation for CMYK print", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 100;
      canvas.height = 100;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ff0000";
        ctx.fillRect(0, 0, 100, 100);
      }

      const imageData = ctx?.getImageData(0, 0, 100, 100);
      if (imageData) {
        const separation = engine.getColorSeparation(imageData);

        expect(separation.cyan.width).toBe(100);
        expect(separation.cyan.height).toBe(100);
        expect(separation.magenta.width).toBe(100);
        expect(separation.magenta.height).toBe(100);
        expect(separation.yellow.width).toBe(100);
        expect(separation.yellow.height).toBe(100);
        expect(separation.black.width).toBe(100);
        expect(separation.black.height).toBe(100);
      }
    });
  });

  describe("Canvas CMYK conversion", () => {
    it("should convert canvas to CMYK data", () => {
      const canvas = document.createElement("canvas");
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, 10, 10);
      }

      const cmykData = engine.canvasToCmykData(canvas);

      expect(cmykData.width).toBe(10);
      expect(cmykData.height).toBe(10);
      expect(cmykData.cmyk).toHaveLength(100);
      expect(cmykData.cmyk[0].black).toBe(0);
    });
  });

  describe("Color Management Settings", () => {
    it("should initialize with default settings", () => {
      const settings = engine.getSettings();
      expect(settings.workingSpace).toBe("SRGB");
      expect(settings.renderingIntent).toBe("perceptual");
      expect(settings.blackPointCompensation).toBe(true);
    });

    it("should update working space", () => {
      engine.setWorkingSpace("CMYK");
      const settings = engine.getSettings();
      expect(settings.workingSpace).toBe("CMYK");
    });

    it("should not modify original settings object", () => {
      const settings1 = engine.getSettings();
      engine.setWorkingSpace("LAB");
      const settings2 = engine.getSettings();

      expect(settings1.workingSpace).toBe("SRGB");
      expect(settings2.workingSpace).toBe("LAB");
    });
  });
});
