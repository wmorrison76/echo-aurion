import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle, CheckCircle2 } from "lucide-react";
import { automationService } from "@/services/automationService";
import AnalysisReport from "./AnalysisReport";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface AutomationPanelProps {
  generatedCode: string;
  moduleName: string;
}

export default function AutomationPanel({ generatedCode, moduleName }: AutomationPanelProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [activeAnalysis, setActiveAnalysis] = useState<string | null>(null);

  const handleAnalysis = async (analysisType: string, fn: () => Promise<any>) => {
    setLoading(true);
    setError(null);
    setActiveAnalysis(analysisType);
    
    try {
      const result = await fn();
      setResults(result);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Analysis failed";
      setError(message);
      setResults(null);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-4 mt-6">
      <Card className="border-blue-200 bg-gradient-to-br from-blue-50 to-transparent">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <span className="text-lg">🤖</span> Automation Analysis
              </CardTitle>
              <CardDescription>
                Run AI-powered analysis on your generated module: <strong>{moduleName}</strong>
              </CardDescription>
            </div>
            {loading && <Loader2 className="h-5 w-5 animate-spin text-blue-500" />}
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Action Buttons */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button
              onClick={() => handleAnalysis("prescan", () => automationService.prescanModules(generatedCode, moduleName))}
              disabled={loading}
              variant={activeAnalysis === "prescan" ? "default" : "outline"}
              className="justify-start gap-2"
            >
              <span>📋</span> Pre-scan
            </Button>

            <Button
              onClick={() => handleAnalysis("security", () => automationService.securitySweep(generatedCode, moduleName))}
              disabled={loading}
              variant={activeAnalysis === "security" ? "default" : "outline"}
              className="justify-start gap-2"
            >
              <span>🔒</span> Security Sweep
            </Button>

            <Button
              onClick={() => handleAnalysis("intent", () => automationService.generateIntentBrief(generatedCode, moduleName))}
              disabled={loading}
              variant={activeAnalysis === "intent" ? "default" : "outline"}
              className="justify-start gap-2"
            >
              <span>📝</span> Generate Intent
            </Button>

            <Button
              onClick={() => handleAnalysis("dryrun", () => automationService.dryRunSimulation(generatedCode, moduleName))}
              disabled={loading}
              variant={activeAnalysis === "dryrun" ? "default" : "outline"}
              className="justify-start gap-2"
            >
              <span>🧪</span> Dry Run
            </Button>

            <Button
              onClick={() => handleAnalysis("deploy", () => automationService.deployToNetlify(generatedCode, moduleName))}
              disabled={loading}
              variant={activeAnalysis === "deploy" ? "default" : "outline"}
              className="justify-start gap-2 sm:col-span-2"
            >
              <span>🚀</span> Deploy Readiness
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center gap-2 text-sm text-blue-600 bg-blue-50 p-3 rounded-md">
              <Loader2 className="h-4 w-4 animate-spin" />
              Running {activeAnalysis} analysis...
            </div>
          )}

          {/* Error State */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Results */}
          {results && !loading && (
            <div className="space-y-4">
              <AnalysisReport 
                results={results} 
                analysisType={activeAnalysis}
                moduleName={moduleName}
              />
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
