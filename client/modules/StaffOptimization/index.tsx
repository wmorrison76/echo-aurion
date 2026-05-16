import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/glass";
import { Users, Loader, BarChart3 } from "lucide-react";
import { useI18n } from "@/i18n";
import { ModuleChatButton } from "@/components/echo-ai3/ModuleChatButton";
interface StaffOptimization {
  recommendedStaffCount: number;
  currentStaffCount: number;
  breakdown: {
    position: string;
    currentCount: number;
    recommendedCount: number;
    rationale: string;
  }[];
  risks: string[];
  recommendations: string[];
  estimatedSavings: number;
}
export const StaffOptimization: React.FC = () => {
  const { t } = useI18n();
  const [optimization, setOptimization] = useState<StaffOptimization | null>(
    null,
  );
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const optimizeStaffing = async () => {
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/staffing/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysisType: "comprehensive" }),
      });
      if (response.ok) {
        const data = await response.json();
        setOptimization(data);
      }
    } catch (error) {
      console.error("Staffing optimization error:", error);
    } finally {
      setIsAnalyzing(false);
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
            <Users className="w-8 h-8 text-primary dark:text-blue-400" />{" "}
            <div>
              {" "}
              <h1 className="text-3xl font-bold text-foreground dark:text-white">
                {" "}
                {t("module.staff-optimization.title")}{" "}
              </h1>{" "}
              <p className="text-muted-foreground">
                {" "}
                {t("module.staff-optimization.description")}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          <ModuleChatButton
            moduleId="staff-optimization"
            moduleName={t("module.staff-optimization.title")}
          />{" "}
        </div>{" "}
      </div>{" "}
      {!optimization ? (
        <div className="flex flex-col items-center justify-center flex-1">
          {" "}
          <Users className="w-16 h-16 text-primary dark:text-blue-400 mx-auto mb-4 opacity-50" />{" "}
          <h2 className="text-2xl font-bold text-foreground dark:text-white mb-6">
            {" "}
            {t("module.staff-optimization.analyzeTitle")}{" "}
          </h2>{" "}
          <Button
            onClick={optimizeStaffing}
            disabled={isAnalyzing}
            size="lg"
            className="gap-2 bg-primary hover:opacity-90"
          >
            {" "}
            {isAnalyzing ? (
              <>
                {" "}
                <Loader className="w-4 h-4 animate-spin" />{" "}
                {t("module.staff-optimization.analyzing")}{" "}
              </>
            ) : (
              <>
                {" "}
                <BarChart3 className="w-4 h-4" />{" "}
                {t("module.staff-optimization.runAnalysis")}{" "}
              </>
            )}{" "}
          </Button>{" "}
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto space-y-6">
          {" "}
          {/* Summary */}{" "}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-border p-4">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                {" "}
                {t("module.staff-optimization.currentStaff")}{" "}
              </p>{" "}
              <p className="text-3xl font-bold text-foreground dark:text-white">
                {" "}
                {optimization.currentStaffCount}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-border p-4">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                {" "}
                {t("module.staff-optimization.recommended")}{" "}
              </p>{" "}
              <p className="text-3xl font-bold text-primary dark:text-blue-400">
                {" "}
                {optimization.recommendedStaffCount}{" "}
              </p>{" "}
            </div>{" "}
            <div className="bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-border p-4">
              {" "}
              <p className="text-xs font-semibold uppercase text-muted-foreground mb-2">
                {" "}
                {t("module.staff-optimization.estSavings")}{" "}
              </p>{" "}
              <p className="text-3xl font-bold text-green-600 dark:text-green-400">
                {" "}
                ${optimization.estimatedSavings.toFixed(0)}{" "}
              </p>{" "}
            </div>{" "}
          </div>{" "}
          {/* Breakdown */}{" "}
          <div className="bg-background dark:bg-slate-800 rounded-lg border border-slate-200 dark:border-border p-4">
            {" "}
            <h3 className="font-semibold text-foreground dark:text-white mb-4">
              {" "}
              {t("module.staff-optimization.positionBreakdown")}{" "}
            </h3>{" "}
            <div className="space-y-3">
              {" "}
              {optimization.breakdown.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2 bg-slate-50 dark:bg-surface rounded"
                >
                  {" "}
                  <div>
                    {" "}
                    <p className="font-medium text-foreground dark:text-white">
                      {" "}
                      {item.position}{" "}
                    </p>{" "}
                    <p className="text-xs text-muted-foreground">
                      {" "}
                      {item.rationale}{" "}
                    </p>{" "}
                  </div>{" "}
                  <div className="text-right">
                    {" "}
                    <p className="text-sm font-semibold text-muted-foreground">
                      {" "}
                      {item.currentCount} → {item.recommendedCount}{" "}
                    </p>{" "}
                  </div>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>{" "}
          {/* Risks */}{" "}
          {optimization.risks.length > 0 && (
            <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-lg p-4">
              {" "}
              <h3 className="font-semibold text-red-700 dark:text-red-400 mb-2">
                {" "}
                ⚠️ {t("module.staff-optimization.risks")}{" "}
              </h3>{" "}
              <ul className="space-y-1 text-sm text-red-700 dark:text-red-300">
                {" "}
                {optimization.risks.map((risk, i) => (
                  <li key={i}>• {risk}</li>
                ))}{" "}
              </ul>{" "}
            </div>
          )}{" "}
          {/* Recommendations */}{" "}
          {optimization.recommendations.length > 0 && (
            <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              {" "}
              <h3 className="font-semibold text-blue-700 dark:text-blue-400 mb-2">
                {" "}
                ✓ {t("module.staff-optimization.recommendations")}{" "}
              </h3>{" "}
              <ul className="space-y-1 text-sm text-blue-700 dark:text-primary">
                {" "}
                {optimization.recommendations.map((rec, i) => (
                  <li key={i}>• {rec}</li>
                ))}{" "}
              </ul>{" "}
            </div>
          )}{" "}
          <Button
            onClick={() => setOptimization(null)}
            variant="outline"
            size="sm"
          >
            {" "}
            {t("module.staff-optimization.runNewAnalysis")}{" "}
          </Button>{" "}
        </div>
      )}{" "}
    </div>
  );
};
export default StaffOptimization;
