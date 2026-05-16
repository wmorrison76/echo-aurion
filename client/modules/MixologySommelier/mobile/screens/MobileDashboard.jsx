import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { SyncEngine } from "../services/sync";
import axios from "axios";

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:8080/api";

export default function MobileDashboard({ navigation }) {
  const [venueId, setVenueId] = useState("venue-001");
  const [stats, setStats] = useState({
    totalItems: 0,
    lowStockItems: 0,
    pendingTransfers: 0,
    lastSync: null,
    pendingCounts: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [syncStatus, setSyncStatus] = useState("synced");
  const [recentActivity, setRecentActivity] = useState([]);
  const [syncEngine] = useState(new SyncEngine());
  const [isOnline, setIsOnline] = useState(true);

  useEffect(() => {
    initializeDashboard();
  }, []);

  async function initializeDashboard() {
    try {
      await syncEngine.initialize();
      await loadDashboardData();
      setLoading(false);
    } catch (error) {
      console.error("Failed to initialize dashboard:", error);
      setLoading(false);
    }
  }

  async function loadDashboardData() {
    try {
      await Promise.all([
        loadInventoryStats(),
        loadPendingTransfers(),
        loadRecentActivity(),
        checkSyncStatus(),
      ]);
    } catch (error) {
      console.error("Failed to load dashboard data:", error);
    }
  }

  async function loadInventoryStats() {
    try {
      const response = await axios.get(`${API_BASE_URL}/liquor-inventory/stats`, {
        params: { venue_id: venueId },
      });

      const data = response.data || {};
      const pendingItems = await syncEngine.db.getAllAsync(
        `SELECT COUNT(*) as count FROM offline_counts WHERE synced = 0`
      );

      setStats((prev) => ({
        ...prev,
        totalItems: data.total_items || 0,
        lowStockItems: data.low_stock || 0,
        pendingCounts: pendingItems?.[0]?.count || 0,
      }));
    } catch (error) {
      console.error("Failed to load inventory stats:", error);
    }
  }

  async function loadPendingTransfers() {
    try {
      const response = await axios.get(`${API_BASE_URL}/transfers`, {
        params: { venue_id: venueId, status: "requested,approved" },
      });

      const pendingCount = (response.data || []).length;
      setStats((prev) => ({
        ...prev,
        pendingTransfers: pendingCount,
      }));
    } catch (error) {
      console.error("Failed to load pending transfers:", error);
    }
  }

  async function loadRecentActivity() {
    try {
      const synced = await syncEngine.db.getAllAsync(
        `SELECT entity_type, action, created_at FROM sync_queue 
         WHERE sync_status = 'synced' 
         ORDER BY synced_at DESC 
         LIMIT 5`
      );

      const activities = synced.map((item) => ({
        id: `${item.entity_type}-${item.created_at}`,
        type: item.entity_type,
        action: item.action,
        timestamp: new Date(item.created_at),
      }));

      setRecentActivity(activities);
    } catch (error) {
      console.error("Failed to load recent activity:", error);
    }
  }

  async function checkSyncStatus() {
    try {
      const pending = await syncEngine.getPendingSyncItems();
      setSyncStatus(pending.length > 0 ? "pending" : "synced");

      if (pending.length > 0) {
        setStats((prev) => ({
          ...prev,
          lastSync: syncEngine.lastSyncTime,
        }));
      }
    } catch (error) {
      console.error("Failed to check sync status:", error);
    }
  }

  async function handleSync() {
    setSyncStatus("syncing");
    try {
      const result = await syncEngine.syncPendingChanges();
      if (result.failed === 0) {
        setSyncStatus("synced");
        Alert.alert(
          "Sync Complete",
          `Successfully synced ${result.synced} items`
        );
      } else {
        setSyncStatus("error");
        Alert.alert(
          "Sync Issues",
          `Synced: ${result.synced}, Failed: ${result.failed}`
        );
      }
      await loadDashboardData();
    } catch (error) {
      setSyncStatus("error");
      Alert.alert("Sync Failed", error.message);
    }
  }

  async function onRefresh() {
    setRefreshing(true);
    try {
      await loadDashboardData();
    } catch (error) {
      Alert.alert("Refresh Failed", error.message);
    } finally {
      setRefreshing(false);
    }
  }

  if (loading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>Good Morning</Text>
            <Text style={styles.venueInfo}>Venue: Main Cellar</Text>
          </View>
          <View style={styles.syncIndicator}>
            <View
              style={[
                styles.syncDot,
                {
                  backgroundColor:
                    syncStatus === "synced"
                      ? "#4caf50"
                      : syncStatus === "pending"
                      ? "#ff9800"
                      : "#f44336",
                },
              ]}
            />
            <Text style={styles.syncText}>
              {syncStatus === "synced"
                ? "Synced"
                : syncStatus === "pending"
                ? "Pending"
                : "Error"}
            </Text>
          </View>
        </View>

        <View style={styles.statsGrid}>
          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              navigation.navigate("InventoryTab", {
                screen: "InventoryCount",
                params: { venueId },
              })
            }
          >
            <Text style={styles.statValue}>{stats.totalItems}</Text>
            <Text style={styles.statLabel}>Total Items</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.statCard, styles.alertCard]}
            onPress={() =>
              navigation.navigate("InventoryTab", {
                screen: "InventoryCount",
                params: { venueId },
              })
            }
          >
            <Text style={styles.alertValue}>{stats.lowStockItems}</Text>
            <Text style={styles.alertLabel}>Low Stock</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.statCard}
            onPress={() =>
              navigation.navigate("InventoryTab", {
                screen: "TransferWorkflow",
                params: { venueId },
              })
            }
          >
            <Text style={styles.statValue}>{stats.pendingTransfers}</Text>
            <Text style={styles.statLabel}>Pending</Text>
          </TouchableOpacity>

          <View style={styles.statCard}>
            <Text style={styles.statValue}>{stats.pendingCounts}</Text>
            <Text style={styles.statLabel}>Counts</Text>
          </View>
        </View>

        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Quick Actions</Text>
          </View>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("InventoryTab", {
                screen: "InventoryCount",
                params: { venueId },
              })
            }
          >
            <Text style={styles.actionIcon}>📦</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Count Inventory</Text>
              <Text style={styles.actionSubtitle}>
                Record physical counts with photos
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() =>
              navigation.navigate("InventoryTab", {
                screen: "TransferWorkflow",
                params: { venueId },
              })
            }
          >
            <Text style={styles.actionIcon}>🔄</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>Transfer Items</Text>
              <Text style={styles.actionSubtitle}>
                Request inter-venue transfers
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionIcon}>📊</Text>
            <View style={styles.actionContent}>
              <Text style={styles.actionTitle}>View Reports</Text>
              <Text style={styles.actionSubtitle}>
                Variance, variance, audit trails
              </Text>
            </View>
            <Text style={styles.actionArrow}>›</Text>
          </TouchableOpacity>
        </View>

        {recentActivity.length > 0 && (
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Recent Activity</Text>
            </View>

            <FlatList
              data={recentActivity}
              keyExtractor={(item) => item.id}
              scrollEnabled={false}
              renderItem={({ item }) => (
                <View style={styles.activityItem}>
                  <View style={styles.activityDot} />
                  <View style={styles.activityContent}>
                    <Text style={styles.activityType}>
                      {item.type.replace(/_/g, " ")}
                    </Text>
                    <Text style={styles.activityTime}>
                      {item.timestamp.toLocaleTimeString()}
                    </Text>
                  </View>
                  <Text style={styles.activityAction}>{item.action}</Text>
                </View>
              )}
            />
          </View>
        )}

        {syncStatus === "pending" && (
          <TouchableOpacity
            style={styles.syncButton}
            onPress={handleSync}
            disabled={syncStatus === "syncing"}
          >
            <Text style={styles.syncButtonText}>
              {syncStatus === "syncing" ? "Syncing..." : "Sync Now"}
            </Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Last sync: {stats.lastSync ? new Date(stats.lastSync).toLocaleString() : "Never"}
          </Text>
          <Text style={styles.footerText}>
            {isOnline ? "Online" : "Offline - Changes will sync when connected"}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    padding: 20,
    paddingBottom: 16,
    backgroundColor: "#fff",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  venueInfo: {
    fontSize: 13,
    color: "#666",
    marginTop: 4,
  },
  syncIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5f5f5",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 20,
  },
  syncDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  syncText: {
    fontSize: 12,
    color: "#666",
    fontWeight: "500",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    padding: 12,
    gap: 12,
  },
  statCard: {
    width: "48%",
    backgroundColor: "#fff",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  alertCard: {
    borderColor: "#ff9800",
    borderWidth: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#8B0000",
  },
  statLabel: {
    fontSize: 12,
    color: "#666",
    marginTop: 6,
    fontWeight: "500",
  },
  alertValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#ff9800",
  },
  alertLabel: {
    fontSize: 12,
    color: "#ff9800",
    marginTop: 6,
    fontWeight: "500",
  },
  section: {
    marginTop: 12,
    marginHorizontal: 12,
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1a1a1a",
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: "#8B0000",
  },
  actionIcon: {
    fontSize: 28,
    marginRight: 12,
  },
  actionContent: {
    flex: 1,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1a1a1a",
  },
  actionSubtitle: {
    fontSize: 12,
    color: "#999",
    marginTop: 2,
  },
  actionArrow: {
    fontSize: 20,
    color: "#ccc",
  },
  activityItem: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  activityDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#8B0000",
    marginRight: 12,
  },
  activityContent: {
    flex: 1,
  },
  activityType: {
    fontSize: 13,
    fontWeight: "600",
    color: "#1a1a1a",
    textTransform: "capitalize",
  },
  activityTime: {
    fontSize: 11,
    color: "#999",
    marginTop: 2,
  },
  activityAction: {
    fontSize: 11,
    color: "#8B0000",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  syncButton: {
    backgroundColor: "#8B0000",
    marginHorizontal: 12,
    marginVertical: 16,
    paddingVertical: 12,
    borderRadius: 8,
  },
  syncButtonText: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
    textAlign: "center",
  },
  footer: {
    paddingHorizontal: 12,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    backgroundColor: "#f5f5f5",
  },
  footerText: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },
});
