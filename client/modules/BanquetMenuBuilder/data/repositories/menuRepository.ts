/**
 * Menu Repository
 *
 * Access patterns for the `menus` collection — the composed,
 * approved menus tied to BEOs.
 */

import { Collection, ObjectId } from 'mongodb';
import { getDb } from '../mongoClient';
import { COLLECTIONS } from '../../BanquetMenuBuilder.constants';
import type {
  Menu,
  MenuId,
  PropertyId,
  WorkflowStage,
  ApprovalRecord,
} from '../../BanquetMenuBuilder.types';

export class MenuRepository {
  private async coll(): Promise<Collection<Menu>> {
    const db = await getDb();
    return db.collection<Menu>(COLLECTIONS.MENUS);
  }

  // ===================================================
  // READ PATTERNS
  // ===================================================

  async findById(propertyId: PropertyId, menuId: MenuId): Promise<Menu | null> {
    const c = await this.coll();
    return c.findOne({ propertyId, menuId });
  }

  async findByBEO(beoId: string): Promise<Menu | null> {
    const c = await this.coll();
    return c.findOne({ 'attachedTo.beoId': beoId });
  }

  async findByEvent(eventId: string): Promise<Menu[]> {
    const c = await this.coll();
    return c.find({ 'attachedTo.eventId': eventId }).toArray();
  }

  async findByStage(
    propertyId: PropertyId,
    stage: WorkflowStage,
    limit = 50
  ): Promise<Menu[]> {
    const c = await this.coll();
    return c
      .find({ propertyId, workflowStage: stage })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async findByClient(clientId: string, limit = 20): Promise<Menu[]> {
    const c = await this.coll();
    return c
      .find({ 'attachedTo.clientId': clientId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .toArray();
  }

  async listRecent(propertyId: PropertyId, limit = 20): Promise<Menu[]> {
    const c = await this.coll();
    return c
      .find({ propertyId })
      .sort({ updatedAt: -1 })
      .limit(limit)
      .toArray();
  }

  async countByStage(propertyId: PropertyId): Promise<Record<WorkflowStage, number>> {
    const c = await this.coll();
    const pipeline = [
      { $match: { propertyId } },
      { $group: { _id: '$workflowStage', count: { $sum: 1 } } },
    ];
    const results = await c.aggregate(pipeline).toArray();
    const counts = {} as Record<WorkflowStage, number>;
    results.forEach((r: { _id: WorkflowStage; count: number }) => {
      counts[r._id] = r.count;
    });
    return counts;
  }

  // ===================================================
  // WRITE PATTERNS
  // ===================================================

  async create(menu: Omit<Menu, '_id' | 'createdAt' | 'updatedAt'>): Promise<Menu> {
    const c = await this.coll();
    const now = new Date();
    const doc: Menu = {
      ...menu,
      _id: new ObjectId(),
      createdAt: now,
      updatedAt: now,
    };
    await c.insertOne(doc);
    return doc;
  }

  async update(
    propertyId: PropertyId,
    menuId: MenuId,
    updates: Partial<Omit<Menu, '_id' | 'menuId' | 'propertyId' | 'createdAt'>>
  ): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { propertyId, menuId },
      { $set: { ...updates, updatedAt: new Date() } }
    );
  }

  async transitionStage(
    propertyId: PropertyId,
    menuId: MenuId,
    newStage: WorkflowStage,
    approval?: ApprovalRecord
  ): Promise<void> {
    const c = await this.coll();
    const update: Record<string, unknown> = {
      $set: {
        workflowStage: newStage,
        updatedAt: new Date(),
      },
    };
    if (approval) {
      update.$push = { approvals: approval };
    }
    await c.updateOne({ propertyId, menuId }, update);
  }

  async attachToBEO(
    propertyId: PropertyId,
    menuId: MenuId,
    beoId: string,
    eventId?: string,
    clientId?: string
  ): Promise<void> {
    const c = await this.coll();
    const attachedTo: Record<string, string> = { beoId };
    if (eventId) attachedTo.eventId = eventId;
    if (clientId) attachedTo.clientId = clientId;

    await c.updateOne(
      { propertyId, menuId },
      { $set: { attachedTo, updatedAt: new Date() } }
    );
  }

  async addPublishedSurface(
    propertyId: PropertyId,
    menuId: MenuId,
    surface: keyof NonNullable<Menu['publishedSurfaces']>,
    data: unknown
  ): Promise<void> {
    const c = await this.coll();
    await c.updateOne(
      { propertyId, menuId },
      {
        $set: {
          [`publishedSurfaces.${surface}`]: data,
          updatedAt: new Date(),
        },
      }
    );
  }

  async archive(propertyId: PropertyId, menuId: MenuId): Promise<void> {
    await this.transitionStage(propertyId, menuId, 'archived');
  }
}

export const menuRepository = new MenuRepository();
