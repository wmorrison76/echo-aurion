import { GeneratedFile } from "./CodeGenerationEngine";

export interface CodeDependency {
  importPath: string;
  sourceFile: string;
  importedFile?: string;
  type: "import" | "require" | "default" | "named" | "side-effect";
  lineNumber: number;
}

export interface FileComplexityMetrics {
  path: string;
  linesOfCode: number;
  numberOfFunctions: number;
  numberOfClasses: number;
  numberOfInterfaces: number;
  cyclomaticComplexity: number;
  maintainabilityIndex: number;
  dependencies: CodeDependency[];
  dependents: string[];
  externalDependencies: string[];
}

export interface CodeStructure {
  functions: Array<{
    name: string;
    startLine: number;
    endLine: number;
    params: string[];
  }>;
  classes: Array<{
    name: string;
    startLine: number;
    endLine: number;
    methods: string[];
  }>;
  interfaces: Array<{ name: string; startLine: number; endLine: number }>;
  imports: CodeDependency[];
  exports: Array<{ name: string; type: "named" | "default" }>;
}

export class CodeFileAnalyzer {
  /**
   * Analyzes a single code file for structure and dependencies
   */
  analyzeFile(file: GeneratedFile): FileComplexityMetrics {
    const content = file.content;
    const path = file.path;

    return {
      path,
      linesOfCode: this.countLines(content),
      numberOfFunctions: this.countFunctions(content, file.type),
      numberOfClasses: this.countClasses(content, file.type),
      numberOfInterfaces: this.countInterfaces(content, file.type),
      cyclomaticComplexity: this.calculateCyclomaticComplexity(content),
      maintainabilityIndex: this.calculateMaintainabilityIndex(content),
      dependencies: this.extractDependencies(content, file.type),
      dependents: [],
      externalDependencies: this.extractExternalDependencies(
        content,
        file.type,
      ),
    };
  }

  /**
   * Analyzes code structure (functions, classes, interfaces)
   */
  analyzeStructure(file: GeneratedFile): CodeStructure {
    const content = file.content;
    const type = file.type;

    return {
      functions: this.extractFunctions(content, type),
      classes: this.extractClasses(content, type),
      interfaces: this.extractInterfaces(content, type),
      imports: this.extractDependencies(content, type),
      exports: this.extractExports(content, type),
    };
  }

  /**
   * Detects potential issues in code
   */
  detectIssues(file: GeneratedFile): Array<{
    severity: "error" | "warning" | "info";
    message: string;
    lineNumber?: number;
  }> {
    const issues: Array<{
      severity: "error" | "warning" | "info";
      message: string;
      lineNumber?: number;
    }> = [];
    const content = file.content;
    const lines = content.split("\n");

    // Check for TypeScript type issues
    if (file.type === "typescript") {
      // Check for 'any' type usage
      const anyMatches = content.match(/:\s*any\b/g) || [];
      if (anyMatches.length > 3) {
        issues.push({
          severity: "warning",
          message: `Too many 'any' types (${anyMatches.length}). Consider using proper types.`,
        });
      }

      // Check for missing error handling
      if (
        content.includes("async") &&
        !content.includes("try") &&
        !content.includes("catch")
      ) {
        issues.push({
          severity: "warning",
          message:
            "Async functions detected but no error handling found. Add try/catch blocks.",
        });
      }
    }

    // Check for SQL injection vulnerabilities
    if (file.type === "sql") {
      if (content.includes("SELECT") && content.includes("$")) {
        // SQL uses parameterized queries - good
      } else if (content.includes("SELECT") && content.includes("`")) {
        issues.push({
          severity: "error",
          message:
            "Potential SQL injection risk. Use parameterized queries instead of template literals.",
        });
      }
    }

    // Check for console.log in production code
    const consoleMatches = content.match(/console\.(log|warn|error)/g) || [];
    if (
      consoleMatches.length > 5 &&
      !file.path.includes("test") &&
      !file.path.includes("spec")
    ) {
      issues.push({
        severity: "warning",
        message: `Multiple console statements (${consoleMatches.length}). Remove or use proper logging.`,
      });
    }

    // Check for TODO comments
    const todoMatches = content.match(/TODO|FIXME|HACK|XXX/g) || [];
    if (todoMatches.length > 0) {
      issues.push({
        severity: "info",
        message: `Found ${todoMatches.length} TODO/FIXME comments. Review and complete these items.`,
      });
    }

    // Check for magic numbers
    const magicNumbers = content.match(/\b[0-9]{3,}\b/g) || [];
    if (magicNumbers.length > 10) {
      issues.push({
        severity: "info",
        message:
          "Multiple magic numbers detected. Consider using named constants.",
      });
    }

    return issues;
  }

