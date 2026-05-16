import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  SafeAreaView,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEventStore } from "@/store/event-store";
import { useUIStore } from "@/store/ui-store";
import { Event } from "@/lib/database/schema";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";

interface EventDetailsModalProps {
  isVisible: boolean;
  onClose: () => void;
  eventId: string | null;
  onEdit?: (event: Event) => void;
}

export function EventDetailsModal({
  isVisible,
  onClose,
  eventId,
  onEdit,
}: EventDetailsModalProps) {
  const { getEvent, deleteEvent } = useEventStore();
  const { showToast } = useUIStore();

  const [event, setEvent] = useState<Event | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && eventId) {
      const fetchedEvent = getEvent(eventId);
      setEvent(fetchedEvent || null);
    }
  }, [isVisible, eventId, getEvent]);

  const handleEdit = () => {
    if (event) {
      onEdit?.(event);
      onClose();
    }
  };

  const handleDelete = () => {
    if (!event) return;

    Alert.alert("Delete Event", "Are you sure you want to delete this event?", [
      {
        text: "Cancel",
        onPress: () => {},
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: async () => {
          setLoading(true);
          try {
            await deleteEvent(event.id);
            showToast("Event deleted successfully", "success");
            onClose();
          } catch (error) {
            const message =
              error instanceof Error ? error.message : "Failed to delete event";
            showToast(message, "error");
          } finally {
            setLoading(false);
          }
        },
        style: "destructive",
      },
    ]);
  };

  if (!event) {
    return (
      <Modal
        visible={isVisible}
        onRequestClose={onClose}
        animationType="slide"
        transparent={false}
      >
        <SafeAreaView style={styles.container}>
          <View style={styles.emptyState}>
            <MaterialCommunityIcons
              name="calendar-blank"
              size={48}
              color="#d1d5db"
            />
            <Text style={styles.emptyText}>Event not found</Text>
            <Button
              label="Close"
              onPress={onClose}
              style={styles.closeButton}
            />
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

  const startDate = new Date(event.start_time);
  const endDate = new Date(event.end_time);
  const duration = Math.round(
    (endDate.getTime() - startDate.getTime()) / (1000 * 60),
  );

  const isSynced = event.is_synced;
  const hasConflict = event.conflict_detected;

  return (
    <Modal
      visible={isVisible}
      onRequestClose={onClose}
      animationType="slide"
      transparent={false}
    >
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={onClose}>
            <MaterialCommunityIcons name="close" size={24} color="#1f2937" />
          </TouchableOpacity>
          <Text style={styles.title}>Event Details</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
        >
          <Card padding={16} bordered>
            <View style={styles.titleSection}>
              <View style={styles.titleContent}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                {hasConflict && (
                  <View style={styles.conflictBadge}>
                    <MaterialCommunityIcons
                      name="alert-circle"
                      size={14}
                      color="#f59e0b"
                    />
                    <Text style={styles.conflictText}>Conflict</Text>
                  </View>
                )}
                {!isSynced && (
                  <View style={styles.unsyncedBadge}>
                    <MaterialCommunityIcons
                      name="cloud-off"
                      size={14}
                      color="#ef4444"
                    />
                    <Text style={styles.unsyncedText}>Pending Sync</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.detailsGrid}>
              <DetailRow
                icon="calendar"
                label="Date"
                value={startDate.toLocaleDateString("en-US", {
                  weekday: "long",
                  month: "long",
                  day: "numeric",
                })}
              />

              <DetailRow
                icon="clock"
                label="Time"
                value={`${startDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })} - ${endDate.toLocaleTimeString("en-US", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}`}
              />

              <DetailRow
                icon="hourglass"
                label="Duration"
                value={`${duration} minutes`}
              />

              {event.location && (
                <DetailRow
                  icon="map-marker"
                  label="Location"
                  value={event.location}
                />
              )}

              {event.guest_count ? (
                <DetailRow
                  icon="account-multiple"
                  label="Expected Guests"
                  value={event.guest_count.toString()}
                />
              ) : null}

              {event.status && (
                <DetailRow
                  icon="check-circle"
                  label="Status"
                  value={event.status}
                />
              )}

              {event.reminder_minutes ? (
                <DetailRow
                  icon="bell"
                  label="Reminder"
                  value={`${event.reminder_minutes} minutes before`}
                />
              ) : null}
            </View>

            {event.description && (
              <>
                <View style={styles.divider} />
                <View style={styles.descriptionSection}>
                  <Text style={styles.descriptionLabel}>Description</Text>
                  <Text style={styles.description}>{event.description}</Text>
                </View>
              </>
            )}

            {event.notes && (
              <>
                <View style={styles.divider} />
                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Notes</Text>
                  <Text style={styles.notes}>{event.notes}</Text>
                </View>
              </>
            )}

            {(event.external_provider || event.external_id) && (
              <>
                <View style={styles.divider} />
                <View style={styles.externalSection}>
                  <Text style={styles.externalLabel}>External Calendar</Text>
                  <View style={styles.externalContent}>
                    {event.external_provider && (
                      <Text style={styles.externalProvider}>
                        {event.external_provider}
                      </Text>
                    )}
                    {event.external_id && (
                      <Text style={styles.externalId}>{event.external_id}</Text>
                    )}
                  </View>
                </View>
              </>
            )}
          </Card>

          <View style={styles.actions}>
            <Button
              label="Edit"
              variant="primary"
              onPress={handleEdit}
              style={styles.actionButton}
            />
            <Button
              label="Delete"
              variant="danger"
              loading={loading}
              disabled={loading}
              onPress={handleDelete}
              style={styles.actionButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

interface DetailRowProps {
  icon: string;
  label: string;
  value: string;
}

function DetailRow({ icon, label, value }: DetailRowProps) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLeft}>
        <MaterialCommunityIcons name={icon} size={18} color="#1e3a8a" />
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    backgroundColor: "#ffffff",
  },

  title: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    gap: 16,
  },

  emptyText: {
    fontSize: 16,
    color: "#9ca3af",
  },

  closeButton: {
    marginTop: 16,
    minWidth: 100,
  },

  titleSection: {
    marginBottom: 16,
  },

  titleContent: {
    gap: 8,
  },

  eventTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },

  conflictBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fef3c7",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  conflictText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#92400e",
  },

  unsyncedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "#fee2e2",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: "flex-start",
  },

  unsyncedText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#991b1b",
  },

  detailsGrid: {
    gap: 12,
  },

  detailRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
  },

  detailLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  detailLabel: {
    fontSize: 13,
    fontWeight: "500",
    color: "#6b7280",
  },

  detailValue: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },

  descriptionSection: {
    marginBottom: 0,
  },

  descriptionLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
  },

  description: {
    fontSize: 14,
    color: "#1f2937",
    lineHeight: 20,
  },

  notesSection: {
    marginBottom: 0,
  },

  notesLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
  },

  notes: {
    fontSize: 14,
    color: "#1f2937",
    lineHeight: 20,
  },

  externalSection: {
    marginBottom: 0,
  },

  externalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    marginBottom: 6,
  },

  externalContent: {
    gap: 4,
  },

  externalProvider: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1f2937",
  },

  externalId: {
    fontSize: 12,
    color: "#9ca3af",
    fontFamily: "monospace",
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },

  actionButton: {
    flex: 1,
  },
});
