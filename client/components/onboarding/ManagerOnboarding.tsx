/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 1 Day 2
 * Manager Onboarding Component
 * 
 * 3-step manager onboarding:
 * Step 1: Import your team (CSV upload + validation)
 * Step 2: Set schedule rules (labor budget, min staff, holidays)
 * Step 3: You're ready! (schedule preview, tutorial)
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';
import { Upload, AlertCircle, CheckCircle } from 'lucide-react';

const scheduleRulesSchema = z.object({
  labor_budget_weekly: z.number().min(100).max(100000),
  min_staff_per_shift: z.number().min(1).max(20),
  unavailable_dates: z.array(z.string()),
});

const confirmSchema = z.object({
  confirmSetup: z.boolean().refine((val) => val === true, 'Please confirm'),
});

type ScheduleRulesData = z.infer<typeof scheduleRulesSchema>;
type ConfirmData = z.infer<typeof confirmSchema>;

interface ManagerOnboardingProps {
  orgId: string;
  locationId: string;
  onComplete: () => void;
}

interface EmployeeRow {
  name: string;
  email: string;
  role: string;
  start_date: string;
  status: 'valid' | 'invalid';
  error?: string;
}

export const ManagerOnboarding: React.FC<ManagerOnboardingProps> = ({ orgId, locationId, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [employees, setEmployees] = useState<EmployeeRow[]>([]);
  const [rules, setRules] = useState<ScheduleRulesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const parseCSV = (content: string): EmployeeRow[] => {
    const lines = content.split('\n').filter((line) => line.trim());
    const headers = lines[0].toLowerCase().split(',').map((h) => h.trim());

    return lines.slice(1).map((line, idx) => {
      const values = line.split(',').map((v) => v.trim());
      const row: EmployeeRow = {
        name: values[headers.indexOf('name')] || '',
        email: values[headers.indexOf('email')] || '',
        role: values[headers.indexOf('role')] || '',
        start_date: values[headers.indexOf('start_date')] || '',
        status: 'valid',
      };

      // Validation
      if (!row.name || row.name.length < 2) {
        row.status = 'invalid';
        row.error = 'Invalid name';
      } else if (!row.email || !row.email.includes('@')) {
        row.status = 'invalid';
        row.error = 'Invalid email';
      } else if (!row.role || !['cook', 'server', 'bartender', 'manager', 'host'].includes(row.role.toLowerCase())) {
        row.status = 'invalid';
        row.error = 'Invalid role';
      }

      return row;
    });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = parseCSV(content);
        setEmployees(parsed);

        const validCount = parsed.filter((e) => e.status === 'valid').length;
        toast.success(`${validCount} valid employees found`);
      } catch (error) {
        toast.error('Failed to parse CSV');
      }
    };
    reader.readAsText(file);
  };

  const handleStepTwoSubmit = (data: ScheduleRulesData) => {
    setRules(data);
    setStep(3);
  };

  const handleStepThreeSubmit = async (data: ConfirmData) => {
    if (!employees.length) {
      toast.error('Please import at least one employee');
      return;
    }

    const validEmployees = employees.filter((e) => e.status === 'valid');
    if (!validEmployees.length) {
      toast.error('No valid employees to import');
      return;
    }

    setIsLoading(true);
    try {
      // Bulk create employees
      const response = await fetch('/api/v1/employees/bulk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-ID': orgId,
        },
        body: JSON.stringify({
          org_id: orgId,
          employees: validEmployees.map((emp) => ({
            location_id: locationId,
            first_name: emp.name.split(' ')[0],
            last_name: emp.name.split(' ').slice(1).join(' ') || 'Employee',
            email: emp.email,
            role: emp.role.toLowerCase(),
            hourly_rate: 15,
            phone: '',
          })),
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to import employees');
      }

      toast.success(`${validEmployees.length} employees imported successfully`);
      onComplete();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Import failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-purple-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                num <= step
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {num}
            </div>
          ))}
        </div>

        {/* Step 1: Import Team */}
        {step === 1 && (
          <StepOneImport
            employees={employees}
            onFileUpload={handleFileUpload}
            onNext={() => setStep(2)}
          />
        )}

        {/* Step 2: Schedule Rules */}
        {step === 2 && (
          <StepTwoRules
            onSubmit={handleStepTwoSubmit}
            onBack={() => setStep(1)}
          />
        )}

        {/* Step 3: Confirmation */}
        {step === 3 && employees && (
          <StepThreeConfirm
            employeeCount={employees.filter((e) => e.status === 'valid').length}
            rules={rules}
            onSubmit={handleStepThreeSubmit}
            onBack={() => setStep(2)}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

// STEP 1: IMPORT TEAM
interface StepOneProps {
  employees: EmployeeRow[];
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onNext: () => void;
}

const StepOneImport: React.FC<StepOneProps> = ({ employees, onFileUpload, onNext }) => {
  const validCount = employees.filter((e) => e.status === 'valid').length;
  const invalidCount = employees.filter((e) => e.status === 'invalid').length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Import Your Team</CardTitle>
        <CardDescription>Upload a CSV file with your employee list (name, email, role, start_date)</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Upload area */}
        <label className="border-2 border-dashed border-purple-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-500 transition">
          <Upload className="w-12 h-12 mx-auto text-purple-400 mb-2" />
          <div className="text-sm text-gray-600">
            <span className="font-semibold text-purple-600">Click to upload</span> or drag and drop
          </div>
          <div className="text-xs text-gray-500 mt-1">CSV file (name, email, role, start_date)</div>
          <input type="file" accept=".csv" onChange={onFileUpload} className="hidden" />
        </label>

        {/* Results */}
        {employees.length > 0 && (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-green-50 p-4 rounded-lg">
                <div className="text-2xl font-bold text-green-600">{validCount}</div>
                <div className="text-sm text-green-700">Valid employees</div>
              </div>
              {invalidCount > 0 && (
                <div className="bg-red-50 p-4 rounded-lg">
                  <div className="text-2xl font-bold text-red-600">{invalidCount}</div>
                  <div className="text-sm text-red-700">Invalid rows</div>
                </div>
              )}
            </div>

            {/* Invalid rows */}
            {invalidCount > 0 && (
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex gap-2 mb-2">
                  <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0" />
                  <span className="font-semibold text-yellow-900">Fix these rows:</span>
                </div>
                <div className="space-y-1 text-sm text-yellow-800">
                  {employees.map((emp, idx) => (
                    emp.status === 'invalid' && (
                      <div key={idx}>
                        Row {idx + 2}: {emp.error}
                      </div>
                    )
                  ))}
                </div>
              </div>
            )}

            {/* Employee list */}
            <div className="border rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>
                    <th className="px-4 py-2 text-left font-semibold">Name</th>
                    <th className="px-4 py-2 text-left font-semibold">Role</th>
                    <th className="px-4 py-2 text-left font-semibold">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {employees.slice(0, 10).map((emp, idx) => (
                    <tr key={idx} className={emp.status === 'invalid' ? 'bg-red-50' : 'hover:bg-gray-50'}>
                      <td className="px-4 py-2">{emp.name}</td>
                      <td className="px-4 py-2">{emp.role}</td>
                      <td className="px-4 py-2">
                        <span
                          className={`text-xs px-2 py-1 rounded-full ${
                            emp.status === 'valid'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {employees.length > 10 && (
                <div className="px-4 py-2 bg-gray-50 text-xs text-gray-600">
                  +{employees.length - 10} more
                </div>
              )}
            </div>
          </>
        )}

        <Button
          onClick={onNext}
          disabled={validCount === 0}
          className="w-full bg-purple-600 hover:bg-purple-700"
        >
          Next: Schedule Rules →
        </Button>
      </CardContent>
    </Card>
  );
};

// STEP 2: SCHEDULE RULES
interface StepTwoProps {
  onSubmit: (data: ScheduleRulesData) => void;
  onBack: () => void;
}

const StepTwoRules: React.FC<StepTwoProps> = ({ onSubmit, onBack }) => {
  const { register, handleSubmit, watch } = useForm<ScheduleRulesData>({
    resolver: zodResolver(scheduleRulesSchema),
    defaultValues: {
      labor_budget_weekly: 5000,
      min_staff_per_shift: 2,
      unavailable_dates: [],
    },
  });

  const budget = watch('labor_budget_weekly');
  const minStaff = watch('min_staff_per_shift');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Schedule Rules</CardTitle>
        <CardDescription>Configure labor budget and staffing requirements</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Weekly Labor Budget */}
          <div className="space-y-3">
            <Label>Weekly Labor Budget ($)</Label>
            <div className="flex items-center gap-4">
              <Slider
                {...register('labor_budget_weekly', { valueAsNumber: true })}
                min={100}
                max={100000}
                step={100}
                value={[budget]}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-purple-600 w-24">${budget}</span>
            </div>
          </div>

          {/* Minimum Staff */}
          <div className="space-y-3">
            <Label>Minimum Staff Per Shift</Label>
            <div className="flex items-center gap-4">
              <Slider
                {...register('min_staff_per_shift', { valueAsNumber: true })}
                min={1}
                max={20}
                step={1}
                value={[minStaff]}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-purple-600 w-8">{minStaff}</span>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-purple-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              Max labor cost: <span className="font-semibold">${budget}/week</span>
            </p>
            <p className="text-sm text-gray-700 mt-1">
              Minimum coverage: <span className="font-semibold">{minStaff} staff/shift</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
              ← Back
            </Button>
            <Button type="submit" className="flex-1 bg-purple-600 hover:bg-purple-700">
              Next: Confirm →
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// STEP 3: CONFIRMATION
interface StepThreeProps {
  employeeCount: number;
  rules: ScheduleRulesData | null;
  onSubmit: (data: ConfirmData) => void;
  onBack: () => void;
  isLoading: boolean;
}

const StepThreeConfirm: React.FC<StepThreeProps> = ({
  employeeCount,
  rules,
  onSubmit,
  onBack,
  isLoading,
}) => {
  const { register, handleSubmit } = useForm<ConfirmData>({
    resolver: zodResolver(confirmSchema),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>You're Ready to Go!</CardTitle>
        <CardDescription>Review your setup before importing</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Summary */}
          <div className="space-y-3">
            <div className="flex items-center justify-between bg-green-50 p-4 rounded-lg">
              <span className="text-sm text-gray-700">Employees to import:</span>
              <span className="font-bold text-green-600">{employeeCount}</span>
            </div>
            <div className="flex items-center justify-between bg-purple-50 p-4 rounded-lg">
              <span className="text-sm text-gray-700">Weekly budget:</span>
              <span className="font-bold text-purple-600">${rules?.labor_budget_weekly}</span>
            </div>
            <div className="flex items-center justify-between bg-blue-50 p-4 rounded-lg">
              <span className="text-sm text-gray-700">Min staff per shift:</span>
              <span className="font-bold text-blue-600">{rules?.min_staff_per_shift}</span>
            </div>
          </div>

          {/* Next steps */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-blue-900 mb-2">Next steps:</p>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>✓ Employees will start appearing in your schedule</li>
              <li>✓ AI will optimize scheduling based on your budget</li>
              <li>✓ View the 14-day forecast immediately</li>
            </ul>
          </div>

          {/* Confirm */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input type="checkbox" {...register('confirmSetup')} className="w-4 h-4 mt-1" />
            <span className="text-sm text-gray-700">I confirm this setup is correct</span>
          </label>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={isLoading}>
              ← Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? 'Importing...' : 'Complete Setup ✓'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default ManagerOnboarding;
