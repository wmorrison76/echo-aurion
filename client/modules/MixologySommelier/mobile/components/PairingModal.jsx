import React, { useState } from "react";
import { View, Text, StyleSheet, TouchableOpacity } from "react-native";

export default function PairingModal({ pairing }) {
  const [expanded, setExpanded] = useState(false);

  const score = Math.round(pairing.pairing_score || 0);
  const scoreColor =
    score >= 80 ? "#4CAF50" : score >= 60 ? "#FFC107" : "#FF6B6B";

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <View style={styles.wineInfo}>
          <Text style={styles.wineName}>
            {pairing.wine_name || "Unknown Wine"}
          </Text>
          <Text style={styles.region}>
            {pairing.region} {pairing.vintage && `• ${pairing.vintage}`}
          </Text>
        </View>
        <View style={[styles.scoreCircle, { backgroundColor: scoreColor }]}>
          <Text style={styles.scoreText}>{score}</Text>
        </View>
      </View>

      {expanded && (
        <View style={styles.expandedContent}>
          <Text style={styles.rationale}>{pairing.rationale}</Text>
          <View style={styles.actionButtons}>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionText}>❤️ Save</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionBtn}>
              <Text style={styles.actionText}>📋 More Info</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: "#e0e0e0",
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  wineInfo: {
    flex: 1,
  },
  wineName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  region: {
    fontSize: 12,
    color: "#666",
  },
  scoreCircle: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  scoreText: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#fff",
  },
  expandedContent: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
  },
  rationale: {
    fontSize: 13,
    color: "#666",
    lineHeight: 18,
    marginBottom: 12,
  },
  actionButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  actionBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f0f0f0",
    borderRadius: 6,
  },
  actionText: {
    fontSize: 12,
    fontWeight: "500",
  },
});
