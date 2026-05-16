import { PoolClient } from 'pg';
import { dbHelpers } from '../database/connection';
import { BaseEntity, PaginationParams, SearchParams } from '../models';

// Base repository class with common CRUD operations
export abstract class BaseRepository<T extends BaseEntity> {
  protected tableName: string;

  constructor(tableName: string) {
    this.tableName = tableName;
  }

  // Create a new record
  async create(data: Omit<T, 'id' | 'created_at' | 'updated_at'>): Promise<T> {
    try {
      const result = await dbHelpers.insert<T>(this.tableName, data);
      return result;
    } catch (error) {
      console.error(`Error creating ${this.tableName}:`, error);
      throw new Error(`Failed to create ${this.tableName}`);
    }
  }

  // Find a record by ID
  async findById(id: string): Promise<T | null> {
    try {
      return await dbHelpers.findById<T>(this.tableName, id);
    } catch (error) {
      console.error(`Error finding ${this.tableName} by ID:`, error);
      throw new Error(`Failed to find ${this.tableName}`);
    }
  }

  // Update a record by ID
  async update(id: string, data: Partial<Omit<T, 'id' | 'created_at' | 'updated_at'>>): Promise<T | null> {
    try {
      return await dbHelpers.update<T>(this.tableName, id, data);
    } catch (error) {
      console.error(`Error updating ${this.tableName}:`, error);
      throw new Error(`Failed to update ${this.tableName}`);
    }
  }

  // Delete a record by ID
  async delete(id: string): Promise<boolean> {
    try {
      return await dbHelpers.delete(this.tableName, id);
    } catch (error) {
      console.error(`Error deleting ${this.tableName}:`, error);
      throw new Error(`Failed to delete ${this.tableName}`);
    }
  }

