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
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  TrendingDown,
  Zap,
  Users,
  Clock,
  RefreshCw,
  CheckCircle2,
  AlertOctagon,
} from "lucide-react";
import { cn } from "@/lib/glass";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
interface Equipment {
  id: string;
  name: string;
  type: string;
  healthScore: number;
  riskLevel: "critical" | "high" | "medium" | "low";
  lastMaintenance: string;
  nextScheduled: string;
  failureProbability: number;
  estimatedHoursRemaining: number;
  historicalDowntime: number;
}
interface StaffRisk {
  id: string;
  name: string;
  role: string;
  hoursThisWeek: number;
  fatigueScore: number;
  turnoverRisk: number;
  performanceIndex: number;
  stressIndicators: string[];
}
interface ChurnPrediction {
  customerId: string;
  name: string;
  riskScore: number;
  lastVisit: string;
  visitFrequency: number;
  spendTrend: number;
  recommendation: string;
}
interface MaintenanceAlert {
  id: string;
  severity: "critical" | "high" | "medium";
  type: "equipment" | "staff" | "churn";
  title: string;
  description: string;
  timestamp: string;
  actionRequired: string;
}
const COLORS = ["#00b4d8", "#0096c7", "#0077b6", "#03045e", "#caf0f8"];
const EQUIPMENT_DATA: Equipment[] = [
  {
    id: "oven-1",
    name: "Main Oven",
    type: "Baking Equipment",
    healthScore: 72,
    riskLevel: "high",
    lastMaintenance: "2024-11-15",
    nextScheduled: "2024-12-15",
    failureProbability: 0.18,
    estimatedHoursRemaining: 480,
    historicalDowntime: 12,
  },
  {
    id: "fridge-1",
    name: "Walk-in Cooler",
    type: "Refrigeration",
    healthScore: 88,
    riskLevel: "low",
    lastMaintenance: "2024-10-20",
    nextScheduled: "2025-01-20",
    failureProbability: 0.04,
    estimatedHoursRemaining: 1200,
    historicalDowntime: 2,
  },
  {
    id: "dishwasher-1",
    name: "Commercial Dishwasher",
    type: "Washing Equipment",
    healthScore: 58,
    riskLevel: "critical",
    lastMaintenance: "2024-09-10",
    nextScheduled: "2024-12-01",
    failureProbability: 0.42,
    estimatedHoursRemaining: 120,
    historicalDowntime: 18,
  },
  {
    id: "prep-station-1",
    name: "Prep Station Cooktop",
    type: "Cooking Equipment",
    healthScore: 65,
    riskLevel: "high",
    lastMaintenance: "2024-10-01",
    nextScheduled: "2025-01-01",
    failureProbability: 0.24,
    estimatedHoursRemaining: 360,
    historicalDowntime: 8,
  },
];
const STAFF_RISK_DATA: StaffRisk[] = [
  {
    id: "staff-1",
    name: "Marcus Johnson",
    role: "Head Chef",
    hoursThisWeek: 52,
    fatigueScore: 78,
    turnoverRisk: 0.35,
    performanceIndex: 82,
    stressIndicators: ["High hours", "Difficult requests", "Team conflicts"],
  },
  {
    id: "staff-2",
    name: "Sarah Williams",
    role: "Pastry Chef",
    hoursThisWeek: 38,
    fatigueScore: 42,
    turnoverRisk: 0.12,
    performanceIndex: 94,
    stressIndicators: [],
  },
  {
    id: "staff-3",
    name: "David Chen",
    role: "Line Cook",
    hoursThisWeek: 48,
    fatigueScore: 68,
    turnoverRisk: 0.48,
    performanceIndex: 76,
    stressIndicators: [
      "Seeking schedule changes",
      "Reduced performance",
      "High fatigue",
    ],
  },
  {
    id: "staff-4",
    name: "Emma Rodriguez",
    role: "Sous Chef",
    hoursThisWeek: 45,
    fatigueScore: 55,
    turnoverRisk: 0.22,
    performanceIndex: 88,
    stressIndicators: ["Recent complaints"],
  },
];
const CHURN_DATA: ChurnPrediction[] = [
  {
    customerId: "cust-1",
    name: "VIP Group (parties)",
    riskScore: 0.72,
    lastVisit: "2024-10-15",
    visitFrequency: 4,
    spendTrend: -12,
    recommendation: "Reach out with exclusive offer, address service issues",
  },
  {
    customerId: "cust-2",
    name: "Tech Company Team",
    riskScore: 0.18,
    lastVisit: "2024-11-20",
    visitFrequency: 8,
    spendTrend: 15,
    recommendation: "Maintain engagement, offer loyalty rewards",
  },
  {
    customerId: "cust-3",
    name: "Weekend Regulars",
    riskScore: 0.55,
    lastVisit: "2024-11-05",
    visitFrequency: 12,
    spendTrend: -8,
    recommendation: "Create seasonal menu items they enjoy",
  },
  {
    customerId: "cust-4",
    name: "Corporate Events",
    riskScore: 0.88,
    lastVisit: "2024-09-30",
    visitFrequency: 2,
    spendTrend: -25,
    recommendation: "Urgent: Schedule follow-up call, special offer",
  },
];
const MAINTENANCE_ALERTS: MaintenanceAlert[] = [
  {
    id: "alert-1",
    severity: "critical",
    type: "equipment",
    title: "Dishwasher Failure Imminent",
    description:
      "Commercial dishwasher health at 58%. Estimated failure within 120 hours.",
    timestamp: "2024-11-22T10:30:00Z",
    actionRequired: "Schedule emergency maintenance within 48 hours",
  },
  {
    id: "alert-2",
    severity: "high",
    type: "staff",
    title: "High Turnover Risk: David Chen",
    description:
      "Line cook showing 48% turnover risk with fatigue score 68/100",
    timestamp: "2024-11-22T09:15:00Z",
    actionRequired: "Schedule 1:1 meeting, discuss schedule preferences",
  },
  {
    id: "alert-3",
    severity: "high",
    type: "churn",
    title: "At-Risk Account: Corporate Events",
    description: "No visits in 53 days, spend down 25%, churn risk 88%",
    timestamp: "2024-11-22T08:00:00Z",
    actionRequired: "Immediate outreach, custom proposal, special pricing",
  },
  {
    id: "alert-4",
    severity: "high",
    type: "equipment",
    title: "Main Oven Maintenance Due",
    description: "Main oven health at 72%, next service overdue by 7 days",
    timestamp: "2024-11-21T14:00:00Z",
    actionRequired: "Schedule maintenance for this week",
  },
];
const HEALTH_TREND = [
  { day: "Mon", avgHealth: 76, avgFatigue: 58, churnRisk: 42 },
  { day: "Tue", avgHealth: 74, avgFatigue: 61, churnRisk: 44 },
  { day: "Wed", avgHealth: 72, avgFatigue: 65, churnRisk: 46 },
  { day: "Thu", avgHealth: 70, avgFatigue: 68, churnRisk: 49 },
  { day: "Fri", avgHealth: 68, avgFatigue: 72, churnRisk: 52 },
  { day: "Sat", avgHealth: 66, avgFatigue: 75, churnRisk: 55 },
  { day: "Sun", avgHealth: 72, avgFatigue: 62, churnRisk: 48 },
];
const RISK_MATRIX = [
  { x: 0.15, y: 0.04, name: "Walk-in Cooler", equipment: true, size: 100 },
  { x: 0.35, y: 0.12, name: "Sous Chef", staff: true, size: 80 },
  { x: 0.48, y: 0.48, name: "David Chen", staff: true, size: 120 },
  { x: 0.55, y: 0.55, name: "Weekend Regulars", churn: true, size: 100 },
  { x: 0.72, y: 0.72, name: "VIP Group", churn: true, size: 110 },
  { x: 0.88, y: 0.88, name: "Corporate Events", churn: true, size: 130 },
];
export default function PredictiveMaintenanceModule() {
  const { t } = useI18n();
  const [activeTab, setActiveTab] = useState("overview");
  const [isLoading, setIsLoading] = useState(false);
  const [selectedEquipment, setSelectedEquipment] = useState<Equipment | null>(
    null,
  );
  const [selectedStaff, setSelectedStaff] = useState<StaffRisk | null>(null);
  const getRiskColor = (level: string) => {
    switch (level) {
      case "critical":
        return "text-destructive";
      case "high":
        return "text-warning";
      case "medium":
        return "text-yellow-500 dark:text-yellow-400";
      case "low":
        return "text-success";
      default:
        return "text-muted-foreground";
    }
  };
  const getRiskBgColor = (level: string) => {
    switch (level) {
      case "critical":
        return "bg-destructive/10 border-destructive/20 dark:bg-destructive/20 dark:border-destructive/30";
      case "high":
        return "bg-warning/10 border-warning/20 dark:bg-warning/20 dark:border-warning/30";
      case "medium":
        return "bg-yellow-500/10 border-yellow-500/20 dark:bg-yellow-400/20 dark:border-yellow-400/30";
      case "low":
        return "bg-success/10 border-success/20 dark:bg-success/20 dark:border-success/30";
      default:
        return "bg-muted border-border";
    }
  };
  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/predictive-maintenance/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          equipment: EQUIPMENT_DATA,
          staff: STAFF_RISK_DATA,
          churn: CHURN_DATA,
        }),
      });
      if (response.ok) {
        const data = await response.json();
        console.log("[MAINTENANCE] Analysis:", data);
      }
    } catch (error) {
      console.error("[MAINTENANCE] Error:", error);
    } finally {
      setIsLoading(false);
    }
  };
  const criticalAlerts = MAINTENANCE_ALERTS.filter(
    (a) => a.severity === "critical",
  );
  const highAlerts = MAINTENANCE_ALERTS.filter((a) => a.severity === "high");
  const avgEquipmentHealth = (
    EQUIPMENT_DATA.reduce((sum, e) => sum + e.healthScore, 0) /
    EQUIPMENT_DATA.length
  ).toFixed(1);
  const avgStaffFatigue = (
    STAFF_RISK_DATA.reduce((sum, s) => sum + s.fatigueScore, 0) /
    STAFF_RISK_DATA.length
  ).toFixed(1);
  const avgChurnRisk = (
    CHURN_DATA.reduce((sum, c) => sum + c.riskScore, 0) / CHURN_DATA.length
  ).toFixed(2);
  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900/50 via-slate-800/50 to-slate-900/50 rounded-lg border border-border shadow-xl p-4 gap-4 overflow-y-auto">
      {" "}
      <div className="flex items-center justify-between">
        {" "}
        <div>
          {" "}
          <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-2">
            {" "}
            <AlertTriangle className="w-6 h-6 text-amber-400" />{" "}
            {t("module.predictive-maintenance.title")}{" "}
          </h1>{" "}
          <p className="text-sm text-slate-400">
            {t("module.predictive-maintenance.description")}
          </p>{" "}
        </div>{" "}
        <div className="flex items-center gap-3">
          {" "}
          <ModuleChatButton
            moduleId="predictive-maintenance"
            moduleName={t("module.predictive-maintenance.title")}
          />{" "}
          <Button
            onClick={handleAnalyze}
            disabled={isLoading}
            className="gap-2"
          >
            {" "}
            <RefreshCw
              className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`}
            />{" "}
            {isLoading
              ? t("module.predictive-maintenance.analyzing")
              : t("module.predictive-maintenance.analyze")}{" "}
          </Button>{" "}
        </div>{" "}
      </div>{" "}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        {" "}
        <TabsList className="grid w-full grid-cols-5 bg-slate-800/50 border border-border">
          {" "}
          <TabsTrigger
            value="overview"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            Overview{" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="equipment"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            Equipment{" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="staff"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            Staff Risk{" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="churn"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            Customer Churn{" "}
          </TabsTrigger>{" "}
          <TabsTrigger
            value="alerts"
            className="data-[state=active]:bg-primary/20 data-[state=active]:border-blue-500/50"
          >
            {" "}
            Alerts{" "}
          </TabsTrigger>{" "}
        </TabsList>{" "}
        <TabsContent value="overview" className="space-y-4">
          {" "}
          <div className="grid grid-cols-4 gap-3">
            {" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  Equipment Health
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-blue-400">
                  {avgEquipmentHealth}%
                </div>{" "}
                <p className="text-xs text-slate-400 mt-1">
                  {
                    EQUIPMENT_DATA.filter(
                      (e) =>
                        e.riskLevel === "critical" || e.riskLevel === "high",
                    ).length
                  }{" "}
                  items at risk
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  Staff Fatigue
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-orange-400">
                  {avgStaffFatigue}
                </div>{" "}
                <p className="text-xs text-slate-400 mt-1">
                  {STAFF_RISK_DATA.filter((s) => s.turnoverRisk > 0.3).length}{" "}
                  high risk
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  Churn Risk
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-red-400">
                  {(parseFloat(avgChurnRisk) * 100).toFixed(0)}%
                </div>{" "}
                <p className="text-xs text-slate-400 mt-1">
                  {CHURN_DATA.filter((c) => c.riskScore > 0.5).length} accounts
                  at risk
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
            <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
              {" "}
              <CardHeader className="pb-2">
                {" "}
                <CardTitle className="text-sm text-slate-300">
                  Active Alerts
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent>
                {" "}
                <div className="text-3xl font-bold text-red-400">
                  {MAINTENANCE_ALERTS.length}
                </div>{" "}
                <p className="text-xs text-slate-400 mt-1">
                  {criticalAlerts.length} critical
                </p>{" "}
              </CardContent>{" "}
            </Card>{" "}
          </div>{" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm">
                Health Trend (7 Days)
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ResponsiveContainer width="100%" height={300}>
                {" "}
                <LineChart data={HEALTH_TREND}>
                  {" "}
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />{" "}
                  <XAxis dataKey="day" stroke="#94a3b8" />{" "}
                  <YAxis stroke="#94a3b8" />{" "}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                  />{" "}
                  <Legend />{" "}
                  <Line
                    type="monotone"
                    dataKey="avgHealth"
                    stroke="#00b4d8"
                    strokeWidth={2}
                    name="Equipment Health"
                  />{" "}
                  <Line
                    type="monotone"
                    dataKey="avgFatigue"
                    stroke="#f97316"
                    strokeWidth={2}
                    name="Staff Fatigue"
                  />{" "}
                  <Line
                    type="monotone"
                    dataKey="churnRisk"
                    stroke="#ef4444"
                    strokeWidth={2}
                    name="Churn Risk"
                  />{" "}
                </LineChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm">
                Risk Matrix (Equipment, Staff, Customers)
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent>
              {" "}
              <ResponsiveContainer width="100%" height={300}>
                {" "}
                <ScatterChart
                  margin={{ top: 20, right: 20, bottom: 20, left: 20 }}
                >
                  {" "}
                  <CartesianGrid strokeDasharray="3 3" stroke="#475569" />{" "}
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Risk Factor"
                    stroke="#94a3b8"
                  />{" "}
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Severity"
                    stroke="#94a3b8"
                  />{" "}
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#1e293b",
                      border: "1px solid #475569",
                    }}
                    cursor={{ strokeDasharray: "3 3" }}
                  />{" "}
                  <Scatter
                    name="Equipment"
                    data={RISK_MATRIX.filter((r) => r.equipment)}
                    fill="#00b4d8"
                  />{" "}
                  <Scatter
                    name="Staff"
                    data={RISK_MATRIX.filter((r) => r.staff)}
                    fill="#f97316"
                  />{" "}
                  <Scatter
                    name="Customers"
                    data={RISK_MATRIX.filter((r) => r.churn)}
                    fill="#ef4444"
                  />{" "}
                </ScatterChart>{" "}
              </ResponsiveContainer>{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        <TabsContent value="equipment" className="space-y-3">
          {" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm">
                Equipment Health Status
              </CardTitle>{" "}
              <CardDescription>
                Maintenance schedules and failure predictions
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {EQUIPMENT_DATA.map((equip) => (
                <div
                  key={equip.id}
                  className={`p-3 rounded-lg border ${getRiskBgColor(equip.riskLevel)} cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => setSelectedEquipment(equip)}
                >
                  {" "}
                  <div className="flex items-start justify-between mb-2">
                    {" "}
                    <div>
                      {" "}
                      <p className="font-semibold text-slate-100">
                        {equip.name}
                      </p>{" "}
                      <p className="text-xs text-slate-400">
                        {equip.type}
                      </p>{" "}
                    </div>{" "}
                    <div
                      className={`text-2xl font-bold ${equip.healthScore > 80 ? "text-green-400" : equip.healthScore > 60 ? "text-yellow-400" : "text-red-400"}`}
                    >
                      {equip.healthScore}%
                    </div>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">Failure Risk</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {(equip.failureProbability * 100).toFixed(0)}%
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">Hours Left</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {equip.estimatedHoursRemaining}h
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">Last Service</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {equip.lastMaintenance}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
          {selectedEquipment && (
            <Card className="bg-blue-900/20 border-blue-700/30 backdrop-blur-sm">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="text-sm">
                  {selectedEquipment.name} - Detailed Analysis
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-2 text-sm">
                {" "}
                <div className="grid grid-cols-2 gap-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-slate-400">Last Maintenance</p>{" "}
                    <p className="font-semibold">
                      {selectedEquipment.lastMaintenance}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-slate-400">Next Scheduled</p>{" "}
                    <p className="font-semibold">
                      {selectedEquipment.nextScheduled}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-slate-400">Historical Downtime</p>{" "}
                    <p className="font-semibold">
                      {selectedEquipment.historicalDowntime} hours
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-slate-400">Risk Level</p>{" "}
                    <p
                      className={`font-semibold ${getRiskColor(selectedEquipment.riskLevel)}`}
                    >
                      {selectedEquipment.riskLevel.toUpperCase()}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>
          )}{" "}
        </TabsContent>{" "}
        <TabsContent value="staff" className="space-y-3">
          {" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm">
                Staff Risk Assessment
              </CardTitle>{" "}
              <CardDescription>
                Fatigue, turnover, and retention insights
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {STAFF_RISK_DATA.map((staff) => (
                <div
                  key={staff.id}
                  className={`p-3 rounded-lg border ${getRiskBgColor(staff.turnoverRisk > 0.3 ? (staff.turnoverRisk > 0.45 ? "critical" : "high") : staff.turnoverRisk > 0.15 ? "medium" : "low")} cursor-pointer hover:opacity-80 transition-opacity`}
                  onClick={() => setSelectedStaff(staff)}
                >
                  {" "}
                  <div className="flex items-start justify-between mb-2">
                    {" "}
                    <div>
                      {" "}
                      <p className="font-semibold text-slate-100">
                        {staff.name}
                      </p>{" "}
                      <p className="text-xs text-slate-400">
                        {staff.role}
                      </p>{" "}
                    </div>{" "}
                    <div className="text-right">
                      {" "}
                      <div
                        className={`text-2xl font-bold ${staff.fatigueScore > 70 ? "text-red-400" : staff.fatigueScore > 50 ? "text-yellow-400" : "text-green-400"}`}
                      >
                        {staff.fatigueScore}
                      </div>{" "}
                      <p className="text-xs text-slate-400">Fatigue</p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">Hours/Week</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {staff.hoursThisWeek}h
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">Turnover Risk</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {(staff.turnoverRisk * 100).toFixed(0)}%
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">Performance</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {staff.performanceIndex}%
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  {staff.stressIndicators.length > 0 && (
                    <div className="mt-2 flex flex-wrap gap-1">
                      {staff.stressIndicators.map((ind, i) => (
                        <span
                          key={i}
                          className="text-xs bg-red-500/20 text-red-200 px-2 py-1 rounded"
                        >
                          {ind}
                        </span>
                      ))}
                    </div>
                  )}{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
          {selectedStaff && (
            <Card className="bg-orange-900/20 border-orange-700/30 backdrop-blur-sm">
              {" "}
              <CardHeader>
                {" "}
                <CardTitle className="text-sm">
                  {selectedStaff.name} - Retention Plan
                </CardTitle>{" "}
              </CardHeader>{" "}
              <CardContent className="space-y-2 text-sm">
                {" "}
                <div className="bg-surface p-2 rounded border border-border">
                  {" "}
                  <p className="text-slate-300">
                    {" "}
                    <strong>Recommended Actions:</strong>{" "}
                  </p>{" "}
                  <ul className="mt-1 space-y-1 text-slate-400 text-xs">
                    {" "}
                    {selectedStaff.turnoverRisk > 0.3 && (
                      <li>• Schedule immediate 1:1 conversation</li>
                    )}{" "}
                    {selectedStaff.fatigueScore > 70 && (
                      <li>• Reduce hours or redistribute workload</li>
                    )}{" "}
                    {selectedStaff.turnoverRisk > 0.45 && (
                      <li>
                        • Offer schedule flexibility or additional benefits
                      </li>
                    )}{" "}
                    <li>
                      • Recognition/incentive for {selectedStaff.role} role
                    </li>{" "}
                  </ul>{" "}
                </div>{" "}
              </CardContent>{" "}
            </Card>
          )}{" "}
        </TabsContent>{" "}
        <TabsContent value="churn" className="space-y-3">
          {" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm">
                Customer Churn Predictions
              </CardTitle>{" "}
              <CardDescription>
                Identify at-risk accounts and retention opportunities
              </CardDescription>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-3">
              {" "}
              {CHURN_DATA.map((churn) => (
                <div
                  key={churn.customerId}
                  className={`p-3 rounded-lg border ${getRiskBgColor(churn.riskScore > 0.7 ? "critical" : churn.riskScore > 0.5 ? "high" : churn.riskScore > 0.3 ? "medium" : "low")}`}
                >
                  {" "}
                  <div className="flex items-start justify-between mb-2">
                    {" "}
                    <div>
                      {" "}
                      <p className="font-semibold text-slate-100">
                        {churn.name}
                      </p>{" "}
                      <p className="text-xs text-slate-400">
                        Avg spend: {churn.spendTrend > 0 ? "↑" : "↓"}{" "}
                        {Math.abs(churn.spendTrend)}% this period
                      </p>{" "}
                    </div>{" "}
                    <div
                      className={`text-2xl font-bold ${churn.riskScore > 0.7 ? "text-red-400" : churn.riskScore > 0.5 ? "text-orange-400" : "text-yellow-400"}`}
                    >
                      {(churn.riskScore * 100).toFixed(0)}%
                    </div>{" "}
                  </div>{" "}
                  <div className="grid grid-cols-3 gap-2 text-xs mb-2">
                    {" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">Last Visit</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {churn.lastVisit}
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">Visit Frequency</p>{" "}
                      <p className="font-semibold text-slate-100">
                        {churn.visitFrequency}x/month
                      </p>{" "}
                    </div>{" "}
                    <div>
                      {" "}
                      <p className="text-slate-400">Trend</p>{" "}
                      <p
                        className={`font-semibold ${churn.spendTrend > 0 ? "text-green-400" : "text-red-400"}`}
                      >
                        {churn.spendTrend}%
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                  <div className="bg-surface p-2 rounded border border-border">
                    {" "}
                    <p className="text-xs text-slate-300">
                      {" "}
                      <strong>Action:</strong> {churn.recommendation}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
        </TabsContent>{" "}
        <TabsContent value="alerts" className="space-y-3">
          {" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm flex items-center gap-2">
                {" "}
                <AlertOctagon className="w-4 h-4 text-red-400" /> Critical
                Alerts ({criticalAlerts.length}){" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-2">
              {" "}
              {criticalAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-red-900/20 border border-red-700/30"
                >
                  {" "}
                  <div className="flex items-start gap-2">
                    {" "}
                    <AlertTriangle className="w-4 h-4 text-red-400 mt-1 flex-shrink-0" />{" "}
                    <div className="flex-1">
                      {" "}
                      <p className="font-semibold text-slate-100">
                        {alert.title}
                      </p>{" "}
                      <p className="text-xs text-slate-400 mt-1">
                        {alert.description}
                      </p>{" "}
                      <p className="text-xs text-red-300 mt-2 font-semibold">
                        → {alert.actionRequired}
                      </p>{" "}
                    </div>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </CardContent>{" "}
          </Card>{" "}
          <Card className="bg-slate-800/30 border-border backdrop-blur-sm">
            {" "}
            <CardHeader>
              {" "}
              <CardTitle className="text-sm flex items-center gap-2">
                {" "}
                <AlertCircle className="w-4 h-4 text-orange-400" /> High
                Priority Alerts ({highAlerts.length}){" "}
              </CardTitle>{" "}
            </CardHeader>{" "}
            <CardContent className="space-y-2">
              {" "}
              {highAlerts.map((alert) => (
                <div
                  key={alert.id}
                  className="p-3 rounded-lg bg-orange-900/20 border border-orange-700/30"
                >
                  {" "}
                  <div className="flex items-start gap-2">
                    {" "}
                    <AlertCircle className="w-4 h-4 text-orange-400 mt-1 flex-shrink-0" />{" "}
                    <div className="flex-1">
                      {" "}
                      <p className="font-semibold text-slate-100">
                        {alert.title}
                      </p>{" "}
                      <p className="text-xs text-slate-400 mt-1">
                        {alert.description}
                      </p>{" "}
                      <p className="text-xs text-orange-300 mt-2 font-semibold">
                        → {alert.actionRequired}
                      </p>{" "}
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
