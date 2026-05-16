/**
 * ===========================================================================
 * Network aggregator — anonymized statistics across properties
 * ===========================================================================
 * Layer:    Substrate: Network
 * Status:   IMPLEMENTED
 * Phase:    6
 *
 * Purpose:  Master doc §11.3: segment-level aggregates that inform a new
 *           property's day-one playbook. Reads the training_episodes
 *           corpus + intervention library; never reads guest signals
 *           directly (those are property-scoped by Tenet 5).
 *
 *           K-anonymity gate: aggregates only return when the underlying
 *           sample is at least K_ANONYMITY_THRESHOLD episodes. Below the
 *           threshold the method returns null so callers know the segment
 *           is too thin to share without re-identification risk.
 *
 *           Differential privacy noise (planned for Phase 6.x) is layered
 *           on at the export boundary, not the aggregate computation —
 *           keeps the math testable.
 * ===========================================================================
 */

import type { SegmentAggregate, InterventionPatternAggregate } from '../../../../../shared/types/network';
import { query } from '../../../../database/connection';
import { logger } from '../../../../lib/logger';

export const K_ANONYMITY_THRESHOLD = 50;

interface CorpusRow {
  segment_key: string;
  pre_state: any;
  action: any;
  post_state: any;
  outcome_quality: number;
}

interface PatternRow {
  template_id: string;
  affect_quadrant: string;
  success_count: number;
  total_count: number;
  signals: string[];
}

/**
 * Pure helper: aggregate raw corpus rows for one segment into a
 * SegmentAggregate. Exported for testing.
 *
 * Returns null when the row count is below the k-anonymity threshold —
 * the gate is the function's invariant, not a side check.
 */
export function aggregateSegment(
  segmentKey: string,
  rows: CorpusRow[],
  threshold: number = K_ANONYMITY_THRESHOLD,
): SegmentAggregate | null {
  if (rows.length < threshold) return null;

  const affinityProfile: Record<string, number> = {};
  const interventionTotals = new Map<string, number>();
  let entryScoreSum = 0;
  let entryScoreCount = 0;
  let liftSum = 0;
  let liftCount = 0;

  for (const row of rows) {
    const pre = row.pre_state ?? {};
    const post = row.post_state ?? {};
    if (typeof pre.entryScore === 'number') {
      entryScoreSum += pre.entryScore;
      entryScoreCount += 1;
    }
    if (typeof post.lift === 'number') {
      liftSum += post.lift;
      liftCount += 1;
    }
    const tags: string[] = Array.isArray(pre.affinityTags) ? pre.affinityTags : [];
    for (const tag of tags) {
      affinityProfile[tag] = (affinityProfile[tag] ?? 0) + 1;
    }
    const action = row.action ?? {};
    if (typeof action.templateId === 'string') {
      interventionTotals.set(action.templateId, (interventionTotals.get(action.templateId) ?? 0) + 1);
    }
  }

  // Normalize affinity profile to [0, 1]
  const maxAffinity = Object.values(affinityProfile).reduce((m, v) => Math.max(m, v), 0);
  if (maxAffinity > 0) {
    for (const k of Object.keys(affinityProfile)) {
      affinityProfile[k] = affinityProfile[k] / maxAffinity;
    }
  }

  // Top intervention patterns by frequency
  const topInterventionPatterns = [...interventionTotals.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id]) => id);

  return {
    segmentKey,
    sampleSize: rows.length,
    affinityProfile,
    averageEntryScore: entryScoreCount === 0 ? 0 : entryScoreSum / entryScoreCount,
    averageLift: liftCount === 0 ? 0 : liftSum / liftCount,
    topInterventionPatterns,
  };
}

export class NetworkAggregator {
  /**
   * Compute the segment profile from training_episodes. Returns null
   * when the segment has fewer than K_ANONYMITY_THRESHOLD episodes —
   * the privacy gate is non-negotiable.
   */
  async getSegmentProfile(segmentKey: string): Promise<SegmentAggregate | null> {
    try {
      const result = await query<CorpusRow>(
        `SELECT segment_key, pre_state, action, post_state, outcome_quality
         FROM training_episodes
         WHERE segment_key = $1`,
        [segmentKey],
      );
      return aggregateSegment(segmentKey, result.rows);
    } catch (err) {
      logger.error('[NetworkAggregator] getSegmentProfile failed', {
        segmentKey,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Network-wide intervention success patterns. K-anonymity applied per
   * pattern: patterns with sample size below threshold are filtered out.
   */
  async getInterventionPatterns(): Promise<InterventionPatternAggregate[]> {
    try {
      const result = await query<PatternRow>(
        `SELECT
            il.id::text AS template_id,
            COALESCE((il.affect_quadrants)[1], 'high-pos') AS affect_quadrant,
            CAST(ROUND(il.success_rate * il.times_used) AS INT) AS success_count,
            il.times_used AS total_count,
            COALESCE(il.requires_signals, ARRAY[]::TEXT[]) AS signals
         FROM interventions_library il
         WHERE il.times_used >= $1`,
        [K_ANONYMITY_THRESHOLD],
      );
      return result.rows.map((row) => ({
        patternId: row.template_id,
        affectQuadrant: row.affect_quadrant,
        averageSuccessRate: row.total_count === 0 ? 0 : row.success_count / row.total_count,
        sampleSize: row.total_count,
        signalsCorrelated: row.signals ?? [],
      }));
    } catch (err) {
      logger.error('[NetworkAggregator] getInterventionPatterns failed', {
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const networkAggregator = new NetworkAggregator();
