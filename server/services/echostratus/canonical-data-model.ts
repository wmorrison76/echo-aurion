/**
 * Canonical Data Model for EchoStratus
 * 
 * Enterprise-grade master data model that normalizes entities across all LUCCCA modules.
 * Provides single source of truth for:
 * - Organizations (tenants)
 * - Outlets (locations, venues)
 * - Products (recipes, menu items, inventory items)
 * - Employees (staff, roles, positions)
 * - Events (BEOs, reservations, guest experiences)
 * - Financial entities (GL accounts, cost centers, periods)
 * 
 * Features:
 * - Multi-tenant isolation
 * - Entity versioning
 * - Soft deletes
 * - Audit trail
 * - Relationship mapping
 * - Caching for performance
 * - Incremental sync from source systems
 */

import { supabase } from '../../lib/supabase.js';
import { logger } from '../../utils/logger.js';

// ============================================================================
// ENTITY TYPES
// ============================================================================

export interface CanonicalOrganization {
  id: string;
  tenant_id: string; // Same as id for consistency
  name: string;
  type: 'restaurant' | 'hotel' | 'catering' | 'multi_concept';
  industry?: string;
  timezone: string;
  currency: string;
  fiscal_year_start?: string; // MM-DD format
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at?: string;
  metadata?: Record<string, any>;
}

export interface CanonicalOutlet {
  id: string;
  tenant_id: string;
  org_id: string;
  name: string;
  type: 'restaurant' | 'bar' | 'banquet' | 'cafe' | 'kitchen' | 'warehouse';
  address?: {
    street?: string;
    city?: string;
    state?: string;
    zip?: string;
    country?: string;
  };
  timezone: string;
  currency: string;
  status: 'active' | 'inactive' | 'closed';
  operational_hours?: {
    day_of_week: number; // 0-6 (Sunday-Saturday)
    open_time: string; // HH:MM format
    close_time: string; // HH:MM format
  }[];
  capacity?: {
    dining?: number;
    banquet?: number;
    bar?: number;
  };
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at?: string;
  metadata?: Record<string, any>;
}

export interface CanonicalProduct {
  id: string;
  tenant_id: string;
  org_id: string;
  outlet_id?: string; // Null if org-wide
  name: string;
  type: 'recipe' | 'menu_item' | 'inventory_item' | 'beverage' | 'service';
  category?: string;
  subcategory?: string;
  sku?: string;
  barcode?: string;
  unit_of_measure: string; // 'each', 'lb', 'oz', 'gallon', etc.
  cost?: number;
  price?: number;
  status: 'active' | 'inactive' | 'discontinued';
  recipe_id?: string; // Link to recipe if applicable
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at?: string;
  metadata?: Record<string, any>;
}

export interface CanonicalEmployee {
  id: string;
  tenant_id: string;
  org_id: string;
  outlet_id?: string; // Null if org-wide
  employee_number?: string;
  first_name: string;
  last_name: string;
  email?: string;
  phone?: string;
  status: 'active' | 'inactive' | 'terminated';
  hire_date?: string;
  termination_date?: string;
  positions: {
    position_id: string;
    position_name: string;
    department_id?: string;
    department_name?: string;
    hourly_rate?: number;
    start_date: string;
    end_date?: string;
  }[];
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at?: string;
  metadata?: Record<string, any>;
}

export interface CanonicalEvent {
  id: string;
  tenant_id: string;
  org_id: string;
  outlet_id: string;
  event_number?: string;
  name: string;
  type: 'banquet' | 'catering' | 'reservation' | 'function';
  status: 'draft' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled';
  start_time: string;
  end_time: string;
  guest_count?: number;
  expected_revenue?: number;
  actual_revenue?: number;
  beo_id?: string; // Link to BEO if applicable
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at?: string;
  metadata?: Record<string, any>;
}

export interface CanonicalGLAccount {
  id: string;
  tenant_id: string;
  org_id: string;
  account_number: string;
  name: string;
  type: 'asset' | 'liability' | 'equity' | 'revenue' | 'expense';
  category?: string;
  parent_account_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at?: string;
}

export interface CanonicalCostCenter {
  id: string;
  tenant_id: string;
  org_id: string;
  outlet_id?: string;
  code: string;
  name: string;
  type: 'outlet' | 'department' | 'project' | 'event';
  parent_cost_center_id?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
  version: number;
  deleted_at?: string;
}

