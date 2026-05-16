import React, { useEffect, useState } from "react";
import {
  View,
  StyleSheet,
  SafeAreaView,
  Text,
  ScrollView,
  StatusBar,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useIntegrationStore } from "@/store/integration-store";
import { useUIStore } from "@/store/ui-store";
import { useAnalyticsStore } from "@/store/analytics-store";
import { Card } from "@/components/Card";
import { Button } from "@/components/Button";

export default function IntegrationsScreen() {
  const {
    integrations,
    loadIntegrations,
    syncIntegration,
    enableIntegration,
    disableIntegration,
    removeIntegration,
    startOAuthFlow,
    isSyncing,
  } = useIntegrationStore();
  const { showToast } = useUIStore();
  const { trackEvent } = useAnalyticsStore();

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadIntegrations();
    trackEvent("integrations_viewed", "user_action");
  }, []);

  const googleIntegration = integrations.find((i) => i.provider === "google");
  const outlookIntegration = integrations.find((i) => i.provider === "outlook");

  const handleConnect = async (provider: "google" | "outlook") => {
    try {
      setLoading(true);
      trackEvent("integration_connect_started", "user_action", { provider });
      await startOAuthFlow(provider);
      showToast(`Connecting to ${provider}...`, "info");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to connect";
      showToast(message, "error");
    } finally {
      setLoading(false);
    }
  };

  const handleSync = async (integrationId: string) => {
    try {
      await syncIntegration(integrationId);
      showToast("Sync completed successfully", "success");
      trackEvent("integration_synced", "user_action", { integrationId });
      await loadIntegrations();
    } catch (error) {
      const message = error instanceof Error ? error.message : "Sync failed";
      showToast(message, "error");
    }
  };

  const handleToggle = async (integrationId: string, enabled: boolean) => {
    try {
      if (enabled) {
        await disableIntegration(integrationId);
        showToast("Integration disabled", "success");
      } else {
        await enableIntegration(integrationId);
        showToast("Integration enabled", "success");
      }
      trackEvent("integration_toggled", "user_action", {
        integrationId,
        enabled: !enabled,
      });
      await loadIntegrations();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update integration";
      showToast(message, "error");
    }
  };

  const handleRemove = (integrationId: string, provider: string) => {
    Alert.alert(
      "Remove Integration",
      `Are you sure you want to remove the ${provider} calendar integration? This cannot be undone.`,
      [
        {
          text: "Cancel",
          onPress: () => {},
          style: "cancel",
        },
        {
          text: "Remove",
          onPress: async () => {
            try {
              await removeIntegration(integrationId);
              showToast("Integration removed", "success");
              trackEvent("integration_removed", "user_action", {
                integrationId,
                provider,
              });
              await loadIntegrations();
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Failed to remove integration";
              showToast(message, "error");
            }
          },
          style: "destructive",
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />

      <View style={styles.header}>
        <Text style={styles.title}>Integrations</Text>
        <Text style={styles.subtitle}>Connect your calendar services</Text>
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Available Services</Text>

          <IntegrationCard
            provider="Google Calendar"
            icon="google"
            description="Sync events with Google Calendar"
            isConnected={!!googleIntegration?.is_active}
            integration={googleIntegration}
            isSyncing={isSyncing[googleIntegration?.id || ""]}
            onConnect={() => handleConnect("google")}
            onSync={() => googleIntegration && handleSync(googleIntegration.id)}
            onToggle={() =>
              googleIntegration &&
              handleToggle(googleIntegration.id, googleIntegration.is_active)
            }
            onRemove={() =>
              googleIntegration && handleRemove(googleIntegration.id, "Google")
            }
            loading={loading}
          />

          <IntegrationCard
            provider="Outlook Calendar"
            icon="microsoft-outlook"
            description="Sync events with Outlook Calendar"
            isConnected={!!outlookIntegration?.is_active}
            integration={outlookIntegration}
            isSyncing={isSyncing[outlookIntegration?.id || ""]}
            onConnect={() => handleConnect("outlook")}
            onSync={() =>
              outlookIntegration && handleSync(outlookIntegration.id)
            }
            onToggle={() =>
              outlookIntegration &&
              handleToggle(outlookIntegration.id, outlookIntegration.is_active)
            }
            onRemove={() =>
              outlookIntegration &&
              handleRemove(outlookIntegration.id, "Outlook")
            }
            loading={loading}
          />
        </View>

        {integrations.length > 0 && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Connected Accounts</Text>

            {integrations.map((integration) => (
              <Card key={integration.id} padding={12} bordered>
                <View style={styles.accountRow}>
                  <View style={styles.accountInfo}>
                    <Text style={styles.accountName}>
                      {integration.account_name ||
                        integration.provider.toUpperCase()}
                    </Text>
                    {integration.last_sync_at && (
                      <Text style={styles.lastSync}>
                        Last synced:{" "}
                        {new Date(integration.last_sync_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </Text>
                    )}
                    {integration.last_error && (
                      <Text style={styles.syncError}>
                        Error: {integration.last_error}
                      </Text>
                    )}
                  </View>
                  <View style={styles.syncCount}>
                    <Text style={styles.syncCountNumber}>
                      {integration.sync_count}
                    </Text>
                    <Text style={styles.syncCountLabel}>syncs</Text>
                  </View>
                </View>
              </Card>
            ))}
          </View>
        )}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>How It Works</Text>

          <Card padding={16} bordered>
            <InfoStep
              number={1}
              title="Connect Account"
              description="Click 'Connect' to authenticate with Google or Outlook"
            />
            <View style={styles.divider} />
            <InfoStep
              number={2}
              title="Grant Permissions"
              description="Authorize LUCCCA to access your calendar"
            />
            <View style={styles.divider} />
            <InfoStep
              number={3}
              title="Start Syncing"
              description="Events sync automatically when online"
            />
          </Card>
        </View>

        <View style={styles.section}>
          <Card padding={16} bordered>
            <View style={styles.infoBox}>
              <MaterialCommunityIcons
                name="information"
                size={20}
                color="#0284c7"
              />
              <Text style={styles.infoText}>
                Synced events appear in your LUCCCA calendar. You can edit them
                here or in your original calendar service.
              </Text>
            </View>
          </Card>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

interface IntegrationCardProps {
  provider: string;
  icon: string;
  description: string;
  isConnected: boolean;
  integration?: any;
  isSyncing?: boolean;
  onConnect: () => void;
  onSync: () => void;
  onToggle: () => void;
  onRemove: () => void;
  loading?: boolean;
}

function IntegrationCard({
  provider,
  icon,
  description,
  isConnected,
  integration,
  isSyncing,
  onConnect,
  onSync,
  onToggle,
  onRemove,
  loading,
}: IntegrationCardProps) {
  return (
    <Card padding={16} bordered>
      <View style={styles.cardHeader}>
        <View style={styles.cardLeft}>
          <MaterialCommunityIcons name={icon} size={32} color="#1e3a8a" />
          <View>
            <Text style={styles.cardTitle}>{provider}</Text>
            <Text style={styles.cardDescription}>{description}</Text>
          </View>
        </View>
        {isConnected && (
          <MaterialCommunityIcons
            name="check-circle"
            size={24}
            color="#22c55e"
          />
        )}
      </View>

      {isConnected && (
        <View style={styles.cardActions}>
          <Button
            label={isSyncing ? "Syncing..." : "Sync Now"}
            size="small"
            variant="secondary"
            disabled={isSyncing || loading}
            onPress={onSync}
            style={styles.syncButton}
          />
          <TouchableOpacity
            style={styles.moreButton}
            onPress={onToggle}
            disabled={loading}
          >
            <MaterialCommunityIcons
              name="dots-vertical"
              size={20}
              color="#6b7280"
            />
          </TouchableOpacity>
        </View>
      )}

      {!isConnected && (
        <Button
          label={loading ? "Connecting..." : "Connect"}
          disabled={loading}
          onPress={onConnect}
          style={styles.connectButton}
        />
      )}
    </Card>
  );
}

interface InfoStepProps {
  number: number;
  title: string;
  description: string;
}

function InfoStep({ number, title, description }: InfoStepProps) {
  return (
    <View style={styles.stepRow}>
      <View style={styles.stepNumber}>
        <Text style={styles.stepNumberText}>{number}</Text>
      </View>
      <View style={styles.stepContent}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepDescription}>{description}</Text>
      </View>
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

  subtitle: {
    fontSize: 13,
    color: "#6b7280",
    marginTop: 4,
  },

  content: {
    flex: 1,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 16,
  },

  section: {
    marginBottom: 8,
  },

  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6b7280",
    textTransform: "uppercase",
    marginBottom: 8,
  },

  cardHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },

  cardLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },

  cardTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#1f2937",
  },

  cardDescription: {
    fontSize: 12,
    color: "#6b7280",
    marginTop: 2,
  },

  cardActions: {
    flexDirection: "row",
    gap: 8,
  },

  syncButton: {
    flex: 1,
  },

  moreButton: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },

  connectButton: {
    marginTop: 8,
  },

  accountRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },

  accountInfo: {
    flex: 1,
  },

  accountName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 4,
  },

  lastSync: {
    fontSize: 12,
    color: "#6b7280",
    marginBottom: 2,
  },

  syncError: {
    fontSize: 12,
    color: "#ef4444",
  },

  syncCount: {
    alignItems: "center",
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },

  syncCountNumber: {
    fontSize: 16,
    fontWeight: "700",
    color: "#0284c7",
  },

  syncCountLabel: {
    fontSize: 10,
    color: "#0284c7",
  },

  divider: {
    height: 1,
    backgroundColor: "#e5e7eb",
    marginVertical: 12,
  },

  stepRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },

  stepNumber: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#1e3a8a",
    justifyContent: "center",
    alignItems: "center",
  },

  stepNumberText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#ffffff",
  },

  stepContent: {
    flex: 1,
    paddingTop: 4,
  },

  stepTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#1f2937",
    marginBottom: 2,
  },

  stepDescription: {
    fontSize: 12,
    color: "#6b7280",
    lineHeight: 18,
  },

  infoBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    backgroundColor: "#f0f9ff",
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 8,
  },

  infoText: {
    flex: 1,
    fontSize: 13,
    color: "#0284c7",
    lineHeight: 18,
  },
});
