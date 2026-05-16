import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import * as Sharing from "expo-sharing";
import { useReportStore } from "@/store/report-store";
import { useUIStore } from "@/store/ui-store";
import { useAnalyticsStore } from "@/store/analytics-store";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";
import type { ReportFormat, ScheduledReport } from "@/store/report-store";

export default function ReportsScreen() {
  const {
    reports,
    scheduledReports,
    isGenerating,
    generationProgress,
    createReport,
    downloadReport,
    emailReport,
    createScheduledReport,
    deleteScheduledReport,
    deleteReport,
    listReports,
  } = useReportStore();

  const { showToast } = useUIStore();
  const { trackEvent } = useAnalyticsStore();

  const [activeTab, setActiveTab] = useState<"generate" | "scheduled">(
    "generate",
  );
  const [showReportModal, setShowReportModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [emailRecipient, setEmailRecipient] = useState("");
  const [selectedReport, setSelectedReport] = useState<ReportFormat | null>(
    null,
  );

  const [formData, setFormData] = useState({
    name: "",
    format: "pdf" as "pdf" | "csv" | "json",
    type: "all" as "calendar" | "analytics" | "integrations" | "all",
    dateRange: "month" as "today" | "week" | "month" | "custom",
    includeAnalytics: true,
    includeAttendees: true,
  });

  const [scheduleData, setScheduleData] = useState({
    name: "",
    frequency: "weekly" as "daily" | "weekly" | "monthly",
    recipients: "",
  });

  useEffect(() => {
    listReports();
    trackEvent("reports_viewed", "user_action");
  }, []);

  const handleCreateReport = async () => {
    if (!formData.name.trim()) {
      showToast("Please enter a report name", "error");
      return;
    }

    try {
      const report = await createReport({
        name: formData.name,
        format: formData.format,
        type: formData.type,
        dateRange: formData.dateRange,
        includeAnalytics: formData.includeAnalytics,
        includeAttendees: formData.includeAttendees,
      });

      trackEvent("report_created", "user_action", {
        format: formData.format,
        type: formData.type,
      });

      setShowReportModal(false);
      setFormData({
        name: "",
        format: "pdf",
        type: "all",
        dateRange: "month",
        includeAnalytics: true,
        includeAttendees: true,
      });

      showToast("Report created successfully", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create report";
      showToast(message, "error");
    }
  };

  const handleDownloadReport = async (report: ReportFormat) => {
    try {
      const uri = await downloadReport(report);

      trackEvent("report_downloaded", "user_action", {
        format: report.format,
      });

      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri);
        showToast("Report ready to share", "success");
      } else {
        showToast("Report saved on device", "success");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to download report";
      showToast(message, "error");
    }
  };

  const handleEmailReport = async () => {
    if (!emailRecipient.trim()) {
      showToast("Please enter an email address", "error");
      return;
    }

    if (!selectedReport) {
      showToast("No report selected", "error");
      return;
    }

    try {
      await emailReport(selectedReport, [emailRecipient]);
      trackEvent("report_emailed", "user_action", {
        format: selectedReport.format,
      });
      setEmailRecipient("");
      setSelectedReport(null);
      showToast("Report emailed successfully", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to email report";
      showToast(message, "error");
    }
  };

  const handleCreateSchedule = async () => {
    if (!scheduleData.name.trim()) {
      showToast("Please enter a schedule name", "error");
      return;
    }

    if (!scheduleData.recipients.trim()) {
      showToast("Please enter recipient email", "error");
      return;
    }

    try {
      const report = await createReport({
        name: scheduleData.name,
        format: "pdf",
        type: "all",
        dateRange: "month",
        includeAnalytics: true,
        includeAttendees: true,
      });

      await createScheduledReport({
        name: scheduleData.name,
        format: report,
        frequency: scheduleData.frequency,
        recipients: scheduleData.recipients.split(",").map((r) => r.trim()),
        enabled: true,
        nextRunAt: new Date().toISOString(),
      });

      trackEvent("schedule_created", "user_action", {
        frequency: scheduleData.frequency,
      });

      setShowScheduleModal(false);
      setScheduleData({
        name: "",
        frequency: "weekly",
        recipients: "",
      });

      showToast("Schedule created successfully", "success");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to create schedule";
      showToast(message, "error");
    }
  };

  const handleDeleteReport = (id: string) => {
    Alert.alert(
      "Delete Report",
      "Are you sure you want to delete this report?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteReport(id);
            showToast("Report deleted", "success");
          },
        },
      ],
    );
  };

  const handleDeleteSchedule = (id: string) => {
    Alert.alert(
      "Delete Schedule",
      "Are you sure you want to delete this schedule?",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            await deleteScheduledReport(id);
            showToast("Schedule deleted", "success");
          },
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.title}>Reports & Exports</Text>
        <Text style={styles.subtitle}>
          Generate and schedule custom reports
        </Text>
      </View>

      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "generate" && styles.activeTab]}
          onPress={() => setActiveTab("generate")}
        >
          <MaterialCommunityIcons
            name="file-download"
            size={20}
            color={activeTab === "generate" ? "#1e3a8a" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "generate" && styles.activeTabLabel,
            ]}
          >
            Generate
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tab, activeTab === "scheduled" && styles.activeTab]}
          onPress={() => setActiveTab("scheduled")}
        >
          <MaterialCommunityIcons
            name="clock-outline"
            size={20}
            color={activeTab === "scheduled" ? "#1e3a8a" : "#9ca3af"}
          />
          <Text
            style={[
              styles.tabLabel,
              activeTab === "scheduled" && styles.activeTabLabel,
            ]}
          >
            Scheduled
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {activeTab === "generate" ? (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Reports</Text>
              <Button
                label="New Report"
                onPress={() => setShowReportModal(true)}
                style={styles.newButton}
              />
            </View>

            {reports.length === 0 ? (
              <Card style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="file-document-outline"
                  size={48}
                  color="#9ca3af"
                />
                <Text style={styles.emptyText}>No reports yet</Text>
                <Text style={styles.emptySubtext}>
                  Create your first report to get started
                </Text>
              </Card>
            ) : (
              <View style={styles.reportsList}>
                {reports.map((report) => (
                  <Card key={report.id} style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                      <View style={styles.reportInfo}>
                        <Text style={styles.reportName}>{report.name}</Text>
                        <Text style={styles.reportMeta}>
                          {report.format.toUpperCase()} • {report.dateRange}
                        </Text>
                      </View>
                      <View style={styles.reportBadge}>
                        <MaterialCommunityIcons
                          name={
                            report.format === "pdf"
                              ? "file-pdf"
                              : report.format === "csv"
                                ? "file-delimited"
                                : "code-json"
                          }
                          size={16}
                          color="#1e3a8a"
                        />
                      </View>
                    </View>

                    <View style={styles.reportActions}>
                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDownloadReport(report)}
                      >
                        <MaterialCommunityIcons
                          name="download"
                          size={16}
                          color="#0284c7"
                        />
                        <Text style={styles.actionLabel}>Download</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => {
                          setSelectedReport(report);
                          setEmailRecipient("");
                        }}
                      >
                        <MaterialCommunityIcons
                          name="email"
                          size={16}
                          color="#0284c7"
                        />
                        <Text style={styles.actionLabel}>Email</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => handleDeleteReport(report.id)}
                      >
                        <MaterialCommunityIcons
                          name="delete"
                          size={16}
                          color="#ef4444"
                        />
                        <Text
                          style={[styles.actionLabel, { color: "#ef4444" }]}
                        >
                          Delete
                        </Text>
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>
        ) : (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Scheduled Reports</Text>
              <Button
                label="Schedule Report"
                onPress={() => setShowScheduleModal(true)}
                style={styles.newButton}
              />
            </View>

            {scheduledReports.length === 0 ? (
              <Card style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={48}
                  color="#9ca3af"
                />
                <Text style={styles.emptyText}>No scheduled reports</Text>
                <Text style={styles.emptySubtext}>
                  Create a schedule to automate report delivery
                </Text>
              </Card>
            ) : (
              <View style={styles.scheduleList}>
                {scheduledReports.map((schedule) => (
                  <Card key={schedule.id} style={styles.scheduleCard}>
                    <View style={styles.scheduleHeader}>
                      <View style={styles.scheduleInfo}>
                        <Text style={styles.scheduleName}>{schedule.name}</Text>
                        <Text style={styles.scheduleMeta}>
                          {schedule.frequency} •{" "}
                          {schedule.recipients.join(", ")}
                        </Text>
                      </View>
                      <View
                        style={[
                          styles.statusBadge,
                          schedule.enabled
                            ? styles.enabledBadge
                            : styles.disabledBadge,
                        ]}
                      >
                        <Text style={styles.statusText}>
                          {schedule.enabled ? "Active" : "Inactive"}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.scheduleFooter}>
                      <Text style={styles.nextRunText}>
                        Next run:{" "}
                        {new Date(schedule.nextRunAt).toLocaleDateString()}
                      </Text>
                      <TouchableOpacity
                        onPress={() => handleDeleteSchedule(schedule.id)}
                      >
                        <MaterialCommunityIcons
                          name="delete"
                          size={20}
                          color="#ef4444"
                        />
                      </TouchableOpacity>
                    </View>
                  </Card>
                ))}
              </View>
            )}
          </View>
        )}
      </ScrollView>

      <Modal visible={showReportModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Create New Report</Text>
              <TouchableOpacity onPress={() => setShowReportModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#1f2937"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>Report Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="Enter report name"
                  value={formData.name}
                  onChangeText={(name) => setFormData({ ...formData, name })}
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Format</Text>
                <View style={styles.formatOptions}>
                  {(["pdf", "csv", "json"] as const).map((format) => (
                    <TouchableOpacity
                      key={format}
                      style={[
                        styles.formatOption,
                        formData.format === format && styles.selectedFormat,
                      ]}
                      onPress={() => setFormData({ ...formData, format })}
                    >
                      <Text style={styles.formatText}>
                        {format.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Report Type</Text>
                <View style={styles.typeOptions}>
                  {(
                    ["calendar", "analytics", "integrations", "all"] as const
                  ).map((type) => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        formData.type === type && styles.selectedType,
                      ]}
                      onPress={() => setFormData({ ...formData, type })}
                    >
                      <Text style={styles.typeText}>{type}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Date Range</Text>
                <View style={styles.rangeOptions}>
                  {(["today", "week", "month", "custom"] as const).map(
                    (range) => (
                      <TouchableOpacity
                        key={range}
                        style={[
                          styles.rangeOption,
                          formData.dateRange === range && styles.selectedRange,
                        ]}
                        onPress={() =>
                          setFormData({ ...formData, dateRange: range })
                        }
                      >
                        <Text style={styles.rangeText}>{range}</Text>
                      </TouchableOpacity>
                    ),
                  )}
                </View>
              </View>

              <View style={styles.checkboxGroup}>
                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      includeAnalytics: !formData.includeAnalytics,
                    })
                  }
                >
                  <MaterialCommunityIcons
                    name={
                      formData.includeAnalytics
                        ? "checkbox-marked"
                        : "checkbox-blank-outline"
                    }
                    size={24}
                    color="#1e3a8a"
                  />
                  <Text style={styles.checkboxLabel}>Include Analytics</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.checkbox}
                  onPress={() =>
                    setFormData({
                      ...formData,
                      includeAttendees: !formData.includeAttendees,
                    })
                  }
                >
                  <MaterialCommunityIcons
                    name={
                      formData.includeAttendees
                        ? "checkbox-marked"
                        : "checkbox-blank-outline"
                    }
                    size={24}
                    color="#1e3a8a"
                  />
                  <Text style={styles.checkboxLabel}>Include Attendees</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                label="Cancel"
                onPress={() => setShowReportModal(false)}
                variant="secondary"
              />
              <Button label="Create" onPress={handleCreateReport} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal visible={showScheduleModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Schedule Report</Text>
              <TouchableOpacity onPress={() => setShowScheduleModal(false)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#1f2937"
                />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.modalBody}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.formGroup}>
                <Text style={styles.label}>Schedule Name</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g., Weekly Team Report"
                  value={scheduleData.name}
                  onChangeText={(name) =>
                    setScheduleData({ ...scheduleData, name })
                  }
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Frequency</Text>
                <View style={styles.frequencyOptions}>
                  {(["daily", "weekly", "monthly"] as const).map((freq) => (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.frequencyOption,
                        scheduleData.frequency === freq &&
                          styles.selectedFrequency,
                      ]}
                      onPress={() =>
                        setScheduleData({ ...scheduleData, frequency: freq })
                      }
                    >
                      <Text style={styles.frequencyText}>{freq}</Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.label}>Recipients (comma-separated)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="email@example.com, another@example.com"
                  value={scheduleData.recipients}
                  onChangeText={(recipients) =>
                    setScheduleData({ ...scheduleData, recipients })
                  }
                  multiline
                />
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <Button
                label="Cancel"
                onPress={() => setShowScheduleModal(false)}
                variant="secondary"
              />
              <Button label="Schedule" onPress={handleCreateSchedule} />
            </View>
          </View>
        </View>
      </Modal>

      <Modal
        visible={
          selectedReport !== null && !showReportModal && !showScheduleModal
        }
        transparent
        animationType="fade"
      >
        <View style={styles.emailModalContainer}>
          <View style={styles.emailModalContent}>
            <View style={styles.emailModalHeader}>
              <Text style={styles.emailModalTitle}>Email Report</Text>
              <TouchableOpacity onPress={() => setSelectedReport(null)}>
                <MaterialCommunityIcons
                  name="close"
                  size={24}
                  color="#1f2937"
                />
              </TouchableOpacity>
            </View>

            <View style={styles.emailModalBody}>
              <Text style={styles.emailModalLabel}>Recipient Email</Text>
              <TextInput
                style={styles.emailInput}
                placeholder="recipient@example.com"
                value={emailRecipient}
                onChangeText={setEmailRecipient}
                keyboardType="email-address"
              />
            </View>

            <View style={styles.emailModalFooter}>
              <Button
                label="Cancel"
                onPress={() => setSelectedReport(null)}
                variant="secondary"
              />
              <Button label="Send" onPress={handleEmailReport} />
            </View>
          </View>
        </View>
      </Modal>

      {isGenerating && (
        <View style={styles.loadingOverlay}>
          <View style={styles.loadingBox}>
            <ActivityIndicator size="large" color="#1e3a8a" />
            <Text style={styles.loadingText}>Generating Report</Text>
            <View style={styles.progressBar}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${generationProgress}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>{generationProgress}%</Text>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#ffffff",
  },

  header: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 2,
  },

  subtitle: {
    fontSize: 13,
    color: "#6b7280",
  },

  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 16,
  },

  tab: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 12,
  },

  activeTab: {
    borderBottomWidth: 2,
    borderBottomColor: "#1e3a8a",
  },

  tabLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#9ca3af",
  },

  activeTabLabel: {
    color: "#1e3a8a",
  },

  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 16,
  },

  section: {
    marginBottom: 24,
  },

  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },

  newButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
  },

  emptyState: {
    alignItems: "center",
    paddingVertical: 48,
  },

  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 12,
  },

  emptySubtext: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
    textAlign: "center",
  },

  reportsList: {
    gap: 12,
  },

  reportCard: {
    padding: 12,
    borderRadius: 8,
  },

  reportHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  reportInfo: {
    flex: 1,
  },

  reportName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },

  reportMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  reportBadge: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#f0f9ff",
    justifyContent: "center",
    alignItems: "center",
  },

  reportActions: {
    flexDirection: "row",
    gap: 12,
  },

  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: "#e5e7eb",
  },

  actionLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#0284c7",
  },

  scheduleList: {
    gap: 12,
  },

  scheduleCard: {
    padding: 12,
    borderRadius: 8,
  },

  scheduleHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  scheduleInfo: {
    flex: 1,
  },

  scheduleName: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1f2937",
  },

  scheduleMeta: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },

  enabledBadge: {
    backgroundColor: "#dcfce7",
  },

  disabledBadge: {
    backgroundColor: "#fee2e2",
  },

  statusText: {
    fontSize: 11,
    fontWeight: "600",
    color: "#16a34a",
  },

  scheduleFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e5e7eb",
  },

  nextRunText: {
    fontSize: 12,
    color: "#6b7280",
  },

  modalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },

  modalContent: {
    backgroundColor: "#ffffff",
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    maxHeight: "90%",
  },

  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  modalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },

  modalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  formGroup: {
    marginBottom: 16,
  },

  label: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },

  input: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
  },

  formatOptions: {
    flexDirection: "row",
    gap: 8,
  },

  formatOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },

  selectedFormat: {
    backgroundColor: "#dbeafe",
    borderColor: "#0284c7",
  },

  formatText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },

  typeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  typeOption: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },

  selectedType: {
    backgroundColor: "#dbeafe",
    borderColor: "#0284c7",
  },

  typeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },

  rangeOptions: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },

  rangeOption: {
    flex: 1,
    minWidth: "45%",
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },

  selectedRange: {
    backgroundColor: "#dbeafe",
    borderColor: "#0284c7",
  },

  rangeText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },

  checkboxGroup: {
    gap: 12,
  },

  checkbox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  checkboxLabel: {
    fontSize: 14,
    color: "#1f2937",
  },

  frequencyOptions: {
    flexDirection: "row",
    gap: 8,
  },

  frequencyOption: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    alignItems: "center",
  },

  selectedFrequency: {
    backgroundColor: "#dbeafe",
    borderColor: "#0284c7",
  },

  frequencyText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#1f2937",
  },

  modalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  emailModalContainer: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  emailModalContent: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    width: "85%",
    maxWidth: 400,
  },

  emailModalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
  },

  emailModalTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },

  emailModalBody: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },

  emailModalLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 8,
  },

  emailInput: {
    backgroundColor: "#f3f4f6",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: "#1f2937",
  },

  emailModalFooter: {
    flexDirection: "row",
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },

  loadingOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
  },

  loadingBox: {
    backgroundColor: "#ffffff",
    borderRadius: 12,
    paddingHorizontal: 32,
    paddingVertical: 32,
    alignItems: "center",
  },

  loadingText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
    marginTop: 16,
  },

  progressBar: {
    width: 200,
    height: 6,
    backgroundColor: "#e5e7eb",
    borderRadius: 3,
    marginTop: 16,
    overflow: "hidden",
  },

  progressFill: {
    height: "100%",
    backgroundColor: "#1e3a8a",
  },

  progressText: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 8,
  },
});
