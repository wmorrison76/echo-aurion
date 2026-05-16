/**
 * ===========================================================================
 * Intervention library — templates and execution tracking
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Two halves of the same loop:
 *
 *   1. CANDIDATE SELECTION  (findCandidates) — given a guest's current
 *      affect (arousal/valence) and the recent signals attached to them,
 *      return the templates that apply: same affect quadrant, required
 *      signals present, excluded signals absent, not on cooldown for this
 *      guest, active=true. Ranked by historical successRate so the highest-
 *      yield candidate surfaces first.
 *
 *   2. LIFECYCLE TRACKING — every proposal is logged and progresses through
 *      a strict state machine:
 *
 *        proposed ──recordApproval──▶ approved ──recordExecution──▶ executed ──recordOutcome──▶ completed
 *             │                            │
 *             └──────recordSkip────────────┴────▶ skipped
 *
 *      Each transition method enforces the source state in its WHERE clause
 *      (`AND status = 'proposed'` etc.) so a caller cannot jump steps or
 *      retread completed work. The template's running successRate is updated
 *      only on `completed` — the terminal state — keeping the learning loop
 *      grounded in interventions that actually ran end-to-end.
 *
 * Pending implementation:
 *   - [x] findCandidates: quadrant + signals + cooldown + active filter
 *   - [x] recordProposal: narrow input (templateId/guestId/visitId/proposedBy/
 *         cascadeId/preReading?/notes?), inserts with status='proposed';
 *         lifecycle fields (approved/executed/outcome) cannot be passed in
 *   - [x] recordApproval: proposed → approved (sets approvedBy + approvedAt)
 *   - [x] recordExecution: approved → executed (optionally sets preReading)
 *   - [x] recordSkip: proposed | approved → skipped (operator opt-out)
 *   - [x] recordOutcome: executed → completed; updates template successRate
 *   - [x] listTemplates: admin paginated list
 *   - [DEFERRED to Phase 1.4 routes] route-level seed loader for the
 *         10 founder-wisdom templates (a separate seed migration / admin
 *         endpoint, not this service's job)
 *
 * Aligned to: server/database/migrations/010_interventions_library.sql
 *             server/database/migrations/011_interventions_executed.sql
 *             shared/types/resonance/intervention.ts (TICKET_002 IMPLEMENTED)
 *             client/lib/resonance/score.ts (quadrantOf — single source)
 *
 * Tenet enforcement:
 *   - Tenet 3 (tone informs care, never commerce): templates carry care-class
 *     fields (approach, departments, scripted DIRECTION not DIALOGUE,
 *     do_nots). The privacy isolation test verifies this module cannot be
 *     imported from pricing/sales/marketing.
 *   - Tenet 8 (forbidden uses): findCandidates respects active=false. An
 *     operator who needs to retire an intervention sets active=false; this
 *     service stops surfacing it without changing history.
 *
 * Outcome-score convention:
 *   - outcomeScore is a normalized success measure in [0, 1] supplied by
 *     the caller (1.0 = full success, 0.0 = no effect). The route layer
 *     (Phase 1.4) is the validator at the system boundary.
 *   - successRate is an incremental running mean:
 *       new = (old * timesUsed + outcomeScore) / (timesUsed + 1)
 *   - timesUsed is the count of recordOutcome calls for this template.
 *
 * WARNING: This is the canonical intervention library service. All
 * intervention writes MUST route through this service. Modifications
 * require TICKET-level authorization. See ARCHITECTURE.md.
 * ===========================================================================
 */

