/** * Echo Optimization Panel Component * Displays AI-driven optimization suggestions */ import React from "react";
import { Card, CardHeader, CardContent } from "@/components/ui/card";
import { AlertCircle, Lightbulb, TrendingDown, Users } from "lucide-react";
interface OptimizationResult {
  org_id: string;
  dept_id: string;
  issues: string[];
  recommendations: string[];
  generated_at: string;
}
interface EchoOptimizationPanelProps {
  org_id: string;
  dept_id: string;
  lang?: "en" | "fr" | "it" | "de" | "pt" | "es";
}
export const EchoOptimizationPanel: React.FC<EchoOptimizationPanelProps> = ({
  org_id,
  dept_id,
  lang = "en",
}) => {
  const [data, setData] = React.useState<OptimizationResult | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  React.useEffect(() => {
    fetchOptimizations();
  }, [org_id, dept_id, lang]);
  const fetchOptimizations = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/echo/optimize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ org_id, dept_id, lang }),
      });
      if (!res.ok) throw new Error("Failed to fetch optimizations");
      const result = await res.json();
      setData(result);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };
  if (loading) {
    return (
      <Card className="shadow-xl">
        {" "}
        <CardContent className="p-6">
          {" "}
          <div className="text-center text-muted-foreground">
            {" "}
            Echo is analyzing your schedule...{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (error) {
    return (
      <Card className="shadow-xl border-red-500/20">
        {" "}
        <CardContent className="p-6">
          {" "}
          <div className="flex items-center gap-2 text-red-400">
            {" "}
            <AlertCircle className="h-5 w-5" /> {error}{" "}
          </div>{" "}
        </CardContent>{" "}
      </Card>
    );
  }
  if (!data) return null;
  return (
    <Card className="shadow-2xl bg-gradient-to-br from-slate-900 to-slate-800 text-white border-cyan-500/20">
      {" "}
      <CardHeader className="bg-gradient-to-r from-cyan-600 to-blue-600">
        {" "}
        <div className="flex items-center gap-2">
          {" "}
          <Lightbulb className="h-5 w-5" />{" "}
          <h3 className="text-lg font-semibold">Echo AI Insights</h3>{" "}
        </div>{" "}
      </CardHeader>{" "}
      <CardContent className="space-y-6 pt-6">
        {" "}
        {/* Issues Section */}{" "}
        {data.issues && data.issues.length > 0 && (
          <div className="space-y-3">
            {" "}
            <h4 className="font-semibold text-cyan-300 flex items-center gap-2">
              {" "}
              <AlertCircle className="h-4 w-4" /> Current Issues{" "}
            </h4>{" "}
            <div className="space-y-2">
              {" "}
              {data.issues.map((issue, i) => (
                <div
                  key={i}
                  className="p-3 bg-red-900/20 border border-red-500/30 rounded text-red-200 text-sm"
                >
                  {" "}
                  {issue}{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Recommendations Section */}{" "}
        {data.recommendations && data.recommendations.length > 0 && (
          <div className="space-y-3 border-t border-border pt-6">
            {" "}
            <h4 className="font-semibold text-green-300 flex items-center gap-2">
              {" "}
              <TrendingDown className="h-4 w-4" /> Recommendations{" "}
            </h4>{" "}
            <div className="space-y-2">
              {" "}
              {data.recommendations.map((rec, i) => (
                <div
                  key={i}
                  className="p-3 bg-green-900/20 border border-green-500/30 rounded text-green-200 text-sm flex items-start gap-2"
                >
                  {" "}
                  <Users className="h-4 w-4 flex-shrink-0 mt-0.5" />{" "}
                  <span>{rec}</span>{" "}
                </div>
              ))}{" "}
            </div>{" "}
          </div>
        )}{" "}
        {/* Metadata */}{" "}
        <div className="border-t border-border pt-4 text-xs text-gray-400">
          {" "}
          <div>
            Generated: {new Date(data.generated_at).toLocaleString()}
          </div>{" "}
          <button
            onClick={fetchOptimizations}
            className="mt-2 text-cyan-400 hover:text-cyan-300 underline"
          >
            {" "}
            Refresh Analysis{" "}
          </button>{" "}
        </div>{" "}
      </CardContent>{" "}
    </Card>
  );
};
export default EchoOptimizationPanel;
