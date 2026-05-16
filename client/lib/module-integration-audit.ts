/**
 * Module Integration Audit
 * 
 * Comprehensive audit of all modules for data integration requirements
 * Identifies which modules need shared store connections
 */

export interface ModuleIntegrationStatus {
  moduleName: string;
  needsInventoryStore: boolean;
  needsSchedulingStore: boolean;
  needsFinancialsStore: boolean;
  integrationStatus: "connected" | "partial" | "missing";
  priority: "high" | "medium" | "low";
  notes?: string;
}

/**
 * Complete audit of all modules for data integration
 */
export const MODULE_INTEGRATION_AUDIT: ModuleIntegrationStatus[] = [
  // Core Modules
  {
    moduleName: "Culinary",
    needsInventoryStore: true,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "high",
    notes: "Connected via useCulinaryInventoryChain",
  },
  {
    moduleName: "Pastry",
    needsInventoryStore: true,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "high",
    notes: "Similar to Culinary, uses inventory for ingredients",
  },
  {
    moduleName: "Schedule",
    needsInventoryStore: false,
    needsSchedulingStore: true,
    needsFinancialsStore: true,
    integrationStatus: "connected",
    priority: "high",
    notes: "Connected via useSchedulingIntegration and useScheduleFinancialsChain",
  },
  {
    moduleName: "Inventory",
    needsInventoryStore: true,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "high",
    notes: "Core store module",
  },
  {
    moduleName: "PurchasingReceiving",
    needsInventoryStore: true,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "high",
    notes: "Connected via Culinary → Inventory → Purchasing chain",
  },
  {
    moduleName: "MaestroBQT",
    needsInventoryStore: true,
    needsSchedulingStore: true,
    needsFinancialsStore: true,
    integrationStatus: "connected",
    priority: "high",
    notes: "Orchestrator module, uses all stores",
  },
  
  // Operational Modules
  {
    moduleName: "GuestExperience",
    needsInventoryStore: true,
    needsSchedulingStore: true,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "high",
    notes: "Connected - syncs reservations to schedule, preferences to inventory",
  },
  {
    moduleName: "SupplyChain",
    needsInventoryStore: true,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "high",
    notes: "Connected - syncs supplier orders to inventory",
  },
  {
    moduleName: "VoiceCommands",
    needsInventoryStore: true,
    needsSchedulingStore: true,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "medium",
    notes: "Connected - executes commands on schedule and inventory",
  },
  {
    moduleName: "AICookingAssistant",
    needsInventoryStore: true,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "medium",
    notes: "Connected - checks ingredient availability",
  },
  {
    moduleName: "UnifiedCanvas",
    needsInventoryStore: true,
    needsSchedulingStore: true,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "medium",
    notes: "Connected - syncs shared contexts to schedule and inventory",
  },
  {
    moduleName: "MobileEnhancements",
    needsInventoryStore: true,
    needsSchedulingStore: true,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "medium",
    notes: "Connected - enables offline sync",
  },
  {
    moduleName: "Whiteboard",
    needsInventoryStore: false,
    needsSchedulingStore: true,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "high",
    notes: "Connected - pushes decisions to schedule and kitchen",
  },
  {
    moduleName: "DemandForecasting",
    needsInventoryStore: true,
    needsSchedulingStore: true,
    needsFinancialsStore: false,
    integrationStatus: "connected",
    priority: "high",
    notes: "Connected via useDemandScheduleChain",
  },
  {
    moduleName: "RevenueOps",
    needsInventoryStore: false,
    needsSchedulingStore: false,
    needsFinancialsStore: true,
    integrationStatus: "partial",
    priority: "high",
    notes: "Should connect to financials store",
  },
  {
    moduleName: "CostManagement",
    needsInventoryStore: false,
    needsSchedulingStore: false,
    needsFinancialsStore: true,
    integrationStatus: "partial",
    priority: "high",
    notes: "Should connect to financials store",
  },
  {
    moduleName: "EchoAurum",
    needsInventoryStore: false,
    needsSchedulingStore: false,
    needsFinancialsStore: true,
    integrationStatus: "partial",
    priority: "high",
    notes: "Financial forecasting - should connect to financials store",
  },
  {
    moduleName: "Phase9HRPayroll",
    needsInventoryStore: false,
    needsSchedulingStore: true,
    needsFinancialsStore: true,
    integrationStatus: "partial",
    priority: "high",
    notes: "Should connect via useScheduleFinancialsChain",
  },
  {
    moduleName: "StaffOptimization",
    needsInventoryStore: false,
    needsSchedulingStore: true,
    needsFinancialsStore: false,
    integrationStatus: "partial",
    priority: "medium",
    notes: "Should connect to scheduling store",
  },
  {
    moduleName: "AutoScheduling",
    needsInventoryStore: false,
    needsSchedulingStore: true,
    needsFinancialsStore: false,
    integrationStatus: "partial",
    priority: "medium",
    notes: "Should connect to scheduling store",
  },
  {
    moduleName: "QualityAssurance",
    needsInventoryStore: true,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "partial",
    priority: "low",
    notes: "May need inventory for ingredient tracking",
  },
  {
    moduleName: "PredictiveMaintenance",
    needsInventoryStore: false,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "missing",
    priority: "low",
    notes: "Standalone module, no store integration needed",
  },
  {
    moduleName: "TemplateMarketplace",
    needsInventoryStore: false,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "missing",
    priority: "low",
    notes: "Standalone module, no store integration needed",
  },
  {
    moduleName: "SupplierNetwork",
    needsInventoryStore: true,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "partial",
    priority: "medium",
    notes: "Should connect to inventory store",
  },
  {
    moduleName: "ChefNet",
    needsInventoryStore: false,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "missing",
    priority: "low",
    notes: "Collaboration module, no store integration needed",
  },
  {
    moduleName: "Support",
    needsInventoryStore: false,
    needsSchedulingStore: false,
    needsFinancialsStore: false,
    integrationStatus: "missing",
    priority: "low",
    notes: "Standalone module, no store integration needed",
  },
];

/**
 * Get modules that need integration
 */
export function getModulesNeedingIntegration(): ModuleIntegrationStatus[] {
  return MODULE_INTEGRATION_AUDIT.filter(
    (m) => m.integrationStatus === "partial" || m.integrationStatus === "missing"
  );
}

/**
 * Get high priority modules needing integration
 */
export function getHighPriorityModules(): ModuleIntegrationStatus[] {
  return MODULE_INTEGRATION_AUDIT.filter(
    (m) => m.priority === "high" && m.integrationStatus !== "connected"
  );
}

/**
 * Summary statistics
 */
export const INTEGRATION_AUDIT_SUMMARY = {
  total: MODULE_INTEGRATION_AUDIT.length,
  connected: MODULE_INTEGRATION_AUDIT.filter((m) => m.integrationStatus === "connected").length,
  partial: MODULE_INTEGRATION_AUDIT.filter((m) => m.integrationStatus === "partial").length,
  missing: MODULE_INTEGRATION_AUDIT.filter((m) => m.integrationStatus === "missing").length,
  highPriority: getHighPriorityModules().length,
};
