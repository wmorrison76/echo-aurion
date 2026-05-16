/**
 * Menu Draft Repository
 *
 * Access patterns for the `menu_drafts` collection — Echo-composed
 * proposals and template-generated starters awaiting human review.
 *
 * Drafts are non-binding, expire after a TTL, and never directly
 * affect live menus.
 */

import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../mongoClient';
import { COLLECTIONS } from '../../BanquetMenuBuilder.constants';
import type {
  MenuDraft,
  DraftId,
  PropertyId,
  MenuId,
  UserId,
} from '../../BanquetMenuBuilder.types';

const DEFAULT_DRAFT_TTL_DAYS = 30;

export class MenuDraftRepository {
  private async coll(): Promise<Collection<MenuDraft>> {
    const db = await getDb();
    return db.collection<MenuDraft>(COLLECTIONS.MENU_DRAFTS);
  }

  // ===================================================
  // READ PATTERNS
  // ===================================================

  async findById(propertyId: PropertyId, draftId: DraftId): Promise<MenuDraft | null> {
    const c = await this.coll();
    return c.findOne({ propertyId, draftId });
  }

  async findPendingForUser(propertyId: PropertyId, userId: UserId): Promise<MenuDraft[]> {
    const c = await this.coll();
    return c
      .find({
        propertyId,
        'sourceContext.userId': userId,
        status: 'pending-review',
      })
      .sort({ createdAt: -1 })
      .toArray();
  }

  async listPendingByProperty(propertyId: PropertyId, limit = 50): Promise<MenuDraft[]> {
    const c = await this.coll();
    return c
      .find({ propertyId, status: 'pending-review' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async findEchoComposedRecent(
    propertyId: PropertyId,
    limit = 20
  ): Promise<MenuDraft[]> {
    const c = await this.coll();
    return c
      .find({ propertyId, source: 'echo' })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Acceptance rate metric — useful for tuning Echo over time.
   */
  async getEchoAcceptanceRate(
    propertyId: PropertyId,
    days = 30
  ): Promise<{ accepted: number; rejected: number; pending: number; rate: number }> {
    const c = await this.coll();
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const pipeline = [
      {
        $match: {
          propertyId,
          source: 'echo',
          createdAt: { $gte: since },
        },
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
        },
      },
    ];

    const results = await c.aggregate(pipeline).toArray();
    const counts = { accepted: 0, rejected: 0, 'pending-review': 0, expired: 0 };
    results.forEach((r: { _id: keyof typeof counts; count: number }) => {
      counts[r._id] = r.count;
    });

    const decided = counts.accepted + counts.rejected;
    return {
      accepted: counts.accepted,
      rejected: counts.rejected,
      pending: counts['pending-review'],
      rate: decided > 0 ? counts.accepted / decided : 0,
    };
  }

  // ===================================================
  // WRITE PATTERNS
  // ===================================================

  async create(
    draft: Omit<MenuDraft, '_id' | 'createdAt' | 'expiresAt' | 'status'>
  ): Promise<MenuDraft> {
    const c = await this.coll();
    const now = new Date();
    const doc: MenuDraft = {
      ...draft,
      _id: new ObjectId(),
      status: 'pending-review',
      createdAt: now,
      expiresAt: new Date(now.getTime() + DEFAULT_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000),
    };
    await c.insertOne(doc);
    return doc;
  }

  async accept(
    propertyId: PropertyId,
    draftId: DraftId,
    reviewedBy: UserId,
    promotedToMenuId: MenuId
  ): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { propertyId, draftId },
      {
        $set: {
          status: 'accepted',
          reviewedBy,
          reviewedAt: new Date(),
          promotedToMenuId,
        },
      }
    );
  }

  async reject(
    propertyId: PropertyId,
    draftId: DraftId,
    reviewedBy: UserId
  ): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { propertyId, draftId },
      {
        $set: {
          status: 'rejected',
          reviewedBy,
          reviewedAt: new Date(),
        },
      }
    );
  }

  /**
   * Upsert by (propertyId, draftId) — used by the autosave loop on the
   * composition canvas. Sets `updatedAt`; preserves `createdAt`/`expiresAt`
   * on update; creates with sensible defaults on first save.
   *
   * `payload` should carry at minimum: propertyId, draftId, and the
   * composition state. Any additional MenuDraft fields are passed through.
   */
  async upsert(
    propertyId: PropertyId,
    draftId: DraftId,
    payload: Partial<MenuDraft>,
  ): Promise<MenuDraft> {
    const c = await this.coll();
    const now = new Date();
    const existing = await c.findOne({ propertyId, draftId });

    if (existing) {
      const updated = {
        ...existing,
        ...payload,
        propertyId,
        draftId,
        updatedAt: now,
      };
      await c.replaceOne({ propertyId, draftId }, updated as MenuDraft);
      return updated as MenuDraft;
    }

    const created: MenuDraft = {
      _id: new ObjectId(),
      propertyId,
      draftId,
      status: 'pending-review',
      createdAt: now,
      expiresAt: new Date(now.getTime() + DEFAULT_DRAFT_TTL_DAYS * 24 * 60 * 60 * 1000),
      ...payload,
    } as MenuDraft;
    await c.insertOne(created);
    return created;
  }

  /**
   * Soft-delete by setting status='expired'. The TTL job sweeps later.
   */
  async softDelete(propertyId: PropertyId, draftId: DraftId): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { propertyId, draftId },
      { $set: { status: 'expired', expiresAt: new Date() } },
    );
  }

  /**
   * Convenience for the API routes — list drafts for a property regardless
   * of status (pending + accepted + rejected + expired).
   */
  async listForProperty(propertyId: PropertyId, limit = 50): Promise<MenuDraft[]> {
    const c = await this.coll();
    return c
      .find({ propertyId })
      .sort({ updatedAt: -1, createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  /**
   * Cleanup — mark expired drafts as 'expired'.
   * Called by a scheduled job. TTL index also auto-removes after a longer window.
   */
  async expireOldDrafts(): Promise<number> {
    const c = await this.coll();
    const result = await c.updateMany(
      {
        status: 'pending-review',
        expiresAt: { $lt: new Date() },
      },
      { $set: { status: 'expired' } }
    );
    return result.modifiedCount;
  }
}

export const menuDraftRepository = new MenuDraftRepository();
