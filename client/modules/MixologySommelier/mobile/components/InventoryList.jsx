import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function InventoryList({ item }) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.name}>{item.name || "Unknown Wine"}</Text>
        <Text style={styles.qty}>{item.qty_bottles || 0} bottles</Text>
      </View>
      <View style={styles.details}>
        <Text style={styles.region}>{item.region || "Unknown Region"}</Text>
        {item.vintage && <Text style={styles.vintage}>{item.vintage}</Text>}
      </View>
      {item.bin_location && (
        <Text style={styles.binLocation}>Bin: {item.bin_location}</Text>
      )}
      {item.cost_per_bottle && (
        <Text style={styles.cost}>
          Cost: ${item.cost_per_bottle.toFixed(2)} per bottle
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    flex: 1,
  },
  qty: {
    fontSize: 14,
    fontWeight: "600",
    color: "#8B0000",
  },
  details: {
    flexDirection: "row",
    marginBottom: 8,
  },
  region: {
    fontSize: 12,
    color: "#666",
    marginRight: 8,
  },
  vintage: {
    fontSize: 12,
    color: "#999",
  },
  binLocation: {
    fontSize: 11,
    color: "#999",
    marginBottom: 4,
  },
  cost: {
    fontSize: 12,
    color: "#666",
  },
});
