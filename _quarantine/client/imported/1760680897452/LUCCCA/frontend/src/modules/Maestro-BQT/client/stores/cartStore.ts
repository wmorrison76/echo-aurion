import { create } from 'zustand';
import { devtools } from 'zustand/middleware';

export type CartStage = 'butcher_prep_done' | 'received' | 'seasoned' | 'seared' | 'on_cart' | 'plated';

export interface CartItem {
  id: string;
  name: string; // e.g., Beef Tenderloin
  quantityDesc?: string; // e.g., 40 lb, 150 portions
  notes?: string;
  stage: CartStage;
  history: { at: string; action: string; by?: string }[];
}

export interface CartRack {
  id: string;
  rackNumber: string; // SR-XXX-CY-Z
  beoId: string; // reference BEO id or event id
  course: 1|2|3|4|5;
  status: 'staged' | 'prep' | 'ready' | 'service' | 'complete';
  location?: string;
  items: CartItem[];
}

interface CartState {
  racks: CartRack[];
  // Derived helpers
  racksForBeo: (beoId: string) => CartRack[];
  addRack: (rack: Omit<CartRack, 'id'> & { id?: string }) => string;
  addItemToBeo: (beoId: string, payload: { name: string; course?: 1|2|3|4|5; quantityDesc?: string; notes?: string }) => { rackId: string; itemId: string };
  updateItemStage: (rackId: string, itemId: string, stage: CartStage, by?: string) => void;
  moveRackStatus: (rackId: string, status: CartRack['status']) => void;
  removeItem: (rackId: string, itemId: string) => void;
  importFromButcher: (cut: { proteinName: string; finishedWeightLb: number; beoId?: string; courseGuess?: 1|2|3|4|5 }) => { rackId: string; itemId: string } | null;
}

function uid(){ try{ return crypto.randomUUID(); }catch{ return Math.random().toString(36).slice(2);} }

const STORAGE_KEY = 'cart-tracker:v1';

export const useCartStore = create<CartState>()(devtools((set, get)=>({
  racks: (()=>{ try{ const raw = localStorage.getItem(STORAGE_KEY); return raw? JSON.parse(raw) as CartRack[] : []; }catch{ return []; } })(),

  racksForBeo: (beoId)=> get().racks.filter(r=> r.beoId === beoId),

  addRack: (rack)=>{
    const id = rack.id || `rack-${uid()}`;
    const newRack: CartRack = { id, status: 'staged', course: 3, items: [], location: 'Main Kitchen', ...rack };
    set(s=> ({ racks: [newRack, ...s.racks] }));
    persist();
    return id;
  },

  addItemToBeo: (beoId, payload)=>{
    const course = payload.course || 3;
    // try to find existing rack for this beo + course with capacity (< 8 items)
    const existing = get().racks.find(r=> r.beoId===beoId && r.course===course && r.items.length < 8);
    const rackId = existing ? existing.id : get().addRack({
      rackNumber: generateRackNumber(beoId, course, sequenceForBeoCourse(beoId, course, get().racks)),
      beoId,
      course,
      status: 'staged',
      items: []
    });
    const itemId = uid();
    const item: CartItem = {
      id: itemId,
      name: payload.name,
      quantityDesc: payload.quantityDesc,
      notes: payload.notes,
      stage: 'butcher_prep_done',
      history: [{ at: new Date().toISOString(), action: 'butcher_prep_done' }]
    };
    set(s=> ({ racks: s.racks.map(r=> r.id===rackId ? { ...r, items: [item, ...r.items] } : r) }));
    persist();
    return { rackId, itemId };
  },

  updateItemStage: (rackId, itemId, stage, by)=>{
    set(s=> ({ racks: s.racks.map(r=> r.id!==rackId ? r : ({ ...r, items: r.items.map(it=> it.id!==itemId ? it : ({ ...it, stage, history: [...it.history, { at: new Date().toISOString(), action: stage, by }] })) })) }));
    persist();
  },

  moveRackStatus: (rackId, status)=>{
    set(s=> ({ racks: s.racks.map(r=> r.id===rackId ? { ...r, status } : r) }));
    persist();
  },

  removeItem: (rackId, itemId)=>{
    set(s=> ({ racks: s.racks.map(r=> r.id===rackId ? { ...r, items: r.items.filter(it=> it.id!==itemId) } : r) }));
    persist();
  },

  importFromButcher: (cut)=>{
    if(!cut.beoId) return null;
    const quantityDesc = `${cut.finishedWeightLb} lb`;
    const course = cut.courseGuess || 3;
    return get().addItemToBeo(cut.beoId, { name: cut.proteinName, quantityDesc, notes: 'from Butcher', course });
  }
})))

function persist(){ try{ localStorage.setItem(STORAGE_KEY, JSON.stringify(useCartStore.getState().racks)); }catch{} }

function sequenceForBeoCourse(beoId: string, course: 1|2|3|4|5, racks: CartRack[]): string {
  const count = racks.filter(r=> r.beoId===beoId && r.course===course).length;
  return String.fromCharCode(65 + count); // A,B,C
}

function generateRackNumber(beoId: string, course: 1|2|3|4|5, sequence: string){
  const tail = beoId.split('-').pop()?.slice(-3) || '001';
  return `SR-${tail}-C${course}-${sequence}`;
}

export default useCartStore;
