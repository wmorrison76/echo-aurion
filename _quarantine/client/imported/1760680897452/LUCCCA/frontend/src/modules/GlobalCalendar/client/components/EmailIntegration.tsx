// src/modules/crm/client/components/EmailIntegration.tsx
import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Mail,
  Send,
  Settings,
  Clock,
  CheckCircle,
  XCircle,
  Eye,
  Calendar,
  MoreVertical,
  Plus,
  Edit,
  Trash2,
  Copy,
  Download,
  RefreshCw,
  TrendingUp,
  BarChart3,
  FileText,
  Link as LinkIcon,
  Wifi,
  WifiOff,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ❗ Type-only import with alias to avoid runtime binding & name collision
import type {
  EmailTemplate,
  EmailIntegration as EmailIntegrationModel,
} from "@shared/sales-pipeline-types";

/* ------------------------------------------------------------------ */
/* Mock data (safe to replace with real data/hooks later)              */
/* ------------------------------------------------------------------ */

const mockEmailIntegrations: EmailIntegrationModel[] = [
  {
    id: "outlook-1",
    provider: "outlook",
    email: "william.morrison@company.com",
    isConnected: true,
    lastSync: new Date(Date.now() - 15 * 60 * 1000),
    settings: {
      autoSync: true,
      syncInterval: 15,
      trackOpens: true,
      trackClicks: true,
      syncSentItems: true,
      syncCalendar: true,
    },
    credentials: {
      accessToken: "encrypted_token",
      refreshToken: "encrypted_refresh",
      expiresAt: new Date(Date.now() + 60 * 60 * 1000),
    },
  },
  {
    id: "gmail-1",
    provider: "gmail",
    email: "sales@hospitality.com",
    isConnected: false,
    settings: {
      autoSync: false,
      syncInterval: 30,
      trackOpens: false,
      trackClicks: false,
      syncSentItems: false,
      syncCalendar: false,
    },
    credentials: {},
  },
];

const mockEmailTemplates: EmailTemplate[] = [
  {
    id: "cold-outreach-1",
    name: "Corporate Event Cold Outreach",
    subject: "Exceptional Venue for Your Upcoming {{eventType}}",
    body: `Hi {{firstName}},

I hope this email finds you well. I came across {{companyName}} and noticed you might be planning corporate events.

Our venue specializes in {{eventType}} events and has helped companies like {{similarClient}} create memorable experiences for their teams.

Key highlights:
• Capacity for {{guestCount}} guests
• State-of-the-art AV equipment
• Award-winning catering team
• Dedicated event coordinator

Would you be interested in a brief 15-minute call to discuss your upcoming event needs?

Best regards,
{{senderName}}
{{senderTitle}}
{{companyName}}
{{phone}} | {{email}}`,
    type: "cold_outreach",
    variables: [
      "firstName",
      "companyName",
      "eventType",
      "similarClient",
      "guestCount",
      "senderName",
      "senderTitle",
      "phone",
      "email",
    ],
    isActive: true,
    createdBy: "William Morrison",
    createdAt: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    usageCount: 45,
    successRate: 18.2,
  },
  {
    id: "follow-up-1",
    name: "Proposal Follow-up",
    subject: "Following up on your {{eventType}} proposal",
    body: `Hi {{firstName}},

I wanted to follow up on the proposal I sent for your {{eventType}} on {{eventDate}}.

I'm here to answer any questions you might have about:
• Venue layout and capacity
• Catering options and pricing
• AV equipment and technical setup
• Parking and accessibility

The proposed package includes everything needed for a successful event at {{venue}} for {{guestCount}} guests.

When would be a good time for a quick call to discuss any questions?

Best regards,
{{senderName}}`,
    type: "follow_up",
    variables: ["firstName", "eventType", "eventDate", "venue", "guestCount", "senderName"],
    isActive: true,
    createdBy: "William Morrison",
    createdAt: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000),
    usageCount: 78,
    successRate: 24.8,
  },
  {
    id: "wedding-1",
    name: "Wedding Venue Inquiry Response",
    subject: "Your Dream Wedding at {{venue}}",
    body: `Dear {{firstName}} and {{partnerName}},

Thank you for considering {{venue}} for your special day on {{weddingDate}}.

I'm thrilled to help you create the perfect wedding celebration. Our venue offers:

🌹 Stunning {{spaceType}} with {{capacity}} guest capacity
🍾 Award-winning catering with customizable menus
📸 Picturesque photo locations throughout the property
💃 Professional event coordination from planning to execution

I've attached our wedding package information and would love to schedule a private tour so you can envision your perfect day.

Are you available for a tour this {{suggestedDay}}?

Congratulations on your engagement!

Warmly,
{{senderName}}
{{title}}
{{venue}}`,
    type: "proposal",
    variables: [
      "firstName",
      "partnerName",
      "venue",
      "weddingDate",
      "spaceType",
      "capacity",
      "suggestedDay",
      "senderName",
      "title",
    ],
    isActive: true,
    createdBy: "Sarah Wilson",
    createdAt: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
    usageCount: 23,
    successRate: 42.1,
  },
];

