import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from "recharts";
import {
  TrendingUp,
  AlertCircle,
  Target,
  Zap,
  Award,
  Bell,
  Download,
  Share2,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
import { getThemePalette } from "@/lib/theme-colors";
interface BenchmarkMetric {
  metric: string;
  yourValue: number;
  industryAvg: number;
  topPerformer: number;
  percentile: number;
  trend: number;
  status: "exceeding" | "meeting" | "below";
}
interface IndustryInsight {
  id: string;
  title: string;
  category: "trend" | "warning" | "opportunity";
  description: string;
  impact: "high" | "medium" | "low";
  affectedMetrics: string[];
  recommendation: string;
  source: string;
}
interface CompetitorAnalysis {
  name: string;
  avgRating: number;
  pricePoint: number;
  marketShare: number;
  strengths: string[];
  weaknesses: string[];
}
const BENCHMARK_METRICS: BenchmarkMetric[] = [
  {
    metric: "Food Cost %",
    yourValue: 31.2,
    industryAvg: 32.5,
    topPerformer: 28.3,
    percentile: 65,
    trend: -1.3,
    status: "exceeding",
  },
  {
    metric: "Labor Cost %",
    yourValue: 28.5,
    industryAvg: 30.0,
    topPerformer: 25.2,
    percentile: 72,
    trend: -0.8,
    status: "exceeding",
  },
  {
    metric: "Customer Satisfaction",
    yourValue: 4.6,
    industryAvg: 4.2,
    topPerformer: 4.8,
    percentile: 78,
    trend: 0.2,
    status: "exceeding",
  },
  {
    metric: "Revenue per Seat",
    yourValue: 85.5,
    industryAvg: 78.3,
    topPerformer: 95.2,
    percentile: 68,
    trend: 2.3,
    status: "exceeding",
  },
  {
    metric: "Table Turnover Rate",
    yourValue: 2.1,
    industryAvg: 1.8,
    topPerformer: 2.5,
    percentile: 72,
    trend: 0.1,
    status: "exceeding",
  },
  {
    metric: "Staff Retention",
    yourValue: 78.5,
    industryAvg: 72.0,
    topPerformer: 85.3,
    percentile: 68,
    trend: 1.5,
    status: "exceeding",
  },
];
const INDUSTRY_INSIGHTS: IndustryInsight[] = [
  {
    id: "insight-1",
    title: "Rising Food Costs",
    category: "warning",
    description: "Produce costs up 8.3% YoY due to supply chain disruptions",
    impact: "high",
    affectedMetrics: ["Food Cost %", "Revenue per Seat"],
    recommendation:
      "Increase menu prices 3-5% or reduce portion sizes strategically",
    source: "NRAA Industry Report",
  },
  {
    id: "insight-2",
    title: "Premium Dining Growth",
    category: "opportunity",
    description: "Fine dining segment seeing 12% growth in post-COVID recovery",
    impact: "high",
    affectedMetrics: ["Revenue per Seat", "Customer Satisfaction"],
    recommendation: "Consider premium menu items and wine program expansion",
    source: "Market Research",
  },
  {
    id: "insight-3",
    title: "Staff Shortage Continues",
    category: "warning",
    description: "Kitchen staff shortage critical in metro areas, wages up 15%",
    impact: "high",
    affectedMetrics: ["Labor Cost %", "Staff Retention"],
    recommendation: "Competitive wages and benefits, cross-training programs",
    source: "Labor Analytics",
  },
  {
    id: "insight-4",
    title: "Tech Integration Advantage",
    category: "opportunity",
    description:
      "Early adopters of AI ordering systems see 18% productivity gains",
    impact: "medium",
    affectedMetrics: ["Revenue per Seat", "Labor Cost %"],
    recommendation: "Evaluate AI-powered ordering and inventory systems",
    source: "Tech Adoption Survey",
  },
];
const COMPETITORS: CompetitorAnalysis[] = [
  {
    name: "Artisan Table Downtown",
    avgRating: 4.5,
    pricePoint: 45,
    marketShare: 12,
    strengths: ["Fine dining reputation", "Wine selection"],
    weaknesses: ["High prices", "Limited parking"],
  },
  {
    name: "Fast Casual Hub",
    avgRating: 4.2,
    pricePoint: 18,
    marketShare: 8,
    strengths: ["Quick service", "Consistent quality"],
    weaknesses: ["Limited seating", "No reservations"],
  },
  {
    name: "Ethnic Fusion Bistro",
    avgRating: 4.4,
    pricePoint: 32,
    marketShare: 10,
    strengths: ["Unique menu", "Trendy vibe"],
    weaknesses: ["Inconsistent service", "Noise level"],
  },
];
const BENCHMARK_TREND = [
  { month: "Jan", you: 85.2, industry: 82.3, top: 91.5 },
  { month: "Feb", you: 86.1, industry: 82.8, top: 92.1 },
  { month: "Mar", you: 87.3, industry: 83.5, top: 92.8 },
  { month: "Apr", you: 86.8, industry: 84.2, top: 93.2 },
  { month: "May", you: 87.9, industry: 84.9, top: 94.0 },
  { month: "Jun", you: 88.5, industry: 85.5, top: 94.5 },
];
const PERFORMANCE_RADAR = [
  { category: "Food Cost", you: 85, industry: 78, top: 92 },
  { category: "Labor", you: 82, industry: 75, top: 90 },
  { category: "Customer Sat", you: 92, industry: 84, top: 96 },
  { category: "Revenue", you: 88, industry: 82, top: 96 },
  { category: "Efficiency", you: 86, industry: 80, top: 94 },
  { category: "Retention", you: 89, industry: 78, top: 96 },
];
export default function DataCollectiveModule() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("benchmarks");
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const exceedingCount = BENCHMARK_METRICS.filter(
    (m) => m.status === "exceeding",
  ).length;
  const meetingCount = BENCHMARK_METRICS.filter(
    (m) => m.status === "meeting",
  ).length;
  const belowCount = BENCHMARK_METRICS.filter(
    (m) => m.status === "below",
  ).length;
  const overallPercentile = Math.round(
    BENCHMARK_METRICS.reduce((sum, m) => sum + m.percentile, 0) /
      BENCHMARK_METRICS.length,
  );
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900/50 via-slate-800/50 to-slate-900/50 rounded-lg border border-border shadow-xl p-4 gap-4 overflow-y-auto">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            {" "}
            <Target className="w-6 h-6 text-purple-400" />{" "}
            {t("module.data-collective.title")}{" "}
          </h1>{" "}
          <p className="text-sm text-slate-400">
            {t("module.data-collective.description")}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-3">
          {" "}
          <ModuleChatButton
            moduleId="data-collective"
            moduleName={t("module.data-collective.title")}
          />{" "}
          <div className="flex gap-2">
            {" "}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-slate-800/50 border-border"
            >
              {" "}
              <Download className="w-4 h-4" />{" "}
              {t("module.data-collective.export")}{" "}
            </Button>{" "}
            <Button
              variant="outline"
              size="sm"
              className="gap-2 bg-slate-800/50 border-border"
            >
              {" "}
              <Settings className="w-4 h-4" />{" "}
              {t("module.data-collective.settings")}{" "}
            </Button>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-4 bg-slate-800/50 border border-border">
          {" "}
          <TabsTrigger
            value="benchmarks"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            {t("module.data-collective.tabs.benchmarks")}{" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="insights"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            {t("module.data-collective.tabs.insights")}{" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="competitors"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            {t("module.data-collective.tabs.competitors")}{" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="alerts"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            {t("module.data-collective.tabs.alerts")}{" "}
          </TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="benchmarks" className="space-y-4">
          {" "}
          <div className="grid grid-cols-4 gap-3">
            {" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  {t("module.data-collective.metrics.overallPercentile")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-purple-400">
                  {overallPercentile}th
                </div>{" "}
                <p className="text-xs text-slate-400 mt-1">
                  {t("module.data-collective.metrics.vsIndustry")}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  {t("module.data-collective.metrics.exceeding")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-green-400">
                  {exceedingCount}
                </div>{" "}
                <p className="text-xs text-slate-400 mt-1">
                  {t("module.data-collective.metrics.ofMetrics")}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  {t("module.data-collective.metrics.benchmarkTrend")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-blue-400">
                  +3.3
                </div>{" "}
                <p className="text-xs text-slate-400 mt-1">
                  {t("module.data-collective.metrics.monthImprovement")}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  {t("module.data-collective.metrics.gapToTop")}
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-yellow-400">
                  -4.2
                </div>{" "}
                <p className="text-xs text-slate-400 mt-1">
                  {t("module.data-collective.metrics.percentagePoints")}
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm">
                {t("module.data-collective.charts.performanceRadar")}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ResponsiveContainer width="100%" height={300}>
                {" "}
                <RadarChart data={PERFORMANCE_RADAR}>
                  {" "}
                  <PolarGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    strokeOpacity={0.3}
                  />{" "}
                  <PolarAngleAxis
                    dataKey="category"
                    stroke="var(--muted-foreground)"
                  />{" "}
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 100]}
                    stroke="var(--muted-foreground)"
                  />{" "}
                  <Radar
                    name={t("module.data-collective.charts.you")}
                    dataKey="you"
                    stroke={getThemePalette()[0]}
                    fill={getThemePalette()[0]}
                    fillOpacity={0.25}
                  />{" "}
                  <Radar
                    name={t("module.data-collective.charts.industryAvg")}
                    dataKey="industry"
                    stroke={getThemePalette()[4]}
                    fill={getThemePalette()[4]}
                    fillOpacity={0.15}
                  />{" "}
                  <Radar
                    name={t("module.data-collective.charts.topPerformer")}
                    dataKey="top"
                    stroke={getThemePalette()[3]}
                    fill={getThemePalette()[3]}
                    fillOpacity={0.1}
                  />{" "}
                  <Legend />{" "}
                </RadarChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm">6-Month Trend</CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ResponsiveContainer width="100%" height={250}>
                {" "}
                <LineChart data={BENCHMARK_TREND}>
                  {" "}
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="var(--border)"
                    strokeOpacity={0.3}
                  />{" "}
                  <XAxis dataKey="month" stroke="var(--muted-foreground)" />{" "}
                  <YAxis stroke="var(--muted-foreground)" />{" "}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "var(--card)",
                      border: "1px solid var(--border)",
                      color: "var(--foreground)",
                    }}
                  />{" "}
                  <Legend />{" "}
                  <Line
                    type="monotone"
                    dataKey="you"
                    stroke={getThemePalette()[0]}
                    strokeWidth={2}
                    name="Your Restaurant"
                  />{" "}
                  <Line
                    type="monotone"
                    dataKey="industry"
                    stroke={getThemePalette()[4]}
                    strokeWidth={2}
                    name="Industry Average"
                  />{" "}
                  <Line
                    type="monotone"
                    dataKey="top"
                    stroke={getThemePalette()[3]}
                    strokeWidth={2}
                    name="Top Performer"
                  />{" "}
                </LineChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <div className="space-y-2">
            {" "}
            <h3 className="font-semibold text-slate-100 text-sm">
              Detailed Metrics
            </h3>{" "}
            {BENCHMARK_METRICS.map((metric) => (
              <Card
                key={metric.metric}
                className="bg-slate-800/30 border-border backdrop-blur-sm"
              >
                {" "}
                <CardContent className="p-3">
                  {" "}
                  <div className="flex items-center justify-between mb-2">
                    {" "}
                    <div>
                      {" "}
                      <p className="font-semibold text-slate-100 text-sm">
                        {metric.metric}
                      </p>{" "}
                      <p
                        className={`text-xs font-semibold ${metric.status === "exceeding" ? "text-green-400" : metric.status === "meeting" ? "text-yellow-400" : "text-red-400"}`}
                      >
                        {metric.status === "exceeding"
                          ? "✓ Exceeding"
                          : metric.status === "meeting"
                            ? "✓ Meeting"
                            : "⚠ Below"}{" "}
                        Industry
                      </p>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <p className="text-2xl font-bold text-blue-400">
                        {metric.yourValue}
                      </p>{" "}
                      <p className="text-xs text-slate-400">
                        Percentile: {metric.percentile}th
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {" "}
                    <div className="bg-surface p-2 rounded">
                      {" "}
                      <p className="text-slate-400">Industry Avg</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {metric.industryAvg}
                      </p>{" "}
                    </div>{" "}
                    <div className="bg-surface p-2 rounded">
                      {" "}
                      <p className="text-slate-400">Top Performer</p>{" "}
                      <p className="font-semibold text-emerald-400">
                        {metric.topPerformer}
                      </p>{" "}
                    </div>{" "}
                    <div className="bg-surface p-2 rounded">
                      {" "}
                      <p className="text-slate-400">Trend</p>{" "}
                      <p
                        className={`font-semibold ${metric.trend > 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {metric.trend > 0 ? "↑" : "↓"} {Math.abs(metric.trend)}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>
            ))}{" "}
          </div>{" "}
        </TabsContent>{" "}
        <TabsContent value="insights" className="space-y-3">
          {" "}
          {INDUSTRY_INSIGHTS.map((insight) => (
            <Card
              key={insight.id}
              className={`backdrop-blur-sm border ${insight.category === "warning" ? "bg-red-900/20 border-red-700/30" : insight.category === "opportunity" ? "bg-green-900/20 border-green-700/30" : "bg-blue-900/20 border-blue-700/30"}`}
            >
              {" "}
              <CardContent className="p-3">
                {" "}
                <div className="flex items-start gap-3 mb-2">
                  {" "}
                  <div
                    className={`mt-1 ${insight.category === "warning" ? "text-red-400" : insight.category === "opportunity" ? "text-green-400" : "text-blue-400"}`}
                  >
                    {insight.category === "warning" ? (
                      <AlertCircle className="w-5 h-5" />
                    ) : (
                      <Zap className="w-5 h-5" />
                    )}
                  </div>{" "}
                  <div className="flex-1">
                    {" "}
                    <h3 className="font-semibold text-slate-100">
                      {insight.title}
                    </h3>{" "}
                    <p className="text-sm text-slate-300 mt-1">
                      {insight.description}
                    </p>{" "}
                    <div className="mt-2 flex flex-wrap gap-1">
                      {" "}
                      {insight.affectedMetrics.map((metric, i) => (
                        <span
                          key={i}
                          className="text-xs bg-slate-700/50 text-slate-200 px-2 py-1 rounded"
                        >
                          {" "}
                          {metric}{" "}
                        </span>
                      ))}{" "}
                    </div>{" "}
                    <div className="mt-2 p-2 rounded bg-surface border border-border">
                      {" "}
                      <p className="text-xs text-slate-300">
                        {" "}
                        <strong>Recommendation:</strong>{" "}
                        {insight.recommendation}{" "}
                      </p>{" "}
                    </div>{" "}
                    <p className="text-xs text-slate-400 mt-1">
                      Source: {insight.source}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-right text-xs">
                    {" "}
                    <p
                      className={`font-semibold ${insight.impact === "high" ? "text-red-400" : insight.impact === "medium" ? "text-yellow-400" : "text-blue-400"}`}
                    >
                      {insight.impact.toUpperCase()} IMPACT
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>
          ))}{" "}
        </TabsContent>{" "}
        <TabsContent value="competitors" className="space-y-3">
          {" "}
          {COMPETITORS.map((comp) => (
            <Card
              key={comp.name}
              className="bg-slate-800/30 border-border backdrop-blur-sm"
            >
              {" "}
              <CardContent className="p-3">
                {" "}
                <div className="grid grid-cols-3 gap-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="font-semibold text-slate-100 mb-2">
                      {comp.name}
                    </p>{" "}
                    <div className="space-y-2 text-sm">
                      {" "}
                      <div>
                        {" "}
                        <p className="text-slate-400 text-xs">Rating</p>{" "}
                        <p className="font-semibold text-yellow-400">
                          ⭐ {comp.avgRating}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-slate-400 text-xs">
                          Price Point
                        </p>{" "}
                        <p className="font-semibold text-slate-100">
                          ${comp.pricePoint}
                        </p>{" "}
                      </div>{" "}
                      <div>
                        {" "}
                        <p className="text-slate-400 text-xs">
                          Market Share
                        </p>{" "}
                        <p className="font-semibold text-slate-100">
                          {comp.marketShare}%
                        </p>{" "}
                      </div>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-slate-400 font-semibold mb-2">
                      Strengths
                    </p>{" "}
                    <div className="space-y-1">
                      {" "}
                      {comp.strengths.map((str, i) => (
                        <p key={i} className="text-xs text-green-300">
                          {" "}
                          ✓ {str}{" "}
                        </p>
                      ))}{" "}
                    </div>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-slate-400 font-semibold mb-2">
                      Weaknesses
                    </p>{" "}
                    <div className="space-y-1">
                      {" "}
                      {comp.weaknesses.map((weak, i) => (
                        <p key={i} className="text-xs text-red-300">
                          {" "}
                          ✕ {weak}{" "}
                        </p>
                      ))}{" "}
                    </div>{" "}
                  </div>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>
          ))}{" "}
        </TabsContent>{" "}
        <TabsContent value="alerts" className="space-y-3">
          {" "}
          <div className="flex items-center gap-2 mb-4">
            {" "}
            <input
              type="checkbox"
              id="alerts"
              checked={alertsEnabled}
              onChange={(e) => setAlertsEnabled(e.target.checked)}
              className="rounded border-slate-600"
            />{" "}
            <label htmlFor="alerts" className="text-sm text-slate-200">
              {" "}
              Enable benchmark alerts{" "}
            </label>{" "}
          </div>{" "}
          {alertsEnabled && (
            <>
              {" "}
              <Card className="bg-red-900/20 border-red-700/30 backdrop-blur-sm">
                {" "}
                <CardContent className="p-3 flex items-start gap-3">
                  {" "}
                  <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />{" "}
                  <div className="flex-1">
                    {" "}
                    <p className="font-semibold text-slate-100 text-sm">
                      Food Cost Alert
                    </p>{" "}
                    <p className="text-sm text-slate-300 mt-1">
                      Your food costs trending up 1.2% vs last month. Industry
                      average is flat.
                    </p>{" "}
                    <Button size="sm" className="mt-2 h-6 text-xs">
                      {" "}
                      View Analysis{" "}
                    </Button>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="bg-yellow-900/20 border-yellow-700/30 backdrop-blur-sm">
                {" "}
                <CardContent className="p-3 flex items-start gap-3">
                  {" "}
                  <Zap className="w-5 h-5 text-yellow-400 mt-0.5 flex-shrink-0" />{" "}
                  <div className="flex-1">
                    {" "}
                    <p className="font-semibold text-slate-100 text-sm">
                      Labor Cost Opportunity
                    </p>{" "}
                    <p className="text-sm text-slate-300 mt-1">
                      You're 1.5 points below industry on labor costs. Maintain
                      current efficiency.
                    </p>{" "}
                    <Button size="sm" className="mt-2 h-6 text-xs">
                      {" "}
                      View Recommendations{" "}
                    </Button>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
              <Card className="bg-green-900/20 border-green-700/30 backdrop-blur-sm">
                {" "}
                <CardContent className="p-3 flex items-start gap-3">
                  {" "}
                  <Award className="w-5 h-5 text-green-400 mt-0.5 flex-shrink-0" />{" "}
                  <div className="flex-1">
                    {" "}
                    <p className="font-semibold text-slate-100 text-sm">
                      Excellence: Customer Satisfaction
                    </p>{" "}
                    <p className="text-sm text-slate-300 mt-1">
                      Your rating (4.6) exceeds top performers. Maintain service
                      quality.
                    </p>{" "}
                  </div>{" "}
                </CardContent>{" "}
              </Card>{" "}
            </>
          )}{" "}
        </TabsContent>{" "}
      </Tabs>{" "}
    </div>
  );
}
