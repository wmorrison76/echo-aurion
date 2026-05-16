/**
 * Ecosystem Control Panel - Phase 1: Dashboard Overview
 * Displays KPIs, health metrics, system status, and quick actions
 * Real-time updates for 15,000+ employee organizations
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users,
  TrendingUp,
  TrendingDown,
  Clock,
  AlertCircle,
  CheckCircle,
  Activity,
  Database,
  Shield,
  Download,
  RefreshCw,
  Zap,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
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
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import { cn } from '@/lib/utils';

interface KPIMetric {
  label: string;
  value: number | string;
  change: number;
  trend: 'up' | 'down' | 'neutral';
  icon: React.ReactNode;
  color: string;
}

interface HealthMetric {
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  value: number;
  message: string;
}

interface EcosystemDashboardProps {
  orgName?: string;
  onRefresh?: () => Promise<void>;
  metrics?: {
    totalEmployees: number;
    activeEmployees: number;
    systemAccess: number;
    lastSyncTime: string;
    lastSyncStatus: 'success' | 'error' | 'pending';
    hrSystemHealth: Record<string, 'connected' | 'disconnected' | 'error'>;
    databaseSize: string;
    apiUptime: number;
    dataIntegrity: number;
    securityScore: number;
  };
  chartData?: {
    hourly: Array<{ time: string; active: number; inactive: number }>;
    employeeStatus: Array<{ name: string; value: number }>;
    departmentDistribution: Array<{ name: string; count: number }>;
    syncHistory: Array<{ date: string; success: number; error: number }>;
  };
}

export const EcosystemDashboard: React.FC<EcosystemDashboardProps> = ({
  orgName = 'Your Organization',
  onRefresh,
  metrics = {
    totalEmployees: 12450,
    activeEmployees: 11200,
    systemAccess: 10800,
    lastSyncTime: new Date().toISOString(),
    lastSyncStatus: 'success',
    hrSystemHealth: {
      ADP: 'connected',
      GUSTO: 'connected',
      ONTRACK: 'connected',
      UNFOCUS: 'disconnected',
    },
    databaseSize: '2.4 GB',
    apiUptime: 99.98,
    dataIntegrity: 100,
    securityScore: 94,
  },
  chartData = {
    hourly: [
      { time: '00:00', active: 150, inactive: 50 },
      { time: '06:00', active: 300, inactive: 100 },
      { time: '12:00', active: 800, inactive: 200 },
      { time: '18:00', active: 600, inactive: 400 },
      { time: '23:00', active: 200, inactive: 150 },
    ],
    employeeStatus: [
      { name: 'Active', value: 11200 },
      { name: 'Onboarding', value: 800 },
      { name: 'Inactive', value: 450 },
    ],
    departmentDistribution: [
      { name: 'Operations', count: 4500 },
      { name: 'Kitchen', count: 3200 },
      { name: 'Front House', count: 2800 },
      { name: 'Management', count: 1950 },
    ],
    syncHistory: [
      { date: 'Mon', success: 95, error: 5 },
      { date: 'Tue', success: 98, error: 2 },
      { date: 'Wed', success: 97, error: 3 },
      { date: 'Thu', success: 100, error: 0 },
      { date: 'Fri', success: 96, error: 4 },
    ],
  },
}) => {
  const [isRefreshing, setIsRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;

    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  // KPI Cards Data
  const kpis: KPIMetric[] = [
    {
      label: 'Total Employees',
      value: metrics.totalEmployees.toLocaleString(),
      change: 2.5,
      trend: 'up',
      icon: <Users className="h-5 w-5" />,
      color: 'text-blue-600',
    },
    {
      label: 'Active Employees',
      value: metrics.activeEmployees.toLocaleString(),
      change: 1.2,
      trend: 'up',
      icon: <Activity className="h-5 w-5" />,
      color: 'text-green-600',
    },
    {
      label: 'System Access',
      value: `${((metrics.systemAccess / metrics.totalEmployees) * 100).toFixed(1)}%`,
      change: -0.3,
      trend: 'down',
      icon: <Shield className="h-5 w-5" />,
      color: 'text-purple-600',
    },
    {
      label: 'API Uptime',
      value: `${metrics.apiUptime}%`,
      change: 0.02,
      trend: 'up',
      icon: <Zap className="h-5 w-5" />,
      color: 'text-yellow-600',
    },
  ];

  return (
    <div className="space-y-6">
      {/* Header with Refresh */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Ecosystem Control Panel</h1>
          <p className="text-gray-600 mt-1">{orgName}</p>
        </div>
        <Button
          onClick={handleRefresh}
          disabled={isRefreshing}
          className="gap-2"
        >
          <RefreshCw className={cn('h-4 w-4', isRefreshing && 'animate-spin')} />
          {isRefreshing ? 'Refreshing...' : 'Refresh'}
        </Button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi, idx) => (
          <Card key={idx}>
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between">
                <CardTitle className="text-sm font-medium text-gray-600">
                  {kpi.label}
                </CardTitle>
                <div className={cn('p-2 rounded-lg bg-gray-100', kpi.color)}>
                  {kpi.icon}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-900">{kpi.value}</div>
              <div className="flex items-center gap-1 mt-2 text-sm">
                {kpi.trend === 'up' && (
                  <TrendingUp className="h-4 w-4 text-green-600" />
                )}
                {kpi.trend === 'down' && (
                  <TrendingDown className="h-4 w-4 text-red-600" />
                )}
                <span className={cn(
                  'text-xs font-medium',
                  kpi.trend === 'up' && 'text-green-600',
                  kpi.trend === 'down' && 'text-red-600',
                  kpi.trend === 'neutral' && 'text-gray-600'
                )}>
                  {Math.abs(kpi.change)}% {kpi.trend === 'up' ? 'increase' : 'decrease'} vs last month
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* System Health & HR Connections */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* System Health */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">System Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Last Sync Status */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Last Sync</span>
                <Badge
                  className={cn(
                    metrics.lastSyncStatus === 'success' && 'bg-green-100 text-green-800',
                    metrics.lastSyncStatus === 'error' && 'bg-red-100 text-red-800',
                    metrics.lastSyncStatus === 'pending' && 'bg-blue-100 text-blue-800'
                  )}
                >
                  {metrics.lastSyncStatus === 'success' && (
                    <CheckCircle className="h-3 w-3 mr-1" />
                  )}
                  {metrics.lastSyncStatus === 'error' && (
                    <AlertCircle className="h-3 w-3 mr-1" />
                  )}
                  {metrics.lastSyncStatus === 'pending' && (
                    <Clock className="h-3 w-3 mr-1" />
                  )}
                  {metrics.lastSyncStatus}
                </Badge>
              </div>
              <p className="text-xs text-gray-600">
                {new Date(metrics.lastSyncTime).toLocaleString()}
              </p>
            </div>

            {/* Database Size */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Database Size</span>
                <span className="text-sm font-semibold text-gray-900">
                  {metrics.databaseSize}
                </span>
              </div>
              <Progress value={60} className="h-2" />
              <p className="text-xs text-gray-600">60% of allocated storage</p>
            </div>

            {/* Data Integrity */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Data Integrity</span>
                <span className="text-sm font-semibold text-green-600">
                  {metrics.dataIntegrity}%
                </span>
              </div>
              <Progress value={metrics.dataIntegrity} className="h-2" />
            </div>

            {/* Security Score */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Security Score</span>
                <span className={cn(
                  'text-sm font-semibold',
                  metrics.securityScore >= 90 && 'text-green-600',
                  metrics.securityScore < 90 && metrics.securityScore >= 70 && 'text-yellow-600',
                  metrics.securityScore < 70 && 'text-red-600'
                )}>
                  {metrics.securityScore}/100
                </span>
              </div>
              <Progress value={metrics.securityScore} className="h-2" />
            </div>
          </CardContent>
        </Card>

        {/* HR System Connections */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">HR System Connections</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {Object.entries(metrics.hrSystemHealth).map(([system, status]) => (
              <div
                key={system}
                className="flex items-center justify-between p-2 rounded border border-gray-200"
              >
                <span className="text-sm font-medium text-gray-700">{system}</span>
                <Badge
                  className={cn(
                    status === 'connected' && 'bg-green-100 text-green-800',
                    status === 'disconnected' && 'bg-gray-100 text-gray-800',
                    status === 'error' && 'bg-red-100 text-red-800'
                  )}
                >
                  {status === 'connected' && <CheckCircle className="h-3 w-3 mr-1" />}
                  {status === 'error' && <AlertCircle className="h-3 w-3 mr-1" />}
                  {status}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Hourly Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Hourly Activity</CardTitle>
            <CardDescription>System usage over the last 24 hours</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <AreaChart data={chartData.hourly}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="active"
                  stackId="1"
                  stroke="#3b82f6"
                  fill="#bfdbfe"
                  name="Active"
                />
                <Area
                  type="monotone"
                  dataKey="inactive"
                  stackId="1"
                  stroke="#ef4444"
                  fill="#fecaca"
                  name="Inactive"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Employee Status Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Employee Status</CardTitle>
            <CardDescription>Current distribution</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={chartData.employeeStatus}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${value.toLocaleString()}`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Department Distribution */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Department Distribution</CardTitle>
            <CardDescription>Employees by department</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.departmentDistribution}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#3b82f6" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Sync Success Rate */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Sync Success Rate</CardTitle>
            <CardDescription>Last 7 days</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={chartData.syncHistory}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="success" stackId="a" fill="#10b981" name="Success" />
                <Bar dataKey="error" stackId="a" fill="#ef4444" name="Error" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Button variant="outline" className="h-auto flex-col gap-2 py-3">
              <Download className="h-4 w-4" />
              <span className="text-xs text-center">Export Data</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-3">
              <Users className="h-4 w-4" />
              <span className="text-xs text-center">Bulk Upload</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-3">
              <RefreshCw className="h-4 w-4" />
              <span className="text-xs text-center">Sync Now</span>
            </Button>
            <Button variant="outline" className="h-auto flex-col gap-2 py-3">
              <Shield className="h-4 w-4" />
              <span className="text-xs text-center">Security Audit</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default EcosystemDashboard;