  /**
   * Calculates code metrics for quality assessment
   */
  calculateQualityScore(files: GeneratedFile[]): {
    overallScore: number;
    codeHealthScore: number;
    maintainabilityScore: number;
    complexityScore: number;
    testCoverageScore: number;
    recommendations: string[];
  } {
    let totalComplexity = 0;
    let totalMaintainability = 0;
    let fileCount = 0;
    const issues: Array<{
      severity: "error" | "warning" | "info";
      message: string;
      lineNumber?: number;
    }> = [];

    files.forEach((file) => {
      const metrics = this.analyzeFile(file);
      totalComplexity += metrics.cyclomaticComplexity;
      totalMaintainability += metrics.maintainabilityIndex;
      fileCount++;

      const fileIssues = this.detectIssues(file);
      issues.push(...fileIssues);
    });

    const avgComplexity = fileCount > 0 ? totalComplexity / fileCount : 0;
    const avgMaintainability =
      fileCount > 0 ? totalMaintainability / fileCount : 0;

    // Calculate scores (0-100)
    const complexityScore = Math.max(
      0,
      Math.min(100, 100 - avgComplexity * 10),
    );
    const codeHealthScore = Math.max(0, Math.min(100, 100 - issues.length * 5));
    const maintainabilityScore = avgMaintainability;
    const testCoverageScore = this.estimateTestCoverage(files);

    const overallScore =
      complexityScore * 0.25 +
      codeHealthScore * 0.25 +
      maintainabilityScore * 0.25 +
      testCoverageScore * 0.25;

    const recommendations: string[] = [];

    if (complexityScore < 50) {
      recommendations.push(
        "Consider breaking down complex functions into smaller, more testable units",
      );
    }

    if (codeHealthScore < 70) {
      recommendations.push(
        "Address detected code issues to improve overall health",
      );
    }

    if (maintainabilityScore < 60) {
      recommendations.push("Improve code documentation and reduce duplication");
    }

    if (testCoverageScore < 60) {
      recommendations.push("Increase test coverage for better reliability");
    }

    recommendations.push(
      "Run static analysis tools (eslint, tslint) regularly",
    );
    recommendations.push(
      "Consider adding type definitions for all external dependencies",
    );

    return {
      overallScore: Math.round(overallScore),
      codeHealthScore: Math.round(codeHealthScore),
      maintainabilityScore: Math.round(maintainabilityScore),
      complexityScore: Math.round(complexityScore),
      testCoverageScore: Math.round(testCoverageScore),
      recommendations,
    };
  }

  private countLines(content: string): number {
    return content.split("\n").filter((line) => line.trim()).length;
  }

  private countFunctions(content: string, type: string): number {
    if (type !== "typescript" && type !== "sql") return 0;
    const regex = /function\s+\w+|const\s+\w+\s*=\s*(?:async\s*)?\(/g;
    return (content.match(regex) || []).length;
  }

  private countClasses(content: string, type: string): number {
    if (type !== "typescript") return 0;
    const regex = /class\s+\w+/g;
    return (content.match(regex) || []).length;
  }

  private countInterfaces(content: string, type: string): number {
    if (type !== "typescript") return 0;
    const regex = /interface\s+\w+/g;
    return (content.match(regex) || []).length;
  }

  private calculateCyclomaticComplexity(content: string): number {
    // Count decision points: if, else, switch, case, for, while, catch, ||, &&, ternary
    const decisions =
      (content.match(/\bif\b/g) || []).length +
      (content.match(/\belse\b/g) || []).length +
      (content.match(/\bswitch\b/g) || []).length +
      (content.match(/\bcase\b/g) || []).length +
      (content.match(/\bfor\b/g) || []).length +
      (content.match(/\bwhile\b/g) || []).length +
      (content.match(/\bcatch\b/g) || []).length +
      (content.match(/\|\|/g) || []).length +
      (content.match(/&&/g) || []).length +
      (content.match(/\?.*:/g) || []).length;

    // Normalize: 1-10 is good, 11-20 is moderate, 21+ is complex
    return Math.min(decisions + 1, 100);
  }

  private calculateMaintainabilityIndex(content: string): number {
    // Simple maintainability calculation based on various factors
    const lines = this.countLines(content);
    const comments = (content.match(/\/\/|\/\*/g) || []).length;
    const complexity = this.calculateCyclomaticComplexity(content);

    // Score 0-100: higher is better
    let score = 100;
    score -= Math.min(lines / 100, 20); // Penalize long files
    score += Math.min(comments / 10, 20); // Reward comments
    score -= Math.min(complexity / 50, 30); // Penalize complexity

    return Math.max(0, Math.min(100, score));
  }

  private extractDependencies(content: string, type: string): CodeDependency[] {
    const dependencies: CodeDependency[] = [];

    if (type === "typescript") {
      // Match: import { x } from 'path'
      const importRegex = /import\s+(?:{[^}]*}|.*?)\s+from\s+['"]([^'"]+)['"]/g;
      let match;

      let lineNumber = 0;
      const lines = content.split("\n");

      lines.forEach((line, index) => {
        const lineMatches = Array.from(line.matchAll(importRegex));
        lineMatches.forEach((m) => {
          dependencies.push({
            importPath: m[1],
            sourceFile: "",
            type: line.includes("import {") ? "named" : "default",
            lineNumber: index + 1,
          });
        });
      });
    }

    return dependencies;
  }

