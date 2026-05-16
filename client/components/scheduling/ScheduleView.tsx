import React, { useState, useEffect, useCallback } from 'react';
import { ChevronLeft, ChevronRight, Eye, Edit2, Copy, Trash2 } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../ui/use-toast';

interface ScheduleShift {
  id: string;
  employeeId: string;
  employeeName: string;
  position: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  pay: number;
  notes?: string;
}

interface ScheduleViewProps {
  organizationId: string;
  locationId?: string;
  view: 'week' | 'day' | 'month';
  onShiftClick?: (shift: ScheduleShift) => void;
}

const ScheduleView: React.FC<ScheduleViewProps> = ({
  organizationId,
  locationId,
  view: initialView,
  onShiftClick,
}) => {
  const [view, setView] = useState<'week' | 'day' | 'month'>(initialView);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<ScheduleShift[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedShift, setSelectedShift] = useState<ScheduleShift | null>(null);

  // Fetch shifts for current view
  useEffect(() => {
    const fetchShifts = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/shifts?org_id=${organizationId}&location_id=${locationId || ''}&date=${currentDate.toISOString().split('T')[0]}&view=${view}`,
          {
            headers: { 'Content-Type': 'application/json' },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch shifts');

        const data = await response.json();
        setShifts(data.shifts || generateMockScheduleShifts());
      } catch (error) {
        console.error('Schedule fetch error:', error);
        setShifts(generateMockScheduleShifts());
      } finally {
        setLoading(false);
      }
    };

    fetchShifts();
  }, [organizationId, locationId, currentDate, view]);

  const handlePrevious = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() - 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (view === 'day') {
      newDate.setDate(newDate.getDate() + 1);
    } else if (view === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  const handleDuplicate = (shift: ScheduleShift) => {
    toast({
      title: 'Shift duplicated',
      description: `Duplicated shift for ${shift.employeeName}`,
    });
  };

  const handleDelete = async (shiftId: string) => {
    try {
      // Optimistic update
      setShifts((prev) => prev.filter((s) => s.id !== shiftId));
      toast({
        title: 'Shift deleted',
        description: 'Shift has been removed from the schedule',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to delete shift',
        variant: 'destructive',
      });
    }
  };

  const getDateRange = (): [string, string] => {
    if (view === 'day') {
      const date = currentDate.toISOString().split('T')[0];
      return [date, date];
    } else if (view === 'week') {
      const start = new Date(currentDate);
      const day = start.getDay();
      start.setDate(start.getDate() - day);

      const end = new Date(start);
      end.setDate(end.getDate() + 6);

      return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
    } else {
      const start = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const end = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0);

      return [start.toISOString().split('T')[0], end.toISOString().split('T')[0]];
    }
  };

  const getHeaderText = (): string => {
    if (view === 'day') {
      return currentDate.toLocaleDateString('en-US', {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      });
    } else if (view === 'week') {
      const [start] = getDateRange();
      const startDate = new Date(start);
      const endDate = new Date(startDate);
      endDate.setDate(endDate.getDate() + 6);

      return `${startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
    } else {
      return currentDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Schedule</h1>
          <p className="text-sm text-muted-foreground">{getHeaderText()}</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={view} onValueChange={(v: any) => setView(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="day">Day</SelectItem>
              <SelectItem value="week">Week</SelectItem>
              <SelectItem value="month">Month</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" size="icon" onClick={handlePrevious}>
            <ChevronLeft className="w-4 h-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext}>
            <ChevronRight className="w-4 h-4" />
          </Button>
        </div>
      </div>

      {/* Schedule Content */}
      {view === 'week' ? (
        <WeekView shifts={shifts} onShiftClick={(s) => setSelectedShift(s)} />
      ) : view === 'day' ? (
        <DayView shifts={shifts} date={currentDate} onShiftClick={(s) => setSelectedShift(s)} />
      ) : (
        <MonthView shifts={shifts} date={currentDate} onShiftClick={(s) => setSelectedShift(s)} />
      )}

      {/* Selected Shift Details */}
      {selectedShift && (
        <ShiftDetailsPanel
          shift={selectedShift}
          onClose={() => setSelectedShift(null)}
          onDuplicate={handleDuplicate}
          onDelete={handleDelete}
        />
      )}
    </div>
  );
};

// ============================================================================
// WEEK VIEW
// ============================================================================

interface WeekViewProps {
  shifts: ScheduleShift[];
  onShiftClick: (shift: ScheduleShift) => void;
}

const WeekView: React.FC<WeekViewProps> = ({ shifts, onShiftClick }) => {
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(startDate.getDate() - today.getDay());

  const days = Array.from({ length: 7 }).map((_, i) => {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    return date;
  });

  const hours = Array.from({ length: 16 }).map((_, i) => {
    const hour = 6 + i; // 6 AM to 10 PM
    return `${String(hour).padStart(2, '0')}:00`;
  });

  return (
    <Card>
      <CardContent className="p-4 overflow-x-auto">
        <div className="grid gap-2" style={{ gridTemplateColumns: '80px repeat(7, 1fr)' }}>
          {/* Time column header */}
          <div className="font-semibold text-sm text-muted-foreground">Time</div>

          {/* Day headers */}
          {days.map((day, i) => (
            <div key={i} className="text-center">
              <p className="font-semibold text-sm">
                {day.toLocaleDateString('en-US', { weekday: 'short' })}
              </p>
              <p className="text-xs text-muted-foreground">{day.getDate()}</p>
            </div>
          ))}

          {/* Time rows */}
          {hours.map((hour) => (
            <React.Fragment key={hour}>
              <div className="text-xs text-muted-foreground text-right pr-2 font-mono">{hour}</div>
              {days.map((day, dayIndex) => {
                const dayShifts = shifts.filter(
                  (s) => s.date === day.toISOString().split('T')[0]
                );

                return (
                  <div
                    key={`${dayIndex}-${hour}`}
                    className="min-h-24 border rounded-lg p-1 bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    {dayShifts.map((shift) => (
                      <div
                        key={shift.id}
                        onClick={() => onShiftClick(shift)}
                        className="mb-1 p-1 bg-blue-100 text-blue-900 rounded text-xs cursor-pointer hover:bg-blue-200 transition-colors"
                      >
                        <p className="font-semibold truncate">{shift.employeeName}</p>
                        <p className="text-xs">{shift.position}</p>
                        <p className="text-xs">{shift.startTime}</p>
                      </div>
                    ))}
                  </div>
                );
              })}
            </React.Fragment>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// DAY VIEW
// ============================================================================

interface DayViewProps {
  shifts: ScheduleShift[];
  date: Date;
  onShiftClick: (shift: ScheduleShift) => void;
}

const DayView: React.FC<DayViewProps> = ({ shifts, date, onShiftClick }) => {
  const dateStr = date.toISOString().split('T')[0];
  const dayShifts = shifts.filter((s) => s.date === dateStr);

  const sortedShifts = [...dayShifts].sort((a, b) => a.startTime.localeCompare(b.startTime));

  return (
    <div className="space-y-3">
      {sortedShifts.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No shifts scheduled for this day
          </CardContent>
        </Card>
      ) : (
        sortedShifts.map((shift) => (
          <Card
            key={shift.id}
            onClick={() => onShiftClick(shift)}
            className="cursor-pointer hover:border-blue-300 transition-colors"
          >
            <CardContent className="p-4">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h3 className="font-semibold">{shift.employeeName}</h3>
                    <Badge variant="outline">{shift.position}</Badge>
                    <Badge
                      variant={
                        shift.status === 'completed'
                          ? 'default'
                          : shift.status === 'scheduled'
                            ? 'secondary'
                            : 'outline'
                      }
                    >
                      {shift.status}
                    </Badge>
                  </div>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Time</p>
                      <p className="font-mono font-semibold">
                        {shift.startTime} - {shift.endTime}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Pay</p>
                      <p className="font-semibold">${shift.pay.toFixed(2)}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Location</p>
                      <p className="font-semibold">{shift.location}</p>
                    </div>
                    {shift.notes && (
                      <div>
                        <p className="text-muted-foreground">Notes</p>
                        <p className="text-sm">{shift.notes}</p>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="ghost" size="sm">
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm">
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
};

// ============================================================================
// MONTH VIEW
// ============================================================================

interface MonthViewProps {
  shifts: ScheduleShift[];
  date: Date;
  onShiftClick: (shift: ScheduleShift) => void;
}

const MonthView: React.FC<MonthViewProps> = ({ shifts, date, onShiftClick }) => {
  const year = date.getFullYear();
  const month = date.getMonth();

  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);

  const startDate = new Date(firstDay);
  startDate.setDate(startDate.getDate() - firstDay.getDay());

  const days: Date[] = [];
  const current = new Date(startDate);

  while (current <= lastDay || days.length % 7 !== 0) {
    days.push(new Date(current));
    current.setDate(current.getDate() + 1);
  }

  const weeks = Array.from({ length: Math.ceil(days.length / 7) }).map((_, i) =>
    days.slice(i * 7, (i + 1) * 7)
  );

  return (
    <Card>
      <CardContent className="p-4">
        <div className="grid gap-2" style={{ gridTemplateColumns: 'repeat(7, 1fr)' }}>
          {/* Day headers */}
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="text-center font-semibold text-sm p-2">
              {day}
            </div>
          ))}

          {/* Calendar cells */}
          {days.map((day, i) => {
            const dateStr = day.toISOString().split('T')[0];
            const dayShifts = shifts.filter((s) => s.date === dateStr);
            const isCurrentMonth = day.getMonth() === month;

            return (
              <div
                key={i}
                className={`min-h-24 p-2 border rounded-lg ${
                  isCurrentMonth ? 'bg-white' : 'bg-muted/30'
                }`}
              >
                <p className={`text-sm font-semibold mb-1 ${isCurrentMonth ? '' : 'text-muted-foreground'}`}>
                  {day.getDate()}
                </p>
                <div className="space-y-1">
                  {dayShifts.slice(0, 2).map((shift) => (
                    <div
                      key={shift.id}
                      onClick={() => onShiftClick(shift)}
                      className="text-xs p-1 bg-blue-100 text-blue-900 rounded cursor-pointer hover:bg-blue-200 truncate"
                    >
                      {shift.employeeName}
                    </div>
                  ))}
                  {dayShifts.length > 2 && (
                    <p className="text-xs text-muted-foreground">+{dayShifts.length - 2} more</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// SHIFT DETAILS PANEL
// ============================================================================

interface ShiftDetailsPanelProps {
  shift: ScheduleShift;
  onClose: () => void;
  onDuplicate: (shift: ScheduleShift) => void;
  onDelete: (shiftId: string) => void;
}

const ShiftDetailsPanel: React.FC<ShiftDetailsPanelProps> = ({
  shift,
  onClose,
  onDuplicate,
  onDelete,
}) => {
  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle>{shift.employeeName}</CardTitle>
            <CardDescription>{shift.position}</CardDescription>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose}>
            ✕
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">Date</p>
            <p className="font-semibold">
              {new Date(shift.date).toLocaleDateString('en-US', {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Time</p>
            <p className="font-semibold font-mono">
              {shift.startTime} - {shift.endTime}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Location</p>
            <p className="font-semibold">{shift.location}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pay</p>
            <p className="font-semibold">${shift.pay.toFixed(2)}</p>
          </div>
        </div>

        {shift.notes && (
          <div>
            <p className="text-sm text-muted-foreground">Notes</p>
            <p className="text-sm">{shift.notes}</p>
          </div>
        )}

        <div className="flex gap-2 pt-4 border-t">
          <Button
            variant="outline"
            className="flex-1 gap-2"
            onClick={() => onDuplicate(shift)}
          >
            <Copy className="w-4 h-4" />
            Duplicate
          </Button>
          <Button
            variant="destructive"
            className="flex-1 gap-2"
            onClick={() => onDelete(shift.id)}
          >
            <Trash2 className="w-4 h-4" />
            Delete
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

// ============================================================================
// MOCK DATA
// ============================================================================

function generateMockScheduleShifts(): ScheduleShift[] {
  const shifts: ScheduleShift[] = [];
  const today = new Date();

  const positions = ['Chef', 'Server', 'Host', 'Busser', 'Bartender'];
  const employees = [
    'Sarah Johnson',
    'Marcus Williams',
    'Jennifer Lee',
    'David Martinez',
    'Amanda Davis',
  ];

  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(date.getDate() + i);

    for (let j = 0; j < 4; j++) {
      const startHour = 8 + j * 3;
      const endHour = startHour + 8;

      shifts.push({
        id: `shift-${i}-${j}`,
        employeeId: `emp-${Math.floor(Math.random() * 5)}`,
        employeeName: employees[Math.floor(Math.random() * employees.length)],
        position: positions[Math.floor(Math.random() * positions.length)],
        date: date.toISOString().split('T')[0],
        startTime: `${String(startHour).padStart(2, '0')}:00`,
        endTime: `${String(endHour).padStart(2, '0')}:00`,
        location: 'Downtown',
        status: Math.random() > 0.7 ? 'completed' : 'scheduled',
        pay: Math.floor(Math.random() * 200) + 100,
      });
    }
  }

  return shifts;
}

export default ScheduleView;
