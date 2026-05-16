/**
 * Mobile Clocking Screen
 * Time tracking with biometric authentication support
 * Weeks 8-9 Implementation
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
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Clock, AlertCircle, CheckCircle, Loader } from 'lucide-react';

interface ClockRecord {
  id: string;
  timestamp: string;
  type: 'clock_in' | 'clock_out';
  method: 'biometric' | 'manual' | 'voice';
  location: {
    latitude: number;
    longitude: number;
    address?: string;
  };
  deviceId: string;
}

interface MobileClockingScreenProps {
  employeeId?: string;
  onClockChange?: (record: ClockRecord) => void;
}

export const MobileClockingScreen: React.FC<MobileClockingScreenProps> = ({
  employeeId = 'default-employee',
  onClockChange,
}) => {
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [todayRecords, setTodayRecords] = useState<ClockRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showConfirm, setShowConfirm] = useState(false);
  const [useBiometric, setUseBiometric] = useState(true);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [location, setLocation] = useState<{ latitude: number; longitude: number } | null>(
    null
  );
  const [locationError, setLocationError] = useState<string | null>(null);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Check biometric availability and fetch today's records
  useEffect(() => {
    const initialize = async () => {
      try {
        // Check biometric availability
        if ('PublicKeyCredential' in window) {
          const isAvailable = await (window.PublicKeyCredential as any).isUserVerifyingPlatformAuthenticatorAvailable();
          setBiometricAvailable(isAvailable);
        }

        // Fetch today's records
        const response = await fetch(
          `/api/v1/time-tracking?employeeId=${employeeId}&date=${new Date().toISOString().split('T')[0]}`
        );

        if (response.ok) {
          const data = await response.json();
          setTodayRecords(data.records || []);

          // Determine if currently clocked in
          const lastRecord = data.records?.[data.records.length - 1];
          setIsClockedIn(lastRecord?.type === 'clock_in');
        }

        // Request geolocation
        if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (position) => {
              setLocation({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
              });
            },
            (error) => {
              setLocationError('Geolocation not available');
              console.error('[CLOCKING] Geolocation error:', error);
            }
          );
        }
      } catch (err) {
        console.error('[CLOCKING] Initialization error:', err);
      }
    };

    initialize();
  }, [employeeId]);

  // Authenticate with biometric
  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      if (!('credentials' in navigator)) {
        throw new Error('WebAuthn not supported');
      }

      const credentialsApi = navigator.credentials as any;

      // Request biometric authentication
      const credential = await credentialsApi.get({
        publicKey: {
          challenge: new Uint8Array(32), // Placeholder
          userVerification: 'preferred',
        },
      });

      return !!credential;
    } catch (error) {
      console.error('[CLOCKING] Biometric auth error:', error);
      setError('Biometric authentication failed. Using manual clock.');
      return false;
    }
  };

  // Handle clock action
  const handleClock = async () => {
    if (!location) {
      setError('Location required for clocking. Please enable location services.');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setSuccess(null);

      let method: 'biometric' | 'manual' | 'voice' = 'manual';

      // Try biometric if enabled
      if (useBiometric && biometricAvailable) {
        const biometricSuccess = await authenticateWithBiometric();
        if (biometricSuccess) {
          method = 'biometric';
        }
      }

      const clockType = isClockedIn ? 'clock_out' : 'clock_in';

      // Submit clock record
      const response = await fetch('/api/v1/time-tracking/clock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          type: clockType,
          method,
          location: {
            ...location,
            timestamp: new Date().toISOString(),
          },
          deviceId: `device-${navigator.userAgent.substring(0, 20)}`,
        }),
      });

      if (!response.ok) {
        throw new Error('Clock action failed');
      }

      const record = await response.json();

      // Update state
      setTodayRecords([...todayRecords, record]);
      setIsClockedIn(!isClockedIn);
      setSuccess(`Successfully ${clockType === 'clock_in' ? 'clocked in' : 'clocked out'}`);

      if (onClockChange) {
        onClockChange(record);
      }

      // Clear success message after 3 seconds
      setTimeout(() => setSuccess(null), 3000);
      setShowConfirm(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Clock action failed');
      console.error('[CLOCKING] Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  };

  const formatRecordTime = (isoString: string) => {
    return new Date(isoString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  return (
    <div className="h-screen bg-gradient-to-b from-blue-50 to-white flex flex-col overflow-hidden">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Time Tracking</h1>
          <p className="text-sm text-gray-600">
            {currentTime.toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 overflow-y-auto px-4 py-6 flex flex-col">
        {/* Current Time */}
        <div className="mb-6 text-center">
          <p className="text-6xl font-bold text-gray-900 font-mono mb-2">
            {formatTime(currentTime)}
          </p>
          <p className="text-sm text-gray-600">Current Time</p>
        </div>

        {/* Status Card */}
        <Card
          className={`p-6 mb-6 text-center border-2 transition-all ${
            isClockedIn
              ? 'bg-green-50 border-green-300'
              : 'bg-gray-50 border-gray-300'
          }`}
        >
          <div className="flex items-center justify-center gap-2 mb-2">
            {isClockedIn ? (
              <CheckCircle className="w-6 h-6 text-green-600" />
            ) : (
              <Clock className="w-6 h-6 text-gray-600" />
            )}
            <p className={`text-lg font-semibold ${
              isClockedIn ? 'text-green-700' : 'text-gray-700'
            }`}>
              {isClockedIn ? 'Clocked In' : 'Clocked Out'}
            </p>
          </div>

          {isClockedIn && todayRecords.length > 0 && (
            <p className="text-sm text-green-600">
              Since {formatRecordTime(todayRecords[0].timestamp)}
            </p>
          )}
        </Card>

        {/* Alerts */}
        {error && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert className="mb-4 bg-green-50 text-green-800 border-green-300">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {locationError && (
          <Alert variant="destructive" className="mb-4">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Location unavailable. Clocking may not be recorded properly.
            </AlertDescription>
          </Alert>
        )}

        {/* Biometric Toggle */}
        {biometricAvailable && (
          <div className="mb-6 flex items-center gap-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <input
              type="checkbox"
              id="useBiometric"
              checked={useBiometric}
              onChange={(e) => setUseBiometric(e.target.checked)}
              className="w-5 h-5 text-blue-600 rounded"
            />
            <label htmlFor="useBiometric" className="text-sm text-gray-700">
              Use fingerprint/face recognition
            </label>
          </div>
        )}

        {/* Today's Records */}
        {todayRecords.length > 0 && (
          <div className="mb-6">
            <h3 className="font-semibold text-gray-900 mb-3">Today's Records</h3>
            <div className="space-y-2">
              {todayRecords.map((record, idx) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-200"
                >
                  <div>
                    <p className="text-sm font-medium text-gray-900">
                      {record.type === 'clock_in' ? '🟢 Clocked In' : '🔴 Clocked Out'}
                    </p>
                    <p className="text-xs text-gray-600">
                      {formatRecordTime(record.timestamp)}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs font-semibold text-gray-700 capitalize">
                      {record.method}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Clock Button */}
      <div className="sticky bottom-0 p-4 bg-white border-t border-gray-200 shadow-lg">
        <Button
          onClick={() => setShowConfirm(true)}
          disabled={loading || !location}
          className={`w-full py-6 text-lg font-bold rounded-lg transition-all ${
            isClockedIn
              ? 'bg-red-600 hover:bg-red-700 text-white'
              : 'bg-green-600 hover:bg-green-700 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2`}
        >
          {loading ? (
            <>
              <Loader className="w-5 h-5 animate-spin" />
              Processing...
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </>
          )}
        </Button>
      </div>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirm} onOpenChange={setShowConfirm}>
        <AlertDialogContent className="max-w-sm">
          <AlertDialogTitle>
            {isClockedIn ? 'Clock Out?' : 'Clock In?'}
          </AlertDialogTitle>
          <AlertDialogDescription>
            <div className="space-y-2 mt-4">
              <p>
                <strong>Time:</strong> {formatTime(currentTime)}
              </p>
              <p>
                <strong>Location:</strong> {location ? 'Detected' : 'Not available'}
              </p>
              <p>
                <strong>Method:</strong>{' '}
                {useBiometric && biometricAvailable ? 'Biometric' : 'Manual'}
              </p>
              <p className="text-sm text-gray-600 mt-4">
                {isClockedIn
                  ? 'This will record your clock out time.'
                  : 'This will record your clock in time.'}
              </p>
            </div>
          </AlertDialogDescription>
          <div className="flex gap-3">
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleClock}
              className={isClockedIn ? 'bg-red-600' : 'bg-green-600'}
            >
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default MobileClockingScreen;
