import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
  User,
  Target,
  TrendingUp,
  TrendingDown,
  Activity,
  Clock,
  DollarSign,
  Award,
  Users,
  Zap,
  AlertTriangle,
  CheckCircle,
  MoreVertical,
  Eye,
  MessageSquare,
  Phone,
  Mail,
  Calendar,
  BarChart3,
  LineChart,
  PieChart,
  RefreshCw,
  Download,
  Settings,
  ArrowUp,
  ArrowDown,
  Minus,
  Star,
  Lightbulb,
  Brain,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";

interface UserMetrics {
  userId: string;
  name: string;
  avatar: string;
  role: string;
  department: string;
  salesTarget: number;
  salesActual: number;
  conversionRate: number;
  avgDealSize: number;
  activitiesThisWeek: number;
  hoursLogged: number;
  tasksCompleted: number;
  focusScore: number;
  efficiency: number;
  lastActive: string;
  performance: 'excellent' | 'good' | 'average' | 'needs-improvement';
  trend: 'up' | 'down' | 'stable';
  strengths: string[];
  improvements: string[];
  strategies: string[];
}

interface TeamGoal {
  id: string;
  title: string;
  target: number;
  current: number;
  unit: string;
  deadline: string;
  assignedUsers: string[];
  status: 'on-track' | 'at-risk' | 'behind';
}

