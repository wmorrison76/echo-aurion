import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Calendar,
  Building2,
  Users,
  PieChart,
  BarChart3,
  ArrowUpRight,
  ArrowDownRight,
  Target,
  Award
} from "lucide-react";

interface RevenueDetailsModalProps {
  children: React.ReactNode;
}

export default function RevenueDetailsModal({ children }: RevenueDetailsModalProps) {
  const revenueData = {
    total: 2400000,
    monthly: {
      current: 200000,
      target: 180000,
      lastMonth: 175000,
      growth: 14.3
    },
    breakdown: {
      corporate: { amount: 1440000, percentage: 60, growth: 18.5 },
      weddings: { amount: 720000, percentage: 30, growth: 8.2 },
      socialEvents: { amount: 240000, percentage: 10, growth: -2.1 }
    },
    monthlyTrend: [
      { month: "Aug", revenue: 165000, target: 160000 },
      { month: "Sep", revenue: 185000, target: 170000 },
      { month: "Oct", revenue: 195000, target: 175000 },
      { month: "Nov", revenue: 175000, target: 180000 },
      { month: "Dec", revenue: 205000, target: 185000 },
      { month: "Jan", revenue: 200000, target: 180000 }
    ],
    topClients: [
      { name: "TechCorp Inc.", revenue: 125000, events: 8, growth: 25.5 },
      { name: "Global Events Ltd.", revenue: 98000, events: 6, growth: 18.2 },
      { name: "Luxury Weddings Co.", revenue: 85000, events: 12, growth: 12.8 },
      { name: "Premier Corporate", revenue: 72000, events: 5, growth: 8.5 },
      { name: "Elite Social Events", revenue: 65000, events: 9, growth: 15.2 }
    ],
    departmentBreakdown: [
      { department: "Main Ballroom", revenue: 850000, utilization: 82, avgRate: 12500 },
      { department: "Conference Center", revenue: 720000, utilization: 75, avgRate: 8500 },
      { department: "Garden Pavilion", revenue: 520000, utilization: 68, avgRate: 6500 },
      { department: "Private Dining", revenue: 310000, utilization: 55, avgRate: 4200 }
    ],
    quarterlyComparison: {
      q4_2023: { revenue: 580000, events: 45, avgDeal: 12889 },
      q1_2024: { revenue: 620000, events: 48, avgDeal: 12917 },
      growth: { revenue: 6.9, events: 6.7, avgDeal: 0.2 }
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getGrowthColor = (growth: number) => {
    return growth >= 0 ? "text-green-600" : "text-red-600";
  };

  const getGrowthIcon = (growth: number) => {
    return growth >= 0 ? <ArrowUpRight className="h-4 w-4" /> : <ArrowDownRight className="h-4 w-4" />;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl max-h-[90vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <DollarSign className="h-5 w-5 text-primary" />
            <span>Revenue Analytics - {formatCurrency(revenueData.total)} YTD</span>
          </DialogTitle>
        </DialogHeader>
        
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="breakdown">Revenue Breakdown</TabsTrigger>
            <TabsTrigger value="clients">Top Clients</TabsTrigger>
            <TabsTrigger value="departments">By Department</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(revenueData.total)}</div>
                  <p className="text-xs text-muted-foreground">Year to date</p>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">This Month</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatCurrency(revenueData.monthly.current)}</div>
                  <div className="flex items-center space-x-1 text-xs mt-1">
                    <span className={getGrowthColor(revenueData.monthly.growth)}>
                      {getGrowthIcon(revenueData.monthly.growth)}
                    </span>
                    <span className={getGrowthColor(revenueData.monthly.growth)}>
                      +{revenueData.monthly.growth}%
                    </span>
                    <span className="text-muted-foreground">vs target</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Target Achievement</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">
                    {Math.round((revenueData.monthly.current / revenueData.monthly.target) * 100)}%
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {formatCurrency(revenueData.monthly.target)} target
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-sm font-medium">Growth Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">+{revenueData.monthly.growth}%</div>
                  <p className="text-xs text-muted-foreground">Month over month</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Monthly Revenue Trend</CardTitle>
                  <CardDescription>Revenue vs target over the last 6 months</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {revenueData.monthlyTrend.map((month, index) => (
                      <div key={month.month} className="flex items-center space-x-4">
                        <div className="w-12 text-sm font-medium">{month.month}</div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium">{formatCurrency(month.revenue)}</span>
                            <span className="text-sm text-muted-foreground">
                              Target: {formatCurrency(month.target)}
                            </span>
                          </div>
                          <Progress 
                            value={Math.min((month.revenue / month.target) * 100, 100)} 
                            className="h-2" 
                          />
                        </div>
                        <div className={`text-sm ${month.revenue >= month.target ? 'text-green-600' : 'text-orange-600'}`}>
                          {Math.round((month.revenue / month.target) * 100)}%
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Quarterly Comparison</CardTitle>
                  <CardDescription>Q1 2024 vs Q4 2023 performance</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Q4 2023</h4>
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Revenue:</span>
                            <span className="font-medium">{formatCurrency(revenueData.quarterlyComparison.q4_2023.revenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Events:</span>
                            <span className="font-medium">{revenueData.quarterlyComparison.q4_2023.events}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Avg Deal:</span>
                            <span className="font-medium">{formatCurrency(revenueData.quarterlyComparison.q4_2023.avgDeal)}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h4 className="font-medium text-sm text-muted-foreground">Q1 2024</h4>
                        <div className="space-y-2 mt-2">
                          <div className="flex justify-between">
                            <span className="text-sm">Revenue:</span>
                            <span className="font-medium">{formatCurrency(revenueData.quarterlyComparison.q1_2024.revenue)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Events:</span>
                            <span className="font-medium">{revenueData.quarterlyComparison.q1_2024.events}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-sm">Avg Deal:</span>
                            <span className="font-medium">{formatCurrency(revenueData.quarterlyComparison.q1_2024.avgDeal)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="border-t pt-4">
                      <h4 className="font-medium text-sm text-muted-foreground mb-2">Growth</h4>
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Revenue Growth:</span>
                          <span className="text-green-600 font-medium flex items-center">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +{revenueData.quarterlyComparison.growth.revenue}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Event Volume:</span>
                          <span className="text-green-600 font-medium flex items-center">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +{revenueData.quarterlyComparison.growth.events}%
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm">Average Deal Size:</span>
                          <span className="text-green-600 font-medium flex items-center">
                            <ArrowUpRight className="h-3 w-3 mr-1" />
                            +{revenueData.quarterlyComparison.growth.avgDeal}%
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {Object.entries(revenueData.breakdown).map(([category, data]) => (
                <Card key={category}>
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between">
                      <span className="capitalize">{category.replace(/([A-Z])/g, ' $1').trim()}</span>
                      <Badge variant="secondary">{data.percentage}%</Badge>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="text-2xl font-bold">{formatCurrency(data.amount)}</div>
                      <Progress value={data.percentage} className="h-2" />
                      <div className="flex items-center space-x-1">
                        <span className={`text-sm ${getGrowthColor(data.growth)}`}>
                          {getGrowthIcon(data.growth)}
                        </span>
                        <span className={`text-sm font-medium ${getGrowthColor(data.growth)}`}>
                          {data.growth > 0 ? '+' : ''}{data.growth}%
                        </span>
                        <span className="text-sm text-muted-foreground">vs last period</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Revenue Distribution</CardTitle>
                <CardDescription>Detailed breakdown by event category</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-blue-500 rounded"></div>
                        <span className="font-medium">Corporate Events</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(revenueData.breakdown.corporate.amount)}</div>
                        <div className="text-sm text-muted-foreground">{revenueData.breakdown.corporate.percentage}% of total</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-pink-500 rounded"></div>
                        <span className="font-medium">Weddings</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(revenueData.breakdown.weddings.amount)}</div>
                        <div className="text-sm text-muted-foreground">{revenueData.breakdown.weddings.percentage}% of total</div>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className="w-4 h-4 bg-green-500 rounded"></div>
                        <span className="font-medium">Social Events</span>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{formatCurrency(revenueData.breakdown.socialEvents.amount)}</div>
                        <div className="text-sm text-muted-foreground">{revenueData.breakdown.socialEvents.percentage}% of total</div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="clients" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Top Revenue-Generating Clients</CardTitle>
                <CardDescription>Client performance and growth metrics</CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-96">
                  <div className="space-y-4">
                    {revenueData.topClients.map((client, index) => (
                      <div key={client.name} className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50">
                        <div className="flex items-center space-x-4">
                          <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-sm font-medium">
                            #{index + 1}
                          </div>
                          <div>
                            <h4 className="font-medium">{client.name}</h4>
                            <p className="text-sm text-muted-foreground">{client.events} events this year</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-medium text-lg">{formatCurrency(client.revenue)}</div>
                          <div className="flex items-center space-x-1 text-sm">
                            <span className={getGrowthColor(client.growth)}>
                              {getGrowthIcon(client.growth)}
                            </span>
                            <span className={getGrowthColor(client.growth)}>
                              +{client.growth}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="departments" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {revenueData.departmentBreakdown.map((dept) => (
                <Card key={dept.department}>
                  <CardHeader>
                    <CardTitle className="flex items-center space-x-2">
                      <Building2 className="h-4 w-4" />
                      <span>{dept.department}</span>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Total Revenue:</span>
                        <span className="font-medium">{formatCurrency(dept.revenue)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Utilization:</span>
                        <span className="font-medium">{dept.utilization}%</span>
                      </div>
                      <Progress value={dept.utilization} className="h-2" />
                      <div className="flex justify-between">
                        <span className="text-sm text-muted-foreground">Avg Rate/Event:</span>
                        <span className="font-medium">{formatCurrency(dept.avgRate)}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}
