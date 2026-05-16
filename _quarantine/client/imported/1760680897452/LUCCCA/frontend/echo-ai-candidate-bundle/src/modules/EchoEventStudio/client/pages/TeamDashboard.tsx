import Layout from "@/components/Layout";
import MoveablePanel from "@/components/MoveablePanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Users,
  Target,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Award,
  Calendar,
  Phone,
  Mail,
  MessageSquare,
  BarChart3,
  Crown,
  Zap,
  Activity,
  Clock,
  CheckCircle,
  Plus,
  Filter,
  Search,
  Download,
  Star,
  Trophy,
  Sparkles,
} from "lucide-react";
import { useState } from "react";

interface TeamMember {
  id: number;
  name: string;
  role: string;
  email: string;
  phone: string;
  avatar: string;
  department: string;
  startDate: string;
  performance: {
    salesTarget: number;
    salesAchieved: number;
    leadsGenerated: number;
    conversionRate: number;
    avgDealSize: number;
    activitiesCompleted: number;
    customerSatisfaction: number;
  };
  goals: {
    quarterly: number;
    monthly: number;
    achieved: number;
  };
  recentActivities: Array<{
    type: string;
    description: string;
    date: string;
    value?: number;
  }>;
  achievements: string[];
  skills: Array<{
    name: string;
    level: number;
  }>;
  status: 'active' | 'vacation' | 'training' | 'meeting';
}

