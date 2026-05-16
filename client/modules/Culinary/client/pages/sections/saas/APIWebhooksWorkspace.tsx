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
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Copy, Eye, EyeOff, Plus, Trash2, Code, Zap } from "lucide-react";
import { supabase } from "@/lib/auth-service";
import { toast } from "sonner";

interface APIKey {
  id: string;
  name: string;
  key: string;
  masked_key: string;
  created_at: string;
  last_used?: string;
  scopes: string[];
}

interface Webhook {
  id: string;
  name: string;
  url: string;
  events: string[];
  active: boolean;
  created_at: string;
  last_triggered?: string;
}

interface ZapierIntegration {
  id: string;
  name: string;
  status: "active" | "disconnected" | "error";
  triggers: string[];
  actions: string[];
  connected_at?: string;
}

export default function APIWebhooksWorkspace() {
  const [apiKeys, setApiKeys] = useState<APIKey[]>([]);
  const [webhooks, setWebhooks] = useState<Webhook[]>([]);
  const [zapierApps, setZapierApps] = useState<ZapierIntegration[]>([]);
  const [loading, setLoading] = useState(false);
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false);
  const [newKeyName, setNewKeyName] = useState("");
  const [visibleKeys, setVisibleKeys] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!supabase) {
      toast.error("Supabase not configured");
      return;
    }
    fetchData();
  }, []);

  const fetchData = async () => {
    if (!supabase) return;
    setLoading(true);
    try {
      const [keysData, webhooksData, zapierData] = await Promise.all([
        supabase
          .from("api_keys")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase
          .from("webhooks")
          .select("*")
          .order("created_at", { ascending: false }),
        supabase.from("zapier_integrations").select("*"),
      ]);

      setApiKeys(keysData.data || []);
      setWebhooks(webhooksData.data || []);
      setZapierApps(zapierData.data || []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to fetch data",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCreateApiKey = async () => {
    if (!supabase || !newKeyName.trim()) {
      toast.error("Please enter a key name");
      return;
    }

    setLoading(true);
    try {
      const keyValue = generateApiKey();
      const { data, error } = await supabase
        .from("api_keys")
        .insert({
          name: newKeyName,
          key: keyValue,
          masked_key: keyValue.slice(0, 8) + "..." + keyValue.slice(-4),
          scopes: ["read", "write"],
        })
        .select()
        .single();

      if (error) throw error;
      setApiKeys([data, ...apiKeys]);
      setNewKeyName("");
      setShowNewKeyDialog(false);
      toast.success("API key created successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to create API key",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteApiKey = async (keyId: string) => {
    if (!supabase) return;
    if (!confirm("Are you sure? This cannot be undone.")) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from("api_keys")
        .delete()
        .eq("id", keyId);

      if (error) throw error;
      setApiKeys(apiKeys.filter((k) => k.id !== keyId));
      toast.success("API key deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete API key",
      );
    } finally {
      setLoading(false);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success("Copied to clipboard");
  };

  const toggleKeyVisibility = (keyId: string) => {
    const newVisible = new Set(visibleKeys);
    if (newVisible.has(keyId)) {
      newVisible.delete(keyId);
    } else {
      newVisible.add(keyId);
    }
    setVisibleKeys(newVisible);
  };

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight">
          API & Integrations
        </h2>
        <p className="text-sm text-muted-foreground">
          Manage API keys, webhooks, and third-party integrations
        </p>
      </div>

      <Tabs defaultValue="api-keys" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="api-keys" className="flex items-center gap-2">
            <Code className="h-4 w-4" />
            API Keys
          </TabsTrigger>
          <TabsTrigger value="webhooks" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Webhooks
          </TabsTrigger>
          <TabsTrigger value="zapier" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Zapier
          </TabsTrigger>
        </TabsList>

        <TabsContent value="api-keys" className="space-y-4">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-semibold">API Keys</h3>
            <Button onClick={() => setShowNewKeyDialog(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Generate Key
            </Button>
          </div>

          <div className="space-y-2">
            {apiKeys.length === 0 ? (
              <Card>
                <CardContent className="pt-6 text-center text-muted-foreground">
                  No API keys created yet
                </CardContent>
              </Card>
            ) : (
              apiKeys.map((key) => (
                <Card key={key.id}>
                  <CardContent className="pt-6 space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold">{key.name}</p>
                        <p className="text-sm text-muted-foreground">
                          Created{" "}
                          {new Date(key.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteApiKey(key.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    <div className="bg-muted p-3 rounded-lg flex items-center justify-between font-mono text-sm">
                      <span>
                        {visibleKeys.has(key.id) ? key.key : key.masked_key}
                      </span>
                      <div className="flex gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleKeyVisibility(key.id)}
                        >
                          {visibleKeys.has(key.id) ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleCopyKey(key.key)}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {key.scopes.map((scope) => (
                        <Badge key={scope} variant="secondary">
                          {scope}
                        </Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>

          {showNewKeyDialog && (
            <Card className="border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950 p-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Key Name</Label>
                  <Input
                    placeholder="My Integration"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleCreateApiKey} disabled={loading}>
                    {loading ? "Creating..." : "Create Key"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setShowNewKeyDialog(false)}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="webhooks" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Webhooks</CardTitle>
              <CardDescription>
                {webhooks.length} webhook{webhooks.length !== 1 ? "s" : ""}{" "}
                configured
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {webhooks.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No webhooks configured. Add a webhook to receive real-time
                  notifications.
                </p>
              ) : (
                webhooks.map((webhook) => (
                  <Card
                    key={webhook.id}
                    className="border-l-4 border-l-blue-500"
                  >
                    <CardContent className="pt-6 space-y-2">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold">{webhook.name}</p>
                          <p className="text-sm font-mono text-muted-foreground break-all">
                            {webhook.url}
                          </p>
                        </div>
                        <Badge
                          className={
                            webhook.active
                              ? "bg-green-100 text-green-800 dark:bg-green-900"
                              : ""
                          }
                        >
                          {webhook.active ? "Active" : "Inactive"}
                        </Badge>
                      </div>
                      <div className="flex gap-2 flex-wrap">
                        {webhook.events.map((event) => (
                          <Badge key={event} variant="secondary">
                            {event}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
              <Button className="w-full gap-2">
                <Plus className="h-4 w-4" />
                Add Webhook
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="zapier" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Zapier Integration</CardTitle>
              <CardDescription>
                Connect your recipes to thousands of apps via Zapier
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {zapierApps.length === 0 ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    No Zapier apps connected yet. Connect your first app to get
                    started.
                  </p>
                  <Button className="gap-2">
                    <Zap className="h-4 w-4" />
                    Connect to Zapier
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  {zapierApps.map((app) => (
                    <Card
                      key={app.id}
                      className="border-l-4 border-l-orange-500"
                    >
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <div>
                            <p className="font-semibold">{app.name}</p>
                            {app.connected_at && (
                              <p className="text-xs text-muted-foreground">
                                Connected{" "}
                                {new Date(
                                  app.connected_at,
                                ).toLocaleDateString()}
                              </p>
                            )}
                          </div>
                          <Badge
                            className={
                              app.status === "active"
                                ? "bg-green-100 text-green-800 dark:bg-green-900"
                                : app.status === "error"
                                  ? "bg-red-100 text-red-800 dark:bg-red-900"
                                  : ""
                            }
                          >
                            {app.status}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground">
                              Triggers
                            </p>
                            <div className="flex gap-2 flex-wrap mt-1">
                              {app.triggers.map((trigger) => (
                                <Badge key={trigger} variant="secondary">
                                  {trigger}
                                </Badge>
                              ))}
                            </div>
                          </div>
                          <div>
                            <p className="text-sm font-semibold text-muted-foreground">
                              Actions
                            </p>
                            <div className="flex gap-2 flex-wrap mt-1">
                              {app.actions.map((action) => (
                                <Badge key={action} variant="secondary">
                                  {action}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function generateApiKey(): string {
  const prefix = "sk";
  const chars =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = prefix + "_";
  for (let i = 0; i < 32; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}
