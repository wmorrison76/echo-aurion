/**
 * ===========================================================================
 * Cross-property consent manager
 * ===========================================================================
 * Layer:    Substrate: Network
 * Status:   IMPLEMENTED
 * Phase:    6
 *
 * Purpose:  Master doc §11.2 + Tenet 5: explicit guest consent for
 *           cross-property memory. Default scope is `this-property-only`
 *           — broader scope requires an explicit grant. Revocation is
 *           immediate; no delay, no scheduled job, just an UPDATE.
 *
 *           Aligned to migration 024_cross_property_consent.sql.
 *
 *           Tenet enforcement:
 *             - Tenet 5: getConsent never returns a wider scope than the
 *               guest explicitly granted. Absent rows resolve to the
 *               narrowest default.
 *             - Tenet 8: revocation cascades immediately. The aggregator +
 *               corpus-builder query consent at read-time so revocation is
 *               observed within the next read window.
 *
 *           Audit trail: grant + revoke events are logged at INFO with
 *           guest id and scope so the trace ledger can ingest them in
 *           Phase 6.x.
 * ===========================================================================
 */

import type { CrossPropertyConsent, CrossPropertyScope } from '../../../../../shared/types/network';
import type { GuestId } from '../../../../../shared/types/base';
import { query } from '../../../../database/connection';
import { logger } from '../../../../lib/logger';

const DEFAULT_SCOPE: CrossPropertyScope = 'this-property-only';

interface ConsentRow {
  guest_id: string;
  scope: string;
  granted_at: Date | string;
  revoked_at: Date | string | null;
  permitted_property_ids: string[] | null;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`consent-manager: unexpected date value: ${typeof value}`);
}

function rowToConsent(row: ConsentRow): CrossPropertyConsent {
  return {
    guestId: row.guest_id as GuestId,
    scope: row.scope as CrossPropertyScope,
    grantedAt: dateToIso(row.granted_at),
    revokedAt: row.revoked_at ? dateToIso(row.revoked_at) : undefined,
    permittedPropertyIds: row.permitted_property_ids ?? undefined,
  };
}

/** Pure helper: derive the effective scope for a read at a given property. */
export function effectiveScopeAt(
  consent: CrossPropertyConsent | null,
  propertyId: string,
): CrossPropertyScope {
  if (!consent || consent.revokedAt) return DEFAULT_SCOPE;
  if (consent.scope === 'this-property-only') return 'this-property-only';
  if (consent.permittedPropertyIds && consent.permittedPropertyIds.length > 0) {
    return consent.permittedPropertyIds.includes(propertyId)
      ? consent.scope
      : 'this-property-only';
  }
  return consent.scope;
}

export class CrossPropertyConsentManager {
  async getConsent(guestId: GuestId): Promise<CrossPropertyConsent> {
    try {
      const result = await query<ConsentRow>(
        `SELECT guest_id, scope, granted_at, revoked_at, permitted_property_ids
         FROM cross_property_consent
         WHERE guest_id = $1`,
        [guestId],
      );
      if (result.rows.length === 0) {
        return {
          guestId,
          scope: DEFAULT_SCOPE,
          grantedAt: new Date(0).toISOString(),
        };
      }
      return rowToConsent(result.rows[0]);
    } catch (err) {
      logger.error('[ConsentManager] getConsent failed', {
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async grant(
    guestId: GuestId,
    scope: CrossPropertyScope,
    permittedPropertyIds?: string[],
  ): Promise<CrossPropertyConsent> {
    try {
      const result = await query<ConsentRow>(
        `INSERT INTO cross_property_consent
           (guest_id, scope, granted_at, revoked_at, permitted_property_ids)
         VALUES ($1, $2, NOW(), NULL, $3)
         ON CONFLICT (guest_id) DO UPDATE
           SET scope = EXCLUDED.scope,
               granted_at = NOW(),
               revoked_at = NULL,
               permitted_property_ids = EXCLUDED.permitted_property_ids
         RETURNING guest_id, scope, granted_at, revoked_at, permitted_property_ids`,
        [guestId, scope, permittedPropertyIds ?? null],
      );
      logger.info('[ConsentManager] consent granted', { guestId, scope });
      return rowToConsent(result.rows[0]);
    } catch (err) {
      logger.error('[ConsentManager] grant failed', {
        guestId,
        scope,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /**
   * Revoke immediately. Sets revoked_at; consumers querying through
   * effectiveScopeAt collapse to default. We do not delete the row —
   * Tenet 6 requires an audit trail of the original grant.
   */
  async revoke(guestId: GuestId): Promise<void> {
    try {
      await query(
        `UPDATE cross_property_consent
         SET revoked_at = NOW()
         WHERE guest_id = $1 AND revoked_at IS NULL`,
        [guestId],
      );
      logger.info('[ConsentManager] consent revoked', { guestId });
    } catch (err) {
      logger.error('[ConsentManager] revoke failed', {
        guestId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }
}

export const crossPropertyConsentManager = new CrossPropertyConsentManager();
