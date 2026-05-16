/**
 * ===========================================================================
 * intervention-library tests
 * ===========================================================================
 * Layer:    Resonance (test mirror of server/services/echo-ai3/resonance/)
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Tests for InterventionLibrary — candidate selection (quadrant +
 *           signal filters + cooldown), proposal recording, outcome learning
 *           (incremental running successRate), and admin listing.
 *
 *           Unit layer (always runs): module-structure smoke and outcomeScore
 *           range validation.
 *
 *           Integration layer (gated on DATABASE_URL_TEST): full SQL
 *           round-trip — template insertion, candidate filtering by quadrant,
 *           required/excluded signals, cooldown, and the running-mean
 *           successRate update.
 * ===========================================================================
 */

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';
import type { Pool } from 'pg';
import {
  interventionLibrary,
  InterventionLibrary,
} from '../../../../server/services/echo-ai3/resonance/intervention-library';
import {
  applyMigrations,
  closeTestPool,
  getTestPool,
} from '../../../_helpers/test-db';

// =============================================================================
// Unit layer
// =============================================================================

describe('intervention-library — module structure', () => {
  it('interventionLibrary singleton is an instance of InterventionLibrary', () => {
    expect(interventionLibrary).toBeInstanceOf(InterventionLibrary);
  });

  it('exposes the spec methods (full state machine)', () => {
    expect(typeof interventionLibrary.findCandidates).toBe('function');
    expect(typeof interventionLibrary.recordProposal).toBe('function');
    expect(typeof interventionLibrary.recordApproval).toBe('function');
    expect(typeof interventionLibrary.recordExecution).toBe('function');
    expect(typeof interventionLibrary.recordSkip).toBe('function');
    expect(typeof interventionLibrary.recordOutcome).toBe('function');
    expect(typeof interventionLibrary.listTemplates).toBe('function');
  });
});

describe('intervention-library — recordOutcome input validation', () => {
  // These run without a DB because validation throws before SQL.
  it('rejects outcomeScore < 0', async () => {
    await expect(
      interventionLibrary.recordOutcome('00000000-0000-0000-0000-000000000001', -0.1, 5),
    ).rejects.toThrow(/outcomeScore must be in \[0, 1\]/);
  });

  it('rejects outcomeScore > 1', async () => {
    await expect(
      interventionLibrary.recordOutcome('00000000-0000-0000-0000-000000000001', 1.5, 5),
    ).rejects.toThrow(/outcomeScore must be in \[0, 1\]/);
  });

  it('rejects NaN outcomeScore', async () => {
    await expect(
      interventionLibrary.recordOutcome('00000000-0000-0000-0000-000000000001', NaN, 5),
    ).rejects.toThrow(/outcomeScore must be in \[0, 1\]/);
  });

  it('rejects non-finite postReading', async () => {
    await expect(
      interventionLibrary.recordOutcome('00000000-0000-0000-0000-000000000001', 0.5, Infinity),
    ).rejects.toThrow(/postReading must be finite/);
  });
});

// =============================================================================
// Integration layer — actual DB (gated)
// =============================================================================

const TEST_DB_URL = process.env.DATABASE_URL_TEST;

