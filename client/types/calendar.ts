/**
 * Calendar System Type Definitions
 * Comprehensive type definitions for the enterprise calendar system
 */

// =====================================================
// ENUMS & UNION TYPES
// =====================================================

export enum EventStatus {
  PENDING = "pending",
  CONFIRMED = "confirmed",
  LOCKED = "locked",
  CANCELLED = "cancelled",
  COMPLETED = "completed",
}

export enum EventSeverity {
  LOW = "low",
  NORMAL = "normal",
  HIGH = "high",
  CRITICAL = "critical",
}

export enum ConflictType {
  TIME = "time",
  LOCATION = "location",
  RESOURCE = "resource",
  AVAILABILITY = "availability",
}

export enum ConflictSeverity {
  INFO = "info",
  WARNING = "warning",
  CRITICAL = "critical",
}

export enum ConflictResolutionStrategy {
  KEEP_LOCAL = "keep-local",
  ACCEPT_REMOTE = "accept-remote",
  MANUAL = "manual",
}

export enum AuditAction {
  CREATE = "create",
  VIEW = "view",
  UPDATE = "update",
  DELETE = "delete",
  SHARE = "share",
  ACKNOWLEDGE_CONFLICT = "acknowledge_conflict",
  RESOLVE_CONFLICT = "resolve_conflict",
  ADD_ATTACHMENT = "add_attachment",
  REMOVE_ATTACHMENT = "remove_attachment",
}

export type OutletAccessLevel = "view" | "create" | "manage";
export type EventAccessLevel = "read" | "write" | "delete" | "manage";
export type AccessLevel = OutletAccessLevel | EventAccessLevel;

export type CalendarViewMode = "day" | "week" | "month" | "agenda";

// =====================================================
// CORE MODELS
// =====================================================

export interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly" | "yearly";
  interval?: number;
  end_date?: string;
  days_of_week?: number[];
  day_of_month?: number;
}

export interface CalendarEvent {
  id: string;
  org_id: string;
  outlet_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  date: string;
  location_room?: string;
  space_id?: string;
  guest_count: number;
  department: string;
  status: EventStatus;
  severity: EventSeverity;
  created_by: string;
  created_at: string;
  updated_at: string;
  deleted_at?: string | null;
  notes?: string;
  beo_id?: string;
  revenue?: number;
  contact_person?: string;
  tags?: string[];
  color?: string;
  recurrence?: RecurrenceRule;
  shared_with?: string[];
  metadata?: Record<string, any>;
}

export interface CalendarOutlet {
  id: string;
  org_id: string;
  name: string;
  color: string;
  icon?: string;
  description?: string;
  is_active?: boolean;
  is_system?: boolean;
  is_archived?: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
  archived_at?: string | null;
}

export interface CalendarConflict {
  id: string;
  org_id?: string;
  event_id_1: string;
  event_id_2: string;
  conflict_type: ConflictType;
  severity: ConflictSeverity | string;
  message: string;
  detected_at: string;
  resolved_at?: string;
  resolved_by?: string;
  resolution_notes?: string;
  resolution_strategy?: ConflictResolutionStrategy;
  notes?: string;
  acknowledged_by?: string[];
  acknowledged_at?: string;
  metadata?: Record<string, any>;
}

export interface EventPermission {
  id: string;
  event_id: string;
  user_id?: string;
  team_id?: string;
  role_id?: string;
  access_level: AccessLevel;
  granted_by: string;
  granted_at: string;
  expires_at?: string;
}

export interface EventAttachment {
  id: string;
  event_id: string;
  attachment_url: string;
  attachment_type: string;
  file_name: string;
  file_size?: number;
  mime_type?: string;
  uploaded_by: string;
  created_at: string;
  metadata?: Record<string, any>;
}

export interface AuditLogEntry {
  id: string;
  org_id: string;
  event_id: string;
  user_id: string;
  action: AuditAction | string;
  change_data?: Record<string, any>;
  previous_data?: Record<string, any>;
  ip_address?: string;
  user_agent?: string;
  created_at: string;
}

// =====================================================
// REQUEST / RESPONSE TYPES
// =====================================================

export interface CreateEventRequest {
  org_id?: string;
  outlet_id: string;
  title: string;
  description?: string;
  start_time: string;
  end_time: string;
  location_room?: string;
  space_id?: string;
  guest_count: number;
  department: string;
  status?: EventStatus;
  severity?: EventSeverity;
  created_by?: string;
  notes?: string;
  beo_id?: string;
  revenue?: number;
  contact_person?: string;
  tags?: string[];
  color?: string;
  metadata?: Record<string, any>;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  start_time?: string;
  end_time?: string;
  location_room?: string;
  space_id?: string;
  guest_count?: number;
  department?: string;
  status?: EventStatus;
  severity?: EventSeverity;
  notes?: string;
  beo_id?: string;
  revenue?: number;
  contact_person?: string;
  tags?: string[];
  color?: string;
  metadata?: Record<string, any>;
}

