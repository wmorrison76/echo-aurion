/**
 * One factory, handles ALL your CRUD routes.
 * Before: 300 lines per resource. After: 5 lines per resource.
 *
 * @example
 * createCRUDRouter<Recipe>({
 *   resource: 'recipes',
 *   repository: recipeRepo,
 *   schema: recipeSchema
 * });
 */

import { Router, Request, Response } from "express";
import { z, type ZodType } from "zod";
import type { BaseEntity, UUID, PaginationParams } from "../../../shared/types/base";
import type { Repository } from "../../../shared/repository";
import { getOrgId } from "./org-resolver";

export interface CreateCRUDRouterOptions<T extends BaseEntity> {
  /** URL segment for the resource (e.g. 'recipes' → GET/POST /api/recipes, GET/PUT/PATCH/DELETE /api/recipes/:id) */
  resource: string;
  /** Repository implementing findById, list, create, update, delete */
  repository: Repository<T>;
  /** Zod schema for create/update body validation (create = full parse, update = partial) */
  schema?: ZodType<Partial<T>>;
  /** If true, GET / returns list (requires repository.list implemented). Default true. */
  enableList?: boolean;
}

/**
 * Creates an Express router with full CRUD for a resource:
 * - GET /         → list (paginated)
 * - GET /:id      → findById
 * - POST /        → create (body validated by schema, orgId from request)
 * - PUT /:id      → update (body validated by schema.partial())
 * - PATCH /:id    → update (same as PUT)
 * - DELETE /:id   → delete
 *
 * Mount with: app.use('/api/recipes', jwtAuthMiddleware, createCRUDRouter<Recipe>({ ... }))
 */
export function createCRUDRouter<T extends BaseEntity>(
  options: CreateCRUDRouterOptions<T>,
): Router {
  const {
    resource,
    repository,
    schema,
    enableList = true,
  } = options;

  const router = Router();

  const parseBody = (body: unknown, partial: boolean): Partial<T> => {
    if (!schema) return (body as Partial<T>) ?? {};
    if (partial) {
      const partialSchema = (schema as ZodType<Partial<T>>).partial?.() ?? schema;
      return partialSchema.parse(body) as Partial<T>;
    }
    return schema.parse(body) as Partial<T>;
  };

  const safeId = (id: string): UUID => {
    if (!id) throw new Error("id required");
    return id as UUID;
  };

  // GET / — list
  if (enableList) {
    router.get("/", async (req: Request, res: Response) => {
      try {
        const params: PaginationParams = {
          page: Number(req.query.page) || 1,
          limit: Math.min(Number(req.query.limit) || 20, 100),
          sortBy: (req.query.sortBy as string) || undefined,
          sortOrder: (req.query.sortOrder as "asc" | "desc") || undefined,
        };
        const result = await repository.list(params);
        res.json({ success: true, ...result });
      } catch (e) {
        const err = e instanceof Error ? e : new Error(String(e));
        const status = err.message.includes("not implemented") ? 501 : 500;
        res.status(status).json({
          success: false,
          error: err.message,
        });
      }
    });
  }

  // GET /:id
  router.get("/:id", async (req: Request, res: Response) => {
    try {
      const id = safeId(req.params.id);
      const entity = await repository.findById(id);
      if (!entity) {
        return res.status(404).json({ success: false, error: `${resource} not found` });
      }
      res.json({ success: true, data: entity });
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // POST /
  router.post("/", async (req: Request, res: Response) => {
    try {
      const orgId = getOrgId(req);
      const body = parseBody(req.body, false) as Omit<T, keyof BaseEntity>;
      const entity = await repository.create({
        ...body,
        orgId,
      } as Omit<T, keyof BaseEntity>);
      res.status(201).json({ success: true, data: entity });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: e.flatten(),
        });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      res.status(500).json({ success: false, error: err.message });
    }
  });

  // PUT /:id and PATCH /:id
  const updateHandler = async (req: Request, res: Response) => {
    try {
      const id = safeId(req.params.id);
      const body = parseBody(req.body, true);
      const entity = await repository.update(id, body);
      res.json({ success: true, data: entity });
    } catch (e) {
      if (e instanceof z.ZodError) {
        return res.status(400).json({
          success: false,
          error: "Validation failed",
          details: e.flatten(),
        });
      }
      const err = e instanceof Error ? e : new Error(String(e));
      if (err.message.includes("not found")) {
        return res.status(404).json({ success: false, error: err.message });
      }
      res.status(500).json({ success: false, error: err.message });
    }
  };
  router.put("/:id", updateHandler);
  router.patch("/:id", updateHandler);

  // DELETE /:id
  router.delete("/:id", async (req: Request, res: Response) => {
    try {
      const id = safeId(req.params.id);
      await repository.delete(id);
      res.status(204).send();
    } catch (e) {
      const err = e instanceof Error ? e : new Error(String(e));
      res.status(500).json({ success: false, error: err.message });
    }
  });

  return router;
}