  private extractExternalDependencies(content: string, type: string): string[] {
    const external = new Set<string>();

    if (type === "typescript") {
      const importRegex = /import\s+(?:{[^}]*}|.*?)\s+from\s+['"]([^'"]+)['"]/g;
      let match;

      while ((match = importRegex.exec(content))) {
        const path = match[1];
        // External dependencies don't start with ./ or ../
        if (!path.startsWith(".")) {
          external.add(path);
        }
      }
    }

    return Array.from(external);
  }

  private extractFunctions(
    content: string,
    type: string,
  ): Array<{
    name: string;
    startLine: number;
    endLine: number;
    params: string[];
  }> {
    const functions: Array<{
      name: string;
      startLine: number;
      endLine: number;
      params: string[];
    }> = [];

    if (type !== "typescript") return functions;

    const funcRegex =
      /(?:async\s+)?(?:function|const)\s+(\w+)\s*(?:\([^)]*\))?\s*(?::|=>)/g;
    const lines = content.split("\n");

    let lineNum = 1;
    lines.forEach((line) => {
      const match = funcRegex.exec(line);
      if (match) {
        functions.push({
          name: match[1],
          startLine: lineNum,
          endLine: lineNum,
          params: [],
        });
      }
      lineNum++;
    });

    return functions;
  }

  private extractClasses(
    content: string,
    type: string,
  ): Array<{
    name: string;
    startLine: number;
    endLine: number;
    methods: string[];
  }> {
    const classes: Array<{
      name: string;
      startLine: number;
      endLine: number;
      methods: string[];
    }> = [];

    if (type !== "typescript") return classes;

    const classRegex = /class\s+(\w+)/g;
    const lines = content.split("\n");

    let lineNum = 1;
    lines.forEach((line) => {
      const match = classRegex.exec(line);
      if (match) {
        classes.push({
          name: match[1],
          startLine: lineNum,
          endLine: lineNum,
          methods: [],
        });
      }
      lineNum++;
    });

    return classes;
  }

  private extractInterfaces(
    content: string,
    type: string,
  ): Array<{ name: string; startLine: number; endLine: number }> {
    const interfaces: Array<{
      name: string;
      startLine: number;
      endLine: number;
    }> = [];

    if (type !== "typescript") return interfaces;

    const interfaceRegex = /interface\s+(\w+)/g;
    const lines = content.split("\n");

    let lineNum = 1;
    lines.forEach((line) => {
      const match = interfaceRegex.exec(line);
      if (match) {
        interfaces.push({
          name: match[1],
          startLine: lineNum,
          endLine: lineNum,
        });
      }
      lineNum++;
    });

    return interfaces;
  }

  private extractExports(
    content: string,
    type: string,
  ): Array<{ name: string; type: "named" | "default" }> {
    const exports: Array<{ name: string; type: "named" | "default" }> = [];

    if (type !== "typescript") return exports;

    // Find default exports
    if (content.includes("export default")) {
      const match = content.match(
        /export\s+default\s+(?:class|function|const)?\s*(\w+)?/,
      );
      if (match && match[1]) {
        exports.push({ name: match[1], type: "default" });
      }
    }

    // Find named exports
    const namedRegex = /export\s+(?:const|function|class|interface)\s+(\w+)/g;
    let match;
    while ((match = namedRegex.exec(content))) {
      exports.push({ name: match[1], type: "named" });
    }

    return exports;
  }

  private estimateTestCoverage(files: GeneratedFile[]): number {
    const testFiles = files.filter(
      (f) => f.path.includes("test") || f.path.includes("spec"),
    );
    const sourceFiles = files.filter(
      (f) => !f.path.includes("test") && !f.path.includes("spec"),
    );

    if (sourceFiles.length === 0) return 50; // Default if no source files

    // Estimate: if we have tests, assume ~70% coverage, otherwise ~30%
    if (testFiles.length > 0) {
      return Math.min(70 + testFiles.length * 5, 95);
    }

    return 30;
  }
}

export const codeFileAnalyzer = new CodeFileAnalyzer();
