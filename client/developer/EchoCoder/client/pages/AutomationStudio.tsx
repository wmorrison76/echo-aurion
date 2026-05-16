import { useState } from "react";
import AutomationPanel from "@/components/studio/AutomationPanel";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  ResponsiveContainer,
  ResponsiveGrid,
  useBreakpoint,
} from "@/components/layout";
import {
  Zap,
  Play,
  AlertCircle,
  CheckCircle2,
  Clock,
  Bug,
  FileText,
  Copy,
} from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface AnalysisResult {
  quality: number;
  performance: number;
  security: number;
  accessibility: number;
  issues: string[];
}

export default function AutomationStudio() {
  const [code, setCode] = useState(`import React, { useState } from 'react';

export default function RecipeCard() {
  const [liked, setLiked] = useState(false);

  return (
    <div className="max-w-sm rounded-lg shadow-lg overflow-hidden bg-white">
      <img 
        src="https://via.placeholder.com/300" 
        alt="Recipe" 
        className="w-full h-48 object-cover"
      />
      <div className="p-4">
        <h2 className="text-2xl font-bold text-gray-900 mb-2">
          Delicious Recipe
        </h2>
        <p className="text-gray-600 mb-4">
          A mouthwatering dish prepared with fresh ingredients.
        </p>
        <button
          className="px-4 py-2 rounded-lg font-semibold bg-red-500 text-white hover:bg-red-600 transition"
        >
          Explore Recipe
        </button>
      </div>
    </div>
  );
}`);

  const [moduleName, setModuleName] = useState("RecipeCard");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [activeTab, setActiveTab] = useState("code");
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const breakpoint = useBreakpoint();
  const isMobile = breakpoint === "xs" || breakpoint === "sm";

  const automationTasks = [
    {
      id: "syntax",
      label: "Syntax Check",
      description: "Validate TypeScript/JSX syntax",
      icon: FileText,
    },
    {
      id: "performance",
      label: "Performance",
      description: "Analyze render performance",
      icon: Zap,
    },
    {
      id: "security",
      label: "Security",
      description: "Check security vulnerabilities",
      icon: AlertCircle,
    },
    {
      id: "accessibility",
      label: "Accessibility",
      description: "Verify WCAG compliance",
      icon: CheckCircle2,
    },
  ];

  const handleAnalyze = async () => {
    if (!code.trim()) {
      toast({
        title: "Error",
        description: "Please provide code to analyze",
        variant: "destructive",
      });
      return;
    }

    setIsAnalyzing(true);
    try {
      // Simulate analysis
      await new Promise((resolve) => setTimeout(resolve, 2000));

      const mockResult: AnalysisResult = {
        quality: Math.floor(Math.random() * 30) + 70,
        performance: Math.floor(Math.random() * 25) + 75,
        security: Math.floor(Math.random() * 20) + 80,
        accessibility: Math.floor(Math.random() * 35) + 65,
        issues: [
          "Missing error boundary in parent component",
          "No loading state for async operations",
          "Accessibility: Button needs aria-label",
        ],
      };

      setAnalysisResult(mockResult);
      toast({
        title: "Analysis Complete",
        description: "Code analysis finished successfully",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code);
    toast({
      title: "Success",
      description: "Code copied to clipboard",
    });
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <ResponsiveContainer className="py-6 sm:py-8">
      <div className="space-y-6 sm:space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
              <Zap className="h-6 w-6 sm:h-8 sm:w-8" />
              <span>Automation Studio</span>
            </h1>
            <p className="text-xs sm:text-base text-muted-foreground mt-2">
              Run automated analysis and testing on your LUCCCA modules
            </p>
          </div>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left: Code & Analysis */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Code Editor Tabs */}
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <CardTitle className="text-base sm:text-lg">Module Code</CardTitle>
                    <CardDescription className="text-xs sm:text-sm mt-1">
                      Provide your React component for analysis
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyCode}
                    className="h-8 text-xs"
                  >
                    <Copy className="h-3 w-3 sm:h-4 sm:w-4" />
                    <span className="hidden sm:inline ml-1">Copy</span>
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Module Name */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">
                    Module Name
                  </label>
                  <Input
                    value={moduleName}
                    onChange={(e) => setModuleName(e.target.value)}
                    placeholder="e.g., RecipeCard, EventScheduler"
                    className="text-xs sm:text-sm"
                    aria-label="Module name"
                  />
                </div>

                {/* Code Editor */}
                <div>
                  <label className="block text-xs sm:text-sm font-medium mb-2">
                    Code
                  </label>
                  <Textarea
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="Paste your React code here..."
                    className="h-48 sm:h-64 font-mono text-xs sm:text-sm resize-none"
                    aria-label="Code editor"
                  />
                </div>

                {/* Code Stats */}
                <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                  <div>
                    <p className="text-xs text-muted-foreground">Lines</p>
                    <p className="text-sm sm:text-base font-semibold">
                      {code.split("\n").length}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Size</p>
                    <p className="text-sm sm:text-base font-semibold">
                      {(code.length / 1024).toFixed(1)}KB
                    </p>
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Language</p>
                    <p className="text-sm sm:text-base font-semibold">TypeScript</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Results */}
            {analysisResult && (
              <Card>
                <CardHeader className="pb-3">
                  <CardTitle className="text-base sm:text-lg">Analysis Results</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Score Grid */}
                  <ResponsiveGrid 
                    cols={{ xs: 2, sm: 2, md: 4, lg: 4 }} 
                    gap="md"
                  >
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Quality</p>
                      <p className={`text-lg sm:text-2xl font-bold ${getScoreColor(analysisResult.quality)}`}>
                        {analysisResult.quality}%
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Performance</p>
                      <p className={`text-lg sm:text-2xl font-bold ${getScoreColor(analysisResult.performance)}`}>
                        {analysisResult.performance}%
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Security</p>
                      <p className={`text-lg sm:text-2xl font-bold ${getScoreColor(analysisResult.security)}`}>
                        {analysisResult.security}%
                      </p>
                    </div>
                    <div className="text-center p-3 border rounded-lg">
                      <p className="text-xs text-muted-foreground mb-1">Accessibility</p>
                      <p className={`text-lg sm:text-2xl font-bold ${getScoreColor(analysisResult.accessibility)}`}>
                        {analysisResult.accessibility}%
                      </p>
                    </div>
                  </ResponsiveGrid>

                  {/* Issues */}
                  {analysisResult.issues.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold flex items-center gap-2">
                        <AlertCircle className="h-4 w-4 text-yellow-600" />
                        Found {analysisResult.issues.length} Issue{analysisResult.issues.length !== 1 ? "s" : ""}
                      </h4>
                      <div className="space-y-2">
                        {analysisResult.issues.map((issue, idx) => (
                          <div
                            key={idx}
                            className="p-2 sm:p-3 bg-yellow-50/50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded text-xs sm:text-sm"
                          >
                            {issue}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* Right: Analysis Controls & Tasks */}
          <div className="space-y-4 sm:space-y-6">
            {/* Analyze Button */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Analysis Tools</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  onClick={handleAnalyze}
                  disabled={isAnalyzing || !code.trim()}
                  className="w-full text-xs sm:text-sm"
                  size={isMobile ? "sm" : "default"}
                >
                  <Play className="h-4 w-4 mr-2" />
                  {isAnalyzing ? "Analyzing..." : "Run Analysis"}
                </Button>

                <div className="text-xs space-y-2 pt-2 border-t">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Clock className="h-3 w-3" />
                    <span>Analysis time: ~2s</span>
                  </div>
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <Bug className="h-3 w-3" />
                    <span>Issue detection enabled</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Analysis Tasks */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg">Analysis Tasks</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {automationTasks.map((task) => {
                    const Icon = task.icon;
                    const isCompleted = analysisResult !== null;
                    return (
                      <div
                        key={task.id}
                        className="p-3 border rounded-lg hover:border-primary/50 transition cursor-pointer"
                      >
                        <div className="flex items-start gap-3">
                          <Icon className={`h-4 w-4 mt-0.5 flex-shrink-0 ${
                            isCompleted ? "text-green-600" : "text-muted-foreground"
                          }`} />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs sm:text-sm font-medium">{task.label}</p>
                            <p className="text-xs text-muted-foreground">{task.description}</p>
                          </div>
                          {isCompleted && (
                            <CheckCircle2 className="h-4 w-4 text-green-600 flex-shrink-0" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Recommendations */}
            <Card className="bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
              <CardHeader className="pb-3">
                <CardTitle className="text-base sm:text-lg text-blue-900 dark:text-blue-100">
                  Tips & Recommendations
                </CardTitle>
              </CardHeader>
              <CardContent className="text-xs space-y-2 text-blue-800 dark:text-blue-200">
                <p>• Use error boundaries for fault tolerance</p>
                <p>• Add loading and error states</p>
                <p>• Include accessibility attributes</p>
                <p>• Optimize render performance</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </ResponsiveContainer>
  );
}
