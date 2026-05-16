/**
 * Ops Gantt canonical types (shared client/server).
 *
 * Key principle:
 * - Echo Events / EchoEventStudio consumes BEO-scoped objects only.
 * - Maestro BQT can toggle between BEO scope and Production scope.
 * - Production scope objects MUST NOT leak into Echo Events.
 */

export type UUID = string;

export type OpsTaskScope = "beo" | "production";

export type OpsDepartment =
  | "Sales"
  | "Events"
  | "Culinary"
  | "Pastry"
  | "Bar"
  | "AV"
  | "Stewarding"
  | "Purchasing"
  | "Receiving"
  | "BanquetOps"
  | "Finance";

export type OpsEventStatus = "tentative" | "definite" | "canceled" | "completed";
export type OpsFinancialStatus =
  | "deposit_due"
  | "deposit_paid"
  | "final_invoice_sent"
  | "closed";

export type OpsPriority = "P0" | "P1" | "P2" | "P3";

export type OpsTaskStatus = "not_started" | "in_progress" | "blocked" | "done";

export type OpsDependencyType = "FS" | "SS" | "FF";

export interface OpsDependency {
  /**
   * The upstream task this dependency points to.
   */
  dependsOnTaskId: UUID;
  /**
   * Dependency relationship type.
   * - FS: finish-to-start (default)
   * - SS: start-to-start
   * - FF: finish-to-finish
   */
  type?: OpsDependencyType;
  /**
   * Positive lag pushes downstream later; negative lead pulls earlier.
   * Always interpreted in minutes.
   */
  lagMinutes?: number;
}

export type OpsResourceType = "person" | "team" | "room" | "equipment" | "vendor";

export interface OpsResourceAvailabilityWindow {
  start: string; // ISO datetime
  end: string; // ISO datetime
  /**
   * If provided, overrides default capacity for this window.
   */
  capacityOverride?: number;
}

export interface OpsResource {
  resourceId: UUID;
  resourceType: OpsResourceType;
  name: string;
  skills?: string[];
  availabilityCalendar?: OpsResourceAvailabilityWindow[];
  costRate?: number; // hourly cost for person/team
  capacity?: number; // ovens=2, prep tables=6, etc
  constraints?: Record<string, unknown>; // union rules, max hours, windows, etc
}

export type OpsArtifactKey =
  | "beo_signed"
  | "floorplan_approved"
  | "menu_locked"
  | "vendor_confirmed"
  | "po_sent"
  | "deliveries_received_complete"
  | "staffing_confirmed";

export interface OpsChecklistItem {
  id: UUID;
  title: string;
  done: boolean;
  doneAt?: string;
  doneById?: UUID;
}

export interface OpsTask {
  taskId: UUID;
  /**
   * Event/BEO this task belongs to.
   */
  eventId: UUID;

  /**
   * Strict scope boundary.
   * - "beo": planning + BEO operational chain (safe to show in Echo Events)
   * - "production": internal production execution chain (Maestro-only)
   */
  scope: OpsTaskScope;

  department: OpsDepartment;
  title: string;

  /**
   * ISO datetime. (Not day-only.)
   */
  start: string;
  end: string;

  durationMinutes: number;
  percentComplete: number; // 0-100
  status: OpsTaskStatus;

  dependencies?: OpsDependency[];
  blockingReason?: string;
  assigneeIds?: UUID[];
  /**
   * Non-person resource requirements (rooms/equipment/vendors/teams).
   * Each id must correspond to an OpsResource.resourceId.
   */
  resourceIds?: UUID[];
  checklist?: OpsChecklistItem[];
  requiredArtifacts?: OpsArtifactKey[];
  costImpact?: number;
  tags?: string[];
  riskScore: number; // 0-100

  /**
   * Calculated.
   */
  slackMinutes?: number;
}

export type OpsMilestoneKey =
  | "contract_signed"
  | "beo_distributed"
  | "menu_locked"
  | "guarantee_received"
  | "po_sent"
  | "receiving_complete"
  | "production_complete"
  | "event_executed"
  | "billing_closed";

export interface OpsMilestone {
  milestoneId: UUID;
  eventId: UUID;
  key: OpsMilestoneKey;
  title: string;
  at: string; // ISO datetime
  completed: boolean;
  completedAt?: string;
}

export interface OpsEventOwners {
  salesLeadId?: UUID;
  plannerId?: UUID;
  banquetCaptainId?: UUID;
  execChefId?: UUID;
}

export interface OpsEventRevision {
  revisionId: UUID;
  revisionNumber: number;
  createdAt: string;
  createdById?: UUID;
  note?: string;
}

export interface OpsEvent {
  eventId: UUID;
  beoNumber: string;
  eventName: string;
  clientName: string;
  property: string;
  space: string;
  eventType: string;
  startDateTime: string;
  endDateTime: string;
  setupStart: string;
  strikeEnd: string;
  guestCountGuaranteed: number;
  guestCountExpected: number;
  serviceStyle: string;
  status: OpsEventStatus;
  financialStatus: OpsFinancialStatus;
  priority: OpsPriority;
  lastBEORevision: number;
  revisionHistory: OpsEventRevision[];
  owners: OpsEventOwners;
}

