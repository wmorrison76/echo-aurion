import { useState, useMemo } from "react";
import Layout from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
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
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Server,
  Database,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Shield,
  Settings,
  Plus,
  Eye,
  BarChart3,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
  AlertTriangle,
  TrendingUp,
  Activity,
  Calendar,
  Users,
  CreditCard,
  Building,
  Cloud,
  Key,
  Lock,
  Sync,
  ArrowUpDown,
  ArrowDown,
  ArrowUp,
  Target,
} from "lucide-react";
import type {
  PMSProvider,
  PMSConfiguration,
  PMSIntegrationLog,
  PMSIntegrationMetrics,
  ChannelManager,
  BookingEngine,
  ConnectionStatus,
  PMSType,
} from "@shared/pms-integration-types";

// Mock data for demonstration
const mockPMSProviders: PMSProvider[] = [
  {
    id: "1",
    name: "Cloud PMS Pro",
    type: "opera",
    version: "22.1.0",
    vendor: "Enterprise Hospitality Solutions",
    apiEndpoint: "https://api.opera.oracle.com/v1",
    authentication: {
      type: "oauth2",
      credentials: { clientId: "****", clientSecret: "****" },
      tokenExpiry: new Date(Date.now() + 3600000),
      scopes: ["reservations", "profiles", "inventory"],
    },
    capabilities: ["reservation-management", "guest-profiles", "room-inventory", "rate-management", "billing-folio"],
    connectionStatus: "connected",
    lastSync: new Date(Date.now() - 300000),
    syncFrequency: 15,
    errorCount: 2,
    configuration: {
      hotelCode: "HOTEL001",
      propertyId: "PROP123",
      environment: "production",
      endpoints: [],
      mappings: [],
      syncSettings: {
        batchSize: 100,
        syncInterval: 15,
        conflictResolution: "pms-wins",
        syncDirection: "bidirectional",
        filters: [],
        triggers: [],
      },
      errorHandling: {
        logLevel: "error",
        retryFailedSyncs: true,
        maxRetryAttempts: 3,
        escalationRules: [],
        notificationSettings: {
          email: { enabled: true, recipients: ["admin@hotel.com"], errorThreshold: 5 },
          slack: { enabled: false, webhook: "", channels: [] },
          sms: { enabled: false, numbers: [] },
        },
      },
    },
  },
  {
    id: "2",
    name: "Hotel Management Suite",
    type: "amadeus",
    version: "3.2.1",
    vendor: "Hospitality Tech Solutions",
    apiEndpoint: "https://api.amadeus.com/v2",
    authentication: {
      type: "api-key",
      credentials: { apiKey: "****" },
    },
    capabilities: ["reservation-management", "channel-management", "rate-management"],
    connectionStatus: "error",
    lastSync: new Date(Date.now() - 1800000),
    syncFrequency: 30,
    errorCount: 15,
    configuration: {
      hotelCode: "HOTEL001",
      propertyId: "PROP123",
      environment: "production",
      endpoints: [],
      mappings: [],
      syncSettings: {
        batchSize: 50,
        syncInterval: 30,
        conflictResolution: "manual-review",
        syncDirection: "pms-to-crm",
        filters: [],
        triggers: [],
      },
      errorHandling: {
        logLevel: "warn",
        retryFailedSyncs: true,
        maxRetryAttempts: 5,
        escalationRules: [],
        notificationSettings: {
          email: { enabled: true, recipients: ["admin@hotel.com"], errorThreshold: 10 },
          slack: { enabled: true, webhook: "https://hooks.slack.com/***", channels: ["#tech-alerts"] },
          sms: { enabled: false, numbers: [] },
        },
      },
    },
  },
  {
    id: "3",
    name: "Mews Connector",
    type: "mews",
    version: "1.8.0",
    vendor: "Mews Systems",
    apiEndpoint: "https://api.mews.com/v1",
    authentication: {
      type: "token",
      credentials: { accessToken: "****" },
    },
    capabilities: ["reservation-management", "guest-profiles", "check-in-out", "payment-processing"],
    connectionStatus: "connected",
    lastSync: new Date(Date.now() - 180000),
    syncFrequency: 10,
    errorCount: 0,
    configuration: {
      hotelCode: "HOTEL001",
      propertyId: "PROP123",
      environment: "production",
      endpoints: [],
      mappings: [],
      syncSettings: {
        batchSize: 200,
        syncInterval: 10,
        conflictResolution: "latest-wins",
        syncDirection: "bidirectional",
        filters: [],
        triggers: [],
      },
      errorHandling: {
        logLevel: "info",
        retryFailedSyncs: true,
        maxRetryAttempts: 3,
        escalationRules: [],
        notificationSettings: {
          email: { enabled: false, recipients: [], errorThreshold: 0 },
          slack: { enabled: false, webhook: "", channels: [] },
          sms: { enabled: false, numbers: [] },
        },
      },
    },
  },
];

