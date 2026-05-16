/**
 * ===========================================================================
 * Unconverted-ask tracker — the highest-value Voyage signal
 * ===========================================================================
 * Layer:    Voyage
 * Status:   IMPLEMENTED
 * Phase:    2
 *
 * Purpose:  Per master doc §6.2: "What the guest looked at without acting
 *           on. The spa menu opened three times Friday but never booked.
 *           The richest signal in the system — the almost-yes."
 *
 *           Per master doc §11 metrics: "Unconverted-ask catalog: what
 *           guests considered but did not book. The richest product-
 *           development signal the platform produces."
 *
 *           Mines the signals graph for consider-but-don't-convert
 *           patterns. Output drives:
 *             - Tonight nudges ("you saved the patio table earlier;
 *               the 7:30 slot is still open if you want it")
 *             - Next-visit personalization
 *             - Property product signals (high-consider-low-conversion
 *               venues = booking friction to investigate)
 *
 * Aligned to: server/database/migrations/012_signals.sql
 *             shared/types/signals/signal.ts
 *
 * Tenet alignment:
 *   - Tenet 3: per-property report contains subject IDs and counts only;
 *     no guest identity in the property-level surface.
 *   - Tenet 5: per-guest report is staff-facing only. The guest does NOT
 *     see "we're tracking what you looked at" — that corrodes the moment
 *     per Silent Service §5.2.2.
 * ===========================================================================
 */

import type { GuestId, PropertyId } from '../../../../shared/types/base';
import { query } from '../../../database/connection';
import { logger } from '../../../lib/logger';

export interface UnconvertedAsk {
  subjectId: string;
  subjectKind: string;
  consideredCount: number;
  lastConsideredAt: string;
  conversionRateForCategory: number;
}

interface SignalRow {
  source: string;
  subject: {
    kind?: string;
    venueId?: string;
    amenityId?: string;
    menuItemId?: string;
    occasionType?: string;
    staffId?: string;
    text?: string;
  } | null;
  guest_id: string;
  visit_id: string | null;
  timestamp: Date | string;
  conversion: string | null;
}

const CONSIDERATION_SOURCES = new Set([
  'voyage-add-to-itinerary',
  'voyage-dwell',
  'voyage-tap',
]);

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  return new Date().toISOString();
}

function extractSubjectKey(
  subject: SignalRow['subject'],
): { id: string; kind: string } | null {
  if (!subject) return null;
  switch (subject.kind) {
    case 'venue':
      return subject.venueId ? { id: subject.venueId, kind: 'venue' } : null;
    case 'amenity':
      return subject.amenityId ? { id: subject.amenityId, kind: 'amenity' } : null;
    case 'menu-item':
      return subject.menuItemId ? { id: subject.menuItemId, kind: 'menu-item' } : null;
    case 'occasion':
      return subject.occasionType ? { id: subject.occasionType, kind: 'occasion' } : null;
    case 'staff-member':
      return subject.staffId ? { id: subject.staffId, kind: 'staff-member' } : null;
    default:
      return null;
  }
}

/**
 * Pure helper: aggregate signals into UnconvertedAsk records. Exported for testing.
 * Counts per (subject, kind) where source is a consideration source AND
 * conversion is not 'converted'.
 */
export function aggregateUnconvertedAsks(
  signals: SignalRow[],
): Omit<UnconvertedAsk, 'conversionRateForCategory'>[] {
  const buckets = new Map<
    string,
    { subjectId: string; subjectKind: string; count: number; latest: string }
  >();
  for (const signal of signals) {
    if (!CONSIDERATION_SOURCES.has(signal.source)) continue;
    if (signal.conversion === 'converted') continue;
    const subject = extractSubjectKey(signal.subject);
    if (!subject) continue;
    const key = `${subject.kind}:${subject.id}`;
    const ts = dateToIso(signal.timestamp);
    const bucket = buckets.get(key) ?? {
      subjectId: subject.id,
      subjectKind: subject.kind,
      count: 0,
      latest: ts,
    };
    bucket.count += 1;
    if (ts > bucket.latest) bucket.latest = ts;
    buckets.set(key, bucket);
  }
  return Array.from(buckets.values())
    .map((b) => ({
      subjectId: b.subjectId,
      subjectKind: b.subjectKind,
      consideredCount: b.count,
      lastConsideredAt: b.latest,
    }))
    .sort((a, b) => b.consideredCount - a.consideredCount);
}

