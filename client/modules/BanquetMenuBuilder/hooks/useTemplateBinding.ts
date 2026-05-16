/**
 * hooks/useTemplateBinding.ts
 * ----------------------------------------------------------------------------
 * Hook that provides:
 *   - The list of templates filtered by current event context
 *   - Bind-and-apply action that resolves a template's slots and returns
 *     a GeneratedMenu the composition can apply via replaceWithGenerated
 *
 * Caching:
 *   Template lists are cached in component state — repository handles its
 *   own storage layer caching. We refetch on filter changes.
 * ----------------------------------------------------------------------------
 */

import { useState, useEffect, useCallback } from 'react';
import { templateRepository } from '../data/templates/templateRepository';
import {
  bindTemplate,
  type BoundTemplate,
  type BindOptions,
} from '../services/templateBindingService';
import type { MenuTemplate, TemplateCategory } from '../BanquetMenuBuilder.p5.types';
import type { GeneratedMenu } from '../services/echoGenerateService';

interface UseTemplateBindingOptions {
  category?: TemplateCategory;
  eventType?: string;
  budgetPerGuest?: number;
  /** Whether to include network templates */
  includeNetwork?: boolean;
}

interface UseTemplateBindingResult {
  templates: MenuTemplate[];
  isLoading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
  /** Bind a template against the property's library; returns BoundTemplate */
  bind: (template: MenuTemplate, opts?: BindOptions) => Promise<BoundTemplate>;
  /**
   * Bind + convert to GeneratedMenu shape (so composition.replaceWithGenerated
   * can consume it directly).
   */
  bindAsGeneratedMenu: (
    template: MenuTemplate,
    opts?: BindOptions,
  ) => Promise<GeneratedMenu>;
  /** Save current bound template as a new property template */
  saveAsTemplate: (input: SaveTemplateInput) => Promise<MenuTemplate>;
  /** Clone a system/network template into the property's library */
  cloneTemplate: (sourceId: string, newName: string) => Promise<MenuTemplate>;
}

interface SaveTemplateInput {
  name: string;
  category: TemplateCategory;
  eventType: string;
  styleTags: string[];
  budgetBand: { low: number; high: number; currency: string };
  guestCountBand: { min: number; max: number };
  sections: MenuTemplate['sections'];
  subtitle?: string;
  brandOverlay?: MenuTemplate['brandOverlay'];
}

export function useTemplateBinding(
  options: UseTemplateBindingOptions = {},
): UseTemplateBindingResult {
  const [templates, setTemplates] = useState<MenuTemplate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const list = await templateRepository.listAll({
        category: options.category,
        eventType: options.eventType,
        budgetPerGuest: options.budgetPerGuest,
        includeNetwork: options.includeNetwork,
      });
      setTemplates(list);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      setError(msg);
      setTemplates([]);
    } finally {
      setIsLoading(false);
    }
  }, [options.category, options.eventType, options.budgetPerGuest, options.includeNetwork]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const bind = useCallback(
    async (template: MenuTemplate, opts?: BindOptions): Promise<BoundTemplate> => {
      return bindTemplate(template, opts);
    },
    [],
  );

  const bindAsGeneratedMenu = useCallback(
    async (template: MenuTemplate, opts?: BindOptions): Promise<GeneratedMenu> => {
      const bound = await bindTemplate(template, opts);
      return convertBoundToGeneratedMenu(bound, template);
    },
    [],
  );

  const saveAsTemplate = useCallback(
    async (input: SaveTemplateInput): Promise<MenuTemplate> => {
      const newTemplate: MenuTemplate = {
        id: `tmpl-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
        name: input.name,
        eventType: input.eventType,
        subtitle: input.subtitle,
        category: input.category,
        styleTags: input.styleTags,
        budgetBand: input.budgetBand,
        guestCountBand: input.guestCountBand,
        sections: input.sections,
        brandOverlay: input.brandOverlay,
        source: 'property',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        author: 'You',
      };
      const saved = await templateRepository.save(newTemplate);
      await refresh();
      return saved;
    },
    [refresh],
  );

  const cloneTemplate = useCallback(
    async (sourceId: string, newName: string): Promise<MenuTemplate> => {
      const cloned = await templateRepository.clone(sourceId, newName);
      await refresh();
      return cloned;
    },
    [refresh],
  );

  return {
    templates,
    isLoading,
    error,
    refresh,
    bind,
    bindAsGeneratedMenu,
    saveAsTemplate,
    cloneTemplate,
  };
}

// ----------------------------------------------------------------------------
// Convert BoundTemplate → GeneratedMenu shape so composition can replace
// ----------------------------------------------------------------------------

function convertBoundToGeneratedMenu(
  bound: BoundTemplate,
  template: MenuTemplate,
): GeneratedMenu {
  return {
    title: template.name,
    rationale: template.subtitle,
    eventType: template.eventType,
    guestCount: 0, // template doesn't dictate; user retains current
    budgetPerGuest: (template.budgetBand.low + template.budgetBand.high) / 2,
    estimatedPerGuest: bound.estimatedPerGuest,
    sections: bound.sections.map((s) => ({
      kind: s.kind,
      label: s.label,
      items: s.items.map((it) => ({
        itemId: it.id,
        name: it.name,
        shortDescription: it.description,
        dietaryTags: it.dietaryTags,
        estimatedCostPerGuest: extractPerGuest(it.cost),
      })),
    })),
  };
}

function extractPerGuest(cost: { rawFoodCostPerGuest?: number; rawFoodCostPerUnit?: number; portionPerGuest?: number; yieldFactor?: number } | undefined): number | undefined {
  if (!cost) return undefined;
  if (cost.rawFoodCostPerGuest !== undefined) return cost.rawFoodCostPerGuest;
  if (cost.rawFoodCostPerUnit !== undefined && cost.portionPerGuest !== undefined) {
    const yieldF = cost.yieldFactor ?? 1;
    if (yieldF <= 0) return undefined;
    return (cost.rawFoodCostPerUnit / yieldF) * cost.portionPerGuest;
  }
  return undefined;
}
