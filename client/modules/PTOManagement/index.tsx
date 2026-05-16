import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  Loader,
  Briefcase,
} from "lucide-react";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
interface PTOAnalytics {
  requests: Array<{
    requestId: string;
    employeeId: string;
    employeeName: string;
    type: "vacation" | "sick" | "personal" | "unpaid" | "sabbatical";
    startDate: string;
    endDate: string;
    daysRequested: number;
    reason?: string;
    status: "pending" | "approved" | "denied" | "cancelled";
    submittedDate: string;
    approverName: string;
    approverFeedback?: string;
    coverage: {
      assignedCoverage: string[];
      coverageScore: number;
      gapAreas: string[];
    };
    impact: {
      operationalImpact: "low" | "medium" | "high";
      estimatedCost: number;
      recommendation: string;
    };
  }>;
  totalRequests: number;
  summary: {
    approved: number;
    pending: number;
    denied: number;
    totalDaysApproved: number;
    totalDaysPending: number;
  };
  insights: string[];
  recommendations: string[];
  upcomingBlackoutPeriods: Array<{
    period: string;
    reason: string;
    restrictedDepartments: string[];
  }>;
  coveragePlan: {
    temporaryHires: number;
    crossTraining: string[];
    shiftRebalancing: string[];
  };
}
export const PTOManagement: React.FC = () => {
  const { t } = useI18n();
  const [analytics, setAnalytics] = useState<PTOAnalytics | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const handleGenerateAnalytics = async () => {
    setIsGenerating(true);
    try {
      const response = await fetch("/api/pto/advanced", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          departmentId: "dept-all",
          timeframe: "quarter",
        }),
      });
      if (response.ok) {
        setAnalytics(await response.json());
      }
    } catch (error) {
      console.error("PTO analytics error:", error);
    } finally {
      setIsGenerating(false);
    }
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "approved":
        return "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200";
      case "pending":
        return "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200";
      case "denied":
        return "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200";
      default:
        return "bg-slate-100 dark:bg-slate-700 text-slate-800";
    }
  };
  const getImpactColor = (impact: string) => {
    switch (impact) {
      case "high":
        return "text-red-600 dark:text-red-400";
      case "medium":
        return "text-orange-600 dark:text-orange-400";
      case "low":
        return "text-green-600 dark:text-green-400";
      default:
        return "text-muted-foreground";
    }
  };
  return (
    <div className="w-full h-full flex flex-col p-6 bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-900 dark:to-slate-800">
      {" "}
      <div className="mb-6">
        {" "}
        <div className="flex items-center justify-between mb-2">
          {" "}
          <div className="flex items-center gap-3">
            {" "}
            <Calendar className="w-8 h-8 text-cyan-600 dark:text-cyan-400" />{" "}
            <div>
              {" "}
              <h1 className="text-3xl font-bold text-foreground dark:text-white">
                {" "}
                {t("module.pto-management.title")}{" "}
              </h1>{" "}
              <p className="text-muted-foreground">
                {" "}
                {t("module.pto-management.description")}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <ModuleChatButton
            moduleId="pto-management"
            moduleName={t("module.pto-management.title")}
          />{" "}
        </div>{" "}
      </div>{" "}
      {!analytics ? (
        <div className="flex flex-col items-center justify-center flex-1">
          {" "}
          <Calendar className="w-16 h-16 text-cyan-600 dark:text-cyan-400 mx-auto mb-4 opacity-50" />{" "}
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-6">
            {" "}
            {t("module.pto-management.generatePTOAnalytics")}{" "}
          </h2>{" "}
          <Button
            onClick={handleGenerateAnalytics}
            disabled={isGenerating}
            size="lg"
            className="gap-2 bg-cyan-600 hover:bg-cyan-700"
          >
            {" "}
            {isGenerating ? (
              <>
                {" "}
                <Loader className="w-4 h-4 animate-spin" />{" "}
                {t("module.pto-management.analyzing")}{" "}
              </>
            ) : (
              <>
                {" "}
                <Calendar className="w-4 h-4" />{" "}
                {t("module.pto-management.analyzePTORequests")}{" "}
              </>
            )}{" "}
          </Button>{" "}
        </div>
      ) : (
        <>
          {" "}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 mb-6">
            {" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                {t("module.pto-management.totalRequests")}{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {" "}
                {analytics.totalRequests}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                {t("module.pto-management.approved")}{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                {" "}
                {analytics.summary.approved}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                {t("module.pto-management.pending")}{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-yellow-600 dark:text-yellow-400">
                {" "}
                {analytics.summary.pending}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                {t("module.pto-management.daysApproved")}{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {" "}
                {analytics.summary.totalDaysApproved}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg p-3 border border-slate-200 dark:border-border">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-1">
                {" "}
                {t("module.pto-management.tempHiresNeeded")}{" "}
              </p>{" "}
              <p className="text-2xl font-bold text-foreground dark:text-white">
                {" "}
                {analytics.coveragePlan.temporaryHires}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          {analytics.upcomingBlackoutPeriods.length > 0 && (
            <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
              {" "}
              <div className="flex gap-3">
                {" "}
                <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />{" "}
                <div>
                  {" "}
                  <h3 className="font-semibold text-red-900 dark:text-red-200 mb-2">
                    {" "}
                    {t("module.pto-management.upcomingBlackoutPeriods")}{" "}
                  </h3>{" "}
                  <div className="space-y-2">
                    {" "}
                    {analytics.upcomingBlackoutPeriods.map((period, i) => (
                      <div
                        key={i}
                        className="text-sm text-red-800 dark:text-red-300"
                      >
                        {" "}
                        <p className="font-medium">{period.period}</p>{" "}
                        <p className="text-xs opacity-90">
                          {period.reason}
                        </p>{" "}
                      </div>
                    ))}{" "}
                  </div>{" "}
                </div>{" "}
              </div>{" "}
            </div>
          )}{" "}
          <div className="grid grid-cols-1 gap-4 mb-6 flex-1 overflow-y-auto">
            {" "}
            {analytics.requests.map((request) => (
              <div
                key={request.requestId}
                className="bg-background dark:bg-slate-800 rounded-lg p-4 border border-slate-200 dark:border-border"
              >
                {" "}
                <div className="flex justify-between items-start mb-3">
                  {" "}
                  <div>
                    {" "}
                    <h3 className="font-semibold text-foreground dark:text-white">
                      {" "}
                      {request.employeeName}{" "}
                    </h3>{" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      {request.type.toUpperCase()} • {request.daysRequested}
                      {""} {t("module.pto-management.days")}{" "}
                    </p>{" "}
                  </div>{" "}
                  <span
                    className={`text-xs font-bold px-2 py-1 rounded ${getStatusColor(request.status)}`}
                  >
                    {" "}
                    {request.status.toUpperCase()}{" "}
                  </span>{" "}
                </div>{" "}
                <div className="grid grid-cols-2 gap-2 mb-3 text-sm border-b border-slate-200 dark:border-border pb-3">
                  {" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      {t("module.pto-management.dates")}{" "}
                    </p>{" "}
                    <p className="font-bold text-foreground dark:text-white">
                      {" "}
                      {new Date(request.startDate).toLocaleDateString()} -{""}{" "}
                      {new Date(request.endDate).toLocaleDateString()}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div>
                    {" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      {t("module.pto-management.impact")}{" "}
                    </p>{" "}
                    <p
                      className={`font-bold ${getImpactColor(request.impact.operationalImpact)}`}
                    >
                      {" "}
                      {request.impact.operationalImpact.toUpperCase()}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>{" "}
                <div className="mb-3">
                  {" "}
                  <p className="text-xs font-semibold text-muted-foreground mb-2">
                    {" "}
                    {t("module.pto-management.coverage")}:{" "}
                    {request.coverage.coverageScore}%{" "}
                  </p>{" "}
                  <div className="space-y-1">
                    {" "}
                    {request.coverage.assignedCoverage.map((emp, i) => (
                      <p key={i} className="text-xs text-muted-foreground">
                        {" "}
                        ✓ {emp}{" "}
                      </p>
                    ))}{" "}
                    {request.coverage.gapAreas.length > 0 && (
                      <>
                        {" "}
                        {request.coverage.gapAreas.map((gap, i) => (
                          <p
                            key={i}
                            className="text-xs text-orange-600 dark:text-orange-400"
                          >
                            {" "}
                            ⚠ {gap}{" "}
                          </p>
                        ))}{" "}
                      </>
                    )}{" "}
                  </div>{" "}
                </div>{" "}
                <p className="text-xs text-muted-foreground">
                  {" "}
                  💡 {request.impact.recommendation}{" "}
                </p>{" "}
              </div>
            ))}{" "}
          </div>{" "}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
            {" "}
            <div className="bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-blue-200 dark:border-slate-600">
              {" "}
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-3">
                {" "}
                {t("module.pto-management.keyInsights")}{" "}
              </h3>{" "}
              <ul className="space-y-2 text-sm text-blue-800 dark:text-primary">
                {" "}
                {analytics.insights.map((insight, i) => (
                  <li key={i}>• {insight}</li>
                ))}{" "}
              </ul>{" "}
            </div>{" "}
            <div className="bg-gradient-to-br from-green-50 to-emerald-50 dark:from-slate-800 dark:to-slate-700 rounded-lg p-4 border border-green-200 dark:border-slate-600">
              {" "}
              <h3 className="font-semibold text-green-900 dark:text-green-100 mb-3">
                {" "}
                {t("module.pto-management.coverageStrategy")}{" "}
              </h3>{" "}
              <div className="space-y-2 text-sm text-green-800 dark:text-green-300">
                {" "}
                <p>
                  {" "}
                  <span className="font-semibold">
                    {t("module.pto-management.temporaryHires")}:
                  </span>
                  {""} {analytics.coveragePlan.temporaryHires}{" "}
                </p>{" "}
                <div>
                  {" "}
                  <p className="font-semibold">
                    {t("module.pto-management.crossTraining")}:
                  </p>{" "}
                  <ul className="ml-2 space-y-1">
                    {" "}
                    {analytics.coveragePlan.crossTraining.map((training, i) => (
                      <li key={i}>→ {training}</li>
                    ))}{" "}
                  </ul>{" "}
                </div>{" "}
              </div>{" "}
            </div>{" "}
          </div>{" "}
          <Button
            onClick={() => setAnalytics(null)}
            variant="outline"
            size="sm"
            className="w-full"
          >
            {" "}
            {t("module.pto-management.generateNewAnalysis")}{" "}
          </Button>{" "}
        </>
      )}{" "}
    </div>
  );
};
export default PTOManagement;
