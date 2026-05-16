import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { supabase } from "@services/supabaseClient";
interface DashboardMetrics {
  totalOrders: number;
  pendingDeliveries: number;
  lowStockItems: number;
  totalValue: number;
}
export function DashboardScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [metrics, setMetrics] = useState<DashboardMetrics>({
    totalOrders: 0,
    pendingDeliveries: 0,
    lowStockItems: 0,
    totalValue: 0,
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const fetchMetrics = async () => {
    try {
      if (!user) return;
      const { data: orders } = await supabase
        .from("orders")
        .select("id")
        .eq("outlet_id", user.current_outlet_id)
        .eq("status", "pending");
      const { data: deliveries } = await supabase
        .from("deliveries")
        .select("id")
        .eq("outlet_id", user.current_outlet_id)
        .eq("status", "in_transit");
      const { data: inventory } = await supabase
        .from("inventory")
        .select("quantity, min_stock")
        .eq("outlet_id", user.current_outlet_id)
        .lt("quantity", "min_stock");
      setMetrics({
        totalOrders: orders?.length || 0,
        pendingDeliveries: deliveries?.length || 0,
        lowStockItems: inventory?.length || 0,
        totalValue: 0,
      });
    } catch (error) {
      console.error("Error fetching metrics:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    fetchMetrics();
  }, [user?.current_outlet_id]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchMetrics();
  };
  if (loading) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        {" "}
        <ActivityIndicator size="large" color="#ef4444" />{" "}
      </View>
    );
  }
  return (
    <ScrollView
      className="flex-1 bg-surface"
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
          tintColor="#ef4444"
        />
      }
    >
      {" "}
      <View className="bg-background px-4 py-6 border-b border-gray-200">
        {" "}
        <Text className="text-2xl font-bold text-gray-900 mb-1">
          {" "}
          Welcome back, {user?.name}{" "}
        </Text>{" "}
        <Text className="text-sm text-muted-foreground">
          {" "}
          Outlet ID: {user?.current_outlet_id}{" "}
        </Text>{" "}
      </View>{" "}
      <View className="p-4 space-y-3">
        {" "}
        <MetricCard
          icon="shopping-cart"
          label="Pending Orders"
          value={metrics.totalOrders.toString()}
          color="#ef4444"
          onPress={() => navigation.navigate("Orders")}
        />{" "}
        <MetricCard
          icon="truck"
          label="Deliveries In Transit"
          value={metrics.pendingDeliveries.toString()}
          color="#3b82f6"
          onPress={() => navigation.navigate("Receiving")}
        />{" "}
        <MetricCard
          icon="alert-circle"
          label="Low Stock Items"
          value={metrics.lowStockItems.toString()}
          color="#f59e0b"
          onPress={() => navigation.navigate("Inventory")}
        />{" "}
        <MetricCard
          icon="dollar-sign"
          label="Inventory Value"
          value={`$${metrics.totalValue.toLocaleString()}`}
          color="#10b981"
        />{" "}
      </View>{" "}
      <View className="px-4 py-4 space-y-2">
        {" "}
        <Text className="text-lg font-semibold text-gray-900 mb-3">
          {" "}
          Quick Actions{" "}
        </Text>{" "}
        <TouchableOpacity
          className="bg-background p-4 rounded-lg flex-row items-center justify-between border border-gray-200"
          onPress={() => navigation.navigate("Receiving")}
        >
          {" "}
          <View className="flex-row items-center">
            {" "}
            <View className="w-10 h-10 bg-blue-100 rounded-lg justify-center items-center mr-3">
              {" "}
              <Feather name="inbox" size={20} color="#3b82f6" />{" "}
            </View>{" "}
            <Text className="font-semibold text-gray-900">
              New Delivery
            </Text>{" "}
          </View>{" "}
          <Feather name="chevron-right" size={20} color="#d1d5db" />{" "}
        </TouchableOpacity>{" "}
        <TouchableOpacity
          className="bg-background p-4 rounded-lg flex-row items-center justify-between border border-gray-200"
          onPress={() => navigation.navigate("Orders")}
        >
          {" "}
          <View className="flex-row items-center">
            {" "}
            <View className="w-10 h-10 bg-red-100 rounded-lg justify-center items-center mr-3">
              {" "}
              <Feather name="plus-circle" size={20} color="#ef4444" />{" "}
            </View>{" "}
            <Text className="font-semibold text-gray-900">
              Create Order
            </Text>{" "}
          </View>{" "}
          <Feather name="chevron-right" size={20} color="#d1d5db" />{" "}
        </TouchableOpacity>{" "}
        <TouchableOpacity
          className="bg-background p-4 rounded-lg flex-row items-center justify-between border border-gray-200"
          onPress={() => navigation.navigate("Inventory")}
        >
          {" "}
          <View className="flex-row items-center">
            {" "}
            <View className="w-10 h-10 bg-green-100 rounded-lg justify-center items-center mr-3">
              {" "}
              <Feather name="package" size={20} color="#10b981" />{" "}
            </View>{" "}
            <Text className="font-semibold text-gray-900">
              Count Inventory
            </Text>{" "}
          </View>{" "}
          <Feather name="chevron-right" size={20} color="#d1d5db" />{" "}
        </TouchableOpacity>{" "}
      </View>{" "}
    </ScrollView>
  );
}
function MetricCard({ icon, label, value, color, onPress }: any) {
  return (
    <TouchableOpacity
      className="bg-background p-4 rounded-lg flex-row items-center justify-between border border-gray-200"
      onPress={onPress}
      activeOpacity={onPress ? 0.7 : 1}
    >
      {" "}
      <View className="flex-row items-center flex-1">
        {" "}
        <View
          style={{
            width: 50,
            height: 50,
            backgroundColor: color + "20",
            borderRadius: 12,
            justifyContent: "center",
            alignItems: "center",
            marginRight: 12,
          }}
        >
          {" "}
          <Feather name={icon} size={24} color={color} />{" "}
        </View>{" "}
        <View>
          {" "}
          <Text className="text-xs text-muted-foreground mb-1">
            {label}
          </Text>{" "}
          <Text className="text-2xl font-bold text-gray-900">{value}</Text>{" "}
        </View>{" "}
      </View>{" "}
      {onPress && (
        <Feather name="chevron-right" size={20} color="#d1d5db" />
      )}{" "}
    </TouchableOpacity>
  );
}
