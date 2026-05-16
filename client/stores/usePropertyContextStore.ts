/***
 * LUCCCA — BUILD 35 (Part 1)
 * usePropertyContextStore.ts
 *
 * PURPOSE:
 *  - Global selection for:
 *      - current property
 *      - current outlet (optional)
 *
 *  - All modules read from here to scope data queries.
 ***/

import { create } from "zustand";

export type Property = {
  id: string;
  name: string;
};

export type Outlet = {
  id: string;
  name: string;
  propertyId: string;
};

type PropertyContextState = {
  properties: Property[];
  outlets: Outlet[];

  currentPropertyId: string | null;
  currentOutletId: string | null;

  setCurrentProperty: (id: string | null) => void;
  setCurrentOutlet: (id: string | null) => void;
  loadInitial: (props: Property[], outs: Outlet[]) => void;
};

export const usePropertyContextStore = create<PropertyContextState>((set) => ({
  properties: [],
  outlets: [],
  currentPropertyId: null,
  currentOutletId: null,

  setCurrentProperty: (id) =>
    set((state) => ({
      currentPropertyId: id,
      currentOutletId:
        id && state.currentOutletId
          ? state.outlets.find(
              (o) => o.id === state.currentOutletId && o.propertyId === id
            )?.id || null
          : null,
    })),

  setCurrentOutlet: (id) =>
    set(() => ({
      currentOutletId: id,
    })),

  loadInitial: (props, outs) =>
    set(() => ({
      properties: props,
      outlets: outs,
      currentPropertyId: props[0]?.id || null,
      currentOutletId:
        outs.find((o) => o.propertyId === props[0]?.id)?.id || null,
    })),
}));
