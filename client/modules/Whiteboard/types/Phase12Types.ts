/**
 * Phase 12: Enterprise Features - Type Definitions
 * Consolidated types for all 7 subsystems
 */

// ============================================================================
// 1. REAL-TIME COLLABORATION TYPES
// ============================================================================

export type PresenceStatus = "online" | "idle" | "offline" | "editing";

export interface UserPresence {
  userId: string;
  userName: string;
  status: PresenceStatus;
  lastSeen: number;
  color: string;
  cursorX?: number;
  cursorY?: number;
  selectedElementIds: string[];
  viewport: {
    x: number;
    y: number;
    zoom: number;
  };
}

export interface RemoteChange {
  changeId: string;
  userId: string;
  timestamp: number;
  type: "insert" | "update" | "delete";
  elementId: string;
  previousValue?: any;
  newValue: any;
  sessionId: string;
}

export interface CRDTOperation {
  operationId: string;
  lamportTimestamp: number;
  userId: string;
  elementId: string;
  value: any;
  timestamp: number;
}

export interface SyncState {
  lastSyncTimestamp: number;
  pendingChanges: RemoteChange[];
  acknowledgedChanges: Set<string>;
  conflictResolutions: Map<string, any>;
}

// ============================================================================
// 2. ADVANCED AI INTEGRATION TYPES
// ============================================================================

export type AIFeature =
  | "smart-suggestions"
  | "auto-layout"
  | "content-generation"
  | "diagram-creation"
  | "text-enhancement"
  | "color-suggestion";

export interface AIPrompt {
  promptId: string;
  feature: AIFeature;
  input: string;
  context: {
    selectedElements: string[];
    currentCanvas: any;
    recentActions: string[];
  };
  parameters: Record<string, any>;
}

export interface AIResponse {
  responseId: string;
  promptId: string;
  status: "pending" | "success" | "error";
  result?: any;
  suggestions: Array<{
    id: string;
    title: string;
    description: string;
    preview?: any;
    confidence: number;
  }>;
  error?: string;
  generatedAt: number;
}

export interface AIModel {
  id: string;
  name: string;
  type: "llm" | "image-gen" | "layout-optimizer";
  version: string;
  costPerRequest: number;
}

// ============================================================================
// 3. TEMPLATE & ASSET LIBRARY TYPES
// ============================================================================

export interface Template {
  id: string;
  name: string;
  description: string;
  category: string;
  tags: string[];
  thumbnail: string;
  canvasState: any;
  createdBy: string;
  createdAt: number;
  isPublic: boolean;
  usageCount: number;
  rating: number;
  version: string;
}

export interface Asset {
  id: string;
  name: string;
  type: "image" | "icon" | "shape" | "component";
  url: string;
  thumbnail: string;
  tags: string[];
  size: number;
  format: string;
  uploadedBy: string;
  uploadedAt: number;
  isPublic: boolean;
  usageCount: number;
}

export interface ComponentLibrary {
  id: string;
  name: string;
  description: string;
  components: string[];
  version: string;
  author: string;
  license: string;
  lastUpdated: number;
}

// ============================================================================
// 4. ADVANCED EXPORT/IMPORT TYPES
// ============================================================================

export type ExportFormat =
  | "svg"
  | "png"
  | "pdf"
  | "json"
  | "figma"
  | "pptx"
  | "html";

export interface ExportOptions {
  format: ExportFormat;
  quality: "low" | "medium" | "high";
  includeMetadata: boolean;
  embedAssets: boolean;
  compressImages: boolean;
  pageRange?: {
    start: number;
    end: number;
  };
  customSettings: Record<string, any>;
}

export interface ImportOptions {
  format: string;
  autoDetectFormat: boolean;
  scaleToFit: boolean;
  preserveLayering: boolean;
  mapStyles: boolean;
  customMapping?: Record<string, any>;
}

export interface ExportJob {
  jobId: string;
  format: ExportFormat;
  status: "pending" | "processing" | "completed" | "failed";
  progress: number;
  startedAt: number;
  completedAt?: number;
  fileUrl?: string;
  error?: string;
}

export interface ImportJob {
  jobId: string;
  fileName: string;
  format: string;
  status: "pending" | "validating" | "importing" | "completed" | "failed";
  progress: number;
  importedElements: number;
  error?: string;
  startedAt: number;
  completedAt?: number;
}

// ============================================================================
// 5. TEAM & WORKSPACE MANAGEMENT TYPES
// ============================================================================

export type UserRole = "owner" | "admin" | "editor" | "viewer" | "guest";

export interface Team {
  id: string;
  name: string;
  description?: string;
  owner: string;
  members: TeamMember[];
  createdAt: number;
  settings: TeamSettings;
}

export interface TeamMember {
  userId: string;
  userName: string;
  email: string;
  role: UserRole;
  joinedAt: number;
  permissions: Permission[];
  status: "active" | "inactive" | "suspended";
}

export interface Permission {
  id: string;
  resource: string;
  action: "read" | "write" | "delete" | "admin";
  grant: "allow" | "deny";
  conditions?: Record<string, any>;
}

export interface Workspace {
  id: string;
  name: string;
  teamId: string;
  description?: string;
  owner: string;
  members: string[];
  accessLevel: "private" | "shared" | "public";
  createdAt: number;
  lastModified: number;
}

export interface TeamSettings {
  defaultRole: UserRole;
  invitationRequired: boolean;
  maxMembers?: number;
  allowPublicSharing: boolean;
  storageQuota: number;
  apiAccessAllowed: boolean;
}

// ============================================================================
// 6. ANALYTICS & INSIGHTS TYPES
// ============================================================================

export interface UsageMetric {
  timestamp: number;
  userId: string;
  metric: string;
  value: number;
  dimensions: Record<string, string>;
}

export interface CollaborationMetric {
  sessionId: string;
  startTime: number;
  endTime?: number;
  participants: string[];
  totalEdits: number;
  editsByUser: Record<string, number>;
  averageLatency: number;
  conflictCount: number;
}

export interface PerformanceMetric {
  timestamp: number;
  renderTime: number;
  memoryUsage: number;
  canvasSize: number;
  elementCount: number;
  fps: number;
  networkLatency: number;
}

export interface AnalyticsReport {
  reportId: string;
  type: "usage" | "collaboration" | "performance" | "custom";
  timeRange: {
    start: number;
    end: number;
  };
  metrics: UsageMetric[];
  summary: Record<string, any>;
  generatedAt: number;
}

// ============================================================================
// 7. MOBILE OPTIMIZATION TYPES
// ============================================================================

export type DeviceType = "mobile" | "tablet" | "desktop";
export type Orientation = "portrait" | "landscape";

export interface MobileGesture {
  type:
    | "tap"
    | "double-tap"
    | "long-press"
    | "swipe"
    | "pinch"
    | "rotate"
    | "pan";
  startX: number;
  startY: number;
  endX?: number;
  endY?: number;
  distance?: number;
  angle?: number;
  scale?: number;
  timestamp: number;
}

export interface ResponsiveLayout {
  mobile: {
    width: number;
    height: number;
    zoom: number;
  };
  tablet: {
    width: number;
    height: number;
    zoom: number;
  };
  desktop: {
    width: number;
    height: number;
    zoom: number;
  };
  currentDevice: DeviceType;
  orientation: Orientation;
}
