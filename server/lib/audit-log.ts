/********************************************************************
 * LUCCCA — BUILD 20 (Part 1)
 * Audit Log Core
 *
 * PURPOSE:
 *  - Append-only log of important actions
 *  - For forensics, training, compliance, dispute resolution
 *********************************************************************/

export type AuditEntry = {
  id: string;
  ts: number;
  actor: string; // "userId" or "system"
  action: string; // "event.created", "conflict.auto-approved", etc.
  target?: string; // e.g., eventId, conflictId, space name
  details?: string; // free-form description
  severity?: "info" | "warn" | "danger";
};

// In-memory audit log
// In production: replace with database table
let auditLog: AuditEntry[] = [];

/**
 * Write an audit entry
 */
export function writeAudit(
  entry: Omit<AuditEntry, "id" | "ts">
): AuditEntry {
  const full: AuditEntry = {
    id: `audit-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    ts: Date.now(),
    severity: "info",
    ...entry,
  };
  auditLog.unshift(full); // newest first
  return full;
}

/**
 * Get audit entries (most recent first)
 */
export function getAuditEntries(limit = 200): AuditEntry[] {
  return auditLog.slice(0, Math.min(limit, auditLog.length));
}

/**
 * Get audit entries for a specific target (e.g., space, event, conflict)
 */
export function getAuditEntriesForTarget(
  target: string,
  limit = 50
): AuditEntry[] {
  return auditLog
    .filter((e) => e.target === target)
    .slice(0, Math.min(limit, auditLog.length));
}

/**
 * Get audit entries by actor (user or system)
 */
export function getAuditEntriesByActor(
  actor: string,
  limit = 50
): AuditEntry[] {
  return auditLog
    .filter((e) => e.actor === actor)
    .slice(0, Math.min(limit, auditLog.length));
}

/**
 * Get audit entries by action type
 */
export function getAuditEntriesByAction(
  action: string,
  limit = 50
): AuditEntry[] {
  return auditLog
    .filter((e) => e.action === action)
    .slice(0, Math.min(limit, auditLog.length));
}

/**
 * Get audit entries within a time range
 */
export function getAuditEntriesByTime(
  startTime: number,
  endTime: number,
  limit = 100
): AuditEntry[] {
  return auditLog
    .filter((e) => e.ts >= startTime && e.ts <= endTime)
    .slice(0, Math.min(limit, auditLog.length));
}

/**
 * Clear audit log (admin only, dangerous!)
 */
export function clearAuditLog(): number {
  const count = auditLog.length;
  auditLog = [];
  return count;
}

/**
 * Get total audit log size
 */
export function getAuditLogSize(): number {
  return auditLog.length;
}

/**
 * Convenience methods for common audit actions
 */

export const AuditActions = {
  EVENT_CREATED: "event.created",
  EVENT_UPDATED: "event.updated",
  EVENT_DELETED: "event.deleted",
  MAINTENANCE_CREATED: "maintenance.created",
  MAINTENANCE_UPDATED: "maintenance.updated",
  CONFLICT_CREATED: "conflict.created",
  CONFLICT_APPROVED: "conflict.approved",
  CONFLICT_DENIED: "conflict.denied",
  CONFLICT_AUTO_APPROVED: "conflict.auto-approved",
  OVERRIDE_APPROVED: "override.approved",
  OVERRIDE_DENIED: "override.denied",
  LOCK_CREATED: "lock.created",
  LOCK_RELEASED: "lock.released",
  SUGGESTION_GENERATED: "suggestion.generated",
};

export function auditEventCreated(
  eventId: string,
  space: string,
  actor: string,
  details?: string
) {
  return writeAudit({
    actor,
    action: AuditActions.EVENT_CREATED,
    target: eventId,
    severity: "info",
    details: details || `Created event in ${space}`,
  });
}

export function auditConflictApproved(
  conflictId: string,
  actor: string,
  reason?: string
) {
  return writeAudit({
    actor,
    action: AuditActions.CONFLICT_APPROVED,
    target: conflictId,
    severity: "warn",
    details: reason || "Approved override",
  });
}

export function auditConflictAutoApproved(
  conflictId: string,
  space: string,
  reason?: string
) {
  return writeAudit({
    actor: "system-auto-resolve",
    action: AuditActions.CONFLICT_AUTO_APPROVED,
    target: conflictId,
    severity: "info",
    details: reason || `Auto-resolved conflict in ${space}`,
  });
}

export function auditLockCreated(
  lockId: string,
  space: string,
  actor: string,
  reason?: string
) {
  return writeAudit({
    actor,
    action: AuditActions.LOCK_CREATED,
    target: space,
    severity: "warn",
    details: reason || `Locked space: ${space}`,
  });
}

/********************************************************************
 * NOTES FOR PRODUCTION:
 *
 * 1. Replace in-memory array with database table:
 *    CREATE TABLE audit_log (
 *      id VARCHAR PRIMARY KEY,
 *      ts BIGINT NOT NULL,
 *      actor VARCHAR NOT NULL,
 *      action VARCHAR NOT NULL,
 *      target VARCHAR,
 *      details TEXT,
 *      severity VARCHAR,
 *      INDEX(ts), INDEX(actor), INDEX(action)
 *    );
 *
 * 2. Add archival strategy (e.g., move old entries to cold storage)
 *
 * 3. Expose via API: GET /api/audit?limit=200&actor=...&action=...
 *
 * 4. Wire calls to writeAudit() from:
 *    - EventScheduler: when creating events
 *    - MaintenanceScheduler: when creating work orders
 *    - OverrideCenter: when approving/denying
 *    - Auto-resolve engine: when auto-approving
 *********************************************************************/
