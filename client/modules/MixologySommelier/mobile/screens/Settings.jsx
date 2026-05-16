import React, { useState } from "react";
import {
  View,
  Text,
  Button,
  StyleSheet,
  ScrollView,
  Switch,
  Alert,
} from "react-native";
import { syncNow } from "../services/sync";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function Settings() {
  const [autoSync, setAutoSync] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSyncTime, setLastSyncTime] = useState("Never");

  React.useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const lastSync = await AsyncStorage.getItem("lastSync");
      if (lastSync) {
        setLastSyncTime(new Date(lastSync).toLocaleString());
      }
      const autoSyncEnabled = await AsyncStorage.getItem("autoSync");
      setAutoSync(autoSyncEnabled === "true");
    } catch (error) {
      console.error("Error loading settings:", error);
    }
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      await syncNow();
      setLastSyncTime(new Date().toLocaleString());
      Alert.alert("Success", "Inventory synced successfully!");
    } catch (error) {
      console.error("Sync error:", error);
      Alert.alert("Sync Error", "Failed to sync inventory. Please try again.");
    } finally {
      setSyncing(false);
    }
  };

  const toggleAutoSync = async (value) => {
    setAutoSync(value);
    await AsyncStorage.setItem("autoSync", value ? "true" : "false");
  };

  const handleClearCache = async () => {
    Alert.alert("Clear Cache", "This will clear all local data. Continue?", [
      { text: "Cancel", onPress: () => {} },
      {
        text: "Clear",
        onPress: async () => {
          try {
            await AsyncStorage.clear();
            Alert.alert("Success", "Cache cleared");
          } catch (error) {
            Alert.alert("Error", "Failed to clear cache");
          }
        },
      },
    ]);
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Settings</Text>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Synchronization</Text>
        <View style={styles.settingRow}>
          <View>
            <Text style={styles.settingLabel}>Auto-sync Inventory</Text>
            <Text style={styles.settingSubtext}>
              Automatically sync every 15 minutes
            </Text>
          </View>
          <Switch
            value={autoSync}
            onValueChange={toggleAutoSync}
            trackColor={{ false: "#ddd", true: "#c9b5a8" }}
            thumbColor={autoSync ? "#8B0000" : "#f4f3f4"}
          />
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title={syncing ? "Syncing..." : "Force Sync Now"}
            onPress={handleSync}
            color="#8B0000"
            disabled={syncing}
          />
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Last Sync:</Text>
          <Text style={styles.infoValue}>{lastSyncTime}</Text>
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>App Data</Text>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>App Version:</Text>
          <Text style={styles.infoValue}>1.0.0</Text>
        </View>

        <View style={styles.infoBox}>
          <Text style={styles.infoLabel}>Backend API:</Text>
          <Text style={styles.infoValue}>https://api.luccca.io</Text>
        </View>

        <View style={styles.buttonContainer}>
          <Button
            title="Clear Local Cache"
            onPress={handleClearCache}
            color="#8B0000"
          />
        </View>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Support</Text>
        <Text style={styles.supportText}>
          For assistance, contact your LUCCCA support team or email
          support@luccca.io
        </Text>
      </View>

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          EchoServe Mobile © 2024 LUCCCA Systems
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: "#fff",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 24,
    color: "#1a1a1a",
  },
  section: {
    marginBottom: 28,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginBottom: 16,
    color: "#1a1a1a",
    borderBottomWidth: 1,
    borderBottomColor: "#e0e0e0",
    paddingBottom: 8,
  },
  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
    paddingVertical: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
    marginBottom: 4,
  },
  settingSubtext: {
    fontSize: 12,
    color: "#999",
  },
  buttonContainer: {
    marginVertical: 12,
  },
  infoBox: {
    backgroundColor: "#f8f8f8",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
  },
  infoLabel: {
    fontSize: 12,
    color: "#999",
    marginBottom: 4,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1a1a1a",
  },
  supportText: {
    fontSize: 13,
    color: "#666",
    lineHeight: 20,
  },
  footer: {
    marginTop: 40,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#e0e0e0",
    alignItems: "center",
  },
  footerText: {
    fontSize: 12,
    color: "#999",
  },
});
