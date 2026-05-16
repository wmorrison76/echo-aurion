/**
 * PHASE 1: CORE LABOR OPERATIONS - Week 1 Day 3-4
 * Dashboard Layout & Mini-Panels Component
 *
 * Main dashboard showing:
 * - KPI cards (sales, labor %, staffing efficiency)
 * - Real-time metrics with 7-day trends
 * - Status indicators (green/yellow/red)
 * - Mini-panels: Overtime Risk, Scheduled Staff, Forecast Accuracy
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { TrendingUp, TrendingDown, AlertCircle, CheckCircle } from 'lucide-react';
import OvertimePredictionPanel from './OvertimePredictionPanel';
import ScheduledStaffPanel from './ScheduledStaffPanel';
import ForecastAccuracyPanel from './ForecastAccuracyPanel';

interface KPIData {
  sales_today: number;
  labor_cost_today: number;
  labor_pct: number;
  staffing_efficiency: number;
  covers_today: number;
  revenue_per_hour: number;
  trend_7day: {
    sales: number;
    labor_pct: number;
    efficiency: number;
  };
}

interface KPIPanelProps {
  orgId: string;
  locationId?: string;
  refreshInterval?: number;
}

export const DashboardLayout: React.FC<KPIPanelProps> = ({
  orgId,
  locationId,
  refreshInterval = 300000, // 5 minutes
}) => {
  const [kpis, setKpis] = useState<KPIData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  useEffect(() => {
    const fetchKPIs = async () => {
      try {
        setLoading(true);
        const query = locationId ? `?location_id=${locationId}` : '';
        const response = await fetch(`/api/v1/kpi/daily${query}`, {
          headers: { 'X-Org-ID': orgId },
        });

        if (!response.ok) throw new Error('Failed to fetch KPIs');

        const data = await response.json();
        setKpis(data);
        setLastUpdated(new Date());
        setError(null);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Error loading KPIs');
      } finally {
        setLoading(false);
      }
    };

    fetchKPIs();
    const interval = setInterval(fetchKPIs, refreshInterval);

    return () => clearInterval(interval);
  }, [orgId, locationId, refreshInterval]);

  return (
    <div className="w-full space-y-6 p-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-sm text-gray-500 mt-1">
            Last updated: {lastUpdated.toLocaleTimeString()}
          </p>
        </div>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {loading ? (
          <div className="col-span-full text-center py-12 text-gray-500">Loading KPIs...</div>
        ) : error ? (
          <div className="col-span-full bg-red-50 border border-red-200 rounded-lg p-4 text-red-700">
            {error}
          </div>
        ) : kpis ? (
          <>
            <KPICard
              title="Sales Today"
              value={`$${kpis.sales_today.toLocaleString()}`}
              trend={kpis.trend_7day.sales}
              status={getStatus(kpis.sales_today, 1000, 5000)}
              target="$5,000"
            />
            <KPICard
              title="Labor Cost"
              value={`$${kpis.labor_cost_today.toLocaleString()}`}
              trend={-5}
              status={getStatus(kpis.labor_cost_today, 0, 1500, 'lower-is-better')}
              target="<$1,500"
            />
            <KPICard
              title="Labor %"
              value={`${kpis.labor_pct.toFixed(1)}%`}
              trend={-2}
              status={getStatus(kpis.labor_pct, 20, 30)}
              target="25-30%"
              optimal={[25, 30]}
            />
            <KPICard
              title="Staffing Efficiency"
              value={`${kpis.staffing_efficiency.toFixed(0)}%`}
              trend={kpis.trend_7day.efficiency}
              status={getStatus(kpis.staffing_efficiency, 80, 100)}
              target=">90%"
            />
            <KPICard
              title="Covers Today"
              value={kpis.covers_today.toString()}
              trend={12}
              status="neutral"
              target="Avg: 150"
            />
            <KPICard
              title="Revenue/Hour"
              value={`$${kpis.revenue_per_hour.toFixed(2)}`}
              trend={8}
              status="success"
              target="$45+"
            />
          </>
        ) : null}
      </div>

      {/* Mini Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-8">
        <OvertimePredictionPanel organizationId={orgId} />
        <ScheduledStaffPanel organizationId={orgId} />
        <ForecastAccuracyPanel organizationId={orgId} />
      </div>
    </div>
  );
};

interface KPICardProps {
  title: string;
  value: string | number;
  trend?: number;
  status: 'success' | 'warning' | 'error' | 'neutral';
  target?: string;
  optimal?: [number, number];
}

const KPICard: React.FC<KPICardProps> = ({
  title,
  value,
  trend,
  status,
  target,
  optimal,
}) => {
  const statusColors = {
    success: 'bg-green-50 border-green-200 text-green-700',
    warning: 'bg-yellow-50 border-yellow-200 text-yellow-700',
    error: 'bg-red-50 border-red-200 text-red-700',
    neutral: 'bg-gray-50 border-gray-200 text-gray-700',
  };

  const statusIcons = {
    success: <CheckCircle className="w-5 h-5" />,
    warning: <AlertCircle className="w-5 h-5" />,
    error: <AlertCircle className="w-5 h-5" />,
    neutral: <div className="w-5 h-5" />,
  };

  return (
    <Card className={`border-2 ${statusColors[status]}`}>
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-sm font-semibold">{title}</CardTitle>
          {statusIcons[status]}
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="text-3xl font-bold text-gray-900">{value}</div>

        {trend !== undefined && (
          <div className="flex items-center gap-1">
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4 text-green-600" />
            ) : (
              <TrendingDown className="w-4 h-4 text-red-600" />
            )}
            <span className={`text-sm font-semibold ${trend >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {trend >= 0 ? '+' : ''}{trend}% vs 7-day avg
            </span>
          </div>
        )}

        {target && <div className="text-xs text-gray-600">Target: {target}</div>}

        {optimal && (
          <div className="text-xs text-gray-600">Optimal: {optimal[0]}-{optimal[1]}%</div>
        )}
      </CardContent>
    </Card>
  );
};

// Helper: Determine status based on value and ranges
function getStatus(
  value: number,
  warning: number,
  error: number,
  mode: 'higher-is-better' | 'lower-is-better' = 'higher-is-better'
): 'success' | 'warning' | 'error' {
  if (mode === 'higher-is-better') {
    if (value >= error) return 'success';
    if (value >= warning) return 'warning';
    return 'error';
  } else {
    if (value <= warning) return 'success';
    if (value <= error) return 'warning';
    return 'error';
  }
}


export default DashboardLayout;
