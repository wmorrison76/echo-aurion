/**
 * MaestroBQT Type Definitions
 * Central types for the orchestrator ecosystem
 */

// Module Manifest
export interface LuccaModuleManifest {
  name: string;
  version: string;
  routes?: string[];
  events?: string[];
  ui?: string[];
  dependencies?: string[];
  lifecycle?: {
    initModule: () => Promise<void>;
    subscribeToEvents: (eventBus: EventBus) => void;
    onDataUpdate: (payload: DataUpdatePayload) => void;
    cleanupModule: () => Promise<void>;
  };
}

// Event Bus
export interface EventBusMessage {
  type: string;
  source: string;
  timestamp: number;
  payload: any;
  metadata?: {
    correlationId?: string;
    userId?: string;
    tenantId?: string;
  };
}

export interface EventBus {
  subscribe: (
    eventType: string,
    handler: (msg: EventBusMessage) => void,
  ) => () => void;
  publish: (message: EventBusMessage) => void;
  subscribeTo: (eventType: string, callback: (data: any) => void) => () => void;
}

// Data Models
export interface Event {
  id: string;
  name: string;
  status: "tentative" | "definite" | "in_house" | "completed" | "canceled";
  guestCountCurrent: number;
  guestCountExpected: number;
  startDateTime: string;
  endDateTime: string;
  spaceIds: string[];
  departmentIds: string[];
  metadata?: {
    [key: string]: any;
  };
}

export interface Space {
  id: string;
  name: string;
  type: string;
  isActive: boolean;
  capacity: number;
  features?: string[];
  metadata?: {
    [key: string]: any;
  };
}

export interface Task {
  id: string;
  eventId: string;
  title: string;
  status: "pending" | "in_progress" | "completed" | "blocked";
  assignedTo?: string;
  department: string;
  dueDateTime: string;
  priority: "low" | "medium" | "high" | "critical";
  metadata?: {
    [key: string]: any;
  };
}

export interface Change {
  id: string;
  eventId: string;
  changeType: string;
  changedBy: string;
  timestamp: string;
  oldValue?: any;
  newValue?: any;
  impactedDepartments?: string[];
}

export interface Shortage {
  id: string;
  itemId: string;
  itemName: string;
  requiredQuantity: number;
  availableQuantity: number;
  unit: string;
  severity: "low" | "medium" | "high" | "critical";
  affectedEvents: string[];
}

export interface Financial {
  eventId: string;
  projectedRevenue: number;
  projectedCost: number;
  projectedMargin: number;
  margin_percentage: number;
  riskScore: number;
  keyKpis: {
    [key: string]: number;
  };
}

// Data Update Payload
export interface DataUpdatePayload {
  type: string;
  source: string;
  data: any;
  timestamp: number;
  affectedModules: string[];
}

// Module Registry
export interface ModuleRegistryEntry {
  name: string;
  version: string;
  manifest: LuccaModuleManifest;
  loaded: boolean;
  error?: string;
}

// API Response Wrapper
export interface ApiResponse<T> {
  data: T;
  status: "success" | "error" | "mock";
  timestamp: number;
  message?: string;
}

// Conflict Detection
export interface Conflict {
  id: string;
  severity: "warning" | "error" | "critical";
  type: string;
  affectedEvents: string[];
  affectedDepartments: string[];
  description: string;
  suggestedAction?: string;
  timestamp: string;
}
