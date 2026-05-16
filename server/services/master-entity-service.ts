/**
 * Master Entity Service
 * =====================
 * Provides a single source of truth for canonical entities across all modules.
 * 
 * Features:
 * - Entity resolution service (getEntityById, resolveEntityReference)
 * - Cross-module entity reference validation
 * - Entity type normalization
 * - ID translation between different formats
 * 
 * Phase 1 Critical Fix: MF-002 Canonical Data Model Missing
 */

import * as crypto from 'crypto';
import { logger } from '../lib/logger';

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

export type EntityType = 
  | 'product'
  | 'ingredient'
  | 'sku'
  | 'recipe'
  | 'menu_item'
  | 'supplier'
  | 'vendor'
  | 'employee'
  | 'customer'
  | 'guest'
  | 'event'
  | 'beo'
  | 'outlet'
  | 'location'
  | 'department'
  | 'account'
  | 'invoice'
  | 'purchase_order';

export interface MasterEntity {
  id: string;
  canonicalId: string;
  entityType: EntityType;
  orgId: string;
  outletId?: string;
  name: string;
  description?: string;
  data: Record<string, any>;
  aliases: EntityAlias[];
  status: 'active' | 'inactive' | 'archived';
  createdAt: Date;
  updatedAt: Date;
  version: number;
  metadata: EntityMetadata;
}

export interface EntityAlias {
  aliasType: 'sku' | 'barcode' | 'gtin' | 'upc' | 'vendor_code' | 'legacy_id' | 'external_id';
  aliasValue: string;
  source: string;
  isPrimary: boolean;
  validFrom?: Date;
  validTo?: Date;
}

export interface EntityMetadata {
  sourceModule: string;
  sourceId: string;
  lastSyncAt?: Date;
  syncStatus: 'synced' | 'pending' | 'conflict' | 'error';
  conflictDetails?: string;
  hash: string;
}

export interface EntityReference {
  entityType: EntityType;
  referenceType: 'id' | 'canonical_id' | 'alias';
  referenceValue: string;
}

export interface ResolvedEntity {
  found: boolean;
  entity?: MasterEntity;
  confidence: number;
  matchType: 'exact' | 'alias' | 'fuzzy' | 'none';
  alternatives?: MasterEntity[];
}

// ============================================================================
// ENTITY TYPE MAPPINGS
// ============================================================================

/**
 * Maps module-specific entity types to canonical types
 */
export const ENTITY_TYPE_MAPPINGS: Record<string, EntityType> = {
  // PurchasingReceiving
  'product': 'product',
  'purchasing_item': 'product',
  'catalog_item': 'product',
  
  // Culinary
  'ingredient': 'ingredient',
  'recipe_ingredient': 'ingredient',
  'culinary_ingredient': 'ingredient',
  
  // Inventory
  'inventory_item': 'product',
  'stock_item': 'product',
  'sku': 'sku',
  
  // Suppliers/Vendors
  'supplier': 'supplier',
  'vendor': 'vendor',
  'supplier_vendor': 'supplier',
  
  // Events
  'event': 'event',
  'calendar_event': 'event',
  'maestro_event': 'event',
  'beo': 'beo',
  'banquet_event': 'beo',
  
  // People
  'employee': 'employee',
  'staff': 'employee',
  'team_member': 'employee',
  'customer': 'customer',
  'client': 'customer',
  'guest': 'guest',
  
  // Locations
  'outlet': 'outlet',
  'location': 'location',
  'property': 'outlet',
  'department': 'department',
};

// ============================================================================
// MASTER ENTITY SERVICE
// ============================================================================

export class MasterEntityService {
  // In-memory store (replace with database in production)
  private entities: Map<string, MasterEntity> = new Map();
  private aliasIndex: Map<string, string> = new Map(); // alias -> entity id
  private canonicalIndex: Map<string, string> = new Map(); // canonical_id -> entity id

  constructor() {
    logger.info('[MasterEntityService] Initialized');
  }

  // ============================================================================
  // ENTITY CREATION & UPDATES
  // ============================================================================