// ============================================================================
// MASTER DATA SERVICE
// ============================================================================

export class CanonicalDataModelService {
  private cache: Map<string, any> = new Map();
  private cacheTTL: number = 5 * 60 * 1000; // 5 minutes

  /**
   * Get or create canonical organization
   */
  async getOrCreateOrganization(tenantId: string, data: Partial<CanonicalOrganization>): Promise<CanonicalOrganization> {
    try {
      // Check cache
      const cacheKey = `org:${tenantId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        return cached.data;
      }

      // Query database
      let { data: org, error } = await supabase
        .from('canonical_organizations')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('deleted_at', null)
        .single();

      if (error && error.code === 'PGRST116') {
        // Not found, create
        const newOrg: CanonicalOrganization = {
          id: tenantId,
          tenant_id: tenantId,
          name: data.name || 'Unknown Organization',
          type: data.type || 'restaurant',
          industry: data.industry,
          timezone: data.timezone || 'America/New_York',
          currency: data.currency || 'USD',
          fiscal_year_start: data.fiscal_year_start,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          metadata: data.metadata,
        };

        const { data: created, error: createError } = await supabase
          .from('canonical_organizations')
          .insert(newOrg)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        this.cache.set(cacheKey, { data: created, timestamp: Date.now() });
        return created;
      }

      if (error) {
        throw error;
      }

      // Update if provided
      if (org && (data.name || data.timezone || data.currency || data.metadata)) {
        const updates: Partial<CanonicalOrganization> = {
          updated_at: new Date().toISOString(),
          version: org.version + 1,
        };

        if (data.name) updates.name = data.name;
        if (data.timezone) updates.timezone = data.timezone;
        if (data.currency) updates.currency = data.currency;
        if (data.metadata) updates.metadata = { ...org.metadata, ...data.metadata };

        const { data: updated, error: updateError } = await supabase
          .from('canonical_organizations')
          .update(updates)
          .eq('id', tenantId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        this.cache.set(cacheKey, { data: updated, timestamp: Date.now() });
        return updated;
      }

      this.cache.set(cacheKey, { data: org, timestamp: Date.now() });
      return org;
    } catch (error) {
      logger.error('[Canonical Data Model] Failed to get/create organization:', error);
      throw error;
    }
  }

  /**
   * Get or create canonical outlet
   */
  async getOrCreateOutlet(
    tenantId: string,
    outletId: string,
    data: Partial<CanonicalOutlet>
  ): Promise<CanonicalOutlet> {
    try {
      const cacheKey = `outlet:${tenantId}:${outletId}`;
      const cached = this.cache.get(cacheKey);
      if (cached && (Date.now() - cached.timestamp) < this.cacheTTL) {
        return cached.data;
      }

      let { data: outlet, error } = await supabase
        .from('canonical_outlets')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('id', outletId)
        .eq('deleted_at', null)
        .single();

      if (error && error.code === 'PGRST116') {
        // Not found, create
        const newOutlet: CanonicalOutlet = {
          id: outletId,
          tenant_id: tenantId,
          org_id: data.org_id || tenantId,
          name: data.name || 'Unknown Outlet',
          type: data.type || 'restaurant',
          address: data.address,
          timezone: data.timezone || 'America/New_York',
          currency: data.currency || 'USD',
          status: data.status || 'active',
          operational_hours: data.operational_hours,
          capacity: data.capacity,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          version: 1,
          metadata: data.metadata,
        };

        const { data: created, error: createError } = await supabase
          .from('canonical_outlets')
          .insert(newOutlet)
          .select()
          .single();

        if (createError) {
          throw createError;
        }

        this.cache.set(cacheKey, { data: created, timestamp: Date.now() });
        return created;
      }

      if (error) {
        throw error;
      }

      // Update if provided
      if (outlet && (data.name || data.status || data.operational_hours || data.metadata)) {
        const updates: Partial<CanonicalOutlet> = {
          updated_at: new Date().toISOString(),
          version: outlet.version + 1,
        };

        if (data.name) updates.name = data.name;
        if (data.status) updates.status = data.status;
        if (data.operational_hours) updates.operational_hours = data.operational_hours;
        if (data.metadata) updates.metadata = { ...outlet.metadata, ...data.metadata };

        const { data: updated, error: updateError } = await supabase
          .from('canonical_outlets')
          .update(updates)
          .eq('id', outletId)
          .select()
          .single();

        if (updateError) {
          throw updateError;
        }

        this.cache.set(cacheKey, { data: updated, timestamp: Date.now() });
        return updated;
      }

      this.cache.set(cacheKey, { data: outlet, timestamp: Date.now() });
      return outlet;
    } catch (error) {
      logger.error('[Canonical Data Model] Failed to get/create outlet:', error);
      throw error;
    }
  }

  /**
   * Sync entity from source system (incremental update)
   */
  async syncEntity(
    entityType: 'organization' | 'outlet' | 'product' | 'employee' | 'event' | 'gl_account' | 'cost_center',
    tenantId: string,
    entityId: string,
    sourceData: Record<string, any>
  ): Promise<void> {
    try {
      logger.debug('[Canonical Data Model] Syncing entity', {
        entityType,
        tenantId,
        entityId,
      });

      switch (entityType) {
        case 'organization':
          await this.getOrCreateOrganization(tenantId, sourceData);
          break;
        case 'outlet':
          await this.getOrCreateOutlet(tenantId, entityId, sourceData);
          break;
        case 'product':
          await this.syncProduct(tenantId, entityId, sourceData);
          break;
        case 'employee':
          await this.syncEmployee(tenantId, entityId, sourceData);
          break;
        case 'event':
          await this.syncEvent(tenantId, entityId, sourceData);
          break;
        default:
          logger.warn('[Canonical Data Model] Unsupported entity type:', entityType);
      }
    } catch (error) {
      logger.error('[Canonical Data Model] Failed to sync entity:', error);
      throw error;
    }
  }

  /**
   * Sync product (placeholder - implement based on schema)
   */
  private async syncProduct(tenantId: string, productId: string, data: Partial<CanonicalProduct>): Promise<CanonicalProduct> {
    // Implementation would mirror getOrCreateOutlet pattern
    throw new Error('Not implemented');
  }

  /**
   * Sync employee (placeholder - implement based on schema)
   */
  private async syncEmployee(tenantId: string, employeeId: string, data: Partial<CanonicalEmployee>): Promise<CanonicalEmployee> {
    // Implementation would mirror getOrCreateOutlet pattern
    throw new Error('Not implemented');
  }

  /**
   * Sync event (placeholder - implement based on schema)
   */
  private async syncEvent(tenantId: string, eventId: string, data: Partial<CanonicalEvent>): Promise<CanonicalEvent> {
    // Implementation would mirror getOrCreateOutlet pattern
    throw new Error('Not implemented');
  }

  /**
   * Clear cache for entity
   */
  clearCache(entityType: string, tenantId: string, entityId?: string): void {
    if (entityId) {
      const cacheKey = `${entityType}:${tenantId}:${entityId}`;
      this.cache.delete(cacheKey);
    } else {
      // Clear all for tenant
      for (const key of this.cache.keys()) {
        if (key.startsWith(`${entityType}:${tenantId}:`)) {
          this.cache.delete(key);
        }
      }
    }
  }

  /**
   * Get entity relationships
   */
  async getEntityRelationships(
    entityType: string,
    entityId: string,
    tenantId: string
  ): Promise<Array<{ type: string; target_id: string; target_type: string; relationship: string }>> {
    try {
      const { data, error } = await supabase
        .from('canonical_entity_relationships')
        .select('*')
        .eq('tenant_id', tenantId)
        .eq('source_type', entityType)
        .eq('source_id', entityId);

      if (error) {
        throw error;
      }

      return (data || []).map(r => ({
        type: r.relationship_type,
        target_id: r.target_id,
        target_type: r.target_type,
        relationship: r.relationship_type,
      }));
    } catch (error) {
      logger.error('[Canonical Data Model] Failed to get relationships:', error);
      return [];
    }
  }

  /**
   * Create entity relationship
   */
  async createRelationship(
    tenantId: string,
    sourceType: string,
    sourceId: string,
    targetType: string,
    targetId: string,
    relationshipType: string
  ): Promise<void> {
    try {
      const { error } = await supabase
        .from('canonical_entity_relationships')
        .upsert({
          tenant_id: tenantId,
          source_type: sourceType,
          source_id: sourceId,
          target_type: targetType,
          target_id: targetId,
          relationship_type: relationshipType,
          created_at: new Date().toISOString(),
        }, {
          onConflict: 'tenant_id,source_type,source_id,target_type,target_id',
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      logger.error('[Canonical Data Model] Failed to create relationship:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const canonicalDataModelService = new CanonicalDataModelService();