/** Menu domain types used by MenuBuilder and menu-packs. */

export type MenuPackKind = "FOH_SERVER_NOTES" | "BOH_PRODUCTION";

export interface MenuItemBinding {
  id: string;
  menuId: string;
  name: string;
  recipeId?: string;
  recipeName?: string;
  courseName?: string;
  yieldCount: number;
  portionSize?: string;
  productionNote?: string;
  allergieWarnings?: string[];
}

export interface Menu {
  menuId: string;
  title: string;
  items: MenuItemBinding[];
  eventId?: string | null;
  createdAtISO?: string;
  updatedAtISO?: string;
}

export interface MenuPack {
  id: string;
  menuId: string;
  versionId: string;
  kind: MenuPackKind;
  title: string;
  language: string;
  createdAtISO: string;
  metadata?: { season?: string; effectiveFrom?: string | null; effectiveTo?: string | null };
  items: MenuItemBinding[];
  notes: string[];
  sections: Record<string, string[]>;
}
