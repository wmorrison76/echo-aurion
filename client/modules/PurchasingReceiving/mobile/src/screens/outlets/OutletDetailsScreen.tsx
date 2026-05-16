import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@services/supabaseClient";
interface OutletInfo {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  manager: string;
  status: "active" | "inactive";
  total_revenue: number;
  pending_orders: number;
  staff_count: number;
}
export function OutletDetailsScreen({ route }: any) {
  const { outletId } = route.params || {};
  const [outlet, setOutlet] = useState<OutletInfo | null>(null);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchOutletDetails();
  }, [outletId]);
  const fetchOutletDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("outlets")
        .select("*")
        .eq("id", outletId)
        .single();
      if (error) throw error;
      setOutlet(data);
    } catch (error) {
      console.error("Error fetching outlet:", error);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        {" "}
        <ActivityIndicator size="large" color="#ef4444" />{" "}
      </View>
    );
  }
  if (!outlet) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        {" "}
        <Text className="text-muted-foreground">Outlet not found</Text>{" "}
      </View>
    );
  }
  return (
    <ScrollView className="flex-1 bg-surface">
      {" "}
      <View className="bg-background border-b border-gray-200">
        {" "}
        <View className="px-4 py-6">
          {" "}
          <View className="flex-row items-center justify-between mb-4">
            {" "}
            <Text className="text-2xl font-bold text-gray-900">
              {" "}
              {outlet.name}{" "}
            </Text>{" "}
            <View
              className={`px-3 py-1 rounded ${outlet.status === "active" ? "bg-green-100" : "bg-surface"}`}
            >
              {" "}
              <Text
                className={`text-xs font-semibold ${outlet.status === "active" ? "text-green-700" : "text-foreground"}`}
              >
                {" "}
                {outlet.status.toUpperCase()}{" "}
              </Text>{" "}
            </View>{" "}
          </View>{" "}
          <Text className="text-muted-foreground">{outlet.address}</Text>{" "}
        </View>{" "}
        <View className="grid grid-cols-3 gap-1 px-4 py-4 border-t border-gray-200">
          {" "}
          <View className="bg-surface rounded-lg p-3">
            {" "}
            <Text className="text-muted-foreground text-xs mb-1">
              Revenue
            </Text>{" "}
            <Text className="font-bold text-gray-900">
              {" "}
              ${outlet.total_revenue.toLocaleString()}{" "}
            </Text>{" "}
          </View>{" "}
          <View className="bg-surface rounded-lg p-3">
            {" "}
            <Text className="text-muted-foreground text-xs mb-1">
              Orders
            </Text>{" "}
            <Text className="font-bold text-gray-900">
              {" "}
              {outlet.pending_orders}{" "}
            </Text>{" "}
          </View>{" "}
          <View className="bg-surface rounded-lg p-3">
            {" "}
            <Text className="text-muted-foreground text-xs mb-1">
              Staff
            </Text>{" "}
            <Text className="font-bold text-gray-900">
              {" "}
              {outlet.staff_count}{" "}
            </Text>{" "}
          </View>{" "}
        </View>{" "}
      </View>{" "}
      <View className="mt-4 px-4 space-y-3">
        {" "}
        <Text className="text-lg font-bold text-gray-900">
          {" "}
          Contact Information{" "}
        </Text>{" "}
        <View className="bg-background rounded-lg border border-gray-200 p-4 flex-row items-center">
          {" "}
          <View className="w-10 h-10 bg-blue-100 rounded-lg justify-center items-center mr-3">
            {" "}
            <Feather name="phone" size={20} color="#3b82f6" />{" "}
          </View>{" "}
          <View className="flex-1">
            {" "}
            <Text className="text-xs text-muted-foreground">Phone</Text>{" "}
            <Text className="text-gray-900 font-semibold">
              {outlet.phone}
            </Text>{" "}
          </View>{" "}
        </View>{" "}
        <View className="bg-background rounded-lg border border-gray-200 p-4 flex-row items-center">
          {" "}
          <View className="w-10 h-10 bg-green-100 rounded-lg justify-center items-center mr-3">
            {" "}
            <Feather name="mail" size={20} color="#10b981" />{" "}
          </View>{" "}
          <View className="flex-1">
            {" "}
            <Text className="text-xs text-muted-foreground">Email</Text>{" "}
            <Text className="text-gray-900 font-semibold">
              {outlet.email}
            </Text>{" "}
          </View>{" "}
        </View>{" "}
        <View className="bg-background rounded-lg border border-gray-200 p-4 flex-row items-center">
          {" "}
          <View className="w-10 h-10 bg-purple-100 rounded-lg justify-center items-center mr-3">
            {" "}
            <Feather name="user" size={20} color="#8b5cf6" />{" "}
          </View>{" "}
          <View className="flex-1">
            {" "}
            <Text className="text-xs text-muted-foreground">Manager</Text>{" "}
            <Text className="text-gray-900 font-semibold">
              {" "}
              {outlet.manager}{" "}
            </Text>{" "}
          </View>{" "}
        </View>{" "}
      </View>{" "}
      <View className="mt-6 px-4 pb-6 space-y-2">
        {" "}
        <TouchableOpacity className="bg-background border border-gray-200 rounded-lg py-4 flex-row items-center justify-center">
          {" "}
          <Feather
            name="edit"
            size={18}
            color="#3b82f6"
            style={{ marginRight: 8 }}
          />{" "}
          <Text className="text-primary font-semibold">Edit Outlet</Text>{" "}
        </TouchableOpacity>{" "}
        <TouchableOpacity className="bg-background border border-gray-200 rounded-lg py-4 flex-row items-center justify-center">
          {" "}
          <Feather
            name="download"
            size={18}
            color="#10b981"
            style={{ marginRight: 8 }}
          />{" "}
          <Text className="text-green-600 font-semibold">
            Export Report
          </Text>{" "}
        </TouchableOpacity>{" "}
      </View>{" "}
    </ScrollView>
  );
}
