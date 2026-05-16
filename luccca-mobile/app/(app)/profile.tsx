import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth-store";
import { useEventStore } from "@/store/event-store";
import { useAnalyticsStore } from "@/store/analytics-store";
import { Card } from "@/components/Card";

export default function ProfileScreen() {
  const { user } = useAuthStore();
  const { events, totalUnsynced } = useEventStore();
  const { events: analyticsEvents } = useAnalyticsStore();

  useEffect(() => {}, []);

  const userInitials =
    user?.name
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase() || "U";

  const stats = [
    {
      label: "Total Events",
      value: events.length,
      icon: "calendar",
      color: "#3b82f6",
    },
    {
      label: "Pending Sync",
      value: totalUnsynced,
      icon: "sync",
      color: "#f59e0b",
    },
    {
      label: "This Month",
      value: events.filter((e) => {
        const eventDate = new Date(e.start_time);
        const now = new Date();
        return (
          eventDate.getMonth() === now.getMonth() &&
          eventDate.getFullYear() === now.getFullYear()
        );
      }).length,
      icon: "calendar-month",
      color: "#8b5cf6",
    },
  ];

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.title}>Profile</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.profileSection}>
          <View style={styles.avatarLarge}>
            <Text style={styles.avatarText}>{userInitials}</Text>
          </View>
          <Text style={styles.userName}>{user?.name || "User"}</Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
        </View>

        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Your Statistics</Text>
          {stats.map((stat) => (
            <Card key={stat.label} padding={16} bordered>
              <View style={styles.statRow}>
                <View
                  style={[
                    styles.statIcon,
                    { backgroundColor: `${stat.color}15` },
                  ]}
                >
                  <MaterialCommunityIcons
                    name={stat.icon}
                    size={20}
                    color={stat.color}
                  />
                </View>
                <View style={styles.statContent}>
                  <Text style={styles.statLabel}>{stat.label}</Text>
                  <Text style={styles.statValue}>{stat.value}</Text>
                </View>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recent Activity</Text>
          {analyticsEvents.length === 0 ? (
            <Card padding={24} bordered>
              <View style={styles.emptyState}>
                <MaterialCommunityIcons
                  name="history"
                  size={40}
                  color="#d1d5db"
                />
                <Text style={styles.emptyText}>No activity yet</Text>
              </View>
            </Card>
          ) : (
            analyticsEvents.slice(0, 5).map((event) => (
              <Card key={event.id} padding={12} bordered>
                <View style={styles.activityRow}>
                  <View style={styles.activityIcon}>
                    <MaterialCommunityIcons
                      name="information"
                      size={16}
                      color="#6b7280"
                    />
                  </View>
                  <View style={styles.activityContent}>
                    <Text style={styles.activityTitle}>{event.event_name}</Text>
                    <Text style={styles.activityTime}>
                      {new Date(event.timestamp).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </Text>
                  </View>
                </View>
              </Card>
            ))
          )}
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Member since{" "}
            {user?.created_at
              ? new Date(user.created_at).getFullYear()
              : new Date().getFullYear()}
          </Text>
        </View>
      </ScrollView>
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

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },

  content: {
    flex: 1,
  },

  profileSection: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: "center",
  },

  avatarLarge: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "#1e3a8a",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 16,
  },

  avatarText: {
    fontSize: 32,
    fontWeight: "700",
    color: "#ffffff",
  },

  userName: {
    fontSize: 20,
    fontWeight: "700",
    color: "#1f2937",
    marginBottom: 4,
  },

  userEmail: {
    fontSize: 14,
    color: "#6b7280",
  },

  statsSection: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  statRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  statIcon: {
    width: 44,
    height: 44,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },

  statContent: {
    flex: 1,
  },

  statLabel: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },

  statValue: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1f2937",
  },

  section: {
    paddingHorizontal: 16,
    marginBottom: 16,
  },

  emptyState: {
    alignItems: "center",
    justifyContent: "center",
  },

  emptyText: {
    fontSize: 14,
    color: "#9ca3af",
    marginTop: 12,
  },

  activityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },

  activityIcon: {
    width: 32,
    height: 32,
    borderRadius: 6,
    backgroundColor: "#f3f4f6",
    justifyContent: "center",
    alignItems: "center",
  },

  activityContent: {
    flex: 1,
  },

  activityTitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#1f2937",
    marginBottom: 2,
  },

  activityTime: {
    fontSize: 11,
    color: "#9ca3af",
  },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
    alignItems: "center",
  },

  footerText: {
    fontSize: 12,
    color: "#9ca3af",
  },
});
