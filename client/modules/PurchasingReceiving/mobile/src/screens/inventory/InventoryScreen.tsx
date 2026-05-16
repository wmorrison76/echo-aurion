import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
  TextInput,
  FlatList,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@stores/authStore";
import { supabase } from "@services/supabaseClient";
interface InventoryItem {
  id: string;
  product_name: string;
  sku: string;
  quantity: number;
  min_stock: number;
  unit_price: number;
}
export function InventoryScreen({ navigation }: any) {
  const { user } = useAuthStore();
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "low_stock">("all");
  const fetchItems = async () => {
    try {
      if (!user) return;
      let query = supabase
        .from("inventory")
        .select("id, product_name, sku, quantity, min_stock, unit_price")
        .eq("outlet_id", user.current_outlet_id);
      if (filter === "low_stock") {
        query = query.lt("quantity", "min_stock");
      }
      const { data, error } = await query.order("product_name");
      if (error) throw error;
      setItems(data || []);
    } catch (error) {
      console.error("Error fetching inventory:", error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  useEffect(() => {
    fetchItems();
  }, [user?.current_outlet_id, filter]);
  const onRefresh = () => {
    setRefreshing(true);
    fetchItems();
  };
  const filteredItems = items.filter(
    (item) =>
      item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchQuery.toLowerCase()),
  );
  const isLowStock = (quantity: number, minStock: number) =>
    quantity < minStock;
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
        <Text className="text-2xl font-bold text-gray-900">Inventory</Text>{" "}
        <Text className="text-sm text-muted-foreground mt-1">
          {items.length} items
        </Text>{" "}
      </View>{" "}
      <View className="bg-background px-4 py-3 border-b border-gray-200">
        {" "}
        <View className="flex-row items-center bg-surface rounded-lg px-3 py-2 mb-3">
          {" "}
          <Feather name="search" size={18} color="#6b7280" />{" "}
          <TextInput
            className="flex-1 ml-2 text-base text-gray-900"
            placeholder="Search by name or SKU"
            placeholderTextColor="#9ca3af"
            value={searchQuery}
            onChangeText={setSearchQuery}
          />{" "}
        </View>{" "}
        <View className="flex-row space-x-2">
          {" "}
          <FilterButton
            label="All Items"
            active={filter === "all"}
            onPress={() => setFilter("all")}
          />{" "}
          <FilterButton
            label="Low Stock"
            active={filter === "low_stock"}
            onPress={() => setFilter("low_stock")}
          />{" "}
        </View>{" "}
      </View>{" "}
      <FlatList
        data={filteredItems}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <View className="mx-4 mb-3 bg-background rounded-lg border border-gray-200 p-4">
            {" "}
            <View className="flex-row justify-between items-start mb-2">
              {" "}
              <View className="flex-1">
                {" "}
                <Text className="font-semibold text-gray-900">
                  {" "}
                  {item.product_name}{" "}
                </Text>{" "}
                <Text className="text-xs text-muted-foreground mt-1">
                  {" "}
                  SKU: {item.sku}{" "}
                </Text>{" "}
              </View>{" "}
              {isLowStock(item.quantity, item.min_stock) && (
                <View className="bg-red-100 px-2 py-1 rounded">
                  {" "}
                  <Text className="text-xs font-semibold text-red-700">
                    {" "}
                    Low Stock{" "}
                  </Text>{" "}
                </View>
              )}{" "}
            </View>{" "}
            <View className="flex-row justify-between items-center pt-3 border-t border-gray-100">
              {" "}
              <View>
                {" "}
                <Text className="text-xs text-muted-foreground">
                  On Hand
                </Text>{" "}
                <Text className="text-lg font-bold text-gray-900">
                  {" "}
                  {item.quantity}{" "}
                </Text>{" "}
              </View>{" "}
              <View>
                {" "}
                <Text className="text-xs text-muted-foreground">
                  Min Stock
                </Text>{" "}
                <Text className="text-lg font-bold text-gray-900">
                  {" "}
                  {item.min_stock}{" "}
                </Text>{" "}
              </View>{" "}
              <View>
                {" "}
                <Text className="text-xs text-muted-foreground">
                  Unit Price
                </Text>{" "}
                <Text className="text-lg font-bold text-gray-900">
                  {" "}
                  ${item.unit_price.toFixed(2)}{" "}
                </Text>{" "}
              </View>{" "}
              <TouchableOpacity className="bg-blue-100 p-2 rounded">
                {" "}
                <Feather name="edit" size={18} color="#3b82f6" />{" "}
              </TouchableOpacity>{" "}
            </View>{" "}
          </View>
        )}
        ListEmptyComponent={
          <View className="flex-1 justify-center items-center py-12">
            {" "}
            <Feather name="package" size={48} color="#d1d5db" />{" "}
            <Text className="text-muted-foreground mt-4 text-center">
              {" "}
              No items found{" "}
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
    </View>
  );
}
function FilterButton({ label, active, onPress }: any) {
  return (
    <TouchableOpacity
      className={
        active
          ? "bg-red-500 rounded-full px-4 py-2"
          : "bg-surface rounded-full px-4 py-2"
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
