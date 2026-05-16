/**
 * Beverage Intelligence Initialization
 * Initialize OS Bus handlers and services on app startup
 */

import { initializeBeverageIntelligenceOSBus } from "../../shared/echo/beverage-intelligence/os-bus-integration";

/**
 * Initialize beverage intelligence services
 * Call this in App.tsx on mount
 */
export function initializeBeverageIntelligence() {
  try {
    // Initialize OS Bus event handlers
    initializeBeverageIntelligenceOSBus();
    
    console.log("[BeverageIntelligence] Services initialized");
  } catch (error) {
    console.error("[BeverageIntelligence] Failed to initialize:", error);
  }
}
