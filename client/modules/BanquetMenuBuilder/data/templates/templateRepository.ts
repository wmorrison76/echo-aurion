/**
 * data/templates/templateRepository.ts
 * ----------------------------------------------------------------------------
 * Repository for menu templates. Handles:
 *
 *   - Reading the system template catalog (in-memory)
 *   - Reading/writing property-authored templates (persisted)
 *   - Reading network templates (highest-rated templates from peer
 *     properties, anonymized)
 *
 * Persistence layer:
 *   The repository delegates persistence to the LUCCCA framework's
 *   storage adapter. We don't reach into IndexedDB or the network
 *   directly — the framework handles cache/sync/auth.
 *
 * Why a repository (and not direct service calls):
 *   This abstraction lets us swap storage backends later without
 *   touching hooks/components. Today: IndexedDB + remote sync. Tomorrow:
 *   something else.
 * ----------------------------------------------------------------------------
 */

import type { MenuTemplate } from '../../BanquetMenuBuilder.p5.types';
import { SYSTEM_TEMPLATES } from './systemTemplates';

// ----------------------------------------------------------------------------
// Storage adapter — bridge to LUCCCA framework storage
// ----------------------------------------------------------------------------

interface TemplateStorageAdapter {
  listProperty(): Promise<MenuTemplate[]>;
  getById(id: string): Promise<MenuTemplate | null>;
  upsert(template: MenuTemplate): Promise<MenuTemplate>;
  remove(id: string): Promise<void>;
  /** Network templates — top-rated cross-property templates, anonymized */
  listNetwork(opts: { category?: string; limit?: number }): Promise<MenuTemplate[]>;
}

/**
 * Default adapter — uses the LUCCCA framework's storage.
 * The framework injects the real adapter at app boot. Until then we
 * fall back to a memory-only adapter so dev environments work without
 * a backend.
 */
let storage: TemplateStorageAdapter = createMemoryAdapter();

export function setTemplateStorageAdapter(adapter: TemplateStorageAdapter): void {
  storage = adapter;
}

// ----------------------------------------------------------------------------
// Public repository API
// ----------------------------------------------------------------------------

export const templateRepository = {
  /** All templates available to this property: system + property + network */
  async listAll(opts: ListOptions = {}): Promise<MenuTemplate[]> {
    const [propertyTemplates, networkTemplates] = await Promise.all([
      storage.listProperty(),
      opts.includeNetwork ? storage.listNetwork({ category: opts.category, limit: 24 }) : Promise.resolve([]),
    ]);

    let all = [...SYSTEM_TEMPLATES, ...propertyTemplates, ...networkTemplates];

    if (opts.category) {
      all = all.filter((t) => t.category === opts.category);
    }
    if (opts.eventType) {
      all = all.filter((t) => t.eventType === opts.eventType);
    }
    if (opts.styleTagAny && opts.styleTagAny.length) {
      all = all.filter((t) =>
        t.styleTags.some((tag) => opts.styleTagAny!.includes(tag)),
      );
    }
    if (opts.budgetPerGuest !== undefined) {
      all = all.filter(
        (t) =>
          opts.budgetPerGuest! >= t.budgetBand.low &&
          opts.budgetPerGuest! <= t.budgetBand.high,
      );
    }
    return all;
  },

  /** Just system templates (synchronous) */
  listSystem(): MenuTemplate[] {
    return [...SYSTEM_TEMPLATES];
  },

  async listProperty(): Promise<MenuTemplate[]> {
    return storage.listProperty();
  },

  async listNetwork(opts: { category?: string; limit?: number } = {}): Promise<MenuTemplate[]> {
    return storage.listNetwork(opts);
  },

  async getById(id: string): Promise<MenuTemplate | null> {
    // System lookup short-circuits storage call
    if (id.startsWith('sys-')) {
      return SYSTEM_TEMPLATES.find((t) => t.id === id) ?? null;
    }
    return storage.getById(id);
  },

  async save(template: MenuTemplate): Promise<MenuTemplate> {
    if (template.source === 'system') {
      throw new Error('Cannot modify a system template. Clone it first.');
    }
    const updated: MenuTemplate = {
      ...template,
      updatedAt: new Date().toISOString(),
    };
    return storage.upsert(updated);
  },

  /** Clone a system or network template into the property's library */
  async clone(sourceId: string, newName: string): Promise<MenuTemplate> {
    const source = await this.getById(sourceId);
    if (!source) throw new Error(`Template not found: ${sourceId}`);

    const cloned: MenuTemplate = {
      ...source,
      id: generateTemplateId(),
      name: newName,
      source: 'property',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      author: 'You',
    };
    return storage.upsert(cloned);
  },

  async remove(id: string): Promise<void> {
    if (id.startsWith('sys-')) {
      throw new Error('Cannot delete a system template.');
    }
    await storage.remove(id);
  },
};

// ----------------------------------------------------------------------------
// Filter options
// ----------------------------------------------------------------------------

interface ListOptions {
  category?: string;
  eventType?: string;
  styleTagAny?: string[];
  budgetPerGuest?: number;
  includeNetwork?: boolean;
}

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function generateTemplateId(): string {
  return `tmpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

// ----------------------------------------------------------------------------
// In-memory adapter (development fallback)
// ----------------------------------------------------------------------------

function createMemoryAdapter(): TemplateStorageAdapter {
  const propertyTemplates = new Map<string, MenuTemplate>();

  return {
    async listProperty() {
      return [...propertyTemplates.values()];
    },
    async getById(id) {
      return propertyTemplates.get(id) ?? null;
    },
    async upsert(template) {
      propertyTemplates.set(template.id, template);
      return template;
    },
    async remove(id) {
      propertyTemplates.delete(id);
    },
    async listNetwork() {
      // Memory adapter has no network templates
      return [];
    },
  };
}