import type { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type {
  InterventionTemplate,
  InterventionExecution,
  AffectCoordinate,
  AffectQuadrant,
  InterventionApproachClass,
  InterventionEffort,
  ProposedBy,
  InterventionStatus,
} from '../../../../shared/types/resonance';
import type { UUID } from '../../../../shared/types/base';
import { quadrantOf } from '../../../../client/lib/resonance/score';
import { query, transaction } from '../../../database/connection';
import { logger } from '../../../lib/logger';

export interface FindCandidatesArgs {
  affect: AffectCoordinate;
  presentSignals: string[];
  guestId: UUID;
  visitId: UUID;
}

/**
 * Narrow input for recordProposal. State-machine fields (approvedBy,
 * approvedAt, postReading, outcomeScore) are intentionally absent — they
 * belong to later transitions. status is set to 'proposed' by the service.
 */
export interface ProposalInput {
  templateId: UUID;
  guestId: UUID;
  visitId: UUID;
  proposedBy: ProposedBy;
  cascadeId: UUID | null;
  preReading?: number;
  notes?: string;
}

interface TemplateRow {
  id: string;
  name: string;
  description: string;
  affect_quadrants: string[];
  requires_signals: string[] | null;
  exclude_signals: string[] | null;
  approach: string;
  effort: string;
  lead_time_minutes: number;
  estimated_cost_cents: number;
  estimated_cost_currency: string;
  reuse_cooldown_days: number;
  departments_required: string[];
  proxemic_guidance: string | null;
  scripted_direction: string | null;
  do_nots: string[];
  times_used: number;
  success_rate: number;
  last_used_at: Date | string | null;
  active: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

interface ExecutionRow {
  id: string;
  template_id: string;
  guest_id: string;
  visit_id: string;
  proposed_at: Date | string;
  proposed_by: string;
  approved_by: string | null;
  approved_at: Date | string | null;
  status: string;
  pre_reading: number | null;
  post_reading: number | null;
  outcome_score: number | null;
  notes: string | null;
  cascade_id: string | null;
  created_at: Date | string;
  updated_at: Date | string;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`intervention-library: unexpected date value type: ${typeof value}`);
}

function maybeIso(value: unknown): string | undefined {
  if (value === null || value === undefined) return undefined;
  return dateToIso(value);
}

function rowToTemplate(row: TemplateRow): InterventionTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    affectQuadrants: row.affect_quadrants as AffectQuadrant[],
    requiresSignals: row.requires_signals ?? undefined,
    excludeSignals: row.exclude_signals ?? undefined,
    approach: row.approach as InterventionApproachClass,
    effort: row.effort as InterventionEffort,
    leadTimeMinutes: row.lead_time_minutes,
    estimatedCostCents: row.estimated_cost_cents,
    estimatedCostCurrency: row.estimated_cost_currency,
    reuseCooldownDays: row.reuse_cooldown_days,
    departmentsRequired: row.departments_required,
    proxemicGuidance: row.proxemic_guidance ?? undefined,
    scriptedDirection: row.scripted_direction ?? undefined,
    doNots: row.do_nots,
    timesUsed: row.times_used,
    successRate: row.success_rate,
    lastUsedAt: maybeIso(row.last_used_at),
    active: row.active,
    createdAt: dateToIso(row.created_at),
    updatedAt: dateToIso(row.updated_at),
  };
}

function rowToExecution(row: ExecutionRow): InterventionExecution {
  return {
    id: row.id,
    templateId: row.template_id,
    guestId: row.guest_id,
    visitId: row.visit_id,
    proposedAt: dateToIso(row.proposed_at),
    proposedBy: row.proposed_by as ProposedBy,
    approvedBy: row.approved_by ?? undefined,
    approvedAt: maybeIso(row.approved_at),
    status: row.status as InterventionStatus,
    preReading: row.pre_reading ?? undefined,
    postReading: row.post_reading ?? undefined,
    outcomeScore: row.outcome_score ?? undefined,
    notes: row.notes ?? undefined,
    cascadeId: row.cascade_id,
    createdAt: dateToIso(row.created_at),
    updatedAt: dateToIso(row.updated_at),
  };
}

async function runQuery<T extends Record<string, unknown> = Record<string, unknown>>(
  client: PoolClient | undefined,
  sql: string,
  params?: unknown[],
): Promise<{ rows: T[]; rowCount: number | null }> {
  if (client) return client.query<T>(sql, params);
  return query<T>(sql, params);
}

