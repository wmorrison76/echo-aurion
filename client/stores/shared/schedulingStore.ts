/**
 * Shared Scheduling Store
 * 
 * Centralized state management for scheduling data across all modules
 * - Real-time sync support
 * - Cross-module integration (Maestro, Labor Engine, Demand Forecast)
 * - Shift management
 * - Labor optimization
 */

import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";

export interface Shift {
  id: string;
  employeeId: string;
  employeeName: string;
  role: string;
  startTime: string;
  endTime: string;
  date: string;
  outletId: string;
  status: "scheduled" | "confirmed" | "completed" | "cancelled";
  cost?: number;
  notes?: string;
}

export interface Schedule {
  id: string;
  outletId: string;
  weekStart: string;
  weekEnd: string;
  shifts: Shift[];
  totalHours: number;
  totalCost: number;
  status: "draft" | "published" | "archived";
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface SchedulingStoreState {
  // Data
  schedules: Schedule[];
  shifts: Shift[];
  
  // Loading states
  isLoading: boolean;
  isSyncing: boolean;
  error: string | null;
  
  // Filters
  selectedOutletId: string | null;
  selectedDate: string | null;
  selectedWeek: string | null;
  
  // Real-time sync
  lastSyncTime: number;
  pendingChanges: string[];
  
  // Actions
  setSchedules: (schedules: Schedule[]) => void;
  addSchedule: (schedule: Schedule) => void;
  updateSchedule: (id: string, updates: Partial<Schedule>) => void;
  deleteSchedule: (id: string) => void;
  
  // Shifts
  addShift: (shift: Shift) => void;
  updateShift: (id: string, updates: Partial<Shift>) => void;
  deleteShift: (id: string) => void;
  setShifts: (shifts: Shift[]) => void;
  
  // Filters
  setSelectedOutletId: (outletId: string | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedWeek: (week: string | null) => void;
  
  // Sync
  setSyncing: (syncing: boolean) => void;
  setLastSyncTime: (time: number) => void;
  addPendingChange: (scheduleId: string) => void;
  clearPendingChanges: () => void;
  
  // Computed
  getScheduleById: (id: string) => Schedule | undefined;
  getSchedulesByOutlet: (outletId: string) => Schedule[];
  getShiftsByDate: (date: string) => Shift[];
  getShiftsByEmployee: (employeeId: string) => Shift[];
  getTotalCost: (scheduleId: string) => number;
  
  // Reset
  reset: () => void;
}

const initialState = {
  schedules: [],
  shifts: [],
  isLoading: false,
  isSyncing: false,
  error: null,
  selectedOutletId: null,
  selectedDate: null,
  selectedWeek: null,
  lastSyncTime: 0,
  pendingChanges: [],
};

export const useSchedulingStore = create<SchedulingStoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...initialState,
        
        setSchedules: (schedules) => set({ schedules }),
        
        addSchedule: (schedule) =>
          set((state) => ({
            schedules: [...state.schedules, schedule],
            pendingChanges: [...state.pendingChanges, schedule.id],
          })),
        
        updateSchedule: (id, updates) =>
          set((state) => ({
            schedules: state.schedules.map((schedule) =>
              schedule.id === id
                ? { ...schedule, ...updates, updatedAt: new Date().toISOString() }
                : schedule
            ),
            pendingChanges: state.pendingChanges.includes(id)
              ? state.pendingChanges
              : [...state.pendingChanges, id],
          })),
        
        deleteSchedule: (id) =>
          set((state) => ({
            schedules: state.schedules.filter((schedule) => schedule.id !== id),
          })),
        
        addShift: (shift) =>
          set((state) => {
            const schedule = state.schedules.find((s) => s.id === shift.id.split("-")[0]);
            return {
              shifts: [...state.shifts, shift],
              schedules: schedule
                ? state.schedules.map((s) =>
                    s.id === schedule.id
                      ? {
                          ...s,
                          shifts: [...s.shifts, shift],
                          totalHours: s.totalHours + calculateHours(shift),
                          updatedAt: new Date().toISOString(),
                        }
                      : s
                  )
                : state.schedules,
              pendingChanges: schedule
                ? state.pendingChanges.includes(schedule.id)
                  ? state.pendingChanges
                  : [...state.pendingChanges, schedule.id]
                : state.pendingChanges,
            };
          }),
        
        updateShift: (id, updates) =>
          set((state) => {
            const shift = state.shifts.find((s) => s.id === id);
            if (!shift) return state;
            
            return {
              shifts: state.shifts.map((s) => (s.id === id ? { ...s, ...updates } : s)),
              pendingChanges: [...state.pendingChanges, shift.id],
            };
          }),
        
        deleteShift: (id) =>
          set((state) => ({
            shifts: state.shifts.filter((shift) => shift.id !== id),
          })),
        
        setShifts: (shifts) => set({ shifts }),
        
        setSelectedOutletId: (outletId) => set({ selectedOutletId: outletId }),
        setSelectedDate: (date) => set({ selectedDate: date }),
        setSelectedWeek: (week) => set({ selectedWeek: week }),
        
        setSyncing: (syncing) => set({ isSyncing: syncing }),
        setLastSyncTime: (time) => set({ lastSyncTime: time }),
        addPendingChange: (scheduleId) =>
          set((state) => ({
            pendingChanges: state.pendingChanges.includes(scheduleId)
              ? state.pendingChanges
              : [...state.pendingChanges, scheduleId],
          })),
        clearPendingChanges: () => set({ pendingChanges: [] }),
        
        getScheduleById: (id) => get().schedules.find((schedule) => schedule.id === id),
        getSchedulesByOutlet: (outletId) =>
          get().schedules.filter((schedule) => schedule.outletId === outletId),
        getShiftsByDate: (date) => get().shifts.filter((shift) => shift.date === date),
        getShiftsByEmployee: (employeeId) =>
          get().shifts.filter((shift) => shift.employeeId === employeeId),
        getTotalCost: (scheduleId) => {
          const schedule = get().schedules.find((s) => s.id === scheduleId);
          return schedule?.totalCost || 0;
        },
        
        reset: () => set(initialState),
      }),
      {
        name: "scheduling-storage",
        partialize: (state) => ({
          schedules: state.schedules,
          shifts: state.shifts,
          lastSyncTime: state.lastSyncTime,
        }),
      }
    ),
    { name: "SchedulingStore" }
  )
);

function calculateHours(shift: Shift): number {
  const start = new Date(shift.startTime);
  const end = new Date(shift.endTime);
  return (end.getTime() - start.getTime()) / (1000 * 60 * 60);
}