const sampleTeamMembers: TeamMember[] = [
  {
    id: 1,
    name: "Sarah Johnson",
    role: "Senior Sales Manager",
    email: "sarah@hospitalitycrm.com",
    phone: "+1 (555) 123-4567",
    avatar: "SJ",
    department: "Sales",
    startDate: "2022-03-15",
    performance: {
      salesTarget: 500000,
      salesAchieved: 625000,
      leadsGenerated: 85,
      conversionRate: 68,
      avgDealSize: 45000,
      activitiesCompleted: 142,
      customerSatisfaction: 4.8,
    },
    goals: {
      quarterly: 150000,
      monthly: 50000,
      achieved: 78000,
    },
    recentActivities: [
      { type: "deal_closed", description: "Closed TechCorp Summit deal", date: "2024-01-14", value: 45000 },
      { type: "lead_generated", description: "New lead from Global Events", date: "2024-01-13" },
      { type: "call_completed", description: "Follow-up call with Luxury Weddings", date: "2024-01-12" },
    ],
    achievements: ["Top Performer Q4 2023", "Highest Conversion Rate", "Customer Champion"],
    skills: [
      { name: "Relationship Building", level: 95 },
      { name: "Negotiation", level: 88 },
      { name: "Product Knowledge", level: 92 },
      { name: "CRM Usage", level: 85 },
    ],
    status: "active",
  },
  {
    id: 2,
    name: "Michael Chen",
    role: "Event Coordinator",
    email: "michael@hospitalitycrm.com",
    phone: "+1 (555) 987-6543",
    avatar: "MC",
    department: "Events",
    startDate: "2021-08-20",
    performance: {
      salesTarget: 400000,
      salesAchieved: 385000,
      leadsGenerated: 62,
      conversionRate: 72,
      avgDealSize: 38000,
      activitiesCompleted: 118,
      customerSatisfaction: 4.6,
    },
    goals: {
      quarterly: 120000,
      monthly: 40000,
      achieved: 42500,
    },
    recentActivities: [
      { type: "event_planned", description: "Tech Innovation Conference setup", date: "2024-01-14" },
      { type: "client_meeting", description: "Planning session with Global Events", date: "2024-01-13" },
      { type: "proposal_sent", description: "Sent proposal for annual conference", date: "2024-01-11", value: 78000 },
    ],
    achievements: ["Event Excellence Award", "Client Satisfaction Leader", "Team Collaboration Star"],
    skills: [
      { name: "Event Planning", level: 94 },
      { name: "Vendor Management", level: 86 },
      { name: "Budget Management", level: 79 },
      { name: "Communication", level: 91 },
    ],
    status: "meeting",
  },
  {
    id: 3,
    name: "Emily Rodriguez",
    role: "Marketing Specialist",
    email: "emily@hospitalitycrm.com",
    phone: "+1 (555) 456-7890",
    avatar: "ER",
    department: "Marketing",
    startDate: "2023-01-10",
    performance: {
      salesTarget: 300000,
      salesAchieved: 315000,
      leadsGenerated: 124,
      conversionRate: 55,
      avgDealSize: 25000,
      activitiesCompleted: 156,
      customerSatisfaction: 4.4,
    },
    goals: {
      quarterly: 90000,
      monthly: 30000,
      achieved: 35200,
    },
    recentActivities: [
      { type: "campaign_launched", description: "Q1 Digital Marketing Campaign", date: "2024-01-14" },
      { type: "lead_generated", description: "5 new leads from social media", date: "2024-01-13" },
      { type: "content_created", description: "Blog post on wedding trends", date: "2024-01-12" },
    ],
    achievements: ["Rising Star 2023", "Digital Innovation Award", "Lead Generation Champion"],
    skills: [
      { name: "Digital Marketing", level: 87 },
      { name: "Content Creation", level: 92 },
      { name: "Analytics", level: 78 },
      { name: "Social Media", level: 89 },
    ],
    status: "active",
  },
  {
    id: 4,
    name: "David Thompson",
    role: "Customer Success Manager",
    email: "david@hospitalitycrm.com",
    phone: "+1 (555) 321-9876",
    avatar: "DT",
    department: "Customer Success",
    startDate: "2022-11-05",
    performance: {
      salesTarget: 250000,
      salesAchieved: 195000,
      leadsGenerated: 34,
      conversionRate: 82,
      avgDealSize: 28000,
      activitiesCompleted: 98,
      customerSatisfaction: 4.9,
    },
    goals: {
      quarterly: 75000,
      monthly: 25000,
      achieved: 18500,
    },
    recentActivities: [
      { type: "customer_call", description: "Quarterly review with TechCorp", date: "2024-01-14" },
      { type: "issue_resolved", description: "Resolved venue concern for client", date: "2024-01-13" },
      { type: "upsell_completed", description: "Additional services for wedding", date: "2024-01-11", value: 12000 },
    ],
    achievements: ["Customer Satisfaction Excellence", "Retention Champion", "Problem Solver Award"],
    skills: [
      { name: "Customer Relations", level: 96 },
      { name: "Problem Solving", level: 89 },
      { name: "Product Knowledge", level: 83 },
      { name: "Conflict Resolution", level: 91 },
    ],
    status: "training",
  },
  {
    id: 5,
    name: "Lisa Park",
    role: "Business Development",
    email: "lisa@hospitalitycrm.com",
    phone: "+1 (555) 654-3210",
    avatar: "LP",
    department: "Business Development",
    startDate: "2023-06-12",
    performance: {
      salesTarget: 350000,
      salesAchieved: 285000,
      leadsGenerated: 98,
      conversionRate: 61,
      avgDealSize: 32000,
      activitiesCompleted: 134,
      customerSatisfaction: 4.5,
    },
    goals: {
      quarterly: 105000,
      monthly: 35000,
      achieved: 29800,
    },
    recentActivities: [
      { type: "partnership_meeting", description: "Partnership discussion with venue chain", date: "2024-01-14" },
      { type: "proposal_sent", description: "Corporate partnership proposal", date: "2024-01-13", value: 95000 },
      { type: "market_research", description: "Competitive analysis report", date: "2024-01-12" },
    ],
    achievements: ["New Business Pioneer", "Partnership Developer", "Market Expansion Leader"],
    skills: [
      { name: "Business Strategy", level: 84 },
      { name: "Partnership Development", level: 88 },
      { name: "Market Analysis", level: 81 },
      { name: "Presentation Skills", level: 86 },
    ],
    status: "vacation",
  },
];

