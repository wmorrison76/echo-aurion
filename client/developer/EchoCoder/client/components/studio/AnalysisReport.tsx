import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, AlertCircle, AlertTriangle, Info } from "lucide-react";

interface AnalysisReportProps {
  results: any;
  analysisType?: string;
  moduleName: string;
}

export default function AnalysisReport({ results, analysisType, moduleName }: AnalysisReportProps) {
  const getScoreColor = (score: number) => {
    if (score >= 85) return "bg-green-100 text-green-800 border-green-300";
    if (score >= 70) return "bg-yellow-100 text-yellow-800 border-yellow-300";
    return "bg-red-100 text-red-800 border-red-300";
  };

  const getScoreBadge = (score: number) => {
    if (score >= 85) return <CheckCircle2 className="h-4 w-4 text-green-600" />;
    if (score >= 70) return <AlertTriangle className="h-4 w-4 text-yellow-600" />;
    return <AlertCircle className="h-4 w-4 text-red-600" />;
  };

  // Pre-scan Analysis
  if (analysisType === "prescan" || results.compatibilityScore !== undefined) {
    return (
      <Card className="border-blue-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📋</span> LUCCCA Compatibility Scan
          </CardTitle>
          <CardDescription>Module: {moduleName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Card */}
          <div className={`p-4 rounded-lg border-2 ${getScoreColor(results.compatibilityScore)}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">LUCCCA Compatibility</span>
              <div className="flex items-center gap-2">
                {getScoreBadge(results.compatibilityScore)}
                <span className="text-2xl font-bold">{results.compatibilityScore}%</span>
              </div>
            </div>
          </div>

          {/* Integrated Modules */}
          {results.integratedModules && results.integratedModules.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Integrated Modules
              </h4>
              <div className="flex flex-wrap gap-2">
                {results.integratedModules.map((mod: string, idx: number) => (
                  <Badge key={idx} variant="outline" className="bg-green-50 text-green-700 border-green-300">
                    {mod}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Issues */}
          {results.compatibilityIssues && results.compatibilityIssues.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Compatibility Issues
              </h4>
              <ul className="space-y-1 text-sm">
                {results.compatibilityIssues.map((issue: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-red-700">
                    <span>•</span> {issue}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Suggestions */}
          {results.suggestions && results.suggestions.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Suggestions
              </h4>
              <ul className="space-y-1 text-sm">
                {results.suggestions.map((suggestion: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-blue-700">
                    <span>→</span> {suggestion}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Security Analysis
  if (analysisType === "security" || results.securityScore !== undefined) {
    return (
      <Card className="border-red-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🔒</span> Security Analysis
          </CardTitle>
          <CardDescription>Vulnerability detection for {moduleName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Score Card */}
          <div className={`p-4 rounded-lg border-2 ${getScoreColor(results.securityScore)}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Security Score</span>
              <div className="flex items-center gap-2">
                {getScoreBadge(results.securityScore)}
                <span className="text-2xl font-bold">{results.securityScore}%</span>
              </div>
            </div>
          </div>

          {/* Vulnerabilities */}
          {results.findings && results.findings.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <AlertCircle className="h-4 w-4 text-red-600" />
                Security Findings
              </h4>
              <ul className="space-y-2 text-sm">
                {results.findings.map((finding: string | object, idx: number) => {
                  const text = typeof finding === "string" ? finding : JSON.stringify(finding);
                  return (
                    <li key={idx} className="flex gap-2 text-red-700 bg-red-50 p-2 rounded">
                      <span className="flex-shrink-0">⚠️</span>
                      <span>{text}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {/* Recommendations */}
          {results.recommendations && results.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                Recommendations
              </h4>
              <ul className="space-y-1 text-sm">
                {results.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-green-700">
                    <span>✓</span> {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Intent Brief
  if (analysisType === "intent" || results.intentBrief !== undefined) {
    return (
      <Card className="border-purple-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>📝</span> Intent Brief
          </CardTitle>
          <CardDescription>Module purpose and functionality for {moduleName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.intentBrief && (
            <div className="prose prose-sm dark:prose-invert bg-purple-50 p-4 rounded-lg">
              <p className="whitespace-pre-wrap text-sm text-gray-800">{results.intentBrief}</p>
            </div>
          )}

          {results.documentation && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Generated Documentation</h4>
              <div className="bg-gray-50 p-3 rounded-lg text-sm max-h-48 overflow-y-auto">
                <pre className="whitespace-pre-wrap font-mono text-xs">{results.documentation}</pre>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Dry Run Results
  if (analysisType === "dryrun" || results.dryRunResults !== undefined) {
    return (
      <Card className="border-orange-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🧪</span> Dry Run Simulation Results
          </CardTitle>
          <CardDescription>Test execution for {moduleName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {results.performanceScore !== undefined && (
            <div className={`p-4 rounded-lg border-2 ${getScoreColor(results.performanceScore)}`}>
              <div className="flex items-center justify-between">
                <span className="font-semibold">Performance Score</span>
                <div className="flex items-center gap-2">
                  {getScoreBadge(results.performanceScore)}
                  <span className="text-2xl font-bold">{results.performanceScore}%</span>
                </div>
              </div>
            </div>
          )}

          {results.testResults && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Test Results</h4>
              <div className="space-y-2 text-sm">
                {Array.isArray(results.testResults) ? (
                  results.testResults.map((test: any, idx: number) => (
                    <div key={idx} className="bg-gray-50 p-2 rounded flex items-start gap-2">
                      {test.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600 mt-0.5 flex-shrink-0" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                      )}
                      <div>
                        <div className="font-medium">{test.name}</div>
                        {test.message && <div className="text-xs text-gray-600">{test.message}</div>}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-700">{results.testResults}</p>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Deploy Readiness
  if (analysisType === "deploy" || results.deployReady !== undefined) {
    return (
      <Card className="border-green-200">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <span>🚀</span> Deployment Readiness
          </CardTitle>
          <CardDescription>Production readiness assessment for {moduleName}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Deployment Status */}
          <div className={`p-4 rounded-lg border-2 ${results.deployReady ? "bg-green-100 text-green-800 border-green-300" : "bg-yellow-100 text-yellow-800 border-yellow-300"}`}>
            <div className="flex items-center justify-between">
              <span className="font-semibold">Deployment Status</span>
              <span className="text-2xl font-bold">
                {results.deployReady ? "✅ Ready" : "⚠️ Review Needed"}
              </span>
            </div>
          </div>

          {/* Checks */}
          {results.checks && (
            <div>
              <h4 className="font-semibold text-sm mb-2">Deployment Checks</h4>
              <div className="space-y-2 text-sm">
                {Array.isArray(results.checks) ? (
                  results.checks.map((check: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-2 bg-gray-50 p-2 rounded">
                      {check.passed ? (
                        <CheckCircle2 className="h-4 w-4 text-green-600" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-orange-600" />
                      )}
                      <span>{check.name || check}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-gray-700">{results.checks}</p>
                )}
              </div>
            </div>
          )}

          {/* Recommendations */}
          {results.recommendations && results.recommendations.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                <Info className="h-4 w-4 text-blue-600" />
                Recommendations
              </h4>
              <ul className="space-y-1 text-sm">
                {results.recommendations.map((rec: string, idx: number) => (
                  <li key={idx} className="flex gap-2 text-blue-700">
                    <span>→</span> {rec}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    );
  }

  // Fallback for unknown results
  return (
    <Card>
      <CardHeader>
        <CardTitle>Analysis Results</CardTitle>
      </CardHeader>
      <CardContent>
        <pre className="bg-gray-100 p-4 rounded-lg overflow-x-auto text-xs">
          {JSON.stringify(results, null, 2)}
        </pre>
      </CardContent>
    </Card>
  );
}
