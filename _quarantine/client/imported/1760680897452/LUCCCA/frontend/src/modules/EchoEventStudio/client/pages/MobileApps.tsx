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
  Smartphone,
  Tablet,
  Monitor,
  Download,
  Star,
  Users,
  Settings,
  Plus,
  Eye,
  BarChart3,
  Wifi,
  WifiOff,
  CheckCircle,
  AlertCircle,
  Clock,
  Zap,
  Shield,
  Bell,
  Camera,
  MapPin,
  Calendar,
  MessageSquare,
  CreditCard,
  RefreshCw,
  Search,
  Filter,
  ExternalLink,
} from "lucide-react";
import type {
  MobileApp,
  MobileFeature,
  StaffMobileAccess,
  GuestMobilePortal,
  PWAConfiguration,
  MobileAnalytics,
  MobileFeedback,
} from "@shared/mobile-app-types";

// Mock data for demonstration
const mockMobileApps: MobileApp[] = [
  {
    id: "1",
    name: "EchoCRM Staff",
    platform: "ios",
    version: "2.1.4",
    buildNumber: 214,
    status: "production",
    features: [],
    downloadCount: 2847,
    rating: 4.6,
    reviewCount: 312,
    lastUpdate: new Date("2024-01-15"),
    createdAt: new Date("2023-03-01"),
  },
  {
    id: "2",
    name: "EchoCRM Staff",
    platform: "android",
    version: "2.1.2",
    buildNumber: 212,
    status: "production",
    features: [],
    downloadCount: 3912,
    rating: 4.4,
    reviewCount: 445,
    lastUpdate: new Date("2024-01-12"),
    createdAt: new Date("2023-03-01"),
  },
  {
    id: "3",
    name: "EchoCRM Guest Portal",
    platform: "pwa",
    version: "1.8.0",
    buildNumber: 180,
    status: "production",
    features: [],
    downloadCount: 15672,
    rating: 4.8,
    reviewCount: 1034,
    lastUpdate: new Date("2024-01-18"),
    createdAt: new Date("2023-05-15"),
  },
];

const mockStaffAccess: StaffMobileAccess[] = [
  {
    id: "1",
    userId: "user-1",
    deviceId: "device-ios-001",
    deviceType: "ios",
    appVersion: "2.1.4",
    permissions: ["checkin-checkout", "guest-management", "event-management"],
    lastActive: new Date(),
    isOnline: true,
    location: { latitude: 40.7128, longitude: -74.0060, accuracy: 10, timestamp: new Date() },
  },
  {
    id: "2",
    userId: "user-2",
    deviceId: "device-android-002",
    deviceType: "android",
    appVersion: "2.1.2",
    permissions: ["inventory-access", "reporting", "communication"],
    lastActive: new Date(Date.now() - 300000), // 5 minutes ago
    isOnline: false,
  },
];

const mockGuestPortals: GuestMobilePortal[] = [
  {
    id: "1",
    guestId: "guest-1",
    sessionToken: "session-token-1",
    checkInDate: new Date("2024-01-20"),
    checkOutDate: new Date("2024-01-25"),
    roomNumber: "401",
    accessLevel: "premium",
    preferences: {
      language: "en",
      notifications: { push: true, email: true, sms: false, inApp: true },
      services: { roomService: true, housekeeping: true, concierge: true, spa: true, dining: true },
      privacy: { shareLocation: true, analytics: true, marketing: false },
    },
    services: [],
    notifications: [],
  },
];

