import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import NavigationTutorial from "@/components/NavigationTutorial";
import EnhancedAISalesAssistant from "@/components/EnhancedAISalesAssistant";
import {
  Shield,
  Eye,
  Activity,
  Zap,
  Server,
  Users,
  Lock,
  AlertTriangle,
  CheckCircle,
  Clock,
  Database,
  Wifi,
  HardDrive,
  Cpu,
  MemoryStick,
  Network,
  Globe,
  ShieldCheck,
  ShieldAlert,
  Brain,
  Scan,
  Bell,
  Settings,
  BarChart3,
  TrendingUp,
  AlertCircle,
  Info,
  XCircle,
  RefreshCw,
  Terminal,
  Bot,
  Command,
  Navigation,
  Compass,
  Route,
  MapPin,
  Play,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface SystemAlert {
  id: string;
  level: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: Date;
  category: 'security' | 'performance' | 'system' | 'user' | 'data';
  resolved: boolean;
  action?: string;
}

interface SystemMetrics {
  cpu: number;
  memory: number;
  storage: number;
  network: number;
  activeUsers: number;
  apiCalls: number;
  responseTime: number;
  uptime: number;
}

interface SecurityEvent {
  id: string;
  type: 'login' | 'permission_change' | 'data_access' | 'suspicious_activity';
  user: string;
  action: string;
  timestamp: Date;
  riskLevel: 'low' | 'medium' | 'high';
  location?: string;
  details: string;
}

interface EchoAIProps {
  isSystemAdmin?: boolean;
}

const mockAlerts: SystemAlert[] = [
  {
    id: 'alert-1',
    level: 'info',
    title: 'AI Sales Assistant Active',
    message: 'Sales AI is currently analyzing event data and providing recommendations to 3 active users.',
    timestamp: new Date(Date.now() - 5 * 60 * 1000),
    category: 'system',
    resolved: false
  },
  {
    id: 'alert-2',
    level: 'warning',
    title: 'High API Usage Detected',
    message: 'Menu parsing service experiencing elevated usage. Consider scaling resources.',
    timestamp: new Date(Date.now() - 15 * 60 * 1000),
    category: 'performance',
    resolved: false,
    action: 'Scale Resources'
  },
  {
    id: 'alert-3',
    level: 'info',
    title: 'System Backup Completed',
    message: 'Automated backup of all event data and configurations completed successfully.',
    timestamp: new Date(Date.now() - 30 * 60 * 1000),
    category: 'data',
    resolved: true
  },
  {
    id: 'alert-4',
    level: 'warning',
    title: 'Unusual Access Pattern',
    message: 'User william.morrison has accessed 15+ menu items in the last hour. Monitoring for data integrity.',
    timestamp: new Date(Date.now() - 45 * 60 * 1000),
    category: 'security',
    resolved: false,
    action: 'Monitor'
  }
];

const mockSecurityEvents: SecurityEvent[] = [
  {
    id: 'sec-1',
    type: 'login',
    user: 'william.morrison',
    action: 'Successful login from Chrome browser',
    timestamp: new Date(Date.now() - 10 * 60 * 1000),
    riskLevel: 'low',
    location: 'New York, NY',
    details: 'Standard authentication flow completed'
  },
  {
    id: 'sec-2',
    type: 'data_access',
    user: 'sales.ai',
    action: 'Accessed event database for recommendation analysis',
    timestamp: new Date(Date.now() - 20 * 60 * 1000),
    riskLevel: 'low',
    details: 'AI system performing authorized analysis'
  },
  {
    id: 'sec-3',
    type: 'permission_change',
    user: 'admin.system',
    action: 'Updated user permissions for menu parsing',
    timestamp: new Date(Date.now() - 60 * 60 * 1000),
    riskLevel: 'medium',
    details: 'Automated permission update for new feature rollout'
  }
];

export default function EchoAI({ isSystemAdmin = false }: EchoAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [alerts, setAlerts] = useState<SystemAlert[]>(mockAlerts);
  const [securityEvents, setSecurityEvents] = useState<SecurityEvent[]>(mockSecurityEvents);
  const [showNavigationTutorial, setShowNavigationTutorial] = useState(false);
  const [selectedTutorialPath, setSelectedTutorialPath] = useState<string>('');
  const [showEnhancedAI, setShowEnhancedAI] = useState(false);
  const [systemMetrics, setSystemMetrics] = useState<SystemMetrics>({
    cpu: 45,
    memory: 62,
    storage: 34,
    network: 78,
    activeUsers: 12,
    apiCalls: 1247,
    responseTime: 145,
    uptime: 99.8
  });
  const [aiStatus, setAIStatus] = useState({
    salesAssistant: 'active',
    menuParser: 'active',
    analytics: 'active',
    monitoring: 'active'
  });

  // Simulate real-time updates
  useEffect(() => {
    if (!isOpen) return;

    const interval = setInterval(() => {
      setSystemMetrics(prev => ({
        ...prev,
        cpu: Math.max(20, Math.min(80, prev.cpu + (Math.random() - 0.5) * 10)),
        memory: Math.max(30, Math.min(90, prev.memory + (Math.random() - 0.5) * 8)),
        network: Math.max(40, Math.min(95, prev.network + (Math.random() - 0.5) * 15)),
        apiCalls: prev.apiCalls + Math.floor(Math.random() * 5),
        responseTime: Math.max(80, Math.min(300, prev.responseTime + (Math.random() - 0.5) * 20))
      }));
    }, 3000);

    return () => clearInterval(interval);
  }, [isOpen]);

  const getAlertIcon = (level: string) => {
    switch (level) {
      case 'critical': return <XCircle className="h-4 w-4 text-red-500" />;
      case 'error': return <AlertCircle className="h-4 w-4 text-red-500" />;
      case 'warning': return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case 'info': return <Info className="h-4 w-4 text-blue-500" />;
      default: return <CheckCircle className="h-4 w-4 text-green-500" />;
    }
  };

  const getAlertBgColor = (level: string) => {
    switch (level) {
      case 'critical': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'error': return 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800';
      case 'warning': return 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800';
      case 'info': return 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800';
      default: return 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800';
    }
  };

  const getRiskColor = (level: string) => {
    switch (level) {
      case 'high': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      case 'medium': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'low': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getMetricColor = (value: number, thresholds: { warning: number; critical: number }) => {
    if (value >= thresholds.critical) return 'text-red-500';
    if (value >= thresholds.warning) return 'text-yellow-500';
    return 'text-green-500';
  };

  const resolveAlert = (alertId: string) => {
    setAlerts(prev => prev.map(alert => 
      alert.id === alertId ? { ...alert, resolved: true } : alert
    ));
  };

  const unresolvedAlerts = alerts.filter(alert => !alert.resolved);
  const criticalAlerts = unresolvedAlerts.filter(alert => alert.level === 'critical' || alert.level === 'error');

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className={cn(
            "h-9 w-9 apple-button relative",
            criticalAlerts.length > 0 && "border-red-500/50 bg-red-500/10"
          )}
          title="Echo AI System Administrator"
        >
          <div className="relative">
            <Shield className="h-4 w-4" />
            {criticalAlerts.length > 0 && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full flex items-center justify-center">
                <span className="text-xs text-white font-bold">{criticalAlerts.length}</span>
              </div>
            )}
            <div className="absolute -bottom-1 -right-1 w-2 h-2 bg-green-500 rounded-full animate-pulse" />
          </div>
        </Button>
      </DialogTrigger>
      <DialogContent className="glass-panel max-w-7xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center">
            <div className="p-2 bg-gradient-to-br from-green-500 to-blue-500 rounded-lg mr-3">
              <Shield className="h-6 w-6 text-white" />
            </div>
            Echo AI System Administrator
            <div className="flex items-center ml-3">
              <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse mr-2" />
              <Badge variant="outline" className="bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-300">
                System Active
              </Badge>
            </div>
          </DialogTitle>
          <DialogDescription>
            Advanced AI monitoring, security, and system administration for the hospitality CRM platform.
            Echo ensures optimal performance, data security, and system integrity.
          </DialogDescription>
        </DialogHeader>

        <div className="mb-4">
          <Alert className="border-green-500/50 bg-green-500/10">
            <Brain className="h-4 w-4 text-green-500" />
            <AlertTitle className="flex items-center">
              Echo Neural Network Status: Optimal
              <div className="flex items-center ml-2">
                <Activity className="h-3 w-3 text-green-500 mr-1" />
                <span className="text-xs">Real-time monitoring active</span>
              </div>
            </AlertTitle>
            <AlertDescription>
              All system components operating within normal parameters. AI services synchronized and responsive.
            </AlertDescription>
          </Alert>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-6">
            <TabsTrigger value="overview" className="flex items-center">
              <Activity className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="alerts" className="flex items-center">
              <Bell className="h-4 w-4 mr-2" />
              Alerts ({unresolvedAlerts.length})
            </TabsTrigger>
            <TabsTrigger value="security" className="flex items-center">
              <ShieldCheck className="h-4 w-4 mr-2" />
              Security
            </TabsTrigger>
            <TabsTrigger value="performance" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance
            </TabsTrigger>
            <TabsTrigger value="ai-services" className="flex items-center">
              <Bot className="h-4 w-4 mr-2" />
              AI Services
            </TabsTrigger>
            <TabsTrigger value="navigation" className="flex items-center">
              <Navigation className="h-4 w-4 mr-2" />
              Navigation
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6 mt-6">
            {/* System Health Overview */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">System Health</p>
                      <p className="text-2xl font-bold text-green-500">98.7%</p>
                    </div>
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Users</p>
                      <p className="text-2xl font-bold text-blue-500">{systemMetrics.activeUsers}</p>
                    </div>
                    <Users className="h-6 w-6 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Response Time</p>
                      <p className={cn(
                        "text-2xl font-bold",
                        getMetricColor(systemMetrics.responseTime, { warning: 200, critical: 300 })
                      )}>
                        {systemMetrics.responseTime}ms
                      </p>
                    </div>
                    <Zap className="h-6 w-6 text-yellow-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">API Calls/Hour</p>
                      <p className="text-2xl font-bold text-purple-500">{systemMetrics.apiCalls}</p>
                    </div>
                    <Network className="h-6 w-6 text-purple-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Resource Utilization */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Server className="h-5 w-5 mr-2" />
                  Resource Utilization
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Cpu className="h-4 w-4 mr-2 text-blue-500" />
                        <span className="text-sm">CPU Usage</span>
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        getMetricColor(systemMetrics.cpu, { warning: 70, critical: 85 })
                      )}>
                        {systemMetrics.cpu}%
                      </span>
                    </div>
                    <Progress value={systemMetrics.cpu} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <MemoryStick className="h-4 w-4 mr-2 text-green-500" />
                        <span className="text-sm">Memory Usage</span>
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        getMetricColor(systemMetrics.memory, { warning: 75, critical: 90 })
                      )}>
                        {systemMetrics.memory}%
                      </span>
                    </div>
                    <Progress value={systemMetrics.memory} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <HardDrive className="h-4 w-4 mr-2 text-purple-500" />
                        <span className="text-sm">Storage Usage</span>
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        getMetricColor(systemMetrics.storage, { warning: 80, critical: 95 })
                      )}>
                        {systemMetrics.storage}%
                      </span>
                    </div>
                    <Progress value={systemMetrics.storage} className="h-2" />
                  </div>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <Wifi className="h-4 w-4 mr-2 text-orange-500" />
                        <span className="text-sm">Network Load</span>
                      </div>
                      <span className={cn(
                        "text-sm font-medium",
                        getMetricColor(systemMetrics.network, { warning: 80, critical: 95 })
                      )}>
                        {systemMetrics.network}%
                      </span>
                    </div>
                    <Progress value={systemMetrics.network} className="h-2" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="alerts" className="space-y-4 mt-6">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-medium">System Alerts</h3>
              <Button size="sm" variant="outline">
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
            </div>

            <div className="space-y-3">
              {alerts.map((alert) => (
                <Card key={alert.id} className={cn("glass-panel", getAlertBgColor(alert.level))}>
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start space-x-3">
                        {getAlertIcon(alert.level)}
                        <div className="flex-1">
                          <div className="flex items-center space-x-2 mb-1">
                            <h4 className="font-medium">{alert.title}</h4>
                            <Badge variant="outline" className="text-xs capitalize">
                              {alert.category}
                            </Badge>
                            {alert.resolved && (
                              <Badge className="text-xs bg-green-100 text-green-700">
                                Resolved
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">{alert.message}</p>
                          <p className="text-xs text-muted-foreground">
                            {alert.timestamp.toLocaleString()}
                          </p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        {alert.action && !alert.resolved && (
                          <Button size="sm" variant="outline">
                            {alert.action}
                          </Button>
                        )}
                        {!alert.resolved && (
                          <Button 
                            size="sm" 
                            variant="ghost"
                            onClick={() => resolveAlert(alert.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="security" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Security Score</p>
                      <p className="text-2xl font-bold text-green-500">A+</p>
                    </div>
                    <ShieldCheck className="h-6 w-6 text-green-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Active Sessions</p>
                      <p className="text-2xl font-bold text-blue-500">12</p>
                    </div>
                    <Lock className="h-6 w-6 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-muted-foreground">Threats Blocked</p>
                      <p className="text-2xl font-bold text-red-500">0</p>
                    </div>
                    <ShieldAlert className="h-6 w-6 text-red-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Eye className="h-5 w-5 mr-2" />
                  Recent Security Events
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {securityEvents.map((event) => (
                    <div key={event.id} className="flex items-start justify-between p-3 bg-muted/20 rounded-lg">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-1">
                          <span className="font-medium text-sm">{event.user}</span>
                          <Badge className={cn("text-xs", getRiskColor(event.riskLevel))}>
                            {event.riskLevel} risk
                          </Badge>
                          <Badge variant="outline" className="text-xs capitalize">
                            {event.type.replace('_', ' ')}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground mb-1">{event.action}</p>
                        <p className="text-xs text-muted-foreground">
                          {event.timestamp.toLocaleString()} • {event.location}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="performance" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Performance Trends
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Average Response Time:</span>
                      <span className="font-medium">{systemMetrics.responseTime}ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Uptime (30 days):</span>
                      <span className="font-medium text-green-500">{systemMetrics.uptime}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>API Success Rate:</span>
                      <span className="font-medium text-green-500">99.2%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Error Rate:</span>
                      <span className="font-medium text-green-500">0.8%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="h-5 w-5 mr-2" />
                    Database Performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                      <span>Query Performance:</span>
                      <span className="font-medium text-green-500">Optimal</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Backup Status:</span>
                      <span className="font-medium text-green-500">Current</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Replication Lag:</span>
                      <span className="font-medium">2ms</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Connection Pool:</span>
                      <span className="font-medium">45/100</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="ai-services" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Bot className="h-5 w-5 mr-2" />
                    Enhanced AI Sales Assistant
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <Badge className="bg-green-100 text-green-700">Enhanced</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Context Awareness:</span>
                      <span className="font-medium text-green-500">Advanced</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Industry Knowledge:</span>
                      <span className="font-medium text-green-500">Expert Level</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Suggestion Accuracy:</span>
                      <span className="font-medium text-green-500">96%</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => setShowEnhancedAI(true)}
                    className="w-full mt-3"
                    size="sm"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Launch AI Assistant
                  </Button>
                  <div className="text-xs text-muted-foreground">
                    Context-aware assistant that understands corporate policies, dietary restrictions, and industry best practices.
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Scan className="h-5 w-5 mr-2" />
                    Menu Parser AI
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Parsing Queue:</span>
                      <span className="font-medium">2 items</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Accuracy Rate:</span>
                      <span className="font-medium text-green-500">92%</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Processing Time:</span>
                      <span className="font-medium">avg 45s</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Analytics AI
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <Badge className="bg-green-100 text-green-700">Active</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Data Points Analyzed:</span>
                      <span className="font-medium">2.3M today</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Insights Generated:</span>
                      <span className="font-medium">12</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Model Accuracy:</span>
                      <span className="font-medium text-green-500">96.7%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Shield className="h-5 w-5 mr-2" />
                    Echo Core System
                  </CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <Badge className="bg-green-100 text-green-700">Monitoring</Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <span>Neural Network:</span>
                      <span className="font-medium text-green-500">Optimal</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Security Scans:</span>
                      <span className="font-medium">Every 30s</span>
                    </div>
                    <div className="flex justify-between">
                      <span>System Integrity:</span>
                      <span className="font-medium text-green-500">100%</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Terminal className="h-5 w-5 mr-2" />
                  Echo Command Interface
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-black/90 text-green-400 p-4 rounded-lg font-mono text-sm">
                  <div className="space-y-1">
                    <div>echo@system:~$ system status check</div>
                    <div className="text-green-300">✓ All systems operational</div>
                    <div className="text-green-300">✓ AI services synchronized</div>
                    <div className="text-green-300">✓ Security protocols active</div>
                    <div className="text-green-300">✓ Performance within optimal range</div>
                    <div>echo@system:~$ ai_health_check</div>
                    <div className="text-green-300">Sales Assistant: ACTIVE | Processing: 3 requests</div>
                    <div className="text-green-300">Menu Parser: ACTIVE | Queue: 2 items</div>
                    <div className="text-green-300">Analytics Engine: ACTIVE | Learning: enabled</div>
                    <div>echo@system:~$ <span className="animate-pulse">_</span></div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="navigation" className="space-y-4 mt-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Navigation className="h-5 w-5 mr-2" />
                    Interactive Tutorials
                  </CardTitle>
                  <CardDescription>
                    Learn how to navigate and use EchoCRM with guided tutorials
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <Button
                    onClick={() => setShowNavigationTutorial(true)}
                    className="w-full"
                  >
                    <Play className="h-4 w-4 mr-2" />
                    Launch Tutorial Center
                  </Button>
                  <div className="text-sm text-muted-foreground">
                    Interactive tutorials with visual arrows and step-by-step guidance
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Compass className="h-5 w-5 mr-2" />
                    Quick Navigation
                  </CardTitle>
                  <CardDescription>
                    Instantly jump to any section with AI assistance
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTutorialPath('basic-navigation');
                        setShowNavigationTutorial(true);
                        setIsOpen(false);
                      }}
                    >
                      <Route className="h-3 w-3 mr-1" />
                      Basic Tour
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTutorialPath('events-workflow');
                        setShowNavigationTutorial(true);
                        setIsOpen(false);
                      }}
                    >
                      <MapPin className="h-3 w-3 mr-1" />
                      Events
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTutorialPath('sales-meeting-demo');
                        setShowNavigationTutorial(true);
                        setIsOpen(false);
                      }}
                    >
                      <Navigation className="h-3 w-3 mr-1" />
                      Sales Meeting
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedTutorialPath('analytics-insights');
                        setShowNavigationTutorial(true);
                        setIsOpen(false);
                      }}
                    >
                      <BarChart3 className="h-3 w-3 mr-1" />
                      Analytics
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Brain className="h-5 w-5 mr-2" />
                  AI Navigation Assistant
                </CardTitle>
                <CardDescription>
                  Echo can help you find any feature or page in the application
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted/30 rounded-lg p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 bg-primary/10 rounded-full flex items-center justify-center">
                      <Shield className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-medium mb-1">Echo Navigation AI</div>
                      <div className="text-sm text-muted-foreground mb-2">
                        Ask me to help you navigate to any feature. I can provide visual guidance with arrows and highlights.
                      </div>
                      <div className="text-xs text-muted-foreground">
                        Try: "Show me how to create a new event" or "Guide me to the analytics page"
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-2">
                  <div className="text-sm font-medium">Recent Navigation Requests:</div>
                  <div className="space-y-1 text-sm text-muted-foreground">
                    <div>• "How do I access the sales meeting whiteboard?"</div>
                    <div>• "Where can I view event analytics?"</div>
                    <div>• "Show me the contact management features"</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Navigation Tutorial */}
        <NavigationTutorial
          isOpen={showNavigationTutorial}
          onClose={() => {
            setShowNavigationTutorial(false);
            setSelectedTutorialPath('');
          }}
          selectedPath={selectedTutorialPath}
        />

        {/* Enhanced AI Sales Assistant */}
        <EnhancedAISalesAssistant
          isOpen={showEnhancedAI}
          onClose={() => setShowEnhancedAI(false)}
        />
      </DialogContent>
    </Dialog>
  );
}
