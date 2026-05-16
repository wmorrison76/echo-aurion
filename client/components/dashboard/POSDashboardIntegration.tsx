import React, { useState, useEffect } from 'react';
import { TrendingUp, DollarSign, Users, TrendingDown } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Progress } from '../ui/progress';
import { toast } from '../ui/use-toast';

interface POSMetrics {
  date: string;
  revenue: number;
  covers: number;
  laborCost: number;
  laborPercentage: number;
  revenuePerHour: number;
  averageCheck: number;
}

interface POSIntegrationProps {
  organizationId: string;
  locationId: string;
}

const POSDashboardIntegration: React.FC<POSIntegrationProps> = ({ organizationId, locationId }) => {
  const [posMetrics, setPosMetrics] = useState<POSMetrics | null>(null);
  const [historicalData, setHistoricalData] = useState<POSMetrics[]>([]);
  const [loading, setLoading] = useState(true);
  const [trend, setTrend] = useState<{ revenue: number; covers: number; labor: number }>({
    revenue: 0,
    covers: 0,
    labor: 0,
  });

  useEffect(() => {
    fetchPOSMetrics();
  }, [organizationId, locationId]);

  const fetchPOSMetrics = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `/api/v1/pos/metrics?org_id=${organizationId}&location_id=${locationId}&days=7`,
        { headers: { 'Content-Type': 'application/json' } }
      );

      if (!response.ok) throw new Error('Failed to fetch POS metrics');

      const data = await response.json();
      setPosMetrics(data.today || generateMockTodayMetrics());
      setHistoricalData(data.history || generateMockHistoricalData());

      // Calculate trends
      if (data.history && data.history.length >= 2) {
        const today = data.today;
        const yesterday = data.history[1];

        setTrend({
          revenue: ((today.revenue - yesterday.revenue) / yesterday.revenue) * 100,
          covers: ((today.covers - yesterday.covers) / yesterday.covers) * 100,
          labor: ((today.laborPercentage - yesterday.laborPercentage) / yesterday.laborPercentage) * 100,
        });
      }
    } catch (error) {
      console.error('POS metrics error:', error);
      toast({
        title: 'Error',
        description: 'Failed to load POS metrics',
        variant: 'destructive',
      });
      setPosMetrics(generateMockTodayMetrics());
      setHistoricalData(generateMockHistoricalData());
    } finally {
      setLoading(false);
    }
  };

  if (loading || !posMetrics) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          Loading POS metrics...
        </CardContent>
      </Card>
    );
  }

  const getLaborStatus = (laborPct: number): 'success' | 'warning' | 'error' => {
    if (laborPct <= 28) return 'success';
    if (laborPct <= 35) return 'warning';
    return 'error';
  };

  const getTrendColor = (value: number): string => {
    if (value > 0) return 'text-green-600';
    if (value < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  return (
    <div className="space-y-6">
      {/* Main Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Revenue */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
              <DollarSign className="w-4 h-4 text-green-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${posMetrics.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <div className="flex items-center gap-1 mt-2">
              {trend.revenue > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <p className={`text-xs font-semibold ${getTrendColor(trend.revenue)}`}>
                {trend.revenue > 0 ? '+' : ''}{trend.revenue.toFixed(1)}% vs yesterday
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Covers */}
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">Covers Today</CardTitle>
              <Users className="w-4 h-4 text-blue-600" />
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{posMetrics.covers}</p>
            <div className="flex items-center gap-1 mt-2">
              {trend.covers > 0 ? (
                <TrendingUp className="w-4 h-4 text-green-600" />
              ) : (
                <TrendingDown className="w-4 h-4 text-red-600" />
              )}
              <p className={`text-xs font-semibold ${getTrendColor(trend.covers)}`}>
                {trend.covers > 0 ? '+' : ''}{trend.covers.toFixed(1)}% vs yesterday
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Average Check */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Average Check</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${(posMetrics.revenue / posMetrics.covers).toLocaleString('en-US', { maximumFractionDigits: 2 })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Per customer
            </p>
          </CardContent>
        </Card>

        {/* Revenue per Hour */}
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium">Revenue/Hour</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              ${posMetrics.revenuePerHour.toLocaleString('en-US', { maximumFractionDigits: 0 })}
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Labor efficiency
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Labor Metrics */}
      <Card>
        <CardHeader>
          <CardTitle>Labor Cost Analysis</CardTitle>
          <CardDescription>POS-based labor metrics</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Labor Cost */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Labor Cost</p>
                <p className="font-bold">
                  ${posMetrics.laborCost.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                {(posMetrics.laborCost / posMetrics.revenue * 100).toFixed(1)}% of revenue
              </p>
            </div>

            {/* Labor Percentage */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm font-medium">Labor %</p>
                <Badge
                  variant={
                    getLaborStatus(posMetrics.laborPercentage) === 'success'
                      ? 'default'
                      : getLaborStatus(posMetrics.laborPercentage) === 'warning'
                        ? 'secondary'
                        : 'destructive'
                  }
                >
                  {posMetrics.laborPercentage.toFixed(1)}%
                </Badge>
              </div>
              <Progress value={posMetrics.laborPercentage} className="h-2" />
            </div>
          </div>

          {/* KPI Targets */}
          <div className="space-y-2 p-3 bg-blue-50 rounded-lg border border-blue-200">
            <p className="text-sm font-semibold text-blue-900">Target: 30% Labor</p>
            <div className="flex items-center justify-between text-sm">
              <span className="text-blue-700">Current: {posMetrics.laborPercentage.toFixed(1)}%</span>
              <span className="font-semibold">
                {posMetrics.laborPercentage <= 30 ? (
                  <span className="text-green-600">✓ On target</span>
                ) : (
                  <span className="text-orange-600">! {(posMetrics.laborPercentage - 30).toFixed(1)}% over</span>
                )}
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 7-Day Trend */}
      <Card>
        <CardHeader>
          <CardTitle>7-Day Trend</CardTitle>
          <CardDescription>Daily revenue and covers</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {historicalData.slice(0, 7).map((day, i) => (
              <div key={i} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">
                    {new Date(day.date).toLocaleDateString('en-US', {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}
                  </span>
                  <div className="flex items-center gap-4">
                    <div>
                      <span className="font-semibold">
                        ${day.revenue.toLocaleString('en-US', { maximumFractionDigits: 0 })}
                      </span>
                      <span className="text-xs text-muted-foreground ml-2">
                        {day.covers} covers
                      </span>
                    </div>
                    <div className="text-right min-w-16">
                      <Badge
                        variant={day.laborPercentage <= 30 ? 'default' : 'secondary'}
                        className="text-xs"
                      >
                        {day.laborPercentage.toFixed(0)}%
                      </Badge>
                    </div>
                  </div>
                </div>
                <Progress value={day.laborPercentage} className="h-1.5" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Last Update */}
      <div className="text-xs text-center text-muted-foreground">
        Last updated: {new Date().toLocaleTimeString()}
      </div>
    </div>
  );
};

// ============================================================================
// MOCK DATA
// ============================================================================

function generateMockTodayMetrics(): POSMetrics {
  const revenue = 4500 + Math.random() * 2000;
  const covers = 150 + Math.floor(Math.random() * 50);
  const laborCost = revenue * (0.28 + Math.random() * 0.1);

  return {
    date: new Date().toISOString().split('T')[0],
    revenue,
    covers,
    laborCost,
    laborPercentage: (laborCost / revenue) * 100,
    revenuePerHour: revenue / 12,
    averageCheck: revenue / covers,
  };
}

function generateMockHistoricalData(): POSMetrics[] {
  const data: POSMetrics[] = [];
  const today = new Date();

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);

    const revenue = 4000 + Math.random() * 2500;
    const covers = 140 + Math.floor(Math.random() * 60);
    const laborCost = revenue * (0.28 + Math.random() * 0.1);

    data.push({
      date: date.toISOString().split('T')[0],
      revenue,
      covers,
      laborCost,
      laborPercentage: (laborCost / revenue) * 100,
      revenuePerHour: revenue / 12,
      averageCheck: revenue / covers,
    });
  }

  return data;
}

export default POSDashboardIntegration;
