import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { uid } from './uid';

export interface Shift {
  id: string;
  date: string; // ISO date
  start: string; // HH:mm
  end: string; // HH:mm
  role: string;
  department?: string;
  employeeId?: string;
  employeeName?: string;
  positions?: string[]; // job positions for the shift/day
  leaveType?: 'PTO' | 'SICK';
  source?: 'auto'|'manual'|'imported';
  eventId?: string;
  notes?: string;
  swapRequested?: boolean;
  color?: string; // custom background color for the cell
}

interface AttendanceState {
  weekOf: string; // ISO date of Monday
  shifts: Shift[];
  publishedWeeks: Record<string, boolean>;
  weekNotes: Record<string, string>;
  setWeekOf: (iso: string) => void;
  addShift: (shift: Omit<Shift,'id'>) => string;
  updateShift: (id: string, patch: Partial<Shift>) => void;
  removeShift: (id: string) => void;
  clearWeek: (isoWeek: string) => void;
  copyWeek: (fromWeekIso: string, toWeekIso: string) => void;
  publishWeek: (isoWeek: string, v: boolean) => void;
  isPublished: (isoWeek: string) => boolean;
  setWeekNote: (isoWeek: string, note: string)=> void;
}

export const useAttendanceStore = create<AttendanceState>()(persist((set, get)=>({
  weekOf: '',
  shifts: [],
  publishedWeeks: {},
  weekNotes: {},
  setWeekOf: (iso)=> set({ weekOf: iso }),
  addShift: (s)=> { const id = uid(); set(state=> ({ shifts: [...state.shifts, { ...s, id }] })); return id; },
  updateShift: (id, patch)=> set(state=> ({ shifts: state.shifts.map(sh=> sh.id===id? { ...sh, ...patch } : sh) })),
  removeShift: (id)=> set(state=> ({ shifts: state.shifts.filter(sh=> sh.id!==id) })),
  clearWeek: (iso)=> set(state=> ({ shifts: state.shifts.filter(sh=> sh.date < iso || sh.date > addDaysIso(iso,6)) })),
  copyWeek: (from, to)=> set(state=> {
    const cloned = state.shifts
      .filter(sh=> sh.date >= from && sh.date <= addDaysIso(from,6))
      .map(sh=> ({ ...sh, id: uid(), date: addDaysIso(to, diffInDays(from, sh.date)) }));
    return { shifts: [...state.shifts, ...cloned] };
  }),
  publishWeek: (iso, v)=> set(state=> ({ publishedWeeks: { ...state.publishedWeeks, [iso]: v } })),
  isPublished: (iso)=> !!get().publishedWeeks[iso],
  setWeekNote: (iso, note)=> set(state=> ({ weekNotes: { ...state.weekNotes, [iso]: note } })),
}), { name: 'scheduling.attendance' }));

function addDaysIso(iso: string, days: number){ const d=new Date(iso+'T00:00:00'); d.setDate(d.getDate()+days); return d.toISOString().slice(0,10); }
function diffInDays(fromIso: string, toIso: string){ const a=new Date(fromIso+'T00:00:00'), b=new Date(toIso+'T00:00:00'); return Math.round((b.getTime()-a.getTime())/86400000); }

export default useAttendanceStore;
