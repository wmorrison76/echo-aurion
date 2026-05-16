import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, CheckCircle2, AlertCircle, FileText, Zap, BarChart3 } from "lucide-react";
import { testingService, TestResult, CoverageAnalysis } from "@/services/testingService";
import { useToast } from "@/components/ui/use-toast";

interface TestingPanelProps {
  generatedCode: string;
  moduleName: string;
}

export default function TestingPanel({ generatedCode, moduleName }: TestingPanelProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("jest");
  const [jestTests, setJestTests] = useState<string>("");
  const [playwrightTests, setPlaywrightTests] = useState<string>("");
  const [a11yTests, setA11yTests] = useState<string>("");
  const [testResults, setTestResults] = useState<TestResult | null>(null);
  const [coverage, setCoverage] = useState<CoverageAnalysis | null>(null);
  const [recommendations, setRecommendations] = useState<any>(null);

  const handleGenerateJest = async () => {
    setLoading(true);
    try {
      const tests = await testingService.generateJestTests(generatedCode, moduleName);
      setJestTests(tests);
      toast({ title: "Success", description: "Jest tests generated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGeneratePlaywright = async () => {
    setLoading(true);
    try {
      const tests = await testingService.generatePlaywrightTests(
        generatedCode,
        moduleName,
        window.location.origin
      );
      setPlaywrightTests(tests);
      toast({ title: "Success", description: "Playwright tests generated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateA11y = async () => {
    setLoading(true);
    try {
      const tests = await testingService.generateA11yTests(generatedCode, moduleName);
      setA11yTests(tests);
      toast({ title: "Success", description: "A11y tests generated" });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleRunTests = async (testCode: string, language: string) => {
    setLoading(true);
    try {
      const results = await testingService.runTests(testCode, language, moduleName);
      setTestResults(results);

      // Analyze coverage
      const coverageAnalysis = await testingService.analyzeCoverage(generatedCode, testCode);
      setCoverage(coverageAnalysis);

      // Get recommendations
      const recs = await testingService.getRecommendations(generatedCode, coverageAnalysis);
      setRecommendations(recs);

      toast({ title: "Success", description: `${results.passed}/${results.totalTests} tests passed` });
    } catch (error: any) {
      toast({ title: "Error", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const getCoverageColor = (coverage: number) => {
    if (coverage >= 80) return "bg-green-100 text-green-800";
    if (coverage >= 60) return "bg-yellow-100 text-yellow-800";
    return "bg-red-100 text-red-800";
  };

  return (
    <Card className="border-orange-200">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <span>🧪</span> Advanced Testing
        </CardTitle>
        <CardDescription>
          Generate Jest, Playwright, and accessibility tests for {moduleName}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="jest">Jest</TabsTrigger>
            <TabsTrigger value="playwright">Playwright</TabsTrigger>
            <TabsTrigger value="a11y">A11y</TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          {/* Jest Tests */}
          <TabsContent value="jest" className="space-y-4">
            <Button onClick={handleGenerateJest} disabled={loading} className="w-full gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <FileText className="h-4 w-4" /> Generate Jest Unit Tests
            </Button>

            {jestTests && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{jestTests.substring(0, 2000)}</pre>
                </div>
                <Button
                  onClick={() => handleRunTests(jestTests, "jest")}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Run Tests
                </Button>
              </>
            )}
          </TabsContent>

          {/* Playwright Tests */}
          <TabsContent value="playwright" className="space-y-4">
            <Button onClick={handleGeneratePlaywright} disabled={loading} className="w-full gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <FileText className="h-4 w-4" /> Generate Playwright E2E Tests
            </Button>

            {playwrightTests && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{playwrightTests.substring(0, 2000)}</pre>
                </div>
                <Button
                  onClick={() => handleRunTests(playwrightTests, "playwright")}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Run Tests
                </Button>
              </>
            )}
          </TabsContent>

          {/* A11y Tests */}
          <TabsContent value="a11y" className="space-y-4">
            <Button onClick={handleGenerateA11y} disabled={loading} className="w-full gap-2">
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              <FileText className="h-4 w-4" /> Generate Accessibility Tests
            </Button>

            {a11yTests && (
              <>
                <div className="bg-gray-50 p-4 rounded-lg border max-h-96 overflow-y-auto">
                  <pre className="text-xs font-mono whitespace-pre-wrap">{a11yTests.substring(0, 2000)}</pre>
                </div>
                <Button
                  onClick={() => handleRunTests(a11yTests, "jest-a11y")}
                  disabled={loading}
                  variant="outline"
                  className="w-full"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                  Run Tests
                </Button>
              </>
            )}
          </TabsContent>

          {/* Results */}
          <TabsContent value="results" className="space-y-4">
            {testResults ? (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-3xl font-bold text-green-600">{testResults.passed}</div>
                      <p className="text-sm text-gray-600">Passed Tests</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="pt-6 text-center">
                      <div className="text-3xl font-bold text-orange-600">{testResults.failed}</div>
                      <p className="text-sm text-gray-600">Failed Tests</p>
                    </CardContent>
                  </Card>
                </div>

                {coverage && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base flex items-center gap-2">
                        <BarChart3 className="h-4 w-4" /> Coverage Report
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="space-y-2">
                        {Object.entries(coverage).map(([key, value]) => {
                          if (typeof value === "number" && key !== "statements") {
                            return (
                              <div key={key} className="flex items-center justify-between">
                                <span className="capitalize">{key}</span>
                                <Badge className={getCoverageColor(value as number)}>
                                  {value as number}%
                                </Badge>
                              </div>
                            );
                          }
                        })}
                      </div>
                    </CardContent>
                  </Card>
                )}

                {recommendations && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-base">Recommendations</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {recommendations.highPriority && recommendations.highPriority.length > 0 && (
                        <div>
                          <p className="font-semibold text-sm flex items-center gap-2">
                            <AlertCircle className="h-4 w-4 text-red-600" /> High Priority
                          </p>
                          <ul className="text-sm space-y-1 mt-2">
                            {recommendations.highPriority.map((rec: string, idx: number) => (
                              <li key={idx}>• {rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <p className="text-gray-500 text-center py-8">Generate and run tests to see results</p>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
