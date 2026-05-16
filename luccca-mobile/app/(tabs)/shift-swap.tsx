/**
 * Shift Swap Marketplace Screen
 * -----------------------------
 * Native mobile app screen for shift swapping marketplace
 * Features: Available shifts, swap requests, matching shifts
 */

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from "react-native";
import { useAuth } from "../../context/AuthContext";
import { useScheduleStore } from "../../store/useScheduleStore";

interface ShiftPosting {
  id: string;
  shiftId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  positionId: string;
  requiredSkills?: string[];
  status: "open" | "pending" | "approved" | "completed" | "cancelled";
  matchingScore?: number;
}

interface SwapRequest {
  id: string;
  postingId: string;
  status: "pending" | "approved" | "rejected" | "cancelled";
  requestedAt: string;
  matchingScore?: number;
}

/**
 * Shift Swap Marketplace Screen
 */
export default function ShiftSwapScreen() {
  const { user, token } = useAuth();
  const { refreshSchedule } = useScheduleStore();
  const [availablePostings, setAvailablePostings] = useState<ShiftPosting[]>([]);
  const [myRequests, setMyRequests] = useState<SwapRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState<"available" | "my-requests">("available");

  useEffect(() => {
    loadData();
  }, [activeTab]);

  /**
   * Load data
   */
  const loadData = async () => {
    try {
      setLoading(true);

      if (activeTab === "available") {
        await loadAvailablePostings();
      } else {
        await loadMyRequests();
      }
    } catch (error) {
      console.error("[ShiftSwap] Load error:", error);
      Alert.alert("Error", "Failed to load shift swap data");
    } finally {
      setLoading(false);
    }
  };

  /**
   * Load available postings
   */
  const loadAvailablePostings = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/shift-swap/available`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load available postings");
      }

      const data = await response.json();
      setAvailablePostings(data.postings || []);
    } catch (error) {
      console.error("[ShiftSwap] Load postings error:", error);
      throw error;
    }
  };

  /**
   * Load my requests
   */
  const loadMyRequests = async () => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/shift-swap/my-requests`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        throw new Error("Failed to load swap requests");
      }

      const data = await response.json();
      setMyRequests(data.requests || []);
    } catch (error) {
      console.error("[ShiftSwap] Load requests error:", error);
      throw error;
    }
  };

  /**
   * Request swap
   */
  const requestSwap = async (postingId: string) => {
    try {
      const response = await fetch(
        `${process.env.EXPO_PUBLIC_API_URL || "http://localhost:3000"}/api/shift-swap/request`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            postingId,
            requesterId: user?.id,
          }),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || "Failed to request swap");
      }

      Alert.alert("Success", "Swap request submitted. Waiting for manager approval.");
      await loadData();
      await refreshSchedule();
    } catch (error) {
      console.error("[ShiftSwap] Request swap error:", error);
      Alert.alert("Error", (error as Error).message || "Failed to request swap");
    }
  };

  /**
   * Refresh data
   */
  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  /**
   * Render shift posting item
   */
  const renderPosting = ({ item }: { item: ShiftPosting }) => {
    const startDate = new Date(item.startTime);
    const endDate = new Date(item.endTime);
    const durationHours = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60);

    return (
      <View style={styles.postingCard}>
        <View style={styles.postingHeader}>
          <Text style={styles.postingDate}>
            {startDate.toLocaleDateString("en-US", {
              weekday: "short",
              month: "short",
              day: "numeric",
            })}
          </Text>
          {item.matchingScore !== undefined && (
            <View style={styles.matchBadge}>
              <Text style={styles.matchText}>
                {Math.round(item.matchingScore * 100)}% match
              </Text>
            </View>
          )}
        </View>

        <Text style={styles.postingTime}>
          {startDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}{" "}
          -{" "}
          {endDate.toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
          })}
        </Text>

        <Text style={styles.postingDuration}>{durationHours.toFixed(1)} hours</Text>

        {item.requiredSkills && item.requiredSkills.length > 0 && (
          <View style={styles.skillsContainer}>
            {item.requiredSkills.slice(0, 3).map((skill, index) => (
              <View key={index} style={styles.skillTag}>
                <Text style={styles.skillText}>{skill}</Text>
              </View>
            ))}
          </View>
        )}

        <TouchableOpacity
          style={styles.requestButton}
          onPress={() => requestSwap(item.id)}
          disabled={item.status !== "open"}
        >
          <Text style={styles.requestButtonText}>
            {item.status === "open" ? "Request Swap" : item.status}
          </Text>
        </TouchableOpacity>
      </View>
    );
  };

  /**
   * Render swap request item
   */
  const renderRequest = ({ item }: { item: SwapRequest }) => {
    const requestDate = new Date(item.requestedAt);

    return (
      <View style={styles.requestCard}>
        <View style={styles.requestHeader}>
          <Text style={styles.requestDate}>
            Requested: {requestDate.toLocaleDateString()}
          </Text>
          <View
            style={[
              styles.statusBadge,
              item.status === "approved" && styles.statusApproved,
              item.status === "rejected" && styles.statusRejected,
              item.status === "pending" && styles.statusPending,
            ]}
          >
            <Text style={styles.statusText}>{item.status}</Text>
          </View>
        </View>

        {item.matchingScore !== undefined && (
          <Text style={styles.matchScore}>
            Match score: {Math.round(item.matchingScore * 100)}%
          </Text>
        )}
      </View>
    );
  };

  if (loading && !refreshing) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading shift swaps...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tab, activeTab === "available" && styles.tabActive]}
          onPress={() => setActiveTab("available")}
        >
          <Text
            style={[styles.tabText, activeTab === "available" && styles.tabTextActive]}
          >
            Available
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tab, activeTab === "my-requests" && styles.tabActive]}
          onPress={() => setActiveTab("my-requests")}
        >
          <Text
            style={[styles.tabText, activeTab === "my-requests" && styles.tabTextActive]}
          >
            My Requests
          </Text>
        </TouchableOpacity>
      </View>

      {/* Content */}
      <FlatList
        data={activeTab === "available" ? availablePostings : myRequests}
        renderItem={activeTab === "available" ? renderPosting : renderRequest}
        keyExtractor={(item) => item.id}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {activeTab === "available"
                ? "No available shifts to swap"
                : "No swap requests"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F5F5F5",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F5F5F5",
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: "#666",
  },
  tabContainer: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#E0E0E0",
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabActive: {
    borderBottomColor: "#007AFF",
  },
  tabText: {
    fontSize: 16,
    color: "#666",
    fontWeight: "500",
  },
  tabTextActive: {
    color: "#007AFF",
    fontWeight: "600",
  },
  listContent: {
    padding: 16,
  },
  postingCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  postingHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  postingDate: {
    fontSize: 18,
    fontWeight: "600",
    color: "#000",
  },
  matchBadge: {
    backgroundColor: "#4CAF50",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  matchText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
  },
  postingTime: {
    fontSize: 16,
    color: "#333",
    marginBottom: 4,
  },
  postingDuration: {
    fontSize: 14,
    color: "#666",
    marginBottom: 8,
  },
  skillsContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    marginBottom: 12,
  },
  skillTag: {
    backgroundColor: "#E3F2FD",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 8,
    marginBottom: 4,
  },
  skillText: {
    fontSize: 12,
    color: "#1976D2",
  },
  requestButton: {
    backgroundColor: "#007AFF",
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  requestButtonText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
  },
  requestCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  requestHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  requestDate: {
    fontSize: 14,
    color: "#666",
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusApproved: {
    backgroundColor: "#4CAF50",
  },
  statusRejected: {
    backgroundColor: "#F44336",
  },
  statusPending: {
    backgroundColor: "#FF9800",
  },
  statusText: {
    fontSize: 12,
    color: "#FFFFFF",
    fontWeight: "600",
    textTransform: "capitalize",
  },
  matchScore: {
    fontSize: 14,
    color: "#666",
    marginTop: 4,
  },
  emptyContainer: {
    padding: 32,
    alignItems: "center",
  },
  emptyText: {
    fontSize: 16,
    color: "#999",
    textAlign: "center",
  },
});
