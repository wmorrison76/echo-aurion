import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { supabase } from "@services/supabaseClient";
interface Delivery {
  id: string;
  invoice_number: string;
  vendor: string;
  status: "pending" | "in_transit" | "delivered" | "rejected";
  items_count: number;
  created_at: string;
}
export function ReceivingScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState<"all" | "pending" | "in_transit">("all");
  const fetchDeliveries = async () => {
    try {
      if (!user) return;
      let query = supabase
        .from("deliveries")
        .select("id, invoice_number, vendor, status, items_count, created_at")
        .eq("outlet_id", user.current_outlet_id)
        .order("created_at", { ascending: false });
      if (filter !== "all") {
        query = query.eq("status", filter);
      }
      const { data, error } = await query;
      if (error) throw error;
      setDeliveries(data || []);
    } catch (error) {
      console.error("Error fetching deliveries:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    fetchDeliveries();
  }, [user?.current_outlet_id, filter]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchDeliveries();
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "in_transit":
        return "#3b82f6";
      case "delivered":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "pending":
        return "clock";
      case "in_transit":
        return "truck";
      case "delivered":
        return "check-circle";
      case "rejected":
        return "x-circle";
      default:
        return "help-circle";
    }
  };
  if (loading && !refreshing) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        {" "}
        <ActivityIndicator size="large" color="#ef4444" />{" "}
      </View>
    );
  }
  return (
    <View className="flex-1 bg-surface">
      {" "}
      <View className="bg-background px-4 py-6 border-b border-gray-200">
        {" "}
        <Text className="text-2xl font-bold text-gray-900">Receiving</Text>{" "}
        <Text className="text-sm text-muted-foreground mt-1">
          {" "}
          {deliveries.length} deliveries{" "}
        </Text>{" "}
      </View>{" "}
      <View className="flex-row px-4 py-4 space-x-2">
        {" "}
        <FilterButton
          label="All"
          active={filter === "all"}
          onPress={() => setFilter("all")}
        />{" "}
        <FilterButton
          label="Pending"
          active={filter === "pending"}
          onPress={() => setFilter("pending")}
        />{" "}
        <FilterButton
          label="In Transit"
          active={filter === "in_transit"}
          onPress={() => setFilter("in_transit")}
        />{" "}
      </View>{" "}
      <FlatList
        data={deliveries}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            className="mx-4 mb-3 bg-background rounded-lg border border-gray-200 overflow-hidden"
            onPress={() =>
              navigation.navigate("InvoiceDetails", { deliveryId: item.id })
            }
          >
            {" "}
            <View className="p-4">
              {" "}
              <View className="flex-row justify-between items-start mb-3">
                {" "}
                <View className="flex-1">
                  {" "}
                  <Text className="font-semibold text-gray-900">
                    {" "}
                    {item.invoice_number}{" "}
                  </Text>{" "}
                  <Text className="text-sm text-muted-foreground mt-1">
                    {" "}
                    {item.vendor}{" "}
                  </Text>{" "}
                </View>{" "}
                <View
                  style={{
                    backgroundColor: getStatusColor(item.status) + "20",
                    paddingHorizontal: 10,
                    paddingVertical: 6,
                    borderRadius: 6,
                    flexDirection: "row",
                    alignItems: "center",
                  }}
                >
                  {" "}
                  <Feather
                    name={getStatusIcon(item.status) as any}
                    size={14}
                    color={getStatusColor(item.status)}
                    style={{ marginRight: 4 }}
                  />{" "}
                  <Text
                    style={{
                      fontSize: 12,
                      fontWeight: "600",
                      color: getStatusColor(item.status),
                      textTransform: "capitalize",
                    }}
                  >
                    {" "}
                    {item.status.replace("_", "")}{" "}
                  </Text>{" "}
                </View>{" "}
              </View>{" "}
              <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
                {" "}
                <Text className="text-xs text-muted-foreground">
                  {" "}
                  {item.items_count} items{" "}
                </Text>{" "}
                <Text className="text-xs text-muted-foreground">
                  {" "}
                  {new Date(item.created_at).toLocaleDateString()}{" "}
                </Text>{" "}
              </View>{" "}
            </View>{" "}
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-12">
            {" "}
            <Feather name="inbox" size={48} color="#d1d5db" />{" "}
            <Text className="text-muted-foreground mt-4 text-center">
              {" "}
              No deliveries found{" "}
            </Text>{" "}
          </View>
        }
        contentContainerStyle={{ paddingBottom: 20 }}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ef4444"
          />
        }
      />{" "}
    </View>
  );
}
function FilterButton({ label, active, onPress }: any) {
  return (
    <TouchableOpacity
      className={
        active
          ? "bg-red-500 rounded-full px-4 py-2"
          : "bg-background border border-border rounded-full px-4 py-2"
      }
      onPress={onPress}
    >
      {" "}
      <Text
        className={
          active
            ? "text-white font-semibold text-sm"
            : "text-foreground font-semibold text-sm"
        }
      >
        {" "}
        {label}{" "}
      </Text>{" "}
    </TouchableOpacity>
  );
}
