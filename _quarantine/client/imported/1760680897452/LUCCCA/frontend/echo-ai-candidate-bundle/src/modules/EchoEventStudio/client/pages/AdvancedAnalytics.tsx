import { useState, useMemo, useEffect } from "react";
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
  BarChart,
  LineChart,
  PieChart,
  AreaChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Bar,
  Line,
  Pie,
  Cell,
  Area,
} from "recharts";
import {
  Dashboard,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart as LineChartIcon,
  PieChart as PieChartIcon,
  Users,
  DollarSign,
  Calendar,
  Star,
  AlertTriangle,
  CheckCircle,
  Clock,
  Target,
  Zap,
  Activity,
  Eye,
  Settings,
  RefreshCw,
  Download,
  Share,
  Plus,
  Filter,
  Search,
  Maximize,
  Minimize,
  Edit,
  Trash2,
  Bell,
  Award,
  Lightbulb,
  ArrowUp,
  ArrowDown,
  Minus,
  Calendar as CalendarIcon,
  MapPin,
  Heart,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import type {
  KPIMetric,
  Dashboard as DashboardType,
  DashboardWidget,
  TrendData,
  MetricStatus,
  AnalyticsInsight,
  ExecutiveSummary,
  IndustryBenchmark,
  BenchmarkComparison,
} from "@shared/dashboard-analytics-types";

// Mock data for demonstration
const mockKPIMetrics: KPIMetric[] = [
  {
    id: "1",
    name: "Total Revenue",
    description: "Total revenue generated this month",
    category: "revenue",
    value: 247500,
    unit: "USD",
    target: 250000,
    benchmark: 235000,
    trend: {
      direction: "up",
      percentage: 12.5,
      period: "monthly",
      data: [
        { date: new Date("2024-01-01"), value: 220000 },
        { date: new Date("2024-01-02"), value: 225000 },
        { date: new Date("2024-01-03"), value: 230000 },
        { date: new Date("2024-01-04"), value: 235000 },
        { date: new Date("2024-01-05"), value: 240000 },
        { date: new Date("2024-01-06"), value: 247500 },
      ],
    },
    status: "good",
    lastUpdated: new Date(),
    calculation: {
      formula: "SUM(bookings.amount)",
      dataSources: ["bookings"],
      parameters: [],
      schedule: { frequency: "hourly" },
    },
    alerts: [],
  },
  {
    id: "2",
    name: "Occupancy Rate",
    description: "Current occupancy percentage",
    category: "occupancy",
    value: 87.3,
    unit: "%",
    target: 85,
    benchmark: 82.5,
    trend: {
      direction: "up",
      percentage: 5.2,
      period: "weekly",
      data: [
        { date: new Date("2024-01-01"), value: 82.8 },
        { date: new Date("2024-01-02"), value: 84.1 },
        { date: new Date("2024-01-03"), value: 85.5 },
        { date: new Date("2024-01-04"), value: 86.2 },
        { date: new Date("2024-01-05"), value: 86.8 },
        { date: new Date("2024-01-06"), value: 87.3 },
      ],
    },
    status: "excellent",
    lastUpdated: new Date(),
    calculation: {
      formula: "(occupied_rooms / total_rooms) * 100",
      dataSources: ["rooms"],
      parameters: [],
      schedule: { frequency: "real-time" },
    },
    alerts: [],
  },
  {
    id: "3",
    name: "Guest Satisfaction",
    description: "Average guest satisfaction score",
    category: "guest-satisfaction",
    value: 4.6,
    unit: "/5",
    target: 4.5,
    benchmark: 4.3,
    trend: {
      direction: "up",
      percentage: 2.2,
      period: "monthly",
      data: [
        { date: new Date("2024-01-01"), value: 4.4 },
        { date: new Date("2024-01-02"), value: 4.45 },
        { date: new Date("2024-01-03"), value: 4.5 },
        { date: new Date("2024-01-04"), value: 4.52 },
        { date: new Date("2024-01-05"), value: 4.58 },
        { date: new Date("2024-01-06"), value: 4.6 },
      ],
    },
    status: "excellent",
    lastUpdated: new Date(),
    calculation: {
      formula: "AVG(reviews.rating)",
      dataSources: ["reviews"],
      parameters: [],
      schedule: { frequency: "daily" },
    },
    alerts: [],
  },
  {
    id: "4",
    name: "Average Daily Rate",
    description: "Average daily rate for bookings",
    category: "revenue",
    value: 185.50,
    unit: "USD",
    target: 175,
    benchmark: 172,
    trend: {
      direction: "up",
      percentage: 8.7,
      period: "weekly",
      data: [
        { date: new Date("2024-01-01"), value: 170.5 },
        { date: new Date("2024-01-02"), value: 175.2 },
        { date: new Date("2024-01-03"), value: 178.8 },
        { date: new Date("2024-01-04"), value: 182.1 },
        { date: new Date("2024-01-05"), value: 184.0 },
        { date: new Date("2024-01-06"), value: 185.5 },
      ],
    },
    status: "excellent",
    lastUpdated: new Date(),
    calculation: {
      formula: "AVG(bookings.amount / bookings.nights)",
      dataSources: ["bookings"],
      parameters: [],
      schedule: { frequency: "hourly" },
    },
    alerts: [],
  },
  {
    id: "5",
    name: "Staff Efficiency",
    description: "Staff productivity score",
    category: "operational",
    value: 78.2,
    unit: "%",
    target: 80,
    benchmark: 75,
    trend: {
      direction: "down",
      percentage: -3.1,
      period: "weekly",
      data: [
        { date: new Date("2024-01-01"), value: 80.8 },
        { date: new Date("2024-01-02"), value: 80.2 },
        { date: new Date("2024-01-03"), value: 79.5 },
        { date: new Date("2024-01-04"), value: 79.0 },
        { date: new Date("2024-01-05"), value: 78.8 },
        { date: new Date("2024-01-06"), value: 78.2 },
      ],
    },
    status: "warning",
    lastUpdated: new Date(),
    calculation: {
      formula: "AVG(staff_performance.score)",
      dataSources: ["staff_performance"],
      parameters: [],
      schedule: { frequency: "daily" },
    },
    alerts: [],
  },
  {
    id: "6",
    name: "Cost per Acquisition",
    description: "Marketing cost per new customer",
    category: "marketing",
    value: 45.80,
    unit: "USD",
    target: 50,
    benchmark: 52,
    trend: {
      direction: "down",
      percentage: -8.2,
      period: "monthly",
      data: [
        { date: new Date("2024-01-01"), value: 49.8 },
        { date: new Date("2024-01-02"), value: 48.5 },
        { date: new Date("2024-01-03"), value: 47.2 },
        { date: new Date("2024-01-04"), value: 46.8 },
        { date: new Date("2024-01-05"), value: 46.1 },
        { date: new Date("2024-01-06"), value: 45.8 },
      ],
    },
    status: "good",
    lastUpdated: new Date(),
    calculation: {
      formula: "SUM(marketing_spend) / COUNT(new_customers)",
      dataSources: ["marketing", "customers"],
      parameters: [],
      schedule: { frequency: "daily" },
    },
    alerts: [],
  },
];

const mockRevenueData = [
  { month: "Jan", revenue: 185000, target: 180000, lastYear: 165000 },
  { month: "Feb", revenue: 192000, target: 185000, lastYear: 172000 },
  { month: "Mar", revenue: 208000, target: 200000, lastYear: 188000 },
  { month: "Apr", revenue: 215000, target: 210000, lastYear: 195000 },
  { month: "May", revenue: 238000, target: 225000, lastYear: 212000 },
  { month: "Jun", revenue: 247500, target: 235000, lastYear: 225000 },
];

const mockOccupancyData = [
  { day: "Mon", rate: 85.2, forecast: 83.5 },
  { day: "Tue", rate: 87.1, forecast: 85.0 },
  { day: "Wed", rate: 89.3, forecast: 87.5 },
  { day: "Thu", rate: 91.5, forecast: 90.0 },
  { day: "Fri", rate: 94.8, forecast: 93.0 },
  { day: "Sat", rate: 97.2, forecast: 95.5 },
  { day: "Sun", rate: 88.7, forecast: 86.0 },
];

const mockGuestSegmentData = [
  { name: "Business", value: 35, color: "#10b981" },
  { name: "Leisure", value: 45, color: "#3b82f6" },
  { name: "Group", value: 15, color: "#f59e0b" },
  { name: "Other", value: 5, color: "#ef4444" },
];

const mockInsights: AnalyticsInsight[] = [
  {
    id: "1",
    title: "Weekend Occupancy Opportunity",
    description: "Weekend occupancy rates are 8% higher than weekdays, but pricing hasn't been optimized accordingly.",
    type: "optimization",
    category: "revenue",
    priority: "high",
    confidence: 0.89,
    impact: {
      metric: "revenue",
      currentValue: 247500,
      potentialValue: 267800,
      impactAmount: 20300,
      impactPercentage: 8.2,
      timeframe: "next 30 days",
    },
    evidence: [],
    recommendations: [
      {
        title: "Implement Dynamic Weekend Pricing",
        description: "Increase weekend rates by 12-15% based on demand patterns",
        action: {
          type: "adjust-pricing",
          description: "Adjust pricing strategy for weekend periods",
          parameters: [
            { name: "weekend_markup", value: 0.15, type: "percentage" },
            { name: "days", value: ["Saturday", "Sunday"], type: "array" },
          ],
        },
        priority: 1,
        effort: "low",
        expectedOutcome: {
          metrics: [
            { name: "Weekend Revenue", currentValue: 85000, expectedValue: 97500, unit: "USD" },
          ],
          timeline: "2-4 weeks",
          confidence: 0.85,
          riskFactors: ["Market competition", "Guest price sensitivity"],
        },
        dependencies: [],
        resources: [
          { type: "staff", description: "Revenue management analyst", quantity: 1 },
        ],
      },
    ],
    generatedAt: new Date(),
    status: "new",
  },
  {
    id: "2",
    title: "Staff Efficiency Decline",
    description: "Staff efficiency has dropped 3.1% over the past week, potentially impacting guest satisfaction.",
    type: "alert",
    category: "operational",
    priority: "medium",
    confidence: 0.92,
    impact: {
      metric: "guest_satisfaction",
      currentValue: 4.6,
      potentialValue: 4.4,
      impactAmount: -0.2,
      impactPercentage: -4.3,
      timeframe: "next 14 days",
    },
    evidence: [],
    recommendations: [
      {
        title: "Staff Training and Support",
        description: "Implement targeted training and provide additional support during peak hours",
        action: {
          type: "staff-training",
          description: "Enhance staff training program",
          parameters: [
            { name: "focus_areas", value: ["customer_service", "efficiency"], type: "array" },
            { name: "duration", value: "2 weeks", type: "string" },
          ],
        },
        priority: 1,
        effort: "medium",
        expectedOutcome: {
          metrics: [
            { name: "Staff Efficiency", currentValue: 78.2, expectedValue: 82.0, unit: "%" },
          ],
          timeline: "2-3 weeks",
          confidence: 0.78,
          riskFactors: ["Staff availability", "Training effectiveness"],
        },
        dependencies: [],
        resources: [
          { type: "training", description: "Staff training program", cost: 5000 },
          { type: "staff", description: "Training coordinator", quantity: 1 },
        ],
      },
    ],
    generatedAt: new Date(),
    status: "new",
  },
];

const mockBenchmarks: BenchmarkComparison[] = [
  {
    metricId: "1",
    currentValue: 247500,
    benchmarkValue: 235000,
    percentile: 72,
    performance: "above-average",
    gap: 12500,
    gapPercentage: 5.3,
    recommendations: [
      {
        title: "Maintain Strong Performance",
        description: "Continue current revenue strategies while exploring upselling opportunities",
        impact: "medium",
        effort: "low",
        timeline: "ongoing",
        category: "revenue",
      },
    ],
  },
  {
    metricId: "2",
    currentValue: 87.3,
    benchmarkValue: 82.5,
    percentile: 78,
    performance: "above-average",
    gap: 4.8,
    gapPercentage: 5.8,
    recommendations: [
      {
        title: "Optimize for Revenue per Room",
        description: "Focus on maximizing revenue from high occupancy rates",
        impact: "high",
        effort: "medium",
        timeline: "1-3 months",
        category: "revenue",
      },
    ],
  },
  {
    metricId: "5",
    currentValue: 78.2,
    benchmarkValue: 75,
    percentile: 58,
    performance: "average",
    gap: 3.2,
    gapPercentage: 4.3,
    recommendations: [
      {
        title: "Implement Staff Productivity Tools",
        description: "Invest in technology and training to improve staff efficiency",
        impact: "high",
        effort: "high",
        timeline: "3-6 months",
        category: "operational",
      },
    ],
  },
];

export default function AdvancedAnalytics() {
  const [selectedPeriod, setSelectedPeriod] = useState("7d");
  const [activeTab, setActiveTab] = useState("overview");
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  // Simulate real-time updates
  useEffect(() => {
    const interval = setInterval(() => {
      setRefreshing(true);
      setTimeout(() => setRefreshing(false), 1000);
    }, 30000); // Refresh every 30 seconds

    return () => clearInterval(interval);
  }, []);

  const filteredMetrics = useMemo(() => {
    return mockKPIMetrics.filter(metric => 
      metric.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      metric.category.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [searchQuery]);

  const getStatusIcon = (status: MetricStatus) => {
    switch (status) {
      case "excellent": return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "good": return <CheckCircle className="h-4 w-4 text-blue-500" />;
      case "warning": return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      case "critical": return <AlertTriangle className="h-4 w-4 text-red-500" />;
      default: return <Clock className="h-4 w-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: MetricStatus) => {
    switch (status) {
      case "excellent": return "text-green-600 bg-green-50 border-green-200";
      case "good": return "text-blue-600 bg-blue-50 border-blue-200";
      case "warning": return "text-yellow-600 bg-yellow-50 border-yellow-200";
      case "critical": return "text-red-600 bg-red-50 border-red-200";
      default: return "text-gray-600 bg-gray-50 border-gray-200";
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case "up": return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down": return <TrendingDown className="h-4 w-4 text-red-500" />;
      default: return <Minus className="h-4 w-4 text-gray-500" />;
    }
  };

  const formatValue = (value: number, unit: string) => {
    if (unit === "USD") {
      return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value);
    } else if (unit === "%") {
      return `${value.toFixed(1)}%`;
    } else if (unit === "/5") {
      return `${value.toFixed(1)}/5`;
    }
    return `${value.toLocaleString()} ${unit}`;
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => setRefreshing(false), 2000);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
              Advanced Analytics
            </h1>
            <p className="text-muted-foreground mt-2">
              Real-time insights, predictive analytics, and executive dashboards
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1d">24 Hours</SelectItem>
                <SelectItem value="7d">7 Days</SelectItem>
                <SelectItem value="30d">30 Days</SelectItem>
                <SelectItem value="90d">90 Days</SelectItem>
                <SelectItem value="1y">1 Year</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={handleRefresh} disabled={refreshing} className="apple-button">
              <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" className="apple-button">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button className="apple-button bg-primary hover:bg-primary/90">
              <Plus className="h-4 w-4 mr-2" />
              New Widget
            </Button>
          </div>
        </div>

        {/* Quick Status Bar */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {filteredMetrics.slice(0, 6).map((metric) => (
            <Card key={metric.id} className="glass-panel">
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusIcon(metric.status)}
                    <span className="text-xs font-medium text-muted-foreground">{metric.name}</span>
                  </div>
                  {getTrendIcon(metric.trend.direction)}
                </div>
                <div className="space-y-1">
                  <p className="text-lg font-bold">{formatValue(metric.value, metric.unit)}</p>
                  <div className="flex items-center space-x-2">
                    <span className={`text-xs ${metric.trend.direction === "up" ? "text-green-600" : metric.trend.direction === "down" ? "text-red-600" : "text-gray-600"}`}>
                      {metric.trend.direction === "up" ? "+" : metric.trend.direction === "down" ? "-" : ""}
                      {Math.abs(metric.trend.percentage)}%
                    </span>
                    <span className="text-xs text-muted-foreground">{metric.trend.period}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Main Dashboard Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="kpis">KPI Dashboard</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
            <TabsTrigger value="benchmarks">Benchmarking</TabsTrigger>
            <TabsTrigger value="executive">Executive</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Revenue Trends */}
            <Card className="glass-panel">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Revenue Trends</CardTitle>
                    <CardDescription>Monthly revenue vs target and last year</CardDescription>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant="outline">Live Data</Badge>
                    <Button variant="outline" size="sm" className="apple-button">
                      <Maximize className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="h-80">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={mockRevenueData}>
                      <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                      <XAxis dataKey="month" />
                      <YAxis tickFormatter={(value) => `$${(value / 1000).toFixed(0)}K`} />
                      <Tooltip 
                        formatter={(value: number, name: string) => [
                          new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(value),
                          name === 'revenue' ? 'Actual Revenue' : 
                          name === 'target' ? 'Target' : 'Last Year'
                        ]}
                      />
                      <Legend />
                      <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.3} name="revenue" />
                      <Area type="monotone" dataKey="target" stackId="2" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.2} name="target" />
                      <Area type="monotone" dataKey="lastYear" stackId="3" stroke="#6b7280" fill="#6b7280" fillOpacity={0.1} name="lastYear" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </CardContent>
            </Card>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Occupancy Forecast */}
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Weekly Occupancy Forecast</CardTitle>
                  <CardDescription>Actual vs forecasted occupancy rates</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={mockOccupancyData}>
                        <CartesianGrid strokeDasharray="3 3" className="opacity-30" />
                        <XAxis dataKey="day" />
                        <YAxis domain={[70, 100]} tickFormatter={(value) => `${value}%`} />
                        <Tooltip formatter={(value: number) => [`${value}%`, '']} />
                        <Legend />
                        <Bar dataKey="rate" fill="#10b981" name="Actual" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="forecast" fill="#3b82f6" name="Forecast" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>

              {/* Guest Segments */}
              <Card className="glass-panel">
                <CardHeader>
                  <CardTitle>Guest Segments</CardTitle>
                  <CardDescription>Distribution of guest types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={mockGuestSegmentData}
                          cx="50%"
                          cy="50%"
                          outerRadius={80}
                          dataKey="value"
                          label={({ name, value }) => `${name}: ${value}%`}
                        >
                          {mockGuestSegmentData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value: number) => [`${value}%`, '']} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="kpis" className="space-y-6">
            {/* Search and Filters */}
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search KPI metrics..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <Select defaultValue="all">
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="revenue">Revenue</SelectItem>
                  <SelectItem value="operational">Operational</SelectItem>
                  <SelectItem value="guest-satisfaction">Guest Satisfaction</SelectItem>
                  <SelectItem value="marketing">Marketing</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* KPI Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMetrics.map((metric) => (
                <Card key={metric.id} className="glass-panel">
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        {getStatusIcon(metric.status)}
                        <CardTitle className="text-sm font-medium">{metric.name}</CardTitle>
                      </div>
                      <Badge variant="outline" className={getStatusColor(metric.status)}>
                        {metric.status}
                      </Badge>
                    </div>
                    <CardDescription className="text-xs">{metric.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Main Value */}
                      <div className="text-center">
                        <p className="text-3xl font-bold">{formatValue(metric.value, metric.unit)}</p>
                        <div className="flex items-center justify-center space-x-2 mt-1">
                          {getTrendIcon(metric.trend.direction)}
                          <span className={`text-sm ${metric.trend.direction === "up" ? "text-green-600" : metric.trend.direction === "down" ? "text-red-600" : "text-gray-600"}`}>
                            {metric.trend.direction === "up" ? "+" : metric.trend.direction === "down" ? "-" : ""}
                            {Math.abs(metric.trend.percentage)}%
                          </span>
                          <span className="text-sm text-muted-foreground">{metric.trend.period}</span>
                        </div>
                      </div>

                      {/* Progress Bar */}
                      {metric.target && (
                        <div className="space-y-2">
                          <div className="flex justify-between text-xs">
                            <span>Progress to Target</span>
                            <span>{Math.min(100, (metric.value / metric.target) * 100).toFixed(1)}%</span>
                          </div>
                          <Progress value={Math.min(100, (metric.value / metric.target) * 100)} className="h-2" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>Current: {formatValue(metric.value, metric.unit)}</span>
                            <span>Target: {formatValue(metric.target, metric.unit)}</span>
                          </div>
                        </div>
                      )}

                      {/* Mini Trend Chart */}
                      <div className="h-12">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={metric.trend.data}>
                            <Line 
                              type="monotone" 
                              dataKey="value" 
                              stroke={metric.trend.direction === "up" ? "#10b981" : metric.trend.direction === "down" ? "#ef4444" : "#6b7280"} 
                              strokeWidth={2}
                              dot={false}
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>

                      {/* Benchmark Comparison */}
                      {metric.benchmark && (
                        <div className="text-xs space-y-1">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">vs Industry Benchmark</span>
                            <span className={`font-medium ${metric.value > metric.benchmark ? "text-green-600" : "text-red-600"}`}>
                              {metric.value > metric.benchmark ? "+" : ""}{((metric.value - metric.benchmark) / metric.benchmark * 100).toFixed(1)}%
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span>Benchmark: {formatValue(metric.benchmark, metric.unit)}</span>
                            <span className={metric.value > metric.benchmark ? "text-green-600" : "text-red-600"}>
                              {metric.value > metric.benchmark ? "Above" : "Below"}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="insights" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">AI-Generated Insights</h3>
                <p className="text-sm text-muted-foreground">Automated analysis and recommendations</p>
              </div>
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-primary border-primary/50">
                  <Sparkles className="h-3 w-3 mr-1" />
                  AI Powered
                </Badge>
                <Button variant="outline" size="sm" className="apple-button">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
              </div>
            </div>

            <div className="space-y-4">
              {mockInsights.map((insight) => (
                <Card key={insight.id} className="glass-panel">
                  <CardHeader>
                    <div className="flex items-start justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-lg ${insight.priority === "high" ? "bg-red-100 text-red-600" : insight.priority === "medium" ? "bg-yellow-100 text-yellow-600" : "bg-blue-100 text-blue-600"}`}>
                          {insight.type === "optimization" ? <Target className="h-4 w-4" /> :
                           insight.type === "alert" ? <Bell className="h-4 w-4" /> :
                           <Lightbulb className="h-4 w-4" />}
                        </div>
                        <div>
                          <CardTitle className="text-lg">{insight.title}</CardTitle>
                          <CardDescription className="mt-1">{insight.description}</CardDescription>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant={insight.priority === "high" ? "destructive" : insight.priority === "medium" ? "secondary" : "default"}>
                          {insight.priority} priority
                        </Badge>
                        <Badge variant="outline">
                          {(insight.confidence * 100).toFixed(0)}% confidence
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {/* Impact Summary */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-muted/30 rounded-lg">
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Current Value</p>
                          <p className="text-lg font-semibold">{formatValue(insight.impact.currentValue, insight.impact.metric === "revenue" ? "USD" : "%")}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Potential Value</p>
                          <p className="text-lg font-semibold">{formatValue(insight.impact.potentialValue, insight.impact.metric === "revenue" ? "USD" : "%")}</p>
                        </div>
                        <div className="text-center">
                          <p className="text-sm text-muted-foreground">Impact</p>
                          <p className={`text-lg font-semibold ${insight.impact.impactAmount > 0 ? "text-green-600" : "text-red-600"}`}>
                            {insight.impact.impactAmount > 0 ? "+" : ""}{formatValue(Math.abs(insight.impact.impactAmount), insight.impact.metric === "revenue" ? "USD" : "")}
                          </p>
                          <p className="text-xs text-muted-foreground">({insight.impact.impactPercentage > 0 ? "+" : ""}{insight.impact.impactPercentage.toFixed(1)}%)</p>
                        </div>
                      </div>

                      {/* Recommendations */}
                      <div className="space-y-3">
                        <h4 className="font-medium flex items-center">
                          <Award className="h-4 w-4 mr-2" />
                          Recommended Actions
                        </h4>
                        {insight.recommendations.map((rec, index) => (
                          <div key={index} className="border rounded-lg p-4">
                            <div className="flex items-start justify-between mb-2">
                              <h5 className="font-medium">{rec.title}</h5>
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {rec.effort} effort
                                </Badge>
                                <Badge variant="outline" className="text-xs">
                                  Priority {rec.priority}
                                </Badge>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
                              <div>
                                <p className="font-medium mb-1">Expected Outcome:</p>
                                {rec.expectedOutcome.metrics.map((metric, metricIndex) => (
                                  <div key={metricIndex} className="flex justify-between">
                                    <span>{metric.name}:</span>
                                    <span className="font-medium">
                                      {formatValue(metric.currentValue, metric.unit)} → {formatValue(metric.expectedValue, metric.unit)}
                                    </span>
                                  </div>
                                ))}
                                <p className="text-muted-foreground mt-1">Timeline: {rec.expectedOutcome.timeline}</p>
                              </div>
                              <div>
                                <p className="font-medium mb-1">Required Resources:</p>
                                {rec.resources.map((resource, resourceIndex) => (
                                  <div key={resourceIndex} className="flex justify-between">
                                    <span className="capitalize">{resource.type}:</span>
                                    <span>{resource.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                            <div className="flex items-center justify-between mt-3">
                              <div className="text-xs text-muted-foreground">
                                Confidence: {(rec.expectedOutcome.confidence * 100).toFixed(0)}%
                              </div>
                              <div className="flex items-center space-x-2">
                                <Button variant="outline" size="sm" className="apple-button">
                                  <Eye className="h-3 w-3 mr-1" />
                                  Details
                                </Button>
                                <Button size="sm" className="apple-button">
                                  Implement
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="benchmarks" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Industry Benchmarking</h3>
                <p className="text-sm text-muted-foreground">Compare your performance against industry standards</p>
              </div>
              <div className="flex items-center space-x-2">
                <Select defaultValue="hospitality">
                  <SelectTrigger className="w-[150px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hospitality">Hospitality</SelectItem>
                    <SelectItem value="hotels">Hotels Only</SelectItem>
                    <SelectItem value="resorts">Resorts Only</SelectItem>
                    <SelectItem value="boutique">Boutique Hotels</SelectItem>
                  </SelectContent>
                </Select>
                <Button variant="outline" className="apple-button">
                  <Download className="h-4 w-4 mr-2" />
                  Report
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {mockBenchmarks.map((benchmark, index) => {
                const metric = mockKPIMetrics.find(m => m.id === benchmark.metricId);
                if (!metric) return null;

                return (
                  <Card key={index} className="glass-panel">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center space-x-2">
                            <span>{metric.name}</span>
                            <Badge variant={
                              benchmark.performance === "top-quartile" ? "default" :
                              benchmark.performance === "above-average" ? "secondary" :
                              benchmark.performance === "average" ? "outline" :
                              "destructive"
                            }>
                              {benchmark.performance.replace("-", " ")}
                            </Badge>
                          </CardTitle>
                          <CardDescription>
                            You're in the {benchmark.percentile}th percentile of the industry
                          </CardDescription>
                        </div>
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">Gap</p>
                          <p className={`text-lg font-semibold ${benchmark.gap > 0 ? "text-green-600" : "text-red-600"}`}>
                            {benchmark.gap > 0 ? "+" : ""}{formatValue(Math.abs(benchmark.gap), metric.unit)}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            ({benchmark.gapPercentage > 0 ? "+" : ""}{benchmark.gapPercentage.toFixed(1)}%)
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {/* Performance Comparison */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                          <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">Your Performance</p>
                            <p className="text-xl font-bold">{formatValue(benchmark.currentValue, metric.unit)}</p>
                          </div>
                          <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">Industry Average</p>
                            <p className="text-xl font-bold">{formatValue(benchmark.benchmarkValue, metric.unit)}</p>
                          </div>
                          <div className="text-center p-3 bg-muted/30 rounded-lg">
                            <p className="text-sm text-muted-foreground">Percentile Rank</p>
                            <p className="text-xl font-bold">{benchmark.percentile}th</p>
                          </div>
                        </div>

                        {/* Percentile Progress */}
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Percentile Performance</span>
                            <span>{benchmark.percentile}th percentile</span>
                          </div>
                          <Progress value={benchmark.percentile} className="h-3" />
                          <div className="flex justify-between text-xs text-muted-foreground">
                            <span>0th (Bottom)</span>
                            <span>50th (Average)</span>
                            <span>100th (Top)</span>
                          </div>
                        </div>

                        {/* Recommendations */}
                        <div className="space-y-3">
                          <h4 className="font-medium">Improvement Recommendations</h4>
                          {benchmark.recommendations.map((rec, recIndex) => (
                            <div key={recIndex} className="border rounded-lg p-3">
                              <div className="flex items-start justify-between mb-2">
                                <h5 className="font-medium">{rec.title}</h5>
                                <div className="flex items-center space-x-2">
                                  <Badge variant="outline" className="text-xs">
                                    {rec.impact} impact
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {rec.effort} effort
                                  </Badge>
                                </div>
                              </div>
                              <p className="text-sm text-muted-foreground mb-2">{rec.description}</p>
                              <div className="flex items-center justify-between text-xs">
                                <span className="text-muted-foreground">Timeline: {rec.timeline}</span>
                                <span className="text-muted-foreground capitalize">Category: {rec.category}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </TabsContent>

          <TabsContent value="executive" className="space-y-6">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Executive Dashboard</h3>
                <p className="text-sm text-muted-foreground">High-level insights for leadership</p>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" className="apple-button">
                  <CalendarIcon className="h-4 w-4 mr-2" />
                  Schedule Report
                </Button>
                <Button variant="outline" className="apple-button">
                  <Share className="h-4 w-4 mr-2" />
                  Share
                </Button>
                <Button className="apple-button">
                  <Download className="h-4 w-4 mr-2" />
                  Export Summary
                </Button>
              </div>
            </div>

            {/* Executive Summary Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card className="glass-panel border-l-4 border-l-green-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Revenue Growth</p>
                      <p className="text-2xl font-bold text-green-600">+12.5%</p>
                      <p className="text-xs text-muted-foreground">vs last month</p>
                    </div>
                    <TrendingUp className="h-8 w-8 text-green-500" />
                  </div>
                </CardContent>
              </Card>
              
              <Card className="glass-panel border-l-4 border-l-blue-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Guest Satisfaction</p>
                      <p className="text-2xl font-bold text-blue-600">4.6/5</p>
                      <p className="text-xs text-muted-foreground">+2.2% improvement</p>
                    </div>
                    <Star className="h-8 w-8 text-blue-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-l-4 border-l-purple-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Occupancy Rate</p>
                      <p className="text-2xl font-bold text-purple-600">87.3%</p>
                      <p className="text-xs text-muted-foreground">Above target</p>
                    </div>
                    <Users className="h-8 w-8 text-purple-500" />
                  </div>
                </CardContent>
              </Card>

              <Card className="glass-panel border-l-4 border-l-orange-500">
                <CardContent className="p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Operational Efficiency</p>
                      <p className="text-2xl font-bold text-orange-600">78.2%</p>
                      <p className="text-xs text-muted-foreground">Needs attention</p>
                    </div>
                    <Activity className="h-8 w-8 text-orange-500" />
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Key Highlights */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>This Month's Highlights</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-green-600 flex items-center">
                      <CheckCircle className="h-4 w-4 mr-2" />
                      Achievements
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <span>Revenue exceeded target by $12.5K (+5.3%)</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <span>Guest satisfaction improved to 4.6/5 stars</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <span>Weekend occupancy reached 97.2%</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-green-500 rounded-full mt-2"></div>
                        <span>Marketing cost per acquisition decreased 8.2%</span>
                      </li>
                    </ul>
                  </div>
                  <div className="space-y-4">
                    <h4 className="font-medium text-orange-600 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2" />
                      Areas for Attention
                    </h4>
                    <ul className="space-y-2 text-sm">
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                        <span>Staff efficiency declined 3.1% this week</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                        <span>Weekday occupancy below optimal levels</span>
                      </li>
                      <li className="flex items-start space-x-2">
                        <div className="w-2 h-2 bg-orange-500 rounded-full mt-2"></div>
                        <span>Food & beverage revenue growth slowing</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Strategic Outlook */}
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Strategic Outlook - Next 30 Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <h4 className="font-medium text-green-800">Revenue Forecast</h4>
                      <p className="text-2xl font-bold text-green-600">$285K</p>
                      <p className="text-sm text-green-700">+15% projected growth</p>
                    </div>
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <h4 className="font-medium text-blue-800">Occupancy Target</h4>
                      <p className="text-2xl font-bold text-blue-600">89%</p>
                      <p className="text-sm text-blue-700">Peak season approaching</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <h4 className="font-medium text-purple-800">Investment ROI</h4>
                      <p className="text-2xl font-bold text-purple-600">24%</p>
                      <p className="text-sm text-purple-700">Technology upgrades</p>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h4 className="font-medium mb-3">Key Strategic Initiatives</h4>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Weekend Pricing Optimization</p>
                          <p className="text-sm text-muted-foreground">Implement dynamic pricing for peak periods</p>
                        </div>
                        <Badge variant="default">In Progress</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Staff Training Program</p>
                          <p className="text-sm text-muted-foreground">Enhance customer service and efficiency</p>
                        </div>
                        <Badge variant="secondary">Planned</Badge>
                      </div>
                      <div className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium">Digital Experience Platform</p>
                          <p className="text-sm text-muted-foreground">Mobile app and guest portal enhancement</p>
                        </div>
                        <Badge variant="outline">Under Review</Badge>
                      </div>
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
