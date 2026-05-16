import React, { useMemo, useState } from "react";
import {
  Shield,
  TrendingUp,
  AlertTriangle,
  Zap,
  Eye,
  Brain,
  Heart,
  Lock,
  Activity,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/Skeleton";
interface GuardianHealth {
  name: string;
  status: "healthy" | "warning" | "critical";
  score: number;
  checks: number;
  lastCheck: string;
  description: string;
}
interface Anomaly {
  id: string;
  type: "outlier" | "duplicate" | "fraud" | "error";
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  description: string;
  detected: string;
  resolved: boolean;
}
const GUARDIANS: GuardianHealth[] = [
  {
    name: "Argus",
    status: "healthy",
    score: 98,
    checks: 2847,
    lastCheck: "2024-01-20T14:35:00Z",
    description: "Data compliance and GL rule enforcement",
  },
  {
    name: "Zelda",
    status: "healthy",
    score: 99,
    checks: 1253,
    lastCheck: "2024-01-20T14:30:00Z",
    description: "Duplicate detection and auto-healing",
  },
  {
    name: "Phoenix",
    status: "warning",
    score: 92,
    checks: 847,
    lastCheck: "2024-01-20T14:28:00Z",
    description: "Anomaly detection and emergency rollback",
  },
  {
    name: "Odin",
    status: "healthy",
    score: 95,
    checks: 3421,
    lastCheck: "2024-01-20T14:32:00Z",
    description: "Immutable audit trails and recovery",
  },
];
const RECENT_ANOMALIES: Anomaly[] = [
  {
    id: "anom_1",
    type: "duplicate",
    severity: "high",
    title: "Duplicate Invoice Detected",
    description: "INV-2024-0847 appears to be a duplicate of INV-2024-0846",
    detected: "2024-01-20T14:15:00Z",
    resolved: true,
  },
  {
    id: "anom_2",
    type: "outlier",
    severity: "medium",
    title: "Unusual Transaction Amount",
    description: "Payment of $127,500 to Vendor ABC is 3.2x above normal",
    detected: "2024-01-20T12:45:00Z",
    resolved: false,
  },
  {
    id: "anom_3",
    type: "fraud",
    severity: "critical",
    title: "Potential Fraud Pattern",
    description: "Multiple payments to new vendor outside approval workflow",
    detected: "2024-01-20T10:20:00Z",
    resolved: true,
  },
  {
    id: "anom_4",
    type: "error",
    severity: "low",
    title: "Rounding Variance Detected",
    description: "$0.03 variance in GL reconciliation automatically healed",
    detected: "2024-01-20T09:10:00Z",
    resolved: true,
  },
];
const formatTime = (dateString: string) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  if (diffMins < 1) return "Just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  return date.toLocaleDateString();
};
const getGuardianIcon = (name: string) => {
  switch (name) {
    case "Argus":
      return <Eye className="w-5 h-5" />;
    case "Zelda":
      return <Zap className="w-5 h-5" />;
    case "Phoenix":
      return <Heart className="w-5 h-5" />;
    case "Odin":
      return <Lock className="w-5 h-5" />;
    default:
      return <Shield className="w-5 h-5" />;
  }
};
const getStatusColor = (status: string) => {
  switch (status) {
    case "healthy":
      return "bg-green-50 border-green-200 text-green-900";
    case "warning":
      return "bg-amber-50 border-amber-200 text-amber-900";
    case "critical":
      return "bg-red-50 border-red-200 text-red-900";
    default:
      return "bg-surface border-gray-200 text-gray-900";
  }
};
const getAnomalySeverityColor = (severity: string) => {
  switch (severity) {
    case "critical":
      return "bg-red-100 text-red-800 border-red-300";
    case "high":
      return "bg-orange-100 text-orange-800 border-orange-300";
    case "medium":
      return "bg-amber-100 text-amber-800 border-amber-300";
    case "low":
      return "bg-blue-100 text-blue-800 border-primary";
    default:
      return "bg-surface text-gray-800 border-border";
  }
};
export function GuardianDashboard() {
  const [guardians] = useState<GuardianHealth[]>(GUARDIANS);
  const [anomalies, setAnomalies] = useState<Anomaly[]>(RECENT_ANOMALIES);
  const statistics = useMemo(() => {
    return {
      avgHealth: Math.round(
        guardians.reduce((sum, g) => sum + g.score, 0) / guardians.length,
      ),
      totalChecks: guardians.reduce((sum, g) => sum + g.checks, 0),
      anomaliesDetected: anomalies.length,
      resolved: anomalies.filter((a) => a.resolved).length,
      unresolved: anomalies.filter((a) => !a.resolved).length,
    };
  }, [guardians, anomalies]);
  const healthyCount = guardians.filter((g) => g.status === "healthy").length;
  const warningCount = guardians.filter((g) => g.status === "warning").length;
  const criticalCount = guardians.filter((g) => g.status === "critical").length;
  return (
    <div className="space-y-6">
      {" "}
      {/* Header */}{" "}
      <div>
        {" "}
        <h2 className="text-2xl font-bold text-foreground">
          {" "}
          Guardian Dashboard{" "}
        </h2>{" "}
        <p className="text-sm text-muted-foreground mt-1">
          {" "}
          Four specialized AI guardians protecting financial integrity{" "}
        </p>{" "}
      </div>{" "}
      {/* Health Overview */}{" "}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {" "}
        <div className="bg-surface rounded-lg border border-border p-6">
          {" "}
          <div className="flex items-center justify-between mb-4">
            {" "}
            <h3 className="font-semibold text-foreground">
              Overall Health
            </h3>{" "}
            <Shield className="w-5 h-5 text-aurum-600" />{" "}
          </div>{" "}
          <div className="text-4xl font-bold text-aurum-600 mb-2">
            {" "}
            {statistics.avgHealth}%{" "}
          </div>{" "}
          <div className="text-xs text-muted-foreground space-y-1">
            {" "}
            <div className="flex gap-2">
              {" "}
              <span className="w-2 h-2 rounded-full bg-green-500 mt-1"></span>{" "}
              <span>{healthyCount} Healthy</span>{" "}
            </div>{" "}
            <div className="flex gap-2">
              {" "}
              <span className="w-2 h-2 rounded-full bg-amber-500 mt-1"></span>{" "}
              <span>{warningCount} Warning</span>{" "}
            </div>{" "}
            <div className="flex gap-2">
              {" "}
              <span className="w-2 h-2 rounded-full bg-red-500 mt-1"></span>{" "}
              <span>{criticalCount} Critical</span>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-surface rounded-lg border border-border p-6">
          {" "}
          <div className="flex items-center justify-between mb-4">
            {" "}
            <h3 className="font-semibold text-foreground">Total Checks</h3>{" "}
            <Activity className="w-5 h-5 text-primary" />{" "}
          </div>{" "}
          <div className="text-4xl font-bold text-primary mb-2">
            {" "}
            {(statistics.totalChecks / 1000).toFixed(1)}K{" "}
          </div>{" "}
          <div className="text-xs text-muted-foreground">
            {" "}
            checks performed today{" "}
          </div>{" "}
        </div>{" "}
        <div className="bg-surface rounded-lg border border-border p-6">
          {" "}
          <div className="flex items-center justify-between mb-4">
            {" "}
            <h3 className="font-semibold text-foreground">Anomalies</h3>{" "}
            <AlertTriangle className="w-5 h-5 text-orange-600" />{" "}
          </div>{" "}
          <div className="space-y-2">
            {" "}
            <div className="flex justify-between text-sm">
              {" "}
              <span className="text-muted-foreground">Detected</span>{" "}
              <span className="font-semibold text-foreground">
                {" "}
                {statistics.anomaliesDetected}{" "}
              </span>{" "}
            </div>{" "}
            <div className="flex justify-between text-sm">
              {" "}
              <span className="text-muted-foreground">Resolved</span>{" "}
              <span className="font-semibold text-green-600">
                {" "}
                {statistics.resolved}{" "}
              </span>{" "}
            </div>{" "}
            <div className="flex justify-between text-sm">
              {" "}
              <span className="text-muted-foreground">Pending</span>{" "}
              <span className="font-semibold text-orange-600">
                {" "}
                {statistics.unresolved}{" "}
              </span>{" "}
            </div>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
      {/* Guardian Status Cards */}{" "}
      <div>
        {" "}
        <h3 className="font-semibold text-foreground mb-3">
          Guardian Status
        </h3>{" "}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {" "}
          {guardians.map((guardian) => (
            <div
              key={guardian.name}
              className={cn(
                "border rounded-lg p-4 space-y-3",
                getStatusColor(guardian.status),
              )}
            >
              {" "}
              <div className="flex items-start justify-between">
                {" "}
                <div className="flex items-center gap-3">
                  {" "}
                  {getGuardianIcon(guardian.name)}{" "}
                  <div>
                    {" "}
                    <h4 className="font-semibold">{guardian.name}</h4>{" "}
                    <p className="text-xs opacity-75">
                      {guardian.description}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="text-right">
                  {" "}
                  <div className="text-2xl font-bold">
                    {guardian.score}%
                  </div>{" "}
                  <div className="text-xs opacity-75">
                    {" "}
                    {guardian.checks.toLocaleString()} checks{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
              <div className="flex items-center justify-between text-xs">
                {" "}
                <span>Last check: {formatTime(guardian.lastCheck)}</span>{" "}
                <div
                  className={cn(
                    "inline-flex items-center px-2 py-1 rounded-full",
                    guardian.status === "healthy"
                      ? "bg-green-200"
                      : guardian.status === "warning"
                        ? "bg-amber-200"
                        : "bg-red-200",
                  )}
                >
                  {" "}
                  {guardian.status === "healthy" && (
                    <CheckCircle2 className="w-3 h-3 mr-1" />
                  )}{" "}
                  {guardian.status === "warning" && (
                    <AlertTriangle className="w-3 h-3 mr-1" />
                  )}{" "}
                  {guardian.status === "critical" && (
                    <XCircle className="w-3 h-3 mr-1" />
                  )}{" "}
                  {guardian.status.charAt(0).toUpperCase() +
                    guardian.status.slice(1)}{" "}
                </div>{" "}
              </div>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* Recent Anomalies */}{" "}
      <div>
        {" "}
        <h3 className="font-semibold text-foreground mb-3">
          Recent Anomalies
        </h3>{" "}
        <div className="space-y-3">
          {" "}
          {anomalies.map((anomaly) => (
            <div
              key={anomaly.id}
              className={cn(
                "border rounded-lg p-4",
                getAnomalySeverityColor(anomaly.severity),
              )}
            >
              {" "}
              <div className="flex items-start justify-between mb-2">
                {" "}
                <div>
                  {" "}
                  <h4 className="font-semibold">{anomaly.title}</h4>{" "}
                  <p className="text-sm mt-1">{anomaly.description}</p>{" "}
                </div>{" "}
                <div className="flex flex-col items-end gap-2">
                  {" "}
                  <span className="text-xs font-medium capitalize">
                    {" "}
                    {anomaly.type.replace("_", "")}{" "}
                  </span>{" "}
                  {anomaly.resolved ? (
                    <span className="inline-flex items-center gap-1 text-xs font-medium">
                      {" "}
                      <CheckCircle2 className="w-3 h-3" /> Resolved{" "}
                    </span>
                  ) : (
                    <Button variant="outline" size="sm" className="text-xs">
                      {" "}
                      Review{" "}
                    </Button>
                  )}{" "}
                </div>{" "}
              </div>{" "}
              <p className="text-xs opacity-75">
                {" "}
                {formatTime(anomaly.detected)}{" "}
              </p>{" "}
            </div>
          ))}{" "}
        </div>{" "}
      </div>{" "}
      {/* Action Items */}{" "}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        {" "}
        <div className="flex items-start gap-3">
          {" "}
          <Brain className="w-5 h-5 text-primary flex-shrink-0 mt-0.5" />{" "}
          <div>
            {" "}
            <h4 className="font-semibold text-blue-900">
              AI Recommendations
            </h4>{" "}
            <ul className="text-sm text-blue-800 mt-2 space-y-1">
              {" "}
              <li>
                • Review the potential fraud pattern detected at 10:20 AM
              </li>{" "}
              <li>• Investigate unusual transaction amount from Vendor ABC</li>{" "}
              <li>
                • Consider tightening approval thresholds for new vendors
              </li>{" "}
            </ul>{" "}
          </div>{" "}
        </div>{" "}
      </div>{" "}
    </div>
  );
}
