import React, { useEffect, useState } from "react";
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { getStats } from "../services/api";
import StatTile from "../components/StatTile";

export default function Dashboard() {
  const [stats, setStats] = useState({
    wines: 0,
    costPct: 0,
    topRegion: "Unknown",
    activeVenues: 0,
  });
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    setRefreshing(true);
    try {
      const data = await getStats();
      setStats(data);
    } catch (error) {
      console.error("Error loading dashboard stats:", error);
    } finally {
      setRefreshing(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    loadData().then(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <View style={styles.centered}>
        <ActivityIndicator size="large" color="#8B0000" />
      </View>
    );
  }

  return (
    <ScrollView
      contentContainerStyle={styles.container}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={loadData} />
      }
    >
      <View style={styles.header}>
        <Text style={styles.greeting}>Welcome Back!</Text>
        <Text style={styles.subheader}>Sommelier Dashboard</Text>
      </View>

      <View style={styles.statsGrid}>
        <StatTile label="Total Wines" value={stats.wines} icon="🍷" />
        <StatTile
          label="Current COGS %"
          value={`${stats.costPct}%`}
          icon="📊"
        />
        <StatTile label="Top Region" value={stats.topRegion} icon="🌍" />
        <StatTile label="Active Venues" value={stats.activeVenues} icon="🏢" />
      </View>

      <View style={styles.cardSection}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Recent Inventory</Text>
          <Text style={styles.actionSubtext}>
            View last 24 hours of cellar updates
          </Text>
        </View>
        <View style={styles.actionCard}>
          <Text style={styles.actionTitle}>Monthly Report</Text>
          <Text style={styles.actionSubtext}>
            Download current month COGS analysis
          </Text>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    backgroundColor: "#fff",
  },
  centered: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  header: {
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  subheader: {
    fontSize: 16,
    color: "#666",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  cardSection: {
    marginTop: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    marginBottom: 12,
    color: "#1a1a1a",
  },
  actionCard: {
    backgroundColor: "#f8f8f8",
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderLeftWidth: 4,
    borderLeftColor: "#8B0000",
  },
  actionTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  actionSubtext: {
    fontSize: 14,
    color: "#666",
  },
});
