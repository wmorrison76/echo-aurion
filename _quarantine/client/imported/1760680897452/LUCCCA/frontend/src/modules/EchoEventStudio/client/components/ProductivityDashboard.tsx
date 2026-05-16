import { useState, useCallback, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
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
  BarChart3,
  TrendingUp,
  TrendingDown,
  Users,
  Clock,
  Target,
  Award,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  Eye,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  AlertTriangle,
  CheckCircle,
  Zap,
  Coffee,
  Focus,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  TeamProductivity,
  UserMetric,
  DepartmentMetric,
  ProductivityMetrics,
  CategoryTime,
  TimeReport,
  DailyTimeData,
} from "@shared/time-management-types";

interface ProductivityDashboardProps {
  teamId?: string;
  dateRange?: { start: Date; end: Date };
  onExportReport?: (reportType: string) => void;
}

export default function ProductivityDashboard({ 
  teamId = "main-team", 
  dateRange,
  onExportReport 
}: ProductivityDashboardProps) {
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'quarter'>('week');
  const [selectedDepartment, setSelectedDepartment] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'comparison'>('overview');

  // Mock data - in real app, this would come from API
  const teamProductivity: TeamProductivity = {
    teamId,
    date: new Date(),
    totalTeamHours: 324,
    averageHoursPerMember: 8.1,
    totalTasksCompleted: 156,
    teamFocusScore: 78,
    topPerformers: [
      {
        userId: "user1",
        userName: "Sarah Chen",
        avatar: "/avatars/sarah.jpg",
        hoursWorked: 42,
        tasksCompleted: 28,
        focusScore: 89,
        efficiency: 0.67,
      },
      {
        userId: "user2",
        userName: "Marcus Johnson",
        avatar: "/avatars/marcus.jpg",
        hoursWorked: 38,
        tasksCompleted: 25,
        focusScore: 82,
        efficiency: 0.66,
      },
      {
        userId: "user3",
        userName: "Elena Rodriguez",
        avatar: "/avatars/elena.jpg",
        hoursWorked: 40,
        tasksCompleted: 22,
        focusScore: 76,
        efficiency: 0.55,
      },
    ],
    categoryBreakdown: [
      { categoryId: "sales", categoryName: "Sales Activities", timeSpent: 1440, percentage: 35, color: "#10B981" },
      { categoryId: "events", categoryName: "Event Planning", timeSpent: 1080, percentage: 26, color: "#8B5CF6" },
      { categoryId: "customer-service", categoryName: "Customer Service", timeSpent: 720, percentage: 18, color: "#F59E0B" },
      { categoryId: "admin", categoryName: "Administrative", timeSpent: 480, percentage: 12, color: "#6B7280" },
      { categoryId: "meetings", categoryName: "Meetings", timeSpent: 360, percentage: 9, color: "#EF4444" },
    ],
    departmentBreakdown: [
      {
        departmentId: "sales",
        departmentName: "Sales",
        totalHours: 120,
        memberCount: 8,
        averageHours: 15,
        topCategories: [
          { categoryId: "sales", categoryName: "Sales Activities", timeSpent: 80, percentage: 67, color: "#10B981" },
          { categoryId: "admin", categoryName: "Administrative", timeSpent: 25, percentage: 21, color: "#6B7280" },
          { categoryId: "meetings", categoryName: "Meetings", timeSpent: 15, percentage: 12, color: "#EF4444" },
        ],
      },
      {
        departmentId: "events",
        departmentName: "Events",
        totalHours: 96,
        memberCount: 6,
        averageHours: 16,
        topCategories: [
          { categoryId: "events", categoryName: "Event Planning", timeSpent: 72, percentage: 75, color: "#8B5CF6" },
          { categoryId: "customer-service", categoryName: "Customer Service", timeSpent: 16, percentage: 17, color: "#F59E0B" },
          { categoryId: "admin", categoryName: "Administrative", timeSpent: 8, percentage: 8, color: "#6B7280" },
        ],
      },
      {
        departmentId: "operations",
        departmentName: "Operations",
        totalHours: 108,
        memberCount: 6,
        averageHours: 18,
        topCategories: [
          { categoryId: "admin", categoryName: "Administrative", timeSpent: 54, percentage: 50, color: "#6B7280" },
          { categoryId: "customer-service", categoryName: "Customer Service", timeSpent: 32, percentage: 30, color: "#F59E0B" },
          { categoryId: "meetings", categoryName: "Meetings", timeSpent: 22, percentage: 20, color: "#EF4444" },
        ],
      },
    ],
  };

  const weeklyData: DailyTimeData[] = [
    { date: new Date(2024, 0, 15), hours: 7.5, tasks: 12, focusScore: 82, topCategory: "Sales Activities" },
    { date: new Date(2024, 0, 16), hours: 8.2, tasks: 15, focusScore: 78, topCategory: "Event Planning" },
    { date: new Date(2024, 0, 17), hours: 6.8, tasks: 9, focusScore: 71, topCategory: "Sales Activities" },
    { date: new Date(2024, 0, 18), hours: 8.5, tasks: 18, focusScore: 85, topCategory: "Customer Service" },
    { date: new Date(2024, 0, 19), hours: 7.9, tasks: 14, focusScore: 79, topCategory: "Sales Activities" },
  ];

  const insights = [
    {
      type: "positive" as const,
      title: "Sales Team Productivity Up",
      description: "Sales team shows 15% increase in efficiency this week",
      icon: TrendingUp,
      color: "text-green-600",
    },
    {
      type: "warning" as const,
      title: "Meeting Overload",
      description: "Operations team spending 35% more time in meetings than target",
      icon: AlertTriangle,
      color: "text-yellow-600",
    },
    {
      type: "positive" as const,
      title: "Focus Sessions Rising",
      description: "Team completed 23% more focused work sessions this week",
      icon: Focus,
      color: "text-blue-600",
    },
    {
      type: "negative" as const,
      title: "Late Day Productivity",
      description: "Productivity drops 25% after 4 PM across all departments",
      icon: TrendingDown,
      color: "text-red-600",
    },
  ];

  const getPerformanceIcon = useCallback((current: number, previous: number) => {
    if (current > previous * 1.05) return { icon: ArrowUp, color: "text-green-600" };
    if (current < previous * 0.95) return { icon: ArrowDown, color: "text-red-600" };
    return { icon: Minus, color: "text-gray-600" };
  }, []);

  const getEfficiencyRating = useCallback((efficiency: number) => {
    if (efficiency >= 0.8) return { label: "Excellent", color: "bg-green-100 text-green-800" };
    if (efficiency >= 0.6) return { label: "Good", color: "bg-blue-100 text-blue-800" };
    if (efficiency >= 0.4) return { label: "Average", color: "bg-yellow-100 text-yellow-800" };
    return { label: "Needs Improvement", color: "bg-red-100 text-red-800" };
  }, []);

  const exportReport = useCallback((type: string) => {
    onExportReport?.(type);
  }, [onExportReport]);

  return (
    <div className="space-y-6">
      {/* Header Controls */}
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Productivity Dashboard</h2>
          <p className="text-muted-foreground">
            Monitor team performance and productivity metrics
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
              <SelectItem value="quarter">This Quarter</SelectItem>
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
              <DropdownMenuItem onClick={() => exportReport('pdf')}>
                Export as PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport('excel')}>
                Export as Excel
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => exportReport('csv')}>
                Export as CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button variant="outline" size="icon">
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Key Metrics Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Total Hours</p>
                <p className="text-2xl font-bold">{teamProductivity.totalTeamHours}h</p>
                <p className="text-xs text-muted-foreground">
                  +12% from last {selectedPeriod}
                </p>
              </div>
              <Clock className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Tasks Completed</p>
                <p className="text-2xl font-bold">{teamProductivity.totalTasksCompleted}</p>
                <p className="text-xs text-muted-foreground">
                  +8% from last {selectedPeriod}
                </p>
              </div>
              <CheckCircle className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Team Focus Score</p>
                <p className="text-2xl font-bold">{teamProductivity.teamFocusScore}%</p>
                <p className="text-xs text-muted-foreground">
                  +5% from last {selectedPeriod}
                </p>
              </div>
              <Focus className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Avg Hours/Member</p>
                <p className="text-2xl font-bold">{teamProductivity.averageHoursPerMember}h</p>
                <p className="text-xs text-muted-foreground">
                  +3% from last {selectedPeriod}
                </p>
              </div>
              <Users className="h-8 w-8 text-muted-foreground" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as any)} className="space-y-4">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="detailed">Detailed Analysis</TabsTrigger>
          <TabsTrigger value="comparison">Department Comparison</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Top Performers */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="h-5 w-5" />
                Top Performers
              </CardTitle>
              <CardDescription>
                Highest performing team members this {selectedPeriod}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamProductivity.topPerformers.map((performer, index) => {
                  const rating = getEfficiencyRating(performer.efficiency);
                  return (
                    <div key={performer.userId} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-muted-foreground">
                            #{index + 1}
                          </span>
                          <Avatar className="h-10 w-10">
                            <AvatarImage src={performer.avatar} />
                            <AvatarFallback>
                              {performer.userName.split(' ').map(n => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                        </div>
                        <div>
                          <div className="font-medium">{performer.userName}</div>
                          <div className="text-sm text-muted-foreground">
                            {performer.hoursWorked}h • {performer.tasksCompleted} tasks
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-4">
                        <div className="text-center">
                          <div className="text-sm font-medium">Focus Score</div>
                          <div className="text-lg font-bold text-primary">
                            {performer.focusScore}%
                          </div>
                        </div>
                        <Badge className={rating.color} variant="secondary">
                          {rating.label}
                        </Badge>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

          {/* Activity Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <BarChart3 className="h-5 w-5" />
                Activity Breakdown
              </CardTitle>
              <CardDescription>
                Time distribution across different activities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {teamProductivity.categoryBreakdown.map((category) => (
                  <div key={category.categoryId}>
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: category.color }}
                        />
                        <span className="font-medium">{category.categoryName}</span>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {Math.floor(category.timeSpent / 60)}h {category.timeSpent % 60}m ({category.percentage}%)
                      </div>
                    </div>
                    <Progress 
                      value={category.percentage} 
                      className="h-2"
                      style={{
                        // @ts-ignore
                        '--progress-background': category.color,
                      }}
                    />
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Insights & Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5" />
                AI Insights
              </CardTitle>
              <CardDescription>
                Automated insights and recommendations based on team data
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {insights.map((insight, index) => {
                  const IconComponent = insight.icon;
                  return (
                    <div key={index} className="p-4 border rounded-lg">
                      <div className="flex items-start gap-3">
                        <IconComponent className={cn("h-5 w-5 mt-0.5", insight.color)} />
                        <div>
                          <div className="font-medium">{insight.title}</div>
                          <div className="text-sm text-muted-foreground">
                            {insight.description}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="detailed" className="space-y-6">
          {/* Daily Trend */}
          <Card>
            <CardHeader>
              <CardTitle>Daily Productivity Trend</CardTitle>
              <CardDescription>
                Track daily hours, tasks, and focus scores over time
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {weeklyData.map((day, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-4">
                      <div className="text-sm font-medium w-16">
                        {day.date.toLocaleDateString('en-US', { weekday: 'short' })}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {day.date.toLocaleDateString()}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-6">
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Hours</div>
                        <div className="font-medium">{day.hours}h</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Tasks</div>
                        <div className="font-medium">{day.tasks}</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Focus</div>
                        <div className="font-medium">{day.focusScore}%</div>
                      </div>
                      <div className="text-center">
                        <div className="text-xs text-muted-foreground">Top Activity</div>
                        <div className="font-medium text-xs">{day.topCategory}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="comparison" className="space-y-6">
          {/* Department Comparison */}
          <Card>
            <CardHeader>
              <CardTitle>Department Performance</CardTitle>
              <CardDescription>
                Compare productivity metrics across departments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {teamProductivity.departmentBreakdown.map((dept) => (
                  <div key={dept.departmentId} className="p-4 border rounded-lg">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <h4 className="font-medium">{dept.departmentName}</h4>
                        <p className="text-sm text-muted-foreground">
                          {dept.memberCount} members • {dept.totalHours}h total • {dept.averageHours}h avg
                        </p>
                      </div>
                      <Badge variant="outline">
                        {dept.averageHours}h avg
                      </Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-4">
                      {dept.topCategories.map((category) => (
                        <div key={category.categoryId} className="text-center">
                          <div 
                            className="w-full h-2 rounded-full mb-2"
                            style={{ backgroundColor: category.color }}
                          />
                          <div className="text-xs font-medium">{category.categoryName}</div>
                          <div className="text-xs text-muted-foreground">
                            {category.percentage}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
