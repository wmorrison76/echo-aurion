import { z } from "zod";

export const MenuItemBindingSchema = z
  .object({
    id: z.string(),
    menuId: z.string(),
    name: z.string(),
    recipeId: z.string(),
    recipeName: z.string().optional(),
    courseName: z.string().optional(),
    yieldCount: z.number(),
    portionSize: z.string().optional(),
    dietaryNotes: z.array(z.string()).optional(),
    allergieWarnings: z.array(z.string()).optional(),
    productionNote: z.string().optional(),
  })
  .passthrough();

export const MenuSchema = z.object({
  menuId: z.string(),
  title: z.string(),
  items: z.array(MenuItemBindingSchema),
  eventId: z.string().nullable().optional(),
  createdAtISO: z.string(),
  updatedAtISO: z.string().nullable().optional(),
});

export const MenuPackSchema = z.object({
  id: z.string(),
  menuId: z.string(),
  versionId: z.string(),
  kind: z.enum(["FOH_SERVER_NOTES", "BOH_PRODUCTION"]),
  title: z.string(),
  language: z.string(),
  createdAtISO: z.string(),
  metadata: z
    .object({
      season: z.string().optional(),
      effectiveFrom: z.string().nullable().optional(),
      effectiveTo: z.string().nullable().optional(),
    })
    .optional()
    .default({}),
  items: z.array(MenuItemBindingSchema),
  notes: z.array(z.string()),
  sections: z.record(z.array(z.string())),
});
