import { create } from 'zustand';

export interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  role: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

interface ScheduleStore {
  shifts: Shift[];
  setShifts: (shifts: Shift[]) => void;
  addShift: (shift: Shift) => void;
  removeShift: (shiftId: string) => void;
  updateShift: (shiftId: string, shift: Partial<Shift>) => void;
}

export const useScheduleStore = create<ScheduleStore>((set) => ({
  shifts: [],
  setShifts: (shifts) => set({ shifts }),
  addShift: (shift) =>
    set((state) => ({
      shifts: [...state.shifts, shift],
    })),
  removeShift: (shiftId) =>
    set((state) => ({
      shifts: state.shifts.filter((s) => s.id !== shiftId),
    })),
  updateShift: (shiftId, shift) =>
    set((state) => ({
      shifts: state.shifts.map((s) =>
        s.id === shiftId ? { ...s, ...shift } : s
      ),
    })),
}));
