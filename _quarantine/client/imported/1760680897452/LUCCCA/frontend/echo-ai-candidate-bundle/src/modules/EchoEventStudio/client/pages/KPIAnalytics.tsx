import React, { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Clock,
  CheckCircle,
  DollarSign,
  Users,
  Calendar,
  FileText,
  Target,
  Award,
  BarChart3,
  PieChart,
  LineChart,
  Activity,
  Zap,
  ThumbsUp,
  AlertTriangle,
  RefreshCw,
  Download,
  Filter,
  Eye
} from 'lucide-react';
import { KPIMetrics, DataQuality, OpsAccuracy, SalesVelocity, MarginLift, CustomerSatisfaction } from '@shared/beo-types';

interface KPICardProps {
  title: string;
  value: string | number;
  change?: number;
  trend?: 'up' | 'down' | 'stable';
  icon: React.ElementType;
  description?: string;
  target?: number;
  unit?: string;
}

function KPICard({ title, value, change, trend, icon: Icon, description, target, unit }: KPICardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case 'up': return TrendingUp;
      case 'down': return TrendingDown;
      default: return Minus;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case 'up': return 'text-green-600 dark:text-green-400';
      case 'down': return 'text-red-600 dark:text-red-400';
      default: return 'text-gray-600 dark:text-gray-400';
    }
  };

  const TrendIcon = getTrendIcon();
  const progress = target ? (typeof value === 'number' ? (value / target) * 100 : 0) : undefined;

  return (
    <Card className="glass-panel">
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm font-medium text-muted-foreground">{title}</p>
              <p className="text-2xl font-bold">
                {typeof value === 'number' ? value.toLocaleString() : value}
                {unit && <span className="text-lg text-muted-foreground ml-1">{unit}</span>}
              </p>
            </div>
          </div>
          {change !== undefined && (
            <div className={cn("flex items-center gap-1", getTrendColor())}>
              <TrendIcon className="h-4 w-4" />
              <span className="text-sm font-medium">
                {change > 0 ? '+' : ''}{change}%
              </span>
            </div>
          )}
        </div>
        {description && (
          <p className="text-xs text-muted-foreground mt-2">{description}</p>
        )}
        {progress !== undefined && target && (
          <div className="mt-3 space-y-1">
            <div className="flex justify-between text-xs">
              <span>Progress to Target</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={Math.min(progress, 100)} className="h-2" />
          </div>
        )}
      </CardContent>
    </Card>
  );
}

interface MetricChartProps {
  title: string;
  data: Array<{ period: string; value: number; target?: number }>;
  type?: 'line' | 'bar' | 'area';
}