  /**
   * Create or update a master entity
   */
  async upsertEntity(input: {
    entityType: EntityType | string;
    orgId: string;
    outletId?: string;
    name: string;
    description?: string;
    data: Record<string, any>;
    aliases?: Omit<EntityAlias, 'isPrimary'>[];
    sourceModule: string;
    sourceId: string;
  }): Promise<MasterEntity> {
    // Normalize entity type
    const entityType = this.normalizeEntityType(input.entityType);
    
    // Check if entity exists by source
    const existingBySource = this.findBySource(input.sourceModule, input.sourceId, input.orgId);
    if (existingBySource) {
      return this.updateEntity(existingBySource.id, {
        name: input.name,
        description: input.description,
        data: input.data,
        aliases: input.aliases,
      });
    }

    // Check if entity exists by aliases
    if (input.aliases?.length) {
      for (const alias of input.aliases) {
        const aliasKey = this.buildAliasKey(alias.aliasType, alias.aliasValue, input.orgId);
        const existingId = this.aliasIndex.get(aliasKey);
        if (existingId) {
          const existing = this.entities.get(existingId);
          if (existing && existing.entityType === entityType) {
            return this.updateEntity(existingId, {
              name: input.name,
              description: input.description,
              data: { ...existing.data, ...input.data },
              aliases: [...(input.aliases || [])],
            });
          }
        }
      }
    }

    // Create new entity
    const id = crypto.randomUUID();
    const canonicalId = this.generateCanonicalId(entityType, input.orgId, input.name);
    const now = new Date();

    const entity: MasterEntity = {
      id,
      canonicalId,
      entityType,
      orgId: input.orgId,
      outletId: input.outletId,
      name: input.name,
      description: input.description,
      data: input.data,
      aliases: (input.aliases || []).map((a, i) => ({
        ...a,
        isPrimary: i === 0,
      })),
      status: 'active',
      createdAt: now,
      updatedAt: now,
      version: 1,
      metadata: {
        sourceModule: input.sourceModule,
        sourceId: input.sourceId,
        lastSyncAt: now,
        syncStatus: 'synced',
        hash: this.hashEntity(input.data),
      },
    };

    // Store entity
    this.entities.set(id, entity);
    this.canonicalIndex.set(canonicalId, id);

    // Index aliases
    for (const alias of entity.aliases) {
      const aliasKey = this.buildAliasKey(alias.aliasType, alias.aliasValue, input.orgId);
      this.aliasIndex.set(aliasKey, id);
    }

    logger.debug(`[MasterEntityService] Created entity: ${entityType}/${canonicalId}`);

    return entity;
  }

  /**
   * Update an existing entity
   */
  async updateEntity(
    id: string,
    updates: Partial<Pick<MasterEntity, 'name' | 'description' | 'data' | 'status'>> & {
      aliases?: Omit<EntityAlias, 'isPrimary'>[];
    }
  ): Promise<MasterEntity> {
    const entity = this.entities.get(id);
    if (!entity) {
      throw new Error(`Entity not found: ${id}`);
    }

    const now = new Date();
    const newHash = updates.data ? this.hashEntity(updates.data) : entity.metadata.hash;

    // Handle alias updates
    if (updates.aliases) {
      // Remove old aliases from index
      for (const alias of entity.aliases) {
        const aliasKey = this.buildAliasKey(alias.aliasType, alias.aliasValue, entity.orgId);
        this.aliasIndex.delete(aliasKey);
      }

      // Add new aliases
      entity.aliases = updates.aliases.map((a, i) => ({
        ...a,
        isPrimary: i === 0,
      }));

      // Index new aliases
      for (const alias of entity.aliases) {
        const aliasKey = this.buildAliasKey(alias.aliasType, alias.aliasValue, entity.orgId);
        this.aliasIndex.set(aliasKey, id);
      }
    }

    // Update entity
    Object.assign(entity, {
      ...updates,
      updatedAt: now,
      version: entity.version + 1,
      metadata: {
        ...entity.metadata,
        lastSyncAt: now,
        syncStatus: newHash !== entity.metadata.hash ? 'synced' : entity.metadata.syncStatus,
        hash: newHash,
      },
    });

    logger.debug(`[MasterEntityService] Updated entity: ${entity.entityType}/${entity.canonicalId}`);

    return entity;
  }

  // ============================================================================
  // ENTITY RESOLUTION
  // ============================================================================

  /**
   * Get entity by ID
   */
  async getEntityById(id: string): Promise<MasterEntity | null> {
    return this.entities.get(id) || null;
  }

  /**
   * Get entity by canonical ID
   */
  async getEntityByCanonicalId(canonicalId: string): Promise<MasterEntity | null> {
    const id = this.canonicalIndex.get(canonicalId);
    return id ? this.entities.get(id) || null : null;
  }

