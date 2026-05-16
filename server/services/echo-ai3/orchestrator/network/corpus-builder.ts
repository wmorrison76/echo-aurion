/**
 * ===========================================================================
 * Training corpus builder — the data flywheel
 * ===========================================================================
 * Layer:    Substrate: Network
 * Status:   IMPLEMENTED
 * Phase:    6
 *
 * Purpose:  Master doc §11.4: scored interventions become training rows.
 *           Episodes are sanitized (no PII, only the segment key + the
 *           three states) and persisted to training_episodes.
 *
 *           Tenet 5: distill is gated by cross-property consent. Without
 *           explicit `this-brand-only` or `all-network-properties` scope
 *           the episode is dropped.
 *
 *           Quality filter: outcomeQuality must be present and >=
 *           MIN_OUTCOME_QUALITY (0.4). Below that we don't have a useful
 *           training signal.
 *
 *           Aligned to migration 025_training_corpus.sql.
 * ===========================================================================
 */

import type { TrainingEpisode } from '../../../../../shared/types/network';
import type { GuestId, UUID } from '../../../../../shared/types/base';
import { query } from '../../../../database/connection';
import { logger } from '../../../../lib/logger';
import { crossPropertyConsentManager } from './consent-manager';

export const MIN_OUTCOME_QUALITY = 0.4;

export interface DistillSourceRow {
  visitId: UUID;
  guestId: GuestId;
  segmentKey: string;
  preState: any;
  action: any;
  postState: any;
  outcomeQuality: number;
}

/**
 * Pure helper: sanitize a source row. Strips PII; retains only the
 * segment key + the three structural states + outcome quality.
 * Exported for testing.
 */
export function sanitizeEpisode(row: DistillSourceRow, capturedAt: string): TrainingEpisode {
  const id = `${row.visitId}-${row.action?.templateId ?? 'unknown'}`;
  return {
    id,
    capturedAt,
    segmentKey: row.segmentKey,
    preState: stripPii(row.preState),
    action: stripPii(row.action),
    postState: stripPii(row.postState),
    outcomeQuality: clamp01(row.outcomeQuality),
  };
}

function clamp01(v: number): number {
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(1, v));
}

const PII_KEYS = new Set([
  'guestId',
  'guest_id',
  'staffId',
  'staff_id',
  'name',
  'email',
  'phone',
  'address',
  'firstName',
  'lastName',
  'roomNumber',
]);

function stripPii(input: unknown): unknown {
  if (input === null || typeof input !== 'object') return input;
  if (Array.isArray(input)) return input.map(stripPii);
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(input as Record<string, unknown>)) {
    if (PII_KEYS.has(k)) continue;
    out[k] = stripPii(v);
  }
  return out;
}

export class CorpusBuilder {
  /**
   * Distill all consented + quality-passing episodes for a visit into
   * training rows. Persists each row to training_episodes (Phase 6
   * migration 025) and returns them.
   */
  async distill(visitId: string): Promise<TrainingEpisode[]> {
    try {
      // Pull the per-visit candidate rows from the resonance + intervention
      // tables. Phase 6 simplification: shape the SELECT result into the
      // DistillSourceRow contract; richer pre/post snapshots arrive in 6.x.
      const result = await query<{
        visit_id: string;
        guest_id: string;
        segment_key: string;
        pre_reading: number | null;
        post_reading: number | null;
        outcome_score: number | null;
        template_id: string;
      }>(
        `SELECT
            ie.visit_id,
            ie.guest_id,
            COALESCE(g.segment_key, 'unknown') AS segment_key,
            ie.pre_reading,
            ie.post_reading,
            ie.outcome_score,
            ie.template_id::text AS template_id
         FROM interventions_executed ie
         LEFT JOIN guests g ON g.id = ie.guest_id
         WHERE ie.visit_id = $1
           AND ie.outcome_score IS NOT NULL`,
        [visitId],
      );

      const episodes: TrainingEpisode[] = [];
      const capturedAt = new Date().toISOString();

      for (const row of result.rows) {
        if (row.outcome_score === null || row.outcome_score < MIN_OUTCOME_QUALITY) continue;

        const consent = await crossPropertyConsentManager.getConsent(row.guest_id as GuestId);
        if (consent.scope === 'this-property-only' || consent.revokedAt) {
          continue; // Tenet 5: no cross-property without explicit grant
        }

        const sourceRow: DistillSourceRow = {
          visitId: row.visit_id,
          guestId: row.guest_id as GuestId,
          segmentKey: row.segment_key,
          preState: { entryScore: row.pre_reading },
          action: { templateId: row.template_id },
          postState: { lift: (row.post_reading ?? 0) - (row.pre_reading ?? 0) },
          outcomeQuality: row.outcome_score,
        };

        const episode = sanitizeEpisode(sourceRow, capturedAt);

        await query(
          `INSERT INTO training_episodes
             (id, captured_at, segment_key, pre_state, action, post_state, outcome_quality)
           VALUES ($1, $2, $3, $4::jsonb, $5::jsonb, $6::jsonb, $7)
           ON CONFLICT (id) DO NOTHING`,
          [
            episode.id,
            episode.capturedAt,
            episode.segmentKey,
            JSON.stringify(episode.preState),
            JSON.stringify(episode.action),
            JSON.stringify(episode.postState),
            episode.outcomeQuality,
          ],
        );

        episodes.push(episode);
      }

      logger.info('[CorpusBuilder] distilled visit episodes', {
        visitId,
        episodeCount: episodes.length,
      });
      return episodes;
    } catch (err) {
      logger.error('[CorpusBuilder] distill failed', {
        visitId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Export episodes captured since a timestamp. The model-training
   * pipeline pulls weekly. The export is read-only — episodes are not
   * deleted from this side (training corpus is forever per master doc).
   */
  async exportBatch(since: string): Promise<{ episodes: TrainingEpisode[]; count: number }> {
    try {
      const result = await query<{
        id: string;
        captured_at: Date | string;
        segment_key: string;
        pre_state: any;
        action: any;
        post_state: any;
        outcome_quality: number;
      }>(
        `SELECT id, captured_at, segment_key, pre_state, action, post_state, outcome_quality
         FROM training_episodes
         WHERE captured_at >= $1
         ORDER BY captured_at ASC`,
        [since],
      );
      const episodes: TrainingEpisode[] = result.rows.map((r) => ({
        id: r.id,
        capturedAt: r.captured_at instanceof Date ? r.captured_at.toISOString() : r.captured_at,
        segmentKey: r.segment_key,
        preState: r.pre_state,
        action: r.action,
        postState: r.post_state,
        outcomeQuality: r.outcome_quality,
      }));
      return { episodes, count: episodes.length };
    } catch (err) {
      logger.error('[CorpusBuilder] exportBatch failed', {
        since,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const corpusBuilder = new CorpusBuilder();
