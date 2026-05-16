/**
 * React Native Clocking Screen
 * Time tracking with biometric support
 * Weeks 9-10 Implementation
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  FlatList,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import * as LocalAuthentication from 'expo-local-authentication';
import * as Location from 'expo-location';
import { AuthContext } from '@/context/AuthContext';

interface ClockRecord {
  id: string;
  timestamp: string;
  type: 'clock_in' | 'clock_out';
  method: 'biometric' | 'manual' | 'voice';
}

export default function ClockingScreen() {
  const { state: authState } = useContext(AuthContext);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [todayRecords, setTodayRecords] = useState<ClockRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [clocking, setClocking] = useState(false);
  const [biometricAvailable, setBiometricAvailable] = useState(false);
  const [useBiometric, setUseBiometric] = useState(true);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Update current time
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Initialize: check biometric, location, and fetch today's records
  useEffect(() => {
    const initialize = async () => {
      if (!authState.userToken) return;

      try {
        // Check biometric availability
        const compatible = await LocalAuthentication.hasHardwareAsync();
        const enrolled = await LocalAuthentication.isEnrolledAsync();
        setBiometricAvailable(compatible && enrolled);

        // Request location permission
        const { status } = await Location.requestForegroundPermissionsAsync();
        if (status === 'granted') {
          const loc = await Location.getCurrentPositionAsync({});
          setLocation(loc);
        } else {
          setLocationError('Location permission not granted');
        }

        // Fetch today's records
        const response = await fetch(
          `https://api.luccca.app/api/v1/time-tracking?date=${new Date().toISOString().split('T')[0]}`,
          {
            headers: {
              Authorization: `Bearer ${authState.userToken}`,
            },
          }
        );

        if (response.ok) {
          const data = await response.json();
          setTodayRecords(data.records || []);

          // Determine if currently clocked in
          const lastRecord = data.records?.[data.records.length - 1];
          setIsClockedIn(lastRecord?.type === 'clock_in');
        }
      } catch (error) {
        console.error('[CLOCKING] Initialization error:', error);
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [authState.userToken]);

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

  const authenticateWithBiometric = async (): Promise<boolean> => {
    try {
      const result = await LocalAuthentication.authenticateAsync({
        disableDeviceFallback: false,
        reason: 'Authenticate to clock in/out',
      });

      return result.success;
    } catch (error) {
      console.error('[CLOCKING] Biometric error:', error);
      return false;
    }
  };

  const handleClock = async () => {
    if (!location && !locationError) {
      Alert.alert('Error', 'Location required for clocking');
      return;
    }

    try {
      setClocking(true);

      let method: 'biometric' | 'manual' | 'voice' = 'manual';

      // Try biometric if enabled
      if (useBiometric && biometricAvailable) {
        const bioSuccess = await authenticateWithBiometric();
        if (bioSuccess) {
          method = 'biometric';
        }
      }

      const clockType = isClockedIn ? 'clock_out' : 'clock_in';

      // Submit clock record
      const response = await fetch('https://api.luccca.app/api/v1/time-tracking/clock', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authState.userToken}`,
        },
        body: JSON.stringify({
          type: clockType,
          method,
          location: location
            ? {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
              }
            : null,
          timestamp: new Date().toISOString(),
        }),
      });

      if (!response.ok) {
        throw new Error('Clock action failed');
      }

      const record = await response.json();
      setTodayRecords([...todayRecords, record]);
      setIsClockedIn(!isClockedIn);

      Alert.alert(
        'Success',
        `Successfully ${clockType === 'clock_in' ? 'clocked in' : 'clocked out'}`
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to clock ' + (isClockedIn ? 'out' : 'in'));
      console.error('[CLOCKING] Error:', error);
    } finally {
      setClocking(false);
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Current Time */}
      <View style={styles.timeSection}>
        <Text style={styles.currentTime}>{formatTime(currentTime)}</Text>
        <Text style={styles.currentTimeLabel}>Current Time</Text>
      </View>

      {/* Status Card */}
      <View
        style={[
          styles.statusCard,
          {
            backgroundColor: isClockedIn ? '#d1fae5' : '#f3f4f6',
            borderColor: isClockedIn ? '#6ee7b7' : '#d1d5db',
          },
        ]}
      >
        <View style={styles.statusContent}>
          <MaterialCommunityIcons
            name={isClockedIn ? 'check-circle' : 'clock'}
            size={24}
            color={isClockedIn ? '#10b981' : '#6b7280'}
          />
          <Text
            style={[
              styles.statusText,
              { color: isClockedIn ? '#059669' : '#374151' },
            ]}
          >
            {isClockedIn ? 'Clocked In' : 'Clocked Out'}
          </Text>
        </View>

        {isClockedIn && todayRecords.length > 0 && (
          <Text style={styles.clockedInTime}>
            Since {formatRecordTime(todayRecords[0].timestamp)}
          </Text>
        )}
      </View>

      {/* Biometric Toggle */}
      {biometricAvailable && (
        <TouchableOpacity
          style={styles.biometricToggle}
          onPress={() => setUseBiometric(!useBiometric)}
        >
          <View style={styles.toggleContent}>
            <MaterialCommunityIcons
              name={useBiometric ? 'fingerprint' : 'hand'}
              size={20}
              color={useBiometric ? '#1e3a8a' : '#6b7280'}
            />
            <Text
              style={[
                styles.toggleText,
                { color: useBiometric ? '#1e3a8a' : '#6b7280' },
              ]}
            >
              {useBiometric ? 'Using Biometric' : 'Manual Clock'}
            </Text>
          </View>
          <View
            style={[
              styles.toggleSwitch,
              { backgroundColor: useBiometric ? '#1e3a8a' : '#d1d5db' },
            ]}
          >
            <View
              style={[
                styles.toggleIndicator,
                { transform: [{ translateX: useBiometric ? 20 : 2 }] },
              ]}
            />
          </View>
        </TouchableOpacity>
      )}

      {/* Location Status */}
      {locationError && (
        <View style={styles.errorBanner}>
          <MaterialCommunityIcons name="alert-circle" size={16} color="#dc2626" />
          <Text style={styles.errorText}>{locationError}</Text>
        </View>
      )}

      {/* Today's Records */}
      {todayRecords.length > 0 && (
        <View style={styles.recordsSection}>
          <Text style={styles.recordsTitle}>Today's Records</Text>
          <FlatList
            data={todayRecords}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <View style={styles.recordItem}>
                <View style={styles.recordInfo}>
                  <Text style={styles.recordType}>
                    {item.type === 'clock_in' ? '🟢 Clocked In' : '🔴 Clocked Out'}
                  </Text>
                  <Text style={styles.recordTime}>
                    {formatRecordTime(item.timestamp)}
                  </Text>
                </View>
                <Text style={styles.recordMethod}>{item.method}</Text>
              </View>
            )}
            scrollEnabled={false}
          />
        </View>
      )}

      {/* Clock Button */}
      <TouchableOpacity
        style={[
          styles.clockButton,
          {
            backgroundColor: isClockedIn ? '#dc2626' : '#10b981',
          },
          clocking && styles.clockButtonDisabled,
        ]}
        onPress={handleClock}
        disabled={clocking}
      >
        {clocking ? (
          <>
            <ActivityIndicator color="#ffffff" size="small" />
            <Text style={styles.clockButtonText}>Processing...</Text>
          </>
        ) : (
          <>
            <MaterialCommunityIcons name="clock" size={24} color="#ffffff" />
            <Text style={styles.clockButtonText}>
              {isClockedIn ? 'Clock Out' : 'Clock In'}
            </Text>
          </>
        )}
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    paddingHorizontal: 16,
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  timeSection: {
    alignItems: 'center',
    marginVertical: 24,
  },
  currentTime: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'Menlo',
  },
  currentTimeLabel: {
    marginTop: 8,
    fontSize: 14,
    color: '#6b7280',
  },
  statusCard: {
    borderRadius: 12,
    borderWidth: 2,
    padding: 16,
    marginBottom: 16,
  },
  statusContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 18,
    fontWeight: '600',
  },
  clockedInTime: {
    marginTop: 8,
    fontSize: 12,
    color: '#059669',
  },
  biometricToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  toggleContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '500',
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleIndicator: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#ffffff',
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fee2e2',
    borderColor: '#fecaca',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  errorText: {
    fontSize: 13,
    color: '#dc2626',
    flex: 1,
  },
  recordsSection: {
    marginBottom: 16,
  },
  recordsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 8,
  },
  recordItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderColor: '#e5e7eb',
    borderWidth: 1,
  },
  recordInfo: {
    flex: 1,
  },
  recordType: {
    fontSize: 14,
    fontWeight: '500',
    color: '#111827',
  },
  recordTime: {
    fontSize: 12,
    color: '#6b7280',
    marginTop: 2,
  },
  recordMethod: {
    fontSize: 12,
    fontWeight: '500',
    color: '#6b7280',
    textTransform: 'capitalize',
  },
  clockButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  clockButtonDisabled: {
    opacity: 0.6,
  },
  clockButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
