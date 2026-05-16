import React, { useState, useCallback, useRef } from 'react';
import { AlertCircle, Undo2, CheckCircle, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { toast } from '../ui/use-toast';

interface Employee {
  id: string;
  name: string;
  role: string;
  availability: string[];
  status: 'available' | 'assigned' | 'unavailable';
}

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  position: string;
  staffNeeded: number;
  assignedEmployees: Employee[];
}

interface AssignmentAction {
  employeeId: string;
  employeeName: string;
  shiftId: string;
  timestamp: number;
  type: 'assign' | 'unassign';
  originalAssignment?: string;
}

interface DragDropSchedulingProps {
  organizationId: string;
  locationId: string;
  week: Date;
  onAssignmentChange?: (assignments: any[]) => void;
}

const DragDropScheduling: React.FC<DragDropSchedulingProps> = ({
  organizationId,
  locationId,
  week,
  onAssignmentChange,
}) => {
  const [shifts, setShifts] = useState<Shift[]>(generateMockShifts());
  const [availableEmployees, setAvailableEmployees] = useState<Employee[]>(generateMockEmployees());
  const [draggedEmployee, setDraggedEmployee] = useState<Employee | null>(null);
  const [draggedFromShift, setDraggedFromShift] = useState<string | null>(null);
  const [undoStack, setUndoStack] = useState<AssignmentAction[]>([]);
  const [conflicts, setConflicts] = useState<Set<string>>(new Set());
  const [suggestions, setSuggestions] = useState<Set<string>>(new Set());
  const dragSource = useRef<'available' | 'shift' | null>(null);

  // Check for scheduling conflicts
  const checkConflict = useCallback((employee: Employee, shiftId: string): boolean => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return false;

    // Check if employee is already assigned to another shift at the same time
    const hasConflict = shifts.some(
      (s) =>
        s.id !== shiftId &&
        s.assignedEmployees.some((e) => e.id === employee.id) &&
        shiftsOverlap(s, shift)
    );

    // Check if employee is unavailable on this day
    const dayOfWeek = getDayOfWeek(shift.date);
    const isUnavailable = !employee.availability.includes(dayOfWeek);

    return hasConflict || isUnavailable;
  }, [shifts]);

  // Find best suggestion for a shift
  const suggestBestAssignment = useCallback((shiftId: string): Employee | null => {
    const shift = shifts.find((s) => s.id === shiftId);
    if (!shift) return null;

    const candidates = availableEmployees.filter(
      (emp) =>
        emp.status === 'available' &&
        emp.role === shift.position &&
        !checkConflict(emp, shiftId)
    );

    return candidates.length > 0 ? candidates[0] : null;
  }, [shifts, availableEmployees, checkConflict]);

  // Handle drag start
  const handleDragStart = (employee: Employee, fromShiftId?: string) => {
    setDraggedEmployee(employee);
    dragSource.current = fromShiftId ? 'shift' : 'available';
    if (fromShiftId) {
      setDraggedFromShift(fromShiftId);
    }
  };

  // Handle drag over shift
  const handleDragOver = (shiftId: string) => {
    if (!draggedEmployee) return;

    const conflict = checkConflict(draggedEmployee, shiftId);
    const newConflicts = new Set(conflicts);

    if (conflict) {
      newConflicts.add(shiftId);
    } else {
      newConflicts.delete(shiftId);
    }

    setConflicts(newConflicts);
  };

  // Handle drop
  const handleDrop = (shiftId: string) => {
    if (!draggedEmployee) return;

    const conflict = checkConflict(draggedEmployee, shiftId);

    if (conflict) {
      toast({
        title: 'Conflict detected',
        description: `${draggedEmployee.name} is unavailable or already assigned during this time.`,
        variant: 'destructive',
      });
      setDraggedEmployee(null);
      setConflicts(new Set());
      dragSource.current = null;
      return;
    }

    // Remove from old location if dragging from another shift
    if (draggedFromShift) {
      setShifts((prev) =>
        prev.map((s) =>
          s.id === draggedFromShift
            ? {
                ...s,
                assignedEmployees: s.assignedEmployees.filter((e) => e.id !== draggedEmployee.id),
              }
            : s
        )
      );
    }

    // Assign to new shift
    setShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              assignedEmployees: [...s.assignedEmployees, draggedEmployee],
            }
          : s
      )
    );

    // Remove from available if first assignment
    if (dragSource.current === 'available') {
      setAvailableEmployees((prev) =>
        prev.map((e) =>
          e.id === draggedEmployee.id ? { ...e, status: 'assigned' } : e
        )
      );
    }

    // Add to undo stack
    setUndoStack((prev) => [
      ...prev.slice(-9), // Keep last 10 actions
      {
        employeeId: draggedEmployee.id,
        employeeName: draggedEmployee.name,
        shiftId,
        timestamp: Date.now(),
        type: 'assign',
        originalAssignment: draggedFromShift,
      },
    ]);

    toast({
      title: 'Assignment successful',
      description: `${draggedEmployee.name} assigned to shift`,
    });

    // Reset
    setDraggedEmployee(null);
    setConflicts(new Set());
    dragSource.current = null;

    // Call callback
    onAssignmentChange?.(shifts);
  };

  // Handle undo
  const handleUndo = () => {
    if (undoStack.length === 0) return;

    const lastAction = undoStack[undoStack.length - 1];

    setShifts((prev) =>
      prev.map((s) =>
        s.id === lastAction.shiftId
          ? {
              ...s,
              assignedEmployees: s.assignedEmployees.filter(
                (e) => e.id !== lastAction.employeeId
              ),
            }
          : s
      )
    );

    setUndoStack((prev) => prev.slice(0, -1));

    toast({
      title: 'Undo successful',
      description: `Removed ${lastAction.employeeName} from shift`,
    });
  };

  // Unassign employee from shift
  const handleUnassign = (employeeId: string, shiftId: string) => {
    const employee = shifts
      .find((s) => s.id === shiftId)
      ?.assignedEmployees.find((e) => e.id === employeeId);

    if (!employee) return;

    setShifts((prev) =>
      prev.map((s) =>
        s.id === shiftId
          ? {
              ...s,
              assignedEmployees: s.assignedEmployees.filter((e) => e.id !== employeeId),
            }
          : s
      )
    );

    setAvailableEmployees((prev) =>
      prev.map((e) =>
        e.id === employeeId
          ? { ...e, status: 'available' }
          : e
      )
    );

    setUndoStack((prev) => [
      ...prev.slice(-9),
      {
        employeeId,
        employeeName: employee.name,
        shiftId,
        timestamp: Date.now(),
        type: 'unassign',
      },
    ]);

    toast({
      title: 'Unassigned',
      description: `${employee.name} removed from shift`,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Schedule Assignment</h2>
          <p className="text-sm text-muted-foreground">
            Drag employees to shifts. Green = best match, Red = conflict
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={handleUndo}
          disabled={undoStack.length === 0}
          className="gap-2"
        >
          <Undo2 className="w-4 h-4" />
          Undo ({undoStack.length})
        </Button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Available Employees Panel */}
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg">Available Staff</CardTitle>
            <CardDescription>
              {availableEmployees.filter((e) => e.status === 'available').length} ready to assign
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {availableEmployees
                .filter((e) => e.status === 'available')
                .map((employee) => (
                  <div
                    key={employee.id}
                    draggable
                    onDragStart={() => handleDragStart(employee)}
                    className="p-2 bg-blue-50 border border-blue-200 rounded-lg cursor-move hover:bg-blue-100 transition-colors"
                  >
                    <p className="font-medium text-sm">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.role}</p>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Shifts Grid */}
        <div className="lg:col-span-3 space-y-3">
          {shifts.map((shift) => {
            const isFull = shift.assignedEmployees.length >= shift.staffNeeded;
            const hasConflict = conflicts.has(shift.id);
            const suggestion = suggestBestAssignment(shift.id);

            return (
              <Card
                key={shift.id}
                className={`transition-colors ${
                  hasConflict
                    ? 'border-red-300 bg-red-50'
                    : draggedEmployee && !checkConflict(draggedEmployee, shift.id)
                      ? 'border-green-300 bg-green-50'
                      : ''
                }`}
                onDragOver={() => handleDragOver(shift.id)}
                onDrop={() => handleDrop(shift.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <CardTitle className="text-base">
                        {shift.position} • {shift.startTime} - {shift.endTime}
                      </CardTitle>
                      <CardDescription>{shift.date}</CardDescription>
                    </div>
                    <Badge variant={isFull ? 'default' : 'outline'}>
                      {shift.assignedEmployees.length}/{shift.staffNeeded}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="space-y-3">
                  {/* Assigned Employees */}
                  {shift.assignedEmployees.length > 0 && (
                    <div className="space-y-2">
                      {shift.assignedEmployees.map((emp) => (
                        <div
                          key={emp.id}
                          draggable
                          onDragStart={() => handleDragStart(emp, shift.id)}
                          className="flex items-center justify-between p-2 bg-green-50 border border-green-200 rounded-lg cursor-move hover:bg-green-100"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-sm truncate">{emp.name}</p>
                            <p className="text-xs text-muted-foreground">{emp.role}</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleUnassign(emp.id, shift.id)}
                            className="h-6 w-6 p-0 text-red-600 hover:bg-red-100"
                          >
                            ✕
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Drop Zone */}
                  {shift.assignedEmployees.length < shift.staffNeeded && (
                    <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center text-sm text-gray-500 hover:border-gray-400 transition-colors">
                      Drop employee here
                    </div>
                  )}

                  {/* AI Suggestion */}
                  {!isFull && suggestion && (
                    <Alert className="bg-blue-50 border-blue-200">
                      <CheckCircle className="h-4 w-4" />
                      <AlertDescription>
                        <span className="text-sm">
                          Suggested: <span className="font-semibold">{suggestion.name}</span>
                        </span>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Conflict Warning */}
                  {hasConflict && (
                    <Alert variant="destructive">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>Conflict: Employee unavailable or already assigned</AlertDescription>
                    </Alert>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Summary */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="grid grid-cols-3 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Total Shifts</p>
              <p className="text-2xl font-bold">{shifts.length}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Filled Positions</p>
              <p className="text-2xl font-bold">
                {shifts.reduce((acc, s) => acc + s.assignedEmployees.length, 0)}/
                {shifts.reduce((acc, s) => acc + s.staffNeeded, 0)}
              </p>
            </div>
            <div>
              <p className="text-muted-foreground">Available Staff</p>
              <p className="text-2xl font-bold">
                {availableEmployees.filter((e) => e.status === 'available').length}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

function generateMockShifts(): Shift[] {
  const today = new Date();
  const shifts: Shift[] = [];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    shifts.push(
      {
        id: `shift-${i}-1`,
        date: date.toISOString().split('T')[0],
        startTime: '09:00',
        endTime: '17:00',
        position: 'Chef',
        staffNeeded: 2,
        assignedEmployees: [],
      },
      {
        id: `shift-${i}-2`,
        date: date.toISOString().split('T')[0],
        startTime: '11:00',
        endTime: '19:00',
        position: 'Server',
        staffNeeded: 3,
        assignedEmployees: [],
      },
      {
        id: `shift-${i}-3`,
        date: date.toISOString().split('T')[0],
        startTime: '16:00',
        endTime: '23:00',
        position: 'Bartender',
        staffNeeded: 2,
        assignedEmployees: [],
      }
    );
  }

  return shifts;
}

function generateMockEmployees(): Employee[] {
  return [
    {
      id: 'emp-1',
      name: 'Sarah Johnson',
      role: 'Chef',
      availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      status: 'available',
    },
    {
      id: 'emp-2',
      name: 'Marcus Williams',
      role: 'Server',
      availability: ['Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      status: 'available',
    },
    {
      id: 'emp-3',
      name: 'Jennifer Lee',
      role: 'Host',
      availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      status: 'available',
    },
    {
      id: 'emp-4',
      name: 'David Martinez',
      role: 'Server',
      availability: ['Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
      status: 'available',
    },
    {
      id: 'emp-5',
      name: 'Amanda Davis',
      role: 'Bartender',
      availability: ['Monday', 'Wednesday', 'Friday', 'Saturday', 'Sunday'],
      status: 'available',
    },
    {
      id: 'emp-6',
      name: 'Mike Chen',
      role: 'Chef',
      availability: ['Monday', 'Tuesday', 'Thursday', 'Friday', 'Saturday'],
      status: 'available',
    },
  ];
}

function shiftsOverlap(shift1: Shift, shift2: Shift): boolean {
  if (shift1.date !== shift2.date) return false;

  const start1 = parseInt(shift1.startTime.replace(':', ''));
  const end1 = parseInt(shift1.endTime.replace(':', ''));
  const start2 = parseInt(shift2.startTime.replace(':', ''));
  const end2 = parseInt(shift2.endTime.replace(':', ''));

  return start1 < end2 && start2 < end1;
}

function getDayOfWeek(dateStr: string): string {
  const date = new Date(dateStr);
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  return days[date.getDay()];
}

export default DragDropScheduling;
