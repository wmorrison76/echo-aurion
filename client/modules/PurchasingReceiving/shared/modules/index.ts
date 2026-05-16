/** * Module Ecosystem Exports * * Central export point for all modules and their integration interfaces. * Developers should import from this file for all module-related functionality. */ // ===== PANEL TYPES =====
export type {
  PanelConfig,
  PanelEvent,
  DataChangeEvent,
  SelectionEvent,
  ActionRequestEvent,
  ErrorEvent,
  AnyPanelEvent,
  PanelEventHandler,
  PanelCloseHandler,
  PanelMinimizeHandler,
  ModuleType,
  ModuleMetadata,
  PanelCallbacks,
  PanelInitConfig,
  UsePanelState,
} from "@shared/types/panel"; // ===== WASTE MODULE =====
export type {
  WasteLog,
  WasteDisposal,
  WastePrevention,
} from "@shared/types/waste"; // ===== IOT MODULE =====
export type {
  IoTDevice,
  IoTAlert,
  SensorReading,
  RFIDTag,
} from "@shared/types/iot"; // ===== PURCHASING MODULE =====
export type { OrderGuideRow } from "../../src/modules/PurchRec/services/orderGuide.service";
export type {
  PurchaseOrder,
  InventoryLot,
} from "../../src/modules/PurchRec/data/schemas"; /** * Module Metadata Registry * * Describes all available modules in the ecosystem. */
export const MODULE_METADATA = {
  waste: {
    id: "waste",
    name: "Waste Tracking & Cost Optimization",
    description:
      "Track waste, analyze costs, monitor disposal, and implement prevention strategies",
    version: "1.0.0",
    emitEvents: ["dataChange", "error"],
    listenEvents: ["dataChange"],
    supportedActions: [
      "create-waste-log",
      "update-waste-log",
      "delete-waste-log",
    ],
    requiredRoles: ["Admin", "Manager", "Chef"],
    dependencies: [] as any[],
  },
  iot: {
    id: "iot",
    name: "IoT & Real-Time Monitoring",
    description:
      "Monitor RFID devices, sensor readings, spoilage risks, and real-time alerts",
    version: "1.0.0",
    emitEvents: ["dataChange", "error"],
    listenEvents: ["dataChange"],
    supportedActions: [
      "create-device",
      "update-device",
      "create-alert-rule",
      "update-alert-rule",
    ],
    requiredRoles: ["Admin", "Manager"],
    dependencies: [] as any[],
  },
  purchasing: {
    id: "purchasing",
    name: "Purchasing & Inventory Management",
    description: "Manage orders, receiving, inventory lots, and stock ledger",
    version: "1.0.0",
    emitEvents: ["dataChange", "selection", "error"],
    listenEvents: ["dataChange"],
    supportedActions: [
      "create-purchase-order",
      "submit-purchase-order",
      "receive-purchase-order",
      "create-inventory-lot",
    ],
    requiredRoles: ["Admin", "Manager", "Purchasing", "Receiver"],
    dependencies: [] as any[],
  },
  receiving: {
    id: "receiving",
    name: "Receiving & QC",
    description:
      "Post deliveries, capture lot data, and update on-hand balances",
    version: "1.0.0",
    emitEvents: ["dataChange", "error"],
    listenEvents: ["dataChange"],
    supportedActions: ["receive-delivery", "capture-lot", "update-balance"],
    requiredRoles: ["Admin", "Manager", "Receiver"],
    dependencies: ["purchasing"] as any[],
  },
  inventory: {
    id: "inventory",
    name: "Inventory Visibility",
    description:
      "Monitor current lots, expirations, and vendor sourcing trends",
    version: "1.0.0",
    emitEvents: ["selection", "error"],
    listenEvents: ["dataChange"],
    supportedActions: [],
    requiredRoles: ["Admin", "Manager", "Chef", "Finance"],
    dependencies: ["purchasing"] as any[],
  },
  ledger: {
    id: "ledger",
    name: "Stock Ledger Audit",
    description:
      "Audit inbound, outbound, and adjustment history across ingredients",
    version: "1.0.0",
    emitEvents: ["error"],
    listenEvents: ["dataChange"],
    supportedActions: [],
    requiredRoles: ["Admin", "Manager", "Finance"],
    dependencies: ["purchasing"] as any[],
  },
} as const; /** * Get module metadata by ID */
export function getModuleMetadata(moduleId: string) {
  return MODULE_METADATA[moduleId as keyof typeof MODULE_METADATA] || null;
} /** * Check if module is available */
export function isModuleAvailable(moduleId: string): boolean {
  return Object.keys(MODULE_METADATA).includes(moduleId);
} /** * Get all available modules */
export function getAvailableModules() {
  return Object.values(MODULE_METADATA);
} /** * Check if user can access module based on role */
export function canAccessModule(moduleId: string, userRole: string): boolean {
  const metadata = getModuleMetadata(moduleId);
  if (!metadata) return false;
  return metadata.requiredRoles.includes(userRole);
} /** * Get modules that depend on a given module */
export function getModuleDependents(moduleId: string) {
  return Object.values(MODULE_METADATA).filter(
    (m) => m.dependencies && m.dependencies.includes(moduleId as any),
  );
} /** * Event Type Helpers */
export const EventTypes = {
  DATA_CHANGE: "dataChange",
  SELECTION: "selection",
  ACTION_REQUEST: "actionRequest",
  ERROR: "error",
} as const; /** * Common Module Actions */
export const ModuleActions = {
  // Waste Actions CREATE_WASTE_LOG:"create-waste-log", UPDATE_WASTE_LOG:"update-waste-log", DELETE_WASTE_LOG:"delete-waste-log", // IoT Actions CREATE_DEVICE:"create-device", UPDATE_DEVICE:"update-device", DELETE_DEVICE:"delete-device", CREATE_ALERT_RULE:"create-alert-rule", UPDATE_ALERT_RULE:"update-alert-rule", // Purchasing Actions CREATE_PURCHASE_ORDER:"create-purchase-order", SUBMIT_PURCHASE_ORDER:"submit-purchase-order", RECEIVE_PURCHASE_ORDER:"receive-purchase-order", CREATE_INVENTORY_LOT:"create-inventory-lot",
} as const; /** * Module Integration Example Config */
export interface ModuleIntegrationConfig {
  /** Modules to load */ modules: string[];
  /** Event bus handler */ onModuleEvent?: (event: any) => void;
  /** Layout configuration */ layout?: "grid" | "stack" | "tabs" | "custom";
  /** Auto-connect modules (enable inter-module communication) */ autoConnect?: boolean;
} /** * Create a module ecosystem instance */
export function createModuleEcosystem(config: ModuleIntegrationConfig) {
  const { modules, onModuleEvent, autoConnect = true } = config;
  const ecosystem = {
    activeModules: modules.filter(isModuleAvailable),
    config,
    emit: onModuleEvent,
    canAccessModule: (moduleId: string, userRole: string) =>
      canAccessModule(moduleId, userRole),
    getMetadata: (moduleId: string) => getModuleMetadata(moduleId),
  };
  return ecosystem;
}
