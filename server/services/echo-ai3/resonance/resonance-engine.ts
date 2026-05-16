/**
 * ===========================================================================
 * Resonance engine — core scoring, persistence, signal emission
 * ===========================================================================
 * Layer:    Resonance
 * Status:   IMPLEMENTED
 * Phase:    1
 *
 * Purpose:  The central service of Layer 1. Receives ResonanceReadings from
 *           the whisper widget and the Aurion voice layer, persists them,
 *           emits a corresponding Signal to the unified graph, and triggers
 *           a trajectory recompute — all inside a single transaction so the
 *           three writes commit or roll back together.
 *
 *           Wraps client/lib/resonance/score.ts for the pure scoreFromAffect
 *           math so server and client produce IDENTICAL scores by construction
 *           (no parity drift possible — single shared function).
 *
 * Pending implementation:
 *   - [x] createReading: transaction-wrapped reading + signal + trajectory write
 *   - [x] getRecentReadings: paginated read for staff dashboard drill-down
 *   - [x] scoreFromAffect: re-export from client/lib/resonance/score (shared
 *         helper guarantees parity with client side)
 *   - [x] reading TTL aligned to RETENTION_DAYS['emotional'] (Tenet 2 fix)
 *   - [x] reading.channel → signal.source mapping (no more hardcoded source)
 *   - [DEFERRED to Phase 1.4 routes] zod input validation at the route boundary
 *   - [DEFERRED] in-process pub/sub emit for live consumers (websocket
 *     broadcasts) — Phase 1.4+ once routes wire WebSocket fan-out
 *
 * Aligned to: server/database/migrations/008_resonance_readings.sql
 *             shared/types/resonance/reading.ts (TICKET_002 IMPLEMENTED)
 *             server/services/signals/signal-recorder.ts (service #1; we
 *             reuse computeExpiresAt for the reading TTL)
 *             server/services/echo-ai3/resonance/trajectory-engine.ts (service #6)
 *             client/lib/resonance/score.ts (service #4 — score parity)
 *
 * Tenet enforcement:
 *   - Tenet 2 (score persists, audio evaporates): the reading row IS the score
 *     that persists. expiresAt is set via computeExpiresAt('emotional') →
 *     RETENTION_DAYS['emotional'] = 30 days, matching the corresponding
 *     emitted Signal. The 24h budget in Tenet 2 governs raw audio retention
 *     in the voice layer (Phase 3) — NOT the score row.
 *   - Tenet 3 (tone informs care, never commerce): this module exports affect
 *     data and resonance scores. The privacy enforcement test
 *     (tests/echo_resonance/privacy/forbidden-uses.test.ts) verifies no
 *     pricing/sales/marketing module can import from resonance-engine.
 *
 * WARNING: This is the canonical entry point for resonance writes. All
 * incoming readings (whisper widget, voice layer, integrations) MUST route
 * through resonance-engine.createReading so the reading + signal + trajectory
 * triple stays consistent. Bypassing risks orphaned readings, missing signals,
 * stale dashboards. Modifications require TICKET-level authorization.
 * ===========================================================================
 */

import type { PoolClient } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import type {
  ResonanceReading,
  NewResonanceReading,
  AffectCoordinate,
  ScoreConfig,
  ResonanceChannel,
} from '../../../../shared/types/resonance';
import type { UUID } from '../../../../shared/types/base';
import type { SignalTag, SignalSource } from '../../../../shared/types/signals';
import type { NewSignalInput } from '../../signals/signal-recorder';
import { computeExpiresAt, signalRecorder } from '../../signals/signal-recorder';
import { trajectoryEngine } from './trajectory-engine';
import {
  scoreFromAffect as clientScoreFromAffect,
} from '../../../../client/lib/resonance/score';
import { query, transaction } from '../../../database/connection';
import { logger } from '../../../lib/logger';

/**
 * Map a ResonanceChannel to the SignalSource that best describes the upstream.
 * The SignalSource union is fixed by TICKET_002; 'inferred' and 'self-reported'
 * channels do not have dedicated source values and currently fall back to
 * 'staff-whisper' as the closest bucket. When a future ticket extends
 * SignalSource (e.g., 'guest-self-report', 'echo-inference'), update this map.
 */
const CHANNEL_TO_SOURCE: Record<ResonanceChannel, SignalSource> = {
  observation: 'staff-whisper',
  voice: 'aurion-voice-prosody',
  inferred: 'staff-whisper',       // type-gap: no 'echo-inference' source yet
  'self-reported': 'staff-whisper', // type-gap: no 'guest-self-report' source yet
};

interface ReadingRow {
  id: string;
  guest_id: string;
  visit_id: string | null;
  timestamp: Date | string;
  captured_by: string;
  channel: string;
  arousal: number;
  valence: number;
  resonance: number;
  signals: unknown;
  confidence: number;
  note: string | null;
  expires_at: Date | string;
  created_at: Date | string;
  updated_at: Date | string;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`resonance-engine: unexpected date value type: ${typeof value}`);
}

