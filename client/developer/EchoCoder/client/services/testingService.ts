export interface TestResult {
  componentName: string;
  language: string;
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  duration: number;
  coverage: {
    statements: number;
    branches: number;
    functions: number;
    lines: number;
  };
  testCases: Array<{
    name: string;
    status: "passed" | "failed" | "skipped";
    duration: number;
  }>;
}

export interface CoverageAnalysis {
  statements: number;
  branches: number;
  functions: number;
  lines: number;
  gaps: string[];
  recommendations: string[];
}

class TestingService {
  private baseUrl = "/api/testing";

  async generateJestTests(code: string, componentName: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/generate-jest`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, componentName }),
    });
    if (!res.ok) throw new Error("Failed to generate Jest tests");
    const { testCode } = await res.json();
    return testCode;
  }

  async generatePlaywrightTests(
    code: string,
    componentName: string,
    appUrl: string
  ): Promise<string> {
    const res = await fetch(`${this.baseUrl}/generate-playwright`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, componentName, appUrl }),
    });
    if (!res.ok) throw new Error("Failed to generate Playwright tests");
    const { testCode } = await res.json();
    return testCode;
  }

  async generateA11yTests(code: string, componentName: string): Promise<string> {
    const res = await fetch(`${this.baseUrl}/generate-a11y`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, componentName }),
    });
    if (!res.ok) throw new Error("Failed to generate a11y tests");
    const { testCode } = await res.json();
    return testCode;
  }

  async analyzeCoverage(code: string, testCode: string): Promise<CoverageAnalysis> {
    const res = await fetch(`${this.baseUrl}/analyze-coverage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, testCode }),
    });
    if (!res.ok) throw new Error("Failed to analyze coverage");
    return res.json();
  }

  async runTests(testCode: string, language: string, componentName: string): Promise<TestResult> {
    const res = await fetch(`${this.baseUrl}/run-tests`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testCode, language, componentName }),
    });
    if (!res.ok) throw new Error("Failed to run tests");
    return res.json();
  }

  async getRecommendations(
    code: string,
    testCoverage: CoverageAnalysis
  ): Promise<{
    highPriority: string[];
    mediumPriority: string[];
    lowPriority: string[];
    estimatedTimeToFix: string;
    expectedCoverageImprovement: string;
  }> {
    const res = await fetch(`${this.baseUrl}/recommendations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, testCoverage }),
    });
    if (!res.ok) throw new Error("Failed to get recommendations");
    return res.json();
  }
}

const testingServiceInstance = new TestingService();

export const testingService = testingServiceInstance;

export function getTestingService(): TestingService {
  return testingServiceInstance;
}
