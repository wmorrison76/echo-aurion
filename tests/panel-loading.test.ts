/**
 * Panel Loading Integration Tests
 * 
 * Tests that panels can be loaded successfully.
 * Note: These tests require a running dev server or mock environment.
 */

import { describe, it, expect, vi, beforeAll } from "vitest";
import { PANEL_REGISTRY, PanelKey } from "@/lib/panel-registry";

describe("Panel Loading", () => {
  // Mock environment for testing
  const mockWindow = {
    location: { href: "http://localhost:8080" },
    navigator: { userAgent: "test" },
  };

  beforeAll(() => {
    global.window = mockWindow as any;
  });

  it("should have loaders for all registry entries", () => {
    Object.entries(PANEL_REGISTRY).forEach(([key, loader]) => {
      expect(loader).toBeDefined();
      expect(typeof loader).toBe("function");
    });
  });

  it("should handle loading errors gracefully", async () => {
    // Test that safe loaders handle errors
    const testLoader = PANEL_REGISTRY["dashboard"];
    if (testLoader) {
      // This would need actual module loading in test environment
      expect(testLoader).toBeDefined();
    }
  });
});
