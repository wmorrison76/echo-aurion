import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  TouchableOpacity,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEventStore } from "@/store/event-store";
import { useUIStore } from "@/store/ui-store";
import { useSyncStore } from "@/store/sync-store";
import { useAnalyticsStore } from "@/store/analytics-store";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import { EventModal } from "@/components/EventModal";
import { EventDetailsModal } from "@/components/EventDetailsModal";
import { Event } from "@/lib/database/schema";

export default function CalendarScreen() {
  const { events, loadEvents, isLoading: eventsLoading } = useEventStore();
  const {
    selectedDate,
    setSelectedDate,
    openModal,
    closeModal,
    modals,
    selectedEventId,
    setSelectedEventId,
  } = useUIStore();
  const { isOnline, syncInProgress } = useSyncStore();
  const { trackEvent } = useAnalyticsStore();

  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [editingEvent, setEditingEvent] = useState<Event | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const getDaysInMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date: Date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const handlePreviousMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1),
    );
  };

  const handleNextMonth = () => {
    setCurrentMonth(
      new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1),
    );
  };

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const daysInMonth = getDaysInMonth(currentMonth);
  const firstDay = getFirstDayOfMonth(currentMonth);
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);
  const emptyDays = Array.from({ length: firstDay }, (_, i) => null);

  const upcomingEvents = events
    .filter((e) => new Date(e.start_time) >= new Date())
    .sort(
      (a, b) =>
        new Date(a.start_time).getTime() - new Date(b.start_time).getTime(),
    )
    .slice(0, 5);

  const handleEventPress = (event: Event) => {
    setSelectedEventId(event.id);
    openModal("eventDetails");
    trackEvent("event_viewed", "user_action", { eventId: event.id });
  };

  const handleCreateEventPress = () => {
    setEditingEvent(null);
    openModal("createEvent");
    trackEvent("create_event_opened", "user_action");
  };

  const handleEditEvent = (event: Event) => {
    setEditingEvent(event);
    openModal("createEvent");
    trackEvent("event_edit_opened", "user_action", { eventId: event.id });
  };

  const handleCloseModal = (modalType: keyof typeof modals) => {
    closeModal(modalType);
    setEditingEvent(null);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.title}>Calendar</Text>
          <View style={styles.headerRight}>
            {!isOnline && (
              <View style={styles.offlineBadge}>
                <MaterialCommunityIcons
                  name="wifi-off"
                  size={14}
                  color="#ef4444"
                />
                <Text style={styles.offlineText}>Offline</Text>
              </View>
            )}
            {syncInProgress && (
              <View style={styles.syncBadge}>
                <MaterialCommunityIcons name="sync" size={14} color="#3b82f6" />
                <Text style={styles.syncText}>Syncing</Text>
              </View>
            )}
          </View>
        </View>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card padding={16} bordered>
          <View style={styles.monthHeader}>
            <TouchableOpacity onPress={handlePreviousMonth}>
              <MaterialCommunityIcons
                name="chevron-left"
                size={28}
                color="#1e3a8a"
              />
            </TouchableOpacity>
            <Text style={styles.monthTitle}>{monthName}</Text>
            <TouchableOpacity onPress={handleNextMonth}>
              <MaterialCommunityIcons
                name="chevron-right"
                size={28}
                color="#1e3a8a"
              />
            </TouchableOpacity>
          </View>

          <View style={styles.weekdays}>
            {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
              <Text key={day} style={styles.weekdayLabel}>
                {day}
              </Text>
            ))}
          </View>

          <View style={styles.daysGrid}>
            {emptyDays.map((_, i) => (
              <View key={`empty-${i}`} style={styles.emptyDay} />
            ))}
            {days.map((day) => (
              <TouchableOpacity
                key={day}
                style={[styles.dayButton]}
                onPress={() =>
                  setSelectedDate(
                    `${currentMonth.getFullYear()}-${String(currentMonth.getMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`,
                  )
                }
              >
                <Text style={styles.dayText}>{day}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </Card>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Upcoming Events</Text>
            <Button
              label="+ New"
              size="small"
              onPress={handleCreateEventPress}
            />
          </View>

          {upcomingEvents.length === 0 ? (
            <Card padding={32} bordered>
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="calendar-blank"
                  size={48}
                  color="#d1d5db"
                />
                <Text style={styles.emptyStateText}>No upcoming events</Text>
              </View>
            </Card>
          ) : (
            upcomingEvents.map((event) => (
              <Card key={event.id} padding={16} bordered>
                <TouchableOpacity onPress={() => handleEventPress(event)}>
                  <Text style={styles.eventTitle}>{event.title}</Text>
                  <Text style={styles.eventTime}>
                    {new Date(event.start_time).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </Text>
                  {event.description && (
                    <Text style={styles.eventDescription}>
                      {event.description}
                    </Text>
                  )}
                </TouchableOpacity>
              </Card>
            ))
          )}
        </View>
      </ScrollView>

      <EventModal
        isVisible={modals.createEvent.isOpen}
        onClose={() => handleCloseModal("createEvent")}
        initialEvent={editingEvent}
      />

      <EventDetailsModal
        isVisible={modals.eventDetails.isOpen}
        onClose={() => handleCloseModal("eventDetails")}
        eventId={selectedEventId}
        onEdit={handleEditEvent}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  headerContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },

  headerRight: {
    flexDirection: "row",
    gap: 12,
  },

  offlineBadge: {
    flexDirection: "row",
    backgroundColor: "#fee2e2",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    gap: 4,
  },

  offlineText: {
    color: "#991b1b",
    fontSize: 12,
    fontWeight: "500",
  },

  syncBadge: {
    flexDirection: "row",
    backgroundColor: "#dbeafe",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignItems: "center",
    gap: 4,
  },

  syncText: {
    color: "#1e40af",
    fontSize: 12,
    fontWeight: "500",
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  monthHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },

  monthTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#1f2937",
  },

  weekdays: {
    flexDirection: "row",
    marginBottom: 12,
  },

  weekdayLabel: {
    flex: 1,
    textAlign: "center",
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
    paddingVertical: 8,
  },

  daysGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
  },

  dayButton: {
    width: "14.285%",
    aspectRatio: 1,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 4,
  },

  emptyDay: {
    width: "14.285%",
    aspectRatio: 1,
  },

  dayText: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },

  section: {
    marginTop: 16,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
  },

  emptyStateText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12,
  },

  eventTitle: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },

  eventTime: {
    fontSize: 13,
    color: "#6b7280",
    marginBottom: 8,
  },

  eventDescription: {
    fontSize: 13,
    color: "#6b7280",
    lineHeight: 18,
  },
});
