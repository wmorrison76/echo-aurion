/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 1 Day 1
 * Employee Onboarding Component
 * 
 * 3-step onboarding flow (each step <2 min):
 * Step 1: Connect your availability (calendar + skills)
 * Step 2: Set your preferences (max hours, days off, distance)
 * Step 3: You're ready! (summary + first shifts)
 * 
 * Philosophy: No wizards, no "next" buttons. Each step is a complete form.
 * UX: <5 minutes total for new employee to be productive
 */

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { toast } from 'sonner';

// Zod schema for employee onboarding
const availabilitySchema = z.object({
  availability: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']))
    .min(1, 'Select at least one day'),
  employmentType: z.enum(['full-time', 'part-time', 'seasonal'], {
    errorMap: () => ({ message: 'Select employment type' }),
  }),
  skills: z.array(z.string()).min(1, 'Select at least one skill'),
});

const preferencesSchema = z.object({
  maxHoursPerWeek: z.number().min(4).max(60),
  daysOff: z.array(z.enum(['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'])),
  maxDistance: z.number().min(0).max(100).optional(),
  notes: z.string().max(500).optional(),
});

const summarySchema = z.object({
  confirmAvailability: z.boolean().refine((val) => val === true, 'Please confirm'),
  phone: z.string().regex(/^\d{10}$/, 'Invalid phone number'),
  emergencyContact: z.string().min(1, 'Required'),
});

type AvailabilityData = z.infer<typeof availabilitySchema>;
type PreferencesData = z.infer<typeof preferencesSchema>;
type SummaryData = z.infer<typeof summarySchema>;

interface EmployeeOnboardingProps {
  orgId: string;
  onComplete: (employeeId: string) => void;
}

