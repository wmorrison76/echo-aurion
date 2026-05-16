import { create } from "zustand";

export type Obj = {
  id: string;
  type: string;
  position: [number, number, number];
  rotation?: [number, number, number];
  size?: [number, number, number];
  seats?: number;
  glCode?: string;
  costCenter?: string;
  meta?: Record<string, any>;
};

export type SceneStore = {
  objects: Obj[];
  setObjects: (objects: Obj[]) => void;
  updateObject: (id: string, patch: Partial<Obj>) => void;
  addObject: (obj: Obj) => void;
  removeObject: (id: string) => void;
  selectedId: string | null;
  setSelectedId: (id: string | null) => void;
};

export const useSceneStore = create<SceneStore>((set) => ({
  objects: [],
  selectedId: null,

  setObjects: (objects) => set({ objects }),

  updateObject: (id, patch) =>
    set((state) => ({
      objects: state.objects.map((obj) =>
        obj.id === id ? { ...obj, ...patch } : obj,
      ),
    })),

  addObject: (obj) =>
    set((state) => ({
      objects: [...state.objects, obj],
    })),

  removeObject: (id) =>
    set((state) => ({
      objects: state.objects.filter((obj) => obj.id !== id),
      selectedId: state.selectedId === id ? null : state.selectedId,
    })),

  setSelectedId: (id) => set({ selectedId: id }),
}));
