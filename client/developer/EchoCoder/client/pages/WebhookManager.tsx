import { useState, useEffect } from "react";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import {
  CheckCircle2,
  AlertCircle,
  Webhook,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Copy,
  Power,
  Zap,
  Clock,
  Activity,
} from "lucide-react";
import { getWebhookService } from "@/services/webhookService";
import { getAnalyticsService } from "@/services/analyticsService";
import { toast } from "@/hooks/use-toast";

interface WebhookData {
  id: string;
  name: string;
  url: string;
  events: string[];
  secret: string;
  isActive: boolean;
  createdAt: string;
}

interface EventLog {
  id: string;
  webhookId: string;
  event: string;
  status: "success" | "failed";
  timestamp: string;
  responseTime: number;
}

export default function WebhookManager() {
  const webhookService = getWebhookService();
  const analytics = getAnalyticsService();

  const [webhooks, setWebhooks] = useState<WebhookData[]>([]);
  const [eventLog, setEventLog] = useState<EventLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewWebhook, setShowNewWebhook] = useState(false);
  const [newWebhookName, setNewWebhookName] = useState("");
  const [newWebhookUrl, setNewWebhookUrl] = useState("");
  const [selectedEvents, setSelectedEvents] = useState<string[]>([]);
  const [showSecrets, setShowSecrets] = useState<Set<string>>(new Set());
  const [activeTab, setActiveTab] = useState("webhooks");
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  useEffect(() => {
    loadWebhooks();
    loadEventLog();

    const interval = setInterval(() => {
      loadEventLog();
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const loadWebhooks = async () => {
    setLoading(true);
    try {
      const data = await webhookService.listWebhooks();
      setWebhooks(data || []);
      analytics.trackModuleEvent({
        module_name: "WebhookManager",
        action: "view",
        status: "success",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadEventLog = async () => {
    try {
      const logs = await webhookService.getEventLog();
      setEventLog(logs || []);
    } catch (error) {
      console.error("Failed to load event log:", error);
    }
  };

  const handleAddWebhook = async () => {
    if (!newWebhookName || !newWebhookUrl) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    try {
      const webhook = await webhookService.createWebhook({
        name: newWebhookName,
        url: newWebhookUrl,
        events: selectedEvents,
      });

      setWebhooks([...webhooks, webhook]);
      setNewWebhookName("");
      setNewWebhookUrl("");
      setSelectedEvents([]);
      setShowNewWebhook(false);

      toast({
        title: "Success",
        description: "Webhook created successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create webhook",
        variant: "destructive",
      });
    }
  };

  const handleDeleteWebhook = async (id: string) => {
    try {
      await webhookService.deleteWebhook(id);
      setWebhooks(webhooks.filter((w) => w.id !== id));
      toast({
        title: "Success",
        description: "Webhook deleted",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete webhook",
        variant: "destructive",
      });
    }
  };

  const handleToggleWebhook = async (id: string) => {
    try {
      const webhook = webhooks.find((w) => w.id === id);
      if (webhook) {
        await webhookService.updateWebhook(id, {
          isActive: !webhook.isActive,
        });
        setWebhooks(
          webhooks.map((w) => (w.id === id ? { ...w, isActive: !w.isActive } : w))
        );
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update webhook",
        variant: "destructive",
      });
    }
  };

  const handleCopySecret = (secret: string) => {
    navigator.clipboard.writeText(secret);
    toast({
      title: "Success",
      description: "Secret copied to clipboard",
    });
  };

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Webhook className="h-6 w-6 sm:h-8 sm:w-8" />
              <span>Webhook Manager</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-2">
              Manage webhooks and monitor events
            </p>
          </div>
          <Button
            onClick={() => setShowNewWebhook(!showNewWebhook)}
            size={isMobile ? "sm" : "default"}
            className="w-full sm:w-auto text-xs sm:text-sm"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Webhook
          </Button>
        </div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className={`grid w-full gap-1 ${
            isMobile ? "grid-cols-2" : "grid-cols-2"
          }`}>
            <TabsTrigger value="webhooks" className="text-xs sm:text-sm">
              Webhooks ({webhooks.length})
            </TabsTrigger>
            <TabsTrigger value="events" className="text-xs sm:text-sm">
              Events ({eventLog.length})
            </TabsTrigger>
          </TabsList>

          {/* Webhooks Tab */}
          <TabsContent value="webhooks" className="space-y-4 sm:space-y-6 mt-4 sm:mt-6">
            {/* New Webhook Form */}
            {showNewWebhook && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Create New Webhook</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <Input
                    placeholder="Webhook name"
                    value={newWebhookName}
                    onChange={(e) => setNewWebhookName(e.target.value)}
                    className="text-xs sm:text-sm"
                  />
                  <Input
                    placeholder="https://example.com/webhook"
                    value={newWebhookUrl}
                    onChange={(e) => setNewWebhookUrl(e.target.value)}
                    className="text-xs sm:text-sm"
                  />
                  <div className="flex gap-2">
                    <Button
                      onClick={handleAddWebhook}
                      className="flex-1 text-xs sm:text-sm"
                      size={isMobile ? "sm" : "default"}
                    >
                      Create
                    </Button>
                    <Button
                      onClick={() => setShowNewWebhook(false)}
                      variant="outline"
                      className="flex-1 text-xs sm:text-sm"
                      size={isMobile ? "sm" : "default"}
                    >
                      Cancel
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Webhooks List */}
            <ResponsiveGrid cols={{ xs: 1, sm: 1, md: 1, lg: 1 }} gap="md">
              {webhooks.length === 0 ? (
                <Card className="p-6 sm:p-8 text-center">
                  <Webhook className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">No webhooks yet</p>
                </Card>
              ) : (
                webhooks.map((webhook) => (
                  <Card key={webhook.id} className="hover:border-primary/50 transition">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between gap-2 flex-wrap">
                        <div className="min-w-0 flex-1">
                          <CardTitle className="text-base sm:text-lg line-clamp-1">
                            {webhook.name}
                          </CardTitle>
                          <CardDescription className="text-xs sm:text-sm mt-1 line-clamp-1">
                            {webhook.url}
                          </CardDescription>
                        </div>
                        <Button
                          variant={webhook.isActive ? "default" : "outline"}
                          size="sm"
                          onClick={() => handleToggleWebhook(webhook.id)}
                          className="text-xs"
                        >
                          <Power className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {/* Secret Display */}
                      <div className="p-2 sm:p-3 bg-muted rounded text-xs font-mono flex items-center justify-between gap-2">
                        <span className="truncate">
                          {showSecrets.has(webhook.id)
                            ? webhook.secret
                            : "•".repeat(16)}
                        </span>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            const newSet = new Set(showSecrets);
                            if (newSet.has(webhook.id)) {
                              newSet.delete(webhook.id);
                            } else {
                              newSet.add(webhook.id);
                            }
                            setShowSecrets(newSet);
                          }}
                          className="h-6 w-6 p-0"
                        >
                          {showSecrets.has(webhook.id) ? (
                            <EyeOff className="h-3 w-3" />
                          ) : (
                            <Eye className="h-3 w-3" />
                          )}
                        </Button>
                      </div>

                      {/* Actions */}
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleCopySecret(webhook.secret)}
                          className="flex-1 text-xs h-8"
                        >
                          <Copy className="h-3 w-3" />
                          <span className="hidden sm:inline ml-1">Copy Secret</span>
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteWebhook(webhook.id)}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </ResponsiveGrid>
          </TabsContent>

          {/* Events Tab */}
          <TabsContent value="events" className="space-y-3 mt-4 sm:mt-6">
            {eventLog.length === 0 ? (
              <Card className="p-6 sm:p-8 text-center">
                <Activity className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No events yet</p>
              </Card>
            ) : (
              eventLog.slice(0, 20).map((event) => (
                <Card key={event.id} className="p-3 sm:p-4">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {event.status === "success" ? (
                          <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
                        )}
                        <p className="text-xs sm:text-sm font-medium">{event.event}</p>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">
                        {event.responseTime}ms • {new Date(event.timestamp).toLocaleString()}
                      </p>
                    </div>
                    <Badge
                      variant={event.status === "success" ? "default" : "destructive"}
                      className="text-xs flex-shrink-0"
                    >
                      {event.status}
                    </Badge>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>
        </Tabs>
      </div>
    </ResponsiveContainer>
  );
}
