import React, { useState, useEffect } from 'react';
import { Clock, Phone, CheckCircle, AlertCircle, LogOut } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../ui/use-toast';

interface ScheduledEmployee {
  employeeId: string;
  name: string;
  position: string;
  shiftStart: string;
  shiftEnd: string;
  status: 'clocked-in' | 'scheduled' | 'no-show' | 'completed';
  clockedInTime?: string;
  location: string;
}

interface ScheduledStaffPanelProps {
  organizationId: string;
  onMessageEmployee?: (employeeId: string) => void;
  onCheckOut?: (employeeId: string) => void;
}

const ScheduledStaffPanel: React.FC<ScheduledStaffPanelProps> = ({
  organizationId,
  onMessageEmployee,
  onCheckOut,
}) => {
  const [employees, setEmployees] = useState<ScheduledEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'today' | 'tomorrow' | '3days'>('today');

  useEffect(() => {
    const fetchScheduledStaff = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/shifts/scheduled?org_id=${organizationId}&timeframe=${timeframe}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch scheduled staff');

        const data = await response.json();
        setEmployees(data.staff || []);
      } catch (error) {
        console.error('Scheduled staff error:', error);
        // Mock data for demo
        setEmployees(generateMockScheduledData());
      } finally {
        setLoading(false);
      }
    };

    fetchScheduledStaff();
  }, [organizationId, timeframe]);

  const generateMockScheduledData = (): ScheduledEmployee[] => [
    {
      employeeId: 'emp-001',
      name: 'Sarah Johnson',
      position: 'Chef',
      shiftStart: '2024-01-10T09:00:00',
      shiftEnd: '2024-01-10T17:00:00',
      status: 'clocked-in',
      clockedInTime: '2024-01-10T08:58:00',
      location: 'Downtown',
    },
    {
      employeeId: 'emp-002',
      name: 'Marcus Williams',
      position: 'Server',
      shiftStart: '2024-01-10T11:00:00',
      shiftEnd: '2024-01-10T19:00:00',
      status: 'clocked-in',
      clockedInTime: '2024-01-10T10:55:00',
      location: 'Downtown',
    },
    {
      employeeId: 'emp-003',
      name: 'Jennifer Lee',
      position: 'Host',
      shiftStart: '2024-01-10T10:30:00',
      shiftEnd: '2024-01-10T18:30:00',
      status: 'scheduled',
      location: 'Downtown',
    },
    {
      employeeId: 'emp-004',
      name: 'David Martinez',
      position: 'Busser',
      shiftStart: '2024-01-10T12:00:00',
      shiftEnd: '2024-01-10T20:00:00',
      status: 'no-show',
      location: 'Downtown',
    },
    {
      employeeId: 'emp-005',
      name: 'Amanda Davis',
      position: 'Bartender',
      shiftStart: '2024-01-10T16:00:00',
      shiftEnd: '2024-01-11T00:00:00',
      status: 'scheduled',
      location: 'Downtown',
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'clocked-in':
        return <Badge className="bg-green-100 text-green-800">On Clock</Badge>;
      case 'scheduled':
        return <Badge variant="outline">Scheduled</Badge>;
      case 'no-show':
        return <Badge className="bg-red-100 text-red-800">No Show</Badge>;
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>;
      default:
        return null;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'clocked-in':
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case 'scheduled':
        return <Clock className="w-4 h-4 text-blue-600" />;
      case 'no-show':
        return <AlertCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const formatTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  };

  const handleMessage = (employeeId: string) => {
    onMessageEmployee?.(employeeId);
    toast({
      title: 'Message',
      description: 'Opening message window...',
    });
  };

  const handleCheckOut = (employeeId: string) => {
    onCheckOut?.(employeeId);
    toast({
      title: 'Check out',
      description: 'Processing clock out...',
    });
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5" />
              Scheduled Staff
            </CardTitle>
            <CardDescription>
              {timeframe === 'today' ? "Today's schedule" : timeframe === 'tomorrow' ? "Tomorrow's schedule" : 'Next 3 days'}
            </CardDescription>
          </div>
          <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="tomorrow">Tomorrow</SelectItem>
              <SelectItem value="3days">Next 3 days</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>

      <CardContent className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-32">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : employees.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
            <Clock className="w-8 h-8 mb-2 opacity-50" />
            <p>No staff scheduled</p>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((employee) => (
              <div
                key={employee.employeeId}
                className="p-3 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {getStatusIcon(employee.status)}
                      <p className="font-medium text-sm truncate">{employee.name}</p>
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {employee.position} • {employee.location}
                    </p>
                  </div>
                  {getStatusBadge(employee.status)}
                </div>

                <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                  <div>
                    <span className="text-muted-foreground">Shift: </span>
                    <span className="font-semibold">{formatTime(employee.shiftStart)}</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">to </span>
                    <span className="font-semibold">{formatTime(employee.shiftEnd)}</span>
                  </div>
                  {employee.clockedInTime && (
                    <div className="col-span-2">
                      <span className="text-muted-foreground">Clocked in: </span>
                      <span className="font-semibold">{formatTime(employee.clockedInTime)}</span>
                    </div>
                  )}
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    className="flex-1 text-xs h-7"
                    onClick={() => handleMessage(employee.employeeId)}
                  >
                    <Phone className="w-3 h-3 mr-1" />
                    Message
                  </Button>
                  {employee.status === 'clocked-in' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="flex-1 text-xs h-7"
                      onClick={() => handleCheckOut(employee.employeeId)}
                    >
                      <LogOut className="w-3 h-3 mr-1" />
                      Check Out
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <div className="border-t p-3 bg-muted/30">
        <div className="flex items-center justify-between text-xs">
          <div className="text-muted-foreground">
            <span className="font-semibold">{employees.length}</span> employees scheduled
          </div>
          <button className="text-primary hover:underline text-xs">Full schedule →</button>
        </div>
      </div>
    </Card>
  );
};

export default ScheduledStaffPanel;
