import React, { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
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
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle,
  Zap,
  DollarSign,
} from "lucide-react";
import {
  exponentialSmoothing,
  optimizeSuppliers,
  detectSeasonality,
  analyzeCostTrends,
  calculateProcurementRecommendations,
} from "@/lib/forecasting";
import { AppLayout } from "@/components/AppLayout"; // Mock data
const mockHistoricalData = Array.from({ length: 90 }).map((_, i) => ({
  date: new Date(Date.now() - (90 - i) * 24 * 60 * 60 * 1000),
  quantity: Math.floor(Math.random() * 100) + 50,
  cost: Math.random() * 50 + 10,
}));
const mockSuppliers = [
  {
    id: "sup1",
    name: "Fresh Foods Co",
    currentCost: 45,
    historicalCosts: [42, 43, 44, 45, 46, 45],
    leadTime: 3,
    reliability: 0.95,
  },
  {
    id: "sup2",
    name: "Bulk Supplies Inc",
    currentCost: 38,
    historicalCosts: [50, 48, 46, 42, 40, 38],
    leadTime: 5,
    reliability: 0.88,
  },
  {
    id: "sup3",
    name: "Premium Vendors Ltd",
    currentCost: 52,
    historicalCosts: [48, 49, 50, 51, 52, 52],
    leadTime: 2,
    reliability: 0.99,
  },
];
export function ForecastingOptimization() {
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [forecastPeriod, setForecastPeriod] = useState(14); // Generate forecasts const forecastData = useMemo( () => exponentialSmoothing(mockHistoricalData, 0.3, forecastPeriod), [forecastPeriod], ); // Analyze cost trends const costTrend = useMemo(() => analyzeCostTrends(mockHistoricalData), []); // Supplier optimization const supplierOptimizations = useMemo( () => optimizeSuppliers(mockSuppliers, 500), [], ); // Detect seasonality const seasonalFactors = useMemo( () => detectSeasonality(mockHistoricalData, 7), [], ); // Procurement recommendations const procurementRecs = useMemo( () => calculateProcurementRecommendations([ { id:"prod1", name:"Premium Beef", demandHistory: mockHistoricalData, currentStock: 250, par: 500, leadTime: 3, }, { id:"prod2", name:"Fresh Vegetables", demandHistory: mockHistoricalData.map((d) => ({ ...d, quantity: d.quantity + Math.floor(Math.random() * 20), })), currentStock: 150, par: 400, leadTime: 2, }, { id:"prod3", name:"Dairy Products", demandHistory: mockHistoricalData.map((d) => ({ ...d, quantity: d.quantity - Math.floor(Math.random() * 10), })), currentStock: 80, par: 300, leadTime: 1, }, ]), [], ); // Chart data for demand forecast const chartData = useMemo(() => { const historicalPoints = mockHistoricalData.slice(-14).map((d) => ({ date: new Date(d.date).toLocaleDateString("en-US", { month:"short", day:"numeric", }), actual: d.quantity, forecast: null, upper: null, lower: null, })); const forecastPoints = forecastData.map((d) => ({ date: new Date(d.date).toLocaleDateString("en-US", { month:"short", day:"numeric", }), actual: null, forecast: d.predictedQuantity, upper: d.upperBound, lower: d.lowerBound, })); return [...historicalPoints, ...forecastPoints]; }, [forecastData]); // Seasonality chart data const seasonalityChartData = useMemo( () => seasonalFactors.map((factor, i) => ({ day: ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"][i], factor: (factor * 100).toFixed(1), })), [seasonalFactors], ); return ( <AppLayout> <div className="space-y-6 pb-6"> <div> <h1 className="text-3xl font-bold tracking-tight"> Forecasting & Optimization </h1> <p className="text-muted-foreground mt-2"> AI-powered demand forecasting, supplier optimization, and procurement recommendations </p> </div> <Tabs defaultValue="demand" className="space-y-4"> <TabsList> <TabsTrigger value="demand">Demand Forecast</TabsTrigger> <TabsTrigger value="suppliers">Supplier Optimization</TabsTrigger> <TabsTrigger value="procurement">Procurement Recs</TabsTrigger> <TabsTrigger value="seasonality">Seasonality</TabsTrigger> <TabsTrigger value="costs">Cost Analysis</TabsTrigger> </TabsList> {/* Demand Forecast Tab */} <TabsContent value="demand" className="space-y-4"> <Card> <CardHeader> <div className="flex items-center justify-between"> <div> <CardTitle>Demand Forecast</CardTitle> <CardDescription> Predicted demand for the next {forecastPeriod} days </CardDescription> </div> <div className="flex gap-2"> {[7, 14, 30].map((days) => ( <Button key={days} variant={forecastPeriod === days ?"default" :"outline"} size="sm" onClick={() => setForecastPeriod(days)} > {days}d </Button> ))} </div> </div> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={400}> <AreaChart data={chartData}> <defs> <linearGradient id="colorForecast" x1="0" y1="0" x2="0" y2="1" > <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.8} /> <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} /> </linearGradient> </defs> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" /> <YAxis /> <Tooltip /> <Legend /> <Area type="monotone" dataKey="actual" stroke="#3b82f6" fill="#3b82f6" fillOpacity={0.6} name="Historical Demand" /> <Area type="monotone" dataKey="forecast" stroke="#8b5cf6" fill="url(#colorForecast)" name="Forecasted Demand" /> </AreaChart> </ResponsiveContainer> <div className="grid gap-4 grid-cols-3 mt-6"> <Card> <CardContent className="pt-6"> <div className="text-sm text-muted-foreground"> Next 7 Days Avg </div> <div className="text-2xl font-bold"> {Math.round( forecastData .slice(0, 7) .reduce((sum, d) => sum + d.predictedQuantity, 0) / 7, )} </div> </CardContent> </Card> <Card> <CardContent className="pt-6"> <div className="text-sm text-muted-foreground"> Confidence </div> <div className="text-2xl font-bold"> {Math.round(forecastData[0].confidence * 100)}% </div> </CardContent> </Card> <Card> <CardContent className="pt-6"> <div className="text-sm text-muted-foreground">Trend</div> <div className="flex items-center gap-2"> {forecastData[0].trend ==="increasing" ? ( <TrendingUp className="w-5 h-5 text-green-500" /> ) : ( <TrendingDown className="w-5 h-5 text-red-500" /> )} <span className="font-bold capitalize"> {forecastData[0].trend} </span> </div> </CardContent> </Card> </div> </CardContent> </Card> </TabsContent> {/* Supplier Optimization Tab */} <TabsContent value="suppliers" className="space-y-4"> <div className="grid gap-4 grid-cols-1"> {supplierOptimizations.map((supplier) => ( <Card key={supplier.supplierId} className="cursor-pointer hover:bg-accent transition-colors" onClick={() => setSelectedSupplier( selectedSupplier === supplier.supplierId ? null : supplier.supplierId, ) } > <CardContent className="pt-6"> <div className="flex items-start justify-between"> <div className="flex-1"> <h3 className="font-semibold text-lg"> {supplier.supplierName} </h3> <div className="grid gap-4 grid-cols-2 sm:grid-cols-4 mt-4"> <div> <p className="text-sm text-muted-foreground"> Current Cost </p> <p className="text-lg font-bold"> ${supplier.currentCost.toFixed(2)} </p> </div> <div> <p className="text-sm text-muted-foreground"> Avg Cost </p> <p className="text-lg font-bold"> ${supplier.averageCost.toFixed(2)} </p> </div> <div> <p className="text-sm text-muted-foreground"> Cost Trend </p> <div className="flex items-center gap-1 mt-1"> {supplier.costTrend > 0 ? ( <TrendingUp className="w-4 h-4 text-red-500" /> ) : ( <TrendingDown className="w-4 h-4 text-green-500" /> )} <p className="text-lg font-bold"> {supplier.costTrend.toFixed(1)}% </p> </div> </div> <div> <p className="text-sm text-muted-foreground"> Reliability </p> <p className="text-lg font-bold"> {(supplier.reliability * 100).toFixed(0)}% </p> </div> </div> {selectedSupplier === supplier.supplierId && ( <div className="mt-6 pt-6 border-t space-y-4"> <div> <p className="text-sm font-medium mb-2"> Recommendation </p> <Badge variant="secondary" className="capitalize"> {supplier.recommendation.replace(/_/g,"")} </Badge> </div> <div> <p className="text-sm font-medium mb-2"> Estimated Annual Savings </p> <p className="text-lg font-bold text-green-600"> ${supplier.estimatedSavings.toFixed(2)} </p> </div> <div className="space-y-2"> <p className="text-sm font-medium">Details</p> <dl className="text-sm space-y-1"> <div className="flex justify-between"> <dt className="text-muted-foreground"> Lead Time </dt> <dd className="font-medium"> {supplier.leadTime} days </dd> </div> <div className="flex justify-between"> <dt className="text-muted-foreground"> Reliability Score </dt> <dd className="font-medium"> {(supplier.reliability * 100).toFixed(1)}% </dd> </div> </dl> </div> <Button className="w-full"> {supplier.recommendation ==="increase_orders" ?"Increase Orders" : supplier.recommendation ==="negotiate" ?"Start Negotiation" : supplier.recommendation ==="diversify" ?"Find Alternatives" :"Consolidate Orders"} </Button> </div> )} </div> </div> </CardContent> </Card> ))} </div> </TabsContent> {/* Procurement Recommendations Tab */} <TabsContent value="procurement" className="space-y-4"> {procurementRecs.length > 0 && ( <Alert className={ procurementRecs.some((r) => r.urgency ==="high") ?"border-red-500 bg-red-50" :"" } > <AlertTriangle className="h-4 w-4" /> <AlertDescription> {procurementRecs.filter((r) => r.urgency ==="high").length}{""} items require immediate ordering </AlertDescription> </Alert> )} <div className="grid gap-4 grid-cols-1"> {procurementRecs.map((rec) => ( <Card key={rec.productId} className={ rec.urgency ==="high" ?"border-red-500 border-2" : rec.urgency ==="medium" ?"border-yellow-500 border-2" :"" } > <CardContent className="pt-6"> <div className="flex items-start justify-between gap-4"> <div className="flex-1"> <div className="flex items-center gap-2 mb-2"> <h3 className="font-semibold text-lg"> {rec.productName} </h3> <Badge variant={ rec.urgency ==="high" ?"destructive" : rec.urgency ==="medium" ?"secondary" :"default" } > {rec.urgency.toUpperCase()} </Badge> </div> <p className="text-sm text-muted-foreground mb-3"> {rec.reason} </p> <div className="grid gap-4 grid-cols-2 sm:grid-cols-3"> <div> <p className="text-xs text-muted-foreground"> Recommended Qty </p> <p className="text-lg font-bold"> {rec.recommendedQuantity} </p> </div> <div> <p className="text-xs text-muted-foreground"> Est. Cost </p> <p className="text-lg font-bold"> ${rec.estimatedCost.toFixed(2)} </p> </div> <div> <p className="text-xs text-muted-foreground"> Unit Cost </p> <p className="text-lg font-bold"> $ {( rec.estimatedCost / rec.recommendedQuantity ).toFixed(2)} </p> </div> </div> </div> {rec.urgency ==="high" && ( <Button className="mt-0">Order Now</Button> )} </div> </CardContent> </Card> ))} </div> </TabsContent> {/* Seasonality Tab */} <TabsContent value="seasonality" className="space-y-4"> <Card> <CardHeader> <CardTitle>Weekly Seasonality Pattern</CardTitle> <CardDescription> Relative demand by day of week (1.0 = average) </CardDescription> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={300}> <BarChart data={seasonalityChartData}> <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="day" /> <YAxis /> <Tooltip /> <Bar dataKey="factor" fill="#3b82f6" /> </BarChart> </ResponsiveContainer> <div className="mt-6 grid gap-4 grid-cols-7"> {seasonalityChartData.map((data) => ( <Card key={data.day}> <CardContent className="pt-4"> <p className="text-center text-sm font-medium"> {data.day} </p> <p className="text-center text-2xl font-bold"> {data.factor} </p> </CardContent> </Card> ))} </div> </CardContent> </Card> </TabsContent> {/* Cost Analysis Tab */} <TabsContent value="costs" className="space-y-4"> <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4"> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Avg Cost</CardTitle> <DollarSign className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> ${costTrend.averageCost.toFixed(2)} </div> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium">Trend</CardTitle> {costTrend.trend ==="increasing" ? ( <TrendingUp className="h-4 w-4 text-red-500" /> ) : ( <TrendingDown className="h-4 w-4 text-green-500" /> )} </CardHeader> <CardContent> <div className="text-2xl font-bold capitalize"> {costTrend.trend} </div> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium"> Volatility </CardTitle> <Zap className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> {(costTrend.volatility * 100).toFixed(1)}% </div> </CardContent> </Card> <Card> <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2"> <CardTitle className="text-sm font-medium"> Forecasted </CardTitle> <CheckCircle className="h-4 w-4 text-muted-foreground" /> </CardHeader> <CardContent> <div className="text-2xl font-bold"> ${costTrend.forecastedCost.toFixed(2)} </div> </CardContent> </Card> </div> <Card> <CardHeader> <CardTitle>Cost Trend Analysis</CardTitle> <CardDescription>Historical and forecasted costs</CardDescription> </CardHeader> <CardContent> <ResponsiveContainer width="100%" height={300}> <LineChart data={mockHistoricalData.slice(-30).map((d, i) => ({ date: new Date(d.date).toLocaleDateString("en-US", { month:"short", day:"numeric", }), cost: d.cost, }))} > <CartesianGrid strokeDasharray="3 3" /> <XAxis dataKey="date" /> <YAxis /> <Tooltip formatter={(value) => `$${(value as number).toFixed(2)}`} /> <Line type="monotone" dataKey="cost" stroke="#3b82f6" strokeWidth={2} dot={false} /> </LineChart> </ResponsiveContainer> </CardContent> </Card> </TabsContent> </Tabs> </div> </AppLayout> );
}
export default ForecastingOptimization;
