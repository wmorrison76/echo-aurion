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
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  Zap,
  Target,
} from "lucide-react";
import {
  predictiveForecast,
  analyzeCostTrends,
  detectSeasonalPatterns,
  compareOutlets,
  calculateEfficiencyMetrics,
  identifyCostDrivers,
  calculateKPIs,
} from "@/lib/advanced-analytics"; // Mock data
const mockTimeSeriesData = Array.from({ length: 90 }).map((_, i) => ({
  date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
  value: Math.floor(Math.random() * 500) + 200 + i * 2,
  category: "cost",
}));
const mockOutletData = [
  { outletId: "outlet-1", outletName: "Main Restaurant", value: 4500 },
  { outletId: "outlet-2", outletName: "Rooftop Bar", value: 3200 },
  { outletId: "outlet-3", outletName: "Lobby Cafe", value: 2800 },
  { outletId: "outlet-4", outletName: "Room Service", value: 3800 },
  { outletId: "outlet-5", outletName: "Banquet Hall", value: 5200 },
];
const mockInventoryData = Array.from({ length: 50 }).map(() => ({
  value: Math.random() * 1000 + 500,
  onHand: Math.random() * 200 + 50,
  par: Math.random() * 100 + 50,
}));
const mockOrderData = Array.from({ length: 100 }).map(() => ({
  total: Math.random() * 2000 + 500,
  leadTime: Math.floor(Math.random() * 14) + 2,
  status: ["complete", "pending", "shipped"][Math.floor(Math.random() * 3)],
}));
const COLORS = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#ec4899",
];
export function AdvancedAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<"7d" | "30d" | "90d">("30d"); // Generate all analyses const predictiveAnalysis = useMemo( () => predictiveForecast(mockTimeSeriesData, 14), [], ); const costTrendAnalysis = useMemo( () => analyzeCostTrends(mockTimeSeriesData,"month"), [], ); const seasonalPatterns = useMemo( () => detectSeasonalPatterns(mockTimeSeriesData), [], ); const outletComparison = useMemo(() => compareOutlets(mockOutletData), []); const efficiencyMetrics = useMemo( () => calculateEfficiencyMetrics( mockTimeSeriesData, mockTimeSeriesData.map((d) => ({ ...d, value: d.value * 0.7 })), ), [], ); const costDrivers = useMemo( () => identifyCostDrivers( Array.from({ length: 20 }).map((_, i) => ({ name: `Product ${i + 1}`, cost: Math.random() * 5000 + 500, quantity: Math.floor(Math.random() * 500) + 10, category: ["Proteins","Produce","Dairy","Dry Goods"][ Math.floor(Math.random() * 4) ], })), ), [], ); const kpis = useMemo( () => calculateKPIs({ invoices: Array.from({ length: 50 }).map(() => ({ total: Math.random() * 2000 + 500, status: ["pending","approved","paid"][ Math.floor(Math.random() * 3) ], dueDate: new Date( Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000, ), })), inventory: mockInventoryData, orders: mockOrderData, }), [], ); const forecastChartData = useMemo( () => mockTimeSeriesData.slice(-30).map((d, i) => ({ date: new Date(d.date).toLocaleDateString("en-US", { month:"short", day:"numeric", }), actual: d.value, forecast: null, })), [], ); const costTrendChartData = useMemo( () => mockTimeSeriesData.slice(-12).map((d, i) => ({ date: new Date(d.date).toLocaleDateString("en-US", { month:"short", }), cost: d.value, })), [], ); return ( <AppLayout> <div className="space-y-6 pb-6"> <div> <h1 className="text-3xl font-bold tracking-tight"> Advanced Analytics </h1> <p className="text-muted-foreground mt-2"> Predictive analytics, cost trends, seasonal patterns, and KPIs </p> </div> <Tabs defaultValue="predictive" className="space-y-4"> <TabsList> <TabsTrigger value="predictive">Predictive Analytics</TabsTrigger> <TabsTrigger value="costs">Cost Analysis</TabsTrigger> <TabsTrigger value="seasonality">Seasonality</TabsTrigger> <TabsTrigger value="outlets">Outlet Comparison</TabsTrigger> <TabsTrigger value="efficiency">Efficiency</TabsTrigger> <TabsTrigger value="kpis">KPIs</TabsTrigger> </TabsList> {/* Predictive Analytics Tab */} <TabsContent value="predictive" className="space-y-4"> <div className="grid gap-4 grid-cols-1 sm:grid-cols-3"> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium"> Current Trend </CardTitle> {predictiveAnalysis.currentTrend ==="increasing" ? ( <TrendingUp className="h-4 w-4 text-green-500" /> ) : ( <TrendingDown className="h-4 w-4 text-red-500" /> )} </CardHeader> <CardContent> <div className="text-2xl font-bold capitalize"> {predictiveAnalysis.currentTrend} </div> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium"> Forecasted Value (14d) </CardTitle> <Zap className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> ${predictiveAnalysis.forecastedValue.toFixed(0)} </div> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium"> Confidence </CardTitle> <Target className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {(predictiveAnalysis.confidence * 100).toFixed(0)}% </div> </CardContent> </Card> </div> {predictiveAnalysis.anomalies.length > 0 && ( <Card className="border-yellow-500"> <CardHeader> <CardTitle className="flex items-center gap-2"> <AlertTriangle className="w-5 h-5 text-yellow-500" /> Anomalies Detected </CardTitle> </CardHeader> <CardContent> <div className="space-y-2"> {predictiveAnalysis.anomalies .slice(0, 5) .map((anomaly, i) => ( <div key={i} className="flex justify-between items-center p-2 bg-muted rounded" > <span className="text-sm"> {anomaly.date.toLocaleDateString()} </span> <Badge variant="secondary"> {anomaly.deviation.toFixed(2)}σ </Badge> </div> ))} </div> </CardContent> </Card> )} <Card> <CardHeader> <CardTitle>Demand Forecast (14 Days)</CardTitle> <CardDescription> Predicted values with confidence interval </CardDescription> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={300}> <AreaChart data={forecastChartData}> <defs> <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1" > <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} /> <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /> </linearGradient> </defs> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" /> <YAxis /> <Tooltip /> <Legend /> <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} /> </AreaChart> </ResponsiveContainer> </CardContent> </Card> </TabsContent> {/* Cost Analysis Tab */} <TabsContent value="costs" className="space-y-4"> <div className="grid gap-4 grid-cols-1 sm:grid-cols-3"> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium"> Avg Monthly Cost </CardTitle> <Target className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> ${costTrendAnalysis.averageCost.toFixed(2)} </div> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Trend</CardTitle> {costTrendAnalysis.trend > 0 ? ( <TrendingUp className="h-4 w-4 text-red-500" /> ) : ( <TrendingDown className="h-4 w-4 text-green-500" /> )} </CardHeader> <CardContent> <div className="text-2xl font-bold"> {costTrendAnalysis.trend > 0 ?"+" :""} {costTrendAnalysis.trend.toFixed(1)}% </div> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium"> Savings Opportunity </CardTitle> <Zap className="h-4 w-4 text-green-500" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> ${costTrendAnalysis.savingsOpportunity.toFixed(2)} </div> </CardContent> </Card> </div> <Card> <CardHeader> <CardTitle>Cost Trend (Last 12 Months)</CardTitle> <CardDescription>Historical cost analysis</CardDescription> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={300}> <LineChart data={costTrendChartData}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" /> <YAxis /> <Tooltip formatter={(value) => `$${(value as number).toFixed(2)}`} /> <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot={false} /> </LineChart> </ResponsiveContainer> </CardContent> </Card> <Card> <CardHeader> <CardTitle>Top Cost Drivers</CardTitle> <CardDescription>Products with highest spend</CardDescription> </CardHeader> <CardContent> <div className="space-y-3"> {costDrivers.slice(0, 10).map((driver, i) => ( <div key={i} className="flex items-center justify-between p-2 border rounded" > <div> <p className="font-medium">{driver.name}</p> <p className="text-xs text-muted-foreground"> {driver.category} • ${driver.costPerUnit.toFixed(2)} /unit </p> </div> <div className="text-right"> <p className="font-bold">${driver.cost.toFixed(2)}</p> <p className="text-xs text-muted-foreground"> {driver.percentOfTotal.toFixed(1)}% </p> </div> </div> ))} </div> </CardContent> </Card> </TabsContent> {/* Seasonality Tab */} <TabsContent value="seasonality" className="space-y-4"> {seasonalPatterns.length === 0 ? ( <Card> <CardContent className="pt-6"> <p className="text-muted-foreground"> Insufficient data to detect seasonal patterns </p> </CardContent> </Card> ) : ( seasonalPatterns.map((pattern, i) => ( <Card key={i}> <CardHeader> <CardTitle> {pattern.period}-Day Pattern (Confidence:{""} {(pattern.confidence * 100).toFixed(0)}%) </CardTitle> </CardHeader> <CardContent className="space-y-4"> <div className="grid gap-4 grid-cols-2"> <div> <p className="text-sm text-muted-foreground mb-2"> Peak Days </p> <div className="flex gap-2 flex-wrap"> {pattern.peakDays.length > 0 ? ( pattern.peakDays.map((day) => ( <Badge key={day} variant="default"> Day {day + 1} </Badge> )) ) : ( <p className="text-xs text-muted-foreground"> None </p> )} </div> </div> <div> <p className="text-sm text-muted-foreground mb-2"> Low Days </p> <div className="flex gap-2 flex-wrap"> {pattern.lowDays.length > 0 ? ( pattern.lowDays.map((day) => ( <Badge key={day} variant="secondary"> Day {day + 1} </Badge> )) ) : ( <p className="text-xs text-muted-foreground"> None </p> )} </div> </div> </div> <div className="text-sm"> <p className="text-muted-foreground">Pattern Factor</p> <p className="text-lg font-bold"> {pattern.factor.toFixed(2)}x </p> </div> </CardContent> </Card> )) )} </TabsContent> {/* Outlet Comparison Tab */} <TabsContent value="outlets" className="space-y-4"> <Card> <CardHeader> <CardTitle>Outlet Performance Ranking</CardTitle> <CardDescription>Monthly spend comparison</CardDescription> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={300}> <BarChart data={outletComparison.map((o) => ({ outlet: o.outletName, value: o.metric, }))} > <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="outlet" /> <YAxis /> <Tooltip /> <Bar dataKey="value" fill="#3b82f6"> {outletComparison.map((_, index) => ( <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} /> ))} </Bar> </BarChart> </ResponsiveContainer> </CardContent> </Card> <div className="grid gap-4 grid-cols-1"> {outletComparison.map((outlet) => ( <Card key={outlet.outletId}> <CardContent className="pt-6"> <div className="flex items-center justify-between"> <div className="flex-1"> <div className="flex items-center gap-2 mb-2"> <p className="font-semibold">{outlet.outletName}</p> <Badge className="text-xs">Rank #{outlet.rank}</Badge> </div> <p className="text-2xl font-bold"> ${outlet.metric.toFixed(2)} </p> <p className="text-sm text-muted-foreground"> {outlet.percentDifference > 0 ?"+" :""} {outlet.percentDifference.toFixed(1)}% vs average </p> </div> <div> {outlet.trend ==="increasing" ? ( <TrendingUp className="w-6 h-6 text-red-500" /> ) : ( <TrendingDown className="w-6 h-6 text-green-500" /> )} </div> </div> </CardContent> </Card> ))} </div> </TabsContent> {/* Efficiency Tab */} <TabsContent value="efficiency" className="space-y-4"> <div className="grid gap-4 grid-cols-1 sm:grid-cols-3"> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium"> Cost Per Unit </CardTitle> <Target className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> ${efficiencyMetrics.costPerUnit.toFixed(2)} </div> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium"> Efficiency Score </CardTitle> <Zap className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {efficiencyMetrics.efficiency.toFixed(1)}% </div> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Trend</CardTitle> {efficiencyMetrics.trend ==="improving" ? ( <TrendingUp className="h-4 w-4 text-green-500" /> ) : ( <TrendingDown className="h-4 w-4 text-red-500" /> )} </CardHeader> <CardContent> <div className="text-2xl font-bold capitalize"> {efficiencyMetrics.trend} </div> </CardContent> </Card> </div> </TabsContent> {/* KPIs Tab */} <TabsContent value="kpis" className="space-y-4"> <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3"> {Object.entries(kpis).map(([key, value]) => ( <Card key={key}> <CardHeader> <CardTitle className="text-sm font-medium capitalize"> {key.replace(/([A-Z])/g," $1").trim()} </CardTitle> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {typeof value ==="number" ? value > 100 ? value.toFixed(0) : value.toFixed(2) : value} </div> </CardContent> </Card> ))} </div> </TabsContent> </Tabs> </div> </AppLayout> );
}
export default AdvancedAnalyticsPage;
