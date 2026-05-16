/**
 * Integration Settings Panel Component
 *
 * Manage integrations (Teams, Slack, webhooks)
 * All integrations are optional - native features work independently
 * All text is i18n-ready with translation keys
 */

import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Settings,
  CheckCircle2,
  XCircle,
  RefreshCw,
  ExternalLink,
  Trash2,
  Plus,
  Webhook,
  Globe,
} from "lucide-react";
import { format } from "date-fns";
import { useToast } from "@/hooks/use-toast";
import { useI18n } from "@/i18n";
import { cn } from "@/lib/glass";

interface Integration {
  id: string;
  type: "teams" | "slack" | "webhook" | "custom";
  name: string;
  nameKey?: string; // i18n key
  enabled: boolean;
  lastSync?: string;
  syncStatus?: "success" | "error" | "pending";
  syncError?: string;
}

interface Webhook {
  id: string;
  name: string;
  nameKey?: string; // i18n key
  url: string;
  enabled: boolean;
  events: string[];
  lastTriggered?: string;
  lastSuccess?: string;
  lastError?: string;
}

export default function IntegrationSettingsPanel() {
  const { t } = useI18n();
  const { toast } = useToast();
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadIntegrations();
    loadWebhooks();
  }, []);

  const loadIntegrations = async () => {
    try {
      const response = await fetch("/api/integrations");
      const data = await response.json();

      if (data.success) {
        setIntegrations(data.data || []);
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to load integrations",
        variant: "destructive",
      });
    }
  };

  const loadWebhooks = async () => {
    try {
      // In production, fetch from API
      setWebhooks([]);
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to load webhooks",
        variant: "destructive",
      });
    }
  };

  const handleConnectTeams = async () => {
    try {
      const response = await fetch(
        "/api/integrations/teams/auth-url?redirectUri=" +
          encodeURIComponent(
            window.location.origin + "/integrations/teams/callback",
          ),
      );
      const data = await response.json();

      if (data.success) {
        // Redirect to Teams OAuth URL
        window.location.href = data.data.authUrl;
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to connect Teams",
        variant: "destructive",
      });
    }
  };

  const handleConnectSlack = async () => {
    try {
      const response = await fetch(
        "/api/integrations/slack/auth-url?redirectUri=" +
          encodeURIComponent(
            window.location.origin + "/integrations/slack/callback",
          ),
      );
      const data = await response.json();

      if (data.success) {
        // Redirect to Slack OAuth URL
        window.location.href = data.data.authUrl;
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to connect Slack",
        variant: "destructive",
      });
    }
  };

  const handleToggleIntegration = async (
    integrationId: string,
    enabled: boolean,
  ) => {
    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();
      if (data.success) {
        await loadIntegrations();
        toast({
          title: enabled
            ? t("integrations.enabled") || "Integration Enabled"
            : t("integrations.disabled") || "Integration Disabled",
          description: enabled
            ? t("integrations.enabled.description") ||
              "Integration has been enabled"
            : t("integrations.disabled.description") ||
              "Integration has been disabled",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to update integration",
        variant: "destructive",
      });
    }
  };

  const handleSyncIntegration = async (integrationId: string) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/integrations/${integrationId}/sync`, {
        method: "POST",
      });

      const data = await response.json();
      if (data.success) {
        await loadIntegrations();
        toast({
          title: t("integrations.sync.success") || "Sync Complete",
          description:
            t("integrations.sync.success.description") ||
            "Integration has been synced successfully",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to sync integration",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnectIntegration = async (integrationId: string) => {
    if (
      !confirm(
        t("integrations.disconnect.confirm") ||
          "Are you sure you want to disconnect this integration?",
      )
    ) {
      return;
    }

    try {
      const response = await fetch(`/api/integrations/${integrationId}`, {
        method: "DELETE",
      });

      const data = await response.json();
      if (data.success) {
        await loadIntegrations();
        toast({
          title: t("integrations.disconnected") || "Integration Disconnected",
          description:
            t("integrations.disconnected.description") ||
            "Integration has been disconnected",
        });
      }
    } catch (error: any) {
      toast({
        title: t("common.error") || "Error",
        description: error.message || "Failed to disconnect integration",
        variant: "destructive",
      });
    }
  };

  const teamsIntegration = integrations.find((i) => i.type === "teams");
  const slackIntegration = integrations.find((i) => i.type === "slack");

  return (
    <div className="h-full w-full overflow-y-auto p-6 space-y-6 bg-background">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            <Settings className="w-8 h-8 text-primary" />
            {t("integrations.title") || "Integrations"}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {t("integrations.description") ||
              "Connect with Teams, Slack, or create webhooks. All integrations are optional."}
          </p>
        </div>
      </div>

      <Alert>
        <Globe className="h-4 w-4" />
        <AlertDescription>
          {t("integrations.note.native") ||
            "Note: All native collaboration features work independently. Integrations are optional enhancements."}
        </AlertDescription>
      </Alert>

      {/* Microsoft Teams */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {t("integrations.teams") || "Microsoft Teams"}
              </CardTitle>
              <CardDescription>
                {t("integrations.teams.description") ||
                  "Connect with Microsoft Teams for notifications and calendar sync"}
              </CardDescription>
            </div>
            {teamsIntegration ? (
              <Badge
                variant={teamsIntegration.enabled ? "default" : "secondary"}
              >
                {teamsIntegration.enabled
                  ? t("integrations.status.connected") || "Connected"
                  : t("integrations.status.disconnected") || "Disconnected"}
              </Badge>
            ) : (
              <Button onClick={handleConnectTeams} size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("integrations.connect") || "Connect"}
              </Button>
            )}
          </div>
        </CardHeader>
        {teamsIntegration && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("integrations.enabled") || "Enabled"}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("integrations.enabled.description") ||
                    "Allow sending notifications to Teams"}
                </p>
              </div>
              <Switch
                checked={teamsIntegration.enabled}
                onCheckedChange={(checked) =>
                  handleToggleIntegration(teamsIntegration.id, checked)
                }
              />
            </div>
            {teamsIntegration.lastSync && (
              <div className="text-sm text-muted-foreground">
                {t("integrations.last.sync") || "Last sync"}:{" "}
                {format(new Date(teamsIntegration.lastSync), "PPpp")}
              </div>
            )}
            {teamsIntegration.syncStatus === "error" &&
              teamsIntegration.syncError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {t("integrations.sync.error") || "Sync error"}:{" "}
                    {teamsIntegration.syncError}
                  </AlertDescription>
                </Alert>
              )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSyncIntegration(teamsIntegration.id)}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
                />
                {t("integrations.sync") || "Sync Now"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDisconnectIntegration(teamsIntegration.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("integrations.disconnect") || "Disconnect"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Slack */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                {t("integrations.slack") || "Slack"}
              </CardTitle>
              <CardDescription>
                {t("integrations.slack.description") ||
                  "Connect with Slack for notifications and messaging"}
              </CardDescription>
            </div>
            {slackIntegration ? (
              <Badge
                variant={slackIntegration.enabled ? "default" : "secondary"}
              >
                {slackIntegration.enabled
                  ? t("integrations.status.connected") || "Connected"
                  : t("integrations.status.disconnected") || "Disconnected"}
              </Badge>
            ) : (
              <Button onClick={handleConnectSlack} size="sm">
                <ExternalLink className="w-4 h-4 mr-2" />
                {t("integrations.connect") || "Connect"}
              </Button>
            )}
          </div>
        </CardHeader>
        {slackIntegration && (
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <Label>{t("integrations.enabled") || "Enabled"}</Label>
                <p className="text-sm text-muted-foreground">
                  {t("integrations.enabled.description") ||
                    "Allow sending notifications to Slack"}
                </p>
              </div>
              <Switch
                checked={slackIntegration.enabled}
                onCheckedChange={(checked) =>
                  handleToggleIntegration(slackIntegration.id, checked)
                }
              />
            </div>
            {slackIntegration.lastSync && (
              <div className="text-sm text-muted-foreground">
                {t("integrations.last.sync") || "Last sync"}:{" "}
                {format(new Date(slackIntegration.lastSync), "PPpp")}
              </div>
            )}
            {slackIntegration.syncStatus === "error" &&
              slackIntegration.syncError && (
                <Alert variant="destructive">
                  <AlertDescription>
                    {t("integrations.sync.error") || "Sync error"}:{" "}
                    {slackIntegration.syncError}
                  </AlertDescription>
                </Alert>
              )}
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSyncIntegration(slackIntegration.id)}
                disabled={loading}
              >
                <RefreshCw
                  className={cn("w-4 h-4 mr-2", loading && "animate-spin")}
                />
                {t("integrations.sync") || "Sync Now"}
              </Button>
              <Button
                size="sm"
                variant="destructive"
                onClick={() => handleDisconnectIntegration(slackIntegration.id)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                {t("integrations.disconnect") || "Disconnect"}
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Webhooks */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Webhook className="w-5 h-5 text-primary" />
                {t("integrations.webhooks") || "Webhooks"}
              </CardTitle>
              <CardDescription>
                {t("integrations.webhooks.description") ||
                  "Create webhooks to receive real-time events"}
              </CardDescription>
            </div>
            <Button size="sm">
              <Plus className="w-4 h-4 mr-2" />
              {t("integrations.webhook.create") || "Create Webhook"}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {webhooks.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {t("integrations.webhooks.empty") || "No webhooks configured"}
            </div>
          ) : (
            <div className="space-y-3">
              {webhooks.map((webhook) => (
                <div
                  key={webhook.id}
                  className="flex items-center justify-between p-3 border border-border rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground">
                        {webhook.name}
                      </span>
                      <Badge
                        variant={webhook.enabled ? "default" : "secondary"}
                      >
                        {webhook.enabled
                          ? t("integrations.enabled") || "Enabled"
                          : t("integrations.disabled") || "Disabled"}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground truncate">
                      {webhook.url}
                    </p>
                    <p className="text-xs text-muted-foreground mt-1">
                      {webhook.events.length}{" "}
                      {t("integrations.webhook.event.count") || "event(s)"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {webhook.lastSuccess && (
                      <span className="text-xs text-muted-foreground">
                        {t("integrations.webhook.last.success") ||
                          "Last success"}
                        : {format(new Date(webhook.lastSuccess), "PPp")}
                      </span>
                    )}
                    <Button size="sm" variant="ghost">
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
