/**
 * useCompositionStore.ts
 * ----------------------------------------------------------------------------
 * The single source of truth for the right-panel composition canvas.
 *
 * Architecture note (read this before modifying):
 *   Every live calculation (pricing, dietary, operational load) derives from
 *   this store. Do NOT introduce parallel state for derived values. If you
 *   need a new computed surface, add a selector here.
 *
 *   We intentionally avoid Redux Toolkit for this module. Zustand gives us:
 *     - No Provider wrapper required (plays nicely with LUCCCA's panel
 *       registration — each module is mounted independently)
 *     - Selector-based subscriptions (sections re-render only when their
 *       slice changes; the entire canvas does not re-render on every drag)
 *     - Trivial integration with @dnd-kit (no middleware required)
 *
 * Persistence:
 *   The store auto-syncs to MongoDB via compositionPersistence.ts on a
 *   debounced timer. The debounce is intentional — we do NOT want a write
 *   on every drag pixel. See `services/compositionPersistence.ts`.
 * ----------------------------------------------------------------------------
 */

import { create } from 'zustand';
import { subscribeWithSelector } from 'zustand/middleware';
import { nanoid } from 'nanoid';
import type {
  PropertyItem,
  MenuSection as MenuSectionType,
  MenuDraft,
  PricingModel,
  DietaryTag,
  CanvasSnapshot,
} from '../BanquetMenuBuilder.types';
import { DEFAULT_SECTIONS_BY_EVENT_TYPE } from '../utils/sectionDefaults';
import { toCanvasSnapshot } from '../services/snapshotAdapter';

// ----------------------------------------------------------------------------
// Types — local to the store
// ----------------------------------------------------------------------------

export interface ComposedItem {
  /** Unique instance id within this menu (NOT the PropertyItem.itemId) */
  instanceId: string;
  /** The PropertyItem this composed entry references */
  itemId: string;
  /** Flattened snapshot at compose time — protects against catalog edits */
  itemSnapshot: CanvasSnapshot;
  /** Optional override for this menu only (does not mutate the catalog) */
  priceOverride?: number;
  /** Optional chef notes attached to this instance */
  notes?: string;
  /** Sort order within its section */
  order: number;
}

export interface ComposedSection {
  id: string;
  name: string;
  /** Stable key — used for default-section detection */
  kind: MenuSectionType;
  order: number;
  itemInstanceIds: string[];
}

export interface CompositionMeta {
  /** The MenuDraft document id (set on first save) */
  draftId: string | null;
  /** Property this menu belongs to */
  propertyId: string;
  /** Event type drives default sections + Echo behavior */
  eventType: string;
  /** Guest count — required for per-guest math */
  guestCount: number;
  /** Per-guest budget target — drives the budget bar */
  budgetPerGuest: number;
  /** Total budget cap (denormalized for speed) */
  budgetTotal: number;
  /** Currency code — defaults to USD */
  currency: string;
  /** Last server sync timestamp */
  lastSyncedAt: number | null;
  /** Local dirty flag — true between user edit and successful sync */
  isDirty: boolean;
}

export interface CompositionState {
  // ---- Data ----
  meta: CompositionMeta;
  sections: Record<string, ComposedSection>;
  items: Record<string, ComposedItem>;

  // ---- UI ----
  activeSectionId: string | null;
  draggingItemId: string | null;

  // ---- Mutations: meta ----
  setMeta: (meta: Partial<CompositionMeta>) => void;
  setGuestCount: (count: number) => void;
  setBudgetPerGuest: (amount: number) => void;

  // ---- Mutations: sections ----
  addSection: (kind: MenuSectionType, name?: string) => string;
  renameSection: (sectionId: string, name: string) => void;
  removeSection: (sectionId: string) => void;
  reorderSections: (orderedIds: string[]) => void;

  // ---- Mutations: items ----
  addItemToSection: (item: PropertyItem, sectionId: string, index?: number) => string;
  removeItem: (instanceId: string) => void;
  moveItem: (instanceId: string, toSectionId: string, toIndex: number) => void;
  reorderItemsWithinSection: (sectionId: string, orderedInstanceIds: string[]) => void;
  setItemPriceOverride: (instanceId: string, price: number | undefined) => void;
  setItemNotes: (instanceId: string, notes: string) => void;