export const EmployeeOnboarding: React.FC<EmployeeOnboardingProps> = ({ orgId, onComplete }) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [availability, setAvailability] = useState<AvailabilityData | null>(null);
  const [preferences, setPreferences] = useState<PreferencesData | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleStepOneSubmit = (data: AvailabilityData) => {
    setAvailability(data);
    setStep(2);
  };

  const handleStepTwoSubmit = (data: PreferencesData) => {
    setPreferences(data);
    setStep(3);
  };

  const handleStepThreeSubmit = async (data: SummaryData) => {
    if (!availability || !preferences) return;

    setIsLoading(true);
    try {
      // Prepare complete employee data
      const employeeData = {
        org_id: orgId,
        availability: availability.availability,
        employment_type: availability.employmentType,
        skills: availability.skills,
        max_hours_per_week: preferences.maxHoursPerWeek,
        days_off: preferences.daysOff,
        max_distance_km: preferences.maxDistance || 0,
        phone: data.phone,
        emergency_contact: data.emergencyContact,
        notes: preferences.notes || '',
      };

      const response = await fetch('/api/v1/employees/onboard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Org-ID': orgId,
        },
        body: JSON.stringify(employeeData),
      });

      if (!response.ok) {
        throw new Error('Failed to complete onboarding');
      }

      const result = await response.json();
      toast.success('Welcome! You\'re all set. Check out your first scheduled shifts.');
      onComplete(result.employeeId);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Onboarding failed');
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white p-4">
      <div className="max-w-2xl mx-auto">
        {/* Progress indicator */}
        <div className="flex justify-center gap-3 mb-8">
          {[1, 2, 3].map((num) => (
            <div
              key={num}
              className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-semibold ${
                num <= step
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-600'
              }`}
            >
              {num}
            </div>
          ))}
        </div>

        {/* Step 1: Availability */}
        {step === 1 && (
          <StepOneAvailability
            onSubmit={handleStepOneSubmit}
            defaultValues={availability}
          />
        )}

        {/* Step 2: Preferences */}
        {step === 2 && (
          <StepTwoPreferences
            onSubmit={handleStepTwoSubmit}
            onBack={() => setStep(1)}
            defaultValues={preferences}
          />
        )}

        {/* Step 3: Summary */}
        {step === 3 && availability && preferences && (
          <StepThreeSummary
            availability={availability}
            preferences={preferences}
            onSubmit={handleStepThreeSubmit}
            onBack={() => setStep(2)}
            isLoading={isLoading}
          />
        )}
      </div>
    </div>
  );
};

// STEP 1: AVAILABILITY
interface StepOneProps {
  onSubmit: (data: AvailabilityData) => void;
  defaultValues?: AvailabilityData | null;
}

const StepOneAvailability: React.FC<StepOneProps> = ({ onSubmit, defaultValues }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<AvailabilityData>({
    resolver: zodResolver(availabilitySchema),
    defaultValues: defaultValues || {
      availability: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
      employmentType: 'full-time',
      skills: [],
    },
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const skillOptions = ['Cook', 'Server', 'Bartender', 'Manager', 'Host', 'Cashier', 'Dishwasher'];
  const availability = watch('availability');
  const selectedSkills = watch('skills');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Connect Your Availability</CardTitle>
        <CardDescription>Let us know when you can work and what you're good at</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Employment Type */}
          <div className="space-y-3">
            <Label>Employment Type</Label>
            <Select defaultValue="full-time" {...register('employmentType')}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="full-time">Full-time (all days)</SelectItem>
                <SelectItem value="part-time">Part-time (3 days/week)</SelectItem>
                <SelectItem value="seasonal">Seasonal</SelectItem>
              </SelectContent>
            </Select>
            {errors.employmentType && (
              <p className="text-sm text-red-600">{errors.employmentType.message}</p>
            )}
          </div>

          {/* Days Available */}
          <div className="space-y-3">
            <Label>Days You Can Work</Label>
            <div className="grid grid-cols-2 gap-3">
              {days.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={day}
                    {...register('availability')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
            {errors.availability && (
              <p className="text-sm text-red-600">{errors.availability.message}</p>
            )}
          </div>

          {/* Skills */}
          <div className="space-y-3">
            <Label>Your Skills</Label>
            <div className="grid grid-cols-2 gap-3">
              {skillOptions.map((skill) => (
                <label key={skill} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={skill}
                    {...register('skills')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{skill}</span>
                </label>
              ))}
            </div>
            {errors.skills && (
              <p className="text-sm text-red-600">{errors.skills.message}</p>
            )}
          </div>

          {/* Summary stats */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              Available: <span className="font-semibold">{availability?.length || 0}/7 days</span>
            </p>
            <p className="text-sm text-gray-700 mt-1">
              Skills: <span className="font-semibold">{selectedSkills?.length || 0} selected</span>
            </p>
          </div>

          <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-700">
            Next: Preferences →
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};

// STEP 2: PREFERENCES
interface StepTwoProps {
  onSubmit: (data: PreferencesData) => void;
  onBack: () => void;
  defaultValues?: PreferencesData | null;
}

const StepTwoPreferences: React.FC<StepTwoProps> = ({ onSubmit, onBack, defaultValues }) => {
  const { register, handleSubmit, watch, formState: { errors } } = useForm<PreferencesData>({
    resolver: zodResolver(preferencesSchema),
    defaultValues: defaultValues || {
      maxHoursPerWeek: 40,
      daysOff: [],
      maxDistance: 10,
      notes: '',
    },
  });

  const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
  const maxHours = watch('maxHoursPerWeek');
  const daysOff = watch('daysOff');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Set Your Preferences</CardTitle>
        <CardDescription>Tell us your work preferences and constraints</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Max Hours */}
          <div className="space-y-3">
            <Label>Maximum Hours Per Week</Label>
            <div className="flex items-center gap-4">
              <Slider
                {...register('maxHoursPerWeek', { valueAsNumber: true })}
                min={4}
                max={60}
                step={1}
                value={[maxHours]}
                onValueChange={(value) => {
                  register('maxHoursPerWeek').onChange({
                    target: { value: value[0] },
                  });
                }}
                className="flex-1"
              />
              <span className="text-lg font-semibold text-blue-600 w-12">{maxHours}h</span>
            </div>
            {errors.maxHoursPerWeek && (
              <p className="text-sm text-red-600">{errors.maxHoursPerWeek.message}</p>
            )}
          </div>

          {/* Days Off */}
          <div className="space-y-3">
            <Label>Days Off (Optional)</Label>
            <div className="grid grid-cols-2 gap-3">
              {days.map((day) => (
                <label key={day} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    value={day}
                    {...register('daysOff')}
                    className="w-4 h-4"
                  />
                  <span className="text-sm">{day}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Distance */}
          <div className="space-y-3">
            <Label>Max Distance (km)</Label>
            <Input
              type="number"
              placeholder="10"
              {...register('maxDistance', { valueAsNumber: true })}
            />
            {errors.maxDistance && (
              <p className="text-sm text-red-600">{errors.maxDistance.message}</p>
            )}
          </div>

          {/* Notes */}
          <div className="space-y-3">
            <Label>Additional Notes (Optional)</Label>
            <textarea
              {...register('notes')}
              placeholder="Any other preferences or constraints..."
              className="w-full p-2 border rounded-lg min-h-20"
            />
            {errors.notes && (
              <p className="text-sm text-red-600">{errors.notes.message}</p>
            )}
          </div>

          {/* Summary */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <p className="text-sm text-gray-700">
              Max hours: <span className="font-semibold">{maxHours}h/week</span>
            </p>
            <p className="text-sm text-gray-700 mt-1">
              Days off: <span className="font-semibold">{daysOff?.length || 0}</span>
            </p>
          </div>

          <div className="flex gap-3">
            <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
              ← Back
            </Button>
            <Button type="submit" className="flex-1 bg-blue-600 hover:bg-blue-700">
              Next: Confirm →
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// STEP 3: SUMMARY & CONFIRMATION
interface StepThreeProps {
  availability: AvailabilityData;
  preferences: PreferencesData;
  onSubmit: (data: SummaryData) => void;
  onBack: () => void;
  isLoading: boolean;
}

const StepThreeSummary: React.FC<StepThreeProps> = ({
  availability,
  preferences,
  onSubmit,
  onBack,
  isLoading,
}) => {
  const { register, handleSubmit, formState: { errors } } = useForm<SummaryData>({
    resolver: zodResolver(summarySchema),
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>You're Almost Ready!</CardTitle>
        <CardDescription>Confirm your details and you're all set</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Summary of previous steps */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Available days:</span>
              <span className="font-semibold">{availability.availability.length}/7</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Max hours/week:</span>
              <span className="font-semibold">{preferences.maxHoursPerWeek}h</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-gray-600">Your skills:</span>
              <span className="font-semibold">{availability.skills.length}</span>
            </div>
          </div>

          {/* Phone */}
          <div className="space-y-2">
            <Label>Phone Number</Label>
            <Input
              type="tel"
              placeholder="(555) 123-4567"
              {...register('phone')}
            />
            {errors.phone && (
              <p className="text-sm text-red-600">{errors.phone.message}</p>
            )}
          </div>

          {/* Emergency Contact */}
          <div className="space-y-2">
            <Label>Emergency Contact Name</Label>
            <Input
              type="text"
              placeholder="Name and phone number"
              {...register('emergencyContact')}
            />
            {errors.emergencyContact && (
              <p className="text-sm text-red-600">{errors.emergencyContact.message}</p>
            )}
          </div>

          {/* Confirm */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              {...register('confirmAvailability')}
              className="w-4 h-4 mt-1"
            />
            <span className="text-sm text-gray-700">
              I confirm the information above is correct and I'm ready to start
            </span>
          </label>
          {errors.confirmAvailability && (
            <p className="text-sm text-red-600">{errors.confirmAvailability.message}</p>
          )}

          {/* Next steps */}
          <div className="bg-green-50 p-4 rounded-lg">
            <p className="text-sm font-semibold text-green-900">Next steps:</p>
            <ul className="text-sm text-green-800 mt-2 space-y-1">
              <li>✓ Check your first scheduled shifts</li>
              <li>✓ Download the mobile app for clock in/out</li>
              <li>✓ Set up direct deposit for pay</li>
            </ul>
          </div>

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={onBack}
              disabled={isLoading}
            >
              ← Back
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isLoading}
            >
              {isLoading ? 'Setting up...' : 'Complete Onboarding ✓'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default EmployeeOnboarding;
