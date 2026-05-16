/**
 * ===========================================================================
 * cascade-bridge tests
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  Verify Phase 1 cascade-bridge behavior:
 *             - returns a deterministic cascadeId derived from execution.id
 *             - same execution → same cascadeId across calls
 *             - different executions → different cascadeIds
 *             - logs status='logged' (Phase 1 marker)
 *             - accepts optional targetDepartments and echoes them back
 *             - never throws (cascade failure is non-fatal per the design)
 * ===========================================================================
 */

import { describe, expect, it } from 'vitest';
import {
  cascadeBridge,
  CascadeBridge,
} from '../../../server/services/echo-ai3/resonance/cascade-bridge';
import type { InterventionExecution } from '../../../shared/types/resonance';

function execution(over: Partial<InterventionExecution> = {}): InterventionExecution {
  return {
    id: 'aabbccdd-1111-2222-3333-444455556666',
    templateId: '11111111-2222-3333-4444-555555555555',
    guestId: '22222222-3333-4444-5555-666666666666',
    visitId: '33333333-4444-5555-6666-777777777777',
    proposedAt: '2026-05-06T12:00:00.000Z',
    proposedBy: 'echo-fast',
    status: 'approved',
    approvedBy: '44444444-5555-6666-7777-888888888888',
    approvedAt: '2026-05-06T12:01:00.000Z',
    cascadeId: null,
    createdAt: '2026-05-06T12:00:00.000Z',
    updatedAt: '2026-05-06T12:01:00.000Z',
    ...over,
  };
}

describe('cascade-bridge', () => {
  it('singleton is a CascadeBridge instance', () => {
    expect(cascadeBridge).toBeInstanceOf(CascadeBridge);
  });

  it('returns status=logged in Phase 1', async () => {
    const result = await cascadeBridge.triggerCascade(execution());
    expect(result.status).toBe('logged');
  });

  it('returns a deterministic cascadeId derived from execution.id', async () => {
    const exec = execution();
    const a = await cascadeBridge.triggerCascade(exec);
    const b = await cascadeBridge.triggerCascade(exec);
    expect(a.cascadeId).toBe(b.cascadeId);
    expect(a.cascadeId).toMatch(/^cascade-/);
    // first 12 hex chars from the execution id minus dashes
    expect(a.cascadeId).toBe('cascade-aabbccdd1111');
  });

  it('different executions produce different cascadeIds', async () => {
    const a = await cascadeBridge.triggerCascade(
      execution({ id: '11111111-aaaa-bbbb-cccc-dddddddddddd' }),
    );
    const b = await cascadeBridge.triggerCascade(
      execution({ id: '22222222-aaaa-bbbb-cccc-dddddddddddd' }),
    );
    expect(a.cascadeId).not.toBe(b.cascadeId);
  });

  it('echoes targetDepartments in the response', async () => {
    const result = await cascadeBridge.triggerCascade(execution(), [
      'kitchen',
      'front-of-house',
    ]);
    expect(result.targetDepartments).toEqual(['kitchen', 'front-of-house']);
  });

  it('defaults targetDepartments to empty array when omitted', async () => {
    const result = await cascadeBridge.triggerCascade(execution());
    expect(result.targetDepartments).toEqual([]);
  });

  it('does not throw under normal conditions', async () => {
    await expect(cascadeBridge.triggerCascade(execution())).resolves.toBeTruthy();
  });
});
