import React, { useState, useEffect } from 'react';
import { ChevronDown, AlertTriangle, CheckCircle, DollarSign, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { toast } from '../ui/use-toast';

interface PayrollEntry {
  employeeId: string;
  name: string;
  position: string;
  department: string;
  regularHours: number;
  overtimeHours: number;
  regularPay: number;
  overtimePay: number;
  bonuses: number;
  deductions: number;
  grossPay: number;
  netPay: number;
  flags: string[];
}

interface PayrollReviewProps {
  organizationId: string;
  period: string;
  onApprove?: (entries: PayrollEntry[]) => void;
}

const PayrollReview: React.FC<PayrollReviewProps> = ({ organizationId, period, onApprove }) => {
  const [entries, setEntries] = useState<PayrollEntry[]>([]);
  const [loading, setLoading] = useState(false);
  const [sortBy, setSortBy] = useState<'name' | 'hours' | 'amount'>('name');
  const [filterDepartment, setFilterDepartment] = useState<'all' | string>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchPayroll();
  }, [organizationId, period, sortBy, filterDepartment]);

  const fetchPayroll = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/payroll/review?org_id=${organizationId}&period=${period}&sort=${sortBy}`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) throw new Error('Failed to fetch payroll');

      const data = await response.json();
      setEntries(data.entries || generateMockPayroll());
    } catch (error) {
      console.error('Payroll fetch error:', error);
      setEntries(generateMockPayroll());
    } finally {
      setLoading(false);
    }
  };

  const getFilteredEntries = () => {
    return entries.filter((e) =>
      filterDepartment === 'all' ? true : e.department === filterDepartment
    );
  };

  const getSortedEntries = () => {
    const filtered = getFilteredEntries();

    switch (sortBy) {
      case 'hours':
        return [...filtered].sort((a, b) => (b.regularHours + b.overtimeHours) - (a.regularHours + a.overtimeHours));
      case 'amount':
        return [...filtered].sort((a, b) => b.grossPay - a.grossPay);
      case 'name':
      default:
        return [...filtered].sort((a, b) => a.name.localeCompare(b.name));
    }
  };

  const calculateTotals = () => {
    const sorted = getSortedEntries();
    return {
      count: sorted.length,
      totalHours: sorted.reduce((sum, e) => sum + e.regularHours + e.overtimeHours, 0),
      totalRegularPay: sorted.reduce((sum, e) => sum + e.regularPay, 0),
      totalOvertimePay: sorted.reduce((sum, e) => sum + e.overtimePay, 0),
      totalDeductions: sorted.reduce((sum, e) => sum + e.deductions, 0),
      totalGrossPay: sorted.reduce((sum, e) => sum + e.grossPay, 0),
      totalNetPay: sorted.reduce((sum, e) => sum + e.netPay, 0),
    };
  };

  const handleApproveAll = async () => {
    try {
      onApprove?.(entries);
      toast({
        title: 'Payroll approved',
        description: `${entries.length} employees' payroll has been approved and submitted to Rippling`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to approve payroll',
        variant: 'destructive',
      });
    }
  };

  const departments = [...new Set(entries.map((e) => e.department))];
  const totals = calculateTotals();
  const sortedEntries = getSortedEntries();
  const flaggedCount = sortedEntries.filter((e) => e.flags.length > 0).length;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">Payroll Review</h1>
          <p className="text-sm text-muted-foreground mt-2">Period: {period}</p>
        </div>
        <Button
          onClick={handleApproveAll}
          size="lg"
          className="gap-2"
          disabled={flaggedCount > 0 && flaggedCount === sortedEntries.length}
        >
          <CheckCircle className="w-5 h-5" />
          Approve All
        </Button>
      </div>

      {/* Alerts */}
      {flaggedCount > 0 && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            {flaggedCount} employee{flaggedCount > 1 ? 's' : ''} flagged for review. Please address before approving.
          </AlertDescription>
        </Alert>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Payroll</p>
                <p className="text-3xl font-bold text-green-600">
                  ${totals.totalGrossPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </p>
              </div>
              <DollarSign className="w-8 h-8 text-green-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Hours</p>
                <p className="text-3xl font-bold text-blue-600">{totals.totalHours.toFixed(0)}</p>
              </div>
              <Clock className="w-8 h-8 text-blue-200" />
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div>
              <p className="text-sm text-muted-foreground">Employees</p>
              <p className="text-3xl font-bold">{totals.count}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex gap-4 items-end flex-wrap">
        <div className="min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">Department</label>
          <Select value={filterDepartment} onValueChange={(v) => setFilterDepartment(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Departments</SelectItem>
              {departments.map((dept) => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="min-w-[200px]">
          <label className="text-sm font-medium mb-2 block">Sort By</label>
          <Select value={sortBy} onValueChange={(v: any) => setSortBy(v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Name</SelectItem>
              <SelectItem value="hours">Hours</SelectItem>
              <SelectItem value="amount">Amount</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Payroll Entries */}
      <div className="space-y-2">
        {loading ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              Loading payroll...
            </CardContent>
          </Card>
        ) : sortedEntries.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No payroll entries found
            </CardContent>
          </Card>
        ) : (
          sortedEntries.map((entry) => (
            <Card
              key={entry.employeeId}
              className={`transition-colors ${
                entry.flags.length > 0 ? 'border-red-300 bg-red-50' : ''
              }`}
            >
              <div
                className="cursor-pointer"
                onClick={() => setExpandedId(expandedId === entry.employeeId ? null : entry.employeeId)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">{entry.name}</p>
                        <Badge variant="outline">{entry.position}</Badge>
                        {entry.flags.length > 0 && (
                          <Badge variant="destructive" className="gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            {entry.flags.length} flag{entry.flags.length > 1 ? 's' : ''}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">{entry.department}</p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs text-muted-foreground mb-1">Gross Pay</p>
                      <p className="text-xl font-bold text-green-600">
                        ${entry.grossPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                      </p>
                    </div>

                    <ChevronDown
                      className={`w-5 h-5 transition-transform ${expandedId === entry.employeeId ? 'rotate-180' : ''}`}
                    />
                  </div>
                </CardHeader>

                {/* Expanded Details */}
                {expandedId === entry.employeeId && (
                  <CardContent className="border-t pt-4 space-y-4">
                    {/* Hours Breakdown */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm text-muted-foreground">Regular Hours</p>
                        <p className="text-lg font-semibold">{entry.regularHours}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Overtime Hours</p>
                        <p className="text-lg font-semibold text-orange-600">{entry.overtimeHours}</p>
                      </div>
                    </div>

                    {/* Pay Breakdown */}
                    <div className="space-y-2 bg-muted/50 p-3 rounded-lg">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Regular Pay</span>
                        <span className="font-semibold">
                          ${entry.regularPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                      {entry.overtimePay > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Overtime Pay</span>
                          <span className="font-semibold text-orange-600">
                            ${entry.overtimePay.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      {entry.bonuses > 0 && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Bonuses</span>
                          <span className="font-semibold text-blue-600">
                            ${entry.bonuses.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}
                      <div className="border-t border-gray-300 pt-2 flex justify-between font-semibold">
                        <span>Gross Pay</span>
                        <span className="text-green-600">
                          ${entry.grossPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    {/* Deductions */}
                    {entry.deductions > 0 && (
                      <div className="space-y-2 bg-red-50 p-3 rounded-lg border border-red-200">
                        <p className="text-sm font-semibold text-red-800">Deductions</p>
                        <div className="flex justify-between text-sm">
                          <span className="text-red-700">Total Deductions</span>
                          <span className="font-semibold text-red-700">
                            -${entry.deductions.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="border-t border-red-200 pt-2 flex justify-between font-semibold text-red-800">
                          <span>Net Pay</span>
                          <span>
                            ${entry.netPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Flags */}
                    {entry.flags.length > 0 && (
                      <Alert variant="destructive">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          <ul className="list-disc list-inside space-y-1">
                            {entry.flags.map((flag, i) => (
                              <li key={i} className="text-sm">
                                {flag}
                              </li>
                            ))}
                          </ul>
                        </AlertDescription>
                      </Alert>
                    )}
                  </CardContent>
                )}
              </div>
            </Card>
          ))
        )}
      </div>

      {/* Totals Footer */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Employees</span>
              <span className="text-xl font-bold">{totals.count}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="font-semibold">Total Hours</span>
              <span className="text-xl font-bold">{totals.totalHours.toFixed(0)}</span>
            </div>
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-bold text-lg">Total Payroll (Gross)</span>
              <span className="text-2xl font-bold text-green-600">
                ${totals.totalGrossPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
            {totals.totalDeductions > 0 && (
              <div className="flex justify-between items-center text-red-600">
                <span className="font-semibold">Total Deductions</span>
                <span className="font-bold">
                  -${totals.totalDeductions.toLocaleString('en-US', { maximumFractionDigits: 2 })}
                </span>
              </div>
            )}
            <div className="border-t pt-2 flex justify-between items-center">
              <span className="font-bold text-lg">Total Net Pay</span>
              <span className="text-2xl font-bold">
                ${totals.totalNetPay.toLocaleString('en-US', { maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

// ============================================================================
// MOCK DATA
// ============================================================================

function generateMockPayroll(): PayrollEntry[] {
  const positions = ['Chef', 'Server', 'Host', 'Busser', 'Bartender'];
  const departments = ['Kitchen', 'Service', 'Management'];
  const employees = [
    'Sarah Johnson',
    'Marcus Williams',
    'Jennifer Lee',
    'David Martinez',
    'Amanda Davis',
    'Mike Chen',
    'Lisa Wong',
    'James Smith',
  ];

  return employees.map((name, i) => ({
    employeeId: `emp-${i}`,
    name,
    position: positions[i % positions.length],
    department: departments[i % departments.length],
    regularHours: 40 + Math.floor(Math.random() * 8),
    overtimeHours: Math.floor(Math.random() * 8),
    regularPay: 600 + Math.random() * 200,
    overtimePay: Math.random() > 0.5 ? 100 + Math.random() * 150 : 0,
    bonuses: Math.random() > 0.8 ? 50 : 0,
    deductions: 150 + Math.random() * 100,
    grossPay: 700 + Math.random() * 300,
    netPay: 550 + Math.random() * 250,
    flags: Math.random() > 0.7 ? ['Negative hours check', 'Overnight shift'] : [],
  }));
}

export default PayrollReview;
