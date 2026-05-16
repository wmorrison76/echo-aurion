import Layout from "@/components/Layout";
import MoveablePanel from "@/components/MoveablePanel";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  Users,
  Calendar,
  Target,
  BarChart3,
  PieChart,
  LineChart,
  Download,
  Filter,
  RefreshCw,
  AlertTriangle,
  CheckCircle,
  Clock,
  Building2,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  Home,
  ArrowLeft,
} from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";

// Sample analytics data
const revenueData = [
  { month: "Jan", revenue: 185000, target: 200000, events: 18 },
  { month: "Feb", revenue: 205000, target: 210000, events: 22 },
  { month: "Mar", revenue: 225000, target: 220000, events: 25 },
  { month: "Apr", revenue: 195000, target: 230000, events: 20 },
  { month: "May", revenue: 265000, target: 240000, events: 28 },
  { month: "Jun", revenue: 285000, target: 250000, events: 32 },
];

const departmentPerformance = [
  { name: "Main Ballroom", revenue: 485000, events: 45, capacity: "85%", trend: "up" },
  { name: "Conference Center", revenue: 325000, events: 38, capacity: "72%", trend: "up" },
  { name: "Garden Pavilion", revenue: 280000, events: 28, capacity: "68%", trend: "down" },
  { name: "Outdoor Grounds", revenue: 195000, events: 22, capacity: "55%", trend: "up" },
  { name: "Private Dining", revenue: 165000, events: 35, capacity: "78%", trend: "up" },
  { name: "Rooftop Terrace", revenue: 145000, events: 18, capacity: "45%", trend: "down" },
];

const customerSegments = [
  { segment: "Corporate", revenue: 945000, percentage: 52, growth: "+15.2%" },
  { segment: "Weddings", revenue: 485000, percentage: 27, growth: "+8.7%" },
  { segment: "Social Events", revenue: 285000, percentage: 16, growth: "+12.3%" },
  { segment: "Conferences", revenue: 95000, percentage: 5, growth: "-2.1%" },
];

const kpiMetrics = [
  {
    title: "Total Revenue",
    value: "$1.81M",
    change: "+18.2%",
    trend: "up",
    icon: DollarSign,
    target: "Target: $1.9M",
    progress: 95,
  },
  {
    title: "Event Bookings",
    value: "156",
    change: "+12.8%",
    trend: "up",
    icon: Calendar,
    target: "Target: 180",
    progress: 87,
  },
  {
    title: "Customer Satisfaction",
    value: "4.8/5",
    change: "+0.3",
    trend: "up",
    icon: Star,
    target: "Target: 4.5",
    progress: 96,
  },
  {
    title: "Occupancy Rate",
    value: "74.5%",
    change: "-2.1%",
    trend: "down",
    icon: Building2,
    target: "Target: 80%",
    progress: 74,
  },
];

