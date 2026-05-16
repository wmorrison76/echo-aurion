import type { MenuItemBinding } from "@shared/types/maestro";

export type { MenuItemBinding };

export interface Menu {
  menuId: string;
  title: string;
  items: MenuItemBinding[];
  eventId?: string | null;
  createdAtISO: string;
  updatedAtISO?: string | null;
}

export type MenuPackKind = "FOH_SERVER_NOTES" | "BOH_PRODUCTION";

export type MenuPackMetadata = {
  season?: string;
  effectiveFrom?: string | null;
  effectiveTo?: string | null;
};

export interface MenuPack {
  id: string;
  menuId: string;
  versionId: string;
  kind: MenuPackKind;
  title: string;
  language: string;
  createdAtISO: string;
  metadata: MenuPackMetadata;
  items: MenuItemBinding[];
  notes: string[];
  sections: Record<string, string[]>;
}

export interface MenuPublishResult {
  menu: Menu;
  packs: MenuPack[];
}
