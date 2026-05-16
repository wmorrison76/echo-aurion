import React, { useState, useCallback, useMemo } from 'react';
import { DndContext, DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { format, addDays, startOfWeek } from 'date-fns';
import { useSchedule } from '../../contexts/ScheduleContext';

/**
 * Modern Schedule Component
 * Features: Drag-and-drop, Copy/Paste, Keyboard shortcuts
 */
export function ScheduleView() {
  const {
    shifts,
    selectedDate,
    setSelectedDate,
    addShift,
    updateShift,
    deleteShift,
    copyShift,
    pasteShift
  } = useSchedule();
  
  const [copiedShiftId, setCopiedShiftId] = useState<string | null>(null);
  const [selectedShiftId, setSelectedShiftId] = useState<string | null>(null);
  
  // Get week dates
  const weekStart = startOfWeek(selectedDate);
  const weekDates = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(weekStart, i)),
    [weekStart]
  );
  
  // Keyboard shortcuts
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + C - Copy
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && selectedShiftId) {
        e.preventDefault();
        copyShift(selectedShiftId);
        setCopiedShiftId(selectedShiftId);
      }
      
      // Cmd/Ctrl + V - Paste
      if ((e.metaKey || e.ctrlKey) && e.key === 'v' && copiedShiftId) {
        e.preventDefault();
        // Paste to selected date/employee
        // TODO: Implement paste logic
      }
      
      // Delete/Backspace - Delete shift
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedShiftId) {
        e.preventDefault();
        deleteShift(selectedShiftId);
        setSelectedShiftId(null);
      }
      
      // Arrow keys - Navigate
      if (e.key === 'ArrowLeft') {
        setSelectedDate(addDays(selectedDate, -1));
      }
      if (e.key === 'ArrowRight') {
        setSelectedDate(addDays(selectedDate, 1));
      }
    };
    
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedShiftId, copiedShiftId, selectedDate]);
  
  // Drag and drop handler
  const handleDragEnd = useCallback((event: DragEndEvent) => {
    const { active, over } = event;
    
    if (!over) return;
    
    const shiftId = active.id as string;
    const [targetDate, targetEmployee] = (over.id as string).split('_');
    
    // Update shift with new date/employee
    updateShift(shiftId, {
      date: targetDate,
      employeeId: targetEmployee
    });
  }, [updateShift]);
  
  return (
    <div className="schedule-container">
      {/* Toolbar */}
      <div className="schedule-toolbar">
        <button onClick={() => setSelectedDate(addDays(selectedDate, -7))}>
          ← Previous Week
        </button>
        <h2>{format(weekStart, 'MMM d, yyyy')}</h2>
        <button onClick={() => setSelectedDate(addDays(selectedDate, 7))}>
          Next Week →
        </button>
      </div>
      
      {/* Schedule Grid */}
      <DndContext onDragEnd={handleDragEnd}>
        <div className="schedule-grid">
          {/* Column headers (dates) */}
          <div className="schedule-header">
            <div className="employee-column-header">Employee</div>
            {weekDates.map(date => (
              <div key={date.toISOString()} className="date-header">
                {format(date, 'EEE, MMM d')}
              </div>
            ))}
          </div>
          
          {/* Employee rows */}
          {/* TODO: Map through employees */}
          <EmployeeRow
            employeeId="employee-1"
            employeeName="John Doe"
            weekDates={weekDates}
            shifts={shifts}
            selectedShiftId={selectedShiftId}
            onSelectShift={setSelectedShiftId}
          />
        </div>
      </DndContext>
      
      {/* Keyboard shortcuts help */}
      <div className="shortcuts-help">
        <kbd>Cmd+C</kbd> Copy | <kbd>Cmd+V</kbd> Paste | 
        <kbd>Del</kbd> Delete | <kbd>←→</kbd> Navigate
      </div>
    </div>
  );
}

// Draggable shift component
function DraggableShift({ shift, isSelected, onSelect }: any) {
  const { attributes, listeners, setNodeRef, transform } = useDraggable({
    id: shift.id
  });
  
  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`
  } : undefined;
  
  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={`shift ${isSelected ? 'selected' : ''}`}
      onClick={() => onSelect(shift.id)}
    >
      {shift.startTime} - {shift.endTime}
      <div className="shift-position">{shift.position}</div>
    </div>
  );
}

// Droppable time slot
function DroppableTimeSlot({ date, employeeId, children }: any) {
  const { setNodeRef, isOver } = useDroppable({
    id: `${date}_${employeeId}`
  });
  
  return (
    <div
      ref={setNodeRef}
      className={`time-slot ${isOver ? 'drop-target' : ''}`}
    >
      {children}
    </div>
  );
}

// Employee row component
function EmployeeRow({ employeeId, employeeName, weekDates, shifts, selectedShiftId, onSelectShift }: any) {
  return (
    <div className="employee-row">
      <div className="employee-name">{employeeName}</div>
      {weekDates.map((date: Date) => {
        const dateStr = format(date, 'yyyy-MM-dd');
        const dayShifts = shifts.filter((s: any) => 
          s.employeeId === employeeId && s.date === dateStr
        );
        
        return (
          <DroppableTimeSlot key={dateStr} date={dateStr} employeeId={employeeId}>
            {dayShifts.map((shift: any) => (
              <DraggableShift
                key={shift.id}
                shift={shift}
                isSelected={shift.id === selectedShiftId}
                onSelect={onSelectShift}
              />
            ))}
          </DroppableTimeSlot>
        );
      })}
    </div>
  );
}

