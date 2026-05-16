import React, { useMemo } from "react";
import { AlertCircle, CheckCircle, AlertTriangle, Info, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  auditNutrition,
  getAuditScoreLabel,
  generateNutritionLabelText,
  type NutritionData,
} from "@/lib/nutrition-audit";

interface NutritionAuditPanelProps {
  nutrition: Partial<NutritionData>;
  servingSize?: string;
  servingsPerContainer?: number;
  recipeName?: string;
}

/**
 * Real-time nutrition audit panel for FDA label compliance
 * Shows audit score, warnings, errors, and recommendations
 */
export function NutritionAuditPanel({
  nutrition,
  servingSize,
  servingsPerContainer,
  recipeName,
}: NutritionAuditPanelProps) {
  const audit = useMemo(
    () => auditNutrition(nutrition, servingSize, servingsPerContainer),
    [nutrition, servingSize, servingsPerContainer]
  );

  const scoreLabel = getAuditScoreLabel(audit.score);

  // Check if nutrition data is empty
  const hasNutritionData = Object.values(nutrition).some((v) => v !== undefined && v !== null && v !== 0);

  if (!hasNutritionData) {
    return (
      <Card className="border-amber-200 bg-amber-50 dark:border-amber-900 dark:bg-amber-950/20">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Info className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-base">Nutrition Data Missing</CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-sm text-amber-700 dark:text-amber-300">
          Add nutritional information to enable audit and label generation.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={audit.isValid ? "border-green-200 bg-green-50 dark:border-green-900 dark:bg-green-950/20" : "border-red-200 bg-red-50 dark:border-red-900 dark:bg-red-950/20"}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {audit.isValid ? (
              <CheckCircle className="h-5 w-5 text-green-600" />
            ) : (
              <AlertCircle className="h-5 w-5 text-red-600" />
            )}
            <CardTitle className="text-base">Nutrition Audit</CardTitle>
          </div>
          <div className="flex items-center gap-2">
            <div className="text-right">
              <div className={`text-2xl font-bold ${scoreLabel.color}`}>
                {audit.score}
              </div>
              <div className="text-xs text-muted-foreground">{scoreLabel.label}</div>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Errors Section */}
        {audit.errors.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-red-700 dark:text-red-300 flex items-center gap-2">
              <AlertCircle className="h-4 w-4" />
              Issues ({audit.errors.length})
            </h4>
            <ul className="space-y-1">
              {audit.errors.map((error, idx) => (
                <li key={idx} className="text-xs text-red-700 dark:text-red-300 pl-6 relative">
                  <span className="absolute left-0">•</span>
                  {error.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Warnings Section */}
        {audit.warnings.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-yellow-700 dark:text-yellow-300 flex items-center gap-2">
              <AlertTriangle className="h-4 w-4" />
              Warnings ({audit.warnings.length})
            </h4>
            <ul className="space-y-1">
              {audit.warnings.map((warning, idx) => (
                <li key={idx} className="text-xs text-yellow-700 dark:text-yellow-300 pl-6 relative">
                  <span className="absolute left-0">•</span>
                  {warning.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Status */}
        <div className="flex items-center gap-2">
          {audit.isValid ? (
            <Badge className="bg-green-600 hover:bg-green-700">Ready for Labels</Badge>
          ) : (
            <Badge variant="destructive">Not Ready for Labels</Badge>
          )}
        </div>

        {/* Recommendations */}
        {audit.recommendations.length > 0 && (
          <>
            <Separator className="my-3" />
            <div className="space-y-2">
              <h4 className="text-sm font-semibold text-blue-700 dark:text-blue-300 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Recommendations
              </h4>
              <ul className="space-y-1">
                {audit.recommendations.map((rec, idx) => (
                  <li key={idx} className="text-xs text-blue-700 dark:text-blue-300 pl-6 relative">
                    <span className="absolute left-0">→</span>
                    {rec}
                  </li>
                ))}
              </ul>
            </div>
          </>
        )}

        {/* Label Preview */}
        {audit.isValid && (
          <>
            <Separator className="my-3" />
            <details className="text-xs">
              <summary className="cursor-pointer font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-slate-100">
                Preview Label Text
              </summary>
              <pre className="mt-2 overflow-x-auto bg-slate-100 dark:bg-slate-900 p-2 rounded text-[10px] text-slate-800 dark:text-slate-200 whitespace-pre-wrap break-words">
                {generateNutritionLabelText(nutrition as NutritionData)}
              </pre>
            </details>
          </>
        )}
      </CardContent>
    </Card>
  );
}