export class InterventionLibrary {
  /**
   * Return active templates that match the current affect quadrant, have
   * any required signals present, no excluded signals present, and are not
   * on cooldown for this guest. Ordered by successRate DESC so the
   * highest-yield candidates surface first.
   *
   * Caller (Phase 1.4 routes / Echo-Fast) decides which to propose; this
   * service ranks them.
   */
  async findCandidates(
    args: FindCandidatesArgs,
    client?: PoolClient,
  ): Promise<InterventionTemplate[]> {
    try {
      const quadrant = quadrantOf(args.affect);

      // SQL filters:
      //   - active = true
      //   - quadrant matches one of affect_quadrants (GIN-indexed @>)
      //   - requires_signals is NULL/empty OR every required signal is present
      //   - exclude_signals is NULL/empty OR no excluded signal is present
      // Cooldown is filtered after the SQL pass because it requires the
      // intervention executions table; doing both at once would need a more
      // complex join. SQL pass narrows the candidate set first, JS step
      // does the cooldown subtractive pass.
      const result = await runQuery<TemplateRow>(
        client,
        `SELECT * FROM interventions_library
         WHERE active = true
           AND affect_quadrants @> ARRAY[$1]::text[]
           AND (requires_signals IS NULL
                OR cardinality(requires_signals) = 0
                OR requires_signals <@ $2::text[])
           AND (exclude_signals IS NULL
                OR cardinality(exclude_signals) = 0
                OR NOT (exclude_signals && $2::text[]))
         ORDER BY success_rate DESC, times_used DESC, name ASC`,
        [quadrant, args.presentSignals],
      );

      if (result.rows.length === 0) return [];

      // Cooldown filter: a template is on cooldown for this guest if any
      // execution of that template (status not 'skipped') happened within
      // the last reuseCooldownDays days for this guest.
      const candidatesWithCooldown = result.rows.filter((row) => row.reuse_cooldown_days > 0);
      const onCooldown = new Set<string>();
      if (candidatesWithCooldown.length > 0) {
        const templateIds = candidatesWithCooldown.map((r) => r.id);
        // Fetch the most recent non-skipped execution per (template, guest) pair.
        const cooldownCheck = await runQuery<{ template_id: string; reuse_cooldown_days: number; recent: Date | string }>(
          client,
          `SELECT e.template_id, l.reuse_cooldown_days, MAX(e.proposed_at) AS recent
           FROM interventions_executed e
           JOIN interventions_library l ON l.id = e.template_id
           WHERE e.guest_id = $1
             AND e.template_id = ANY($2::uuid[])
             AND e.status <> 'skipped'
           GROUP BY e.template_id, l.reuse_cooldown_days`,
          [args.guestId, templateIds],
        );
        const now = Date.now();
        for (const row of cooldownCheck.rows) {
          const recent = new Date(typeof row.recent === 'string' ? row.recent : (row.recent as Date).toISOString()).getTime();
          const cooldownMs = row.reuse_cooldown_days * 86_400_000;
          if (now - recent < cooldownMs) {
            onCooldown.add(row.template_id);
          }
        }
      }

      return result.rows.filter((row) => !onCooldown.has(row.id)).map(rowToTemplate);
    } catch (err) {
      logger.error('[InterventionLibrary] findCandidates failed', {
        guestId: args.guestId,
        visitId: args.visitId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Record that an intervention was proposed (by Fast, Deep, or staff).
   * Inserts with status='proposed' and lifecycle fields NULL. Caller cannot
   * pre-set approvedBy/approvedAt/postReading/outcomeScore — those are
   * driven by recordApproval / recordExecution / recordOutcome.
   *
   * cascadeId is required (null when the intervention does not fire a
   * cascade — by design).
   */
  async recordProposal(
    proposal: ProposalInput,
    client?: PoolClient,
  ): Promise<InterventionExecution> {
    const id = uuidv4();
    const now = new Date();

    try {
      const result = await runQuery<ExecutionRow>(
        client,
        `INSERT INTO interventions_executed (
           id, template_id, guest_id, visit_id, proposed_at, proposed_by,
           status, pre_reading, notes, cascade_id,
           created_at, updated_at
         ) VALUES (
           $1, $2, $3, $4, $5, $6,
           'proposed', $7, $8, $9,
           $5, $5
         )
         RETURNING *`,
        [
          id,
          proposal.templateId,
          proposal.guestId,
          proposal.visitId,
          now.toISOString(),
          proposal.proposedBy,
          proposal.preReading ?? null,
          proposal.notes ?? null,
          proposal.cascadeId,
        ],
      );

      if (result.rows.length === 0) {
        throw new Error('intervention-library: recordProposal INSERT returned 0 rows');
      }
      return rowToExecution(result.rows[0]);
    } catch (err) {
      logger.error('[InterventionLibrary] recordProposal failed', {
        templateId: proposal.templateId,
        guestId: proposal.guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Approve a proposed intervention. Transition: proposed → approved.
   * Sets approvedBy + approvedAt. Throws if the row is not in 'proposed'.
   */
  async recordApproval(
    executionId: UUID,
    approvedBy: UUID,
    client?: PoolClient,
  ): Promise<InterventionExecution> {
    try {
      const result = await runQuery<ExecutionRow>(
        client,
        `UPDATE interventions_executed
         SET status      = 'approved',
             approved_by = $2,
             approved_at = NOW(),
             updated_at  = NOW()
         WHERE id = $1 AND status = 'proposed'
         RETURNING *`,
        [executionId, approvedBy],
      );
      if (result.rows.length === 0) {
        throw new Error(
          `intervention-library: recordApproval — execution ${executionId} not found or not in 'proposed' state`,
        );
      }
      return rowToExecution(result.rows[0]);
    } catch (err) {
      logger.error('[InterventionLibrary] recordApproval failed', {
        executionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Mark an approved intervention as executed. Transition: approved → executed.
   * Optionally records preReading (the resonance score immediately before
   * the intervention fires) for the outcome-learning lift comparison.
   * Throws if the row is not in 'approved'.
   */
  async recordExecution(
    executionId: UUID,
    preReading?: number,
    client?: PoolClient,
  ): Promise<InterventionExecution> {
    if (preReading !== undefined && !Number.isFinite(preReading)) {
      throw new Error(`intervention-library: preReading must be finite, got ${preReading}`);
    }
    try {
      const result = await runQuery<ExecutionRow>(
        client,
        `UPDATE interventions_executed
         SET status      = 'executed',
             pre_reading = COALESCE($2, pre_reading),
             updated_at  = NOW()
         WHERE id = $1 AND status = 'approved'
         RETURNING *`,
        [executionId, preReading ?? null],
      );
      if (result.rows.length === 0) {
        throw new Error(
          `intervention-library: recordExecution — execution ${executionId} not found or not in 'approved' state`,
        );
      }
      return rowToExecution(result.rows[0]);
    } catch (err) {
      logger.error('[InterventionLibrary] recordExecution failed', {
        executionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Operator opt-out path. Transition: proposed | approved → skipped.
   * Records optional notes. A skipped intervention does NOT update the
   * template's successRate (it never ran). Throws if the row is not in
   * 'proposed' or 'approved'.
   */
  async recordSkip(
    executionId: UUID,
    notes?: string,
    client?: PoolClient,
  ): Promise<InterventionExecution> {
    try {
      const result = await runQuery<ExecutionRow>(
        client,
        `UPDATE interventions_executed
         SET status     = 'skipped',
             notes      = COALESCE($2, notes),
             updated_at = NOW()
         WHERE id = $1 AND status IN ('proposed', 'approved')
         RETURNING *`,
        [executionId, notes ?? null],
      );
      if (result.rows.length === 0) {
        throw new Error(
          `intervention-library: recordSkip — execution ${executionId} not found or not in 'proposed'|'approved' state`,
        );
      }
      return rowToExecution(result.rows[0]);
    } catch (err) {
      logger.error('[InterventionLibrary] recordSkip failed', {
        executionId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Complete an executed intervention and update the template's running
   * successRate. Transition: executed → completed. Throws if the row is
   * not in 'executed'.
   *
   * outcomeScore is a normalized [0, 1] success measure (caller validates
   * range at the route boundary). Algorithm:
   *
   *   new_success_rate = (old_rate * old_count + outcomeScore) / (old_count + 1)
   *   new_times_used   = old_count + 1
   *   last_used_at     = now()
   *
   * Both writes happen in a transaction so the execution and template
   * stats stay consistent.
   */
  async recordOutcome(
    executionId: UUID,
    outcomeScore: number,
    postReading: number,
  ): Promise<void> {
    if (!Number.isFinite(outcomeScore) || outcomeScore < 0 || outcomeScore > 1) {
      throw new Error(
        `intervention-library: outcomeScore must be in [0, 1], got ${outcomeScore}`,
      );
    }
    if (!Number.isFinite(postReading)) {
      throw new Error(`intervention-library: postReading must be finite, got ${postReading}`);
    }

    try {
      await transaction(async (client) => {
        const updated = await client.query<{ template_id: string }>(
          `UPDATE interventions_executed
           SET post_reading  = $2,
               outcome_score = $3,
               status        = 'completed',
               updated_at    = NOW()
           WHERE id = $1 AND status = 'executed'
           RETURNING template_id`,
          [executionId, postReading, outcomeScore],
        );

        if (updated.rows.length === 0) {
          throw new Error(
            `intervention-library: recordOutcome — execution ${executionId} not found or not in 'executed' state`,
          );
        }
        const templateId = updated.rows[0].template_id;

        // Incremental running mean — single SQL statement to avoid TOCTOU.
        const templateUpdate = await client.query(
          `UPDATE interventions_library
           SET success_rate = (success_rate * times_used + $2) / (times_used + 1),
               times_used   = times_used + 1,
               last_used_at = NOW(),
               updated_at   = NOW()
           WHERE id = $1`,
          [templateId, outcomeScore],
        );

        if (templateUpdate.rowCount === 0) {
          throw new Error(`intervention-library: template ${templateId} not found for outcome update`);
        }
      });
    } catch (err) {
      logger.error('[InterventionLibrary] recordOutcome failed', {
        executionId,
        outcomeScore,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Admin: list all templates, ordered alphabetically. Includes inactive
   * (active=false) for admin visibility — operator-facing endpoints that
   * only want active templates can filter client-side.
   *
   * Default limit 200 — way above the 10 founder templates and any plausible
   * Phase 1 expansion. Larger sets would justify pagination params.
   */
  async listTemplates(limit = 200, client?: PoolClient): Promise<InterventionTemplate[]> {
    try {
      const result = await runQuery<TemplateRow>(
        client,
        'SELECT * FROM interventions_library ORDER BY name ASC LIMIT $1',
        [limit],
      );
      return result.rows.map(rowToTemplate);
    } catch (err) {
      logger.error('[InterventionLibrary] listTemplates failed', {
        limit,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const interventionLibrary = new InterventionLibrary();
