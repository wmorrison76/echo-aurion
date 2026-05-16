import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type HourFormat = '12' | '24';

export type RowItem = { type: 'emp'; id: string } | { type: 'sep'; id: string; label: string; color?: string };

export interface UnionRules {
  enabled: boolean;
  overtimeAfterHours: number; // e.g., 8
  doubletimeAfterHours: number; // e.g., 12
  minTurnaroundHours: number; // e.g., 10
  maxDaysPerWeek: number; // e.g., 6
  mealBreakEveryHours: number; // e.g., 5
}

export type ConditionType = 'startBefore' | 'startAfter' | 'endAfter' | 'durationGte' | 'roleIs' | 'positionIncludes' | 'dayIs' | 'unassigned';
export interface ConditionalRule { id: string; type: ConditionType; value: string | number; color: string; label?: string; enabled?: boolean; }

interface ScheduleSettings {
  startDay: number; // 0=Sun..6=Sat
  hourFormat: HourFormat;
  rowItems: RowItem[];
  weeklyLaborBudget?: number; // $ for the week
  unionRules: UnionRules;
  logoUrl?: string;
  conditionalRules: ConditionalRule[];
  setStartDay: (d: number) => void;
  setHourFormat: (f: HourFormat) => void;
  setRowItems: (items: RowItem[]) => void;
  addSeparator: (label?: string) => string;
  updateSeparator: (id: string, label: string) => void;
  setSeparatorColor: (id: string, color?: string)=> void;
  moveRow: (from: number, to: number) => void;
  setWeeklyLaborBudget: (v: number)=> void;
  setUnionRules: (rules: Partial<UnionRules>)=> void;
  setLogoUrl: (url?: string)=> void;
  addConditionalRule: (r: Omit<ConditionalRule,'id'>)=> string;
  updateConditionalRule: (id: string, patch: Partial<ConditionalRule>)=> void;
  removeConditionalRule: (id: string)=> void;
}

function uid(){ try{ return crypto.randomUUID(); }catch{ return Math.random().toString(36).slice(2);} }

export const useScheduleSettings = create<ScheduleSettings>()(persist((set,get)=>({
  startDay: 1,
  hourFormat: '12',
  rowItems: [],
  weeklyLaborBudget: 0,
  unionRules: { enabled:false, overtimeAfterHours:8, doubletimeAfterHours:12, minTurnaroundHours:10, maxDaysPerWeek:6, mealBreakEveryHours:5 },
  logoUrl: undefined,
  conditionalRules: [],
  setStartDay: (d)=> set({ startDay: Math.max(0, Math.min(6, d|0)) }),
  setHourFormat: (f)=> set({ hourFormat: f }),
  setRowItems: (items)=> set({ rowItems: items }),
  addSeparator: (label)=>{ const id=uid(); const items=[...get().rowItems, { type:'sep', id, label: label || '', color: '#e2e8f0' } as RowItem]; set({ rowItems: items }); return id; },
  updateSeparator: (id,label)=> set({ rowItems: get().rowItems.map(it=> it.type==='sep' && it.id===id? { ...it, label }: it) }),
  setSeparatorColor: (id,color)=> set({ rowItems: get().rowItems.map(it=> it.type==='sep' && it.id===id? { ...it, color }: it) }),
  moveRow: (from,to)=>{ const items=[...get().rowItems]; if(from<0||from>=items.length) return; const [m]=items.splice(from,1); const t=Math.max(0,Math.min(items.length,to)); items.splice(t,0,m); set({ rowItems: items }); },
  setWeeklyLaborBudget: (v)=> set({ weeklyLaborBudget: Math.max(0, v||0) }),
  setUnionRules: (rules)=> set({ unionRules: { ...get().unionRules, ...rules } }),
  setLogoUrl: (url)=> set({ logoUrl: url }),
  addConditionalRule: (r)=>{ const id=uid(); set(state=> ({ conditionalRules: [...state.conditionalRules, { ...r, id, enabled: r.enabled ?? true }] })); return id; },
  updateConditionalRule: (id,patch)=> set(state=> ({ conditionalRules: state.conditionalRules.map(x=> x.id===id? { ...x, ...patch } : x) })),
  removeConditionalRule: (id)=> set(state=> ({ conditionalRules: state.conditionalRules.filter(x=> x.id!==id) })),
}), { name: 'scheduling.settings' }));

export default useScheduleSettings;
