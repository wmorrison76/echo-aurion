import Layout from "@/components/Layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  LineChart,
  PieChart,
  Target,
  Calendar,
  Users,
  Building,
  AlertTriangle,
  CheckCircle,
  Zap,
  Brain,
  Eye,
  Settings,
  RefreshCw,
  Download,
  Upload,
  Plus,
  Edit,
  MoreVertical,
  ArrowUp,
  ArrowDown,
  Minus,
  Activity,
  Clock,
  Star,
  Trophy,
  Lightbulb,
  Globe,
  Wifi,
  Coffee,
  Car,
  Bed,
  Home,
  Hotel,
  MapPin,
  Shield,
  Crown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import {
  RoomType,
  RateCode,
  DemandForecast,
  CompetitorData,
  RevenueOptimization,
  RevenueReport,
  BudgetPlan,
  defaultRoomTypes,
  defaultRateCodes,
} from "@shared/revenue-management-types";

export default function RevenueManagement() {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [selectedRoomType, setSelectedRoomType] = useState<string>("all");
  const [selectedDateRange, setSelectedDateRange] = useState<'week' | 'month' | 'quarter'>('month');
  const [isOptimizationRunning, setIsOptimizationRunning] = useState(false);

  // Mock data - in production this would integrate with PMS and revenue management systems
  const roomTypes = defaultRoomTypes;
  const rateCodes = defaultRateCodes;

  // Mock demand forecast data
  const demandForecasts: DemandForecast[] = [
    {
      date: new Date('2024-02-15'),
      roomTypeId: 'standard-queen',
      demandLevel: 'high',
      demandScore: 85,
      occupancyForecast: 92,
      pickupRate: 12,
      historicalOccupancy: 88,
      historicalADR: 199,
      historicalRevPAR: 175.12,
      events: [
        {
          id: 'event-1',
          name: 'Tech Conference 2024',
          type: 'conference',
          startDate: new Date('2024-02-14'),
          endDate: new Date('2024-02-16'),
          expectedAttendance: 5000,
          impactRadius: 10,
          demandImpact: 1.4,
          source: 'Local Events API'
        }
      ],
      seasonality: 0.1,
      weatherImpact: 0.05,
      economicFactors: 0.02,
      competitorOccupancy: 85,
      competitorADR: 215,
      marketPosition: 'below',
      recommendedRate: 225,
      rateVariance: 0.13,
      confidenceLevel: 0.87,
      createdAt: new Date(),
      updatedAt: new Date()
    },
    {
      date: new Date('2024-02-20'),
      roomTypeId: 'deluxe-king',
      demandLevel: 'medium',
      demandScore: 68,
      occupancyForecast: 75,
      pickupRate: 8,
      historicalOccupancy: 72,
      historicalADR: 299,
      historicalRevPAR: 215.28,
      events: [],
      seasonality: -0.05,
      weatherImpact: -0.02,
      economicFactors: 0.01,
      competitorOccupancy: 78,
      competitorADR: 320,
      marketPosition: 'below',
      recommendedRate: 285,
      rateVariance: -0.05,
      confidenceLevel: 0.92,
      createdAt: new Date(),
      updatedAt: new Date()
    }
  ];

  // Mock competitor data
  const competitors: CompetitorData[] = [
    {
      competitorId: 'comp-1',
      competitorName: 'Grand Hotel Downtown',
      propertyType: 'Full Service Hotel',
      starRating: 4,
      distance: 0.8,
      rates: [
        {
          date: new Date('2024-02-15'),
          roomType: 'Standard Room',
          rate: 215,
          availability: 'limited',
          restrictions: ['Non-refundable'],
          channel: 'direct',
          currency: 'USD'
        }
      ],
      occupancyRate: 85,
      averageDailyRate: 225,
      revPAR: 191.25,
      positioning: 'upscale',
      primaryMarkets: ['Business', 'Leisure'],
      dataSource: 'api',
      lastUpdated: new Date()
    },
    {
      competitorId: 'comp-2',
      competitorName: 'Boutique Suites',
      propertyType: 'Boutique Hotel',
      starRating: 4,
      distance: 1.2,
      rates: [
        {
          date: new Date('2024-02-15'),
          roomType: 'Junior Suite',
          rate: 320,
          availability: 'available',
          restrictions: [],
          channel: 'ota',
          currency: 'USD'
        }
      ],
      occupancyRate: 78,
      averageDailyRate: 285,
      revPAR: 222.30,
      positioning: 'luxury',
      primaryMarkets: ['Leisure', 'Romance'],
      dataSource: 'scraping',
      lastUpdated: new Date()
    }
  ];

  // Mock revenue optimization data
  const optimizations: RevenueOptimization[] = [
    {
      date: new Date('2024-02-15'),
      roomTypeId: 'standard-queen',
      currentRate: 199,
      currentOccupancy: 88,
      currentRevPAR: 175.12,
      optimizedRate: 225,
      projectedOccupancy: 85,
      projectedRevPAR: 191.25,
      revenueUpside: 16.13,
      factors: [
        {
          type: 'demand',
          impact: 0.4,
          confidence: 0.9,
          description: 'High demand due to tech conference',
          weight: 0.35
        },
        {
          type: 'competition',
          impact: 0.2,
          confidence: 0.8,
          description: 'Competitors pricing 8% higher',
          weight: 0.25
        },
        {
          type: 'events',
          impact: 0.3,
          confidence: 0.95,
          description: 'Major conference driving demand',
          weight: 0.30
        }
      ],
      riskLevel: 'low',
      riskFactors: ['Weather dependency'],
      implemented: false,
      modelConfidence: 0.87,
      alternativeScenarios: [
        {
          name: 'Conservative',
          rate: 210,
          projectedOccupancy: 90,
          projectedRevPAR: 189,
          probability: 0.3,
          riskLevel: 'low'
        },
        {
          name: 'Aggressive',
          rate: 240,
          projectedOccupancy: 80,
          projectedRevPAR: 192,
          probability: 0.2,
          riskLevel: 'medium'
        }
      ],
      createdAt: new Date()
    }
  ];

  // Mock performance metrics
  const performanceMetrics = {
    currentMonth: {
      revenue: 485000,
      revPAR: 142.50,
      adr: 189.50,
      occupancy: 75.2,
      variance: {
        revenue: 8.5, // vs budget
        revPAR: 5.2,
        adr: 3.1,
        occupancy: 2.8
      }
    },
    forecast: {
      nextMonth: {
        revenue: 520000,
        revPAR: 155.20,
        adr: 195.80,
        occupancy: 79.3
      },
      confidence: 0.89
    },
    competitive: {
      marketRank: 2,
      totalCompetitors: 8,
      rateIndex: 0.95, // below market average
      revPARIndex: 1.08, // above market average
      marketShare: 18.5
    }
  };

  const getOptimizationColor = (upside: number) => {
    if (upside > 15) return 'text-green-600';
    if (upside > 5) return 'text-blue-600';
    if (upside > 0) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getDemandColor = (level: string) => {
    switch (level) {
      case 'very-high': return 'bg-red-100 text-red-800';
      case 'high': return 'bg-orange-100 text-orange-800';
      case 'medium': return 'bg-yellow-100 text-yellow-800';
      case 'low': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getRoomTypeIcon = (category: string) => {
    switch (category) {
      case 'standard': return Bed;
      case 'deluxe': return Home;
      case 'suite': return Building;
      case 'presidential': return Crown;
      case 'villa': return Hotel;
      default: return Bed;
    }
  };

  const runOptimization = async () => {
    setIsOptimizationRunning(true);
    // Simulate AI optimization process
    setTimeout(() => {
      setIsOptimizationRunning(false);
      // In real implementation, this would trigger ML model predictions
    }, 3000);
  };

  return (
    <Layout>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Revenue Management</h1>
            <p className="text-muted-foreground">
              Dynamic pricing optimization, demand forecasting, and competitive analysis
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Button 
              onClick={runOptimization}
              disabled={isOptimizationRunning}
              className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700"
            >
              {isOptimizationRunning ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Optimizing...
                </>
              ) : (
                <>
                  <Brain className="h-4 w-4 mr-2" />
                  AI Optimize Rates
                </>
              )}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Download className="h-4 w-4 mr-2" />
                  Reports
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>Revenue Report</DropdownMenuItem>
                <DropdownMenuItem>Demand Forecast</DropdownMenuItem>
                <DropdownMenuItem>Competitive Analysis</DropdownMenuItem>
                <DropdownMenuItem>Optimization Summary</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Key Performance Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Revenue (MTD)</p>
                  <p className="text-2xl font-bold">${performanceMetrics.currentMonth.revenue.toLocaleString()}</p>
                  <div className="flex items-center gap-1 text-xs">
                    {performanceMetrics.currentMonth.variance.revenue > 0 ? (
                      <ArrowUp className="h-3 w-3 text-green-600" />
                    ) : (
                      <ArrowDown className="h-3 w-3 text-red-600" />
                    )}
                    <span className={performanceMetrics.currentMonth.variance.revenue > 0 ? 'text-green-600' : 'text-red-600'}>
                      {Math.abs(performanceMetrics.currentMonth.variance.revenue)}% vs budget
                    </span>
                  </div>
                </div>
                <DollarSign className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">RevPAR</p>
                  <p className="text-2xl font-bold">${performanceMetrics.currentMonth.revPAR}</p>
                  <div className="flex items-center gap-1 text-xs">
                    <ArrowUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      {performanceMetrics.currentMonth.variance.revPAR}% vs budget
                    </span>
                  </div>
                </div>
                <BarChart3 className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">ADR</p>
                  <p className="text-2xl font-bold">${performanceMetrics.currentMonth.adr}</p>
                  <div className="flex items-center gap-1 text-xs">
                    <ArrowUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      {performanceMetrics.currentMonth.variance.adr}% vs budget
                    </span>
                  </div>
                </div>
                <TrendingUp className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>

          <Card className="glass-panel dark:glass-panel-dark">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">Occupancy</p>
                  <p className="text-2xl font-bold">{performanceMetrics.currentMonth.occupancy}%</p>
                  <div className="flex items-center gap-1 text-xs">
                    <ArrowUp className="h-3 w-3 text-green-600" />
                    <span className="text-green-600">
                      {performanceMetrics.currentMonth.variance.occupancy}% vs budget
                    </span>
                  </div>
                </div>
                <Users className="h-8 w-8 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="glass-panel dark:glass-panel-dark">
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <Select value={selectedRoomType} onValueChange={setSelectedRoomType}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="All Room Types" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Room Types</SelectItem>
                  {roomTypes.map((roomType) => (
                    <SelectItem key={roomType.id} value={roomType.id}>
                      {roomType.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={selectedDateRange} onValueChange={(v) => setSelectedDateRange(v as any)}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="week">1 Week</SelectItem>
                  <SelectItem value="month">1 Month</SelectItem>
                  <SelectItem value="quarter">3 Months</SelectItem>
                </SelectContent>
              </Select>

              <div className="flex-1" />

              <Badge variant="outline" className="bg-green-50 text-green-700">
                Market Rank: #{performanceMetrics.competitive.marketRank} of {performanceMetrics.competitive.totalCompetitors}
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="optimization">Rate Optimization</TabsTrigger>
            <TabsTrigger value="forecast">Demand Forecast</TabsTrigger>
            <TabsTrigger value="competitive">Competitive Analysis</TabsTrigger>
            <TabsTrigger value="budget">Budget & Planning</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Revenue Trend */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <LineChart className="h-5 w-5" />
                    Revenue Trend
                  </CardTitle>
                  <CardDescription>30-day revenue performance and forecast</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">${performanceMetrics.forecast.nextMonth.revenue.toLocaleString()}</div>
                        <div className="text-sm text-muted-foreground">Next Month Forecast</div>
                        <div className="text-xs text-green-600">
                          {Math.round(performanceMetrics.forecast.confidence * 100)}% confidence
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-2xl font-bold text-primary">${performanceMetrics.forecast.nextMonth.revPAR}</div>
                        <div className="text-sm text-muted-foreground">Forecasted RevPAR</div>
                        <div className="text-xs text-blue-600">
                          +{((performanceMetrics.forecast.nextMonth.revPAR / performanceMetrics.currentMonth.revPAR - 1) * 100).toFixed(1)}% growth
                        </div>
                      </div>
                    </div>
                    
                    {/* Mock chart placeholder */}
                    <div className="h-40 bg-muted/20 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <LineChart className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                        <p className="text-sm text-muted-foreground">Revenue Trend Chart</p>
                        <p className="text-xs text-muted-foreground">Integration with Chart.js or D3.js</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Room Type Performance */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <PieChart className="h-5 w-5" />
                    Room Type Performance
                  </CardTitle>
                  <CardDescription>Revenue contribution by room category</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {roomTypes.map((roomType) => {
                      const RoomIcon = getRoomTypeIcon(roomType.category);
                      const revenueShare = roomType.category === 'standard' ? 45 : 
                                         roomType.category === 'deluxe' ? 35 : 20;
                      
                      return (
                        <div key={roomType.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex items-center gap-3">
                            <RoomIcon className="h-5 w-5 text-muted-foreground" />
                            <div>
                              <div className="font-medium">{roomType.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {roomType.totalInventory} rooms
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-right">
                            <div className="font-semibold">${roomType.baseRate}</div>
                            <div className="text-sm text-muted-foreground">{revenueShare}% revenue</div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Market Position */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Trophy className="h-5 w-5" />
                    Market Position
                  </CardTitle>
                  <CardDescription>Competitive performance vs market</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-xl font-bold text-primary">#{performanceMetrics.competitive.marketRank}</div>
                        <div className="text-sm text-muted-foreground">Market Rank</div>
                      </div>
                      <div className="text-center p-3 border rounded-lg">
                        <div className="text-xl font-bold text-primary">{performanceMetrics.competitive.marketShare}%</div>
                        <div className="text-sm text-muted-foreground">Market Share</div>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Rate Index vs Competition</span>
                          <span>{performanceMetrics.competitive.rateIndex}</span>
                        </div>
                        <Progress value={performanceMetrics.competitive.rateIndex * 100} className="h-2" />
                      </div>
                      
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>RevPAR Index vs Competition</span>
                          <span>{performanceMetrics.competitive.revPARIndex}</span>
                        </div>
                        <Progress value={performanceMetrics.competitive.revPARIndex * 100} className="h-2" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Quick Actions */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Zap className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>Revenue management shortcuts</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" className="h-auto p-4">
                      <div className="text-center">
                        <Settings className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-sm">Rate Rules</div>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="h-auto p-4">
                      <div className="text-center">
                        <Calendar className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-sm">Restrictions</div>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="h-auto p-4">
                      <div className="text-center">
                        <Globe className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-sm">Channels</div>
                      </div>
                    </Button>
                    
                    <Button variant="outline" className="h-auto p-4">
                      <div className="text-center">
                        <Activity className="h-6 w-6 mx-auto mb-2" />
                        <div className="text-sm">Packages</div>
                      </div>
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="optimization">
            <div className="space-y-6">
              {/* AI Optimization Results */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Brain className="h-5 w-5" />
                    AI-Powered Rate Optimization
                  </CardTitle>
                  <CardDescription>
                    Machine learning recommendations for optimal pricing
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {optimizations.map((opt, index) => {
                      const roomType = roomTypes.find(rt => rt.id === opt.roomTypeId);
                      const RoomIcon = getRoomTypeIcon(roomType?.category || 'standard');
                      
                      return (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <RoomIcon className="h-6 w-6 text-primary" />
                              <div>
                                <h4 className="font-semibold">{roomType?.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {opt.date.toLocaleDateString()}
                                </p>
                              </div>
                            </div>
                            
                            <Badge className={cn(
                              "text-sm",
                              opt.riskLevel === 'low' ? 'bg-green-100 text-green-800' :
                              opt.riskLevel === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            )}>
                              {opt.riskLevel} risk
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-muted/20 rounded-lg">
                              <div className="text-lg font-bold">${opt.currentRate}</div>
                              <div className="text-xs text-muted-foreground">Current Rate</div>
                            </div>
                            <div className="text-center p-3 bg-primary/10 rounded-lg">
                              <div className="text-lg font-bold text-primary">${opt.optimizedRate}</div>
                              <div className="text-xs text-muted-foreground">Recommended</div>
                            </div>
                            <div className="text-center p-3 bg-muted/20 rounded-lg">
                              <div className="text-lg font-bold">{opt.projectedOccupancy}%</div>
                              <div className="text-xs text-muted-foreground">Proj. Occupancy</div>
                            </div>
                            <div className="text-center p-3 bg-green/10 rounded-lg">
                              <div className={cn("text-lg font-bold", getOptimizationColor(opt.revenueUpside))}>
                                +${opt.revenueUpside}
                              </div>
                              <div className="text-xs text-muted-foreground">Revenue Upside</div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 mb-4">
                            <h5 className="font-medium text-sm">Optimization Factors:</h5>
                            {opt.factors.map((factor, fidx) => (
                              <div key={fidx} className="flex items-center justify-between text-sm">
                                <span className="capitalize">{factor.type.replace('-', ' ')}</span>
                                <div className="flex items-center gap-2">
                                  <div className="w-24 bg-muted rounded-full h-2">
                                    <div 
                                      className="bg-primary rounded-full h-2" 
                                      style={{ width: `${factor.weight * 100}%` }}
                                    />
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {Math.round(factor.confidence * 100)}%
                                  </span>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Implement
                            </Button>
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              Details
                            </Button>
                            <Button size="sm" variant="outline">
                              <Edit className="h-4 w-4 mr-2" />
                              Modify
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Alternative Scenarios */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Target className="h-5 w-5" />
                    Alternative Scenarios
                  </CardTitle>
                  <CardDescription>
                    Different pricing strategies and their projected outcomes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {optimizations[0]?.alternativeScenarios.map((scenario, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-3 h-3 rounded-full bg-primary" />
                          <div>
                            <div className="font-medium">{scenario.name}</div>
                            <div className="text-sm text-muted-foreground">
                              {Math.round(scenario.probability * 100)}% probability
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm">
                          <div className="text-center">
                            <div className="font-semibold">${scenario.rate}</div>
                            <div className="text-xs text-muted-foreground">Rate</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">{scenario.projectedOccupancy}%</div>
                            <div className="text-xs text-muted-foreground">Occupancy</div>
                          </div>
                          <div className="text-center">
                            <div className="font-semibold">${scenario.projectedRevPAR}</div>
                            <div className="text-xs text-muted-foreground">RevPAR</div>
                          </div>
                          <Badge variant={
                            scenario.riskLevel === 'low' ? 'default' :
                            scenario.riskLevel === 'medium' ? 'secondary' : 'destructive'
                          }>
                            {scenario.riskLevel}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="forecast">
            <div className="space-y-6">
              {/* Demand Forecast */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Demand Forecast
                  </CardTitle>
                  <CardDescription>
                    AI-powered demand predictions based on historical data and market factors
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {demandForecasts.map((forecast, index) => {
                      const roomType = roomTypes.find(rt => rt.id === forecast.roomTypeId);
                      
                      return (
                        <div key={index} className="p-4 border rounded-lg">
                          <div className="flex items-start justify-between mb-4">
                            <div>
                              <h4 className="font-semibold">{roomType?.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {forecast.date.toLocaleDateString()}
                              </p>
                            </div>
                            
                            <Badge className={getDemandColor(forecast.demandLevel)}>
                              {forecast.demandLevel.replace('-', ' ')} demand
                            </Badge>
                          </div>
                          
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4 mb-4">
                            <div className="text-center">
                              <div className="text-lg font-bold">{forecast.demandScore}</div>
                              <div className="text-xs text-muted-foreground">Demand Score</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold">{forecast.occupancyForecast}%</div>
                              <div className="text-xs text-muted-foreground">Forecast Occ.</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold">{forecast.pickupRate}</div>
                              <div className="text-xs text-muted-foreground">Pickup/Day</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-primary">${forecast.recommendedRate}</div>
                              <div className="text-xs text-muted-foreground">Recommended</div>
                            </div>
                            <div className="text-center">
                              <div className="text-lg font-bold text-green-600">
                                {Math.round(forecast.confidenceLevel * 100)}%
                              </div>
                              <div className="text-xs text-muted-foreground">Confidence</div>
                            </div>
                          </div>
                          
                          {forecast.events.length > 0 && (
                            <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-950 rounded-lg">
                              <h5 className="font-medium text-sm mb-2">Market Events:</h5>
                              {forecast.events.map((event, eidx) => (
                                <div key={eidx} className="flex items-center justify-between text-sm">
                                  <span>{event.name}</span>
                                  <Badge variant="outline">
                                    +{Math.round((event.demandImpact - 1) * 100)}% impact
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Forecast Chart Placeholder */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle>Demand Trend Analysis</CardTitle>
                  <CardDescription>Historical demand patterns and future projections</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="h-64 bg-muted/20 rounded-lg flex items-center justify-center">
                    <div className="text-center">
                      <LineChart className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                      <h3 className="font-medium">Demand Forecast Chart</h3>
                      <p className="text-sm text-muted-foreground">
                        Integration with Chart.js, D3.js, or similar charting library
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Shows historical occupancy, demand drivers, and AI predictions
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="competitive">
            <div className="space-y-6">
              {/* Competitor Analysis */}
              <Card className="glass-panel dark:glass-panel-dark">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5" />
                    Competitive Rate Analysis
                  </CardTitle>
                  <CardDescription>
                    Real-time competitor pricing and market positioning
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {competitors.map((competitor) => (
                      <div key={competitor.competitorId} className="p-4 border rounded-lg">
                        <div className="flex items-start justify-between mb-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-lg flex items-center justify-center">
                              <Building className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <h4 className="font-semibold">{competitor.competitorName}</h4>
                              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                <span>{competitor.propertyType}</span>
                                <span>•</span>
                                <div className="flex items-center gap-1">
                                  {Array.from({ length: competitor.starRating }, (_, i) => (
                                    <Star key={i} className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  ))}
                                </div>
                                <span>•</span>
                                <span>{competitor.distance} mi away</span>
                              </div>
                            </div>
                          </div>
                          
                          <Badge className={
                            competitor.positioning === 'luxury' ? 'bg-purple-100 text-purple-800' :
                            competitor.positioning === 'upscale' ? 'bg-blue-100 text-blue-800' :
                            competitor.positioning === 'midscale' ? 'bg-green-100 text-green-800' :
                            'bg-gray-100 text-gray-800'
                          }>
                            {competitor.positioning}
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center p-3 bg-muted/20 rounded-lg">
                            <div className="text-lg font-bold">${competitor.averageDailyRate}</div>
                            <div className="text-xs text-muted-foreground">Avg Daily Rate</div>
                          </div>
                          <div className="text-center p-3 bg-muted/20 rounded-lg">
                            <div className="text-lg font-bold">{competitor.occupancyRate}%</div>
                            <div className="text-xs text-muted-foreground">Occupancy</div>
                          </div>
                          <div className="text-center p-3 bg-muted/20 rounded-lg">
                            <div className="text-lg font-bold">${competitor.revPAR}</div>
                            <div className="text-xs text-muted-foreground">RevPAR</div>
                          </div>
                          <div className="text-center p-3 bg-muted/20 rounded-lg">
                            <div className="text-xs text-muted-foreground">Last Updated</div>
                            <div className="text-sm font-medium">
                              {competitor.lastUpdated.toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                        
                        <div className="flex justify-between items-center mt-4">
                          <div className="flex gap-2">
                            {competitor.primaryMarkets.map((market) => (
                              <Badge key={market} variant="outline" className="text-xs">
                                {market}
                              </Badge>
                            ))}
                          </div>
                          
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline">
                              <Eye className="h-4 w-4 mr-2" />
                              View Rates
                            </Button>
                            <Button size="sm" variant="outline">
                              <BarChart3 className="h-4 w-4 mr-2" />
                              Compare
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Rate Shopping Integration Note */}
              <Card className="glass-panel dark:glass-panel-dark border-dashed">
                <CardContent className="p-6 text-center">
                  <Globe className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium mb-2">Rate Shopping Integration</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Connect to rate shopping platforms for automated competitor monitoring
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button variant="outline" size="sm">
                      <Settings className="h-4 w-4 mr-2" />
                      Configure APIs
                    </Button>
                    <Button size="sm">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Integration
                    </Button>
                  </div>
                  <div className="text-xs text-muted-foreground mt-4">
                    Supported: RateGain, TravelClick, Rate Shopping APIs
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="budget">
            <Card className="glass-panel dark:glass-panel-dark">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Budget Planning & Performance
                </CardTitle>
                <CardDescription>
                  Annual budget targets and performance tracking
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <Target className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                  <h3 className="font-medium">Budget Management Module</h3>
                  <p className="text-sm text-muted-foreground mb-4">
                    Create annual budgets, set targets, and track performance vs budget
                  </p>
                  <div className="flex gap-2 justify-center">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Budget
                    </Button>
                    <Button variant="outline">
                      <Upload className="h-4 w-4 mr-2" />
                      Import Budget
                    </Button>
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

// TODO: Third-party integration points for Revenue Management:
// 1. PMS Integration: Cloud PMS Pro, Hotel Management Suite, Fidelio for room inventory and rates
// 2. Rate Shopping: RateGain, TravelClick, Competitive Intelligence APIs
// 3. Demand Forecasting: Connect to ML platforms (AWS SageMaker, Google AI)
// 4. Weather APIs: Weather.com, AccuWeather for weather impact analysis
// 5. Event Data: Eventbrite, Local tourism boards for event impact
// 6. Economic Data: Federal Reserve, World Bank APIs for economic factors
// 7. Channel Management: SiteMinder, TravelClick for distribution
// 8. Business Intelligence: Tableau, Power BI for advanced analytics
// 9. Market Data: STR, TripAdvisor for market benchmarking
// 10. Pricing Optimization: IDeaS, Duetto, RevPAR Guru integration
