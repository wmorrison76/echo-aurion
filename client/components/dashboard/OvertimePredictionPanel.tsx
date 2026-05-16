import React, { useState, useEffect } from 'react';
import { AlertCircle, Users, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../ui/use-toast';

interface OvertimeRiskEmployee {
  employeeId: string;
  name: string;
  department: string;
  currentHours: number;
  predictedOvertimeDate: string;
  overtimeProbability: number;
  confidence: number;
  availableReplacement?: {
    employeeId: string;
    name: string;
  };
}

interface OvertimePredictionPanelProps {
  organizationId: string;
  onSwapRequested?: (from: string, to: string) => void;
}

const OvertimePredictionPanel: React.FC<OvertimePredictionPanelProps> = ({
  organizationId,
  onSwapRequested,
}) => {
  const [employees, setEmployees] = useState<OvertimeRiskEmployee[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeframe, setTimeframe] = useState<'5days' | '7days' | '14days'>('5days');
  const [selectedEmployee, setSelectedEmployee] = useState<string | null>(null);

  useEffect(() => {
    const fetchOvertimePredictions = async () => {
      setLoading(true);
      try {
        const response = await fetch(
          `/api/v1/predictions/overtime?org_id=${organizationId}&timeframe=${timeframe}`,
          {
            headers: {
              'Content-Type': 'application/json',
            },
          }
        );

        if (!response.ok) throw new Error('Failed to fetch overtime predictions');

        const data = await response.json();
        setEmployees(data.predictions || []);
      } catch (error) {
        console.error('Overtime prediction error:', error);
        toast({
          title: 'Error',
          description: 'Failed to load overtime predictions',
          variant: 'destructive',
        });
        // Mock data for demo
        setEmployees(generateMockOvertimeData());
      } finally {
        setLoading(false);
      }
    };

    fetchOvertimePredictions();
  }, [organizationId, timeframe]);

  const generateMockOvertimeData = (): OvertimeRiskEmployee[] => [
    {
      employeeId: 'emp-001',
      name: 'Sarah Johnson',
      department: 'Kitchen',
      currentHours: 38,
      predictedOvertimeDate: '2024-01-12',
      overtimeProbability: 92,
      confidence: 88,
      availableReplacement: {
        employeeId: 'emp-005',
        name: 'Mike Chen',
      },
    },
    {
      employeeId: 'emp-002',
      name: 'Emily Rodriguez',
      department: 'Service',
      currentHours: 36,
      predictedOvertimeDate: '2024-01-13',
      overtimeProbability: 78,
      confidence: 82,
    },
    {
      employeeId: 'emp-003',
      name: 'James Smith',
      department: 'Kitchen',
      currentHours: 39,
      predictedOvertimeDate: '2024-01-14',
      overtimeProbability: 85,
      confidence: 79,
      availableReplacement: {
        employeeId: 'emp-006',
        name: 'Lisa Wong',
      },
    },
  ];

  const handleSwapEmployee = (employeeId: string) => {
    const employee = employees.find((e) => e.employeeId === employeeId);
    if (!employee?.availableReplacement) {
      toast({
        title: 'No replacement available',
        description: 'No available employee found for this shift',
      });
      return;
    }

    onSwapRequested?.(employeeId, employee.availableReplacement.employeeId);
    toast({
      title: 'Swap requested',
      description: `Swap initiated: ${employee.name} → ${employee.availableReplacement.name}`,
    });
  };

  const getRiskColor = (probability: number): string => {
    if (probability >= 80) return 'bg-red-50 border-red-200';
    if (probability >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-green-50 border-green-200';
  };

  const getRiskBadgeVariant = (
    probability: number
  ): 'default' | 'destructive' | 'outline' | 'secondary' => {
    if (probability >= 80) return 'destructive';
    if (probability >= 60) return 'secondary';
    return 'outline';
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1">
            <CardTitle className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5" />
              Overtime Risk
            </CardTitle>
            <CardDescription>
              Next {timeframe === '5days' ? '5 days' : timeframe === '7days' ? '7 days' : '14 days'}
            </CardDescription>
          </div>
          <Select value={timeframe} onValueChange={(v: any) => setTimeframe(v)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="5days">5 days</SelectItem>
              <SelectItem value="7days">7 days</SelectItem>
              <SelectItem value="14days">14 days</SelectItem>
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
            <Users className="w-8 h-8 mb-2 opacity-50" />
            <p>No overtime risk detected</p>
          </div>
        ) : (
          <div className="space-y-3">
            {employees.map((employee) => (
              <div
                key={employee.employeeId}
                className={`p-3 rounded-lg border ${getRiskColor(employee.overtimeProbability)}`}
                onClick={() => setSelectedEmployee(employee.employeeId)}
                role="button"
                tabIndex={0}
              >
                <div className="flex items-start justify-between gap-3 mb-2">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{employee.name}</p>
                    <p className="text-xs text-muted-foreground">{employee.department}</p>
                  </div>
                  <Badge variant={getRiskBadgeVariant(employee.overtimeProbability)}>
                    {employee.overtimeProbability}%
                  </Badge>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Current: </span>
                    <span className="font-semibold">{employee.currentHours}h</span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Predicted: </span>
                    <span className="font-semibold">
                      {new Date(employee.predictedOvertimeDate).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Conf: </span>
                    <span className="font-semibold">{employee.confidence}%</span>
                  </div>
                </div>

                {employee.availableReplacement && (
                  <Button
                    size="sm"
                    variant="outline"
                    className="w-full text-xs h-7"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleSwapEmployee(employee.employeeId);
                    }}
                  >
                    Swap with {employee.availableReplacement.name}
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>

      <div className="border-t p-3 bg-muted/30">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <TrendingUp className="w-4 h-4" />
            <span>{employees.length} employees at risk</span>
          </div>
          <button className="text-primary hover:underline text-xs">View all →</button>
        </div>
      </div>
    </Card>
  );
};

export default OvertimePredictionPanel;
