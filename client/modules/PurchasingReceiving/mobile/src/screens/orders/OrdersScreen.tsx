import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Modal,
  TextInput,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { supabase } from "@services/supabaseClient";
interface PurchaseOrder {
  id: string;
  order_number: string;
  vendor: string;
  status: "draft" | "pending" | "confirmed" | "shipped" | "received";
  total_amount: number;
  items_count: number;
  created_at: string;
}
export function OrdersScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [orders, setOrders] = useState<PurchaseOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newOrderData, setNewOrderData] = useState({
    vendor: "",
    estimatedAmount: "",
  });
  const fetchOrders = async () => {
    try {
      if (!user) return;
      const { data, error } = await supabase
        .from("purchase_orders")
        .select(
          "id, order_number, vendor, status, total_amount, items_count, created_at",
        )
        .eq("outlet_id", user.current_outlet_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error("Error fetching orders:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    fetchOrders();
  }, [user?.current_outlet_id]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchOrders();
  };
  const handleCreateOrder = async () => {
    if (!newOrderData.vendor || !newOrderData.estimatedAmount) {
      Alert.alert("Error", "Please fill in all fields");
      return;
    }
    try {
      const { error } = await supabase.from("purchase_orders").insert({
        outlet_id: user?.current_outlet_id,
        vendor: newOrderData.vendor,
        status: "draft",
        total_amount: parseFloat(newOrderData.estimatedAmount),
        items_count: 0,
      });
      if (error) throw error;
      setNewOrderData({ vendor: "", estimatedAmount: "" });
      setModalVisible(false);
      fetchOrders();
      Alert.alert("Success", "Order created successfully");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "draft":
        return "#9ca3af";
      case "pending":
        return "#f59e0b";
      case "confirmed":
        return "#3b82f6";
      case "shipped":
        return "#8b5cf6";
      case "received":
        return "#10b981";
      default:
        return "#6b7280";
    }
  };
  const getStatusIcon = (status: string) => {
    switch (status) {
      case "draft":
        return "file-text";
      case "pending":
        return "clock";
      case "confirmed":
        return "check";
      case "shipped":
        return "send";
      case "received":
        return "check-circle";
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
      <View className="bg-background px-4 py-6 border-b border-gray-200 flex-row justify-between items-center">
        {" "}
        <View>
          {" "}
          <Text className="text-2xl font-bold text-gray-900">Orders</Text>{" "}
          <Text className="text-sm text-muted-foreground mt-1">
            {" "}
            {orders.length} orders{" "}
          </Text>{" "}
        </View>{" "}
        <TouchableOpacity
          className="bg-red-500 rounded-lg p-3"
          onPress={() => setModalVisible(true)}
        >
          {" "}
          <Feather name="plus" size={24} color="#ffffff" />{" "}
        </TouchableOpacity>{" "}
      </View>{" "}
      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 bg-background rounded-lg border border-gray-200 p-4">
            {" "}
            <View className="flex-row justify-between items-start mb-3">
              {" "}
              <View className="flex-1">
                {" "}
                <Text className="font-semibold text-gray-900">
                  {" "}
                  {item.order_number}{" "}
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
                  {item.status}{" "}
                </Text>{" "}
              </View>{" "}
            </View>{" "}
            <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
              {" "}
              <Text className="text-xs text-muted-foreground">
                {" "}
                {item.items_count} items{" "}
              </Text>{" "}
              <Text className="font-semibold text-gray-900">
                {" "}
                ${item.total_amount.toFixed(2)}{" "}
              </Text>{" "}
            </View>{" "}
          </View>
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-12">
            {" "}
            <Feather name="shopping-cart" size={48} color="#d1d5db" />{" "}
            <Text className="text-muted-foreground mt-4 text-center">
              {" "}
              No orders found{" "}
            </Text>{" "}
          </View>
        }
        contentContainerStyle={{ paddingVertical: 12 }}
        scrollEnabled={true}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#ef4444"
          />
        }
      />{" "}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        {" "}
        <View className="flex-1 bg-black/50 justify-end">
          {" "}
          <View className="bg-background rounded-t-3xl p-6 pb-10">
            {" "}
            <View className="flex-row justify-between items-center mb-6">
              {" "}
              <Text className="text-2xl font-bold text-gray-900">
                {" "}
                New Order{" "}
              </Text>{" "}
              <TouchableOpacity onPress={() => setModalVisible(false)}>
                {" "}
                <Feather name="x" size={24} color="#6b7280" />{" "}
              </TouchableOpacity>{" "}
            </View>{" "}
            <View className="mb-4">
              {" "}
              <Text className="text-sm font-semibold mb-2 text-foreground">
                {" "}
                Vendor{" "}
              </Text>{" "}
              <TextInput
                className="border border-border rounded-lg px-4 py-3 text-base"
                placeholder="Select or enter vendor"
                placeholderTextColor="#9ca3af"
                value={newOrderData.vendor}
                onChangeText={(text) =>
                  setNewOrderData({ ...newOrderData, vendor: text })
                }
              />{" "}
            </View>{" "}
            <View className="mb-6">
              {" "}
              <Text className="text-sm font-semibold mb-2 text-foreground">
                {" "}
                Estimated Amount{" "}
              </Text>{" "}
              <TextInput
                className="border border-border rounded-lg px-4 py-3 text-base"
                placeholder="$0.00"
                placeholderTextColor="#9ca3af"
                value={newOrderData.estimatedAmount}
                onChangeText={(text) =>
                  setNewOrderData({ ...newOrderData, estimatedAmount: text })
                }
                keyboardType="decimal-pad"
              />{" "}
            </View>{" "}
            <TouchableOpacity
              className="bg-red-500 rounded-lg py-4"
              onPress={handleCreateOrder}
            >
              {" "}
              <Text className="text-white text-center font-semibold text-base">
                {" "}
                Create Order{" "}
              </Text>{" "}
            </TouchableOpacity>{" "}
          </View>{" "}
        </View>{" "}
      </Modal>{" "}
    </View>
  );
}
