import React from "react";
import { View, Text, StyleSheet } from "react-native";

export default function StatTile({ label, value, icon = "📊" }) {
  return (
    <View style={styles.tile}>
      <Text style={styles.icon}>{icon}</Text>
      <Text style={styles.label}>{label}</Text>
      <Text style={styles.value}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  tile: {
    width: "48%",
    backgroundColor: "#f8f8f8",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    alignItems: "center",
    borderLeftWidth: 4,
    borderLeftColor: "#8B0000",
  },
  icon: {
    fontSize: 32,
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  value: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1a1a1a",
  },
});