function MetricChart({ title, data, type = 'line' }: MetricChartProps) {
  const maxValue = Math.max(...data.map(d => Math.max(d.value, d.target || 0)));
  
  return (
    <Card className="glass-panel">
      <CardHeader>
        <CardTitle className="text-lg">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-64 flex items-end justify-between space-x-2">
          {data.map((item, index) => {
            const height = (item.value / maxValue) * 100;
            const targetHeight = item.target ? (item.target / maxValue) * 100 : 0;
            
            return (
              <div key={index} className="flex-1 flex flex-col items-center space-y-2">
                <div className="w-full relative" style={{ height: '200px' }}>
                  {item.target && (
                    <div 
                      className="absolute bottom-0 w-full bg-gray-300 dark:bg-gray-600 opacity-50 rounded-t"
                      style={{ height: `${targetHeight}%` }}
                    />
                  )}
                  <div 
                    className="absolute bottom-0 w-full bg-primary rounded-t transition-all duration-300 hover:bg-primary/80"
                    style={{ height: `${height}%` }}
                  />
                  <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 text-xs font-medium">
                    {item.value}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground text-center">{item.period}</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export default function KPIAnalytics() {
  const [timeframe, setTimeframe] = useState('monthly');
  const [venue, setVenue] = useState('all');
  const [metrics, setMetrics] = useState<KPIMetrics | null>(null);
  const [loading, setLoading] = useState(true);

  // Sample KPI data
  useEffect(() => {
    const loadKPIData = async () => {
      setLoading(true);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      const sampleMetrics: KPIMetrics = {
        venueId: venue,
        period: timeframe,
        timeToValue: 3.8, // minutes
        dataQuality: {
          autoMappedPercent: 89.5,
          priceConfidence: 94.2,
          quantityConfidence: 87.8,
          manualReviewRequired: 10.5
        },
        opsAccuracy: {
          roomResetAvoidance: 95.8,
          beoVariance: 2.3,
          onTimeExecution: 92.1,
          qualityScore: 4.6
        },
        salesVelocity: {
          leadToSignedDays: 12.4,
          depositConversion: 78.9,
          averageCheck: 18500,
          proposalAcceptanceRate: 73.2
        },
        marginLift: {
          menuMixMargin: 42.8,
          rentalUpsellRate: 35.6,
          addOnRevenue: 8900,
          profitMargin: 38.4
        },
        customerSatisfaction: {
          npsScore: 67,
          repeatBookingRate: 45.2,
          referralRate: 28.7,
          complaintRate: 3.8
        }
      };
      
      setMetrics(sampleMetrics);
      setLoading(false);
    };
    
    loadKPIData();
  }, [timeframe, venue]);

  const timeToValueData = [
    { period: 'Jan', value: 4.2, target: 5.0 },
    { period: 'Feb', value: 3.8, target: 5.0 },
    { period: 'Mar', value: 3.5, target: 5.0 },
    { period: 'Apr', value: 3.8, target: 5.0 },
    { period: 'May', value: 3.2, target: 5.0 },
    { period: 'Jun', value: 3.8, target: 5.0 }
  ];

  const salesVelocityData = [
    { period: 'Jan', value: 15.2, target: 12.0 },
    { period: 'Feb', value: 13.8, target: 12.0 },
    { period: 'Mar', value: 11.5, target: 12.0 },
    { period: 'Apr', value: 12.8, target: 12.0 },
    { period: 'May', value: 10.2, target: 12.0 },
    { period: 'Jun', value: 12.4, target: 12.0 }
  ];

  const marginTrendData = [
    { period: 'Q1', value: 41.2, target: 40.0 },
    { period: 'Q2', value: 42.8, target: 40.0 },
    { period: 'Q3', value: 44.1, target: 40.0 },
    { period: 'Q4', value: 43.5, target: 40.0 }
  ];

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center space-y-4">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading KPI analytics...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!metrics) {
    return (
      <div className="p-6 space-y-6">
        <div className="text-center py-12">
          <AlertTriangle className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">Failed to load KPI data</p>
          <Button className="mt-4" onClick={() => window.location.reload()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">KPI Analytics</h1>
          <p className="text-muted-foreground">Track performance metrics and business intelligence</p>
        </div>
        <div className="flex items-center gap-4">
          <Select value={venue} onValueChange={setVenue}>
            <SelectTrigger className="w-40 apple-button">
              <SelectValue placeholder="Select venue" />
            </SelectTrigger>
            <SelectContent className="glass-panel">
              <SelectItem value="all">All Venues</SelectItem>
              <SelectItem value="venue_1">Grand Ballroom</SelectItem>
              <SelectItem value="venue_2">Garden Pavilion</SelectItem>
              <SelectItem value="venue_3">Conference Center</SelectItem>
            </SelectContent>
          </Select>
          
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-40 apple-button">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent className="glass-panel">
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
              <SelectItem value="quarterly">Quarterly</SelectItem>
            </SelectContent>
          </Select>
          
          <Button variant="outline" className="apple-button">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-6 glass-panel">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="efficiency">Efficiency</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
          <TabsTrigger value="sales">Sales</TabsTrigger>
          <TabsTrigger value="operations">Operations</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Key Metrics Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Time to Value"
              value={metrics.timeToValue}
              unit="min"
              change={-8.5}
              trend="up"
              icon={Zap}
              description="Minutes from upload to draft BEO ready"
              target={5.0}
            />
            
            <KPICard
              title="Data Quality"
              value={Math.round(metrics.dataQuality.autoMappedPercent)}
              unit="%"
              change={3.2}
              trend="up"
              icon={CheckCircle}
              description="Percentage of items auto-mapped to catalog"
              target={95}
            />
            
            <KPICard
              title="Sales Velocity"
              value={metrics.salesVelocity.leadToSignedDays}
              unit="days"
              change={-2.1}
              trend="up"
              icon={TrendingUp}
              description="Average lead to signed contract time"
              target={12}
            />
            
            <KPICard
              title="Profit Margin"
              value={metrics.marginLift.profitMargin}
              unit="%"
              change={1.8}
              trend="up"
              icon={DollarSign}
              description="Overall profit margin on events"
              target={40}
            />
          </div>

          {/* Performance Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricChart
              title="Time to Value Trend"
              data={timeToValueData}
              type="line"
            />
            
            <MetricChart
              title="Sales Velocity Trend"
              data={salesVelocityData}
              type="bar"
            />
          </div>

          {/* Quick Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary" />
                  Goal Achievement
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Revenue Target</span>
                  <div className="flex items-center gap-2">
                    <Progress value={87} className="w-20" />
                    <span className="text-sm font-medium">87%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Quality Score</span>
                  <div className="flex items-center gap-2">
                    <Progress value={92} className="w-20" />
                    <span className="text-sm font-medium">92%</span>
                  </div>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Customer Satisfaction</span>
                  <div className="flex items-center gap-2">
                    <Progress value={78} className="w-20" />
                    <span className="text-sm font-medium">78%</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Activity className="h-5 w-5 text-primary" />
                  Live Metrics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Active Projects</span>
                  <Badge className="bg-green-500/20 text-green-700">24</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Pending BEOs</span>
                  <Badge className="bg-yellow-500/20 text-yellow-700">8</Badge>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Processing Documents</span>
                  <Badge className="bg-blue-500/20 text-blue-700">3</Badge>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Award className="h-5 w-5 text-primary" />
                  Top Performers
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Fastest BEO Generation</span>
                  <span className="text-sm font-medium">2.1 min</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Highest Conversion Rate</span>
                  <span className="text-sm font-medium">89.5%</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm">Best Customer Rating</span>
                  <span className="text-sm font-medium">4.9/5</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="efficiency" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPICard
              title="Document Processing Speed"
              value={metrics.timeToValue}
              unit="min"
              change={-8.5}
              trend="up"
              icon={Clock}
              description="Average time to process documents"
            />
            
            <KPICard
              title="Auto-mapping Success"
              value={metrics.dataQuality.autoMappedPercent}
              unit="%"
              change={3.2}
              trend="up"
              icon={Zap}
              description="Items automatically mapped to catalog"
            />
            
            <KPICard
              title="Manual Review Required"
              value={metrics.dataQuality.manualReviewRequired}
              unit="%"
              change={-2.1}
              trend="up"
              icon={Eye}
              description="Items requiring manual review"
            />
          </div>

          <MetricChart
            title="Processing Efficiency Over Time"
            data={timeToValueData}
          />
          
          <Card className="glass-panel">
            <CardHeader>
              <CardTitle>Data Quality Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Price Confidence</span>
                      <span className="text-sm font-medium">{metrics.dataQuality.priceConfidence}%</span>
                    </div>
                    <Progress value={metrics.dataQuality.priceConfidence} />
                  </div>
                  
                  <div>
                    <div className="flex justify-between mb-2">
                      <span className="text-sm">Quantity Confidence</span>
                      <span className="text-sm font-medium">{metrics.dataQuality.quantityConfidence}%</span>
                    </div>
                    <Progress value={metrics.dataQuality.quantityConfidence} />
                  </div>
                </div>
                
                <div className="space-y-4">
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-green-600">{metrics.dataQuality.autoMappedPercent}%</div>
                    <div className="text-sm text-muted-foreground">Items Auto-mapped</div>
                  </div>
                  
                  <div className="p-4 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold text-yellow-600">{metrics.dataQuality.manualReviewRequired}%</div>
                    <div className="text-sm text-muted-foreground">Need Review</div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="quality" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <KPICard
              title="Quality Score"
              value={metrics.opsAccuracy.qualityScore}
              unit="/5"
              change={2.3}
              trend="up"
              icon={Award}
              description="Overall execution quality rating"
              target={5.0}
            />
            
            <KPICard
              title="On-time Execution"
              value={metrics.opsAccuracy.onTimeExecution}
              unit="%"
              change={1.5}
              trend="up"
              icon={Clock}
              description="Events executed on schedule"
              target={95}
            />
            
            <KPICard
              title="BEO Variance"
              value={metrics.opsAccuracy.beoVariance}
              unit="%"
              change={-0.8}
              trend="up"
              icon={CheckCircle}
              description="Variance between BEO and actual execution"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Operational Accuracy</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Room Reset Avoidance</span>
                    <span className="text-sm font-medium">{metrics.opsAccuracy.roomResetAvoidance}%</span>
                  </div>
                  <Progress value={metrics.opsAccuracy.roomResetAvoidance} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">On-time Execution</span>
                    <span className="text-sm font-medium">{metrics.opsAccuracy.onTimeExecution}%</span>
                  </div>
                  <Progress value={metrics.opsAccuracy.onTimeExecution} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Quality Score</span>
                    <span className="text-sm font-medium">{metrics.opsAccuracy.qualityScore}/5</span>
                  </div>
                  <Progress value={(metrics.opsAccuracy.qualityScore / 5) * 100} />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Quality Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm">Quality Improving</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">+2.3%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Consistency High</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">95%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-yellow-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-yellow-600" />
                      <span className="text-sm">Areas for Improvement</span>
                    </div>
                    <span className="text-sm font-medium text-yellow-600">3</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="sales" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Lead to Signed"
              value={metrics.salesVelocity.leadToSignedDays}
              unit="days"
              change={-2.1}
              trend="up"
              icon={Clock}
              description="Average time from lead to contract"
              target={12}
            />
            
            <KPICard
              title="Conversion Rate"
              value={metrics.salesVelocity.depositConversion}
              unit="%"
              change={4.3}
              trend="up"
              icon={TrendingUp}
              description="Deposit conversion percentage"
              target={80}
            />
            
            <KPICard
              title="Average Check"
              value={`$${(metrics.salesVelocity.averageCheck / 1000).toFixed(1)}k`}
              change={8.7}
              trend="up"
              icon={DollarSign}
              description="Average event revenue"
            />
            
            <KPICard
              title="Proposal Acceptance"
              value={metrics.salesVelocity.proposalAcceptanceRate}
              unit="%"
              change={2.1}
              trend="up"
              icon={CheckCircle}
              description="Proposal acceptance rate"
              target={75}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <MetricChart
              title="Sales Velocity Trend"
              data={salesVelocityData}
            />
            
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Revenue Analysis</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Total Revenue (MTD)</span>
                    <span className="text-lg font-bold text-green-600">$1.2M</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Pipeline Value</span>
                    <span className="text-lg font-bold text-blue-600">$2.8M</span>
                  </div>
                  
                  <div className="flex justify-between items-center">
                    <span className="text-sm">Forecast (Month)</span>
                    <span className="text-lg font-bold text-purple-600">$1.8M</span>
                  </div>
                  
                  <div className="pt-4 border-t">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium">Growth Rate</span>
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="font-bold">+18.5%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="operations" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <KPICard
              title="Room Reset Avoidance"
              value={metrics.opsAccuracy.roomResetAvoidance}
              unit="%"
              change={1.2}
              trend="up"
              icon={CheckCircle}
              description="Successful single-setup events"
              target={98}
            />
            
            <KPICard
              title="Margin Lift"
              value={metrics.marginLift.profitMargin}
              unit="%"
              change={2.4}
              trend="up"
              icon={TrendingUp}
              description="Overall profit margin improvement"
              target={40}
            />
            
            <KPICard
              title="Upsell Rate"
              value={metrics.marginLift.rentalUpsellRate}
              unit="%"
              change={5.1}
              trend="up"
              icon={DollarSign}
              description="Rental and add-on upsell success"
              target={40}
            />
          </div>

          <MetricChart
            title="Profit Margin Trend"
            data={marginTrendData}
          />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Operational Efficiency</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-sm">Menu Mix Margin</span>
                  <span className="text-sm font-medium">{metrics.marginLift.menuMixMargin}%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">Add-on Revenue</span>
                  <span className="text-sm font-medium">${metrics.marginLift.addOnRevenue.toLocaleString()}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-sm">BEO Variance</span>
                  <span className="text-sm font-medium">{metrics.opsAccuracy.beoVariance}%</span>
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Cost Savings</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 bg-green-500/10 rounded-lg">
                  <div className="text-2xl font-bold text-green-600">$125k</div>
                  <div className="text-sm text-muted-foreground">Saved through optimization</div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span>Reduced waste</span>
                    <span className="font-medium">$45k</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Efficient staffing</span>
                    <span className="font-medium">$38k</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Better sourcing</span>
                    <span className="font-medium">$42k</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="NPS Score"
              value={metrics.customerSatisfaction.npsScore}
              change={4.2}
              trend="up"
              icon={ThumbsUp}
              description="Net Promoter Score"
              target={70}
            />
            
            <KPICard
              title="Repeat Bookings"
              value={metrics.customerSatisfaction.repeatBookingRate}
              unit="%"
              change={3.8}
              trend="up"
              icon={Users}
              description="Client retention rate"
              target={50}
            />
            
            <KPICard
              title="Referral Rate"
              value={metrics.customerSatisfaction.referralRate}
              unit="%"
              change={2.1}
              trend="up"
              icon={Award}
              description="Client referral percentage"
              target={30}
            />
            
            <KPICard
              title="Complaint Rate"
              value={metrics.customerSatisfaction.complaintRate}
              unit="%"
              change={-1.2}
              trend="up"
              icon={AlertTriangle}
              description="Customer complaint percentage"
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Customer Feedback Breakdown</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Food Quality</span>
                    <span className="text-sm font-medium">4.7/5</span>
                  </div>
                  <Progress value={94} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Service Quality</span>
                    <span className="text-sm font-medium">4.5/5</span>
                  </div>
                  <Progress value={90} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Value for Money</span>
                    <span className="text-sm font-medium">4.2/5</span>
                  </div>
                  <Progress value={84} />
                </div>
                
                <div>
                  <div className="flex justify-between mb-2">
                    <span className="text-sm">Overall Experience</span>
                    <span className="text-sm font-medium">4.6/5</span>
                  </div>
                  <Progress value={92} />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-panel">
              <CardHeader>
                <CardTitle>Satisfaction Trends</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-green-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm">NPS Improving</span>
                    </div>
                    <span className="text-sm font-medium text-green-600">+4.2</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-blue-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-600" />
                      <span className="text-sm">Repeat Clients</span>
                    </div>
                    <span className="text-sm font-medium text-blue-600">45.2%</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-purple-500/10 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Award className="h-4 w-4 text-purple-600" />
                      <span className="text-sm">5-Star Reviews</span>
                    </div>
                    <span className="text-sm font-medium text-purple-600">78%</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