const mockChannelManagers: ChannelManager[] = [
  {
    id: "1",
    name: "SiteMinder",
    provider: "SiteMinder",
    connectedChannels: [
      { id: "1", name: "Booking.com", type: "ota", commission: 15, active: true, mapping: { roomTypes: {}, ratePlans: {}, policies: {} }, restrictions: [] },
      { id: "2", name: "Expedia", type: "ota", commission: 18, active: true, mapping: { roomTypes: {}, ratePlans: {}, policies: {} }, restrictions: [] },
      { id: "3", name: "Agoda", type: "ota", commission: 12, active: false, mapping: { roomTypes: {}, ratePlans: {}, policies: {} }, restrictions: [] },
    ],
    inventorySync: {
      enabled: true,
      syncFrequency: 5,
      roomTypes: ["STD", "SUP", "DEL"],
      lastSync: new Date(Date.now() - 300000),
      conflicts: [],
    },
    rateSync: {
      enabled: true,
      syncFrequency: 10,
      ratePlans: ["BAR", "PKG", "ADV"],
      markupRules: [],
      lastSync: new Date(Date.now() - 600000),
    },
    reservationSync: {
      enabled: true,
      autoConfirm: true,
      mappingRules: [],
      lastSync: new Date(Date.now() - 120000),
    },
    lastSync: new Date(Date.now() - 120000),
    status: "connected",
  },
];

const mockBookingEngines: BookingEngine[] = [
  {
    id: "1",
    name: "Direct Booking Engine",
    provider: "SynXis",
    websiteUrl: "https://book.hotel.com",
    configuration: {
      theme: {
        primaryColor: "#10b981",
        secondaryColor: "#059669",
        fontFamily: "Inter",
        logoUrl: "/logo.png",
      },
      features: [
        { name: "mobile-responsive", enabled: true, configuration: {} },
        { name: "multi-language", enabled: true, configuration: { languages: ["en", "es", "fr"] } },
        { name: "guest-reviews", enabled: false, configuration: {} },
      ],
      policies: [],
      paymentGateways: [
        { id: "1", name: "Stripe", provider: "Stripe", enabled: true, currencies: ["USD", "EUR"], fees: { percentage: 2.9, fixed: 0.30 }, testMode: false },
      ],
      languages: ["en", "es", "fr"],
      currencies: ["USD", "EUR"],
    },
    analytics: {
      period: "weekly",
      startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
      endDate: new Date(),
      metrics: {
        visits: 2847,
        conversions: 142,
        conversionRate: 4.99,
        averageBookingValue: 285.50,
        abandonmentRate: 68.2,
        averageStayLength: 2.3,
      },
      sources: [
        { source: "Direct", visits: 1420, conversions: 89, conversionRate: 6.27 },
        { source: "Google", visits: 856, conversions: 31, conversionRate: 3.62 },
        { source: "Social", visits: 571, conversions: 22, conversionRate: 3.85 },
      ],
      devices: [
        { device: "mobile", visits: 1708, conversions: 85, conversionRate: 4.98 },
        { device: "desktop", visits: 823, conversions: 42, conversionRate: 5.10 },
        { device: "tablet", visits: 316, conversions: 15, conversionRate: 4.75 },
      ],
    },
    lastSync: new Date(Date.now() - 180000),
    status: "connected",
  },
];

