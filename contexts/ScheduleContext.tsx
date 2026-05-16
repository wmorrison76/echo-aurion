import React, { createContext, useContext, useState, useCallback } from 'react';
import { UUID } from '../shared/types/base';

interface Shift {
  id: UUID;
  employeeId: UUID;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
}

interface ScheduleContextValue {
  shifts: Shift[];
  selectedDate: Date;
  setSelectedDate: (date: Date) => void;
  addShift: (shift: Omit<Shift, 'id'>) => Promise<void>;
  updateShift: (id: UUID, updates: Partial<Shift>) => Promise<void>;
  deleteShift: (id: UUID) => Promise<void>;
  copyShift: (id: UUID) => void;
  pasteShift: (targetDate: string, targetEmployee: UUID) => Promise<void>;
}

const ScheduleContext = createContext<ScheduleContextValue | null>(null);

export function ScheduleProvider({ children }: { children: React.ReactNode }) {
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [copiedShift, setCopiedShift] = useState<Shift | null>(null);
  
  const addShift = useCallback(async (shiftData: Omit<Shift, 'id'>) => {
    const response = await fetch('/api/shifts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(shiftData)
    });
    
    if (response.ok) {
      const newShift = await response.json();
      setShifts(prev => [...prev, newShift]);
    }
  }, []);
  
  const updateShift = useCallback(async (id: UUID, updates: Partial<Shift>) => {
    // Optimistic update
    setShifts(prev => prev.map(s => s.id === id ? { ...s, ...updates } : s));
    
    try {
      await fetch(`/api/shifts/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates)
      });
    } catch (error) {
      // Rollback on error
      // TODO: Implement rollback
    }
  }, []);
  
  const deleteShift = useCallback(async (id: UUID) => {
    setShifts(prev => prev.filter(s => s.id !== id));
    
    try {
      await fetch(`/api/shifts/${id}`, { method: 'DELETE' });
    } catch (error) {
      // Rollback on error
    }
  }, []);
  
  const copyShift = useCallback((id: UUID) => {
    const shift = shifts.find(s => s.id === id);
    if (shift) setCopiedShift(shift);
  }, [shifts]);
  
  const pasteShift = useCallback(async (targetDate: string, targetEmployee: UUID) => {
    if (!copiedShift) return;
    
    await addShift({
      ...copiedShift,
      date: targetDate,
      employeeId: targetEmployee
    });
  }, [copiedShift, addShift]);
  
  return (
    <ScheduleContext.Provider value={{
      shifts,
      selectedDate,
      setSelectedDate,
      addShift,
      updateShift,
      deleteShift,
      copyShift,
      pasteShift
    }}>
      {children}
    </ScheduleContext.Provider>
  );
}

export function useSchedule() {
  const context = useContext(ScheduleContext);
  if (!context) throw new Error('useSchedule must be used within ScheduleProvider');
  return context;
}

