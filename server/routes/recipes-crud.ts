/**
 * Example: CRUD for recipes using the generic factory.
 * Before: 300 lines per resource. After: 5 lines per resource.
 * Plus: POST /import for LUCCCA batch import (JSON array).
 */

import { randomUUID } from "crypto";
import { z } from "zod";
import type { Recipe } from "../../../shared/types/recipe";
import type { PaginationParams, PaginatedResponse } from "../../../shared/types/base";
import { Repository } from "../../../shared/repository";
import { createCRUDRouter } from "../lib/crud-router";
import { getOrgId } from "../lib/org-resolver";
import type { Request, Response } from "express";

const PLACEHOLDER_CATEGORY_ID = "00000000-0000-4000-a000-000000000001";

const luccaImportSchema = z.object({
  recipes: z.array(
    z.object({
      title: z.string().optional(),
      name: z.string().optional(),
      description: z.string().optional(),
      ingredients: z.union([z.array(z.string()), z.array(z.record(z.unknown()))]).optional(),
      instructions: z.array(z.string()).optional(),
      steps: z.array(z.string()).optional(),
      tags: z.array(z.string()).optional(),
      extra: z.record(z.unknown()).optional(),
    })
  ),
});

// Minimal Zod schema for create/update (extend as needed)
const recipeSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  categoryId: z.string().uuid(),
  prepTime: z.number().min(0).default(0),
  cookTime: z.number().min(0).default(0),
  totalTime: z.number().min(0).default(0),
  servings: z.number().min(1).default(1),
  difficulty: z.enum(["easy", "medium", "hard", "expert"]).default("medium"),
  ingredientCost: z.number().min(0).default(0),
  laborCost: z.number().min(0).default(0),
  totalCost: z.number().min(0).default(0),
  costPerServing: z.number().min(0).default(0),
  status: z.enum(["draft", "testing", "approved", "archived"]).default("draft"),
  isDraft: z.boolean().default(true),
  version: z.number().min(1).default(1),
  createdBy: z.string().uuid().optional(),
  updatedBy: z.string().uuid().optional(),
  recipeAccess: z.array(z.string()).optional(),
  isGlobal: z.boolean().optional(),
  primaryPhotoUrl: z.string().url().optional().or(z.literal("")),
});

// In-memory repository (replace with DB-backed Repository<Recipe> in production)
class RecipeRepository extends Repository<Recipe> {
  private store = new Map<string, Recipe>();

  override async findById(id: string) {
    return this.store.get(id) ?? null;
  }

  override async list(params?: PaginationParams): Promise<PaginatedResponse<Recipe>> {
    const page = params?.page ?? 1;
    const limit = Math.min(params?.limit ?? 20, 100);
    const all = Array.from(this.store.values());
    const start = (page - 1) * limit;
    const data = all.slice(start, start + limit);
    const total = all.length;
    const totalPages = Math.ceil(total / limit);
    return {
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNext: page < totalPages,
        hasPrev: page > 1,
      },
    };
  }

  override async create(input: Omit<Recipe, keyof import("../../../shared/types/base").BaseEntity>): Promise<Recipe> {
    const now = new Date().toISOString();
    const id = randomUUID();
    const recipe: Recipe = {
      ...input,
      id,
      orgId: input.orgId!,
      createdAt: now,
      updatedAt: now,
    } as Recipe;
    this.store.set(id, recipe);
    return recipe;
  }

  override async update(id: string, data: Partial<Recipe>): Promise<Recipe> {
    const existing = this.store.get(id);
    if (!existing) throw new Error("Recipe not found");
    const updated: Recipe = {
      ...existing,
      ...data,
      updatedAt: new Date().toISOString(),
    };
    this.store.set(id, updated);
    return updated;
  }

  override async delete(id: string): Promise<void> {
    this.store.delete(id);
  }
}

const recipeRepo = new RecipeRepository();

// One factory, handles ALL your routes — 5 lines per resource
const crudRouter = createCRUDRouter<Recipe>({
  resource: "recipes",
  repository: recipeRepo,
  schema: recipeSchema,
});

// POST /import — batch import LUCCCA format (same system round-trip)
crudRouter.post("/import", async (req: Request, res: Response) => {
  try {
    const orgId = getOrgId(req);
    const parsed = luccaImportSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({
        success: false,
        error: "Validation failed",
        details: parsed.error.flatten(),
      });
    }
    const { recipes: items } = parsed.data;
    const ids: string[] = [];
    for (const item of items) {
      const name = (item.title || item.name || "Imported Recipe").trim() || "Imported Recipe";
      const description = item.description ?? (item.instructions?.length ? item.instructions.join("\n") : undefined);
      const tags = item.tags ?? (item.extra as Record<string, unknown>)?.tags as string[] | undefined;
      const recipeInput = {
        name,
        description: description?.slice(0, 2000),
        categoryId: PLACEHOLDER_CATEGORY_ID,
        prepTime: 0,
        cookTime: 0,
        totalTime: 0,
        servings: 1,
        difficulty: "medium" as const,
        ingredientCost: 0,
        laborCost: 0,
        totalCost: 0,
        costPerServing: 0,
        status: "draft" as const,
        isDraft: true,
        version: 1,
        orgId,
        recipeAccess: (item.extra as Record<string, unknown>)?.recipeAccess as string[] | undefined,
        isGlobal: (item.extra as Record<string, unknown>)?.isGlobal as boolean | undefined,
      };
      const created = await recipeRepo.create(recipeInput);
      ids.push(created.id);
    }
    return res.status(201).json({
      success: true,
      created: ids.length,
      ids,
    });
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    return res.status(500).json({ success: false, error: err.message });
  }
});

export const router = crudRouter;
