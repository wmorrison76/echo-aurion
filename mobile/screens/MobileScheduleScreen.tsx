/**
 * Mobile Schedule Screen
 * Responsive schedule management for mobile and tablet devices
 * Weeks 5-7 Implementation
 */

import React, { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { ChevronLeft, ChevronRight, Clock, MapPin, AlertCircle } from 'lucide-react';

interface Shift {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  location: string;
  role: string;
  status: 'scheduled' | 'confirmed' | 'completed' | 'cancelled';
  notes?: string;
}

interface MobileScheduleScreenProps {
  employeeId?: string;
  onShiftSwap?: (shiftId: string) => void;
}

export const MobileScheduleScreen: React.FC<MobileScheduleScreenProps> = ({
  employeeId = 'default-employee',
  onShiftSwap,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [shifts, setShifts] = useState<Shift[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedShift, setSelectedShift] = useState<Shift | null>(null);
  const [showSwapDialog, setShowSwapDialog] = useState(false);

  // Fetch schedule for current week
  useEffect(() => {
    const fetchSchedule = async () => {
      try {
        setLoading(true);
        const startDate = new Date(currentDate);
        startDate.setDate(startDate.getDate() - startDate.getDay()); // Start of week

        const endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 6); // End of week

        const response = await fetch(
          `/api/v1/shifts?employeeId=${employeeId}&` +
          `startDate=${startDate.toISOString()}&` +
          `endDate=${endDate.toISOString()}`
        );

        if (!response.ok) throw new Error('Failed to fetch schedule');

        const data = await response.json();
        setShifts(data.shifts || []);
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load schedule');
        console.error('[MOBILE-SCHEDULE] Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [currentDate, employeeId]);

  // Navigate weeks
  const goToPreviousWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentDate(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentDate);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentDate(newDate);
  };

  // Format date for display
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatTime = (timeStr: string) => {
    return new Date(`2000-01-01T${timeStr}`).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-100 text-green-800 border-green-300';
      case 'scheduled':
        return 'bg-blue-100 text-blue-800 border-blue-300';
      case 'completed':
        return 'bg-gray-100 text-gray-800 border-gray-300';
      case 'cancelled':
        return 'bg-red-100 text-red-800 border-red-300';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleRequestSwap = (shift: Shift) => {
    setSelectedShift(shift);
    setShowSwapDialog(true);
  };

  const confirmSwap = () => {
    if (selectedShift && onShiftSwap) {
      onShiftSwap(selectedShift.id);
    }
    setShowSwapDialog(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-white">
        <div className="text-center">
          <div className="animate-spin w-12 h-12 border-4 border-blue-200 border-t-blue-600 rounded-full mx-auto mb-4" />
          <p className="text-gray-600 font-medium">Loading schedule...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gray-50 flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">Schedule</h1>

          {/* Week Navigation */}
          <div className="flex items-center justify-between">
            <Button
              variant="ghost"
              size="sm"
              onClick={goToPreviousWeek}
              className="p-2"
            >
              <ChevronLeft className="w-5 h-5" />
            </Button>

            <div className="text-center flex-1">
              <p className="text-sm font-semibold text-gray-700">
                {currentDate.toLocaleDateString('en-US', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              <p className="text-xs text-gray-500">
                Week of{' '}
                {new Date(
                  currentDate.getFullYear(),
                  currentDate.getMonth(),
                  currentDate.getDate() - currentDate.getDay()
                ).toLocaleDateString('en-US', {
                  month: 'short',
                  day: 'numeric',
                })}
              </p>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={goToNextWeek}
              className="p-2"
            >
              <ChevronRight className="w-5 h-5" />
            </Button>
          </div>
        </div>
      </div>

      {/* Error State */}
      {error && (
        <div className="mx-4 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg flex gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-medium text-red-900">Error</p>
            <p className="text-sm text-red-700">{error}</p>
          </div>
        </div>
      )}

      {/* Shifts List */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {shifts.length === 0 ? (
          <Card className="p-6 text-center">
            <Clock className="w-12 h-12 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-600 font-medium">No shifts scheduled</p>
            <p className="text-sm text-gray-500 mt-1">
              Check back later for upcoming shifts
            </p>
          </Card>
        ) : (
          shifts.map((shift) => (
            <Card
              key={shift.id}
              className="p-4 hover:shadow-md transition-shadow border-l-4 border-l-blue-500"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900">{shift.role}</h3>
                    <span
                      className={`text-xs font-semibold px-2 py-1 rounded-full border ${getStatusColor(
                        shift.status
                      )}`}
                    >
                      {shift.status}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">
                    {formatDate(shift.date)}
                  </p>
                </div>
              </div>

              <div className="space-y-2 mb-4">
                <div className="flex items-center gap-2 text-sm text-gray-700">
                  <Clock className="w-4 h-4 text-gray-500" />
                  <span>
                    {formatTime(shift.startTime)} - {formatTime(shift.endTime)}
                  </span>
                  <span className="text-gray-500">
                    ({Math.floor((new Date(`2000-01-01T${shift.endTime}`).getTime() - new Date(`2000-01-01T${shift.startTime}`).getTime()) / (1000 * 60 * 60))}h)
                  </span>
                </div>

                {shift.location && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <MapPin className="w-4 h-4 text-gray-500" />
                    <span>{shift.location}</span>
                  </div>
                )}
              </div>

              {shift.notes && (
                <div className="mb-4 p-2 bg-gray-50 rounded border border-gray-200">
                  <p className="text-xs text-gray-600">{shift.notes}</p>
                </div>
              )}

              {shift.status !== 'completed' && shift.status !== 'cancelled' && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleRequestSwap(shift)}
                    className="flex-1 text-xs"
                  >
                    Request Swap
                  </Button>
                  <Button
                    variant="default"
                    size="sm"
                    className="flex-1 text-xs bg-blue-600 hover:bg-blue-700"
                  >
                    Details
                  </Button>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Swap Dialog */}
      <AlertDialog open={showSwapDialog} onOpenChange={setShowSwapDialog}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogTitle>Request Shift Swap</AlertDialogTitle>
          <AlertDialogDescription>
            {selectedShift && (
              <div className="space-y-2 mt-4">
                <p>
                  <strong>Date:</strong> {formatDate(selectedShift.date)}
                </p>
                <p>
                  <strong>Time:</strong> {formatTime(selectedShift.startTime)} -{' '}
                  {formatTime(selectedShift.endTime)}
                </p>
                <p>
                  <strong>Role:</strong> {selectedShift.role}
                </p>
                <p className="text-sm text-gray-600 mt-4">
                  This will notify managers of your swap request.
                </p>
              </div>
            )}
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSwap} className="bg-blue-600">
              Request Swap
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MobileScheduleScreen;
