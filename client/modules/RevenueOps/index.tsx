import React, { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
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
  DollarSign,
  AlertCircle,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/glass";
interface RevenueData {
  period: string;
  revenue: number;
  costs: number;
  profit: number;
}
interface CostBreakdown {
  category: string;
  amount: number;
  percentage: number;
  trend: number;
}
interface PricingInsight {
  dish: string;
  currentPrice: number;
  recommendedPrice: number;
  priceElasticity: number;
  estimatedImpact: number;
  margin: number;
}
interface ForecastData {
  week: number;
  predictedRevenue: number;
  confidence: number;
  factors: string[];
}
const COLORS = ["#00b4d8", "#0096c7", "#0077b6", "#03045e", "#caf0f8"];
const REVENUE_TREND = [
  { period: "Week 1", revenue: 45000, costs: 18000, profit: 27000 },
  { period: "Week 2", revenue: 52000, costs: 19500, profit: 32500 },
  { period: "Week 3", revenue: 48000, costs: 18800, profit: 29200 },
  { period: "Week 4", revenue: 61000, costs: 21000, profit: 40000 },
  { period: "Week 5", revenue: 58000, costs: 20500, profit: 37500 },
];
const COST_BREAKDOWN: CostBreakdown[] = [
  { category: "Ingredients", amount: 18500, percentage: 34, trend: 2.5 },
  { category: "Labor", amount: 22000, percentage: 40, trend: -1.2 },
  { category: "Utilities", amount: 5000, percentage: 9, trend: 0.8 },
  { category: "Supplies", amount: 3500, percentage: 6, trend: 1.5 },
  { category: "Rent", amount: 4000, percentage: 7, trend: 0 },
  { category: "Other", amount: 2500, percentage: 4, trend: -0.5 },
];
const PRICING_INSIGHTS: PricingInsight[] = [
  {
    dish: "Crabcakes",
    currentPrice: 28,
    recommendedPrice: 32,
    priceElasticity: 0.85,
    estimatedImpact: 4200,
    margin: 68,
  },
  {
    dish: "Lobster Tail",
    currentPrice: 45,
    recommendedPrice: 43,
    priceElasticity: 1.2,
    estimatedImpact: -1800,
    margin: 55,
  },
  {
    dish: "Pasta Primavera",
    currentPrice: 18,
    recommendedPrice: 20,
    priceElasticity: 0.9,
    estimatedImpact: 2100,
    margin: 72,
  },
  {
    dish: "Salmon Fillet",
    currentPrice: 35,
    recommendedPrice: 36,
    priceElasticity: 0.95,
    estimatedImpact: 850,
    margin: 60,
  },
  {
    dish: "Ribeye Steak",
    currentPrice: 52,
    recommendedPrice: 54,
    priceElasticity: 0.8,
    estimatedImpact: 3200,
    margin: 50,
  },
];
const FORECAST_DATA: ForecastData[] = [
  {
    week: 1,
    predictedRevenue: 62000,
    confidence: 92,
    factors: ["Holiday weekend", "Weather favorable", "Events scheduled"],
  },
  {
    week: 2,
    predictedRevenue: 55000,
    confidence: 88,
    factors: ["Post-holiday dip", "New promotion running"],
  },
  {
    week: 3,
    predictedRevenue: 58000,
    confidence: 85,
    factors: ["Seasonal trend", "Competition discount"],
  },
  {
    week: 4,
    predictedRevenue: 64000,
    confidence: 80,
    factors: ["Valentine's Day promo", "Influencer visit planned"],
  },
];
export default function RevenueOpsModule() {
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [scenarioRevenue, setScenarioRevenue] = useState(60000);
  const [scenarioCosts, setScenarioCosts] = useState(20000);
  const [totalCosts, setTotalCosts] = useState(55000);
  useEffect(() => {
    const total = COST_BREAKDOWN.reduce((sum, item) => sum + item.amount, 0);
    setTotalCosts(total);
  }, []);
  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/revenue-ops/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revenue: scenarioRevenue,
          costs: scenarioCosts,
          breakdown: COST_BREAKDOWN,
          dishes: PRICING_INSIGHTS,
        }),
      });
      if (!response.ok)
        throw new Error("Analysis failed"); /* Process response... */
    } catch (error) {
      console.error("Revenue analysis error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const totalRevenue = REVENUE_TREND.reduce(
    (sum, item) => sum + item.revenue,
    0,
  );
  const avgProfit =
    REVENUE_TREND.reduce((sum, item) => sum + item.profit, 0) /
    REVENUE_TREND.length;
  const totalPricingImpact = PRICING_INSIGHTS.reduce(
    (sum, item) => sum + item.estimatedImpact,
    0,
  );
  const avgMargin =
    PRICING_INSIGHTS.reduce((sum, item) => sum + item.margin, 0) /
    PRICING_INSIGHTS.length;
  return (
    <div
      className={cn(
        "w-full h-full overflow-y-auto bg-background/50 backdrop-blur-sm p-6 space-y-6",
      )}
    >
      {" "}
      {/* Header */}{" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-2">
            {" "}
            <DollarSign className="w-8 h-8 text-blue-500" /> Revenue
            Operations{" "}
          </h1>{" "}
          <p className="text-sm text-foreground/60 mt-1">
            {" "}
            Integrated revenue forecasting, cost analysis, and pricing
            optimization{" "}
          </p>{" "}
        </div>{" "}
        <Button onClick={handleAnalyze} disabled={isLoading} className="gap-2">
          {" "}
          <RefreshCw
            className={cn("w-4 h-4", isLoading && "animate-spin")}
          />{" "}
          Analyze Now{" "}
        </Button>{" "}
      </div>{" "}
      {/* Quick Stats */}{" "}
      <div className="grid grid-cols-4 gap-4">
        {" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              Total Revenue (5w)
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-green-500">
              ${(totalRevenue / 1000).toFixed(0)}K
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">+$264K YoY</p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              Avg Monthly Profit
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-blue-500">
              ${(avgProfit / 1000).toFixed(1)}K
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">+8.2% MoM</p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              Total Monthly Costs
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-orange-500">
              ${(totalCosts / 1000).toFixed(1)}K
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              -3.5% vs Budget
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
        <Card className="bg-background border-white/10">
          {" "}
          <CardHeader className="pb-2">
            {" "}
            <CardTitle className="text-sm text-foreground/60">
              Pricing Opportunity
            </CardTitle>{" "}
          </CardHeader>{" "}
          <CardContent>
            {" "}
            <div className="text-2xl font-bold text-purple-500">
              ${(totalPricingImpact / 1000).toFixed(1)}K
            </div>{" "}
            <p className="text-xs text-foreground/50 mt-1">
              Potential Monthly Impact
            </p>{" "}
          </CardContent>{" "}
        </Card>{" "}
      </div>{" "}
      {/* Tabs */}{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-4 bg-background border border-white/10 p-1 rounded-lg">
          {" "}
          <TabsTrigger value="overview">Overview</TabsTrigger>{" "}
          <TabsTrigger value="costs">Cost Analysis</TabsTrigger>{" "}
          <TabsTrigger value="pricing">Pricing Insights</TabsTrigger>{" "}
          <TabsTrigger value="forecast">Forecasting</TabsTrigger>{" "}
        </TabsList>{" "}
        {/* Overview Tab */}{" "}
        <TabsContent value="overview" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>5-Week Revenue & Profit Trend</CardTitle>{" "}
              <CardDescription>
                Weekly revenue, costs, and profit margins
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="h-96">
              {" "}
              <ResponsiveContainer width="100%" height="100%">
                {" "}
                <LineChart data={REVENUE_TREND}>
                  {" "}
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#ffffff20"
                  />{" "}
                  <XAxis dataKey="period" stroke="#ffffff60" />{" "}
                  <YAxis stroke="#ffffff60" />{" "}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #ffffff20",
                      borderRadius: "8px",
                    }}
                  />{" "}
                  <Legend />{" "}
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#00b4d8"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />{" "}
                  <Line
                    type="monotone"
                    dataKey="profit"
                    stroke="#00d4aa"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />{" "}
                  <Line
                    type="monotone"
                    dataKey="costs"
                    stroke="#ff6b6b"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                  />{" "}
                </LineChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>{" "}
          {/* Scenario Analysis */}{" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>What-If Scenario Analysis</CardTitle>{" "}
              <CardDescription>
                Adjust revenue and costs to see profit impact
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              <div className="grid grid-cols-2 gap-4">
                {" "}
                <div>
                  {" "}
                  <label className="text-sm text-foreground/70 mb-2 block">
                    {" "}
                    Scenario Revenue: ${(scenarioRevenue / 1000).toFixed(0)}
                    K{" "}
                  </label>{" "}
                  <Input
                    type="range"
                    min="40000"
                    max="80000"
                    step="1000"
                    value={scenarioRevenue}
                    onChange={(e) => setScenarioRevenue(Number(e.target.value))}
                    className="w-full"
                  />{" "}
                </div>{" "}
                <div>
                  {" "}
                  <label className="text-sm text-foreground/70 mb-2 block">
                    {" "}
                    Scenario Costs: ${(scenarioCosts / 1000).toFixed(0)}K{" "}
                  </label>{" "}
                  <Input
                    type="range"
                    min="15000"
                    max="30000"
                    step="500"
                    value={scenarioCosts}
                    onChange={(e) => setScenarioCosts(Number(e.target.value))}
                    className="w-full"
                  />{" "}
                </div>{" "}
              </div>{" "}
              <div className="bg-background border border-white/10 rounded-lg p-4 space-y-2">
                {" "}
                <div className="flex justify-between items-center">
                  {" "}
                  <span className="text-foreground/70">
                    Projected Profit:
                  </span>{" "}
                  <span className="text-xl font-bold text-green-500">
                    {" "}
                    ${((scenarioRevenue - scenarioCosts) / 1000).toFixed(1)}
                    K{" "}
                  </span>{" "}
                </div>{" "}
                <div className="flex justify-between items-center">
                  {" "}
                  <span className="text-foreground/70">
                    Profit Margin:
                  </span>{" "}
                  <span className="text-lg font-semibold text-blue-500">
                    {" "}
                    {(
                      ((scenarioRevenue - scenarioCosts) / scenarioRevenue) *
                      100
                    ).toFixed(1)}
                    %{" "}
                  </span>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Cost Analysis Tab */}{" "}
        <TabsContent value="costs" className="space-y-4 mt-4">
          {" "}
          <div className="grid grid-cols-2 gap-4">
            {" "}
            <Card className="bg-background border-white/10">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle>Cost Breakdown by Category</CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="h-80">
                {" "}
                <ResponsiveContainer width="100%" height="100%">
                  {" "}
                  <PieChart>
                    {" "}
                    <Pie
                      data={COST_BREAKDOWN}
                      dataKey="amount"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                    >
                      {" "}
                      {COST_BREAKDOWN.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={COLORS[index % COLORS.length]}
                        />
                      ))}{" "}
                    </Pie>{" "}
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#1a1a1a",
                        border: "1px solid #ffffff20",
                        borderRadius: "8px",
                      }}
                    />{" "}
                    <Legend />{" "}
                  </PieChart>{" "}
                </ResponsiveContainer>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-background border-white/10">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle>Cost Details & Trends</CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-3 max-h-80 overflow-y-auto">
                {" "}
                {COST_BREAKDOWN.map((item) => (
                  <div
                    key={item.category}
                    className="border-b border-white/10 pb-3"
                  >
                    {" "}
                    <div className="flex justify-between items-start mb-1">
                      {" "}
                      <span className="text-foreground/80 font-medium">
                        {item.category}
                      </span>{" "}
                      <span className="text-sm font-semibold text-white">
                        ${(item.amount / 1000).toFixed(1)}K
                      </span>{" "}
                    </div>{" "}
                    <div className="flex justify-between items-center text-xs">
                      {" "}
                      <span className="text-foreground/60">
                        {item.percentage}% of total
                      </span>{" "}
                      <span
                        className={cn(
                          "font-semibold",
                          item.trend > 0 ? "text-red-500" : "text-green-500",
                        )}
                      >
                        {" "}
                        {item.trend > 0 ? "+" : ""} {item.trend}% trend{" "}
                      </span>{" "}
                    </div>{" "}
                  </div>
                ))}{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Cost Optimization Recommendations</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              <div className="flex gap-3 p-3 bg-orange-500/10 border border-orange-500/30 rounded-lg">
                {" "}
                <AlertCircle className="w-5 h-5 text-orange-500 flex-shrink-0 mt-0.5" />{" "}
                <div>
                  {" "}
                  <p className="font-medium text-foreground">
                    Labor costs trending up (+1.2%)
                  </p>{" "}
                  <p className="text-sm text-foreground/60 mt-1">
                    {" "}
                    Implement auto-scheduling to optimize shift assignments{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex gap-3 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                {" "}
                <TrendingDown className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />{" "}
                <div>
                  {" "}
                  <p className="font-medium text-foreground">
                    Ingredient sourcing opportunity
                  </p>{" "}
                  <p className="text-sm text-foreground/60 mt-1">
                    {" "}
                    Supplier B offers 8% discount on premium ingredients. ROI:
                    $1,480/month{" "}
                  </p>{" "}
                </div>{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Pricing Insights Tab */}{" "}
        <TabsContent value="pricing" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Dynamic Pricing Recommendations</CardTitle>{" "}
              <CardDescription>
                AI-recommended price adjustments based on demand and margin
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {" "}
                {PRICING_INSIGHTS.map((insight) => {
                  const priceDiff =
                    insight.recommendedPrice - insight.currentPrice;
                  const isIncrease = priceDiff > 0;
                  return (
                    <div
                      key={insight.dish}
                      className="border border-white/10 rounded-lg p-4"
                    >
                      {" "}
                      <div className="flex justify-between items-start mb-3">
                        {" "}
                        <div>
                          {" "}
                          <h4 className="font-semibold text-foreground">
                            {insight.dish}
                          </h4>{" "}
                          <p className="text-xs text-foreground/60 mt-1">
                            Price elasticity: {insight.priceElasticity}
                          </p>{" "}
                        </div>{" "}
                        <div className="text-right">
                          {" "}
                          <p className="text-lg font-bold text-foreground">
                            {" "}
                            ${insight.currentPrice} → $
                            {insight.recommendedPrice}{" "}
                          </p>{" "}
                          <p
                            className={cn(
                              "text-sm font-semibold mt-1",
                              isIncrease ? "text-green-500" : "text-blue-500",
                            )}
                          >
                            {" "}
                            {isIncrease ? "+" : ""} {priceDiff.toFixed(2)} (
                            {((priceDiff / insight.currentPrice) * 100).toFixed(
                              1,
                            )}
                            %){" "}
                          </p>{" "}
                        </div>{" "}
                      </div>{" "}
                      <div className="grid grid-cols-2 gap-3 text-sm">
                        {" "}
                        <div className="bg-background rounded p-2">
                          {" "}
                          <p className="text-foreground/60">
                            Estimated Impact
                          </p>{" "}
                          <p
                            className={cn(
                              "font-bold mt-1",
                              insight.estimatedImpact > 0
                                ? "text-green-500"
                                : "text-orange-500",
                            )}
                          >
                            {" "}
                            ${(insight.estimatedImpact / 1000).toFixed(1)}
                            K/month{" "}
                          </p>{" "}
                        </div>{" "}
                        <div className="bg-background rounded p-2">
                          {" "}
                          <p className="text-foreground/60">Avg Margin</p>{" "}
                          <p className="font-bold text-blue-500 mt-1">
                            {insight.margin}%
                          </p>{" "}
                        </div>{" "}
                      </div>{" "}
                    </div>
                  );
                })}{" "}
              </div>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>Pricing Impact Summary</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="h-64">
              {" "}
              <ResponsiveContainer width="100%" height="100%">
                {" "}
                <BarChart
                  data={PRICING_INSIGHTS.map((item) => ({
                    name: item.dish.substring(0, 8),
                    impact: item.estimatedImpact / 1000,
                  }))}
                >
                  {" "}
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="#ffffff20"
                  />{" "}
                  <XAxis dataKey="name" stroke="#ffffff60" />{" "}
                  <YAxis stroke="#ffffff60" />{" "}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1a1a1a",
                      border: "1px solid #ffffff20",
                      borderRadius: "8px",
                    }}
                  />{" "}
                  <Bar dataKey="impact" fill="#00b4d8" />{" "}
                </BarChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        {/* Forecast Tab */}{" "}
        <TabsContent value="forecast" className="space-y-4 mt-4">
          {" "}
          <Card className="bg-background border-white/10">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle>4-Week Revenue Forecast</CardTitle>{" "}
              <CardDescription>
                Predicted revenue with confidence scores and driving factors
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-4">
              {" "}
              {FORECAST_DATA.map((forecast) => (
                <div
                  key={forecast.week}
                  className="border border-white/10 rounded-lg p-4"
                >
                  {" "}
                  <div className="flex justify-between items-start mb-3">
                    {" "}
                    <div>
                      {" "}
                      <h4 className="font-semibold text-foreground">
                        Week {forecast.week}
                      </h4>{" "}
                      <p className="text-lg font-bold text-green-500 mt-1">
                        {" "}
                        ${(forecast.predictedRevenue / 1000).toFixed(0)}K{" "}
                      </p>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <p className="text-sm text-foreground/60 mb-1">
                        Confidence
                      </p>{" "}
                      <div className="w-24 h-2 bg-background rounded-full overflow-hidden">
                        {" "}
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-cyan-500"
                          style={{ width: `${forecast.confidence}%` }}
                        />{" "}
                      </div>{" "}
                      <p className="text-sm font-bold text-blue-500 mt-1">
                        {forecast.confidence}%
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="bg-background rounded p-3">
                    {" "}
                    <p className="text-xs text-foreground/60 mb-2 font-semibold uppercase">
                      Key Factors
                    </p>{" "}
                    <div className="flex flex-wrap gap-2">
                      {" "}
                      {forecast.factors.map((factor, idx) => (
                        <span
                          key={idx}
                          className="bg-background border border-white/20 rounded-full px-3 py-1 text-xs text-foreground/80"
                        >
                          {" "}
                          {factor}{" "}
                        </span>
                      ))}{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