  /**
   * Resolve entity reference to actual entity
   */
  async resolveEntityReference(reference: EntityReference, orgId: string): Promise<ResolvedEntity> {
    let entity: MasterEntity | undefined;
    let matchType: ResolvedEntity['matchType'] = 'none';

    // Try exact ID match
    if (reference.referenceType === 'id') {
      entity = this.entities.get(reference.referenceValue);
      if (entity && entity.entityType === reference.entityType && entity.orgId === orgId) {
        matchType = 'exact';
      }
    }

    // Try canonical ID match
    if (!entity && reference.referenceType === 'canonical_id') {
      const id = this.canonicalIndex.get(reference.referenceValue);
      if (id) {
        entity = this.entities.get(id);
        if (entity && entity.entityType === reference.entityType && entity.orgId === orgId) {
          matchType = 'exact';
        }
      }
    }

    // Try alias match
    if (!entity && reference.referenceType === 'alias') {
      // Try common alias types
      const aliasTypes: EntityAlias['aliasType'][] = ['sku', 'barcode', 'gtin', 'upc', 'vendor_code', 'legacy_id', 'external_id'];
      
      for (const aliasType of aliasTypes) {
        const aliasKey = this.buildAliasKey(aliasType, reference.referenceValue, orgId);
        const id = this.aliasIndex.get(aliasKey);
        if (id) {
          const candidate = this.entities.get(id);
          if (candidate && candidate.entityType === reference.entityType) {
            entity = candidate;
            matchType = 'alias';
            break;
          }
        }
      }
    }

    if (!entity) {
      // Try fuzzy search as fallback
      const alternatives = this.fuzzySearch(reference.referenceValue, reference.entityType, orgId, 5);
      if (alternatives.length > 0) {
        return {
          found: false,
          confidence: 0,
          matchType: 'fuzzy',
          alternatives,
        };
      }
    }

    return {
      found: !!entity,
      entity,
      confidence: matchType === 'exact' ? 1.0 : matchType === 'alias' ? 0.9 : 0,
      matchType,
    };
  }

  /**
   * Find entities by type and organization
   */
  async findEntities(filter: {
    entityType?: EntityType;
    orgId: string;
    outletId?: string;
    status?: MasterEntity['status'];
    search?: string;
    limit?: number;
    offset?: number;
  }): Promise<{ entities: MasterEntity[]; total: number }> {
    let results = Array.from(this.entities.values()).filter(e => e.orgId === filter.orgId);

    if (filter.entityType) {
      results = results.filter(e => e.entityType === filter.entityType);
    }

    if (filter.outletId) {
      results = results.filter(e => !e.outletId || e.outletId === filter.outletId);
    }

    if (filter.status) {
      results = results.filter(e => e.status === filter.status);
    }

    if (filter.search) {
      const searchLower = filter.search.toLowerCase();
      results = results.filter(e => 
        e.name.toLowerCase().includes(searchLower) ||
        e.canonicalId.toLowerCase().includes(searchLower) ||
        e.aliases.some(a => a.aliasValue.toLowerCase().includes(searchLower))
      );
    }

    const total = results.length;
    const offset = filter.offset || 0;
    const limit = filter.limit || 50;

    return {
      entities: results.slice(offset, offset + limit),
      total,
    };
  }

  /**
   * Validate entity reference exists
   */
  async validateReference(reference: EntityReference, orgId: string): Promise<{
    valid: boolean;
    error?: string;
    resolvedEntity?: MasterEntity;
  }> {
    const resolved = await this.resolveEntityReference(reference, orgId);

    if (!resolved.found) {
      return {
        valid: false,
        error: `Entity not found: ${reference.entityType}/${reference.referenceValue}`,
      };
    }

    return {
      valid: true,
      resolvedEntity: resolved.entity,
    };
  }

  // ============================================================================
  // ENTITY LINKING
  // ============================================================================

