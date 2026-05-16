export interface OnboardingState {
  step: number;
  totalSteps: number;
  completedSteps: string[];
  isCompleted: boolean;
}
export interface VenueSetup {
  id?: string;
  name: string;
  locationType: "restaurant" | "hotel" | "resort" | "casino" | "bar";
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  managerEmail: string;
  liquorLicenseNumber: string;
  liquorLicenseExpiry: string;
}
export interface VenueGroup {
  venues: VenueSetup[];
  primaryVenueId?: string;
}
export interface StateRegulation {
  state: string;
  stateName: string;
  licenseType: "on_premise" | "off_premise" | "both";
  minAgeRequirement: number;
  idVerificationRequired: boolean;
  responsibleServiceTrainingRequired: boolean;
  trainingCertification: string;
  inventoryReportingFrequency: "monthly" | "quarterly" | "annually";
  reportingFormat: "pdf" | "digital" | "both";
  varianceTolerancePercentage: number;
  breakageAllowancePercentage: number;
  recordRetentionDays: number;
  digitalSignatureRequired: boolean;
}
export interface VarianceSettings {
  defaultVarianceTolerance: number; // Default 1% breakageAllowance: number; // Default 0.5% autoFlagThreshold: number; requireApprovalAboveThreshold: boolean; variantceReviewWorkflow: 'automatic' | 'manual' | 'hybrid';
}
export interface InventoryCostMethod {
  method: "fifo" | "lifo" | "weighted_average_cost";
  description: string;
  selectedForAllVenues: boolean;
  venueOverrides: Record<string, "fifo" | "lifo" | "weighted_average_cost">;
}
export interface POSIntegration {
  posSystem: "square" | "toast" | "marginedge" | "lightspeed" | "other";
  apiKey?: string;
  webhookUrl?: string;
  salesTracking: boolean;
  inventorySync: boolean;
  syncFrequency: "realtime" | "hourly" | "daily";
}
export interface UserRole {
  role:
    | "admin"
    | "manager"
    | "sommelier"
    | "bartender"
    | "housekeeping"
    | "auditor";
  permissions: string[];
  canViewAnalytics: boolean;
  canManageUsers: boolean;
  canConfigureSettings: boolean;
  canGenerateReports: boolean;
  canApproveTransfers: boolean;
  canManageInventory: boolean;
}
export interface UserSetup {
  id?: string;
  email: string;
  role: UserRole["role"];
  venueAssignments: string[]; // venue IDs permissions: Record<string, boolean>;
}
export interface ProcurementSetup {
  primarySupplierName: string;
  supplierContact: string;
  supplierEmail: string;
  supplierPhone: string;
  purchasingFrequency: "daily" | "weekly" | "twice_weekly" | "as_needed";
  autoReorderEnabled: boolean;
  reorderLeadDays: number;
  allowMultipleVendors: boolean;
}
export interface ComplianceSetup {
  stateRegulations: StateRegulation[];
  varianceSettings: VarianceSettings;
  breachNotificationEmail: string;
  auditTrailEnabled: boolean;
  digitalSignatureEnabled: boolean;
  recordRetentionPolicy: "standard" | "extended" | "custom";
}
export interface ModuleConnections {
  purchasingReceivingEnabled: boolean;
  echoRecipeProEnabled: boolean;
  posSystemConnected: boolean;
  iotMonitoringEnabled: boolean;
  mixologyModuleEnabled: boolean;
  sommelierTrainingEnabled: boolean;
  analyticsEnabled: boolean;
}
export interface OnboardingConfiguration {
  orgId: string;
  orgName: string;
  venues: VenueGroup;
  stateRegulations: ComplianceSetup;
  costMethod: InventoryCostMethod;
  posIntegration: POSIntegration;
  users: UserSetup[];
  procurement: ProcurementSetup;
  moduleConnections: ModuleConnections;
  varianceSettings: VarianceSettings;
  timestamp: string;
  completedBy?: { userId: string; userEmail: string; timestamp: string };
}
export interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  section:
    | "basic"
    | "venues"
    | "compliance"
    | "integration"
    | "users"
    | "final";
  fields: OnboardingField[];
  optional: boolean;
}
export interface OnboardingField {
  name: string;
  type:
    | "text"
    | "email"
    | "select"
    | "multiselect"
    | "checkbox"
    | "number"
    | "date"
    | "textarea";
  label: string;
  placeholder?: string;
  required: boolean;
  options?: Array<{ label: string; value: string }>;
  validation?: {
    pattern?: string;
    min?: number;
    max?: number;
    minLength?: number;
    maxLength?: number;
  };
  helpText?: string;
}
export interface OnboardingStepStatus {
  stepId: string;
  completed: boolean;
  data: Record<string, any>;
  errors: Record<string, string>;
}
