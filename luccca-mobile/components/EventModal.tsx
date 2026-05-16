import React, { useState, useEffect } from "react";
import {
  Modal,
  View,
  StyleSheet,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  SafeAreaView,
  TextInput as RNTextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import DateTimePicker from "@react-native-community/datetimepicker";
import { useEventStore } from "@/store/event-store";
import { useUIStore } from "@/store/ui-store";
import { Button } from "@/components/Button";
import { TextInput } from "@/components/TextInput";
import { Event } from "@/lib/database/schema";

interface EventModalProps {
  isVisible: boolean;
  onClose: () => void;
  initialEvent?: Event | null;
}

export function EventModal({
  isVisible,
  onClose,
  initialEvent,
}: EventModalProps) {
  const { createEvent, updateEvent } = useEventStore();
  const { showToast } = useUIStore();

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    location: "",
    start_time: new Date().toISOString(),
    end_time: new Date(Date.now() + 3600000).toISOString(),
    guest_count: 0,
    is_all_day: false,
    is_recurring: false,
    reminder_minutes: 15,
  });

  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (initialEvent) {
      setFormData({
        title: initialEvent.title,
        description: initialEvent.description || "",
        location: initialEvent.location || "",
        start_time: initialEvent.start_time,
        end_time: initialEvent.end_time,
        guest_count: initialEvent.guest_count || 0,
        is_all_day: initialEvent.is_all_day,
        is_recurring: initialEvent.is_recurring,
        reminder_minutes: initialEvent.reminder_minutes || 15,
      });
    } else {
      resetForm();
    }
  }, [initialEvent, isVisible]);

  const resetForm = () => {
    setFormData({
      title: "",
      description: "",
      location: "",
      start_time: new Date().toISOString(),
      end_time: new Date(Date.now() + 3600000).toISOString(),
      guest_count: 0,
      is_all_day: false,
      is_recurring: false,
      reminder_minutes: 15,
    });
    setErrors({});
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.title.trim()) {
      newErrors.title = "Event title is required";
    }

    const startTime = new Date(formData.start_time).getTime();
    const endTime = new Date(formData.end_time).getTime();

    if (startTime >= endTime) {
      newErrors.time = "End time must be after start time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      if (initialEvent) {
        await updateEvent(initialEvent.id, formData);
        showToast("Event updated successfully", "success");
      } else {
        await createEvent(formData);
        showToast("Event created successfully", "success");
      }
      resetForm();
      onClose();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to save event";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleStartTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setFormData({
        ...formData,
        start_time: selectedDate.toISOString(),
      });
    }
    setShowStartPicker(false);
  };

  const handleEndTimeChange = (event: any, selectedDate?: Date) => {
    if (selectedDate) {
      setFormData({
        ...formData,
        end_time: selectedDate.toISOString(),
      });
    }
    setShowEndPicker(false);
  };

  const formatDateTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

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
          <Text style={styles.title}>
            {initialEvent ? "Edit Event" : "Create Event"}
          </Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {errors.time && (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errors.time}</Text>
            </View>
          )}

          <TextInput
            label="Event Title"
            placeholder="Enter event title"
            value={formData.title}
            onChangeText={(title) => setFormData({ ...formData, title })}
            error={errors.title}
          />

          <TextInput
            label="Description"
            placeholder="Add event details"
            value={formData.description}
            onChangeText={(description) =>
              setFormData({ ...formData, description })
            }
            multiline
            numberOfLines={3}
          />

          <TextInput
            label="Location"
            placeholder="Event location"
            value={formData.location}
            onChangeText={(location) => setFormData({ ...formData, location })}
          />

          <View style={styles.dateSection}>
            <Text style={styles.label}>Start Time</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowStartPicker(true)}
            >
              <MaterialCommunityIcons
                name="calendar-clock"
                size={20}
                color="#1e3a8a"
              />
              <Text style={styles.dateButtonText}>
                {formatDateTime(formData.start_time)}
              </Text>
            </TouchableOpacity>
          </View>

          {showStartPicker && (
            <DateTimePicker
              value={new Date(formData.start_time)}
              mode="datetime"
              display="spinner"
              onChange={handleStartTimeChange}
            />
          )}

          <View style={styles.dateSection}>
            <Text style={styles.label}>End Time</Text>
            <TouchableOpacity
              style={styles.dateButton}
              onPress={() => setShowEndPicker(true)}
            >
              <MaterialCommunityIcons
                name="calendar-clock"
                size={20}
                color="#1e3a8a"
              />
              <Text style={styles.dateButtonText}>
                {formatDateTime(formData.end_time)}
              </Text>
            </TouchableOpacity>
          </View>

          {showEndPicker && (
            <DateTimePicker
              value={new Date(formData.end_time)}
              mode="datetime"
              display="spinner"
              onChange={handleEndTimeChange}
            />
          )}

          <View style={styles.switchSection}>
            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>All Day Event</Text>
              <Switch
                value={formData.is_all_day}
                onValueChange={(is_all_day) =>
                  setFormData({ ...formData, is_all_day })
                }
              />
            </View>

            <View style={styles.switchRow}>
              <Text style={styles.switchLabel}>Recurring Event</Text>
              <Switch
                value={formData.is_recurring}
                onValueChange={(is_recurring) =>
                  setFormData({ ...formData, is_recurring })
                }
              />
            </View>
          </View>

          <View style={styles.guestSection}>
            <Text style={styles.label}>Expected Guests</Text>
            <RNTextInput
              style={styles.numberInput}
              value={formData.guest_count.toString()}
              onChangeText={(text) =>
                setFormData({
                  ...formData,
                  guest_count: parseInt(text) || 0,
                })
              }
              keyboardType="number-pad"
              placeholder="0"
            />
          </View>

          <View style={styles.reminderSection}>
            <Text style={styles.label}>Reminder</Text>
            <View style={styles.reminderOptions}>
              {[5, 15, 30, 60].map((minutes) => (
                <TouchableOpacity
                  key={minutes}
                  style={[
                    styles.reminderButton,
                    formData.reminder_minutes === minutes &&
                      styles.reminderButtonActive,
                  ]}
                  onPress={() =>
                    setFormData({ ...formData, reminder_minutes: minutes })
                  }
                >
                  <Text
                    style={[
                      styles.reminderButtonText,
                      formData.reminder_minutes === minutes &&
                        styles.reminderButtonTextActive,
                    ]}
                  >
                    {minutes}m
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          <View style={styles.actions}>
            <Button
              label="Cancel"
              variant="secondary"
              onPress={onClose}
              style={styles.cancelButton}
            />
            <Button
              label={initialEvent ? "Update" : "Create"}
              loading={loading}
              disabled={loading}
              onPress={handleSubmit}
              style={styles.submitButton}
            />
          </View>
        </ScrollView>
      </SafeAreaView>
    </Modal>
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
    gap: 16,
  },

  errorBox: {
    backgroundColor: "#fee2e2",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
  },

  errorText: {
    color: "#991b1b",
    fontSize: 14,
    fontWeight: "500",
  },

  label: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },

  dateSection: {
    marginBottom: 8,
  },

  dateButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    backgroundColor: "#ffffff",
  },

  dateButtonText: {
    fontSize: 14,
    color: "#1f2937",
    fontWeight: "500",
  },

  switchSection: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    gap: 12,
  },

  switchRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  switchLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },

  guestSection: {
    marginBottom: 8,
  },

  numberInput: {
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    backgroundColor: "#ffffff",
    color: "#1f2937",
  },

  reminderSection: {
    marginBottom: 8,
  },

  reminderOptions: {
    flexDirection: "row",
    gap: 8,
  },

  reminderButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    alignItems: "center",
    backgroundColor: "#ffffff",
  },

  reminderButtonActive: {
    backgroundColor: "#1e3a8a",
    borderColor: "#1e3a8a",
  },

  reminderButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },

  reminderButtonTextActive: {
    color: "#ffffff",
  },

  actions: {
    flexDirection: "row",
    gap: 12,
    marginTop: 24,
    marginBottom: 24,
  },

  cancelButton: {
    flex: 1,
  },

  submitButton: {
    flex: 1,
  },
});