  // Find records with conditions
  async findWhere(
    conditions: Record<string, any>,
    options?: {
      orderBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    try {
      return await dbHelpers.findWhere<T>(this.tableName, conditions, options);
    } catch (error) {
      console.error(`Error finding ${this.tableName} with conditions:`, error);
      throw new Error(`Failed to find ${this.tableName}`);
    }
  }

  // Find all records
  async findAll(options?: {
    orderBy?: string;
    limit?: number;
    offset?: number;
  }): Promise<T[]> {
    try {
      return await this.findWhere({}, options);
    } catch (error) {
      console.error(`Error finding all ${this.tableName}:`, error);
      throw new Error(`Failed to find ${this.tableName}`);
    }
  }

  // Count records with conditions
  async count(conditions?: Record<string, any>): Promise<number> {
    try {
      return await dbHelpers.count(this.tableName, conditions);
    } catch (error) {
      console.error(`Error counting ${this.tableName}:`, error);
      throw new Error(`Failed to count ${this.tableName}`);
    }
  }

  // Paginated find with search
  async findPaginated(params: SearchParams): Promise<{
    data: T[];
    total: number;
    page: number;
    limit: number;
    pages: number;
  }> {
    try {
      const { page = 1, limit = 10, sortBy = 'created_at', sortOrder = 'desc', query, filters = {} } = params;
      const offset = (page - 1) * limit;

      // Build search conditions
      let conditions = { ...filters };
      let searchQuery = '';
      let searchParams: any[] = [];

      if (query) {
        // Add generic search capabilities - subclasses can override
        searchQuery = this.buildSearchQuery(query);
        searchParams = this.buildSearchParams(query);
      }

      // Get total count
      const total = await this.countWithSearch(conditions, searchQuery, searchParams);

      // Get paginated data
      const data = await this.findWithSearch(conditions, searchQuery, searchParams, {
        orderBy: `${sortBy} ${sortOrder}`,
        limit,
        offset
      });

      return {
        data,
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      };
    } catch (error) {
      console.error(`Error in paginated find for ${this.tableName}:`, error);
      throw new Error(`Failed to find ${this.tableName}`);
    }
  }

  // Upsert operation
  async upsert(
    data: Omit<T, 'id' | 'created_at' | 'updated_at'>,
    conflictColumns: string[]
  ): Promise<T> {
    try {
      return await dbHelpers.upsert<T>(this.tableName, data, conflictColumns);
    } catch (error) {
      console.error(`Error upserting ${this.tableName}:`, error);
      throw new Error(`Failed to upsert ${this.tableName}`);
    }
  }

  // Bulk create
  async bulkCreate(items: Omit<T, 'id' | 'created_at' | 'updated_at'>[]): Promise<T[]> {
    try {
      const results: T[] = [];
      for (const item of items) {
        const created = await this.create(item);
        results.push(created);
      }
      return results;
    } catch (error) {
      console.error(`Error bulk creating ${this.tableName}:`, error);
      throw new Error(`Failed to bulk create ${this.tableName}`);
    }
  }

  // Execute in transaction
  async executeInTransaction<R>(callback: (client: PoolClient) => Promise<R>): Promise<R> {
    return await dbHelpers.transaction(callback);
  }

  // Raw query execution
  async executeQuery<R = any>(query: string, params?: any[]): Promise<R[]> {
    try {
      return await dbHelpers.raw<R>(query, params);
    } catch (error) {
      console.error(`Error executing query on ${this.tableName}:`, error);
      throw new Error(`Failed to execute query`);
    }
  }

  // Soft delete (if supported)
  async softDelete(id: string): Promise<T | null> {
    if (this.supportsSoftDelete()) {
      return await this.update(id, { is_active: false } as any);
    }
    throw new Error(`Soft delete not supported for ${this.tableName}`);
  }

  // Restore soft deleted record
  async restore(id: string): Promise<T | null> {
    if (this.supportsSoftDelete()) {
      return await this.update(id, { is_active: true } as any);
    }
    throw new Error(`Restore not supported for ${this.tableName}`);
  }

  // Check if entity supports soft delete
  protected supportsSoftDelete(): boolean {
    return false; // Override in subclasses if needed
  }

  // Build search query - override in subclasses for specific search logic
  protected buildSearchQuery(query: string): string {
    return '';
  }

  // Build search parameters - override in subclasses
  protected buildSearchParams(query: string): any[] {
    return [];
  }

  // Find with search - can be overridden for complex searches
  protected async findWithSearch(
    conditions: Record<string, any>,
    searchQuery: string,
    searchParams: any[],
    options: {
      orderBy?: string;
      limit?: number;
      offset?: number;
    }
  ): Promise<T[]> {
    if (!searchQuery) {
      return await this.findWhere(conditions, options);
    }

    // Build combined query
    const conditionEntries = Object.entries(conditions);
    const whereConditions = [];
    const allParams = [];

    // Add regular conditions
    if (conditionEntries.length > 0) {
      conditionEntries.forEach(([key], index) => {
        whereConditions.push(`${key} = $${allParams.length + 1}`);
        allParams.push(conditions[key]);
      });
    }

    // Add search query
    if (searchQuery) {
      whereConditions.push(`(${searchQuery})`);
      allParams.push(...searchParams);
    }

    let query = `SELECT * FROM ${this.tableName}`;
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    if (options.orderBy) {
      query += ` ORDER BY ${options.orderBy}`;
    }

    if (options.limit) {
      query += ` LIMIT ${options.limit}`;
    }

    if (options.offset) {
      query += ` OFFSET ${options.offset}`;
    }

    return await this.executeQuery<T>(query, allParams);
  }

  // Count with search
  protected async countWithSearch(
    conditions: Record<string, any>,
    searchQuery: string,
    searchParams: any[]
  ): Promise<number> {
    if (!searchQuery) {
      return await this.count(conditions);
    }

    const conditionEntries = Object.entries(conditions);
    const whereConditions = [];
    const allParams = [];

    // Add regular conditions
    if (conditionEntries.length > 0) {
      conditionEntries.forEach(([key], index) => {
        whereConditions.push(`${key} = $${allParams.length + 1}`);
        allParams.push(conditions[key]);
      });
    }

    // Add search query
    if (searchQuery) {
      whereConditions.push(`(${searchQuery})`);
      allParams.push(...searchParams);
    }

    let query = `SELECT COUNT(*) as count FROM ${this.tableName}`;
    if (whereConditions.length > 0) {
      query += ` WHERE ${whereConditions.join(' AND ')}`;
    }

    const result = await this.executeQuery<{ count: string }>(query, allParams);
    return parseInt(result[0].count);
  }

  // Advanced filtering methods
  async findByIds(ids: string[]): Promise<T[]> {
    if (ids.length === 0) return [];
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const query = `SELECT * FROM ${this.tableName} WHERE id IN (${placeholders})`;
    
    return await this.executeQuery<T>(query, ids);
  }

  async findRecent(limit: number = 10): Promise<T[]> {
    return await this.findAll({
      orderBy: 'created_at DESC',
      limit
    });
  }

  async findUpdatedSince(date: string): Promise<T[]> {
    return await this.findWhere(
      { 'updated_at >=': date },
      { orderBy: 'updated_at DESC' }
    );
  }

  // Batch operations
  async bulkUpdate(updates: Array<{ id: string; data: Partial<T> }>): Promise<T[]> {
    const results: T[] = [];
    
    for (const { id, data } of updates) {
      const updated = await this.update(id, data);
      if (updated) results.push(updated);
    }
    
    return results;
  }

  async bulkDelete(ids: string[]): Promise<number> {
    if (ids.length === 0) return 0;
    
    const placeholders = ids.map((_, index) => `$${index + 1}`).join(', ');
    const query = `DELETE FROM ${this.tableName} WHERE id IN (${placeholders})`;
    
    const result = await dbHelpers.query(query, ids);
    return result.rowCount || 0;
  }

  // Validation helpers
  protected async validateUnique(field: string, value: any, excludeId?: string): Promise<boolean> {
    let conditions: Record<string, any> = { [field]: value };
    
    if (excludeId) {
      const query = `SELECT COUNT(*) as count FROM ${this.tableName} WHERE ${field} = $1 AND id != $2`;
      const result = await this.executeQuery<{ count: string }>(query, [value, excludeId]);
      return parseInt(result[0].count) === 0;
    } else {
      const count = await this.count(conditions);
      return count === 0;
    }
  }

  protected async validateExists(field: string, value: any): Promise<boolean> {
    const count = await this.count({ [field]: value });
    return count > 0;
  }

  // Helper for building ORDER BY clauses
  protected buildOrderBy(sortBy?: string, sortOrder?: 'asc' | 'desc'): string {
    if (!sortBy) return 'created_at DESC';
    
    const order = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';
    return `${sortBy} ${order}`;
  }

  // Helper for building LIMIT/OFFSET clauses
  protected buildPagination(page: number, limit: number): { limit: number; offset: number } {
    return {
      limit: Math.min(limit, 100), // Cap at 100 items per page
      offset: (page - 1) * limit
    };
  }

  // Health check for the repository
  async healthCheck(): Promise<{ healthy: boolean; tableName: string; recordCount?: number }> {
    try {
      const count = await this.count();
      return {
        healthy: true,
        tableName: this.tableName,
        recordCount: count
      };
    } catch (error) {
      return {
        healthy: false,
        tableName: this.tableName
      };
    }
  }
}

export default BaseRepository;
