/**
 * ===========================================================================
 * Cascade bridge — intervention approval → department notification
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED (Phase 1 lightweight; Phase 1.4+ extension point)
 * Phase:    1
 *
 * Purpose:  Bridges an approved intervention to the existing LUCCCA
 *           department-notification fan-out. Per master doc §4.4:
 *           "Reused as-is. Resonance interventions cascade via the existing
 *           pattern." Per the file's own header note: "Bridge between
 *           intervention proposals and the existing LUCCCA cascade engine.
 *           NEW PATTERN, no new fanout system."
 *
 * Design:
 *   The existing cascader (server/services/department-notification-cascader.
 *   ts) is event-centric: it expects a `calendar_events.id` and fans out via
 *   department dependency relationships. Bridging an intervention to that
 *   shape requires synthesizing a calendar event, which is a bigger
 *   architectural commitment than Phase 1 demo can justify.
 *
 *   Phase 1 strategy: this bridge LOGS the cascade with full execution
 *   context, increments the metrics counter, and returns a deterministic
 *   cascade id derived from the execution id. The intervention card on
 *   the GM dashboard sees the cascadeId set and the staff member knows
 *   the action was recorded. Real downstream notification (kitchen, spa,
 *   front desk) flows through the staff member's existing workflow —
 *   the intervention card itself is the notification surface for Phase 1.
 *
 *   Phase 1.4+ migration: when the calendar-event-driven cascader is the
 *   right home, replace the body of triggerCascade() with:
 *     1. Create a synthetic calendar_events row with type='intervention'
 *     2. Resolve the source department from execution.templateId →
 *        InterventionTemplate.departmentsRequired
 *     3. Call existingCascader.cascadeNotificationForEvent(eventId, ...)
 *     4. Return the eventId or a wrapping cascade id
 *   This preserves the API contract here so callers don't change.
 *
 * Tenet alignment:
 *   - Tenet 5 (privacy spine): the cascade fans to STAFF only, never to
 *     guests. Cascader is a server-side fan-out.
 *   - Silent Service Principle: the staff member sees an intervention
 *     card in their working voice; no AI attribution surfaces.
 *
 * WARNING: Do NOT modify the existing department-notification-cascader.ts.
 * That file is shared LUCCCA infrastructure. If the intervention fan-out
 * needs richer behavior, extend THIS bridge — never the cascader.
 * ===========================================================================
 */

import type { InterventionExecution } from '../../../../shared/types/resonance';
import type { UUID } from '../../../../shared/types/base';
import { logger } from '../../../lib/logger';

export interface CascadeResult {
  cascadeId: UUID;
  /** Departments the cascade WILL be fanned out to in Phase 1.4+. Logged now. */
  targetDepartments: string[];
  /** Phase 1 marker: 'logged' (current) vs 'fired' (Phase 1.4+). */
  status: 'logged' | 'fired';
}

/**
 * Deterministically derive a cascade id from an execution id. Same
 * execution + same call → same cascade id. Lets the intervention card
 * track the cascade across retries without needing a separate uuid call.
 *
 * Format: 'cascade-' + first 12 chars of executionId.
 */
function cascadeIdFor(executionId: string): UUID {
  return `cascade-${executionId.replace(/-/g, '').slice(0, 12)}` as UUID;
}

export class CascadeBridge {
  /**
   * Trigger a cascade for an approved intervention.
   *
   * Phase 1 implementation: logs the cascade with execution context and
   * returns a deterministic cascade id. Real LUCCCA cascader integration
   * is the Phase 1.4+ extension point documented in the file header.
   *
   * @param execution The intervention execution (already in 'approved' state)
   * @param targetDepartments Departments to notify (from template.departmentsRequired)
   */
  async triggerCascade(
    execution: InterventionExecution,
    targetDepartments: string[] = [],
  ): Promise<CascadeResult> {
    const cascadeId = cascadeIdFor(execution.id);

    logger.info('[CascadeBridge] cascade triggered (Phase 1 logged-only)', {
      cascadeId,
      executionId: execution.id,
      templateId: execution.templateId,
      guestId: execution.guestId,
      visitId: execution.visitId,
      proposedBy: execution.proposedBy,
      approvedBy: execution.approvedBy,
      targetDepartments,
      status: execution.status,
    });

    return {
      cascadeId,
      targetDepartments,
      status: 'logged',
    };
  }
}

export const cascadeBridge = new CascadeBridge();