  // ---- UI ----
  setActiveSection: (sectionId: string | null) => void;
  setDraggingItem: (instanceId: string | null) => void;

  // ---- Lifecycle ----
  hydrateFromDraft: (draft: MenuDraft) => void;
  initializeForEvent: (args: {
    propertyId: string;
    eventType: string;
    guestCount: number;
    budgetPerGuest: number;
    currency?: string;
  }) => void;
  reset: () => void;
}

// ----------------------------------------------------------------------------
// Initial state
// ----------------------------------------------------------------------------

const initialMeta: CompositionMeta = {
  draftId: null,
  propertyId: '',
  eventType: '',
  guestCount: 0,
  budgetPerGuest: 0,
  budgetTotal: 0,
  currency: 'USD',
  lastSyncedAt: null,
  isDirty: false,
};

// ----------------------------------------------------------------------------
// Store
// ----------------------------------------------------------------------------

export const useCompositionStore = create<CompositionState>()(
  subscribeWithSelector((set, get) => ({
    meta: initialMeta,
    sections: {},
    items: {},
    activeSectionId: null,
    draggingItemId: null,

    // ---- Meta ----
    setMeta: (partial) =>
      set((state) => ({
        meta: { ...state.meta, ...partial, isDirty: true },
      })),

    setGuestCount: (count) =>
      set((state) => ({
        meta: {
          ...state.meta,
          guestCount: Math.max(0, Math.floor(count)),
          budgetTotal: Math.max(0, Math.floor(count)) * state.meta.budgetPerGuest,
          isDirty: true,
        },
      })),

    setBudgetPerGuest: (amount) =>
      set((state) => ({
        meta: {
          ...state.meta,
          budgetPerGuest: Math.max(0, amount),
          budgetTotal: state.meta.guestCount * Math.max(0, amount),
          isDirty: true,
        },
      })),

    // ---- Sections ----
    addSection: (kind, name) => {
      const id = `sec_${nanoid(10)}`;
      set((state) => {
        const currentMaxOrder = Object.values(state.sections).reduce(
          (max, s) => Math.max(max, s.order),
          -1,
        );
        return {
          sections: {
            ...state.sections,
            [id]: {
              id,
              name: name ?? defaultSectionName(kind),
              kind,
              order: currentMaxOrder + 1,
              itemInstanceIds: [],
            },
          },
          activeSectionId: state.activeSectionId ?? id,
          meta: { ...state.meta, isDirty: true },
        };
      });
      return id;
    },

    renameSection: (sectionId, name) =>
      set((state) => {
        const section = state.sections[sectionId];
        if (!section) return state;
        return {
          sections: {
            ...state.sections,
            [sectionId]: { ...section, name },
          },
          meta: { ...state.meta, isDirty: true },
        };
      }),

    removeSection: (sectionId) =>
      set((state) => {
        const section = state.sections[sectionId];
        if (!section) return state;
        // Remove the section AND all items within it
        const remainingItems = { ...state.items };
        for (const instanceId of section.itemInstanceIds) {
          delete remainingItems[instanceId];
        }
        const remainingSections = { ...state.sections };
        delete remainingSections[sectionId];
        return {
          sections: remainingSections,
          items: remainingItems,
          activeSectionId:
            state.activeSectionId === sectionId
              ? firstSectionId(remainingSections)
              : state.activeSectionId,
          meta: { ...state.meta, isDirty: true },
        };
      }),

    reorderSections: (orderedIds) =>
      set((state) => {
        const next = { ...state.sections };
        orderedIds.forEach((id, idx) => {
          if (next[id]) next[id] = { ...next[id], order: idx };
        });
        return { sections: next, meta: { ...state.meta, isDirty: true } };
      }),

    // ---- Items ----
    addItemToSection: (item, sectionId, index) => {
      const instanceId = `inst_${nanoid(12)}`;
      set((state) => {
        const section = state.sections[sectionId];
        if (!section) return state;
        const insertAt = index ?? section.itemInstanceIds.length;
        const nextIds = [...section.itemInstanceIds];
        nextIds.splice(insertAt, 0, instanceId);
        return {
          items: {
            ...state.items,
            [instanceId]: {
              instanceId,
              itemId: item.itemId,
              itemSnapshot: toCanvasSnapshot(item),
              order: insertAt,
            },
          },
          sections: {
            ...state.sections,
            [sectionId]: { ...section, itemInstanceIds: nextIds },
          },
          meta: { ...state.meta, isDirty: true },
        };
      });
      return instanceId;
    },

    removeItem: (instanceId) =>
      set((state) => {
        if (!state.items[instanceId]) return state;
        const nextItems = { ...state.items };
        delete nextItems[instanceId];
        // Strip the instance from whichever section holds it
        const nextSections = { ...state.sections };
        for (const [sid, sec] of Object.entries(nextSections)) {
          if (sec.itemInstanceIds.includes(instanceId)) {
            nextSections[sid] = {
              ...sec,
              itemInstanceIds: sec.itemInstanceIds.filter((id) => id !== instanceId),
            };
            break;
          }
        }
        return {
          items: nextItems,
          sections: nextSections,
          meta: { ...state.meta, isDirty: true },
        };
      }),

    moveItem: (instanceId, toSectionId, toIndex) =>
      set((state) => {
        const fromEntry = Object.entries(state.sections).find(([, s]) =>
          s.itemInstanceIds.includes(instanceId),
        );
        if (!fromEntry) return state;
        const [fromSectionId] = fromEntry;
        const toSection = state.sections[toSectionId];
        if (!toSection) return state;

        const nextSections = { ...state.sections };

        // Remove from origin
        nextSections[fromSectionId] = {
          ...nextSections[fromSectionId],
          itemInstanceIds: nextSections[fromSectionId].itemInstanceIds.filter(
            (id) => id !== instanceId,
          ),
        };

        // Insert at destination
        const destIds = [...nextSections[toSectionId].itemInstanceIds];
        const clampedIndex = Math.max(0, Math.min(toIndex, destIds.length));
        // If moving within same section, the removal above already mutated;
        // re-fetch from nextSections to avoid stale reference.
        if (fromSectionId === toSectionId) {
          const within = [...nextSections[fromSectionId].itemInstanceIds];
          within.splice(clampedIndex, 0, instanceId);
          nextSections[toSectionId] = {
            ...nextSections[toSectionId],
            itemInstanceIds: within,
          };
        } else {
          destIds.splice(clampedIndex, 0, instanceId);
          nextSections[toSectionId] = {
            ...nextSections[toSectionId],
            itemInstanceIds: destIds,
          };
        }

        return {
          sections: nextSections,
          meta: { ...state.meta, isDirty: true },
        };
      }),

    reorderItemsWithinSection: (sectionId, orderedInstanceIds) =>
      set((state) => {
        const section = state.sections[sectionId];
        if (!section) return state;
        return {
          sections: {
            ...state.sections,
            [sectionId]: { ...section, itemInstanceIds: orderedInstanceIds },
          },
          meta: { ...state.meta, isDirty: true },
        };
      }),

    setItemPriceOverride: (instanceId, price) =>
      set((state) => {
        const item = state.items[instanceId];
        if (!item) return state;
        return {
          items: {
            ...state.items,
            [instanceId]: { ...item, priceOverride: price },
          },
          meta: { ...state.meta, isDirty: true },
        };
      }),

    setItemNotes: (instanceId, notes) =>
      set((state) => {
        const item = state.items[instanceId];
        if (!item) return state;
        return {
          items: { ...state.items, [instanceId]: { ...item, notes } },
          meta: { ...state.meta, isDirty: true },
        };
      }),

    // ---- UI ----
    setActiveSection: (sectionId) => set({ activeSectionId: sectionId }),
    setDraggingItem: (instanceId) => set({ draggingItemId: instanceId }),

    // ---- Lifecycle ----
    hydrateFromDraft: (draft) => {
      const sections: Record<string, ComposedSection> = {};
      const items: Record<string, ComposedItem> = {};
      draft.sections.forEach((s, idx) => {
        const sectionId = s.id ?? `sec_${nanoid(10)}`;
        const instanceIds: string[] = [];
        s.items.forEach((entry, itemIdx) => {
          const instanceId = entry.instanceId ?? `inst_${nanoid(12)}`;
          items[instanceId] = {
            instanceId,
            itemId: entry.itemId,
            itemSnapshot: entry.itemSnapshot,
            priceOverride: entry.priceOverride,
            notes: entry.notes,
            order: itemIdx,
          };
          instanceIds.push(instanceId);
        });
        sections[sectionId] = {
          id: sectionId,
          name: s.name,
          kind: s.kind,
          order: idx,
          itemInstanceIds: instanceIds,
        };
      });
      set({
        meta: {
          draftId: draft.id,
          propertyId: draft.propertyId,
          eventType: draft.eventType,
          guestCount: draft.guestCount,
          budgetPerGuest: draft.budgetPerGuest,
          budgetTotal: draft.guestCount * draft.budgetPerGuest,
          currency: draft.currency ?? 'USD',
          lastSyncedAt: Date.now(),
          isDirty: false,
        },
        sections,
        items,
        activeSectionId: firstSectionId(sections),
      });
    },

    initializeForEvent: ({ propertyId, eventType, guestCount, budgetPerGuest, currency }) => {
      const defaults = DEFAULT_SECTIONS_BY_EVENT_TYPE[eventType] ?? DEFAULT_SECTIONS_BY_EVENT_TYPE.default;
      const sections: Record<string, ComposedSection> = {};
      defaults.forEach((kind, idx) => {
        const id = `sec_${nanoid(10)}`;
        sections[id] = {
          id,
          name: defaultSectionName(kind),
          kind,
          order: idx,
          itemInstanceIds: [],
        };
      });
      set({
        meta: {
          draftId: null,
          propertyId,
          eventType,
          guestCount,
          budgetPerGuest,
          budgetTotal: guestCount * budgetPerGuest,
          currency: currency ?? 'USD',
          lastSyncedAt: null,
          isDirty: true,
        },
        sections,
        items: {},
        activeSectionId: firstSectionId(sections),
      });
    },

    reset: () =>
      set({
        meta: initialMeta,
        sections: {},
        items: {},
        activeSectionId: null,
        draggingItemId: null,
      }),
  })),
);

