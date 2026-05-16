/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 2 Day 6
 * Quick Shift Creation Component
 * 
 * Single-form shift creation:
 * - Date picker
 * - Start/end time (with presets)
 * - Position selector
 * - Staff needed count
 * - AI recommendation checkbox
 * 
 * Goal: Create shift in <30 seconds
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { Clock, Users } from 'lucide-react';

const shiftSchema = z.object({
  date: z.string().refine((date) => new Date(date) > new Date(), 'Date must be in the future'),
  start_time: z.string(),
  end_time: z.string(),
  position: z.enum(['cook', 'server', 'bartender', 'manager', 'host', 'cashier']),
  staff_needed: z.number().min(1).max(10),
  use_ai_recommendation: z.boolean().default(false),
});

type ShiftData = z.infer<typeof shiftSchema>;

interface QuickShiftCreationProps {
  orgId: string;
  locationId: string;
  onSuccess?: () => void;
}

export const QuickShiftCreation: React.FC<QuickShiftCreationProps> = ({
  orgId,
  locationId,
  onSuccess,
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [aiSuggestion, setAiSuggestion] = useState<any>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ShiftData>({
    resolver: zodResolver(shiftSchema),
    defaultValues: {
      date: new Date().toISOString().split('T')[0],
      start_time: '09:00',
      end_time: '17:00',
      position: 'server',
      staff_needed: 2,
      use_ai_recommendation: false,
    },
  });

  const useAI = watch('use_ai_recommendation');
  const date = watch('date');
  const startTime = watch('start_time');
  const endTime = watch('end_time');
  const position = watch('position');

  // Fetch AI suggestion when inputs change
  React.useEffect(() => {
    if (!useAI || !date || !startTime) return;

    const fetchAISuggestion = async () => {
      try {
        const response = await fetch(
          `/api/v1/shifts/ai-recommend?date=${date}&start_time=${startTime}&position=${position}`,
          {
            headers: { 'X-Org-ID': orgId },
          }
        );
        const data = await response.json();
        setAiSuggestion(data);
        setValue('staff_needed', data.recommended_staff);
      } catch (error) {
        console.error('Failed to fetch AI suggestion');
      }
    };

    const timer = setTimeout(fetchAISuggestion, 500);
    return () => clearTimeout(timer);
  }, [useAI, date, startTime, position, orgId, setValue]);

  const onSubmit = async (data: ShiftData) => {
    setIsLoading(true);
    try {
      // Combine date and time
      const [hours, minutes] = data.start_time.split(':');
      const shiftDate = new Date(data.date);
      shiftDate.setHours(parseInt(hours), parseInt(minutes), 0);

      const response = await fetch('/api/v1/shifts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-ID': orgId,
        },
        body: JSON.stringify({
          org_id: orgId,
          location_id: locationId,
          start_time: shiftDate.toISOString(),
          end_time: new Date(
            shiftDate.getTime() + (parseInt(data.end_time.split(':')[0]) - parseInt(data.start_time.split(':')[0])) * 3600000
          ).toISOString(),
          position: data.position,
          staff_needed: data.staff_needed,
          ai_recommended: data.use_ai_recommendation,
        }),
      });

      if (!response.ok) throw new Error('Failed to create shift');

      const result = await response.json();
      toast.success(`Shift created: ${data.position} on ${data.date}`);
      onSuccess?.();

      // Reset form
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);
      setValue('date', tomorrow.toISOString().split('T')[0]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create shift');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Clock className="w-5 h-5" />
          Create New Shift
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Date */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="date">Date</Label>
              <Input type="date" {...register('date')} />
              {errors.date && <p className="text-sm text-red-600">{errors.date.message}</p>}
            </div>

            {/* Position */}
            <div className="space-y-2">
              <Label htmlFor="position">Position</Label>
              <Select defaultValue="server" onValueChange={(val) => setValue('position', val as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="cook">Cook</SelectItem>
                  <SelectItem value="server">Server</SelectItem>
                  <SelectItem value="bartender">Bartender</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="host">Host</SelectItem>
                  <SelectItem value="cashier">Cashier</SelectItem>
                </SelectContent>
              </Select>
              {errors.position && <p className="text-sm text-red-600">{errors.position.message}</p>}
            </div>
          </div>

          {/* Time Range */}
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label htmlFor="start_time">Start Time</Label>
              <Input type="time" {...register('start_time')} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="end_time">End Time</Label>
              <Input type="time" {...register('end_time')} />
            </div>
            <div className="space-y-2">
              <Label>Staff Needed</Label>
              <div className="flex items-center gap-2">
                <Input
                  type="number"
                  min={1}
                  max={10}
                  {...register('staff_needed', { valueAsNumber: true })}
                  className="flex-1"
                />
                <Users className="w-5 h-5 text-gray-400" />
              </div>
              {errors.staff_needed && <p className="text-sm text-red-600">{errors.staff_needed.message}</p>}
            </div>
          </div>

          {/* AI Recommendation */}
          <div className="flex items-center gap-3 bg-blue-50 p-4 rounded-lg">
            <Checkbox
              id="use_ai"
              {...register('use_ai_recommendation')}
              className="w-5 h-5"
            />
            <label htmlFor="use_ai" className="flex-1 cursor-pointer">
              <div className="font-semibold text-sm">Use AI Recommendation</div>
              <div className="text-xs text-gray-600">
                AI will suggest staffing based on historical demand
              </div>
            </label>
          </div>

          {/* AI Suggestion Display */}
          {useAI && aiSuggestion && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <div className="text-sm font-semibold text-green-900">AI Recommendation</div>
              <div className="mt-2 space-y-1 text-sm text-green-800">
                <div>Recommended staff: <span className="font-bold">{aiSuggestion.recommended_staff}</span></div>
                <div>Expected demand: <span className="font-bold">{aiSuggestion.expected_covers} covers</span></div>
                <div>Confidence: <span className="font-bold">{aiSuggestion.confidence}%</span></div>
              </div>
            </div>
          )}

          {/* Summary */}
          <div className="bg-gray-50 p-4 rounded-lg text-sm">
            <div className="font-semibold text-gray-900 mb-2">Shift Summary</div>
            <div className="text-gray-600 space-y-1">
              <div>
                {date} from {startTime} to {endTime}
              </div>
              <div>
                Position: <span className="font-semibold">{position}</span>
              </div>
              <div>
                Need to fill: <span className="font-semibold">{watch('staff_needed')} positions</span>
              </div>
            </div>
          </div>

          {/* Submit */}
          <Button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? 'Creating...' : 'Create Shift'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

export default QuickShiftCreation;
