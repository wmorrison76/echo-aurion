/**
 * PostgreSQL Repository Implementation
 * Concrete implementation of Repository<T> for Neon PostgreSQL
 */

import { v4 as uuidv4 } from 'uuid';
import {
  BaseEntity,
  UUID,
  PaginationParams,
  Filter,
} from '../../shared/types/base';
import { query } from './connection';
import {
  getTableName,
  objectToSnakeCase,
  objectToCamelCase,
  toSnakeCase,
  TABLE_NAMES,
} from './table-names';

/**
 * Query options for findMany
 */
export interface FindManyOptions {
  orgId: UUID;
  filters?: Filter[];
  pagination?: PaginationParams;
}

/**
 * Context for create/update operations
 */
export interface RepositoryContext {
  userId: UUID;
  orgId: UUID;
}

/**
 * PostgreSQL Repository
 */
export class PostgresRepository<T extends BaseEntity> {
  constructor(private readonly tableName: string) {}

  /**
   * Find entity by ID
   */
  async findById(id: UUID, orgId?: UUID): Promise<T | null> {
    const params: any[] = [id];
    let sql = `SELECT * FROM ${this.tableName} WHERE id = $1`;

    if (orgId) {
      params.push(orgId);
      sql += ` AND org_id = $2`;
    }

    sql += ` AND archived_at IS NULL`;

    const result = await query<any>(sql, params);
    if (result.rows.length === 0) {
      return null;
    }

    return objectToCamelCase(result.rows[0]) as T;
  }

  /**
   * Find multiple entities with filtering and pagination
   * (Filtering currently limited to org + pagination. Extend as needed.)
   */
  async findMany(options: FindManyOptions): Promise<T[]> {
    const { orgId, pagination } = options;

    let sql = `SELECT * FROM ${this.tableName} WHERE org_id = $1 AND archived_at IS NULL`;
    const params: any[] = [orgId];

    // TODO: Add Filter support
    // if (options.filters) { ... }

    // Sorting
    if (pagination?.sortBy) {
      const sortColumn = toSnakeCase(pagination.sortBy);
      const sortOrder = pagination.sortOrder === 'desc' ? 'DESC' : 'ASC';
      sql += ` ORDER BY ${sortColumn} ${sortOrder}`;
    } else {
      sql += ` ORDER BY created_at DESC`;
    }

    // Pagination
    if (pagination) {
      const offset = Math.max(pagination.page - 1, 0) * pagination.limit;
      params.push(pagination.limit);
      sql += ` LIMIT $${params.length}`;
      params.push(offset);
      sql += ` OFFSET $${params.length}`;
    }

    const result = await query<any>(sql, params);
    return result.rows.map((row) => objectToCamelCase(row) as T);
  }

  /**
   * Count entities matching filters
   */
  async count(options: Omit<FindManyOptions, 'pagination'>): Promise<number> {
    const { orgId } = options;

    const result = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM ${this.tableName} WHERE org_id = $1 AND archived_at IS NULL`,
      [orgId],
    );

    return Number(result.rows[0]?.count ?? 0);
  }

  /**
   * Create new entity
   */
  async create(
    data: Omit<T, keyof BaseEntity>,
    context: RepositoryContext,
  ): Promise<T> {
    const id = uuidv4();
    const now = new Date().toISOString();

    const entity: Record<string, unknown> = {
      id,
      orgId: context.orgId,
      createdAt: now,
      updatedAt: now,
      archivedAt: null,
      ...data,
    };

    // Auditable fields (only add if target type expects them)
    if ('createdBy' in (data as Record<string, unknown>) || 'createdBy' in entity) {
      entity.createdBy = context.userId;
    }
    if ('updatedBy' in (data as Record<string, unknown>) || 'updatedBy' in entity) {
      entity.updatedBy = context.userId;
    }

    const dbEntity = objectToSnakeCase(entity);

    const columns = Object.keys(dbEntity);
    const values = Object.values(dbEntity);
    const placeholders = columns.map((_, i) => `$${i + 1}`).join(', ');

    const sql = `
      INSERT INTO ${this.tableName} (${columns.join(', ')})
      VALUES (${placeholders})
      RETURNING *
    `;

    const result = await query<any>(sql, values);
    return objectToCamelCase(result.rows[0]) as T;
  }

  /**
   * Update existing entity
   */
  async update(
    id: UUID,
    data: Partial<T>,
    context: RepositoryContext,
  ): Promise<T> {
    const now = new Date().toISOString();

    const updateData: Record<string, unknown> = {
      ...data,
      updatedAt: now,
    };

    if ('updatedBy' in (data as Record<string, unknown>) || 'updatedBy' in updateData) {
      updateData.updatedBy = context.userId;
    }

    const dbDataEntries = Object.entries(objectToSnakeCase(updateData)).filter(
      ([, value]) => typeof value !== 'undefined',
    );

    if (dbDataEntries.length === 0) {
      const current = await this.findById(id, context.orgId);
      if (!current) {
        throw new Error(`Entity not found: ${id}`);
      }
      return current;
    }

    const setClause = dbDataEntries
      .map(([key], index) => `${key} = $${index + 2}`)
      .join(', ');
    const values = dbDataEntries.map(([, value]) => value);

    const sql = `
      UPDATE ${this.tableName}
      SET ${setClause}
      WHERE id = $1
      RETURNING *
    `;

    const result = await query<any>(sql, [id, ...values]);
    if (result.rows.length === 0) {
      throw new Error(`Entity not found: ${id}`);
    }

    return objectToCamelCase(result.rows[0]) as T;
  }

  /**
   * Delete entity (hard delete)
   */
  async delete(id: UUID, orgId?: UUID): Promise<void> {
    const params: any[] = [id];
    let sql = `DELETE FROM ${this.tableName} WHERE id = $1`;

    if (orgId) {
      params.push(orgId);
      sql += ` AND org_id = $2`;
    }

    await query(sql, params);
  }

  /**
   * Soft delete (set archived_at)
   */
  async softDelete(id: UUID, context: RepositoryContext): Promise<T> {
    const now = new Date().toISOString();

    const result = await query<any>(
      `UPDATE ${this.tableName}
       SET archived_at = $1, updated_at = $2, updated_by = $3
       WHERE id = $4
       RETURNING *`,
      [now, now, context.userId, id],
    );

    if (result.rows.length === 0) {
      throw new Error(`Entity not found: ${id}`);
    }

    return objectToCamelCase(result.rows[0]) as T;
  }
}

/**
 * Factory function to create repository instances
 */
export function createRepository<T extends BaseEntity>(
  typeName: keyof typeof TABLE_NAMES,
): PostgresRepository<T> {
  const tableName = getTableName(typeName);
  return new PostgresRepository<T>(tableName);
}