function rowToReading(row: ReadingRow): ResonanceReading {
  return {
    id: row.id,
    guestId: row.guest_id,
    visitId: row.visit_id,
    timestamp: dateToIso(row.timestamp),
    capturedBy: row.captured_by as ResonanceReading['capturedBy'],
    channel: row.channel as ResonanceReading['channel'],
    arousal: row.arousal,
    valence: row.valence,
    resonance: row.resonance,
    signals: (row.signals as SignalTag[]) ?? [],
    confidence: row.confidence,
    note: row.note ?? undefined,
    expiresAt: dateToIso(row.expires_at),
    createdAt: dateToIso(row.created_at),
    updatedAt: dateToIso(row.updated_at),
  };
}

function buildSignalFromReading(reading: ResonanceReading): NewSignalInput {
  return {
    guestId: reading.guestId,
    visitId: reading.visitId,
    source: CHANNEL_TO_SOURCE[reading.channel],
    subject: { kind: 'free-text', text: `resonance reading id=${reading.id}` },
    tags: reading.signals,
    conversion: null,
    note: reading.note,
    sensitivity: 'emotional', // resonance is emotional state by definition
  };
}

export class ResonanceEngine {
  /**
   * Persist a new reading. Computes auto-fill fields (id, timestamp,
   * expiresAt, createdAt, updatedAt). Emits a Signal to the unified graph.
   * Updates the active trajectory for the visit (if any).
   *
   * Single transaction: all three writes commit or roll back together.
   * Tenet 2 enforcement point at the engine level.
   */
  async createReading(input: NewResonanceReading): Promise<ResonanceReading> {
    return transaction(async (client) => {
      const reading = await this.insertReading(input, client);

      await signalRecorder.recordSignal(buildSignalFromReading(reading), client);

      if (reading.visitId) {
        const trajectoryResult = await trajectoryEngine.updateTrajectory(
          reading.visitId,
          reading,
          client,
        );
        if (trajectoryResult === null) {
          logger.warn('[ResonanceEngine] reading recorded but no trajectory found', {
            readingId: reading.id,
            visitId: reading.visitId,
            note: 'visit-start should create trajectory via Phase 1.4 routes',
          });
        }
      }

      return reading;
    });
  }

  /**
   * Fetch recent readings for a guest, ordered most-recent-first.
   * Filters out expired rows (Tenet 2 defense in depth — same pattern as
   * signal-query). Default limit = 10 per the existing scaffold.
   */
  async getRecentReadings(guestId: UUID, limit = 10): Promise<ResonanceReading[]> {
    try {
      const result = await query<ReadingRow>(
        `SELECT * FROM resonance_readings
         WHERE guest_id = $1
           AND expires_at >= NOW()
         ORDER BY timestamp DESC
         LIMIT $2`,
        [guestId, limit],
      );
      return result.rows.map(rowToReading);
    } catch (err) {
      logger.error('[ResonanceEngine] getRecentReadings failed', {
        guestId,
        limit,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Pure helper: 1-10 score from affect coordinate. Re-exports the
   * client-side implementation for parity-by-construction. Both client
   * and server return IDENTICAL values for the same inputs.
   */
  scoreFromAffect(affect: AffectCoordinate, config?: ScoreConfig): number {
    return clientScoreFromAffect(affect, config);
  }

  // -------------------------------------------------------------------------
  // private
  // -------------------------------------------------------------------------

  private async insertReading(
    input: NewResonanceReading,
    client: PoolClient,
  ): Promise<ResonanceReading> {
    const id = uuidv4();
    const now = new Date();
    // Tenet 2: the reading row IS the persistent score. Use the same
    // sensitivity bucket as the emitted Signal so reading and signal expire
    // together; never give the score a 24h TTL — that's the audio budget.
    const expiresAt = computeExpiresAt('emotional', now);

    const result = await client.query<ReadingRow>(
      `INSERT INTO resonance_readings (
         id, guest_id, visit_id, timestamp, captured_by, channel,
         arousal, valence, resonance, signals, confidence, note,
         expires_at, created_at, updated_at
       ) VALUES (
         $1, $2, $3, $4, $5, $6,
         $7, $8, $9, $10::jsonb, $11, $12,
         $13, $14, $14
       )
       RETURNING *`,
      [
        id,
        input.guestId,
        input.visitId,
        now.toISOString(),
        input.capturedBy,
        input.channel,
        input.arousal,
        input.valence,
        input.resonance,
        JSON.stringify(input.signals),
        input.confidence,
        input.note ?? null,
        expiresAt.toISOString(),
        now.toISOString(),
      ],
    );

    if (result.rows.length === 0) {
      throw new Error('resonance-engine: INSERT ... RETURNING produced 0 rows');
    }
    return rowToReading(result.rows[0]);
  }
}

export const resonanceEngine = new ResonanceEngine();