const mockIntegrationLogs: PMSIntegrationLog[] = [
  {
    id: "1",
    providerId: "1",
    timestamp: new Date(Date.now() - 600000),
    operation: "sync-reservations",
    direction: "inbound",
    status: "success",
    recordCount: 45,
    processingTime: 2340,
    errors: [],
    metadata: { batchId: "batch-001" },
  },
  {
    id: "2",
    providerId: "2",
    timestamp: new Date(Date.now() - 900000),
    operation: "update-rates",
    direction: "outbound",
    status: "error",
    recordCount: 0,
    processingTime: 15670,
    errors: [
      {
        id: "err-1",
        type: "authentication",
        code: "AUTH_EXPIRED",
        message: "Authentication token has expired",
        severity: "high",
        occurredAt: new Date(Date.now() - 900000),
      },
    ],
    metadata: { retryCount: 3 },
  },
];

const mockMetrics: PMSIntegrationMetrics = {
  providerId: "1",
  period: "daily",
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  endDate: new Date(),
  metrics: {
    totalOperations: 1247,
    successfulOperations: 1192,
    failedOperations: 55,
    averageResponseTime: 1850,
    dataVolume: 2.4,
    errorRate: 4.4,
    uptime: 99.2,
    peakHourOperations: 89,
  },
  operationBreakdown: [
    { operation: "sync-reservations", count: 456, successRate: 97.8, averageTime: 2100 },
    { operation: "update-inventory", count: 234, successRate: 99.1, averageTime: 850 },
    { operation: "sync-profiles", count: 189, successRate: 94.2, averageTime: 3200 },
  ],
  errorBreakdown: [
    { errorType: "network", count: 23, percentage: 41.8, trend: "decreasing" },
    { errorType: "validation", count: 18, percentage: 32.7, trend: "stable" },
    { errorType: "authentication", count: 14, percentage: 25.5, trend: "increasing" },
  ],
};

