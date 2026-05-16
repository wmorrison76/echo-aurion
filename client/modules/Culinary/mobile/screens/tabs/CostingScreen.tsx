import React from "react";
import { View, FlatList, StyleSheet } from "react-native";
import { Card, Text, ProgressBar, Chip } from "react-native-paper";
const costingData = [
  {
    id: "1",
    name: "Pan-Seared Scallops",
    cost: 46.34,
    margin: 28.7,
    target: 30,
    status: "below",
  },
  {
    id: "2",
    name: "Herb-Roasted Chicken",
    cost: 39.22,
    margin: 22.4,
    target: 30,
    status: "below",
  },
  {
    id: "3",
    name: "Grilled Vegetables",
    cost: 8.5,
    margin: 52.8,
    target: 50,
    status: "above",
  },
];
export default function CostingScreen() {
  const getStatusColor = (status: string) => {
    return status === "above"
      ? "#10b981"
      : status === "below"
        ? "#ef4444"
        : "#f97316";
  };
  const renderCostCard = ({ item }: any) => (
    <Card style={styles.card}>
      {" "}
      <Card.Content>
        {" "}
        <View style={styles.header}>
          {" "}
          <View>
            {" "}
            <Text variant="titleMedium">{item.name}</Text>{" "}
            <Text variant="bodySmall" style={styles.cost}>
              {" "}
              Cost: ${item.cost.toFixed(2)}{" "}
            </Text>{" "}
          </View>{" "}
          <Chip
            label={`${item.margin.toFixed(1)}%`}
            style={{ backgroundColor: getStatusColor(item.status) }}
            textStyle={{ color: "#fff", fontWeight: "bold" }}
          />{" "}
        </View>{" "}
        <View style={styles.targetRow}>
          {" "}
          <Text variant="labelSmall" style={styles.label}>
            {" "}
            Target: {item.target}%{" "}
          </Text>{" "}
          <ProgressBar progress={item.margin / 100} style={styles.bar} />{" "}
        </View>{" "}
      </Card.Content>{" "}
    </Card>
  );
  return (
    <View style={styles.container}>
      {" "}
      <FlatList
        data={costingData}
        renderItem={renderCostCard}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        scrollEnabled={false}
      />{" "}
    </View>
  );
}
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#f8f9fa" },
  listContent: { padding: 12, gap: 12 },
  card: { marginBottom: 4 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  cost: { color: "#64748b", marginTop: 4 },
  targetRow: { gap: 8 },
  label: { color: "#64748b" },
  bar: { height: 8, borderRadius: 4 },
});
