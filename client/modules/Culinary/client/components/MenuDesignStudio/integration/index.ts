/**
 * Menu Designer AI³ Integration Module
 * 
 * Exports for connecting the Menu Designer with:
 * - AI³ Engine for design intelligence and suggestions
 * - Dish Assembly workspace for menu data
 * - Layout generation and recommendations
 */

export { DishAssemblyBridge, AI3LayoutGenerator } from "./DishAssemblyBridge";
export { DishAssemblyIntegrationPanel } from "./DishAssemblyIntegrationPanel";

export type { DishData, MenuLayoutConfig } from "./DishAssemblyBridge";
export type { DishAssemblyIntegrationPanelProps } from "./DishAssemblyIntegrationPanel";

export default {
  DishAssemblyBridge,
  DishAssemblyIntegrationPanel,
};
