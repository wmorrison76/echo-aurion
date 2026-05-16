import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useEventStore } from "@/store/event-store";
import { useAnalyticsStore } from "@/store/analytics-store";
import { Card } from "@/components/Card";

export default function AnalyticsScreen() {
  const { events } = useEventStore();
  const { snapshots, loadSnapshots, trackEvent } = useAnalyticsStore();

  const [period, setPeriod] = useState<"daily" | "weekly" | "monthly">(
    "monthly",
  );

  useEffect(() => {
    loadSnapshots(period);
    trackEvent("analytics_viewed", "user_action", { period });
  }, [period]);

  const allEvents = events;
  const totalEvents = allEvents.length;
  const syncedEvents = allEvents.filter((e) => e.is_synced).length;
  const unsyncedEvents = totalEvents - syncedEvents;
  const conflictEvents = allEvents.filter((e) => e.conflict_detected).length;

  const thisMonthEvents = allEvents.filter((e) => {
    const eventDate = new Date(e.start_time);
    const now = new Date();
    return (
      eventDate.getMonth() === now.getMonth() &&
      eventDate.getFullYear() === now.getFullYear()
    );
  }).length;

  const averageGuestCount =
    allEvents.length > 0
      ? Math.round(
          allEvents.reduce((sum, e) => sum + (e.guest_count || 0), 0) /
            allEvents.length,
        )
      : 0;

  const recurringEvents = allEvents.filter((e) => e.is_recurring).length;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.title}>Analytics</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.periodSelector}>
          {["daily", "weekly", "monthly"].map((p) => (
            <TouchableOpacity
              key={p}
              style={[
                styles.periodButton,
                period === p && styles.periodButtonActive,
              ]}
              onPress={() => setPeriod(p as "daily" | "weekly" | "monthly")}
            >
              <Text
                style={[
                  styles.periodButtonText,
                  period === p && styles.periodButtonTextActive,
                ]}
              >
                {p.charAt(0).toUpperCase() + p.slice(1)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.statsGrid}>
          <StatCard
            icon="calendar"
            label="Total Events"
            value={totalEvents.toString()}
            color="#3b82f6"
          />
          <StatCard
            icon="calendar-check"
            label="This Month"
            value={thisMonthEvents.toString()}
            color="#10b981"
          />
          <StatCard
            icon="cloud-check"
            label="Synced"
            value={syncedEvents.toString()}
            color="#8b5cf6"
          />
          <StatCard
            icon="cloud-off"
            label="Pending"
            value={unsyncedEvents.toString()}
            color="#f59e0b"
          />
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Detailed Metrics</Text>

          <Card padding={16} bordered>
            <MetricRow
              icon="alert-circle"
              label="Conflicts Detected"
              value={conflictEvents.toString()}
              color="#ef4444"
            />
            <View style={styles.divider} />
            <MetricRow
              icon="repeat"
              label="Recurring Events"
              value={recurringEvents.toString()}
              color="#8b5cf6"
            />
            <View style={styles.divider} />
            <MetricRow
              icon="account-multiple"
              label="Avg. Guests per Event"
              value={averageGuestCount.toString()}
              color="#06b6d4"
            />
          </Card>
        </View>

        {snapshots.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Period Overview</Text>

            {snapshots.slice(0, 3).map((snapshot) => (
              <Card key={snapshot.id} padding={12} bordered>
                <View style={styles.snapshotRow}>
                  <View style={styles.snapshotContent}>
                    <Text style={styles.snapshotDate}>
                      {new Date(snapshot.snapshot_date).toLocaleDateString(
                        "en-US",
                        { month: "short", day: "numeric" },
                      )}
                    </Text>
                    <View style={styles.snapshotStats}>
                      <Text style={styles.snapshotStat}>
                        {snapshot.event_count} events
                      </Text>
                      <Text style={styles.snapshotStat}>
                        {snapshot.guest_count} guests
                      </Text>
                    </View>
                  </View>
                  <View style={styles.capacityBadge}>
                    <Text style={styles.capacityValue}>
                      {Math.round(snapshot.capacity_percentage)}%
                    </Text>
                    <Text style={styles.capacityLabel}>Capacity</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Event Distribution</Text>

          <Card padding={16} bordered>
            <View style={styles.distributionRow}>
              <View style={styles.distributionItem}>
                <View
                  style={[
                    styles.distributionDot,
                    { backgroundColor: "#3b82f6" },
                  ]}
                />
                <Text style={styles.distributionLabel}>All Day</Text>
                <Text style={styles.distributionValue}>
                  {allEvents.filter((e) => e.is_all_day).length}
                </Text>
              </View>
              <View style={styles.distributionItem}>
                <View
                  style={[
                    styles.distributionDot,
                    { backgroundColor: "#10b981" },
                  ]}
                />
                <Text style={styles.distributionLabel}>Timed</Text>
                <Text style={styles.distributionValue}>
                  {allEvents.filter((e) => !e.is_all_day).length}
                </Text>
              </View>
              <View style={styles.distributionItem}>
                <View
                  style={[
                    styles.distributionDot,
                    { backgroundColor: "#f59e0b" },
                  ]}
                />
                <Text style={styles.distributionLabel}>Recurring</Text>
                <Text style={styles.distributionValue}>{recurringEvents}</Text>
              </View>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface StatCardProps {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function StatCard({ icon, label, value, color }: StatCardProps) {
  return (
    <Card padding={16} bordered>
      <View style={styles.statCardContent}>
        <View style={[styles.statCardIcon, { backgroundColor: `${color}15` }]}>
          <MaterialCommunityIcons name={icon} size={24} color={color} />
        </View>
        <Text style={styles.statCardValue}>{value}</Text>
        <Text style={styles.statCardLabel}>{label}</Text>
      </View>
    </Card>
  );
}

interface MetricRowProps {
  icon: string;
  label: string;
  value: string;
  color: string;
}

function MetricRow({ icon, label, value, color }: MetricRowProps) {
  return (
    <View style={styles.metricRow}>
      <View style={styles.metricLeft}>
        <MaterialCommunityIcons name={icon} size={20} color={color} />
        <Text style={styles.metricLabel}>{label}</Text>
      </View>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
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

  title: {
    fontSize: 24,
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

  periodSelector: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },

  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: "#e5e7eb",
    borderRadius: 6,
    alignItems: "center",
  },

  periodButtonActive: {
    backgroundColor: "#1e3a8a",
    borderColor: "#1e3a8a",
  },

  periodButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6b7280",
  },

  periodButtonTextActive: {
    color: "#ffffff",
  },

  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginBottom: 8,
  },

  statCardContent: {
    alignItems: "center",
    gap: 8,
  },

  statCardIcon: {
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },

  statCardValue: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
  },

  statCardLabel: {
    fontSize: 12,
    color: "#6b7280",
    textAlign: "center",
  },

  section: {
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  metricRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },

  metricLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },

  metricLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },

  metricValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  snapshotRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  snapshotContent: {
    flex: 1,
  },

  snapshotDate: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },

  snapshotStats: {
    flexDirection: "row",
    gap: 12,
  },

  snapshotStat: {
    fontSize: 12,
    color: "#6b7280",
  },

  capacityBadge: {
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  capacityValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0284c7",
  },

  capacityLabel: {
    fontSize: 10,
    color: "#0284c7",
    fontWeight: "500",
  },

  distributionRow: {
    flexDirection: "row",
    justifyContent: "space-around",
  },

  distributionItem: {
    alignItems: "center",
    gap: 6,
  },

  distributionDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },

  distributionLabel: {
    fontSize: 12,
    color: "#6b7280",
  },

  distributionValue: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1f2937",
  },
});
