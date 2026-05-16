import React, { useMemo } from "react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  TrendingUp,
  Code2,
  GitBranch,
  Zap,
} from "lucide-react";
import { GeneratedFile } from "@/services/CodeGenerationEngine";
import { codeFileAnalyzer } from "@/services/CodeFileAnalyzer";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";

interface CodeQualityDashboardProps {
  files: GeneratedFile[];
}

export const CodeQualityDashboard: React.FC<CodeQualityDashboardProps> = ({ files }) => {
  const analysis = useMemo(() => {
    const metrics = files.map((file) => codeFileAnalyzer.analyzeFile(file));
    const qualityScore = codeFileAnalyzer.calculateQualityScore(files);
    const allIssues = files.flatMap((file) => codeFileAnalyzer.detectIssues(file));

    return { metrics, qualityScore, allIssues };
  }, [files]);

  const getSeverityColor = (severity: "error" | "warning" | "info") => {
    switch (severity) {
      case "error":
        return "text-red-400";
      case "warning":
        return "text-yellow-400";
      case "info":
        return "text-blue-400";
    }
  };

  const getSeverityBgColor = (severity: "error" | "warning" | "info") => {
    switch (severity) {
      case "error":
        return "bg-red-900/20 border-red-700";
      case "warning":
        return "bg-yellow-900/20 border-yellow-700";
      case "info":
        return "bg-blue-900/20 border-blue-700";
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-400";
    if (score >= 60) return "text-yellow-400";
    if (score >= 40) return "text-orange-400";
    return "text-red-400";
  };

  return (
    <div className="w-full h-full flex flex-col bg-gradient-to-br from-slate-900 to-slate-800">
      {/* Header */}
      <div className="border-b border-slate-700 p-4">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-6 h-6 text-blue-400" />
            Code Quality Analysis
          </h2>
        </div>
        <p className="text-sm text-slate-400">
          {files.length} files analyzed • {analysis.allIssues.length} issues found
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">
        <Tabs defaultValue="overview" className="w-full h-full flex flex-col">
          <TabsList className="w-full justify-start border-b border-slate-700 bg-slate-900 rounded-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="issues">Issues</TabsTrigger>
            <TabsTrigger value="metrics">Metrics</TabsTrigger>
            <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="flex-1 overflow-auto">
            <div className="p-6 space-y-6">
              {/* Score Cards */}
              <div className="grid grid-cols-2 gap-4">
                <Card className="p-6 bg-slate-800 border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">Overall Score</h3>
                    <TrendingUp className={`w-5 h-5 ${getScoreColor(analysis.qualityScore.overallScore)}`} />
                  </div>
                  <p className={`text-3xl font-bold ${getScoreColor(analysis.qualityScore.overallScore)}`}>
                    {analysis.qualityScore.overallScore}
                  </p>
                  <div className="mt-3">
                    <Progress
                      value={analysis.qualityScore.overallScore}
                      className="h-2 bg-slate-700"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {analysis.qualityScore.overallScore >= 80
                      ? "Excellent code quality"
                      : analysis.qualityScore.overallScore >= 60
                        ? "Good quality - room for improvement"
                        : "Needs attention"}
                  </p>
                </Card>

                <Card className="p-6 bg-slate-800 border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">Health Score</h3>
                    <CheckCircle className={`w-5 h-5 ${getScoreColor(analysis.qualityScore.codeHealthScore)}`} />
                  </div>
                  <p className={`text-3xl font-bold ${getScoreColor(analysis.qualityScore.codeHealthScore)}`}>
                    {analysis.qualityScore.codeHealthScore}
                  </p>
                  <div className="mt-3">
                    <Progress
                      value={analysis.qualityScore.codeHealthScore}
                      className="h-2 bg-slate-700"
                    />
                  </div>
                  <p className="text-xs text-slate-400 mt-2">
                    {analysis.allIssues.length} issues detected
                  </p>
                </Card>

                <Card className="p-6 bg-slate-800 border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">Maintainability</h3>
                    <Code2 className={`w-5 h-5 ${getScoreColor(analysis.qualityScore.maintainabilityScore)}`} />
                  </div>
                  <p className={`text-3xl font-bold ${getScoreColor(analysis.qualityScore.maintainabilityScore)}`}>
                    {analysis.qualityScore.maintainabilityScore}
                  </p>
                  <div className="mt-3">
                    <Progress
                      value={analysis.qualityScore.maintainabilityScore}
                      className="h-2 bg-slate-700"
                    />
                  </div>
                </Card>

                <Card className="p-6 bg-slate-800 border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">Test Coverage</h3>
                    <Zap className={`w-5 h-5 ${getScoreColor(analysis.qualityScore.testCoverageScore)}`} />
                  </div>
                  <p className={`text-3xl font-bold ${getScoreColor(analysis.qualityScore.testCoverageScore)}`}>
                    {analysis.qualityScore.testCoverageScore}%
                  </p>
                  <div className="mt-3">
                    <Progress
                      value={analysis.qualityScore.testCoverageScore}
                      className="h-2 bg-slate-700"
                    />
                  </div>
                </Card>
              </div>

              {/* Recommendations */}
              <div className="space-y-3">
                <h3 className="text-lg font-semibold text-white">Recommendations</h3>
                <div className="space-y-2">
                  {analysis.qualityScore.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      className="p-3 bg-blue-900/20 border border-blue-700 rounded-lg flex gap-2"
                    >
                      <AlertTriangle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                      <p className="text-sm text-slate-300">{rec}</p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="issues" className="flex-1 overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-3">
                {analysis.allIssues.length > 0 ? (
                  analysis.allIssues.map((issue, idx) => (
                    <div
                      key={idx}
                      className={`p-4 rounded-lg border ${getSeverityBgColor(issue.severity)}`}
                    >
                      <div className="flex items-start gap-3">
                        <AlertCircle className={`w-5 h-5 ${getSeverityColor(issue.severity)} flex-shrink-0 mt-0.5`} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-sm font-semibold text-white">{issue.message}</p>
                            <Badge
                              variant="outline"
                              className={`text-xs capitalize ${getSeverityColor(issue.severity)}`}
                            >
                              {issue.severity}
                            </Badge>
                          </div>
                          {issue.lineNumber && (
                            <p className="text-xs text-slate-400">Line {issue.lineNumber}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="flex items-center justify-center h-full text-slate-400">
                    <div className="text-center">
                      <CheckCircle className="w-12 h-12 mx-auto mb-2 text-green-400" />
                      <p>No issues detected!</p>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="metrics" className="flex-1 overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-6">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-700">
                      <th className="text-left text-slate-300 font-semibold p-2">File</th>
                      <th className="text-right text-slate-300 font-semibold p-2">LOC</th>
                      <th className="text-right text-slate-300 font-semibold p-2">Complexity</th>
                      <th className="text-right text-slate-300 font-semibold p-2">Maintainability</th>
                    </tr>
                  </thead>
                  <tbody>
                    {analysis.metrics.map((metric) => (
                      <tr key={metric.path} className="border-b border-slate-700 hover:bg-slate-700/30">
                        <td className="text-left text-slate-300 p-2 truncate text-xs">
                          {metric.path.split("/").pop()}
                        </td>
                        <td className="text-right text-slate-400 p-2 text-xs">{metric.linesOfCode}</td>
                        <td className="text-right text-slate-400 p-2 text-xs">
                          {metric.cyclomaticComplexity}
                        </td>
                        <td className="text-right p-2">
                          <span
                            className={`text-xs ${getScoreColor(metric.maintainabilityIndex)}`}
                          >
                            {metric.maintainabilityIndex}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="dependencies" className="flex-1 overflow-auto">
            <ScrollArea className="h-full">
              <div className="p-6 space-y-6">
                {files.map((file) => {
                  const metric = analysis.metrics.find((m) => m.path === file.path);
                  if (!metric || metric.dependencies.length === 0) return null;

                  return (
                    <div key={file.path}>
                      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
                        <GitBranch className="w-4 h-4" />
                        {file.path.split("/").pop()}
                      </h3>
                      <div className="space-y-2 ml-4">
                        {metric.dependencies.map((dep, idx) => (
                          <div key={idx} className="text-xs text-slate-400 p-2 bg-slate-800/50 rounded">
                            <p className="font-mono">{dep.importPath}</p>
                            <p className="text-xs text-slate-500 mt-1">
                              {dep.type} • Line {dep.lineNumber}
                            </p>
                          </div>
                        ))}
                      </div>
                      {metric.externalDependencies.length > 0 && (
                        <div className="mt-3 ml-4">
                          <p className="text-xs font-semibold text-slate-400 mb-2">External:</p>
                          <div className="space-y-1">
                            {metric.externalDependencies.map((dep, idx) => (
                              <div key={idx} className="text-xs text-slate-500 p-1 bg-slate-800/30 rounded">
                                {dep}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};
