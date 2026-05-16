/**
 * Generic Repository Pattern
 * This is now just a type definition - actual implementation is in postgres-repository.ts
 */

import {
  BaseEntity,
  UUID,
  PaginationParams,
  Filter,
} from './types/base';

/**
 * Query options for findMany
 */
export interface FindManyOptions {
  orgId: UUID;
  filters?: Filter[];
  pagination?: PaginationParams;
}

/**
 * Context for operations requiring user/org info
 */
export interface RepositoryContext {
  userId: UUID;
  orgId: UUID;
}

/**
 * Generic repository interface
 * Actual implementation: server/database/postgres-repository.ts
 */
export interface IRepository<T extends BaseEntity> {
  findById(id: UUID): Promise<T | null>;
  findMany(options: FindManyOptions): Promise<T[]>;
  count(options: Omit<FindManyOptions, 'pagination'>): Promise<number>;
  create(
    data: Omit<T, keyof BaseEntity>,
    context: RepositoryContext,
  ): Promise<T>;
  update(
    id: UUID,
    data: Partial<T>,
    context: RepositoryContext,
  ): Promise<T>;
  delete(id: UUID): Promise<void>;
  softDelete(id: UUID, context: RepositoryContext): Promise<T>;
}

/**
 * Legacy Repository class (for backward compatibility)
 * Use createRepository() from postgres-repository.ts instead
 */
export class Repository<T extends BaseEntity> implements IRepository<T> {
  async findById(_id: UUID): Promise<T | null> {
    throw new Error('Use createRepository() from postgres-repository.ts');
  }

  async findMany(_options: FindManyOptions): Promise<T[]> {
    throw new Error('Use createRepository() from postgres-repository.ts');
  }

  async count(
    _options: Omit<FindManyOptions, 'pagination'>,
  ): Promise<number> {
    throw new Error('Use createRepository() from postgres-repository.ts');
  }

  async create(
    _data: Omit<T, keyof BaseEntity>,
    _context: RepositoryContext,
  ): Promise<T> {
    throw new Error('Use createRepository() from postgres-repository.ts');
  }

  async update(
    _id: UUID,
    _data: Partial<T>,
    _context: RepositoryContext,
  ): Promise<T> {
    throw new Error('Use createRepository() from postgres-repository.ts');
  }

  async delete(_id: UUID): Promise<void> {
    throw new Error('Use createRepository() from postgres-repository.ts');
  }

  async softDelete(
    _id: UUID,
    _context: RepositoryContext,
  ): Promise<T> {
    throw new Error('Use createRepository() from postgres-repository.ts');
  }
}
