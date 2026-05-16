// Main component
export { default as CakeStudio } from "./CakeStudio";
export { default as CakeBuilderModule, type CakeBuilderModuleProps, CakeBuilderTab } from "./CakeBuilderModule";

// UI Components
export { default as ThreeCake } from "./ThreeCake";
export { default as FillingPicker } from "./FillingPicker";
export { default as GraphicGeneratorPanel } from "./GraphicGeneratorPanel";
export { default as IntakePrescreen } from "./IntakePrescreen";
export { default as RecipeManager } from "./RecipeManager";
export { default as LaunchBar } from "./LaunchBar";
export { default as NewOrderForm } from "./NewOrderForm";
export { default as StudioTabs } from "./StudioTabs";
export { default as AllergenManager } from "./AllergenManager";
export { default as AdvancedPricing } from "./AdvancedPricing";
export { default as DeliveryScheduler } from "./DeliveryScheduler";
export { default as YieldCalculator } from "./YieldCalculator";
export { default as AdminPanel, loadAdminSettings } from "./AdminPanel";

// Utilities
export * from "./types";
export * from "./logic";
export * from "./settings";
export * from "./textures";

// Module metadata for lazy loading
export const CAKE_BUILDER_MODULE = {
  name: "cake-builder",
  displayName: "Cake Designer & Builder",
  description: "Design and price custom cakes with 3D preview, intake forms, and recipe management",
  icon: "🍰",
  version: "1.0.0",
};