// ----------------------------------------------------------------------------
// Selectors — keep heavy derivations here so they memoize correctly
// ----------------------------------------------------------------------------

export const selectOrderedSections = (state: CompositionState): ComposedSection[] =>
  Object.values(state.sections).sort((a, b) => a.order - b.order);

export const selectItemsForSection = (
  state: CompositionState,
  sectionId: string,
): ComposedItem[] => {
  const section = state.sections[sectionId];
  if (!section) return [];
  return section.itemInstanceIds
    .map((id) => state.items[id])
    .filter((x): x is ComposedItem => Boolean(x));
};

export const selectAllComposedItems = (state: CompositionState): ComposedItem[] =>
  Object.values(state.items);

export const selectIsItemInMenu = (state: CompositionState, itemId: string): boolean =>
  Object.values(state.items).some((i) => i.itemId === itemId);

export const selectMenuItemCount = (state: CompositionState): number =>
  Object.keys(state.items).length;

// ----------------------------------------------------------------------------
// Helpers
// ----------------------------------------------------------------------------

function firstSectionId(sections: Record<string, ComposedSection>): string | null {
  const ordered = Object.values(sections).sort((a, b) => a.order - b.order);
  return ordered[0]?.id ?? null;
}

function defaultSectionName(kind: MenuSectionType): string {
  const map: Record<string, string> = {
    bakery: 'Bakery',
    cold: 'Cold Selection',
    hot: 'Hot Selection',
    carving: 'Carving Station',
    dessert: 'Dessert',
    beverage: 'Beverage',
    station: 'Action Station',
    canape: 'Canapés',
    appetizer: 'Appetizer',
    soup: 'Soup',
    salad: 'Salad',
    entree: 'Entrée',
    side: 'Side',
    other: 'Other',
  };
  return map[kind] ?? 'Section';
}
