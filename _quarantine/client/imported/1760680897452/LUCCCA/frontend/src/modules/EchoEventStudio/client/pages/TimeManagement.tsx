import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  Clock,
  Timer,
  BarChart3,
  Activity,
  Target,
  Users,
  Calendar,
  TrendingUp,
  Award,
  Focus,
  Coffee,
  Download,
  Settings,
  RefreshCw,
  Eye,
  Play,
  Pause,
  Square,
  CheckCircle,
  AlertCircle,
  Zap,
  BookOpen,
  Brain,
  Lightbulb,
} from "lucide-react";
import { cn } from "@/lib/utils";
import TimeTracking from "@/components/TimeTracking";
import ProductivityDashboard from "@/components/ProductivityDashboard";
import ActivityLogger from "@/components/ActivityLogger";
import {
  TimeEntry,
  ActivityLog,
  ProductivityMetrics,
  TeamProductivity,
} from "@shared/time-management-types";

interface TimeManagementProps {
  userId?: string;
  userRole?: 'employee' | 'manager' | 'director';
}

export default function TimeManagement({ 
  userId = "current-user",
  userRole = 'employee'
}: TimeManagementProps) {
  const [activeTab, setActiveTab] = useState('tracker');
  const [timeEntries, setTimeEntries] = useState<TimeEntry[]>([]);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month'>('today');

  // Dashboard metrics (mock data - in real app, this would come from API)
  const todayMetrics = {
    hoursWorked: 6.5,
    tasksCompleted: 12,
    focusScore: 78,
    breaksTaken: 3,
    topCategory: "Sales Activities",
    efficiency: 0.73,
  };

  const weeklyGoals = {
    hoursTarget: 40,
    hoursActual: 32.5,
    tasksTarget: 60,
    tasksActual: 48,
    focusTarget: 80,
    focusActual: 76,
  };

  const insights = [
    {
      type: "positive" as const,
      title: "Strong Focus Sessions",
      description: "Your focus score improved by 12% this week",
      icon: Focus,
      action: "Continue using focus sessions for deep work",
    },
    {
      type: "warning" as const,
      title: "Afternoon Productivity Dip",
      description: "Productivity drops 30% after 2 PM",
      icon: TrendingUp,
      action: "Try scheduling important tasks in the morning",
    },
    {
      type: "info" as const,
      title: "Meeting Heavy Days",
      description: "Tuesdays and Thursdays have 40% more meetings",
      icon: Calendar,
      action: "Consider blocking time for focused work on these days",
    },
  ];

  const handleTimeEntryUpdate = useCallback((entry: TimeEntry) => {
    setTimeEntries(prev => [entry, ...prev]);
  }, []);

  const handleActivityLog = useCallback((activity: ActivityLog) => {
    setActivities(prev => [activity, ...prev]);
  }, []);

  const exportData = useCallback((type: string) => {
    console.log(`Exporting ${type} data...`);
    // In real app, implement actual export functionality
  }, []);

  const hoursProgress = (todayMetrics.hoursWorked / 8) * 100;
  const tasksProgress = (todayMetrics.tasksCompleted / 15) * 100;
  const weeklyHoursProgress = (weeklyGoals.hoursActual / weeklyGoals.hoursTarget) * 100;

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b">
        <div className="container mx-auto px-4 py-6">
          <div className="flex justify-between items-start">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Time Management</h1>
              <p className="text-muted-foreground mt-2">
                Track your time, monitor productivity, and optimize your workflow
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline">
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={() => exportData('timesheet')}>
                    Export Timesheet
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('activity')}>
                    Export Activity Log
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => exportData('report')}>
                    Export Productivity Report
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Quick Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Today's Hours</p>
                  <p className="text-2xl font-bold">{todayMetrics.hoursWorked}h</p>
                  <Progress value={hoursProgress} className="mt-2 h-2" />
                </div>
                <Clock className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Tasks Completed</p>
                  <p className="text-2xl font-bold">{todayMetrics.tasksCompleted}</p>
                  <Progress value={tasksProgress} className="mt-2 h-2" />
                </div>
                <CheckCircle className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Focus Score</p>
                  <p className="text-2xl font-bold">{todayMetrics.focusScore}%</p>
                  <p className="text-xs text-green-600 mt-1">+5% from yesterday</p>
                </div>
                <Focus className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Efficiency</p>
                  <p className="text-2xl font-bold">{Math.round(todayMetrics.efficiency * 100)}%</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {todayMetrics.efficiency.toFixed(2)} tasks/hour
                  </p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Weekly Progress */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Weekly Goals Progress
            </CardTitle>
            <CardDescription>
              Track your progress against weekly targets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Hours Worked</span>
                  <span className="text-sm text-muted-foreground">
                    {weeklyGoals.hoursActual}h / {weeklyGoals.hoursTarget}h
                  </span>
                </div>
                <Progress value={weeklyHoursProgress} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round(weeklyHoursProgress)}% of weekly target
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Tasks Completed</span>
                  <span className="text-sm text-muted-foreground">
                    {weeklyGoals.tasksActual} / {weeklyGoals.tasksTarget}
                  </span>
                </div>
                <Progress value={(weeklyGoals.tasksActual / weeklyGoals.tasksTarget) * 100} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((weeklyGoals.tasksActual / weeklyGoals.tasksTarget) * 100)}% of weekly target
                </p>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium">Focus Score</span>
                  <span className="text-sm text-muted-foreground">
                    {weeklyGoals.focusActual}% / {weeklyGoals.focusTarget}%
                  </span>
                </div>
                <Progress value={(weeklyGoals.focusActual / weeklyGoals.focusTarget) * 100} className="h-3" />
                <p className="text-xs text-muted-foreground mt-1">
                  {Math.round((weeklyGoals.focusActual / weeklyGoals.focusTarget) * 100)}% of target
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* AI Insights */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5" />
              AI Productivity Insights
            </CardTitle>
            <CardDescription>
              Personalized recommendations based on your work patterns
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {insights.map((insight, index) => {
                const IconComponent = insight.icon;
                const colors = {
                  positive: "border-green-200 bg-green-50",
                  warning: "border-yellow-200 bg-yellow-50", 
                  info: "border-blue-200 bg-blue-50",
                  negative: "border-red-200 bg-red-50",
                };
                
                return (
                  <div key={index} className={cn("p-4 rounded-lg border", colors[insight.type])}>
                    <div className="flex items-start gap-3">
                      <IconComponent className="h-5 w-5 mt-0.5 text-current" />
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{insight.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {insight.description}
                        </p>
                        <p className="text-xs font-medium mt-2">
                          💡 {insight.action}
                        </p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>

        {/* Main Content Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="tracker" className="flex items-center gap-2">
              <Timer className="h-4 w-4" />
              Time Tracker
            </TabsTrigger>
            <TabsTrigger value="activity" className="flex items-center gap-2">
              <Activity className="h-4 w-4" />
              Activity Log
            </TabsTrigger>
            {(userRole === 'manager' || userRole === 'director') && (
              <TabsTrigger value="dashboard" className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                Team Dashboard
              </TabsTrigger>
            )}
            <TabsTrigger value="reports" className="flex items-center gap-2">
              <BookOpen className="h-4 w-4" />
              Reports
            </TabsTrigger>
          </TabsList>

          <TabsContent value="tracker">
            <TimeTracking 
              userId={userId}
              onTimeEntryUpdate={handleTimeEntryUpdate}
            />
          </TabsContent>

          <TabsContent value="activity">
            <ActivityLogger 
              userId={userId}
              showRealTime={true}
              onActivityLog={handleActivityLog}
            />
          </TabsContent>

          {(userRole === 'manager' || userRole === 'director') && (
            <TabsContent value="dashboard">
              <ProductivityDashboard 
                teamId="main-team"
                onExportReport={exportData}
              />
            </TabsContent>
          )}

          <TabsContent value="reports">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BookOpen className="h-5 w-5" />
                  Time Reports & Analytics
                </CardTitle>
                <CardDescription>
                  Generate detailed reports and analyze your productivity trends
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Report Generation */}
                  <div>
                    <h4 className="font-medium mb-4">Generate Reports</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <Button variant="outline" className="h-auto p-4">
                        <div className="text-center">
                          <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <div className="font-medium">Time Summary</div>
                          <div className="text-xs text-muted-foreground">
                            Hours by category & project
                          </div>
                        </div>
                      </Button>

                      <Button variant="outline" className="h-auto p-4">
                        <div className="text-center">
                          <Activity className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <div className="font-medium">Activity Report</div>
                          <div className="text-xs text-muted-foreground">
                            Detailed activity breakdown
                          </div>
                        </div>
                      </Button>

                      <Button variant="outline" className="h-auto p-4">
                        <div className="text-center">
                          <BarChart3 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                          <div className="font-medium">Productivity Analysis</div>
                          <div className="text-xs text-muted-foreground">
                            Trends & insights
                          </div>
                        </div>
                      </Button>
                    </div>
                  </div>

                  {/* Recent Reports */}
                  <div>
                    <h4 className="font-medium mb-4">Recent Reports</h4>
                    <div className="space-y-3">
                      {[
                        { name: "Weekly Time Summary", date: "2024-01-15", type: "PDF", size: "234 KB" },
                        { name: "Activity Log Export", date: "2024-01-12", type: "CSV", size: "156 KB" },
                        { name: "Productivity Report", date: "2024-01-10", type: "PDF", size: "1.2 MB" },
                      ].map((report, index) => (
                        <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                              <BookOpen className="h-4 w-4 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{report.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {report.date} • {report.type} • {report.size}
                              </div>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm">
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
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
    </div>
  );
}
