/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 6 Day 27
 * Mobile Clock In/Out Screen
 * 
 * Features:
 * - Large Clock In/Out button
 * - Real-time digital clock
 * - GPS location capture
 * - Haptic feedback + sound
 * - Offline support
 * - Confirmation message
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Vibration,
} from 'react-native';
import * as Location from 'expo-location';
import { Audio } from 'expo-av';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface ClockEntry {
  id: string;
  type: 'clock-in' | 'clock-out';
  timestamp: string;
  latitude: number;
  longitude: number;
  accuracy: number;
  synced: boolean;
}

export const ClockInScreen: React.FC = () => {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isClockedIn, setIsClockedIn] = useState(false);
  const [loading, setLoading] = useState(false);
  const [location, setLocation] = useState<Location.LocationObject | null>(null);
  const [message, setMessage] = useState<string>('');

  useEffect(() => {
    // Update clock every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Request location permission and get current location
    requestLocationPermission();
  }, []);

  useEffect(() => {
    // Check if user is already clocked in
    checkClockStatus();
  }, []);

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        getLocation();
      }
    } catch (error) {
      console.error('Location permission error:', error);
    }
  };

  const getLocation = async () => {
    try {
      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });
      setLocation(currentLocation);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Location Error', 'Could not get your location');
    }
  };

  const playSound = async () => {
    try {
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/sounds/beep.mp3')
      );
      await sound.playAsync();
    } catch (error) {
      console.error('Sound error:', error);
    }
  };

  const checkClockStatus = async () => {
    try {
      const status = await AsyncStorage.getItem('clockStatus');
      setIsClockedIn(status === 'clocked-in');
    } catch (error) {
      console.error('Clock status error:', error);
    }
  };

  const handleClockIn = async () => {
    setLoading(true);

    try {
      // Get fresh location
      await getLocation();

      // Haptic feedback
      Vibration.vibrate(200);

      // Play sound
      await playSound();

      // Create entry
      const entry: ClockEntry = {
        id: `entry-${Date.now()}`,
        type: 'clock-in',
        timestamp: new Date().toISOString(),
        latitude: location?.coords.latitude || 0,
        longitude: location?.coords.longitude || 0,
        accuracy: location?.coords.accuracy || 0,
        synced: false,
      };

      // Save locally (offline support)
      const entries = await AsyncStorage.getItem('pendingEntries');
      const pendingEntries = entries ? JSON.parse(entries) : [];
      pendingEntries.push(entry);
      await AsyncStorage.setItem('pendingEntries', JSON.stringify(pendingEntries));

      // Try to sync with server
      try {
        const response = await fetch('https://api.luccca.com/api/v1/time-tracking/clock-in', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            latitude: entry.latitude,
            longitude: entry.longitude,
            accuracy: entry.accuracy,
          }),
        });

        if (response.ok) {
          entry.synced = true;
          await AsyncStorage.setItem('clockStatus', 'clocked-in');
          setIsClockedIn(true);
          setMessage('✓ Clocked In');
          setTimeout(() => setMessage(''), 2000);
        }
      } catch (error) {
        // Offline - will sync later
        setMessage('✓ Clocked In (offline)');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (error) {
      console.error('Clock-in error:', error);
      Alert.alert('Error', 'Failed to clock in. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleClockOut = async () => {
    setLoading(true);

    try {
      // Get fresh location
      await getLocation();

      // Haptic feedback
      Vibration.vibrate([100, 100, 100]);

      // Play sound
      await playSound();

      // Create entry
      const entry: ClockEntry = {
        id: `entry-${Date.now()}`,
        type: 'clock-out',
        timestamp: new Date().toISOString(),
        latitude: location?.coords.latitude || 0,
        longitude: location?.coords.longitude || 0,
        accuracy: location?.coords.accuracy || 0,
        synced: false,
      };

      // Save locally
      const entries = await AsyncStorage.getItem('pendingEntries');
      const pendingEntries = entries ? JSON.parse(entries) : [];
      pendingEntries.push(entry);
      await AsyncStorage.setItem('pendingEntries', JSON.stringify(pendingEntries));

      // Try to sync
      try {
        const response = await fetch('https://api.luccca.com/api/v1/time-tracking/clock-out', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${await AsyncStorage.getItem('authToken')}`,
          },
          body: JSON.stringify({
            latitude: entry.latitude,
            longitude: entry.longitude,
            accuracy: entry.accuracy,
          }),
        });

        if (response.ok) {
          entry.synced = true;
          await AsyncStorage.setItem('clockStatus', 'clocked-out');
          setIsClockedIn(false);
          setMessage('✓ Clocked Out');
          setTimeout(() => setMessage(''), 2000);
        }
      } catch (error) {
        // Offline
        setMessage('✓ Clocked Out (offline)');
        setTimeout(() => setMessage(''), 2000);
      }
    } catch (error) {
      console.error('Clock-out error:', error);
      Alert.alert('Error', 'Failed to clock out. Please try again.');
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

  return (
    <View style={styles.container}>
      {/* Digital Clock */}
      <View style={styles.clockSection}>
        <Text style={styles.clockTime}>{formatTime(currentTime)}</Text>
        <Text style={styles.clockDate}>
          {currentTime.toLocaleDateString('en-US', {
            weekday: 'long',
            month: 'long',
            day: 'numeric',
          })}
        </Text>
      </View>

      {/* Status */}
      <View style={styles.statusSection}>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: isClockedIn ? '#10b981' : '#ef4444' },
          ]}
        >
          <Text style={styles.statusText}>
            {isClockedIn ? 'CLOCKED IN' : 'CLOCKED OUT'}
          </Text>
        </View>
      </View>

      {/* Main Button */}
      <View style={styles.buttonSection}>
        <TouchableOpacity
          style={[
            styles.mainButton,
            {
              backgroundColor: isClockedIn ? '#ef4444' : '#10b981',
            },
          ]}
          onPress={isClockedIn ? handleClockOut : handleClockIn}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <>
              <Text style={styles.buttonText}>
                {isClockedIn ? 'CLOCK OUT' : 'CLOCK IN'}
              </Text>
              <Text style={styles.buttonSubtext}>Tap to confirm</Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Confirmation Message */}
      {message && (
        <View style={styles.messageSection}>
          <Text style={styles.messageText}>{message}</Text>
        </View>
      )}

      {/* Location Info */}
      {location && (
        <View style={styles.locationSection}>
          <Text style={styles.locationText}>
            Accuracy: {location.coords.accuracy.toFixed(0)}m
          </Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
  },
  clockSection: {
    marginTop: 40,
    alignItems: 'center',
  },
  clockTime: {
    fontSize: 64,
    fontWeight: 'bold',
    color: '#111827',
    fontFamily: 'monospace',
  },
  clockDate: {
    fontSize: 16,
    color: '#6b7280',
    marginTop: 8,
  },
  statusSection: {
    marginTop: 20,
  },
  statusBadge: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 24,
  },
  statusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  buttonSection: {
    width: '100%',
    alignItems: 'center',
    marginVertical: 40,
  },
  mainButton: {
    width: 280,
    height: 280,
    borderRadius: 140,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  buttonSubtext: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 12,
    marginTop: 8,
  },
  messageSection: {
    backgroundColor: '#d1fae5',
    padding: 12,
    borderRadius: 8,
    marginVertical: 20,
  },
  messageText: {
    color: '#065f46',
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'center',
  },
  locationSection: {
    marginBottom: 20,
  },
  locationText: {
    color: '#6b7280',
    fontSize: 12,
  },
});

export default ClockInScreen;