export interface ShareEventRequest {
  user_id?: string;
  team_id?: string;
  role_id?: string;
  access_level: AccessLevel;
  expires_at?: string;
}

export interface CreateOutletRequest {
  name: string;
  description?: string;
  color?: string;
  icon?: string;
}

export interface DetectConflictsRequest {
  outlet_ids?: string[];
}

export interface ListEventsFilter {
  outlet_ids?: string[];
  start_date?: string;
  end_date?: string;
  status?: EventStatus[];
  department?: string;
  location_room?: string;
  search?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
  offset?: number;
  limit?: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, any>;
  };
  timestamp: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    pages: number;
    hasMore: boolean;
  };
}

// =====================================================
// REALTIME MESSAGES
// =====================================================

export interface ConflictMessage {
  conflictId: string;
  eventId1: string;
  eventId2: string;
  type: ConflictType;
  severity: ConflictSeverity;
  message: string;
  timestamp: string;
  orgId: string;
}

export interface EventMessage {
  eventId: string;
  orgId: string;
  outletId: string;
  action: "created" | "updated" | "deleted" | "shared" | "acknowledged";
  event?: CalendarEvent;
  timestamp: string;
}

// =====================================================
// STORE / CLIENT HELPERS
// =====================================================

export interface PendingOperation {
  id: string;
  eventId: string;
  operation: "create" | "update" | "delete";
  changes: Partial<CalendarEvent>;
  timestamp: string;
  status: "pending" | "success" | "error";
  error?: string;
}

export interface CalendarStoreState {
  selectedOutlets: string[];
  selectedDate: string;
  expandedEventId: string | null;
  viewMode: CalendarViewMode;

  events: CalendarEvent[];
  outlets: CalendarOutlet[];
  conflicts: CalendarConflict[];
  userPermissions: Record<string, AccessLevel>;

  isLoadingEvents: boolean;
  showConflictAlert: boolean;
  conflictToShow?: CalendarConflict;

  pendingOperations: PendingOperation[];
  lastSyncTime: number;
  isSyncing: boolean;
  syncError: string | null;

  setSelectedOutlets: (ids: string[]) => void;
  addSelectedOutlet: (id: string) => void;
  removeSelectedOutlet: (id: string) => void;

  setEvents: (events: CalendarEvent[]) => void;
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  removeEvent: (eventId: string) => void;

  setConflicts: (conflicts: CalendarConflict[]) => void;
  addConflict: (conflict: CalendarConflict) => void;
  acknowledgeConflict: (conflictId: string) => void;

  setUserPermissions: (perms: Record<string, AccessLevel>) => void;

  toggleEventExpansion: (eventId: string | null) => void;

  setShowConflictAlert: (show: boolean) => void;
  setConflictToShow: (conflict?: CalendarConflict) => void;

  setViewMode: (mode: CalendarViewMode) => void;
  setSelectedDate: (date: string) => void;

  setIsLoadingEvents: (loading: boolean) => void;

  addPendingOperation: (operation: PendingOperation) => void;
  removePendingOperation: (operationId: string) => void;
  updatePendingOperation: (
    operationId: string,
    updates: Partial<PendingOperation>,
  ) => void;
  clearPendingOperations: () => void;

  setIsSyncing: (syncing: boolean) => void;
  setSyncError: (error: string | null) => void;
  setLastSyncTime: (time: number) => void;

  clear: () => void;
}

export interface PermissionCheckResult {
  allowed: boolean;
  accessLevel: AccessLevel;
  reason?: string;
}

// =====================================================
// OPTIONAL UI FILTER TYPES
// =====================================================

export interface EventFilterOptions {
  outletId?: string;
  startDate?: string;
  endDate?: string;
  status?: EventStatus;
  department?: string;
  locationRoom?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface ConflictResolutionRequest {
  conflictId: string;
  strategy: ConflictResolutionStrategy;
  resolvingEventId?: string;
  notes?: string;
}

export interface CalendarStats {
  totalEvents: number;
  confirmedEvents: number;
  pendingEvents: number;
  conflictCount: number;
  eventsByOutlet: Record<string, number>;
  eventsByDepartment: Record<string, number>;
  averageGuestCount: number;
  totalRevenue: number;
}

export interface PerformanceMetrics {
  operationName: string;
  duration: number;
  timestamp: string;
  eventCount?: number;
  memoryUsed?: number;
}