const mockPWAConfig: PWAConfiguration = {
  id: "pwa-1",
  name: "EchoCRM Guest Portal",
  shortName: "EchoCRM",
  description: "Complete hospitality management for guests",
  version: "1.8.0",
  manifestUrl: "/manifest.json",
  iconSizes: [
    { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
  ],
  themeColor: "#10b981",
  backgroundColor: "#ffffff",
  display: "standalone",
  orientation: "portrait",
  features: [
    { name: "offline-support", enabled: true, configuration: {} },
    { name: "push-notifications", enabled: true, configuration: {} },
    { name: "background-sync", enabled: true, configuration: {} },
  ],
  offlineCapabilities: [
    { feature: "guest-profile", cacheType: "static", strategy: "cache-first", expiration: 24 },
    { feature: "room-service", cacheType: "dynamic", strategy: "network-first", expiration: 1 },
  ],
  cacheStrategy: "balanced",
};

const mockAnalytics: MobileAnalytics = {
  id: "analytics-1",
  appId: "app-1",
  period: "weekly",
  metrics: {
    activeUsers: 1247,
    sessions: 3894,
    averageSessionDuration: 12.5,
    screenViews: 18467,
    crashes: 3,
    errors: 12,
    features: [
      { featureId: "checkin", featureName: "Check-in", usageCount: 845, uniqueUsers: 432, averageUsageTime: 2.3, conversionRate: 95.2 },
      { featureId: "room-service", featureName: "Room Service", usageCount: 623, uniqueUsers: 298, averageUsageTime: 4.1, conversionRate: 78.4 },
    ],
    performance: {
      appStartTime: 1250,
      apiResponseTime: 320,
      crashRate: 0.08,
      memoryUsage: 45.2,
      batteryImpact: "low",
      networkUsage: 12.8,
    },
  },
  startDate: new Date("2024-01-14"),
  endDate: new Date("2024-01-21"),
};

export default function MobileApps() {
  const [searchQuery, setSearchQuery] = useState("");
  const [filterPlatform, setFilterPlatform] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [activeTab, setActiveTab] = useState("apps");
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);

  const filteredApps = useMemo(() => {
    return mockMobileApps.filter(app => {
      const matchesSearch = app.name.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesPlatform = filterPlatform === "all" || app.platform === filterPlatform;
      const matchesStatus = filterStatus === "all" || app.status === filterStatus;
      return matchesSearch && matchesPlatform && matchesStatus;
    });
  }, [searchQuery, filterPlatform, filterStatus]);

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "production": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "testing": return <Clock className="h-4 w-4 text-yellow-500" />;
      case "development": return <Settings className="h-4 w-4 text-blue-500" />;
      case "maintenance": return <AlertCircle className="h-4 w-4 text-red-500" />;
      default: return <AlertCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case "ios": return <Smartphone className="h-4 w-4" />;
      case "android": return <Tablet className="h-4 w-4" />;
      case "pwa": return <Monitor className="h-4 w-4" />;
      default: return <Smartphone className="h-4 w-4" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Mobile Applications
            </h1>
            <p className="text-muted-foreground mt-2">
              Manage mobile apps, PWA configuration, and staff/guest portals
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
                  New App Build
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-panel max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Create New App Build</DialogTitle>
                  <DialogDescription>
                    Configure a new mobile application build or PWA version
                  </DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="app-name" className="text-right">Name</Label>
                    <Input id="app-name" placeholder="App name" className="col-span-3" />
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="platform" className="text-right">Platform</Label>
                    <Select>
                      <SelectTrigger className="col-span-3">
                        <SelectValue placeholder="Select platform" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ios">iOS</SelectItem>
                        <SelectItem value="android">Android</SelectItem>
                        <SelectItem value="pwa">Progressive Web App</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="version" className="text-right">Version</Label>
                    <Input id="version" placeholder="1.0.0" className="col-span-3" />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button onClick={() => setIsCreateDialogOpen(false)}>Create Build</Button>
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
                  <p className="text-sm font-medium text-muted-foreground">Total Downloads</p>
                  <p className="text-2xl font-bold">22.4K</p>
                </div>
                <Download className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+12% from last month</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">1,247</p>
                </div>
                <Users className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">+8% from last week</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Average Rating</p>
                  <p className="text-2xl font-bold">4.6</p>
                </div>
                <Star className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">Based on 1,791 reviews</p>
            </CardContent>
          </Card>
          <Card className="glass-panel">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Staff Online</p>
                  <p className="text-2xl font-bold">24</p>
                </div>
                <Wifi className="h-8 w-8 text-primary" />
              </div>
              <p className="text-xs text-muted-foreground mt-2">8 on mobile devices</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search applications..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={filterPlatform} onValueChange={setFilterPlatform}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Platform" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Platforms</SelectItem>
              <SelectItem value="ios">iOS</SelectItem>
              <SelectItem value="android">Android</SelectItem>
              <SelectItem value="pwa">PWA</SelectItem>
            </SelectContent>
          </Select>
          <Select value={filterStatus} onValueChange={setFilterStatus}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="production">Production</SelectItem>
              <SelectItem value="testing">Testing</SelectItem>
              <SelectItem value="development">Development</SelectItem>
              <SelectItem value="maintenance">Maintenance</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="apps">Applications</TabsTrigger>
            <TabsTrigger value="staff">Staff Access</TabsTrigger>
            <TabsTrigger value="guests">Guest Portal</TabsTrigger>
            <TabsTrigger value="pwa">PWA Config</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="apps" className="space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {filteredApps.map((app) => (
                <Card key={app.id} className="glass-panel">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        {getPlatformIcon(app.platform)}
                        <div>
                          <CardTitle className="text-lg">{app.name}</CardTitle>
                          <CardDescription>
                            v{app.version} ({app.buildNumber}) • {app.platform.toUpperCase()}
                          </CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(app.status)}
                        <Badge variant={app.status === "production" ? "default" : "secondary"}>
                          {app.status}
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Downloads</p>
                          <p className="text-lg font-semibold">{app.downloadCount.toLocaleString()}</p>
                        </div>
                        <div className="space-y-1">
                          <p className="text-sm text-muted-foreground">Rating</p>
                          <div className="flex items-center space-x-1">
                            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                            <span className="text-lg font-semibold">{app.rating}</span>
                            <span className="text-sm text-muted-foreground">({app.reviewCount})</span>
                          </div>
                        </div>
                      </div>
                      <Separator />
                      <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                          Updated {app.lastUpdate.toLocaleDateString()}
                        </p>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" className="apple-button">
                            <Eye className="h-4 w-4 mr-2" />
                            Details
                          </Button>
                          <Button variant="outline" size="sm" className="apple-button">
                            <Settings className="h-4 w-4 mr-2" />
                            Configure
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="staff" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {mockStaffAccess.map((access) => (
                <Card key={access.id} className="glass-panel">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="relative">
                          {getPlatformIcon(access.deviceType)}
                          <div className={`absolute -top-1 -right-1 h-3 w-3 rounded-full ${access.isOnline ? 'bg-green-500' : 'bg-gray-400'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold">Staff Member #{access.userId}</h3>
                          <p className="text-sm text-muted-foreground">
                            {access.deviceType.toUpperCase()} • v{access.appVersion}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            Last active: {access.lastActive.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={access.isOnline ? "default" : "secondary"}>
                          {access.isOnline ? "Online" : "Offline"}
                        </Badge>
                        {access.location && (
                          <Button variant="outline" size="sm" className="apple-button">
                            <MapPin className="h-4 w-4 mr-2" />
                            Location
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="mt-4">
                      <p className="text-sm font-medium mb-2">Permissions:</p>
                      <div className="flex flex-wrap gap-2">
                        {access.permissions.map((permission) => (
                          <Badge key={permission} variant="outline">
                            {permission.replace("-", " ")}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="guests" className="space-y-4">
            <div className="grid grid-cols-1 gap-4">
              {mockGuestPortals.map((portal) => (
                <Card key={portal.id} className="glass-panel">
                  <CardContent className="p-6">
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">Guest Portal</h3>
                          <p className="text-sm text-muted-foreground">
                            Room {portal.roomNumber} • {portal.accessLevel} access
                          </p>
                        </div>
                        <Badge>{portal.accessLevel}</Badge>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-muted-foreground">Check-in</p>
                          <p className="font-medium">{portal.checkInDate.toLocaleDateString()}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Check-out</p>
                          <p className="font-medium">{portal.checkOutDate.toLocaleDateString()}</p>
                        </div>
                      </div>
                      <div className="space-y-2">
                        <p className="text-sm font-medium">Active Services:</p>
                        <div className="grid grid-cols-2 gap-2">
                          {Object.entries(portal.preferences.services).map(([service, enabled]) => (
                            <div key={service} className="flex items-center space-x-2">
                              <div className={`h-2 w-2 rounded-full ${enabled ? 'bg-green-500' : 'bg-gray-300'}`} />
                              <span className="text-sm capitalize">{service.replace(/([A-Z])/g, ' $1')}</span>
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

          <TabsContent value="pwa" className="space-y-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>PWA Configuration</CardTitle>
                <CardDescription>
                  Configure Progressive Web App settings and capabilities
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pwa-name">App Name</Label>
                      <Input id="pwa-name" value={mockPWAConfig.name} readOnly />
                    </div>
                    <div>
                      <Label htmlFor="pwa-version">Version</Label>
                      <Input id="pwa-version" value={mockPWAConfig.version} readOnly />
                    </div>
                    <div>
                      <Label htmlFor="pwa-theme">Theme Color</Label>
                      <div className="flex items-center space-x-2">
                        <div 
                          className="h-8 w-8 rounded border"
                          style={{ backgroundColor: mockPWAConfig.themeColor }}
                        />
                        <Input id="pwa-theme" value={mockPWAConfig.themeColor} readOnly />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="pwa-display">Display Mode</Label>
                      <Input id="pwa-display" value={mockPWAConfig.display} readOnly />
                    </div>
                    <div>
                      <Label htmlFor="pwa-orientation">Orientation</Label>
                      <Input id="pwa-orientation" value={mockPWAConfig.orientation} readOnly />
                    </div>
                    <div>
                      <Label htmlFor="pwa-cache">Cache Strategy</Label>
                      <Input id="pwa-cache" value={mockPWAConfig.cacheStrategy} readOnly />
                    </div>
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-lg font-semibold mb-4">Features</h4>
                  <div className="space-y-3">
                    {mockPWAConfig.features.map((feature) => (
                      <div key={feature.name} className="flex items-center justify-between">
                        <div>
                          <p className="font-medium capitalize">{feature.name.replace(/-/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {feature.name === "offline-support" && "Enable app functionality without internet"}
                            {feature.name === "push-notifications" && "Send real-time notifications to users"}
                            {feature.name === "background-sync" && "Sync data when connection is restored"}
                          </p>
                        </div>
                        <Switch checked={feature.enabled} />
                      </div>
                    ))}
                  </div>
                </div>

                <Separator />

                <div>
                  <h4 className="text-lg font-semibold mb-4">Offline Capabilities</h4>
                  <div className="space-y-3">
                    {mockPWAConfig.offlineCapabilities.map((capability, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium capitalize">{capability.feature.replace(/-/g, ' ')}</p>
                          <p className="text-sm text-muted-foreground">
                            {capability.strategy} • {capability.cacheType} cache • {capability.expiration}h TTL
                          </p>
                        </div>
                        <Badge variant="outline">{capability.strategy}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold">{mockAnalytics.metrics.activeUsers.toLocaleString()}</p>
                    </div>
                    <Users className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Sessions</p>
                      <p className="text-2xl font-bold">{mockAnalytics.metrics.sessions.toLocaleString()}</p>
                    </div>
                    <Zap className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Avg Session</p>
                      <p className="text-2xl font-bold">{mockAnalytics.metrics.averageSessionDuration}m</p>
                    </div>
                    <Clock className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
              <Card className="glass-panel">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Crash Rate</p>
                      <p className="text-2xl font-bold">{mockAnalytics.metrics.performance.crashRate}%</p>
                    </div>
                    <Shield className="h-8 w-8 text-primary" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Feature Usage</CardTitle>
                <CardDescription>Most popular features and their usage statistics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {mockAnalytics.metrics.features.map((feature) => (
                    <div key={feature.featureId} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{feature.featureName}</span>
                        <span className="text-sm text-muted-foreground">
                          {feature.usageCount} uses • {feature.conversionRate}% conversion
                        </span>
                      </div>
                      <Progress value={feature.conversionRate} className="h-2" />
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Performance Metrics</CardTitle>
                <CardDescription>App performance and user experience indicators</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">App Start Time</span>
                      <span className="text-sm text-muted-foreground">
                        {mockAnalytics.metrics.performance.appStartTime}ms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">API Response Time</span>
                      <span className="text-sm text-muted-foreground">
                        {mockAnalytics.metrics.performance.apiResponseTime}ms
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Memory Usage</span>
                      <span className="text-sm text-muted-foreground">
                        {mockAnalytics.metrics.performance.memoryUsage}MB
                      </span>
                    </div>
                  </div>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Battery Impact</span>
                      <Badge variant={mockAnalytics.metrics.performance.batteryImpact === "low" ? "default" : "destructive"}>
                        {mockAnalytics.metrics.performance.batteryImpact}
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Network Usage</span>
                      <span className="text-sm text-muted-foreground">
                        {mockAnalytics.metrics.performance.networkUsage}MB
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">Errors</span>
                      <span className="text-sm text-muted-foreground">
                        {mockAnalytics.metrics.errors} total
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
