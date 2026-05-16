import React, { useEffect } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  TouchableOpacity,
  Switch,
  StatusBar,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useAuthStore } from "@/store/auth-store";
import { useIntegrationStore } from "@/store/integration-store";
import { useUIStore } from "@/store/ui-store";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export default function SettingsScreen() {
  const { user, logout } = useAuthStore();
  const { integrations, loadIntegrations } = useIntegrationStore();
  const { showToast } = useUIStore();

  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

  useEffect(() => {
    loadIntegrations();
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      showToast("Logged out successfully", "success");
    } catch (error) {
      showToast("Logout failed", "error");
    }
  };

  const googleIntegration = integrations.find((i) => i.provider === "google");
  const outlookIntegration = integrations.find((i) => i.provider === "outlook");

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.title}>Settings</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Preferences</Text>
          <Card padding={16} bordered>
            <SettingRow
              icon="bell"
              label="Notifications"
              value={notificationsEnabled}
              onToggle={setNotificationsEnabled}
            />
            <SettingRow
              icon="moon"
              label="Dark Mode"
              value={darkModeEnabled}
              onToggle={setDarkModeEnabled}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Connected Accounts</Text>
          <Card padding={16} bordered>
            <IntegrationRow
              icon="google"
              label="Google Calendar"
              connected={!!googleIntegration?.is_active}
              onConnect={() => showToast("Google sign-up coming soon", "info")}
            />
            <View style={styles.divider} />
            <IntegrationRow
              icon="microsoft-outlook"
              label="Outlook Calendar"
              connected={!!outlookIntegration?.is_active}
              onConnect={() => showToast("Outlook sign-up coming soon", "info")}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Card padding={16} bordered>
            <View style={styles.accountInfo}>
              <View style={styles.avatarCircle}>
                <MaterialCommunityIcons
                  name="account"
                  size={32}
                  color="#1e3a8a"
                />
              </View>
              <View style={styles.accountDetails}>
                <Text style={styles.accountName}>{user?.name || "User"}</Text>
                <Text style={styles.accountEmail}>{user?.email}</Text>
              </View>
            </View>

            <Button
              label="Logout"
              variant="danger"
              size="medium"
              onPress={handleLogout}
              style={styles.logoutButton}
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <Card padding={16} bordered>
            <InfoRow label="App Version" value="1.0.0" />
            <View style={styles.divider} />
            <InfoRow label="API Version" value="v1" />
            <View style={styles.divider} />
            <TouchableOpacity style={styles.infoRow}>
              <Text style={styles.infoLabel}>Privacy Policy</Text>
              <MaterialCommunityIcons
                name="chevron-right"
                size={20}
                color="#9ca3af"
              />
            </TouchableOpacity>
          </Card>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>
            © 2024 LUCCCA. All rights reserved.
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface SettingRowProps {
  icon: string;
  label: string;
  value: boolean;
  onToggle: (value: boolean) => void;
}

function SettingRow({ icon, label, value, onToggle }: SettingRowProps) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingLeft}>
        <MaterialCommunityIcons name={icon} size={20} color="#1e3a8a" />
        <Text style={styles.settingLabel}>{label}</Text>
      </View>
      <Switch value={value} onValueChange={onToggle} />
    </View>
  );
}

interface IntegrationRowProps {
  icon: string;
  label: string;
  connected: boolean;
  onConnect: () => void;
}

function IntegrationRow({
  icon,
  label,
  connected,
  onConnect,
}: IntegrationRowProps) {
  return (
    <View style={styles.integrationRow}>
      <View style={styles.integrationLeft}>
        <MaterialCommunityIcons name={icon} size={20} color="#1e3a8a" />
        <View>
          <Text style={styles.integrationLabel}>{label}</Text>
          <Text style={styles.integrationStatus}>
            {connected ? "Connected" : "Not connected"}
          </Text>
        </View>
      </View>
      <TouchableOpacity onPress={onConnect}>
        <MaterialCommunityIcons
          name={connected ? "check-circle" : "plus-circle"}
          size={24}
          color={connected ? "#22c55e" : "#9ca3af"}
        />
      </TouchableOpacity>
    </View>
  );
}

interface InfoRowProps {
  label: string;
  value: string;
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f9fafb",
  },

  header: {
    backgroundColor: "#ffffff",
    borderBottomWidth: 1,
    borderBottomColor: "#e5e7eb",
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  title: {
    fontSize: 24,
    fontWeight: "700",
    color: "#1f2937",
  },

  content: {
    flex: 1,
  },

  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  settingRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },

  settingLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  settingLabel: {
    fontSize: 15,
    fontWeight: "500",
    color: "#1f2937",
  },

  integrationRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },

  integrationLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  integrationLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },

  integrationStatus: {
    fontSize: 12,
    color: "#9ca3af",
    marginTop: 2,
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
  },

  accountInfo: {
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    marginBottom: 16,
  },

  avatarCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#dbeafe",
    justifyContent: "center",
    alignItems: "center",
  },

  accountDetails: {
    flex: 1,
  },

  accountName: {
    fontSize: 15,
    fontWeight: "600",
    color: "#1f2937",
  },

  accountEmail: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 2,
  },

  logoutButton: {
    marginTop: 8,
  },

  infoRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
  },

  infoLabel: {
    fontSize: 14,
    fontWeight: "500",
    color: "#1f2937",
  },

  infoValue: {
    fontSize: 14,
    color: "#6b7280",
  },

  footer: {
    paddingHorizontal: 16,
    paddingVertical: 32,
  },

  footerText: {
    fontSize: 12,
    color: "#9ca3af",
    textAlign: "center",
  },
});