export default function TeamDashboard() {
  const [teamMembers] = useState<TeamMember[]>(sampleTeamMembers);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterDepartment, setFilterDepartment] = useState<string>("all");
  const [filterStatus, setFilterStatus] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  const filteredMembers = teamMembers.filter(member => {
    const matchesSearch = member.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.role.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         member.department.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesDepartment = filterDepartment === "all" || member.department === filterDepartment;
    const matchesStatus = filterStatus === "all" || member.status === filterStatus;
    return matchesSearch && matchesDepartment && matchesStatus;
  });

  const getPerformanceColor = (achieved: number, target: number) => {
    const percentage = (achieved / target) * 100;
    if (percentage >= 100) return "text-green-500";
    if (percentage >= 80) return "text-yellow-500";
    return "text-red-500";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-500';
      case 'meeting': return 'bg-blue-500';
      case 'training': return 'bg-purple-500';
      case 'vacation': return 'bg-orange-500';
      default: return 'bg-gray-500';
    }
  };

  const totalSalesTarget = teamMembers.reduce((sum, member) => sum + member.performance.salesTarget, 0);
  const totalSalesAchieved = teamMembers.reduce((sum, member) => sum + member.performance.salesAchieved, 0);
  const avgConversionRate = teamMembers.reduce((sum, member) => sum + member.performance.conversionRate, 0) / teamMembers.length;
  const totalLeads = teamMembers.reduce((sum, member) => sum + member.performance.leadsGenerated, 0);

  const topPerformer = teamMembers.reduce((top, member) => 
    (member.performance.salesAchieved / member.performance.salesTarget) > 
    (top.performance.salesAchieved / top.performance.salesTarget) ? member : top
  );

  const departments = Array.from(new Set(teamMembers.map(member => member.department)));

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Team Dashboard</h1>
            <p className="text-muted-foreground mt-2">
              Sales team performance, goals tracking, and collaborative achievements
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" size="sm" className="apple-button">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
            <Button size="sm" className="apple-button">
              <Plus className="h-4 w-4 mr-2" />
              Team Meeting
            </Button>
          </div>
        </div>

        {/* Team Performance Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Team Sales</p>
                    <p className="text-2xl font-bold text-foreground">
                      ${(totalSalesAchieved / 1000).toFixed(0)}K
                    </p>
                    <p className={`text-xs ${getPerformanceColor(totalSalesAchieved, totalSalesTarget)}`}>
                      {((totalSalesAchieved / totalSalesTarget) * 100).toFixed(1)}% of target
                    </p>
                  </div>
                  <DollarSign className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Conversion Rate</p>
                    <p className="text-2xl font-bold text-foreground">{avgConversionRate.toFixed(0)}%</p>
                    <p className="text-xs text-green-500">Team average</p>
                  </div>
                  <Target className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Leads</p>
                    <p className="text-2xl font-bold text-foreground">{totalLeads}</p>
                    <p className="text-xs text-blue-500">This quarter</p>
                  </div>
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">Team Size</p>
                    <p className="text-2xl font-bold text-foreground">{teamMembers.length}</p>
                    <p className="text-xs text-green-500">Active members</p>
                  </div>
                  <Users className="h-6 w-6 text-primary" />
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>

        {/* Top Performer Spotlight */}
        <MoveablePanel className="glass-panel">
          <Card className="bg-transparent border-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Crown className="h-5 w-5 text-yellow-500" />
                <span>Top Performer Spotlight</span>
              </CardTitle>
              <CardDescription>Outstanding performance recognition</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center space-x-6 p-4 bg-gradient-to-r from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <Avatar className="h-16 w-16 ring-4 ring-yellow-400">
                  <AvatarImage src="/placeholder.svg" alt={topPerformer.name} />
                  <AvatarFallback className="bg-yellow-100 text-yellow-700 text-lg">
                    {topPerformer.avatar}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h3 className="text-xl font-bold text-yellow-700 dark:text-yellow-300">{topPerformer.name}</h3>
                    <Trophy className="h-5 w-5 text-yellow-500" />
                  </div>
                  <p className="text-yellow-600 dark:text-yellow-400">{topPerformer.role}</p>
                  <div className="grid grid-cols-3 gap-4 mt-3 text-sm">
                    <div>
                      <span className="text-yellow-600 dark:text-yellow-400">Sales Achievement:</span>
                      <div className="font-bold text-yellow-700 dark:text-yellow-300">
                        {((topPerformer.performance.salesAchieved / topPerformer.performance.salesTarget) * 100).toFixed(0)}%
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-600 dark:text-yellow-400">Conversion Rate:</span>
                      <div className="font-bold text-yellow-700 dark:text-yellow-300">
                        {topPerformer.performance.conversionRate}%
                      </div>
                    </div>
                    <div>
                      <span className="text-yellow-600 dark:text-yellow-400">Customer Satisfaction:</span>
                      <div className="font-bold text-yellow-700 dark:text-yellow-300">
                        {topPerformer.performance.customerSatisfaction}/5
                      </div>
                    </div>
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold text-yellow-500">#{1}</div>
                  <div className="text-sm text-yellow-600 dark:text-yellow-400">This Quarter</div>
                </div>
              </div>
            </CardContent>
          </Card>
        </MoveablePanel>

        {/* Filters */}
        <MoveablePanel className="glass-panel p-4 rounded-xl">
          <div className="flex flex-col sm:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search team members by name, role, or department..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-background/50 border-2 border-border/50 hover:border-primary/30 focus:border-primary/50 transition-all duration-200"
              />
            </div>
            <div className="flex items-center space-x-2">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                <SelectTrigger className="w-40 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Departments</SelectItem>
                  {departments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-32 bg-background/50 border-2 border-border/50 hover:border-primary/30 transition-all duration-200">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="meeting">In Meeting</SelectItem>
                  <SelectItem value="training">Training</SelectItem>
                  <SelectItem value="vacation">On Vacation</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </MoveablePanel>

        {/* Team Members Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredMembers.map((member) => (
            <MoveablePanel key={member.id} className="glass-panel">
              <Card className="bg-transparent border-none shadow-none h-full">
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="relative">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src="/placeholder.svg" alt={member.name} />
                          <AvatarFallback className="bg-primary/10 text-primary">
                            {member.avatar}
                          </AvatarFallback>
                        </Avatar>
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full ${getStatusColor(member.status)} border-2 border-background`} />
                      </div>
                      <div>
                        <CardTitle className="text-lg leading-none">{member.name}</CardTitle>
                        <CardDescription className="text-sm mt-1">
                          {member.role}
                        </CardDescription>
                        <Badge variant="outline" className="text-xs mt-1 capitalize">
                          {member.status}
                        </Badge>
                      </div>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setSelectedMember(member)}
                      className="apple-button"
                    >
                      View Details
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Performance Metrics */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-muted-foreground">Sales Target</span>
                      <span className="font-medium">${(member.performance.salesTarget / 1000).toFixed(0)}K</span>
                    </div>
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Achievement</span>
                        <span className={getPerformanceColor(member.performance.salesAchieved, member.performance.salesTarget)}>
                          {((member.performance.salesAchieved / member.performance.salesTarget) * 100).toFixed(0)}%
                        </span>
                      </div>
                      <Progress 
                        value={(member.performance.salesAchieved / member.performance.salesTarget) * 100} 
                        className="h-2" 
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Conversion:</span>
                      <div className="font-medium">{member.performance.conversionRate}%</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Avg Deal:</span>
                      <div className="font-medium">${(member.performance.avgDealSize / 1000).toFixed(0)}K</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Leads:</span>
                      <div className="font-medium">{member.performance.leadsGenerated}</div>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Satisfaction:</span>
                      <div className="font-medium flex items-center">
                        <Star className="h-3 w-3 text-yellow-500 mr-1" />
                        {member.performance.customerSatisfaction}
                      </div>
                    </div>
                  </div>

                  {/* Recent Activity */}
                  <div>
                    <h4 className="text-sm font-medium mb-2">Recent Activity</h4>
                    <div className="space-y-1">
                      {member.recentActivities.slice(0, 2).map((activity, index) => (
                        <div key={index} className="text-xs text-muted-foreground flex items-center">
                          <Activity className="h-3 w-3 mr-2" />
                          <span className="truncate">{activity.description}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Top Achievement */}
                  {member.achievements.length > 0 && (
                    <div className="flex items-center space-x-2 p-2 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg">
                      <Award className="h-4 w-4 text-yellow-500" />
                      <span className="text-xs font-medium text-yellow-700 dark:text-yellow-300 truncate">
                        {member.achievements[0]}
                      </span>
                    </div>
                  )}

                  {/* Contact Actions */}
                  <div className="flex space-x-2">
                    <Button size="sm" variant="outline" className="flex-1 apple-button">
                      <Phone className="h-3 w-3 mr-2" />
                      Call
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 apple-button">
                      <Mail className="h-3 w-3 mr-2" />
                      Email
                    </Button>
                    <Button size="sm" variant="outline" className="flex-1 apple-button">
                      <MessageSquare className="h-3 w-3 mr-2" />
                      Chat
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </MoveablePanel>
          ))}
        </div>

        {/* Detailed Member View Dialog */}
        {selectedMember && (
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-16 w-16">
                      <AvatarImage src="/placeholder.svg" alt={selectedMember.name} />
                      <AvatarFallback className="bg-primary/10 text-primary text-lg">
                        {selectedMember.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <CardTitle className="text-2xl">{selectedMember.name}</CardTitle>
                      <CardDescription className="text-lg">
                        {selectedMember.role} • {selectedMember.department}
                      </CardDescription>
                      <div className="flex items-center space-x-2 mt-2">
                        <Badge variant="outline" className="capitalize">
                          {selectedMember.status}
                        </Badge>
                        <Badge variant="secondary">
                          Member since {new Date(selectedMember.startDate).getFullYear()}
                        </Badge>
                      </div>
                    </div>
                  </div>
                  <Button variant="outline" onClick={() => setSelectedMember(null)}>
                    Close
                  </Button>
                </div>
              </CardHeader>
              
              <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="activities">Activities</TabsTrigger>
                    <TabsTrigger value="achievements">Achievements</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="overview" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Contact Information</h4>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center">
                            <Mail className="h-4 w-4 mr-3 text-muted-foreground" />
                            {selectedMember.email}
                          </div>
                          <div className="flex items-center">
                            <Phone className="h-4 w-4 mr-3 text-muted-foreground" />
                            {selectedMember.phone}
                          </div>
                          <div className="flex items-center">
                            <Calendar className="h-4 w-4 mr-3 text-muted-foreground" />
                            Started {new Date(selectedMember.startDate).toLocaleDateString()}
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Current Goals</h4>
                        <div className="space-y-3">
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Monthly Goal</span>
                              <span>${selectedMember.goals.achieved.toLocaleString()} / ${selectedMember.goals.monthly.toLocaleString()}</span>
                            </div>
                            <Progress value={(selectedMember.goals.achieved / selectedMember.goals.monthly) * 100} className="h-2 mt-1" />
                          </div>
                          <div>
                            <div className="flex justify-between text-sm">
                              <span>Quarterly Goal</span>
                              <span>{((selectedMember.goals.achieved / selectedMember.goals.quarterly) * 100).toFixed(0)}%</span>
                            </div>
                            <Progress value={(selectedMember.goals.achieved / selectedMember.goals.quarterly) * 100} className="h-2 mt-1" />
                          </div>
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="performance" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <h4 className="font-medium">Sales Performance</h4>
                        <div className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Sales Target:</span>
                            <span className="font-medium">${selectedMember.performance.salesTarget.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Sales Achieved:</span>
                            <span className="font-medium text-green-500">${selectedMember.performance.salesAchieved.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Conversion Rate:</span>
                            <span className="font-medium">{selectedMember.performance.conversionRate}%</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm text-muted-foreground">Avg Deal Size:</span>
                            <span className="font-medium">${selectedMember.performance.avgDealSize.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-4">
                        <h4 className="font-medium">Skills Assessment</h4>
                        <div className="space-y-2">
                          {selectedMember.skills.map((skill, index) => (
                            <div key={index}>
                              <div className="flex justify-between text-sm">
                                <span>{skill.name}</span>
                                <span>{skill.level}%</span>
                              </div>
                              <Progress value={skill.level} className="h-2" />
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="activities" className="space-y-4 mt-6">
                    <div className="space-y-3">
                      {selectedMember.recentActivities.map((activity, index) => (
                        <div key={index} className="flex items-center justify-between p-3 bg-muted/20 rounded-lg">
                          <div className="flex items-center space-x-3">
                            <Activity className="h-4 w-4 text-primary" />
                            <div>
                              <span className="font-medium">{activity.description}</span>
                              <div className="text-xs text-muted-foreground">{activity.date}</div>
                            </div>
                          </div>
                          {activity.value && (
                            <Badge variant="outline" className="text-green-600">
                              ${activity.value.toLocaleString()}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="achievements" className="space-y-4 mt-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {selectedMember.achievements.map((achievement, index) => (
                        <div key={index} className="flex items-center space-x-3 p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                          <Trophy className="h-5 w-5 text-yellow-500" />
                          <span className="font-medium text-yellow-700 dark:text-yellow-300">{achievement}</span>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </MoveablePanel>
        )}
      </div>
    </Layout>
  );
}
