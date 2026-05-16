/**
 * React Native Schedule Screen
 * View and manage work schedule on mobile
 * Weeks 9-10 Implementation
 */

import React, { useState, useEffect, useContext } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  StyleSheet,
  SafeAreaView,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { AuthContext } from '@/context/AuthContext';
import { useScheduleStore } from '@/store/useScheduleStore';

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

export default function ScheduleScreen() {
  const { state: authState } = useContext(AuthContext);
  const { shifts, setShifts } = useScheduleStore();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentWeekStart, setCurrentWeekStart] = useState(
    new Date(new Date().setDate(new Date().getDate() - new Date().getDay()))
  );

  // Fetch schedule
  useEffect(() => {
    const fetchSchedule = async () => {
      if (!authState.userToken) return;

      try {
        setLoading(true);
        const endDate = new Date(currentWeekStart);
        endDate.setDate(endDate.getDate() + 6);

        const response = await fetch(
          `https://api.luccca.app/api/v1/shifts?` +
          `startDate=${currentWeekStart.toISOString()}&` +
          `endDate=${endDate.toISOString()}`,
          {
            headers: {
              Authorization: `Bearer ${authState.userToken}`,
            },
          }
        );

        if (!response.ok) {
          throw new Error('Failed to fetch schedule');
        }

        const data = await response.json();
        setShifts(data.shifts || []);
        setError(null);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to load schedule';
        setError(message);
        Alert.alert('Error', message);
      } finally {
        setLoading(false);
      }
    };

    fetchSchedule();
  }, [currentWeekStart, authState.userToken]);

  const goToPreviousWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() - 7);
    setCurrentWeekStart(newDate);
  };

  const goToNextWeek = () => {
    const newDate = new Date(currentWeekStart);
    newDate.setDate(newDate.getDate() + 7);
    setCurrentWeekStart(newDate);
  };

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
        return '#10b981';
      case 'scheduled':
        return '#3b82f6';
      case 'completed':
        return '#6b7280';
      case 'cancelled':
        return '#ef4444';
      default:
        return '#9ca3af';
    }
  };

  const renderShift = ({ item }: { item: Shift }) => (
    <View style={[styles.shiftCard, { borderLeftColor: getStatusColor(item.status) }]}>
      <View style={styles.shiftHeader}>
        <Text style={styles.shiftRole}>{item.role}</Text>
        <View
          style={[
            styles.statusBadge,
            { backgroundColor: getStatusColor(item.status) },
          ]}
        >
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <Text style={styles.shiftDate}>{formatDate(item.date)}</Text>

      <View style={styles.shiftDetails}>
        <View style={styles.detailRow}>
          <MaterialCommunityIcons name="clock" size={16} color="#6b7280" />
          <Text style={styles.detailText}>
            {formatTime(item.startTime)} - {formatTime(item.endTime)}
          </Text>
        </View>

        {item.location && (
          <View style={styles.detailRow}>
            <MaterialCommunityIcons name="map-marker" size={16} color="#6b7280" />
            <Text style={styles.detailText}>{item.location}</Text>
          </View>
        )}
      </View>

      {item.notes && (
        <View style={styles.notesBox}>
          <Text style={styles.notesText}>{item.notes}</Text>
        </View>
      )}

      <View style={styles.actionButtons}>
        <TouchableOpacity style={styles.secondaryButton}>
          <Text style={styles.secondaryButtonText}>Request Swap</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContent}>
          <ActivityIndicator size="large" color="#1e3a8a" />
          <Text style={styles.loadingText}>Loading schedule...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Week Navigation */}
      <View style={styles.weekNavigation}>
        <TouchableOpacity onPress={goToPreviousWeek}>
          <MaterialCommunityIcons name="chevron-left" size={24} color="#1e3a8a" />
        </TouchableOpacity>

        <View style={styles.weekInfo}>
          <Text style={styles.monthYear}>
            {currentWeekStart.toLocaleDateString('en-US', {
              month: 'long',
              year: 'numeric',
            })}
          </Text>
          <Text style={styles.weekLabel}>
            Week of{' '}
            {new Date(
              currentWeekStart.getFullYear(),
              currentWeekStart.getMonth(),
              currentWeekStart.getDate()
            ).toLocaleDateString('en-US', {
              month: 'short',
              day: 'numeric',
            })}
          </Text>
        </View>

        <TouchableOpacity onPress={goToNextWeek}>
          <MaterialCommunityIcons name="chevron-right" size={24} color="#1e3a8a" />
        </TouchableOpacity>
      </View>

      {/* Error */}
      {error && (
        <View style={styles.errorContainer}>
          <MaterialCommunityIcons name="alert-circle" size={20} color="#dc2626" />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      )}

      {/* Shifts List */}
      {shifts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <MaterialCommunityIcons name="calendar-blank" size={48} color="#d1d5db" />
          <Text style={styles.emptyText}>No shifts scheduled</Text>
          <Text style={styles.emptySubtext}>Check back later for upcoming shifts</Text>
        </View>
      ) : (
        <FlatList
          data={shifts}
          renderItem={renderShift}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          scrollEnabled={true}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f9fafb',
  },
  centerContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    color: '#374151',
    fontWeight: '600',
  },
  weekNavigation: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#ffffff',
    borderBottomColor: '#e5e7eb',
    borderBottomWidth: 1,
  },
  weekInfo: {
    alignItems: 'center',
  },
  monthYear: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
  },
  weekLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 2,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    margin: 16,
    padding: 12,
    backgroundColor: '#fee2e2',
    borderRadius: 8,
    borderColor: '#fecaca',
    borderWidth: 1,
  },
  errorText: {
    marginLeft: 8,
    color: '#dc2626',
    fontSize: 14,
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  emptyText: {
    marginTop: 12,
    fontSize: 16,
    fontWeight: '600',
    color: '#374151',
  },
  emptySubtext: {
    marginTop: 4,
    fontSize: 14,
    color: '#9ca3af',
  },
  listContent: {
    padding: 16,
  },
  shiftCard: {
    backgroundColor: '#ffffff',
    borderRadius: 8,
    borderLeftWidth: 4,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  shiftHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  shiftRole: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#ffffff',
    textTransform: 'capitalize',
  },
  shiftDate: {
    fontSize: 14,
    color: '#6b7280',
    marginBottom: 8,
  },
  shiftDetails: {
    marginVertical: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#374151',
  },
  notesBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#f3f4f6',
    borderRadius: 4,
  },
  notesText: {
    fontSize: 12,
    color: '#6b7280',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 12,
  },
  primaryButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#1e3a8a',
    borderRadius: 6,
    alignItems: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontWeight: '600',
    fontSize: 12,
  },
  secondaryButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderColor: '#d1d5db',
    borderWidth: 1,
    borderRadius: 6,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#374151',
    fontWeight: '600',
    fontSize: 12,
  },
});