const mockEmailCampaigns = [
  {
    id: "campaign-1",
    name: "Q4 Corporate Events",
    template: "Corporate Event Cold Outreach",
    recipients: 156,
    sent: 156,
    opened: 89,
    clicked: 24,
    replied: 12,
    bounced: 3,
    status: "completed",
    sentDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  },
  {
    id: "campaign-2",
    name: "Wedding Follow-ups",
    template: "Wedding Venue Inquiry Response",
    recipients: 45,
    sent: 45,
    opened: 31,
    clicked: 18,
    replied: 8,
    bounced: 1,
    status: "completed",
    sentDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
  },
  {
    id: "campaign-3",
    name: "Proposal Follow-ups",
    template: "Proposal Follow-up",
    recipients: 23,
    sent: 12,
    opened: 8,
    clicked: 3,
    replied: 2,
    bounced: 0,
    status: "sending",
    sentDate: new Date(),
  },
];

/* ------------------------------------------------------------------ */

interface EmailIntegrationProps {
  className?: string;
}

export default function EmailIntegration({ className }: EmailIntegrationProps) {
  const [integrations, setIntegrations] = useState<EmailIntegrationModel[]>(mockEmailIntegrations);
  const [templates, setTemplates] = useState<EmailTemplate[]>(mockEmailTemplates);
  const [isTemplateDialogOpen, setIsTemplateDialogOpen] = useState(false);
  const [isIntegrationDialogOpen, setIsIntegrationDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<EmailTemplate | null>(null);
  const [activeTab, setActiveTab] = useState("overview");
  const [isConnecting, setIsConnecting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<"checking" | "success" | "error" | null>(null);

  const connectedIntegrations = useMemo(
    () => integrations.filter((integration) => integration.isConnected),
    [integrations]
  );

  const totalEmailsSent = useMemo(
    () => templates.reduce((sum, template) => sum + template.usageCount, 0),
    [templates]
  );

  const averageSuccessRate = useMemo(() => {
    const total = templates.reduce((sum, template) => sum + template.successRate, 0);
    return templates.length > 0 ? Math.round(total / templates.length) : 0;
  }, [templates]);

  const handleConnectEmailProvider = async (provider: "gmail" | "outlook" | "yahoo" | "exchange") => {
    setIsConnecting(true);
    setConnectionStatus("checking");

    try {
      // Simulate OAuth flow
      await new Promise((resolve) => setTimeout(resolve, 2000));

      // Update integration status
      setIntegrations((prev) =>
        prev.map((integration) =>
          integration.provider === provider
            ? {
                ...integration,
                isConnected: true,
                lastSync: new Date(),
                credentials: {
                  accessToken: "oauth_token_" + Date.now(),
                  refreshToken: "refresh_token_" + Date.now(),
                  expiresAt: new Date(Date.now() + 60 * 60 * 1000),
                },
              }
            : integration
        )
      );

      setConnectionStatus("success");
      setTimeout(() => setConnectionStatus(null), 3000);
    } catch (error) {
      setConnectionStatus("error");
      setTimeout(() => setConnectionStatus(null), 3000);
    } finally {
      setIsConnecting(false);
    }
  };

  const handleDisconnectProvider = (integrationId: string) => {
    setIntegrations((prev) =>
      prev.map((integration) =>
        integration.id === integrationId
          ? {
              ...integration,
              isConnected: false,
              credentials: {},
            }
          : integration
      )
    );
  };

  const handleSyncEmails = async (integrationId: string) => {
    const integration = integrations.find((i) => i.id === integrationId);
    if (!integration?.isConnected) return;

    setIntegrations((prev) =>
      prev.map((i) => (i.id === integrationId ? { ...i, lastSync: new Date() } : i))
    );
  };

  const getProviderIcon = (provider: string) => {
    switch (provider) {
      case "outlook":
        return "📧";
      case "gmail":
        return "📬";
      case "exchange":
        return "💼";
      default:
        return "📨";
    }
  };

  const getProviderColor = (provider: string) => {
    switch (provider) {
      case "outlook":
        return "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300";
      case "gmail":
        return "bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-300";
      case "exchange":
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300";
      default:
        return "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300";
    }
  };

  const getTemplateTypeIcon = (type: string) => {
    switch (type) {
      case "cold_outreach":
        return TargetIcon;
      case "follow_up":
        return Clock;
      case "proposal":
        return FileText;
      case "meeting_request":
        return Calendar;
      case "thank_you":
        return CheckCircle;
      case "objection_handling":
        return ShieldIcon;
      default:
        return Mail;
    }
  };

  // Aliases for any icons we renamed to avoid name clashes with HTML <link> etc.
  function TargetIcon(props: React.ComponentProps<typeof BarChart3>) {
    return <BarChart3 {...props} />;
  }
  function ShieldIcon(props: React.ComponentProps<typeof CheckCircle>) {
    // simple reuse—swap if you prefer a different visual
    return <CheckCircle {...props} />;
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Connection Status Notification */}
      {connectionStatus && (
        <div
          className={cn(
            "p-4 rounded-lg border animate-in slide-in-from-top-3 duration-300",
            connectionStatus === "success"
              ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-800 dark:text-green-200"
              : connectionStatus === "error"
              ? "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-800 dark:text-red-200"
              : "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/20 dark:border-blue-800 dark:text-blue-200"
          )}
        >
          <div className="flex items-center space-x-2">
            {connectionStatus === "checking" && <RefreshCw className="h-4 w-4 animate-spin" />}
            {connectionStatus === "success" && <CheckCircle className="h-4 w-4" />}
            {connectionStatus === "error" && <XCircle className="h-4 w-4" />}
            <span className="font-medium">
              {connectionStatus === "checking" && "Connecting to email provider..."}
              {connectionStatus === "success" && "Email provider connected successfully!"}
              {connectionStatus === "error" && "Failed to connect to email provider. Please try again."}
            </span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Email Integration</h1>
          <p className="text-muted-foreground mt-2">
            Connect email providers and manage templates for automated outreach
          </p>
        </div>
        <div className="flex items-center space-x-3">
          <Button variant="outline" size="sm" className="apple-button">
            <BarChart3 className="h-4 w-4 mr-2" />
            Analytics
          </Button>

          <Dialog open={isIntegrationDialogOpen} onOpenChange={setIsIntegrationDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="apple-button">
                <Plus className="h-4 w-4 mr-2" />
                Connect Email
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel max-w-md">
              <DialogHeader>
                <DialogTitle>Connect Email Provider</DialogTitle>
                <DialogDescription>Connect your email account to enable automated outreach</DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <Button
                  className="w-full justify-start apple-button"
                  variant="outline"
                  onClick={() => {
                    handleConnectEmailProvider("outlook");
                    setIsIntegrationDialogOpen(false);
                  }}
                  disabled={isConnecting}
                >
                  <span className="mr-2">📧</span>
                  {isConnecting ? "Connecting..." : "Connect Outlook/Office 365"}
                  {connectionStatus === "checking" && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
                </Button>
                <Button
                  className="w-full justify-start apple-button"
                  variant="outline"
                  onClick={() => {
                    handleConnectEmailProvider("gmail");
                    setIsIntegrationDialogOpen(false);
                  }}
                  disabled={isConnecting}
                >
                  <span className="mr-2">📬</span>
                  {isConnecting ? "Connecting..." : "Connect Gmail"}
                  {connectionStatus === "checking" && <RefreshCw className="ml-2 h-4 w-4 animate-spin" />}
                </Button>
                <Button
                  className="w-full justify-start apple-button"
                  variant="outline"
                  onClick={() => {
                    handleConnectEmailProvider("yahoo");
                    setIsIntegrationDialogOpen(false);
                  }}
                  disabled={isConnecting}
                >
                  <span className="mr-2">📮</span>
                  {isConnecting ? "Connecting..." : "Connect Yahoo Mail"}
                </Button>
                <Button
                  className="w-full justify-start apple-button"
                  variant="outline"
                  onClick={() => {
                    handleConnectEmailProvider("exchange");
                    setIsIntegrationDialogOpen(false);
                  }}
                  disabled={isConnecting}
                >
                  <span className="mr-2">💼</span>
                  {isConnecting ? "Connecting..." : "Connect Exchange Server"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isTemplateDialogOpen} onOpenChange={setIsTemplateDialogOpen}>
            <DialogTrigger asChild>
              <Button className="apple-button">
                <Plus className="h-4 w-4 mr-2" />
                New Template
              </Button>
            </DialogTrigger>
            <DialogContent className="glass-panel max-w-4xl">
              <DialogHeader>
                <DialogTitle>Create Email Template</DialogTitle>
                <DialogDescription>Create a reusable email template for your sales outreach</DialogDescription>
              </DialogHeader>
              <div className="grid gap-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="template-name">Template Name</Label>
                    <Input id="template-name" placeholder="Corporate Follow-up" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="template-type">Template Type</Label>
                    <Select>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cold_outreach">Cold Outreach</SelectItem>
                        <SelectItem value="follow_up">Follow Up</SelectItem>
                        <SelectItem value="proposal">Proposal</SelectItem>
                        <SelectItem value="meeting_request">Meeting Request</SelectItem>
                        <SelectItem value="thank_you">Thank You</SelectItem>
                        <SelectItem value="objection_handling">Objection Handling</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-subject">Email Subject</Label>
                  <Input id="template-subject" placeholder="Your upcoming {{eventType}} event" />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="template-body">Email Body</Label>
                  <Textarea
                    id="template-body"
                    placeholder="Hi {{firstName}},&#10;&#10;I hope this email finds you well..."
                    rows={10}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Available Variables</Label>
                  <div className="flex flex-wrap gap-2">
                    {[
                      "firstName",
                      "lastName",
                      "companyName",
                      "eventType",
                      "eventDate",
                      "venue",
                      "guestCount",
                    ].map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs cursor-pointer">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsTemplateDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={() => setIsTemplateDialogOpen(false)}>Create Template</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Overview Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Connected Accounts</p>
                <p className="text-2xl font-bold text-foreground">{connectedIntegrations.length}</p>
              </div>
              <Mail className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Total Emails Sent</p>
                <p className="text-2xl font-bold text-foreground">{totalEmailsSent.toLocaleString()}</p>
              </div>
              <Send className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Active Templates</p>
                <p className="text-2xl font-bold text-foreground">{templates.filter((t) => t.isActive).length}</p>
              </div>
              <FileText className="h-6 w-6 text-primary" />
            </div>
          </CardContent>
        </Card>

        <Card className="glass-panel">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Avg Success Rate</p>
                <p className="text-2xl font-bold text-green-500">{averageSuccessRate}%</p>
              </div>
              <TrendingUp className="h-6 w-6 text-green-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Connected Accounts</TabsTrigger>
          <TabsTrigger value="templates">Email Templates</TabsTrigger>
          <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6 mt-6">
          {/* Email Integrations */}
          <div className="space-y-4">
            {integrations.map((integration) => (
              <Card key={integration.id} className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="text-2xl">{getProviderIcon(integration.provider)}</div>
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h3 className="font-medium text-lg capitalize">{integration.provider}</h3>
                          <Badge className={cn("text-xs", getProviderColor(integration.provider))}>
                            {integration.provider}
                          </Badge>
                          {integration.isConnected ? (
                            <Badge className="text-xs bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300">
                              <Wifi className="h-3 w-3 mr-1" />
                              Connected
                            </Badge>
                          ) : (
                            <Badge className="text-xs bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300">
                              <WifiOff className="h-3 w-3 mr-1" />
                              Disconnected
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">{integration.email}</p>

                        {integration.isConnected && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                            <div>
                              <span className="text-muted-foreground">Auto Sync:</span>
                              <span className="ml-2 font-medium">
                                {integration.settings.autoSync ? "Enabled" : "Disabled"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Sync Interval:</span>
                              <span className="ml-2 font-medium">{integration.settings.syncInterval}min</span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Track Opens:</span>
                              <span className="ml-2 font-medium">
                                {integration.settings.trackOpens ? "Yes" : "No"}
                              </span>
                            </div>
                            <div>
                              <span className="text-muted-foreground">Last Sync:</span>
                              <span className="ml-2 font-medium">
                                {integration.lastSync ? integration.lastSync.toLocaleTimeString() : "Never"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      {integration.isConnected ? (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            className="apple-button"
                            onClick={() => handleSyncEmails(integration.id)}
                          >
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Now
                          </Button>
                          <Button size="sm" variant="outline" className="apple-button">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="apple-button"
                            onClick={() => handleDisconnectProvider(integration.id)}
                          >
                            <WifiOff className="h-4 w-4 mr-2" />
                            Disconnect
                          </Button>
                        </>
                      ) : (
                        <Button
                          size="sm"
                          className="apple-button"
                          onClick={() =>
                            handleConnectEmailProvider(
                              integration.provider as "gmail" | "outlook" | "yahoo" | "exchange"
                            )
                          }
                          disabled={isConnecting}
                        >
                          {isConnecting && connectionStatus === "checking" ? (
                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <LinkIcon className="h-4 w-4 mr-2" />
                          )}
                          {isConnecting ? "Connecting..." : "Connect"}
                        </Button>
                      )}
                    </div>
                  </div>

                  {integration.isConnected && integration.settings.trackOpens && (
                    <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex items-center space-x-2 mb-2">
                        <Eye className="h-4 w-4 text-blue-500" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Email Tracking Enabled
                        </span>
                      </div>
                      <p className="text-xs text-blue-600 dark:text-blue-200">
                        All emails sent through this account will include open and click tracking.
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Setup Guide (shown if nothing connected) */}
          {connectedIntegrations.length === 0 && (
            <Card className="glass-panel">
              <CardContent className="p-6 text-center">
                <Mail className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-medium mb-2">Connect Your Email</h3>
                <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                  Connect your email provider to enable automated outreach, email tracking, and template management.
                </p>
                <Button onClick={() => setIsIntegrationDialogOpen(true)} className="apple-button">
                  <Plus className="h-4 w-4 mr-2" />
                  Connect Email Provider
                </Button>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="templates" className="space-y-6 mt-6">
          {/* Template List */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {templates.map((template) => {
              const TypeIcon = getTemplateTypeIcon(template.type);

              return (
                <Card
                  key={template.id}
                  className="glass-panel cursor-pointer hover:border-primary/50 transition-colors"
                >
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-2">
                        <TypeIcon className="h-4 w-4 text-primary" />
                        <Badge variant="outline" className="text-xs capitalize">
                          {template.type.replace("_", " ")}
                        </Badge>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                            <MoreVertical className="h-3 w-3" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setSelectedTemplate(template)}>
                            <Eye className="h-3 w-3 mr-2" />
                            Preview
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Edit className="h-3 w-3 mr-2" />
                            Edit Template
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            <Copy className="h-3 w-3 mr-2" />
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-red-600">
                            <Trash2 className="h-3 w-3 mr-2" />
                            Delete Template
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                    <CardTitle className="text-lg leading-tight">{template.name}</CardTitle>
                    <CardDescription className="text-sm">Subject: {template.subject}</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-muted-foreground">Used:</span>
                        <span className="ml-2 font-medium">{template.usageCount} times</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Success:</span>
                        <span className="ml-2 font-medium text-green-500">{template.successRate}%</span>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {template.variables.slice(0, 4).map((variable, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {`{{${variable}}}`}
                        </Badge>
                      ))}
                      {template.variables.length > 4 && (
                        <Badge variant="outline" className="text-xs">
                          +{template.variables.length - 4}
                        </Badge>
                      )}
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Badge
                        className={cn(
                          "text-xs",
                          template.isActive
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300"
                        )}
                      >
                        {template.isActive ? "Active" : "Inactive"}
                      </Badge>
                      <Button size="sm" variant="outline">
                        <Send className="h-3 w-3 mr-2" />
                        Use Template
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="campaigns" className="space-y-6 mt-6">
          {/* Campaign List */}
          <div className="space-y-4">
            {mockEmailCampaigns.map((campaign) => (
              <Card key={campaign.id} className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-4">
                    <div>
                      <h3 className="font-medium text-lg">{campaign.name}</h3>
                      <p className="text-sm text-muted-foreground">Template: {campaign.template}</p>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge
                        className={cn(
                          "text-xs",
                          campaign.status === "completed"
                            ? "bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-300"
                            : campaign.status === "sending"
                            ? "bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300"
                            : "bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-300"
                        )}
                      >
                        {campaign.status}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-4">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-foreground">{campaign.recipients}</p>
                      <p className="text-xs text-muted-foreground">Recipients</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-blue-500">{campaign.sent}</p>
                      <p className="text-xs text-muted-foreground">Sent</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-500">{campaign.opened}</p>
                      <p className="text-xs text-muted-foreground">Opened</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-purple-500">{campaign.clicked}</p>
                      <p className="text-xs text-muted-foreground">Clicked</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-500">{campaign.replied}</p>
                      <p className="text-xs text-muted-foreground">Replied</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-red-500">{campaign.bounced}</p>
                      <p className="text-xs text-muted-foreground">Bounced</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Open Rate</span>
                      <span>{Math.round((campaign.opened / campaign.sent) * 100)}%</span>
                    </div>
                    <Progress value={(campaign.opened / campaign.sent) * 100} className="h-2" />

                    <div className="flex justify-between text-sm">
                      <span>Click Rate</span>
                      <span>{Math.round((campaign.clicked / campaign.sent) * 100)}%</span>
                    </div>
                    <Progress value={(campaign.clicked / campaign.sent) * 100} className="h-2" />

                    <div className="flex justify-between text-sm">
                      <span>Reply Rate</span>
                      <span>{Math.round((campaign.replied / campaign.sent) * 100)}%</span>
                    </div>
                    <Progress value={(campaign.replied / campaign.sent) * 100} className="h-2" />
                  </div>

                  <div className="flex items-center justify-between mt-4 pt-4 border-t border-border/50">
                    <p className="text-xs text-muted-foreground">Sent: {campaign.sentDate.toLocaleDateString()}</p>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline">
                        <Eye className="h-3 w-3 mr-2" />
                        View Details
                      </Button>
                      <Button size="sm" variant="outline">
                        <Download className="h-3 w-3 mr-2" />
                        Export Results
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="analytics" className="mt-6">
          <div className="text-center py-12">
            <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <h3 className="text-lg font-medium">Email Analytics</h3>
            <p className="text-muted-foreground">Detailed analytics and performance reports coming soon...</p>
          </div>
        </TabsContent>
      </Tabs>

      {/* Template Preview Dialog */}
      <Dialog open={!!selectedTemplate} onOpenChange={(open) => !open && setSelectedTemplate(null)}>
        <DialogContent className="glass-panel max-w-3xl">
          {selectedTemplate && (
            <>
              <DialogHeader>
                <DialogTitle>{selectedTemplate.name}</DialogTitle>
                <DialogDescription>
                  {selectedTemplate.type.replace("_", " ")} template • Used {selectedTemplate.usageCount} times •{" "}
                  {selectedTemplate.successRate}% success rate
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 mt-6">
                <div>
                  <Label className="text-sm font-medium">Subject Line</Label>
                  <div className="mt-1 p-3 bg-muted/30 rounded-lg font-mono text-sm">{selectedTemplate.subject}</div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Email Body</Label>
                  <div className="mt-1 p-4 bg-muted/30 rounded-lg font-mono text-sm whitespace-pre-line max-h-96 overflow-y-auto">
                    {selectedTemplate.body}
                  </div>
                </div>

                <div>
                  <Label className="text-sm font-medium">Available Variables</Label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {selectedTemplate.variables.map((variable) => (
                      <Badge key={variable} variant="outline" className="text-xs">
                        {`{{${variable}}}`}
                      </Badge>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
