import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/AppLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  Activity,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Database,
  Zap,
  TrendingUp,
  Server,
} from "lucide-react";
interface PerformanceMetric {
  timestamp: Date;
  value: number;
  threshold?: number;
}
interface SystemHealth {
  name: string;
  status: "healthy" | "warning" | "critical";
  uptime: number;
  lastCheck: Date;
  details: string;
} // Mock data
const mockMetrics = {
  responseTime: Array.from({ length: 24 }).map((_, i) => ({
    timestamp: new Date(Date.now() - (24 - i) * 60 * 60 * 1000),
    time: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toLocaleTimeString(
      "en-US",
      { hour: "2-digit" },
    ),
    value: Math.random() * 200 + 100,
    threshold: 300,
  })),
  cpuUsage: Array.from({ length: 24 }).map((_, i) => ({
    time: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toLocaleTimeString(
      "en-US",
      { hour: "2-digit" },
    ),
    value: Math.random() * 60 + 20,
    threshold: 80,
  })),
  memoryUsage: Array.from({ length: 24 }).map((_, i) => ({
    time: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toLocaleTimeString(
      "en-US",
      { hour: "2-digit" },
    ),
    value: Math.random() * 50 + 30,
    threshold: 85,
  })),
  errorRate: Array.from({ length: 24 }).map((_, i) => ({
    time: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toLocaleTimeString(
      "en-US",
      { hour: "2-digit" },
    ),
    value: Math.random() * 0.5,
    threshold: 1,
  })),
  throughput: Array.from({ length: 24 }).map((_, i) => ({
    time: new Date(Date.now() - (24 - i) * 60 * 60 * 1000).toLocaleTimeString(
      "en-US",
      { hour: "2-digit" },
    ),
    requests: Math.floor(Math.random() * 5000) + 2000,
    successful: Math.floor(Math.random() * 4900) + 2000,
  })),
};
const mockSystemHealth: SystemHealth[] = [
  {
    name: "API Server",
    status: "healthy",
    uptime: 99.98,
    lastCheck: new Date(Date.now() - 30000),
    details: "All services operational",
  },
  {
    name: "Database",
    status: "healthy",
    uptime: 99.99,
    lastCheck: new Date(Date.now() - 15000),
    details: "Response time: 45ms avg",
  },
  {
    name: "Cache Layer",
    status: "healthy",
    uptime: 99.95,
    lastCheck: new Date(Date.now() - 45000),
    details: "Hit rate: 87.3%",
  },
  {
    name: "Integration Service",
    status: "warning",
    uptime: 99.2,
    lastCheck: new Date(Date.now() - 60000),
    details: "Sync queue: 234 items",
  },
  {
    name: "Email Service",
    status: "healthy",
    uptime: 99.7,
    lastCheck: new Date(Date.now() - 30000),
    details: "Delivery rate: 99.1%",
  },
];
export function PerformanceMonitoringPage() {
  const [timeRange, setTimeRange] = useState<"1h" | "24h" | "7d">("24h"); // Calculate statistics const avgResponseTime = useMemo( () => mockMetrics.responseTime.reduce((sum, m) => sum + m.value, 0) / mockMetrics.responseTime.length, [], ); const avgCpuUsage = useMemo( () => mockMetrics.cpuUsage.reduce((sum, m) => sum + m.value, 0) / mockMetrics.cpuUsage.length, [], ); const avgMemoryUsage = useMemo( () => mockMetrics.memoryUsage.reduce((sum, m) => sum + m.value, 0) / mockMetrics.memoryUsage.length, [], ); const avgErrorRate = useMemo( () => (mockMetrics.errorRate.reduce((sum, m) => sum + m.value, 0) / mockMetrics.errorRate.length) * 100, [], ); const totalRequests = useMemo( () => mockMetrics.throughput.reduce((sum, m) => sum + m.requests, 0), [], ); const totalSuccessful = useMemo( () => mockMetrics.throughput.reduce((sum, m) => sum + m.successful, 0), [], ); const successRate = useMemo( () => (totalSuccessful / totalRequests) * 100, [totalRequests, totalSuccessful], ); const healthyServices = useMemo( () => mockSystemHealth.filter((s) => s.status ==="healthy").length, [], ); const overallUptime = useMemo( () => mockSystemHealth.reduce((sum, s) => sum + s.uptime, 0) / mockSystemHealth.length, [], ); return ( <AppLayout> <div className="space-y-6 pb-6"> <div> <h1 className="text-3xl font-bold tracking-tight"> Performance Monitoring </h1> <p className="text-muted-foreground mt-2"> Real-time system health, performance metrics, and analytics </p> </div> {/* Quick Stats */} <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5"> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Response Time</CardTitle> <Clock className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {avgResponseTime.toFixed(0)}ms </div> <p className="text-xs text-muted-foreground"> {avgResponseTime < 300 ?"✓ Optimal" :"⚠ High"} </p> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">CPU Usage</CardTitle> <Zap className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold">{avgCpuUsage.toFixed(1)}%</div> <Progress value={avgCpuUsage} className="mt-2" /> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Memory Usage</CardTitle> <Database className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {avgMemoryUsage.toFixed(1)}% </div> <Progress value={avgMemoryUsage} className="mt-2" /> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Success Rate</CardTitle> <CheckCircle2 className="h-4 w-4 text-green-600" /> </CardHeader> <CardContent> <div className="text-2xl font-bold">{successRate.toFixed(2)}%</div> <Progress value={successRate} className="mt-2" /> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">System Uptime</CardTitle> <TrendingUp className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {overallUptime.toFixed(2)}% </div> <p className="text-xs text-muted-foreground mt-1"> {healthyServices}/{mockSystemHealth.length} services healthy </p> </CardContent> </Card> </div> <Tabs defaultValue="performance" className="space-y-4"> <TabsList> <TabsTrigger value="performance">Performance</TabsTrigger> <TabsTrigger value="health">System Health</TabsTrigger> <TabsTrigger value="errors">Errors & Issues</TabsTrigger> <TabsTrigger value="throughput">Throughput</TabsTrigger> </TabsList> {/* Performance Tab */} <TabsContent value="performance" className="space-y-4"> <Card> <CardHeader> <CardTitle>Response Time (Last 24 Hours)</CardTitle> <CardDescription> API response time in milliseconds </CardDescription> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={300}> <AreaChart data={mockMetrics.responseTime}> <defs> <linearGradient id="colorResponse" x1="0" y1="0" x2="0" y2="1" > <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.8} /> <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} /> </linearGradient> </defs> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="time" /> <YAxis /> <Tooltip formatter={(value) => `${(value as number).toFixed(0)}ms`} /> <Area type="monotone" dataKey="value" stroke="#3b82f6" fill="url(#colorResponse)" /> <Line type="monotone" dataKey="threshold" stroke="#ef4444" strokeDasharray="5 5" dot={false} /> </AreaChart> </ResponsiveContainer> <p className="text-xs text-muted-foreground mt-4"> Threshold: 300ms • Average: {avgResponseTime.toFixed(0)}ms • Max:{""} {Math.max( ...mockMetrics.responseTime.map((m) => m.value), ).toFixed(0)} ms </p> </CardContent> </Card> <div className="grid gap-4 grid-cols-1 lg:grid-cols-2"> <Card> <CardHeader> <CardTitle>CPU Usage</CardTitle> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={250}> <AreaChart data={mockMetrics.cpuUsage}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="time" /> <YAxis /> <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} /> <Area type="monotone" dataKey="value" fill="#f59e0b" /> </AreaChart> </ResponsiveContainer> </CardContent> </Card> <Card> <CardHeader> <CardTitle>Memory Usage</CardTitle> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={250}> <AreaChart data={mockMetrics.memoryUsage}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="time" /> <YAxis /> <Tooltip formatter={(value) => `${(value as number).toFixed(1)}%`} /> <Area type="monotone" dataKey="value" fill="#10b981" /> </AreaChart> </ResponsiveContainer> </CardContent> </Card> </div> </TabsContent> {/* System Health Tab */} <TabsContent value="health" className="space-y-4"> <div className="grid gap-4 grid-cols-1"> {mockSystemHealth.map((service) => ( <Card key={service.name}> <CardContent className="pt-6"> <div className="flex items-start justify-between"> <div className="flex-1"> <div className="flex items-center gap-2 mb-2"> <h3 className="font-semibold text-lg"> {service.name} </h3> <Badge variant={ service.status ==="healthy" ?"default" : service.status ==="warning" ?"secondary" :"destructive" } className="capitalize" > {service.status ==="healthy" && ( <CheckCircle2 className="w-3 h-3 mr-1" /> )} {service.status ==="warning" && ( <AlertTriangle className="w-3 h-3 mr-1" /> )} {service.status} </Badge> </div> <p className="text-sm text-muted-foreground mb-3"> {service.details} </p> <div className="grid gap-4 grid-cols-2 text-sm"> <div> <p className="text-muted-foreground">Uptime</p> <p className="font-bold">{service.uptime}%</p> </div> <div> <p className="text-muted-foreground">Last Check</p> <p className="font-bold"> {service.lastCheck.toLocaleTimeString()} </p> </div> </div> <Progress value={service.uptime} className="mt-3" /> </div> </div> </CardContent> </Card> ))} </div> </TabsContent> {/* Errors & Issues Tab */} <TabsContent value="errors" className="space-y-4"> <Card> <CardHeader> <CardTitle>Error Rate (Last 24 Hours)</CardTitle> <CardDescription> Percentage of requests resulting in errors </CardDescription> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={300}> <LineChart data={mockMetrics.errorRate}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="time" /> <YAxis /> <Tooltip formatter={(value) => `${((value as number) * 100).toFixed(2)}%` } /> <Line type="monotone" dataKey="value" stroke="#ef4444" strokeWidth={2} /> </LineChart> </ResponsiveContainer> </CardContent> </Card> <Card> <CardHeader> <CardTitle>Recent Errors</CardTitle> <CardDescription>Last 10 errors across system</CardDescription> </CardHeader> <CardContent> <div className="space-y-3"> {Array.from({ length: 10 }).map((_, i) => { const errors = ["Database connection timeout","API rate limit exceeded","Invalid request format","Authentication failed","Integration sync failure","Cache invalidation error","Email delivery failed","File upload rejected", ]; return ( <div key={i} className="flex items-center justify-between p-3 border rounded" > <div className="flex items-start gap-3 flex-1"> <AlertTriangle className="w-4 h-4 text-orange-500 mt-0.5 flex-shrink-0" /> <div> <p className="font-medium text-sm"> {errors[i % errors.length]} </p> <p className="text-xs text-muted-foreground"> {new Date( Date.now() - Math.random() * 3600000, ).toLocaleTimeString()} </p> </div> </div> <Badge variant="secondary"> {Math.floor(Math.random() * 5) + 1}x </Badge> </div> ); })} </div> </CardContent> </Card> </TabsContent> {/* Throughput Tab */} <TabsContent value="throughput" className="space-y-4"> <Card> <CardHeader> <CardTitle>Request Throughput (Last 24 Hours)</CardTitle> <CardDescription> Total requests and successful responses </CardDescription> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={300}> <BarChart data={mockMetrics.throughput}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="time" /> <YAxis /> <Tooltip formatter={(value) => `${(value as number).toLocaleString()} requests` } /> <Legend /> <Bar dataKey="requests" fill="#3b82f6" name="Total Requests" /> <Bar dataKey="successful" fill="#10b981" name="Successful" /> </BarChart> </ResponsiveContainer> <div className="grid gap-4 grid-cols-3 mt-6 text-sm"> <div> <p className="text-muted-foreground">Total Requests</p> <p className="text-2xl font-bold"> {(totalRequests / 1000).toFixed(1)}K </p> </div> <div> <p className="text-muted-foreground">Successful</p> <p className="text-2xl font-bold"> {(totalSuccessful / 1000).toFixed(1)}K </p> </div> <div> <p className="text-muted-foreground">Success Rate</p> <p className="text-2xl font-bold"> {successRate.toFixed(2)}% </p> </div> </div> </CardContent> </Card> </TabsContent> </Tabs> {/* Alerts & Recommendations */} <Card> <CardHeader> <CardTitle className="flex items-center gap-2"> <Activity className="w-5 h-5" /> Alerts & Recommendations </CardTitle> </CardHeader> <CardContent className="space-y-3"> <div className="flex items-start gap-3 p-3 border border-yellow-200 rounded-lg bg-yellow-50"> <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" /> <div className="flex-1"> <p className="font-medium text-sm text-yellow-900"> High Memory Usage Detected </p> <p className="text-xs text-yellow-700 mt-1"> Memory usage is trending upward. Consider analyzing active processes. </p> </div> </div> <div className="flex items-start gap-3 p-3 border border-green-200 rounded-lg bg-green-50"> <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> <div className="flex-1"> <p className="font-medium text-sm text-green-900"> Excellent System Performance </p> <p className="text-xs text-green-700 mt-1"> All core services are operating within optimal parameters. </p> </div> </div> <div className="flex items-start gap-3 p-3 border border-blue-200 rounded-lg bg-blue-50"> <AlertTriangle className="w-5 h-5 text-primary flex-shrink-0" /> <div className="flex-1"> <p className="font-medium text-sm text-blue-900"> Scheduled Maintenance Window </p> <p className="text-xs text-blue-700 mt-1"> Database optimization scheduled for Saturday 2am UTC. Expected duration: 2 hours. </p> </div> </div> </CardContent> </Card> </div> </AppLayout> );
}
export default PerformanceMonitoringPage;