  /**
   * Link two entities together (merge)
   */
  async linkEntities(primaryId: string, secondaryId: string): Promise<MasterEntity> {
    const primary = this.entities.get(primaryId);
    const secondary = this.entities.get(secondaryId);

    if (!primary || !secondary) {
      throw new Error('One or both entities not found');
    }

    if (primary.entityType !== secondary.entityType) {
      throw new Error('Cannot link entities of different types');
    }

    if (primary.orgId !== secondary.orgId) {
      throw new Error('Cannot link entities from different organizations');
    }

    // Merge aliases from secondary to primary
    const existingAliasKeys = new Set(
      primary.aliases.map(a => `${a.aliasType}:${a.aliasValue}`)
    );

    for (const alias of secondary.aliases) {
      const key = `${alias.aliasType}:${alias.aliasValue}`;
      if (!existingAliasKeys.has(key)) {
        primary.aliases.push({ ...alias, isPrimary: false });
        
        // Update alias index
        const aliasKey = this.buildAliasKey(alias.aliasType, alias.aliasValue, primary.orgId);
        this.aliasIndex.set(aliasKey, primaryId);
      }
    }

    // Merge data
    primary.data = {
      ...secondary.data,
      ...primary.data, // Primary data takes precedence
      _merged: {
        from: secondaryId,
        at: new Date().toISOString(),
      },
    };

    // Archive secondary
    secondary.status = 'archived';
    secondary.metadata.syncStatus = 'synced';
    secondary.data._archivedReason = `Merged into ${primaryId}`;

    primary.updatedAt = new Date();
    primary.version++;

    logger.info(`[MasterEntityService] Linked entities: ${secondaryId} -> ${primaryId}`);

    return primary;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private normalizeEntityType(type: string): EntityType {
    const normalized = ENTITY_TYPE_MAPPINGS[type.toLowerCase()];
    if (!normalized) {
      logger.warn(`[MasterEntityService] Unknown entity type: ${type}, defaulting to 'product'`);
      return 'product';
    }
    return normalized;
  }

  private generateCanonicalId(entityType: EntityType, orgId: string, name: string): string {
    const normalized = name
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_')
      .replace(/_+/g, '_')
      .substring(0, 50);
    
    const hash = crypto.createHash('sha256')
      .update(`${entityType}:${orgId}:${name}:${Date.now()}`)
      .digest('hex')
      .substring(0, 8);

    return `${entityType}_${normalized}_${hash}`;
  }

  private buildAliasKey(aliasType: string, aliasValue: string, orgId: string): string {
    return `${orgId}:${aliasType}:${aliasValue.toLowerCase()}`;
  }

  private hashEntity(data: Record<string, any>): string {
    return crypto.createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex');
  }

  private findBySource(sourceModule: string, sourceId: string, orgId: string): MasterEntity | undefined {
    return Array.from(this.entities.values()).find(e =>
      e.metadata.sourceModule === sourceModule &&
      e.metadata.sourceId === sourceId &&
      e.orgId === orgId
    );
  }

  private fuzzySearch(query: string, entityType: EntityType, orgId: string, limit: number): MasterEntity[] {
    const queryLower = query.toLowerCase();
    
    const results = Array.from(this.entities.values())
      .filter(e => e.entityType === entityType && e.orgId === orgId && e.status === 'active')
      .map(e => {
        const nameMatch = this.fuzzyMatch(e.name.toLowerCase(), queryLower);
        const aliasMatch = Math.max(...e.aliases.map(a => this.fuzzyMatch(a.aliasValue.toLowerCase(), queryLower)));
        return { entity: e, score: Math.max(nameMatch, aliasMatch) };
      })
      .filter(r => r.score > 0.3)
      .sort((a, b) => b.score - a.score)
      .slice(0, limit)
      .map(r => r.entity);

    return results;
  }

  private fuzzyMatch(str: string, query: string): number {
    if (str === query) return 1.0;
    if (str.includes(query)) return 0.8;
    if (query.includes(str)) return 0.6;
    
    // Simple Levenshtein-ish score
    let matches = 0;
    let queryIdx = 0;
    for (const char of str) {
      if (queryIdx < query.length && char === query[queryIdx]) {
        matches++;
        queryIdx++;
      }
    }
    return matches / Math.max(str.length, query.length);
  }

  // ============================================================================
  // STATISTICS & DIAGNOSTICS
  // ============================================================================

  getStats(): {
    totalEntities: number;
    byType: Record<EntityType, number>;
    byStatus: Record<MasterEntity['status'], number>;
    aliasCount: number;
  } {
    const entities = Array.from(this.entities.values());
    
    const byType: Record<string, number> = {};
    const byStatus: Record<string, number> = {};

    for (const entity of entities) {
      byType[entity.entityType] = (byType[entity.entityType] || 0) + 1;
      byStatus[entity.status] = (byStatus[entity.status] || 0) + 1;
    }

    return {
      totalEntities: entities.length,
      byType: byType as Record<EntityType, number>,
      byStatus: byStatus as Record<MasterEntity['status'], number>,
      aliasCount: this.aliasIndex.size,
    };
  }

  /**
   * Clear all data (for testing)
   */
  clear(): void {
    this.entities.clear();
    this.aliasIndex.clear();
    this.canonicalIndex.clear();
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const masterEntityService = new MasterEntityService();

export default masterEntityService;
