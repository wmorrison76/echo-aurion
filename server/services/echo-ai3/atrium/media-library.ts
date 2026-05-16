/**
 * ===========================================================================
 * Media library — mood-tagged asset store
 * ===========================================================================
 * Layer:    Atrium
 * Status:   IMPLEMENTED
 * Phase:    5
 *
 * Purpose:  Master doc §7.4: marketing's content library. Same assets
 *           serve Instagram and the Aurion app. Tagging is the new
 *           operational addition (mood / daypart / season).
 *
 *           Hero loops are silentByDefault=true unconditionally per
 *           master doc §7.2 ("auto-play with sound is a luxury app
 *           anti-pattern and the platform does not commit it").
 * ===========================================================================
 */

import type { MediaAsset, MoodTag, DaypartTag, SeasonTag } from '../../../../shared/types/atrium';
import type { UUID } from '../../../../shared/types/base';
import { query } from '../../../database/connection';
import { logger } from '../../../lib/logger';

export interface UploadAssetArgs {
  venueId?: UUID;
  kind: MediaAsset['kind'];
  storageUrl: string;
  durationSeconds?: number;
  moods: MoodTag[];
  dayparts: DaypartTag[];
  seasons: SeasonTag[];
  uploadedBy: UUID;
}

export interface AssetQuery {
  venueId?: UUID;
  kind?: MediaAsset['kind'];
  moods?: MoodTag[];
  dayparts?: DaypartTag[];
  seasons?: SeasonTag[];
  publishedToApp?: boolean;
}

interface AssetRow {
  id: string;
  venue_id: string | null;
  kind: string;
  storage_url: string;
  duration_seconds: number | null;
  silent_by_default: boolean;
  moods: string[];
  dayparts: string[];
  seasons: string[];
  uploaded_at: Date | string;
  uploaded_by: string;
  published_to_instagram: boolean;
  published_to_app: boolean;
  retired_at: Date | string | null;
}

function dateToIso(value: unknown): string {
  if (value instanceof Date) return value.toISOString();
  if (typeof value === 'string') return value;
  throw new Error(`media-library: unexpected date value: ${typeof value}`);
}

function rowToAsset(row: AssetRow): MediaAsset {
  return {
    id: row.id,
    venueId: row.venue_id ?? undefined,
    kind: row.kind as MediaAsset['kind'],
    storageUrl: row.storage_url,
    durationSeconds: row.duration_seconds ?? undefined,
    silentByDefault: row.silent_by_default,
    moods: row.moods as MoodTag[],
    dayparts: row.dayparts as DaypartTag[],
    seasons: row.seasons as SeasonTag[],
    uploadedAt: dateToIso(row.uploaded_at),
    uploadedBy: row.uploaded_by,
    publishedToInstagram: row.published_to_instagram,
    publishedToApp: row.published_to_app,
  };
}

