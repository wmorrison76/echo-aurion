import { useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  CheckCircle2,
  AlertCircle,
  Code,
  Play,
  Plus,
  Trash2,
  Settings,
  BarChart3,
  Loader2,
} from "lucide-react";
import { getTestingService } from "@/services/testingService";
import { getAnalyticsService } from "@/services/analyticsService";

export default function TestingStudio() {
  const testingService = getTestingService();
  const analytics = getAnalyticsService();

  const [suites, setSuites] = useState<any[]>([]);
  const [selectedSuite, setSelectedSuite] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [testType, setTestType] = useState<"unit" | "integration" | "e2e">(
    "unit",
  );
  const [fileName, setFileName] = useState("");
  const [fileCode, setFileCode] = useState("");
  const [testResults, setTestResults] = useState<any[]>([]);
  const [showResults, setShowResults] = useState(false);

  const handleGenerateTests = async () => {
    if (!fileName || !fileCode) {
      alert("Please provide file name and code");
      return;
    }

    setLoading(true);
    try {
      const suite = await testingService.generateTests({
        file: fileName,
        code: fileCode,
        testType,
        framework: "vitest",
        coverage: true,
      });

      setSuites((prev) => [...prev, suite]);
      setSelectedSuite(suite);
      setFileName("");
      setFileCode("");

      analytics.trackModuleEvent({
        module_name: "TestingStudio",
        action: "generate_tests",
        status: "success",
      });
    } catch (error) {
      console.error("Failed to generate tests:", error);
      analytics.trackModuleEvent({
        module_name: "TestingStudio",
        action: "generate_tests",
        status: "error",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRunTests = async () => {
    if (!selectedSuite) return;

    setLoading(true);
    try {
      const results = await testingService.runTests(selectedSuite.id);
      setTestResults(results);
      setShowResults(true);

      analytics.trackModuleEvent({
        module_name: "TestingStudio",
        action: "run_tests",
        status: "success",
      });
    } catch (error) {
      console.error("Failed to run tests:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteSuite = (suiteId: string) => {
    testingService.deleteSuite(suiteId);
    setSuites((prev) => prev.filter((s) => s.id !== suiteId));
    if (selectedSuite?.id === suiteId) {
      setSelectedSuite(null);
    }
  };

  const passedTests = testResults.filter((t) => t.status === "pass").length;
  const failedTests = testResults.filter((t) => t.status === "fail").length;
  const passRate =
    testResults.length > 0
      ? ((passedTests / testResults.length) * 100).toFixed(1)
      : 0;

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">Testing Studio</h1>
          <p className="text-muted-foreground">
            Generate, run, and manage unit, integration, and E2E tests
          </p>
        </div>

        <Tabs defaultValue="generate" className="space-y-6">
          <TabsList>
            <TabsTrigger value="generate">Generate Tests</TabsTrigger>
            <TabsTrigger value="suites">
              Test Suites ({suites.length})
            </TabsTrigger>
            <TabsTrigger value="results">Results</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Generate Tests</CardTitle>
                <CardDescription>
                  Paste your code and let AI generate comprehensive tests
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium">File Name</label>
                    <Input
                      placeholder="e.g., utils.ts"
                      value={fileName}
                      onChange={(e) => setFileName(e.target.value)}
                      className="mt-2"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Test Type</label>
                    <Select
                      value={testType}
                      onValueChange={(value: any) => setTestType(value)}
                    >
                      <SelectTrigger className="mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="unit">Unit Tests</SelectItem>
                        <SelectItem value="integration">
                          Integration Tests
                        </SelectItem>
                        <SelectItem value="e2e">E2E Tests</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Code to Test</label>
                  <Textarea
                    placeholder="Paste your code here..."
                    value={fileCode}
                    onChange={(e) => setFileCode(e.target.value)}
                    className="mt-2 font-mono text-xs min-h-64"
                  />
                </div>

                <Button
                  onClick={handleGenerateTests}
                  disabled={loading || !fileName || !fileCode}
                  className="w-full"
                >
                  {loading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Code className="w-4 h-4 mr-2" />
                      Generate Tests
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="suites" className="space-y-6">
            <div className="grid gap-4">
              {suites.length === 0 ? (
                <Card className="p-8 text-center">
                  <Code className="w-12 h-12 mx-auto mb-4 opacity-50" />
                  <p className="text-muted-foreground">
                    No test suites yet. Generate some tests to get started!
                  </p>
                </Card>
              ) : (
                suites.map((suite) => (
                  <Card
                    key={suite.id}
                    className={`cursor-pointer transition-all ${
                      selectedSuite?.id === suite.id
                        ? "ring-2 ring-primary"
                        : ""
                    }`}
                    onClick={() => setSelectedSuite(suite)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="text-base">
                            {suite.name}
                          </CardTitle>
                          <CardDescription className="text-xs">
                            {suite.file}
                          </CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="secondary">{suite.type}</Badge>
                          <Badge>{suite.coverage}% coverage</Badge>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteSuite(suite.id);
                            }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    {suite.lastRun && (
                      <CardContent className="text-xs text-muted-foreground">
                        Last run: {suite.lastRun.passed} passed,{" "}
                        {suite.lastRun.failed} failed in{" "}
                        {suite.lastRun.duration}ms
                      </CardContent>
                    )}
                  </Card>
                ))
              )}
            </div>

            {selectedSuite && (
              <Card className="mt-6">
                <CardHeader>
                  <CardTitle className="text-lg">
                    {selectedSuite.name} - Test Cases
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {selectedSuite.tests.map((test: any) => (
                    <div
                      key={test.id}
                      className="flex items-center gap-3 p-3 border rounded-lg"
                    >
                      {test.status === "passing" ? (
                        <CheckCircle2 className="w-4 h-4 text-green-500" />
                      ) : test.status === "failing" ? (
                        <AlertCircle className="w-4 h-4 text-red-500" />
                      ) : (
                        <div className="w-4 h-4 rounded-full border border-muted-foreground" />
                      )}
                      <div className="flex-1">
                        <p className="text-sm font-medium">{test.name}</p>
                        {test.error && (
                          <p className="text-xs text-red-500 mt-1">
                            {test.error}
                          </p>
                        )}
                      </div>
                      {test.duration && (
                        <Badge variant="outline" className="text-xs">
                          {test.duration}ms
                        </Badge>
                      )}
                    </div>
                  ))}

                  <Button
                    onClick={handleRunTests}
                    disabled={loading}
                    className="w-full mt-4"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Running...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Run Tests
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="results" className="space-y-6">
            {showResults && testResults.length > 0 ? (
              <>
                <div className="grid grid-cols-4 gap-4">
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-green-500">
                      {passedTests}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Passed</p>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-red-500">
                      {failedTests}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">Failed</p>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-blue-500">
                      {passRate}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Pass Rate
                    </p>
                  </Card>
                  <Card className="p-4">
                    <div className="text-2xl font-bold text-purple-500">
                      {selectedSuite?.coverage}%
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">
                      Coverage
                    </p>
                  </Card>
                </div>

                <Card>
                  <CardHeader>
                    <CardTitle className="text-base flex items-center gap-2">
                      <BarChart3 className="w-4 h-4" />
                      Test Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 max-h-96 overflow-y-auto">
                    {testResults.map((result) => (
                      <div
                        key={result.testId}
                        className="border rounded-lg p-3"
                      >
                        <div className="flex items-center gap-2 mb-2">
                          {result.status === "pass" ? (
                            <CheckCircle2 className="w-4 h-4 text-green-500" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-red-500" />
                          )}
                          <span className="font-medium text-sm">
                            {result.name}
                          </span>
                          <Badge variant="outline" className="text-xs ml-auto">
                            {result.duration}ms
                          </Badge>
                        </div>
                        {result.error && (
                          <div className="text-xs text-red-600 bg-red-50 rounded p-2 font-mono">
                            {result.error}
                          </div>
                        )}
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </>
            ) : (
              <Card className="p-8 text-center">
                <BarChart3 className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p className="text-muted-foreground">
                  Run tests to see results
                </p>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
