import { useState, useCallback, useEffect, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Activity,
  Eye,
  Edit,
  Plus,
  Trash2,
  Search,
  Filter,
  Download,
  Clock,
  User,
  Monitor,
  MousePointer,
  Keyboard,
  Wifi,
  WifiOff,
  AlertCircle,
  CheckCircle,
  XCircle,
  Navigation,
  Coffee,
  LogIn,
  LogOut,
  FileText,
  Calendar,
  BarChart3,
  Settings,
  Users,
  Target,
  MoreVertical,
  RefreshCw,
  Pause,
  Play,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ActivityLog,
  ActivityAction,
  SystemModule,
} from "@shared/time-management-types";

interface ActivityLoggerProps {
  userId?: string;
  showRealTime?: boolean;
  onActivityLog?: (activity: ActivityLog) => void;
}

interface ActivityFilter {
  user?: string;
  module?: SystemModule;
  action?: ActivityAction;
  dateRange?: { start: Date; end: Date };
}

export default function ActivityLogger({ 
  userId = "current-user", 
  showRealTime = true,
  onActivityLog 
}: ActivityLoggerProps) {
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [isTracking, setIsTracking] = useState(true);
  const [filter, setFilter] = useState<ActivityFilter>({});
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedView, setSelectedView] = useState<'timeline' | 'summary' | 'patterns'>('timeline');
  
  // Real-time tracking state
  const [currentActivity, setCurrentActivity] = useState<Partial<ActivityLog> | null>(null);
  const [idleTime, setIdleTime] = useState(0);
  const [isIdle, setIsIdle] = useState(false);
  const [lastActivity, setLastActivity] = useState<Date>(new Date());

  // Settings
  const [trackingSettings, setTrackingSettings] = useState({
    trackMouse: true,
    trackKeyboard: true,
    trackNavigation: true,
    trackIdle: true,
    idleThreshold: 5, // minutes
    autoLog: true,
    detailedLogging: false,
  });

  // Mock activity data
  const mockActivities: ActivityLog[] = [
    {
      id: "1",
      userId,
      timestamp: new Date(Date.now() - 1000 * 60 * 5),
      action: "view",
      module: "sales-pipeline",
      details: { page: "deals", dealId: "deal-123" },
      duration: 120,
    },
    {
      id: "2",
      userId,
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      action: "edit",
      module: "events",
      details: { eventId: "event-456", field: "venue" },
      duration: 300,
    },
    {
      id: "3",
      userId,
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      action: "create",
      module: "contacts",
      details: { contactId: "contact-789", type: "lead" },
      duration: 180,
    },
    {
      id: "4",
      userId,
      timestamp: new Date(Date.now() - 1000 * 60 * 20),
      action: "search",
      module: "beo-management",
      details: { query: "banquet setup", results: 12 },
      duration: 45,
    },
    {
      id: "5",
      userId,
      timestamp: new Date(Date.now() - 1000 * 60 * 25),
      action: "navigate",
      module: "calendar",
      details: { from: "/events", to: "/calendar" },
      duration: 5,
    },
  ];

  useEffect(() => {
    if (showRealTime) {
      setActivities(mockActivities);
    }
  }, [showRealTime]);

  // Activity tracking hooks
  useEffect(() => {
    if (!isTracking) return;

    const handleActivity = () => {
      setLastActivity(new Date());
      setIdleTime(0);
      setIsIdle(false);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => {
      if (trackingSettings.trackMouse || trackingSettings.trackKeyboard) {
        document.addEventListener(event, handleActivity);
      }
    });

    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity);
      });
    };
  }, [isTracking, trackingSettings]);

  // Idle detection
  useEffect(() => {
    if (!trackingSettings.trackIdle) return;

    const interval = setInterval(() => {
      const now = new Date();
      const timeSinceLastActivity = (now.getTime() - lastActivity.getTime()) / (1000 * 60);
      
      if (timeSinceLastActivity >= trackingSettings.idleThreshold) {
        if (!isIdle) {
          setIsIdle(true);
          logActivity('idle', 'time-management', { 
            idleStart: lastActivity,
            idleDuration: timeSinceLastActivity 
          });
        }
        setIdleTime(timeSinceLastActivity);
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [lastActivity, trackingSettings.trackIdle, trackingSettings.idleThreshold, isIdle]);

  const logActivity = useCallback((
    action: ActivityAction,
    module: SystemModule,
    details: Record<string, any> = {},
    duration?: number
  ) => {
    if (!isTracking) return;

    const activity: ActivityLog = {
      id: Date.now().toString(),
      userId,
      timestamp: new Date(),
      action,
      module,
      details,
      duration,
    };

    setActivities(prev => [activity, ...prev].slice(0, 1000)); // Keep only last 1000 activities
    onActivityLog?.(activity);

    if (trackingSettings.autoLog) {
      console.log(`Activity logged: ${action} in ${module}`, details);
    }
  }, [isTracking, userId, onActivityLog, trackingSettings.autoLog]);

  const getActionIcon = useCallback((action: ActivityAction) => {
    const iconMap = {
      login: LogIn,
      logout: LogOut,
      create: Plus,
      edit: Edit,
      delete: Trash2,
      view: Eye,
      export: Download,
      import: Download,
      search: Search,
      navigate: Navigation,
      idle: Coffee,
      focus: Target,
      break: Pause,
    };
    return iconMap[action] || Activity;
  }, []);

  const getModuleIcon = useCallback((module: SystemModule) => {
    const iconMap = {
      'sales-pipeline': Target,
      'beo-management': Calendar,
      'events': Calendar,
      'contacts': Users,
      'calendar': Calendar,
      'analytics': BarChart3,
      'admin': Settings,
      'settings': Settings,
      'gantt': BarChart3,
      'time-management': Clock,
    };
    return iconMap[module] || Activity;
  }, []);

  const getActionColor = useCallback((action: ActivityAction) => {
    const colorMap = {
      login: "text-green-600",
      logout: "text-red-600",
      create: "text-blue-600",
      edit: "text-yellow-600",
      delete: "text-red-600",
      view: "text-gray-600",
      export: "text-purple-600",
      import: "text-purple-600",
      search: "text-blue-600",
      navigate: "text-gray-500",
      idle: "text-orange-600",
      focus: "text-green-600",
      break: "text-yellow-600",
    };
    return colorMap[action] || "text-gray-600";
  }, []);

  const filteredActivities = useMemo(() => {
    return activities.filter(activity => {
      if (filter.user && activity.userId !== filter.user) return false;
      if (filter.module && activity.module !== filter.module) return false;
      if (filter.action && activity.action !== filter.action) return false;
      if (searchTerm && !activity.details && 
          !Object.values(activity.details || {}).some(value => 
            String(value).toLowerCase().includes(searchTerm.toLowerCase())
          )) return false;
      return true;
    });
  }, [activities, filter, searchTerm]);

  const activitySummary = useMemo(() => {
    const summary = filteredActivities.reduce((acc, activity) => {
      const key = `${activity.module}-${activity.action}`;
      if (!acc[key]) {
        acc[key] = {
          module: activity.module,
          action: activity.action,
          count: 0,
          totalDuration: 0,
          lastActivity: activity.timestamp,
        };
      }
      acc[key].count++;
      acc[key].totalDuration += activity.duration || 0;
      if (activity.timestamp > acc[key].lastActivity) {
        acc[key].lastActivity = activity.timestamp;
      }
      return acc;
    }, {} as Record<string, any>);

    return Object.values(summary).sort((a: any, b: any) => b.count - a.count);
  }, [filteredActivities]);

  const toggleTracking = useCallback(() => {
    setIsTracking(prev => !prev);
    logActivity(isTracking ? 'logout' : 'login', 'time-management', {
      trackingEnabled: !isTracking
    });
  }, [isTracking, logActivity]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Activity Logger
            {isTracking && (
              <Badge variant="secondary" className="ml-2">
                <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse" />
                Recording
              </Badge>
            )}
          </h3>
          <p className="text-sm text-muted-foreground">
            Track and analyze user activity patterns
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Switch
            checked={isTracking}
            onCheckedChange={toggleTracking}
            className="data-[state=checked]:bg-green-600"
          />
          <Label htmlFor="tracking" className="text-sm">
            {isTracking ? 'Stop Tracking' : 'Start Tracking'}
          </Label>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-64">
              <DropdownMenuLabel>Tracking Settings</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <div className="p-2 space-y-3">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Mouse Activity</Label>
                  <Switch
                    checked={trackingSettings.trackMouse}
                    onCheckedChange={(checked) => 
                      setTrackingSettings(prev => ({...prev, trackMouse: checked}))
                    }
                    size="sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Keyboard Activity</Label>
                  <Switch
                    checked={trackingSettings.trackKeyboard}
                    onCheckedChange={(checked) => 
                      setTrackingSettings(prev => ({...prev, trackKeyboard: checked}))
                    }
                    size="sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Navigation</Label>
                  <Switch
                    checked={trackingSettings.trackNavigation}
                    onCheckedChange={(checked) => 
                      setTrackingSettings(prev => ({...prev, trackNavigation: checked}))
                    }
                    size="sm"
                  />
                </div>
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Idle Detection</Label>
                  <Switch
                    checked={trackingSettings.trackIdle}
                    onCheckedChange={(checked) => 
                      setTrackingSettings(prev => ({...prev, trackIdle: checked}))
                    }
                    size="sm"
                  />
                </div>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Current Status */}
      {isTracking && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  {isIdle ? (
                    <Coffee className="h-4 w-4 text-orange-500" />
                  ) : (
                    <div className="w-4 h-4 bg-green-500 rounded-full animate-pulse" />
                  )}
                  <span className="text-sm font-medium">
                    {isIdle ? `Idle for ${Math.round(idleTime)}m` : 'Active'}
                  </span>
                </div>
                
                <div className="text-sm text-muted-foreground">
                  Last activity: {lastActivity.toLocaleTimeString()}
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1">
                  <Monitor className="h-4 w-4" />
                  <span>{trackingSettings.trackMouse ? 'ON' : 'OFF'}</span>
                </div>
                <div className="flex items-center gap-1">
                  <Keyboard className="h-4 w-4" />
                  <span>{trackingSettings.trackKeyboard ? 'ON' : 'OFF'}</span>
                </div>
                <div className="flex items-center gap-1">
                  {isTracking ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
                  <span>Tracking</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <div className="flex-1">
              <Input
                placeholder="Search activity details..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full"
              />
            </div>
            
            <Select value={filter.module || ''} onValueChange={(v) => setFilter(prev => ({...prev, module: v as SystemModule || undefined}))}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filter by module" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Modules</SelectItem>
                <SelectItem value="sales-pipeline">Sales Pipeline</SelectItem>
                <SelectItem value="beo-management">BEO Management</SelectItem>
                <SelectItem value="events">Events</SelectItem>
                <SelectItem value="contacts">Contacts</SelectItem>
                <SelectItem value="calendar">Calendar</SelectItem>
                <SelectItem value="analytics">Analytics</SelectItem>
              </SelectContent>
            </Select>

            <Select value={filter.action || ''} onValueChange={(v) => setFilter(prev => ({...prev, action: v as ActivityAction || undefined}))}>
              <SelectTrigger className="w-32">
                <SelectValue placeholder="Action" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Actions</SelectItem>
                <SelectItem value="view">View</SelectItem>
                <SelectItem value="edit">Edit</SelectItem>
                <SelectItem value="create">Create</SelectItem>
                <SelectItem value="delete">Delete</SelectItem>
                <SelectItem value="search">Search</SelectItem>
                <SelectItem value="navigate">Navigate</SelectItem>
              </SelectContent>
            </Select>

            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Activity Views */}
      <Tabs value={selectedView} onValueChange={(v) => setSelectedView(v as any)}>
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="summary">Summary</TabsTrigger>
          <TabsTrigger value="patterns">Patterns</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline">
          <Card>
            <CardHeader>
              <CardTitle>Activity Timeline</CardTitle>
              <CardDescription>
                Real-time log of user activities ({filteredActivities.length} entries)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-2">
                  {filteredActivities.length === 0 ? (
                    <div className="text-center text-muted-foreground py-8">
                      No activities found matching your filters
                    </div>
                  ) : (
                    filteredActivities.map((activity) => {
                      const ActionIcon = getActionIcon(activity.action);
                      const ModuleIcon = getModuleIcon(activity.module);
                      const actionColor = getActionColor(activity.action);
                      
                      return (
                        <div key={activity.id} className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50">
                          <div className="flex items-center gap-2">
                            <ActionIcon className={cn("h-4 w-4", actionColor)} />
                            <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                          </div>
                          
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium capitalize">{activity.action}</span>
                              <span className="text-muted-foreground">in</span>
                              <Badge variant="outline" className="text-xs">
                                {activity.module.replace('-', ' ')}
                              </Badge>
                            </div>
                            
                            {Object.keys(activity.details || {}).length > 0 && (
                              <div className="text-xs text-muted-foreground mt-1">
                                {Object.entries(activity.details || {}).map(([key, value]) => (
                                  <span key={key} className="mr-3">
                                    {key}: {String(value)}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="text-right text-xs text-muted-foreground">
                            <div>{activity.timestamp.toLocaleTimeString()}</div>
                            {activity.duration && (
                              <div>{activity.duration}s</div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="summary">
          <Card>
            <CardHeader>
              <CardTitle>Activity Summary</CardTitle>
              <CardDescription>
                Aggregated view of activities by module and action
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {activitySummary.map((item: any, index) => {
                  const ActionIcon = getActionIcon(item.action);
                  const ModuleIcon = getModuleIcon(item.module);
                  const actionColor = getActionColor(item.action);
                  
                  return (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <ActionIcon className={cn("h-4 w-4", actionColor)} />
                          <ModuleIcon className="h-4 w-4 text-muted-foreground" />
                        </div>
                        
                        <div>
                          <div className="font-medium">
                            {item.action} in {item.module.replace('-', ' ')}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            Last: {new Date(item.lastActivity).toLocaleString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <div className="font-medium">{item.count} times</div>
                        {item.totalDuration > 0 && (
                          <div className="text-sm text-muted-foreground">
                            {Math.round(item.totalDuration / 60)}m total
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="patterns">
          <Card>
            <CardHeader>
              <CardTitle>Usage Patterns</CardTitle>
              <CardDescription>
                Analyze activity patterns and productivity insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">{filteredActivities.length}</div>
                    <div className="text-sm text-muted-foreground">Total Activities</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {new Set(filteredActivities.map(a => a.module)).size}
                    </div>
                    <div className="text-sm text-muted-foreground">Modules Used</div>
                  </div>
                  <div className="text-center p-4 border rounded-lg">
                    <div className="text-2xl font-bold text-primary">
                      {Math.round(filteredActivities.reduce((sum, a) => sum + (a.duration || 0), 0) / 60)}m
                    </div>
                    <div className="text-sm text-muted-foreground">Total Time</div>
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-3">Most Active Modules</h4>
                  <div className="space-y-2">
                    {Object.entries(
                      filteredActivities.reduce((acc, activity) => {
                        acc[activity.module] = (acc[activity.module] || 0) + 1;
                        return acc;
                      }, {} as Record<string, number>)
                    )
                    .sort(([,a], [,b]) => b - a)
                    .slice(0, 5)
                    .map(([module, count]) => (
                      <div key={module} className="flex items-center justify-between">
                        <span className="capitalize">{module.replace('-', ' ')}</span>
                        <Badge variant="secondary">{count} activities</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