export class MediaLibrary {
  /** Upload + tag a new asset. Hero loops always silentByDefault=true. */
  async upload(args: UploadAssetArgs): Promise<MediaAsset> {
    const silentByDefault = args.kind === 'hero-loop' ? true : true; // master doc default
    try {
      const result = await query<AssetRow>(
        `INSERT INTO media_assets
           (id, venue_id, kind, storage_url, duration_seconds, silent_by_default,
            moods, dayparts, seasons, uploaded_by)
         VALUES (gen_random_uuid(), $1, $2, $3, $4, $5,
                 $6::text[], $7::text[], $8::text[], $9)
         RETURNING *`,
        [
          args.venueId ?? null,
          args.kind,
          args.storageUrl,
          args.durationSeconds ?? null,
          silentByDefault,
          args.moods,
          args.dayparts,
          args.seasons,
          args.uploadedBy,
        ],
      );
      return rowToAsset(result.rows[0]);
    } catch (err) {
      logger.error('[MediaLibrary] upload failed', {
        venueId: args.venueId,
        kind: args.kind,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async query(filter: AssetQuery): Promise<MediaAsset[]> {
    try {
      const conds: string[] = ['retired_at IS NULL'];
      const params: unknown[] = [];
      if (filter.venueId) {
        conds.push(`venue_id = $${params.length + 1}`);
        params.push(filter.venueId);
      }
      if (filter.kind) {
        conds.push(`kind = $${params.length + 1}`);
        params.push(filter.kind);
      }
      if (filter.moods && filter.moods.length > 0) {
        conds.push(`moods && $${params.length + 1}::text[]`);
        params.push(filter.moods);
      }
      if (filter.dayparts && filter.dayparts.length > 0) {
        conds.push(`dayparts && $${params.length + 1}::text[]`);
        params.push(filter.dayparts);
      }
      if (filter.seasons && filter.seasons.length > 0) {
        conds.push(`seasons && $${params.length + 1}::text[]`);
        params.push(filter.seasons);
      }
      if (filter.publishedToApp !== undefined) {
        conds.push(`published_to_app = $${params.length + 1}`);
        params.push(filter.publishedToApp);
      }
      const sql = `SELECT * FROM media_assets WHERE ${conds.join(' AND ')} ORDER BY uploaded_at DESC`;
      const result = await query<AssetRow>(sql, params);
      return result.rows.map(rowToAsset);
    } catch (err) {
      logger.error('[MediaLibrary] query failed', {
        filter,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async retire(assetId: UUID): Promise<void> {
    try {
      const result = await query(
        `UPDATE media_assets SET retired_at = NOW() WHERE id = $1 AND retired_at IS NULL`,
        [assetId],
      );
      if (result.rowCount === 0) {
        throw new Error(`media-library: asset ${assetId} not found or already retired`);
      }
    } catch (err) {
      logger.error('[MediaLibrary] retire failed', {
        assetId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  async retag(
    assetId: UUID,
    tags: { moods?: MoodTag[]; dayparts?: DaypartTag[]; seasons?: SeasonTag[] },
  ): Promise<MediaAsset> {
    const sets: string[] = [];
    const params: unknown[] = [assetId];
    if (tags.moods) {
      sets.push(`moods = $${params.length + 1}::text[]`);
      params.push(tags.moods);
    }
    if (tags.dayparts) {
      sets.push(`dayparts = $${params.length + 1}::text[]`);
      params.push(tags.dayparts);
    }
    if (tags.seasons) {
      sets.push(`seasons = $${params.length + 1}::text[]`);
      params.push(tags.seasons);
    }
    if (sets.length === 0) {
      const existing = await query<AssetRow>('SELECT * FROM media_assets WHERE id = $1', [assetId]);
      if (existing.rows.length === 0) {
        throw new Error(`media-library: asset ${assetId} not found`);
      }
      return rowToAsset(existing.rows[0]);
    }
    try {
      const result = await query<AssetRow>(
        `UPDATE media_assets SET ${sets.join(', ')} WHERE id = $1 AND retired_at IS NULL RETURNING *`,
        params,
      );
      if (result.rows.length === 0) {
        throw new Error(`media-library: asset ${assetId} not found or retired`);
      }
      return rowToAsset(result.rows[0]);
    } catch (err) {
      logger.error('[MediaLibrary] retag failed', {
        assetId,
        error: err instanceof Error ? err.message : String(err),
      });
      throw err;
    }
  }

  /** Internal helper: set publish flags. Used by marketing-pipeline. */
  async setPublishFlags(
    assetId: UUID,
    flags: { publishedToInstagram?: boolean; publishedToApp?: boolean },
  ): Promise<MediaAsset> {
    const sets: string[] = [];
    const params: unknown[] = [assetId];
    if (flags.publishedToInstagram !== undefined) {
      sets.push(`published_to_instagram = $${params.length + 1}`);
      params.push(flags.publishedToInstagram);
    }
    if (flags.publishedToApp !== undefined) {
      sets.push(`published_to_app = $${params.length + 1}`);
      params.push(flags.publishedToApp);
    }
    if (sets.length === 0) throw new Error('media-library: setPublishFlags called with no flags');
    const result = await query<AssetRow>(
      `UPDATE media_assets SET ${sets.join(', ')} WHERE id = $1 AND retired_at IS NULL RETURNING *`,
      params,
    );
    if (result.rows.length === 0) {
      throw new Error(`media-library: asset ${assetId} not found or retired`);
    }
    return rowToAsset(result.rows[0]);
  }
}

export const mediaLibrary = new MediaLibrary();
