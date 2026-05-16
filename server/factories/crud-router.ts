/**
 * Lightweight CRUD Router Factory
 * 
 * Creates standard REST routes for any entity:
 * - GET    /resources        - List (org-scoped, paginated)
 * - GET    /resources/:id    - Get one
 * - POST   /resources        - Create
 * - PUT    /resources/:id    - Update
 * - DELETE /resources/:id    - Delete
 * 
 * Usage:
 *   export default createCRUD(recipeRepo, {
 *     validate: recipeSchema
 *   });
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { PostgresRepository } from '../database/postgres-repository';
import { BaseEntity, UUID, PaginationParams } from '../../shared/types/base';

/**
 * Extended request with auth context
 */
export interface AuthRequest extends Request {
  user?: {
    id: UUID;
    orgId: UUID;
  };
}

/**
 * CRUD router options
 */
export interface CRUDOptions<T extends BaseEntity> {
  /** Zod schema for create/update validation */
  validate?: {
    create?: z.ZodSchema;
    update?: z.ZodSchema;
  };
  
  /** Custom handlers (optional) */
  handlers?: {
    beforeCreate?: (req: AuthRequest, data: any) => Promise<any>;
    afterCreate?: (req: AuthRequest, entity: T) => Promise<void>;
    beforeUpdate?: (req: AuthRequest, id: UUID, data: any) => Promise<any>;
    afterUpdate?: (req: AuthRequest, entity: T) => Promise<void>;
    beforeDelete?: (req: AuthRequest, id: UUID) => Promise<void>;
    afterDelete?: (req: AuthRequest, id: UUID) => Promise<void>;
  };
  
  /** Use soft delete instead of hard delete */
  softDelete?: boolean;
}

/**
 * Create CRUD router for an entity
 */
export function createCRUD<T extends BaseEntity>(
  repository: PostgresRepository<T>,
  options: CRUDOptions<T> = {}
): Router {
  const router = Router();
  
  // Helper: get auth context
  const getContext = (req: AuthRequest) => {
    if (!req.user) {
      throw new Error('Authentication required');
    }
    return {
      userId: req.user.id,
      orgId: req.user.orgId
    };
  };
  
  // Helper: get route param id as string
  const getId = (req: AuthRequest): string => {
    const id = req.params.id;
    return Array.isArray(id) ? (id[0] ?? '') : (id ?? '');
  };

  // Helper: parse pagination
  const getPagination = (query: any): PaginationParams => ({
    page: parseInt(query.page) || 1,
    limit: Math.min(parseInt(query.limit) || 50, 100),
    sortBy: query.sortBy,
    sortOrder: query.sortOrder === 'desc' ? 'desc' : 'asc'
  });
  
  // ============================================================================
  // LIST - GET /
  // ============================================================================
  router.get('/', async (req: AuthRequest, res: Response) => {
    try {
      const { orgId } = getContext(req);
      const pagination = getPagination(req.query);
      
      // Get items and count
      const [items, total] = await Promise.all([
        repository.findMany({ orgId, pagination }),
        repository.count({ orgId })
      ]);
      
      // Return paginated response
      res.json({
        success: true,
        data: items,
        pagination: {
          page: pagination.page,
          limit: pagination.limit,
          total,
          totalPages: Math.ceil(total / pagination.limit),
          hasNext: pagination.page * pagination.limit < total,
          hasPrev: pagination.page > 1
        }
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  });
  
  // ============================================================================
  // GET ONE - GET /:id
  // ============================================================================
  router.get('/:id', async (req: AuthRequest, res: Response) => {
    try {
      const entity = await repository.findById(getId(req));
      
      if (!entity) {
        return res.status(404).json({
          success: false,
          error: { message: 'Not found' }
        });
      }
      
      // Verify org access
      const { orgId } = getContext(req);
      if (entity.orgId !== orgId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden' }
        });
      }
      
      res.json({
        success: true,
        data: entity
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  });
  
  // ============================================================================
  // CREATE - POST /
  // ============================================================================
  router.post('/', async (req: AuthRequest, res: Response) => {
    try {
      const context = getContext(req);
      let data = req.body;
      
      // Validate
      if (options.validate?.create) {
        const result = options.validate.create.safeParse(data);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Validation failed',
              details: result.error.errors
            }
          });
        }
        data = result.data;
      }
      
      // Before create hook
      if (options.handlers?.beforeCreate) {
        data = await options.handlers.beforeCreate(req, data);
      }
      
      // Create
      const entity = await repository.create(data, context);
      
      // After create hook
      if (options.handlers?.afterCreate) {
        await options.handlers.afterCreate(req, entity);
      }
      
      res.status(201).json({
        success: true,
        data: entity
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  });
  
  // ============================================================================
  // UPDATE - PUT /:id
  // ============================================================================
  router.put('/:id', async (req: AuthRequest, res: Response) => {
    try {
      const context = getContext(req);
      const id = getId(req);
      let data = req.body;
      
      // Check exists and org access
      const existing = await repository.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { message: 'Not found' }
        });
      }
      if (existing.orgId !== context.orgId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden' }
        });
      }
      
      // Validate
      if (options.validate?.update) {
        const result = options.validate.update.safeParse(data);
        if (!result.success) {
          return res.status(400).json({
            success: false,
            error: {
              message: 'Validation failed',
              details: result.error.errors
            }
          });
        }
        data = result.data;
      }
      
      // Before update hook
      if (options.handlers?.beforeUpdate) {
        data = await options.handlers.beforeUpdate(req, id, data);
      }
      
      // Update
      const entity = await repository.update(id, data, context);
      
      // After update hook
      if (options.handlers?.afterUpdate) {
        await options.handlers.afterUpdate(req, entity);
      }
      
      res.json({
        success: true,
        data: entity
      });
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  });
  
  // ============================================================================
  // DELETE - DELETE /:id
  // ============================================================================
  router.delete('/:id', async (req: AuthRequest, res: Response) => {
    try {
      const context = getContext(req);
      const id = getId(req);
      
      // Check exists and org access
      const existing = await repository.findById(id);
      if (!existing) {
        return res.status(404).json({
          success: false,
          error: { message: 'Not found' }
        });
      }
      if (existing.orgId !== context.orgId) {
        return res.status(403).json({
          success: false,
          error: { message: 'Forbidden' }
        });
      }
      
      // Before delete hook
      if (options.handlers?.beforeDelete) {
        await options.handlers.beforeDelete(req, id);
      }
      
      // Delete (soft or hard)
      if (options.softDelete) {
        await repository.softDelete(id, context);
      } else {
        await repository.delete(id);
      }
      
      // After delete hook
      if (options.handlers?.afterDelete) {
        await options.handlers.afterDelete(req, id);
      }
      
      res.status(204).send();
    } catch (error: any) {
      res.status(500).json({
        success: false,
        error: { message: error.message }
      });
    }
  });
  
  return router;
}
