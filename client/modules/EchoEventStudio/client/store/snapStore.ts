import { create } from "zustand";
export type SnapPrefs = {
  gridSize: number;
  angleInc: number;
  objectTol: number;
};
export type SnapState = SnapPrefs & {
  setGridSize: (v: number) => void;
  setAngleInc: (v: number) => void;
  setObjectTol: (v: number) => void;
};
export const useSnapStore = create<SnapState>((set) => ({
  gridSize: 0.25,
  angleInc: 15,
  objectTol: 0.2,
  setGridSize: (v) => set({ gridSize: v }),
  setAngleInc: (v) => set({ angleInc: v }),
  setObjectTol: (v) => set({ objectTol: v }),
}));
