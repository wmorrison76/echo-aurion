import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface PositionsState {
  positions: string[];
  addPosition: (name: string) => void;
  removePosition: (name: string) => void;
}

const DEFAULTS = [
  'Prep Cook','Production Cook','Garde Manger','Saucier','Butcher','Asst Saucier','Grill','Sauté','Bake','Plating','Dish/Steward'
];

export const usePositionsStore = create<PositionsState>()(persist((set,get)=>({
  positions: (()=>{ try{ const raw=localStorage.getItem('scheduling:positions'); return raw? JSON.parse(raw): DEFAULTS; }catch{ return DEFAULTS; } })(),
  addPosition: (name)=> set(s=> ({ positions: Array.from(new Set([...s.positions, name])).sort() })),
  removePosition: (name)=> set(s=> ({ positions: s.positions.filter(p=> p!==name) })),
}), { name: 'scheduling.positions' }));

export default usePositionsStore;
