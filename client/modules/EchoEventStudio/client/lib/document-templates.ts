export type DocumentTemplateKind = "beo" | "contract" | "proposal";

export type BeoTemplateBlock =
  | { id: string; type: "section"; title: string }
  | {
      id: string;
      type: "kv";
      title?: string;
      fields: Array<{ label: string; path: string }>;
    }
  | { id: string; type: "layoutSummary"; title?: string }
  | { id: string; type: "itemsTable"; title?: string }
  | { id: string; type: "notes"; title?: string }
  | { id: string; type: "spacer"; height: number }
  | { id: string; type: "pageBreak" };

export interface DocumentTemplate {
  id: string;
  kind: DocumentTemplateKind;
  name: string;
  version: number;
  updatedAt: string;
  blocks: BeoTemplateBlock[];
}

const STORAGE_KEY = "luccca.doc.templates.v1";

function uid(prefix: string) {
  try {
    // Browser crypto
    return `${prefix}_${crypto.randomUUID()}`;
  } catch {
    return `${prefix}_${Math.random().toString(36).slice(2)}_${Date.now().toString(36)}`;
  }
}

function defaultBeoTemplate(): DocumentTemplate {
  return {
    id: "tpl_beo_default_v1",
    kind: "beo",
    name: "Banquet Event Order (Default)",
    version: 1,
    updatedAt: new Date().toISOString(),
    blocks: [
      { id: uid("blk"), type: "section", title: "Event Summary" },
      {
        id: uid("blk"),
        type: "kv",
        fields: [
          { label: "Event", path: "event.name" },
          { label: "Date", path: "event.date" },
          { label: "Covers", path: "event.covers" },
        ],
      },
      { id: uid("blk"), type: "section", title: "Layout Summary" },
      { id: uid("blk"), type: "layoutSummary" },
      { id: uid("blk"), type: "section", title: "Items" },
      { id: uid("blk"), type: "itemsTable" },
      { id: uid("blk"), type: "section", title: "Notes" },
      { id: uid("blk"), type: "notes" },
    ],
  };
}

function readAll(): DocumentTemplate[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as DocumentTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeAll(templates: DocumentTemplate[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(templates));
}

export function listDocumentTemplates(
  kind?: DocumentTemplateKind,
): DocumentTemplate[] {
  const existing = readAll();
  const hasDefault = existing.some((t) => t.id === "tpl_beo_default_v1");
  const next = hasDefault ? existing : [defaultBeoTemplate(), ...existing];
  if (!hasDefault) writeAll(next);
  return kind ? next.filter((t) => t.kind === kind) : next;
}

export function getDocumentTemplate(id: string): DocumentTemplate | null {
  return listDocumentTemplates().find((t) => t.id === id) || null;
}

export function saveDocumentTemplate(
  template: DocumentTemplate,
): DocumentTemplate {
  const all = listDocumentTemplates();
  const updated: DocumentTemplate = {
    ...template,
    updatedAt: new Date().toISOString(),
  };
  const next = [updated, ...all.filter((t) => t.id !== template.id)];
  writeAll(next);
  return updated;
}

export function duplicateDocumentTemplate(id: string): DocumentTemplate | null {
  const tpl = getDocumentTemplate(id);
  if (!tpl) return null;
  const copy: DocumentTemplate = {
    ...tpl,
    id: uid("tpl"),
    name: `${tpl.name} (Copy)`,
    version: 1,
    updatedAt: new Date().toISOString(),
    blocks: tpl.blocks.map((b) => ({ ...b, id: uid("blk") }) as any),
  };
  saveDocumentTemplate(copy);
  return copy;
}

export function deleteDocumentTemplate(id: string): void {
  // Protect built-in default template.
  if (id === "tpl_beo_default_v1") return;
  const all = listDocumentTemplates();
  writeAll(all.filter((t) => t.id !== id));
}
