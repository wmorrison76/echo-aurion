import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  Alert,
} from "react-native";
import { Feather } from "@expo/vector-icons";
import { supabase } from "@services/supabaseClient";
interface InvoiceItem {
  id: string;
  product_name: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}
interface InvoiceDetail {
  id: string;
  invoice_number: string;
  vendor: string;
  status: "pending" | "received" | "rejected";
  total_amount: number;
  invoice_date: string;
  delivery_date: string | null;
  items: InvoiceItem[];
  notes: string | null;
}
export function InvoiceDetailsScreen({ route }: any) {
  const { deliveryId } = route.params || {};
  const [invoice, setInvoice] = useState<InvoiceDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  useEffect(() => {
    fetchInvoiceDetails();
  }, [deliveryId]);
  const fetchInvoiceDetails = async () => {
    try {
      const { data, error } = await supabase
        .from("deliveries")
        .select("*, items:delivery_items(*)")
        .eq("id", deliveryId)
        .single();
      if (error) throw error;
      setInvoice({
        id: data.id,
        invoice_number: data.invoice_number,
        vendor: data.vendor,
        status: data.status,
        total_amount: data.total_amount,
        invoice_date: data.invoice_date,
        delivery_date: data.delivery_date,
        items: data.items || [],
        notes: data.notes,
      });
    } catch (error) {
      console.error("Error fetching invoice:", error);
      Alert.alert("Error", "Failed to load invoice details");
    } finally {
      setLoading(false);
    }
  };
  const handleUpdateStatus = async (
    newStatus: "pending" | "received" | "rejected",
  ) => {
    setUpdating(true);
    try {
      const { error } = await supabase
        .from("deliveries")
        .update({ status: newStatus })
        .eq("id", deliveryId);
      if (error) throw error;
      setInvoice((prev) => (prev ? { ...prev, status: newStatus } : null));
      Alert.alert("Success", "Invoice status updated");
    } catch (error: any) {
      Alert.alert("Error", error.message);
    } finally {
      setUpdating(false);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "#f59e0b";
      case "received":
        return "#10b981";
      case "rejected":
        return "#ef4444";
      default:
        return "#6b7280";
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
  if (!invoice) {
    return (
      <View className="flex-1 bg-surface justify-center items-center">
        {" "}
        <Text className="text-muted-foreground">Invoice not found</Text>{" "}
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
            <View>
              {" "}
              <Text className="text-2xl font-bold text-gray-900">
                {" "}
                {invoice.invoice_number}{" "}
              </Text>{" "}
              <Text className="text-sm text-muted-foreground mt-1">
                {" "}
                {invoice.vendor}{" "}
              </Text>{" "}
            </View>{" "}
            <View
              style={{
                backgroundColor: getStatusColor(invoice.status) + "20",
                paddingHorizontal: 12,
                paddingVertical: 8,
                borderRadius: 8,
              }}
            >
              {" "}
              <Text
                style={{
                  fontSize: 12,
                  fontWeight: "600",
                  color: getStatusColor(invoice.status),
                  textTransform: "capitalize",
                }}
              >
                {" "}
                {invoice.status}{" "}
              </Text>{" "}
            </View>{" "}
          </View>{" "}
          <View className="bg-surface rounded-lg p-4 mt-4">
            {" "}
            <View className="flex-row justify-between mb-3">
              {" "}
              <Text className="text-muted-foreground">Invoice Date</Text>{" "}
              <Text className="text-gray-900 font-semibold">
                {" "}
                {new Date(invoice.invoice_date).toLocaleDateString()}{" "}
              </Text>{" "}
            </View>{" "}
            {invoice.delivery_date && (
              <View className="flex-row justify-between border-t border-gray-200 pt-3">
                {" "}
                <Text className="text-muted-foreground">
                  Delivery Date
                </Text>{" "}
                <Text className="text-gray-900 font-semibold">
                  {" "}
                  {new Date(invoice.delivery_date).toLocaleDateString()}{" "}
                </Text>{" "}
              </View>
            )}{" "}
          </View>{" "}
        </View>{" "}
      </View>{" "}
      <View className="mt-4 px-4">
        {" "}
        <Text className="text-lg font-bold text-gray-900 mb-3">
          Line Items
        </Text>{" "}
        <FlatList
          data={invoice.items}
          keyExtractor={(item) => item.id}
          scrollEnabled={false}
          renderItem={({ item }) => (
            <View className="bg-background rounded-lg border border-gray-200 p-4 mb-2">
              {" "}
              <View className="flex-row justify-between mb-2">
                {" "}
                <Text className="font-semibold text-gray-900 flex-1">
                  {" "}
                  {item.product_name}{" "}
                </Text>{" "}
                <Text className="font-semibold text-gray-900">
                  {" "}
                  ${item.line_total.toFixed(2)}{" "}
                </Text>{" "}
              </View>{" "}
              <View className="flex-row justify-between text-xs text-muted-foreground">
                {" "}
                <Text>Qty: {item.quantity}</Text>{" "}
                <Text>Unit Price: ${item.unit_price.toFixed(2)}</Text>{" "}
              </View>{" "}
            </View>
          )}
        />{" "}
      </View>{" "}
      <View className="mt-4 px-4 mb-6">
        {" "}
        <View className="bg-background rounded-lg border border-gray-200 p-4">
          {" "}
          <View className="flex-row justify-between mb-2">
            {" "}
            <Text className="text-muted-foreground">Subtotal</Text>{" "}
            <Text className="text-gray-900">
              {" "}
              ${invoice.total_amount.toFixed(2)}{" "}
            </Text>{" "}
          </View>{" "}
          <View className="flex-row justify-between border-t border-gray-200 pt-2">
            {" "}
            <Text className="font-semibold text-gray-900">Total</Text>{" "}
            <Text className="text-xl font-bold text-red-500">
              {" "}
              ${invoice.total_amount.toFixed(2)}{" "}
            </Text>{" "}
          </View>{" "}
        </View>{" "}
      </View>{" "}
      {invoice.notes && (
        <View className="px-4 mb-4">
          {" "}
          <Text className="text-sm font-semibold text-foreground mb-2">
            {" "}
            Notes{" "}
          </Text>{" "}
          <View className="bg-background rounded-lg border border-gray-200 p-4">
            {" "}
            <Text className="text-foreground">{invoice.notes}</Text>{" "}
          </View>{" "}
        </View>
      )}{" "}
      {invoice.status === "pending" && (
        <View className="px-4 pb-6 space-y-2">
          {" "}
          <TouchableOpacity
            className="bg-green-500 rounded-lg py-4"
            onPress={() => handleUpdateStatus("received")}
            disabled={updating}
          >
            {" "}
            <Text className="text-white text-center font-semibold">
              {" "}
              Mark as Received{" "}
            </Text>{" "}
          </TouchableOpacity>{" "}
          <TouchableOpacity
            className="bg-red-500 rounded-lg py-4"
            onPress={() => handleUpdateStatus("rejected")}
            disabled={updating}
          >
            {" "}
            <Text className="text-white text-center font-semibold">
              {" "}
              Reject Delivery{" "}
            </Text>{" "}
          </TouchableOpacity>{" "}
        </View>
      )}{" "}
    </ScrollView>
  );
}