describe.skipIf(!TEST_DB_URL)(
  'intervention-library — DB integration',
  () => {
    let pool: Pool;
    const insertedTemplateIds: string[] = [];
    const insertedExecutionIds: string[] = [];

    beforeAll(async () => {
      await applyMigrations();
      pool = getTestPool();
    }, 60_000);

    afterEach(async () => {
      if (insertedExecutionIds.length > 0) {
        await pool.query(`DELETE FROM interventions_executed WHERE id = ANY($1::uuid[])`, [insertedExecutionIds]);
        insertedExecutionIds.length = 0;
      }
      if (insertedTemplateIds.length > 0) {
        // Cascade-delete any executions that reference these (templates may
        // still have lingering executions if a test forgot — defensive).
        await pool.query(`DELETE FROM interventions_executed WHERE template_id = ANY($1::uuid[])`, [insertedTemplateIds]);
        await pool.query(`DELETE FROM interventions_library WHERE id = ANY($1::uuid[])`, [insertedTemplateIds]);
        insertedTemplateIds.length = 0;
      }
    });

    afterAll(async () => {
      await closeTestPool();
    });

    interface SeedTemplateOpts {
      id?: string;
      name?: string;
      affectQuadrants?: string[];
      requiresSignals?: string[] | null;
      excludeSignals?: string[] | null;
      reuseCooldownDays?: number;
      active?: boolean;
      timesUsed?: number;
      successRate?: number;
    }

    async function seedTemplate(opts: SeedTemplateOpts = {}): Promise<string> {
      const {
        id = `00000000-0000-0000-0000-${String(insertedTemplateIds.length + 100).padStart(12, '0')}`,
        name = `Test template ${insertedTemplateIds.length}`,
        affectQuadrants = ['high-pos'],
        requiresSignals = null,
        excludeSignals = null,
        reuseCooldownDays = 0,
        active = true,
        timesUsed = 0,
        successRate = 0,
      } = opts;
      await pool.query(
        `INSERT INTO interventions_library
           (id, name, description, affect_quadrants, requires_signals, exclude_signals,
            approach, effort, lead_time_minutes, estimated_cost_cents, estimated_cost_currency,
            reuse_cooldown_days, departments_required, do_nots,
            times_used, success_rate, active)
         VALUES ($1, $2, $3, $4::text[], $5::text[], $6::text[],
                 'gentle-approach', 'light', 5, 0, 'USD',
                 $7, '{}'::text[], '{}'::text[],
                 $8, $9, $10)`,
        [id, name, `desc for ${name}`, affectQuadrants, requiresSignals, excludeSignals,
         reuseCooldownDays, timesUsed, successRate, active],
      );
      insertedTemplateIds.push(id);
      return id;
    }

    async function seedExecution(
      templateId: string,
      guestId: string,
      visitId: string,
      status: 'proposed' | 'approved' | 'executed' | 'skipped' | 'completed',
      proposedAt: Date = new Date(),
    ): Promise<string> {
      const id = `00000000-0000-0000-0000-${String(insertedExecutionIds.length + 700).padStart(12, '0')}`;
      await pool.query(
        `INSERT INTO interventions_executed
           (id, template_id, guest_id, visit_id, proposed_at, proposed_by, status, cascade_id)
         VALUES ($1, $2, $3, $4, $5, 'echo-fast', $6, NULL)`,
        [id, templateId, guestId, visitId, proposedAt.toISOString(), status],
      );
      insertedExecutionIds.push(id);
      return id;
    }

    // -------------------- findCandidates --------------------

    it('findCandidates: filters by affect quadrant', async () => {
      const matching = await seedTemplate({ affectQuadrants: ['high-neg'] });
      const nonMatching = await seedTemplate({ affectQuadrants: ['low-pos'] });

      const result = await interventionLibrary.findCandidates({
        affect: { arousal: 0.8, valence: -0.5 }, // high-neg
        presentSignals: [],
        guestId: '00000000-0000-0000-0000-0000000c0001',
        visitId: '00000000-0000-0000-0000-0000000c0002',
      });

      const ids = result.map((t) => t.id);
      expect(ids).toContain(matching);
      expect(ids).not.toContain(nonMatching);
    });

    it('findCandidates: only active templates', async () => {
      const active = await seedTemplate({ affectQuadrants: ['high-pos'], active: true });
      const inactive = await seedTemplate({ affectQuadrants: ['high-pos'], active: false });

      const result = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: [],
        guestId: '00000000-0000-0000-0000-0000000c0010',
        visitId: '00000000-0000-0000-0000-0000000c0011',
      });

      const ids = result.map((t) => t.id);
      expect(ids).toContain(active);
      expect(ids).not.toContain(inactive);
    });

    it('findCandidates: respects requiresSignals (subset match)', async () => {
      const requires = await seedTemplate({
        affectQuadrants: ['high-pos'],
        requiresSignals: ['anniversary', 'wine-drinker'],
      });
      const noRequire = await seedTemplate({
        affectQuadrants: ['high-pos'],
        requiresSignals: null,
      });

      // Present signals do contain both required → both match
      const matchResult = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: ['anniversary', 'wine-drinker', 'returning-guest'],
        guestId: '00000000-0000-0000-0000-0000000c0020',
        visitId: '00000000-0000-0000-0000-0000000c0021',
      });
      const matchIds = matchResult.map((t) => t.id);
      expect(matchIds).toContain(requires);
      expect(matchIds).toContain(noRequire);

      // Missing one required signal → 'requires' template excluded
      const missResult = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: ['anniversary'],
        guestId: '00000000-0000-0000-0000-0000000c0022',
        visitId: '00000000-0000-0000-0000-0000000c0023',
      });
      const missIds = missResult.map((t) => t.id);
      expect(missIds).not.toContain(requires);
      expect(missIds).toContain(noRequire);
    });

    it('findCandidates: respects excludeSignals (any-match)', async () => {
      const excludesShellfish = await seedTemplate({
        affectQuadrants: ['high-pos'],
        excludeSignals: ['shellfish-allergy'],
      });

      // Present signals include the excluded one → template not surfaced
      const blockResult = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: ['shellfish-allergy', 'wine-drinker'],
        guestId: '00000000-0000-0000-0000-0000000c0030',
        visitId: '00000000-0000-0000-0000-0000000c0031',
      });
      expect(blockResult.map((t) => t.id)).not.toContain(excludesShellfish);

      // Present signals don't include the excluded one → template surfaced
      const okResult = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: ['wine-drinker'],
        guestId: '00000000-0000-0000-0000-0000000c0032',
        visitId: '00000000-0000-0000-0000-0000000c0033',
      });
      expect(okResult.map((t) => t.id)).toContain(excludesShellfish);
    });

    it('findCandidates: respects cooldown for same guest', async () => {
      const guestId = '00000000-0000-0000-0000-0000000c0040';
      const tplWithCooldown = await seedTemplate({
        affectQuadrants: ['high-pos'],
        reuseCooldownDays: 30,
      });
      // Recent proposal for this guest — within cooldown
      const recentTime = new Date(Date.now() - 1 * 86_400_000);
      await seedExecution(
        tplWithCooldown,
        guestId,
        '00000000-0000-0000-0000-0000000c0041',
        'completed',
        recentTime,
      );

      const result = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: [],
        guestId,
        visitId: '00000000-0000-0000-0000-0000000c0042',
      });
      expect(result.map((t) => t.id)).not.toContain(tplWithCooldown);
    });

    it('findCandidates: cooldown does not apply to a different guest', async () => {
      const tplWithCooldown = await seedTemplate({
        affectQuadrants: ['high-pos'],
        reuseCooldownDays: 30,
      });
      // Recent execution for guest A; querying for guest B
      const recentTime = new Date(Date.now() - 1 * 86_400_000);
      await seedExecution(
        tplWithCooldown,
        '00000000-0000-0000-0000-0000000c0050',
        '00000000-0000-0000-0000-0000000c0051',
        'completed',
        recentTime,
      );

      const result = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: [],
        guestId: '00000000-0000-0000-0000-0000000c0052', // different guest
        visitId: '00000000-0000-0000-0000-0000000c0053',
      });
      expect(result.map((t) => t.id)).toContain(tplWithCooldown);
    });

    it('findCandidates: cooldown ignores skipped executions', async () => {
      const guestId = '00000000-0000-0000-0000-0000000c0060';
      const tplWithCooldown = await seedTemplate({
        affectQuadrants: ['high-pos'],
        reuseCooldownDays: 30,
      });
      // Skipped execution should NOT trigger cooldown
      await seedExecution(
        tplWithCooldown,
        guestId,
        '00000000-0000-0000-0000-0000000c0061',
        'skipped',
        new Date(Date.now() - 1 * 86_400_000),
      );

      const result = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: [],
        guestId,
        visitId: '00000000-0000-0000-0000-0000000c0062',
      });
      expect(result.map((t) => t.id)).toContain(tplWithCooldown);
    });

    it('findCandidates: cooldown elapsed → template surfaces again', async () => {
      const guestId = '00000000-0000-0000-0000-0000000c0070';
      const tplWithCooldown = await seedTemplate({
        affectQuadrants: ['high-pos'],
        reuseCooldownDays: 7,
      });
      // Old execution: 30 days ago → outside the 7-day cooldown
      const oldTime = new Date(Date.now() - 30 * 86_400_000);
      await seedExecution(
        tplWithCooldown,
        guestId,
        '00000000-0000-0000-0000-0000000c0071',
        'completed',
        oldTime,
      );

      const result = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: [],
        guestId,
        visitId: '00000000-0000-0000-0000-0000000c0072',
      });
      expect(result.map((t) => t.id)).toContain(tplWithCooldown);
    });

    it('findCandidates: orders by successRate DESC', async () => {
      const lowRate = await seedTemplate({ affectQuadrants: ['high-pos'], successRate: 0.3, timesUsed: 10 });
      const highRate = await seedTemplate({ affectQuadrants: ['high-pos'], successRate: 0.9, timesUsed: 10 });

      const result = await interventionLibrary.findCandidates({
        affect: { arousal: 0.5, valence: 0.5 },
        presentSignals: [],
        guestId: '00000000-0000-0000-0000-0000000c0080',
        visitId: '00000000-0000-0000-0000-0000000c0081',
      });
      const ids = result.map((t) => t.id).filter((id) => id === lowRate || id === highRate);
      expect(ids[0]).toBe(highRate);
      expect(ids[1]).toBe(lowRate);
    });

    // -------------------- recordProposal --------------------

    it('recordProposal: persists with status=proposed and auto-fills', async () => {
      const tplId = await seedTemplate({ affectQuadrants: ['high-pos'] });
      const exec = await interventionLibrary.recordProposal({
        templateId: tplId,
        guestId: '00000000-0000-0000-0000-0000000c0090',
        visitId: '00000000-0000-0000-0000-0000000c0091',
        proposedBy: 'echo-fast',
        cascadeId: null,
      });
      insertedExecutionIds.push(exec.id);

      expect(exec.id).toMatch(/^[0-9a-f]{8}-/);
      expect(exec.status).toBe('proposed');
      expect(exec.proposedAt).toBeTruthy();
      expect(exec.cascadeId).toBeNull();

      const row = await pool.query('SELECT id, status FROM interventions_executed WHERE id = $1', [exec.id]);
      expect(row.rows[0].status).toBe('proposed');
    });

    // -------------------- recordOutcome --------------------

    // -------------------- recordApproval / recordExecution --------------------

    it('recordApproval: proposed → approved (sets approvedBy + approvedAt)', async () => {
      const tplId = await seedTemplate({ affectQuadrants: ['high-pos'] });
      const execId = await seedExecution(
        tplId,
        '00000000-0000-0000-0000-0000000c00b0',
        '00000000-0000-0000-0000-0000000c00b1',
        'proposed',
      );
      const staffId = '00000000-0000-0000-0000-0000000c00b2';

      const approved = await interventionLibrary.recordApproval(execId, staffId);
      expect(approved.status).toBe('approved');
      expect(approved.approvedBy).toBe(staffId);
      expect(approved.approvedAt).toBeTruthy();
    });

    it('recordApproval: rejects when row is not in proposed state', async () => {
      const tplId = await seedTemplate({ affectQuadrants: ['high-pos'] });
      const execId = await seedExecution(
        tplId,
        '00000000-0000-0000-0000-0000000c00c0',
        '00000000-0000-0000-0000-0000000c00c1',
        'completed',
      );
      await expect(
        interventionLibrary.recordApproval(execId, '00000000-0000-0000-0000-0000000c00c2'),
      ).rejects.toThrow(/not in 'proposed'/);
    });

    it('recordExecution: approved → executed (records preReading)', async () => {
      const tplId = await seedTemplate({ affectQuadrants: ['high-pos'] });
      const execId = await seedExecution(
        tplId,
        '00000000-0000-0000-0000-0000000c00d0',
        '00000000-0000-0000-0000-0000000c00d1',
        'approved',
      );

      const executed = await interventionLibrary.recordExecution(execId, 6.0);
      expect(executed.status).toBe('executed');
      expect(executed.preReading).toBe(6.0);
    });

    it('recordExecution: rejects when row is not in approved state', async () => {
      const tplId = await seedTemplate({ affectQuadrants: ['high-pos'] });
      const execId = await seedExecution(
        tplId,
        '00000000-0000-0000-0000-0000000c00e0',
        '00000000-0000-0000-0000-0000000c00e1',
        'proposed',
      );
      await expect(interventionLibrary.recordExecution(execId, 6.0)).rejects.toThrow(
        /not in 'approved'/,
      );
    });

    it('recordSkip: proposed | approved → skipped (notes recorded)', async () => {
      const tplId = await seedTemplate({ affectQuadrants: ['high-pos'] });
      const execId = await seedExecution(
        tplId,
        '00000000-0000-0000-0000-0000000c00f0',
        '00000000-0000-0000-0000-0000000c00f1',
        'proposed',
      );
      const skipped = await interventionLibrary.recordSkip(execId, 'guest already content');
      expect(skipped.status).toBe('skipped');
      expect(skipped.notes).toBe('guest already content');
    });

    it('recordSkip: rejects when row is already executed', async () => {
      const tplId = await seedTemplate({ affectQuadrants: ['high-pos'] });
      const execId = await seedExecution(
        tplId,
        '00000000-0000-0000-0000-0000000c0100',
        '00000000-0000-0000-0000-0000000c0101',
        'executed',
      );
      await expect(interventionLibrary.recordSkip(execId)).rejects.toThrow(
        /not in 'proposed'\|'approved'/,
      );
    });

    // -------------------- recordOutcome (now requires status='executed') --------------------

    it('recordOutcome: completes execution + updates template successRate (running mean)', async () => {
      const tplId = await seedTemplate({
        affectQuadrants: ['high-pos'],
        timesUsed: 4,
        successRate: 0.5, // 4 prior outcomes averaging 0.5
      });
      const execId = await seedExecution(
        tplId,
        '00000000-0000-0000-0000-0000000c00a0',
        '00000000-0000-0000-0000-0000000c00a1',
        'executed',
      );

      await interventionLibrary.recordOutcome(execId, 1.0, 8.5);

      const exec = await pool.query<{ status: string; outcome_score: number; post_reading: number }>(
        'SELECT status, outcome_score, post_reading FROM interventions_executed WHERE id = $1',
        [execId],
      );
      expect(exec.rows[0].status).toBe('completed');
      expect(Number(exec.rows[0].outcome_score)).toBe(1.0);
      expect(Number(exec.rows[0].post_reading)).toBe(8.5);

      const tpl = await pool.query<{ times_used: number; success_rate: number; last_used_at: Date | null }>(
        'SELECT times_used, success_rate, last_used_at FROM interventions_library WHERE id = $1',
        [tplId],
      );
      expect(tpl.rows[0].times_used).toBe(5);
      // (0.5 * 4 + 1.0) / 5 = 0.6
      expect(Number(tpl.rows[0].success_rate)).toBeCloseTo(0.6, 5);
      expect(tpl.rows[0].last_used_at).not.toBeNull();
    });

    it('recordOutcome: rejects when row is not in executed state', async () => {
      const tplId = await seedTemplate({ affectQuadrants: ['high-pos'] });
      const execId = await seedExecution(
        tplId,
        '00000000-0000-0000-0000-0000000c0110',
        '00000000-0000-0000-0000-0000000c0111',
        'proposed', // not 'executed'
      );
      await expect(interventionLibrary.recordOutcome(execId, 0.5, 5)).rejects.toThrow(
        /not in 'executed'/,
      );
    });

    it('recordOutcome: throws on missing execution id', async () => {
      await expect(
        interventionLibrary.recordOutcome('00000000-0000-0000-0000-0000000cffff', 0.5, 5),
      ).rejects.toThrow(/not in 'executed'/);
    });

    it('full lifecycle: proposed → approved → executed → completed', async () => {
      const tplId = await seedTemplate({
        affectQuadrants: ['high-pos'],
        timesUsed: 0,
        successRate: 0,
      });
      const proposed = await interventionLibrary.recordProposal({
        templateId: tplId,
        guestId: '00000000-0000-0000-0000-0000000c0120',
        visitId: '00000000-0000-0000-0000-0000000c0121',
        proposedBy: 'echo-fast',
        cascadeId: null,
      });
      insertedExecutionIds.push(proposed.id);

      const approved = await interventionLibrary.recordApproval(
        proposed.id,
        '00000000-0000-0000-0000-0000000c0122',
      );
      const executed = await interventionLibrary.recordExecution(approved.id, 5.5);
      await interventionLibrary.recordOutcome(executed.id, 0.8, 7.5);

      const final = await pool.query<{ status: string }>(
        'SELECT status FROM interventions_executed WHERE id = $1',
        [proposed.id],
      );
      expect(final.rows[0].status).toBe('completed');

      const tpl = await pool.query<{ times_used: number; success_rate: number }>(
        'SELECT times_used, success_rate FROM interventions_library WHERE id = $1',
        [tplId],
      );
      expect(tpl.rows[0].times_used).toBe(1);
      expect(Number(tpl.rows[0].success_rate)).toBeCloseTo(0.8, 5);
    });

    // -------------------- listTemplates --------------------

    it('listTemplates: returns all templates ordered by name, includes inactive', async () => {
      const a = await seedTemplate({ name: 'AAA-test', affectQuadrants: ['high-pos'], active: true });
      const z = await seedTemplate({ name: 'ZZZ-test', affectQuadrants: ['high-neg'], active: false });

      const all = await interventionLibrary.listTemplates();
      const ids = all.map((t) => t.id);
      expect(ids).toContain(a);
      expect(ids).toContain(z);
      const aIdx = ids.indexOf(a);
      const zIdx = ids.indexOf(z);
      expect(aIdx).toBeLessThan(zIdx);
    });
  },
);