export default function PMSIntegration() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [filterType, setFilterType] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("providers");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<PMSProvider | null>(null);

  const filteredProviders = useMemo(() => {
    return mockPMSProviders.filter(provider => {
      const matchesSearch = provider.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          provider.vendor.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesStatus = filterStatus === "all" || provider.connectionStatus === filterStatus;
      const matchesType = filterType === "all" || provider.type === filterType;
      return matchesSearch && matchesStatus && matchesType;
    });
  }, [searchQuery, filterStatus, filterType]);

  const getStatusIcon = (status: ConnectionStatus) => {
    switch (status) {
      case "connected": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "error": return <AlertCircle className="h-4 w-4 text-red-500" />;
      case "syncing": return <RefreshCw className="h-4 w-4 text-blue-500 animate-spin" />;
      case "pending": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "maintenance": return <Settings className="h-4 w-4 text-orange-500" />;
      default: return <WifiOff className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: ConnectionStatus) => {
    switch (status) {
      case "connected": return "bg-green-500";
      case "error": return "bg-red-500";
      case "syncing": return "bg-blue-500";
      case "pending": return "bg-yellow-500";
      case "maintenance": return "bg-orange-500";
      default: return "bg-gray-500";
    }
  };

  const getPMSTypeIcon = (type: PMSType) => {
    switch (type) {
      case "opera": return <Building className="h-4 w-4" />;
      case "amadeus": return <Cloud className="h-4 w-4" />;
      case "mews": return <Server className="h-4 w-4" />;
      default: return <Database className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              PMS Integration
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage Property Management System integrations, channel managers, and booking engines
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="apple-button">
              <BarChart3 className="h-4 w-4 mr-2" />
              Analytics
            </Button>
            <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
              <DialogTrigger asChild>
                <Button className="apple-button bg-primary hover:bg-primary/90">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Integration
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New PMS Integration</DialogTitle>
                  <DialogDescription>
                    Configure a new Property Management System integration
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="pms-name" className="text-right">Name</Label>
                    <Input id="pms-name" placeholder="Integration name" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="pms-type" className="text-right">Type</Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select PMS type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="opera">Cloud PMS Pro</SelectItem>
                        <SelectItem value="amadeus">Hotel Management Suite</SelectItem>
                        <SelectItem value="fidelio">Fidelio</SelectItem>
                        <SelectItem value="mews">Mews</SelectItem>
                        <SelectItem value="cloudbeds">Cloudbeds</SelectItem>
                        <SelectItem value="custom">Custom Integration</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="api-endpoint" className="text-right">API Endpoint</Label>
                    <Input id="api-endpoint" placeholder="https://api.example.com" className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>Create Integration</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Integrations</p>
                  <p className="text-2xl font-bold">3</p>
                </div>
                <Wifi className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">2 connected, 1 error</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Sync Success Rate</p>
                  <p className="text-2xl font-bold">95.6%</p>
                </div>
                <Target className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Last 24 hours</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Daily Operations</p>
                  <p className="text-2xl font-bold">1,247</p>
                </div>
                <Activity className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+8% from yesterday</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                  <p className="text-2xl font-bold">1.85s</p>
                </div>
                <Zap className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">-0.3s improvement</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search integrations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="connected">Connected</SelectItem>
              <SelectItem value="error">Error</SelectItem>
              <SelectItem value="syncing">Syncing</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="opera">Cloud PMS Pro</SelectItem>
              <SelectItem value="amadeus">Hotel Management Suite</SelectItem>
              <SelectItem value="mews">Mews</SelectItem>
              <SelectItem value="fidelio">Fidelio</SelectItem>
              <SelectItem value="cloudbeds">Cloudbeds</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="providers">PMS Providers</TabsTrigger>
            <TabsTrigger value="channels">Channel Managers</TabsTrigger>
            <TabsTrigger value="booking">Booking Engines</TabsTrigger>
            <TabsTrigger value="logs">Integration Logs</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="providers" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {filteredProviders.map((provider) => (
                <Card key={provider.id} className="glass-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getPMSTypeIcon(provider.type)}
                        <div>
                          <CardTitle className="text-lg">{provider.name}</CardTitle>
                          <CardDescription>
                            {provider.vendor} • v{provider.version} • {provider.type.toUpperCase()}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(provider.connectionStatus)}
                        <Badge variant={provider.connectionStatus === "connected" ? "default" : "destructive"}>
                          {provider.connectionStatus}
                        </Badge>
                        {provider.errorCount > 0 && (
                          <Badge variant="outline" className="text-red-500">
                            {provider.errorCount} errors
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Last Sync</p>
                          <p className="text-sm font-medium">
                            {provider.lastSync.toLocaleString()}
                          </p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Sync Frequency</p>
                          <p className="text-sm font-medium">{provider.syncFrequency} minutes</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Hotel Code</p>
                          <p className="text-sm font-medium">{provider.configuration.hotelCode}</p>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Capabilities:</p>
                        <div className="flex flex-wrap gap-2">
                          {provider.capabilities.map((capability) => (
                            <Badge key={capability} variant="outline" className="text-xs">
                              {capability.replace("-", " ")}
                            </Badge>
                          ))}
                        </div>
                      </div>

                      <Separator />

                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${getStatusColor(provider.connectionStatus)}`} />
                            <span className="text-sm text-muted-foreground">
                              {provider.connectionStatus === "connected" ? "Online" : "Offline"}
                            </span>
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Environment: {provider.configuration.environment}
                          </div>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" className="apple-button">
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Sync Now
                          </Button>
                          <Button variant="outline" size="sm" className="apple-button">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                          <Button variant="outline" size="sm" className="apple-button">
                            <Eye className="h-4 w-4 mr-2" />
                            View Logs
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="channels" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {mockChannelManagers.map((manager) => (
                <Card key={manager.id} className="glass-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{manager.name}</CardTitle>
                        <CardDescription>Channel Manager by {manager.provider}</CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(manager.status)}
                        <Badge variant={manager.status === "connected" ? "default" : "destructive"}>
                          {manager.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Connected Channels</p>
                          <p className="text-lg font-semibold">{manager.connectedChannels.filter(c => c.active).length}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Last Sync</p>
                          <p className="text-sm font-medium">{manager.lastSync.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Auto Confirm</p>
                          <div className="flex items-center space-x-2">
                            <div className={`h-2 w-2 rounded-full ${manager.reservationSync.autoConfirm ? 'bg-green-500' : 'bg-gray-300'}`} />
                            <span className="text-sm">{manager.reservationSync.autoConfirm ? "Enabled" : "Disabled"}</span>
                          </div>
                        </div>
                      </div>

                      <div>
                        <h4 className="text-sm font-medium mb-3">Channels</h4>
                        <div className="space-y-2">
                          {manager.connectedChannels.map((channel) => (
                            <div key={channel.id} className="flex items-center justify-between p-3 border rounded-lg">
                              <div className="flex items-center space-x-3">
                                <div className={`h-3 w-3 rounded-full ${channel.active ? 'bg-green-500' : 'bg-gray-300'}`} />
                                <div>
                                  <p className="font-medium">{channel.name}</p>
                                  <p className="text-sm text-muted-foreground">{channel.type.toUpperCase()}</p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-4">
                                <div className="text-right">
                                  <p className="text-sm font-medium">{channel.commission}%</p>
                                  <p className="text-xs text-muted-foreground">Commission</p>
                                </div>
                                <Switch checked={channel.active} />
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Inventory Sync</h4>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Switch checked={manager.inventorySync.enabled} />
                              <span className="text-sm">Enabled</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Every {manager.inventorySync.syncFrequency} minutes
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Rate Sync</h4>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Switch checked={manager.rateSync.enabled} />
                              <span className="text-sm">Enabled</span>
                            </div>
                            <p className="text-xs text-muted-foreground">
                              Every {manager.rateSync.syncFrequency} minutes
                            </p>
                          </div>
                        </div>
                        <div className="space-y-2">
                          <h4 className="text-sm font-medium">Reservation Sync</h4>
                          <div className="space-y-1">
                            <div className="flex items-center space-x-2">
                              <Switch checked={manager.reservationSync.enabled} />
                              <span className="text-sm">Enabled</span>
                            </div>
                            <p className="text-xs text-muted-foreground">Real-time</p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="booking" className="space-y-4">
            <div className="grid grid-cols-1 gap-6">
              {mockBookingEngines.map((engine) => (
                <Card key={engine.id} className="glass-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="text-lg">{engine.name}</CardTitle>
                        <CardDescription>
                          Powered by {engine.provider} • {engine.websiteUrl}
                        </CardDescription>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(engine.status)}
                        <Badge variant={engine.status === "connected" ? "default" : "destructive"}>
                          {engine.status}
                        </Badge>
                        <Button variant="outline" size="sm" className="apple-button">
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Visit Site
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Weekly Visits</p>
                          <p className="text-lg font-semibold">{engine.analytics.metrics.visits.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Conversions</p>
                          <p className="text-lg font-semibold">{engine.analytics.metrics.conversions}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Conversion Rate</p>
                          <p className="text-lg font-semibold">{engine.analytics.metrics.conversionRate}%</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Avg Booking Value</p>
                          <p className="text-lg font-semibold">${engine.analytics.metrics.averageBookingValue}</p>
                        </div>
                      </div>

                      <Separator />

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="text-sm font-medium mb-3">Traffic Sources</h4>
                          <div className="space-y-2">
                            {engine.analytics.sources.map((source) => (
                              <div key={source.source} className="flex items-center justify-between">
                                <span className="text-sm">{source.source}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground">{source.visits}</span>
                                  <span className="text-sm font-medium">{source.conversionRate}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                        <div>
                          <h4 className="text-sm font-medium mb-3">Device Breakdown</h4>
                          <div className="space-y-2">
                            {engine.analytics.devices.map((device) => (
                              <div key={device.device} className="flex items-center justify-between">
                                <span className="text-sm capitalize">{device.device}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="text-sm text-muted-foreground">{device.visits}</span>
                                  <span className="text-sm font-medium">{device.conversionRate}%</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <h4 className="text-sm font-medium">Features</h4>
                          <Button variant="outline" size="sm" className="apple-button">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                        </div>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                          {engine.configuration.features.map((feature) => (
                            <div key={feature.name} className="flex items-center space-x-2">
                              <Switch checked={feature.enabled} />
                              <span className="text-sm capitalize">{feature.name.replace(/-/g, ' ')}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="logs" className="space-y-4">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Integration Logs</CardTitle>
                <CardDescription>Recent integration activities and operations</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Timestamp</TableHead>
                      <TableHead>Provider</TableHead>
                      <TableHead>Operation</TableHead>
                      <TableHead>Direction</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Records</TableHead>
                      <TableHead>Duration</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mockIntegrationLogs.map((log) => {
                      const provider = mockPMSProviders.find(p => p.id === log.providerId);
                      return (
                        <TableRow key={log.id}>
                          <TableCell>{log.timestamp.toLocaleString()}</TableCell>
                          <TableCell>{provider?.name || "Unknown"}</TableCell>
                          <TableCell>{log.operation}</TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-1">
                              {log.direction === "inbound" ? (
                                <ArrowDown className="h-3 w-3 text-green-500" />
                              ) : (
                                <ArrowUp className="h-3 w-3 text-blue-500" />
                              )}
                              <span className="text-sm">{log.direction}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant={log.status === "success" ? "default" : "destructive"}>
                              {log.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{log.recordCount}</TableCell>
                          <TableCell>{log.processingTime}ms</TableCell>
                          <TableCell>
                            <Button variant="outline" size="sm" className="apple-button">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Total Operations</p>
                      <p className="text-2xl font-bold">{mockMetrics.metrics.totalOperations.toLocaleString()}</p>
                    </div>
                    <Activity className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Success Rate</p>
                      <p className="text-2xl font-bold">{((mockMetrics.metrics.successfulOperations / mockMetrics.metrics.totalOperations) * 100).toFixed(1)}%</p>
                    </div>
                    <Target className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Response Time</p>
                      <p className="text-2xl font-bold">{mockMetrics.metrics.averageResponseTime}ms</p>
                    </div>
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Uptime</p>
                      <p className="text-2xl font-bold">{mockMetrics.metrics.uptime}%</p>
                    </div>
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Operation Breakdown</CardTitle>
                <CardDescription>Performance metrics by operation type</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockMetrics.operationBreakdown.map((operation) => (
                    <div key={operation.operation} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{operation.operation.replace(/-/g, ' ')}</span>
                        <div className="flex items-center space-x-4">
                          <span className="text-sm text-muted-foreground">{operation.count} ops</span>
                          <span className="text-sm font-medium">{operation.successRate}%</span>
                          <span className="text-sm text-muted-foreground">{operation.averageTime}ms</span>
                        </div>
                      </div>
                      <Progress value={operation.successRate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Error Analysis</CardTitle>
                <CardDescription>Error distribution and trends</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {mockMetrics.errorBreakdown.map((error) => (
                    <div key={error.errorType} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium capitalize">{error.errorType}</span>
                        <Badge variant={error.trend === "increasing" ? "destructive" : error.trend === "decreasing" ? "default" : "secondary"}>
                          {error.trend}
                        </Badge>
                      </div>
                      <div className="text-2xl font-bold">{error.count}</div>
                      <div className="text-sm text-muted-foreground">{error.percentage}% of total errors</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
