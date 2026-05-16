import { describe, it, expect } from "vitest";
import { normalizeUnit, toOunces } from "@shared/api";
describe("Shared API Utilities", () => {
  describe("normalizeUnit", () => {
    it("should normalize ounce variations to oz", () => {
      expect(normalizeUnit("oz")).toBe("oz");
      expect(normalizeUnit("ounce")).toBe("oz");
      expect(normalizeUnit("ounces")).toBe("oz");
      expect(normalizeUnit("OZ")).toBe("oz");
    });
    it("should normalize pound variations to lb", () => {
      expect(normalizeUnit("lb")).toBe("lb");
      expect(normalizeUnit("lbs")).toBe("lb");
      expect(normalizeUnit("pound")).toBe("lb");
      expect(normalizeUnit("pounds")).toBe("lb");
      expect(normalizeUnit("LB")).toBe("lb");
    });
    it("should normalize gram variations to g", () => {
      expect(normalizeUnit("g")).toBe("g");
      expect(normalizeUnit("gram")).toBe("g");
      expect(normalizeUnit("grams")).toBe("g");
    });
    it("should normalize kilogram variations to kg", () => {
      expect(normalizeUnit("kg")).toBe("kg");
      expect(normalizeUnit("kilogram")).toBe("kg");
      expect(normalizeUnit("kilograms")).toBe("kg");
    });
    it("should normalize milliliter variations to ml", () => {
      expect(normalizeUnit("ml")).toBe("ml");
      expect(normalizeUnit("ML")).toBe("ml");
    });
    it("should normalize liter variations to l", () => {
      expect(normalizeUnit("l")).toBe("l");
      expect(normalizeUnit("liter")).toBe("l");
      expect(normalizeUnit("litres")).toBe("l");
      expect(normalizeUnit("litre")).toBe("l");
    });
    it("should normalize each variations to each", () => {
      expect(normalizeUnit("each")).toBe("each");
      expect(normalizeUnit("ea")).toBe("each");
      expect(normalizeUnit("ct")).toBe("each");
      expect(normalizeUnit("count")).toBe("each");
    });
    it("should normalize case variations to case", () => {
      expect(normalizeUnit("case")).toBe("case");
      expect(normalizeUnit("cs")).toBe("case");
      expect(normalizeUnit("CASE")).toBe("case");
    });
    it("should handle whitespace", () => {
      expect(normalizeUnit(" oz")).toBe("oz");
      expect(normalizeUnit(" lb")).toBe("lb");
    });
    it("should return unknown units unchanged", () => {
      expect(normalizeUnit("unknown")).toBe("unknown");
      expect(normalizeUnit("")).toBe("");
    });
  });
  describe("toOunces", () => {
    it("should convert pounds to ounces", () => {
      expect(toOunces(1, "lb")).toBe(16);
      expect(toOunces(2, "lb")).toBe(32);
      expect(toOunces(0.5, "lb")).toBe(8);
    });
    it("should handle ounces directly", () => {
      expect(toOunces(16, "oz")).toBe(16);
      expect(toOunces(1, "oz")).toBe(1);
    });
    it("should convert grams to ounces", () => {
      const result = toOunces(28.3495, "g");
      expect(result).toBeCloseTo(1, 1);
    });
    it("should convert kilograms to ounces", () => {
      const result = toOunces(1, "kg");
      expect(result).toBeCloseTo(35.27396195, 1);
    });
    it("should convert milliliters to ounces", () => {
      const result = toOunces(29.5735, "ml");
      expect(result).toBeCloseTo(1, 1);
    });
    it("should convert liters to ounces", () => {
      const result = toOunces(1, "l");
      expect(result).toBeCloseTo(33.814, 1);
    });
    it("should handle unknown units gracefully", () => {
      expect(toOunces(10, "unknown")).toBe(10);
    });
    it("should handle case insensitivity", () => {
      expect(toOunces(1, "LB")).toBe(16);
      expect(toOunces(1, "Lb")).toBe(16);
    });
  });
});