const upcomingInsights = [
  {
    title: "Q2 Revenue Forecast",
    description: "Projected to exceed target by 12% based on current bookings",
    severity: "success",
    action: "Schedule capacity expansion meeting",
    date: "Next 30 days",
  },
  {
    title: "Summer Wedding Season",
    description: "Garden Pavilion bookings down 15% vs last year",
    severity: "warning",
    action: "Launch targeted marketing campaign",
    date: "April - June",
  },
  {
    title: "Corporate Event Opportunity",
    description: "Tech industry events showing 25% growth potential",
    severity: "info",
    action: "Develop tech-focused packages",
    date: "Q3 2024",
  },
];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState("6months");
  const [selectedDepartment, setSelectedDepartment] = useState("all");

  const getProgressColor = (value: number) => {
    if (value >= 90) return "bg-green-500";
    if (value >= 70) return "bg-yellow-500";
    return "bg-red-500";
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case "success":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case "warning":
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />;
      default:
        return <Clock className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Navigation Breadcrumbs */}
        <div className="flex items-center justify-between">
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink asChild>
                  <Link to="/" className="flex items-center space-x-2 hover:text-primary">
                    <Home className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage className="font-medium">Analytics & Reporting</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          <Button
            variant="outline"
            size="sm"
            asChild
            className="apple-button"
          >
            <Link to="/" className="flex items-center space-x-2">
              <ArrowLeft className="h-4 w-4" />
              <span>Back to Dashboard</span>
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Analytics & Reporting</h1>
            <p className="text-muted-foreground mt-2">
              Advanced analytics with AI-powered insights and 18-month forecasting
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-40 apple-button">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1month">Last Month</SelectItem>
                <SelectItem value="3months">Last 3 Months</SelectItem>
                <SelectItem value="6months">Last 6 Months</SelectItem>
                <SelectItem value="1year">Last Year</SelectItem>
                <SelectItem value="2years">Last 2 Years</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" size="sm" className="apple-button">
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button size="sm" className="apple-button">
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* KPI Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {kpiMetrics.map((metric, index) => (
            <MoveablePanel key={index} className="glass-panel">
              <Card className="bg-transparent border-none shadow-none">
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <metric.icon className="h-5 w-5 text-primary" />
                    <Badge variant="outline" className="text-xs">
                      {metric.target}
                    </Badge>
                  </div>
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.title}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="flex items-end space-x-2">
                    <span className="text-2xl font-bold text-foreground">{metric.value}</span>
                    <div className="flex items-center space-x-1 text-xs">
                      {metric.trend === "up" ? (
                        <ArrowUpRight className="h-3 w-3 text-green-500" />
                      ) : (
                        <ArrowDownRight className="h-3 w-3 text-red-500" />
                      )}
                      <span
                        className={metric.trend === "up" ? "text-green-500" : "text-red-500"}
                      >
                        {metric.change}
                      </span>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs text-muted-foreground">
                      <span>Progress</span>
                      <span>{metric.progress}%</span>
                    </div>
                    <Progress 
                      value={metric.progress} 
                      className="h-2"
                      // Apply custom color based on progress
                    />
                  </div>
                </CardContent>
              </Card>
            </MoveablePanel>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Revenue Trend Chart */}
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <LineChart className="h-5 w-5 text-primary" />
                  <span>Revenue Trend Analysis</span>
                </CardTitle>
                <CardDescription>
                  Monthly revenue vs targets with event correlation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="h-64 flex items-center justify-center border-2 border-dashed border-border/50 rounded-lg">
                  <div className="text-center space-y-2">
                    <BarChart3 className="h-8 w-8 text-muted-foreground mx-auto" />
                    <p className="text-sm text-muted-foreground">
                      Interactive revenue chart would be rendered here
                    </p>
                    <div className="grid grid-cols-3 gap-4 mt-4 text-xs">
                      {revenueData.slice(-3).map((data, index) => (
                        <div key={index} className="text-center">
                          <div className="font-medium">{data.month}</div>
                          <div className="text-muted-foreground">
                            ${(data.revenue / 1000).toFixed(0)}K
                          </div>
                          <div className={`text-xs ${
                            data.revenue >= data.target ? "text-green-500" : "text-red-500"
                          }`}>
                            {data.revenue >= data.target ? "↗" : "↘"} 
                            {Math.abs(((data.revenue - data.target) / data.target * 100)).toFixed(1)}%
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          {/* Department Performance */}
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  <span>Department Performance</span>
                </CardTitle>
                <CardDescription>
                  Revenue and utilization by venue
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {departmentPerformance.map((dept, index) => (
                    <div key={index} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <span className="text-sm font-medium">{dept.name}</span>
                          {dept.trend === "up" ? (
                            <TrendingUp className="h-3 w-3 text-green-500" />
                          ) : (
                            <TrendingDown className="h-3 w-3 text-red-500" />
                          )}
                        </div>
                        <div className="text-right text-xs">
                          <div className="font-medium">${(dept.revenue / 1000).toFixed(0)}K</div>
                          <div className="text-muted-foreground">{dept.events} events</div>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Progress 
                          value={parseInt(dept.capacity)} 
                          className="flex-1 h-2"
                        />
                        <span className="text-xs text-muted-foreground min-w-[3rem]">
                          {dept.capacity}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Customer Segmentation */}
          <MoveablePanel className="glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <PieChart className="h-5 w-5 text-primary" />
                  <span>Customer Segments</span>
                </CardTitle>
                <CardDescription>
                  Revenue breakdown by customer type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {customerSegments.map((segment, index) => (
                    <div key={index} className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ 
                            backgroundColor: `hsl(${index * 90 + 200}, 70%, 50%)` 
                          }}
                        />
                        <div>
                          <div className="text-sm font-medium">{segment.segment}</div>
                          <div className="text-xs text-muted-foreground">
                            ${(segment.revenue / 1000).toFixed(0)}K • {segment.percentage}%
                          </div>
                        </div>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          segment.growth.startsWith('+') ? 'border-green-500 text-green-600' : 'border-red-500 text-red-600'
                        }`}
                      >
                        {segment.growth}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>

          {/* AI Insights & Predictions */}
          <MoveablePanel className="lg:col-span-2 glass-panel">
            <Card className="bg-transparent border-none shadow-none">
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Target className="h-5 w-5 text-primary" />
                  <span>AI Business Insights</span>
                </CardTitle>
                <CardDescription>
                  Predictive analytics and recommendations for your business
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {upcomingInsights.map((insight, index) => (
                    <div key={index} className="p-4 rounded-lg border border-border/50 bg-muted/10">
                      <div className="flex items-start space-x-3">
                        {getSeverityIcon(insight.severity)}
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-2">
                            <h4 className="font-medium text-foreground">{insight.title}</h4>
                            <span className="text-xs text-muted-foreground">{insight.date}</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-3">
                            {insight.description}
                          </p>
                          <div className="flex items-center justify-between">
                            <Button variant="outline" size="sm" className="apple-button text-xs">
                              {insight.action}
                            </Button>
                            <Badge variant="outline" className="text-xs">
                              AI Recommendation
                            </Badge>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </MoveablePanel>
        </div>

        {/* Predictive Analytics Summary */}
        <MoveablePanel className="glass-panel">
          <Card className="bg-transparent border-none shadow-none">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span>18-Month Business Forecast</span>
              </CardTitle>
              <CardDescription>
                AI-powered predictions based on historical data, market trends, and booking patterns
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-green-500">+23%</div>
                  <div className="text-sm text-muted-foreground">Revenue Growth</div>
                  <div className="text-xs text-muted-foreground">Next 6 months</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-blue-500">89%</div>
                  <div className="text-sm text-muted-foreground">Capacity Utilization</div>
                  <div className="text-xs text-muted-foreground">Peak season projection</div>
                </div>
                <div className="text-center space-y-2">
                  <div className="text-2xl font-bold text-purple-500">$3.2M</div>
                  <div className="text-sm text-muted-foreground">Pipeline Value</div>
                  <div className="text-xs text-muted-foreground">18-month outlook</div>
                </div>
              </div>
              <div className="mt-6 p-4 bg-primary/5 rounded-lg border border-primary/20">
                <div className="flex items-center space-x-2 mb-2">
                  <AlertTriangle className="h-4 w-4 text-primary" />
                  <span className="font-medium text-foreground">Key Opportunity</span>
                </div>
                <p className="text-sm text-muted-foreground">
                  AI analysis suggests focusing on corporate tech events in Q3-Q4 could increase annual revenue by 15%. 
                  Consider expanding Conference Center capacity and developing specialized tech packages.
                </p>
              </div>
            </CardContent>
          </Card>
        </MoveablePanel>
      </div>
    </Layout>
  );
}