export default function DirectorProfile() {
  const [selectedUser, setSelectedUser] = useState<string>("all");
  const [selectedPeriod, setSelectedPeriod] = useState<'week' | 'month' | 'quarter'>('month');
  const [selectedDepartment, setSelectedDepartment] = useState<string>("all");

  const userMetrics: UserMetrics[] = [
    {
      userId: "sarah-chen",
      name: "Sarah Chen",
      avatar: "SC",
      role: "Sales Manager",
      department: "Sales",
      salesTarget: 150000,
      salesActual: 142000,
      conversionRate: 22.5,
      avgDealSize: 28500,
      activitiesThisWeek: 34,
      hoursLogged: 42,
      tasksCompleted: 28,
      focusScore: 89,
      efficiency: 0.82,
      lastActive: "2 hours ago",
      performance: 'excellent',
      trend: 'up',
      strengths: ["Lead Qualification", "Client Relationships", "Deal Closing"],
      improvements: ["Time Management", "Follow-up Consistency"],
      strategies: ["Implement automated follow-up sequences", "Use time-blocking for prospecting"]
    },
    {
      userId: "marcus-johnson",
      name: "Marcus Johnson",
      avatar: "MJ",
      role: "Event Coordinator",
      department: "Events",
      salesTarget: 120000,
      salesActual: 98000,
      conversionRate: 18.2,
      avgDealSize: 24000,
      activitiesThisWeek: 28,
      hoursLogged: 38,
      tasksCompleted: 22,
      focusScore: 76,
      efficiency: 0.68,
      lastActive: "1 hour ago",
      performance: 'good',
      trend: 'stable',
      strengths: ["Event Planning", "Vendor Management", "Customer Service"],
      improvements: ["Sales Conversion", "Digital Marketing"],
      strategies: ["Focus on upselling existing clients", "Improve social media presence"]
    },
    {
      userId: "elena-rodriguez",
      name: "Elena Rodriguez",
      avatar: "ER",
      role: "Marketing Specialist",
      department: "Marketing",
      salesTarget: 80000,
      salesActual: 65000,
      conversionRate: 15.8,
      avgDealSize: 18500,
      activitiesThisWeek: 31,
      hoursLogged: 40,
      tasksCompleted: 25,
      focusScore: 82,
      efficiency: 0.72,
      lastActive: "30 minutes ago",
      performance: 'average',
      trend: 'up',
      strengths: ["Campaign Creation", "Content Development", "Analytics"],
      improvements: ["Lead Nurturing", "Cross-selling"],
      strategies: ["Develop lead scoring system", "Create targeted nurture campaigns"]
    },
    {
      userId: "david-kim",
      name: "David Kim",
      avatar: "DK",
      role: "Customer Success",
      department: "Support",
      salesTarget: 60000,
      salesActual: 45000,
      conversionRate: 12.4,
      avgDealSize: 15000,
      activitiesThisWeek: 22,
      hoursLogged: 35,
      tasksCompleted: 18,
      focusScore: 65,
      efficiency: 0.58,
      lastActive: "4 hours ago",
      performance: 'needs-improvement',
      trend: 'down',
      strengths: ["Customer Retention", "Problem Solving"],
      improvements: ["Proactive Outreach", "Productivity", "Sales Skills"],
      strategies: ["Implement weekly check-ins", "Provide sales training", "Use automation tools"]
    }
  ];

  const teamGoals: TeamGoal[] = [
    {
      id: "q1-revenue",
      title: "Q1 Revenue Target",
      target: 500000,
      current: 420000,
      unit: "$",
      deadline: "2024-03-31",
      assignedUsers: ["sarah-chen", "marcus-johnson", "elena-rodriguez"],
      status: "on-track"
    },
    {
      id: "new-clients",
      title: "New Client Acquisition",
      target: 25,
      current: 18,
      unit: "clients",
      deadline: "2024-03-31",
      assignedUsers: ["sarah-chen", "elena-rodriguez"],
      status: "at-risk"
    },
    {
      id: "customer-satisfaction",
      title: "Customer Satisfaction Score",
      target: 95,
      current: 89,
      unit: "%",
      deadline: "2024-03-31",
      assignedUsers: ["david-kim", "marcus-johnson"],
      status: "behind"
    }
  ];

  const departmentPerformance = [
    { department: "Sales", revenue: 240000, target: 280000, members: 3, avgEfficiency: 0.74 },
    { department: "Events", revenue: 180000, target: 200000, members: 2, avgEfficiency: 0.68 },
    { department: "Marketing", revenue: 65000, target: 80000, members: 2, avgEfficiency: 0.72 },
    { department: "Support", revenue: 45000, target: 60000, members: 1, avgEfficiency: 0.58 }
  ];

  const filteredUsers = userMetrics.filter(user => {
    if (selectedDepartment !== "all" && user.department !== selectedDepartment) return false;
    if (selectedUser !== "all" && user.userId !== selectedUser) return false;
    return true;
  });

  const getPerformanceColor = (performance: string) => {
    switch (performance) {
      case 'excellent': return 'bg-green-100 text-green-800 border-green-200';
      case 'good': return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'average': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'needs-improvement': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTrendIcon = (trend: string) => {
    switch (trend) {
      case 'up': return { icon: ArrowUp, color: 'text-green-600' };
      case 'down': return { icon: ArrowDown, color: 'text-red-600' };
      case 'stable': return { icon: Minus, color: 'text-gray-600' };
      default: return { icon: Minus, color: 'text-gray-600' };
    }
  };

  const getGoalStatusColor = (status: string) => {
    switch (status) {
      case 'on-track': return 'bg-green-100 text-green-800';
      case 'at-risk': return 'bg-yellow-100 text-yellow-800';
      case 'behind': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Director Dashboard</h1>
            <p className="text-muted-foreground">
              Monitor team performance, track individual productivity, and optimize strategies
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={(v) => setSelectedPeriod(v as any)}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
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
                <DropdownMenuItem>Performance Report</DropdownMenuItem>
                <DropdownMenuItem>Team Analytics</DropdownMenuItem>
                <DropdownMenuItem>Individual Metrics</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            <Button variant="outline" size="icon">
              <RefreshCw className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card className="glass-panel dark:glass-panel-dark">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Select value={selectedDepartment} onValueChange={setSelectedDepartment}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Departments" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  <SelectItem value="Sales">Sales</SelectItem>
                  <SelectItem value="Events">Events</SelectItem>
                  <SelectItem value="Marketing">Marketing</SelectItem>
                  <SelectItem value="Support">Support</SelectItem>
                </SelectContent>
              </Select>

              <Select value={selectedUser} onValueChange={setSelectedUser}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Users" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Users</SelectItem>
                  {userMetrics.map((user) => (
                    <SelectItem key={user.userId} value={user.userId}>
                      {user.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Overview Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Revenue</p>
                  <p className="text-2xl font-bold">
                    ${departmentPerformance.reduce((sum, dept) => sum + dept.revenue, 0).toLocaleString()}
                  </p>
                  <p className="text-xs text-green-600">+12% from last month</p>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Team Efficiency</p>
                  <p className="text-2xl font-bold">
                    {Math.round((departmentPerformance.reduce((sum, dept) => sum + dept.avgEfficiency, 0) / departmentPerformance.length) * 100)}%
                  </p>
                  <p className="text-xs text-yellow-600">+3% from last month</p>
                </div>
                <Activity className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Active Users</p>
                  <p className="text-2xl font-bold">{userMetrics.length}</p>
                  <p className="text-xs text-green-600">All online today</p>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Avg Focus Score</p>
                  <p className="text-2xl font-bold">
                    {Math.round(userMetrics.reduce((sum, user) => sum + user.focusScore, 0) / userMetrics.length)}%
                  </p>
                  <p className="text-xs text-blue-600">+8% from last month</p>
                </div>
                <Target className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="performance" className="space-y-6">
          <TabsList>
            <TabsTrigger value="performance">Team Performance</TabsTrigger>
            <TabsTrigger value="individuals">Individual Metrics</TabsTrigger>
            <TabsTrigger value="goals">Goals & Targets</TabsTrigger>
            <TabsTrigger value="strategies">Strategy Insights</TabsTrigger>
          </TabsList>

          <TabsContent value="performance">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Department Performance */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle>Department Performance</CardTitle>
                  <CardDescription>Revenue performance by department</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {departmentPerformance.map((dept) => (
                      <div key={dept.department} className="space-y-2">
                        <div className="flex justify-between items-center">
                          <span className="font-medium">{dept.department}</span>
                          <span className="text-sm text-muted-foreground">
                            ${dept.revenue.toLocaleString()} / ${dept.target.toLocaleString()}
                          </span>
                        </div>
                        <Progress value={(dept.revenue / dept.target) * 100} className="h-2" />
                        <div className="flex justify-between text-xs text-muted-foreground">
                          <span>{dept.members} members</span>
                          <span>{Math.round((dept.revenue / dept.target) * 100)}% of target</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Team Goals Status */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle>Team Goals</CardTitle>
                  <CardDescription>Progress on quarterly objectives</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {teamGoals.map((goal) => (
                      <div key={goal.id} className="p-4 border rounded-lg">
                        <div className="flex justify-between items-start mb-2">
                          <h4 className="font-medium">{goal.title}</h4>
                          <Badge className={getGoalStatusColor(goal.status)}>
                            {goal.status.replace('-', ' ')}
                          </Badge>
                        </div>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>{goal.unit}{goal.current.toLocaleString()} / {goal.unit}{goal.target.toLocaleString()}</span>
                            <span>Due: {new Date(goal.deadline).toLocaleDateString()}</span>
                          </div>
                          <Progress value={(goal.current / goal.target) * 100} className="h-2" />
                          <div className="text-xs text-muted-foreground">
                            {goal.assignedUsers.length} team members assigned
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="individuals">
            <div className="grid gap-6">
              {filteredUsers.map((user) => {
                const trend = getTrendIcon(user.trend);
                const TrendIcon = trend.icon;
                
                return (
                  <Card key={user.userId} className="glass-panel dark:glass-panel-dark">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-16 w-16">
                            <AvatarFallback className="bg-primary/10 text-primary text-lg">
                              {user.avatar}
                            </AvatarFallback>
                          </Avatar>
                          
                          <div>
                            <div className="flex items-center gap-3">
                              <h3 className="font-semibold text-lg">{user.name}</h3>
                              <Badge className={getPerformanceColor(user.performance)}>
                                {user.performance.replace('-', ' ')}
                              </Badge>
                              <div className="flex items-center gap-1">
                                <TrendIcon className={cn("h-4 w-4", trend.color)} />
                                <span className="text-sm text-muted-foreground">Trending</span>
                              </div>
                            </div>
                            <p className="text-muted-foreground">{user.role} • {user.department}</p>
                            <p className="text-sm text-muted-foreground">Last active: {user.lastActive}</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="sm">
                            <MessageSquare className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Phone className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="sm">
                            <Mail className="h-4 w-4" />
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="sm">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent>
                              <DropdownMenuItem>View Full Profile</DropdownMenuItem>
                              <DropdownMenuItem>Schedule 1:1 Meeting</DropdownMenuItem>
                              <DropdownMenuItem>Assign Goal</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mt-6">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Sales Progress</p>
                          <p className="text-lg font-semibold">${user.salesActual.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">of ${user.salesTarget.toLocaleString()}</p>
                          <Progress value={(user.salesActual / user.salesTarget) * 100} className="mt-2 h-2" />
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Conversion Rate</p>
                          <p className="text-lg font-semibold">{user.conversionRate}%</p>
                          <p className="text-xs text-green-600">Above average</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Avg Deal Size</p>
                          <p className="text-lg font-semibold">${user.avgDealSize.toLocaleString()}</p>
                          <p className="text-xs text-muted-foreground">This month</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Activities</p>
                          <p className="text-lg font-semibold">{user.activitiesThisWeek}</p>
                          <p className="text-xs text-muted-foreground">This week</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Focus Score</p>
                          <p className="text-lg font-semibold">{user.focusScore}%</p>
                          <p className="text-xs text-blue-600">Excellent</p>
                        </div>
                        
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Efficiency</p>
                          <p className="text-lg font-semibold">{Math.round(user.efficiency * 100)}%</p>
                          <p className="text-xs text-muted-foreground">{user.hoursLogged}h logged</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="goals">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {teamGoals.map((goal) => (
                <Card key={goal.id} className="glass-panel dark:glass-panel-dark">
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      {goal.title}
                      <Badge className={getGoalStatusColor(goal.status)}>
                        {goal.status.replace('-', ' ')}
                      </Badge>
                    </CardTitle>
                    <CardDescription>Due: {new Date(goal.deadline).toLocaleDateString()}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between mb-2">
                          <span>Progress</span>
                          <span>{Math.round((goal.current / goal.target) * 100)}%</span>
                        </div>
                        <Progress value={(goal.current / goal.target) * 100} className="h-3" />
                        <div className="flex justify-between text-sm text-muted-foreground mt-1">
                          <span>{goal.unit}{goal.current.toLocaleString()}</span>
                          <span>{goal.unit}{goal.target.toLocaleString()}</span>
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-2">Assigned Team Members</h4>
                        <div className="flex gap-2">
                          {goal.assignedUsers.map((userId) => {
                            const user = userMetrics.find(u => u.userId === userId);
                            return user ? (
                              <Avatar key={userId} className="h-8 w-8">
                                <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                  {user.avatar}
                                </AvatarFallback>
                              </Avatar>
                            ) : null;
                          })}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="strategies">
            <div className="grid gap-6">
              {filteredUsers.map((user) => (
                <Card key={user.userId} className="glass-panel dark:glass-panel-dark">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-3">
                      <Avatar className="h-10 w-10">
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {user.avatar}
                        </AvatarFallback>
                      </Avatar>
                      {user.name} - Performance Strategy
                    </CardTitle>
                    <CardDescription>Strengths, improvement areas, and actionable strategies</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Star className="h-4 w-4 text-green-600" />
                          Strengths
                        </h4>
                        <div className="space-y-2">
                          {user.strengths.map((strength, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <CheckCircle className="h-3 w-3 text-green-600" />
                              <span className="text-sm">{strength}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <AlertTriangle className="h-4 w-4 text-yellow-600" />
                          Improvement Areas
                        </h4>
                        <div className="space-y-2">
                          {user.improvements.map((improvement, index) => (
                            <div key={index} className="flex items-center gap-2">
                              <AlertTriangle className="h-3 w-3 text-yellow-600" />
                              <span className="text-sm">{improvement}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      <div>
                        <h4 className="font-medium mb-3 flex items-center gap-2">
                          <Lightbulb className="h-4 w-4 text-blue-600" />
                          Recommended Strategies
                        </h4>
                        <div className="space-y-2">
                          {user.strategies.map((strategy, index) => (
                            <div key={index} className="flex items-start gap-2">
                              <Lightbulb className="h-3 w-3 text-blue-600 mt-0.5" />
                              <span className="text-sm">{strategy}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="mt-6 p-4 bg-primary/5 border border-primary/20 rounded-lg">
                      <div className="flex items-center gap-2 text-primary mb-2">
                        <Brain className="h-4 w-4" />
                        <span className="font-medium">AI Productivity Insights</span>
                      </div>
                      <p className="text-sm">
                        Based on performance data, {user.name} would benefit from focusing on {user.improvements[0]?.toLowerCase()} 
                        to reach the next performance level. Consider implementing {user.strategies[0]?.toLowerCase()} as the primary initiative.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </Layout>
  );
}
