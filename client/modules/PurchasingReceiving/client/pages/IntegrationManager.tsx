import React, { useState, useMemo } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Zap,
  Check,
  AlertTriangle,
  Loader,
  Settings,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Plus,
  Eye,
  EyeOff,
} from "lucide-react";
import { AppLayout } from "@/components/AppLayout";
interface Integration {
  id: string;
  type: "accounting" | "erp" | "email";
  name: string;
  enabled: boolean;
  status: "connected" | "disconnected" | "error";
  lastSync?: Date;
  itemsSynced: number;
  metadata: Record<string, any>;
}
const mockIntegrations: Integration[] = [
  {
    id: "acc-1",
    type: "accounting",
    name: "QuickBooks Online",
    enabled: true,
    status: "connected",
    lastSync: new Date(Date.now() - 3600000),
    itemsSynced: 142,
    metadata: { accountId: "12345", syncInterval: "hourly", lastError: null },
  },
  {
    id: "erp-1",
    type: "erp",
    name: "NetSuite",
    enabled: true,
    status: "connected",
    lastSync: new Date(Date.now() - 7200000),
    itemsSynced: 89,
    metadata: { accountId: "67890", syncInterval: "daily", lastError: null },
  },
  {
    id: "email-1",
    type: "email",
    name: "SendGrid",
    enabled: true,
    status: "connected",
    lastSync: new Date(Date.now() - 600000),
    itemsSynced: 1250,
    metadata: {
      apiKey: "sg_****",
      fromAddress: "noreply@company.com",
      lastError: null,
    },
  },
];
export function IntegrationManagerPage() {
  const [integrations, setIntegrations] =
    useState<Integration[]>(mockIntegrations);
  const [selectedIntegration, setSelectedIntegration] =
    useState<Integration | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [testingConnection, setTestingConnection] = useState<string | null>(
    null,
  );
  const [syncing, setSyncing] = useState(false);
  const [showApiKeys, setShowApiKeys] = useState<Set<string>>(new Set());
  const accountingIntegrations = useMemo(
    () => integrations.filter((i) => i.type === "accounting"),
    [integrations],
  );
  const erpIntegrations = useMemo(
    () => integrations.filter((i) => i.type === "erp"),
    [integrations],
  );
  const emailIntegrations = useMemo(
    () => integrations.filter((i) => i.type === "email"),
    [integrations],
  );
  const handleToggleIntegration = (id: string) => {
    setIntegrations(
      integrations.map((i) =>
        i.id === id ? { ...i, enabled: !i.enabled } : i,
      ),
    );
  };
  const handleTestConnection = async (id: string) => {
    setTestingConnection(id); // Simulate connection test await new Promise((resolve) => setTimeout(resolve, 1500)); setIntegrations( integrations.map((i) => i.id === id ? { ...i, status:"connected" as const } : i, ), ); setTestingConnection(null); }; const handleSyncAll = async () => { setSyncing(true); // Simulate sync await new Promise((resolve) => setTimeout(resolve, 2000)); setIntegrations( integrations.map((i) => ({ ...i, lastSync: new Date(), itemsSynced: Math.floor(Math.random() * 200) + 50, })), ); setSyncing(false); }; const handleDeleteIntegration = (id: string) => { setIntegrations(integrations.filter((i) => i.id !== id)); }; const toggleApiKeyVisibility = (id: string) => { setShowApiKeys((prev) => { const next = new Set(prev); if (next.has(id)) { next.delete(id); } else { next.add(id); } return next; }); }; return ( <AppLayout> <div className="space-y-6 pb-6"> <div> <h1 className="text-3xl font-bold tracking-tight">Integrations</h1> <p className="text-muted-foreground mt-2"> Connect and manage integrations with accounting, ERP, and notification systems </p> </div> {/* Sync All Button */} <div className="flex gap-2"> <Button onClick={handleSyncAll} disabled={syncing} className="gap-2"> {syncing ? ( <Loader className="w-4 h-4 animate-spin" /> ) : ( <Zap className="w-4 h-4" /> )} {syncing ?"Syncing..." :"Sync All Integrations"} </Button> <Dialog> <DialogTrigger asChild> <Button variant="outline" className="gap-2"> <Plus className="w-4 h-4" /> Add Integration </Button> </DialogTrigger> <DialogContent> <DialogHeader> <DialogTitle>Add New Integration</DialogTitle> <DialogDescription> Choose an integration type to connect </DialogDescription> </DialogHeader> <div className="space-y-4 py-4"> <div> <Label>Integration Type</Label> <Select> <SelectTrigger> <SelectValue placeholder="Select type" /> </SelectTrigger> <SelectContent> <SelectItem value="accounting"> Accounting Software </SelectItem> <SelectItem value="erp">ERP System</SelectItem> <SelectItem value="email">Email Service</SelectItem> </SelectContent> </Select> </div> <div> <Label>Provider</Label> <Select> <SelectTrigger> <SelectValue placeholder="Select provider" /> </SelectTrigger> <SelectContent> <SelectItem value="quickbooks"> QuickBooks Online </SelectItem> <SelectItem value="xero">Xero</SelectItem> <SelectItem value="netsuite">NetSuite</SelectItem> <SelectItem value="sap">SAP</SelectItem> <SelectItem value="sendgrid">SendGrid</SelectItem> </SelectContent> </Select> </div> <div className="flex gap-2 justify-end"> <Button variant="outline">Cancel</Button> <Button>Connect</Button> </div> </div> </DialogContent> </Dialog> </div> <Tabs defaultValue="accounting" className="space-y-4"> <TabsList> <TabsTrigger value="accounting"> Accounting ({accountingIntegrations.length}) </TabsTrigger> <TabsTrigger value="erp">ERP ({erpIntegrations.length})</TabsTrigger> <TabsTrigger value="email"> Email ({emailIntegrations.length}) </TabsTrigger> </TabsList> {/* Accounting Integrations */} <TabsContent value="accounting" className="space-y-4"> {accountingIntegrations.length === 0 ? ( <Card> <CardContent className="pt-6 text-center"> <p className="text-muted-foreground mb-4"> No accounting integrations connected </p> <Button variant="outline">Connect QuickBooks</Button> </CardContent> </Card> ) : ( accountingIntegrations.map((integration) => ( <IntegrationCard key={integration.id} integration={integration} onToggle={handleToggleIntegration} onTest={handleTestConnection} onDelete={handleDeleteIntegration} isTestingConnection={testingConnection === integration.id} showApiKey={showApiKeys.has(integration.id)} onToggleApiKey={toggleApiKeyVisibility} /> )) )} </TabsContent> {/* ERP Integrations */} <TabsContent value="erp" className="space-y-4"> {erpIntegrations.length === 0 ? ( <Card> <CardContent className="pt-6 text-center"> <p className="text-muted-foreground mb-4"> No ERP integrations connected </p> <Button variant="outline">Connect NetSuite</Button> </CardContent> </Card> ) : ( erpIntegrations.map((integration) => ( <IntegrationCard key={integration.id} integration={integration} onToggle={handleToggleIntegration} onTest={handleTestConnection} onDelete={handleDeleteIntegration} isTestingConnection={testingConnection === integration.id} showApiKey={showApiKeys.has(integration.id)} onToggleApiKey={toggleApiKeyVisibility} /> )) )} </TabsContent> {/* Email Integrations */} <TabsContent value="email" className="space-y-4"> {emailIntegrations.length === 0 ? ( <Card> <CardContent className="pt-6 text-center"> <p className="text-muted-foreground mb-4"> No email services connected </p> <Button variant="outline">Connect SendGrid</Button> </CardContent> </Card> ) : ( emailIntegrations.map((integration) => ( <IntegrationCard key={integration.id} integration={integration} onToggle={handleToggleIntegration} onTest={handleTestConnection} onDelete={handleDeleteIntegration} isTestingConnection={testingConnection === integration.id} showApiKey={showApiKeys.has(integration.id)} onToggleApiKey={toggleApiKeyVisibility} /> )) )} </TabsContent> </Tabs> {/* Integration Documentation */} <Card> <CardHeader> <CardTitle>Integration Setup Guide</CardTitle> <CardDescription> Step-by-step instructions for setting up integrations </CardDescription> </CardHeader> <CardContent className="space-y-6"> <div> <h3 className="font-semibold mb-2">QuickBooks Online</h3> <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside"> <li>Go to QuickBooks settings</li> <li>Create an OAuth app</li> <li>Copy your Client ID and Secret</li> <li>Paste credentials in the form above</li> <li>Click"Test Connection"</li> </ol> </div> <div> <h3 className="font-semibold mb-2">NetSuite</h3> <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside"> <li>Enable Web Services in NetSuite</li> <li>Create an integration record</li> <li>Generate authentication token</li> <li>Enter Account ID and API credentials</li> <li>Test the connection</li> </ol> </div> <div> <h3 className="font-semibold mb-2">SendGrid</h3> <ol className="text-sm space-y-2 text-muted-foreground list-decimal list-inside"> <li>Create SendGrid account</li> <li>Generate API Key</li> <li>Enter API Key and sender address</li> <li>Configure email templates</li> <li>Test email sending</li> </ol> </div> </CardContent> </Card> </div> </AppLayout> );
  };
}
function IntegrationCard({
  integration,
  onToggle,
  onTest,
  onDelete,
  isTestingConnection,
  showApiKey,
  onToggleApiKey,
}: {
  integration: Integration;
  onToggle: (id: string) => void;
  onTest: (id: string) => void;
  onDelete: (id: string) => void;
  isTestingConnection: boolean;
  showApiKey: boolean;
  onToggleApiKey: (id: string) => void;
}) {
  return (
    <Card>
      {" "}
      <CardContent className="pt-6">
        {" "}
        <div className="flex items-start justify-between gap-4">
          {" "}
          <div className="flex-1">
            {" "}
            <div className="flex items-center gap-3 mb-3">
              {" "}
              <h3 className="text-lg font-semibold">{integration.name}</h3>{" "}
              <Badge
                variant={
                  integration.status === "connected" ? "default" : "secondary"
                }
              >
                {" "}
                {integration.status === "connected" ? (
                  <Check className="w-3 h-3 mr-1" />
                ) : integration.status === "error" ? (
                  <AlertTriangle className="w-3 h-3 mr-1" />
                ) : null}{" "}
                {integration.status.charAt(0).toUpperCase() +
                  integration.status.slice(1)}{" "}
              </Badge>{" "}
            </div>{" "}
            {integration.lastSync && (
              <p className="text-sm text-muted-foreground mb-4">
                {" "}
                Last synced: {integration.lastSync.toLocaleString()} ({" "}
                {integration.itemsSynced} items){" "}
              </p>
            )}{" "}
            {Object.entries(integration.metadata).map(([key, value]) => {
              if (key === "lastError" && !value) return null;
              if (
                key === "apiKey" ||
                key.includes("key") ||
                key.includes("secret")
              ) {
                return (
                  <div
                    key={key}
                    className="flex items-center gap-2 text-sm mb-2"
                  >
                    {" "}
                    <span className="text-muted-foreground capitalize">
                      {" "}
                      {key}:{" "}
                    </span>{" "}
                    {showApiKey ? (
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {" "}
                        {value}{" "}
                      </code>
                    ) : (
                      <code className="bg-muted px-2 py-1 rounded text-xs">
                        {" "}
                        ••••••••{" "}
                      </code>
                    )}{" "}
                    <button
                      onClick={() => onToggleApiKey(integration.id)}
                      className="text-muted-foreground hover:text-foreground"
                    >
                      {" "}
                      {showApiKey ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}{" "}
                    </button>{" "}
                  </div>
                );
              }
              return (
                <div key={key} className="text-sm text-muted-foreground mb-2">
                  {" "}
                  <span className="capitalize">{key}:</span>{" "}
                  {String(value)}{" "}
                </div>
              );
            })}{" "}
          </div>{" "}
          <div className="flex flex-col gap-2">
            {" "}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onToggle(integration.id)}
              className="gap-2"
            >
              {" "}
              {integration.enabled ? (
                <>
                  {" "}
                  <ToggleRight className="w-4 h-4" /> Enabled{" "}
                </>
              ) : (
                <>
                  {" "}
                  <ToggleLeft className="w-4 h-4" /> Disabled{" "}
                </>
              )}{" "}
            </Button>{" "}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onTest(integration.id)}
              disabled={isTestingConnection}
              className="gap-2"
            >
              {" "}
              {isTestingConnection ? (
                <>
                  {" "}
                  <Loader className="w-4 h-4 animate-spin" /> Testing...{" "}
                </>
              ) : (
                <>
                  {" "}
                  <Zap className="w-4 h-4" /> Test{" "}
                </>
              )}{" "}
            </Button>{" "}
            <Button
              variant="outline"
              size="sm"
              onClick={() => onDelete(integration.id)}
              className="gap-2 text-red-600 hover:text-red-700"
            >
              {" "}
              <Trash2 className="w-4 h-4" /> Remove{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
}
export default IntegrationManagerPage;