export class UnconvertedAskTracker {
  /**
   * What the guest considered but did not book. Per-guest
   * conversionRateForCategory is computed from THIS guest's history.
   */
  async forGuest(guestId: GuestId): Promise<UnconvertedAsk[]> {
    try {
      const result = await query<SignalRow>(
        `SELECT source, subject, guest_id, visit_id, timestamp, conversion
         FROM signals
         WHERE guest_id = $1
           AND expires_at >= NOW()
           AND source IN ('voyage-add-to-itinerary','voyage-dwell','voyage-tap','voyage-dismiss')
         ORDER BY timestamp DESC`,
        [guestId],
      );
      const aggregated = aggregateUnconvertedAsks(result.rows);

      const kindTotals = new Map<string, { total: number; converted: number }>();
      for (const signal of result.rows) {
        const subject = extractSubjectKey(signal.subject);
        if (!subject) continue;
        const t = kindTotals.get(subject.kind) ?? { total: 0, converted: 0 };
        t.total += 1;
        if (signal.conversion === 'converted') t.converted += 1;
        kindTotals.set(subject.kind, t);
      }

      return aggregated.map((a) => {
        const t = kindTotals.get(a.subjectKind);
        const rate = t && t.total > 0 ? t.converted / t.total : 0;
        return { ...a, conversionRateForCategory: rate };
      });
    } catch (err) {
      logger.error('[UnconvertedAskTracker] forGuest failed', {
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Per-property report: which subjects get considered often but
   * convert rarely. The product-side intelligence the master doc §11
   * names "the richest product-development signal."
   *
   * Joins via resonance_trajectories.property_id since signals don't
   * carry property_id directly today (Phase 1.5 boundary).
   *
   * @param days lookback window in days (default 21)
   */
  async forProperty(propertyId: PropertyId, days = 21): Promise<UnconvertedAsk[]> {
    try {
      const result = await query<SignalRow>(
        `SELECT s.source, s.subject, s.guest_id, s.visit_id, s.timestamp, s.conversion
         FROM signals s
         JOIN resonance_trajectories t ON t.visit_id = s.visit_id
         WHERE t.property_id = $1
           AND s.expires_at >= NOW()
           AND s.timestamp >= NOW() - $2::interval
           AND s.source IN ('voyage-add-to-itinerary','voyage-dwell','voyage-tap','voyage-dismiss')
         ORDER BY s.timestamp DESC`,
        [propertyId, `${days} days`],
      );

      const aggregated = aggregateUnconvertedAsks(result.rows);
      const kindTotals = new Map<string, { total: number; converted: number }>();
      for (const signal of result.rows) {
        const subject = extractSubjectKey(signal.subject);
        if (!subject) continue;
        const t = kindTotals.get(subject.kind) ?? { total: 0, converted: 0 };
        t.total += 1;
        if (signal.conversion === 'converted') t.converted += 1;
        kindTotals.set(subject.kind, t);
      }

      return aggregated.map((a) => {
        const t = kindTotals.get(a.subjectKind);
        const rate = t && t.total > 0 ? t.converted / t.total : 0;
        return { ...a, conversionRateForCategory: rate };
      });
    } catch (err) {
      logger.error('[UnconvertedAskTracker] forProperty failed', {
        propertyId,
        days,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const unconvertedAskTracker = new UnconvertedAskTracker();
