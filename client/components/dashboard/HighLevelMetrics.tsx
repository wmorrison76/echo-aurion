/**
 * HighLevelMetrics
 * Displays four KPI cards: Revenue, COGS %, Labor %, Net Margin
 */

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { TrendingUp, TrendingDown } from 'lucide-react';

interface MetricData {
  revenue: number;
  cogs_percentage: number;
  labor_percentage: number;
  net_margin: number;
}

interface HighLevelMetricsProps {
  data?: MetricData;
  loading?: boolean;
}

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  status?: 'good' | 'warning' | 'danger' | 'neutral';
  trend?: 'up' | 'down';
  subtitle?: string;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  status = 'neutral',
  trend,
  subtitle,
}) => {
  const getStatusColor = (s: string): string => {
    switch (s) {
      case 'good':
        return 'bg-green-50 border-green-200';
      case 'warning':
        return 'bg-yellow-50 border-yellow-200';
      case 'danger':
        return 'bg-red-50 border-red-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const getStatusTextColor = (s: string): string => {
    switch (s) {
      case 'good':
        return 'text-green-700';
      case 'warning':
        return 'text-yellow-700';
      case 'danger':
        return 'text-red-700';
      default:
        return 'text-slate-700';
    }
  };

  return (
    <Card className={`border ${getStatusColor(status)}`}>
      <CardContent className="p-4">
        <div className="space-y-2">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            <div className={`text-2xl font-bold ${getStatusTextColor(status)}`}>
              {value}
            </div>
            {unit && (
              <span className="text-sm font-medium text-muted-foreground">
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
          {trend && (
            <div className="flex items-center gap-1 pt-1">
              {trend === 'up' ? (
                <TrendingUp className="w-3 h-3 text-green-600" />
              ) : (
                <TrendingDown className="w-3 h-3 text-red-600" />
              )}
              <span className="text-xs font-medium text-muted-foreground">
                {trend === 'up' ? 'Improving' : 'Declining'}
              </span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

const HighLevelMetrics: React.FC<HighLevelMetricsProps> = ({
  data,
  loading = false,
}) => {
  if (loading) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-slate-50">
            <CardContent className="p-4 flex items-center justify-center h-24">
              <div className="animate-pulse w-full h-full bg-slate-200 rounded"></div>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  if (!data) {
    return (
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[1, 2, 3, 4].map((i) => (
          <Card key={i} className="bg-slate-50">
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground text-center">
                No data
              </p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  // Determine status for each metric
  const cogsStatus =
    data.cogs_percentage < 28
      ? 'good'
      : data.cogs_percentage < 35
      ? 'warning'
      : 'danger';

  const laborStatus =
    data.labor_percentage < 28
      ? 'good'
      : data.labor_percentage < 35
      ? 'warning'
      : 'danger';

  const marginStatus =
    data.net_margin > 15
      ? 'good'
      : data.net_margin > 10
      ? 'warning'
      : 'danger';

  return (
    <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
      <MetricCard
        title="Revenue"
        value={`$${(data.revenue / 1000).toFixed(1)}`}
        unit="K"
        status="neutral"
        subtitle={`${data.revenue.toLocaleString()} total`}
      />

      <MetricCard
        title="COGS %"
        value={data.cogs_percentage.toFixed(1)}
        unit="%"
        status={cogsStatus}
        subtitle="Target: <28%"
      />

      <MetricCard
        title="Labor %"
        value={data.labor_percentage.toFixed(1)}
        unit="%"
        status={laborStatus}
        subtitle="Target: <30%"
      />

      <MetricCard
        title="Net Margin"
        value={data.net_margin.toFixed(1)}
        unit="%"
        status={marginStatus}
        subtitle="Target: >15%"
      />
    </div>
  );
};

export default HighLevelMetrics;
