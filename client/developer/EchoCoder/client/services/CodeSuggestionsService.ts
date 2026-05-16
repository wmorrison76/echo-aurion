// SECURITY: API calls proxied through secure /api/openai endpoints
// The actual API key is stored server-side and NEVER exposed to client
import { GeneratedFile } from "./CodeGenerationEngine";
import { codeFileAnalyzer } from "./CodeFileAnalyzer";

export interface CodeSuggestion {
  id: string;
  severity: "critical" | "major" | "minor";
  title: string;
  description: string;
  filePath: string;
  lineNumber?: number;
  impact: "high" | "medium" | "low";
  effort: "low" | "medium" | "high";
  currentCode?: string;
  suggestedCode?: string;
  explanation: string;
  category:
    | "performance"
    | "security"
    | "maintainability"
    | "testing"
    | "documentation"
    | "best-practices";
  tags: string[];
}

export class CodeSuggestionsService {
  constructor() {
    // Service ready - all API calls proxied through secure endpoints
  }

  /**
   * Generates improvement suggestions for a set of code files
   */
  async generateSuggestions(files: GeneratedFile[]): Promise<CodeSuggestion[]> {
    const suggestions: CodeSuggestion[] = [];

    // Get analysis for all files
    const analyses = files.map((f) => ({
      file: f,
      metrics: codeFileAnalyzer.analyzeFile(f),
      issues: codeFileAnalyzer.detectIssues(f),
    }));

    // Generate rule-based suggestions
    for (const { file, metrics, issues } of analyses) {
      // Performance suggestions
      if (metrics.cyclomaticComplexity > 15) {
        suggestions.push({
          id: `perf-${file.path}-complexity`,
          severity: "major",
          title: "High Cyclomatic Complexity",
          description: `Function complexity is ${metrics.cyclomaticComplexity}, which exceeds recommended threshold of 10`,
          filePath: file.path,
          impact: "high",
          effort: "high",
          explanation:
            "Breaking down complex functions into smaller units improves readability, testability, and maintainability. Consider refactoring using the Single Responsibility Principle.",
          category: "maintainability",
          tags: ["refactoring", "complexity"],
        });
      }

      // Testing suggestions
      if (!file.path.includes("test") && !file.path.includes("spec")) {
        if (metrics.numberOfFunctions > 5) {
          suggestions.push({
            id: `test-${file.path}-coverage`,
            severity: "major",
            title: "Missing Test Coverage",
            description: `File has ${metrics.numberOfFunctions} functions but no tests found`,
            filePath: file.path,
            impact: "high",
            effort: "medium",
            explanation:
              "Each function should have corresponding unit tests. Consider using Jest or Vitest to achieve 80%+ code coverage.",
            category: "testing",
            tags: ["testing", "coverage"],
          });
        }
      }

      // Documentation suggestions
      if (metrics.numberOfClasses > 0 && file.type === "typescript") {
        const hasDocComments =
          (file.content.match(/\/\*\*|\/\//g) || []).length <
          metrics.numberOfClasses;
        if (hasDocComments) {
          suggestions.push({
            id: `doc-${file.path}-classes`,
            severity: "minor",
            title: "Missing Class Documentation",
            description: `Classes should have JSDoc comments describing purpose and usage`,
            filePath: file.path,
            impact: "medium",
            effort: "low",
            explanation:
              "Add JSDoc comments above each class to document purpose, parameters, and return types. This improves IDE autocomplete and code understanding.",
            category: "documentation",
            tags: ["documentation", "jsdoc"],
          });
        }
      }

      // Security suggestions from detected issues
      issues
        .filter((i) => i.severity === "error")
        .forEach((issue) => {
          suggestions.push({
            id: `sec-${file.path}-${issue.message.slice(0, 20)}`,
            severity: "critical",
            title: "Security Issue",
            description: issue.message,
            filePath: file.path,
            lineNumber: issue.lineNumber,
            impact: "high",
            effort: "medium",
            explanation:
              "This issue poses a security risk. Review and fix immediately using parameterized queries or sanitized inputs.",
            category: "security",
            tags: ["security", "vulnerability"],
          });
        });

      // Best practices
      if (metrics.numberOfFunctions > 10 && metrics.linesOfCode > 500) {
        suggestions.push({
          id: `bp-${file.path}-size`,
          severity: "minor",
          title: "File is Getting Large",
          description: `File has ${metrics.numberOfFunctions} functions and ${metrics.linesOfCode} lines`,
          filePath: file.path,
          impact: "medium",
          effort: "high",
          explanation:
            "Consider splitting this file into smaller modules. Files over 300 lines are harder to maintain and test. Follow the Single Responsibility Principle.",
          category: "best-practices",
          tags: ["refactoring", "modularity"],
        });
      }
    }

    // Generate AI-powered suggestions for top priority items
    if (suggestions.length > 0) {
      const topIssues = suggestions.slice(0, 3);
      for (const suggestion of topIssues) {
        const file = files.find((f) => f.path === suggestion.filePath);
        if (file) {
          try {
            const aiSuggestion = await this.generateAISuggestion(
              file,
              suggestion,
            );
            if (aiSuggestion) {
              Object.assign(suggestion, aiSuggestion);
            }
          } catch (error) {
            console.error("Failed to generate AI suggestion:", error);
          }
        }
      }
    }

    // Sort by impact and effort (Pareto principle)
    return suggestions.sort((a, b) => {
      const impactScore = { high: 3, medium: 2, low: 1 };
      const effortScore = { low: 3, medium: 2, high: 1 };

      const scoreA = impactScore[a.impact] * effortScore[a.effort];
      const scoreB = impactScore[b.impact] * effortScore[b.effort];

      return scoreB - scoreA;
    });
  }

  /**
   * Generates a refactored version of code
   */
  async refactorCode(
    file: GeneratedFile,
    suggestion: CodeSuggestion,
  ): Promise<string> {
    const prompt = `
Refactor this code to address: "${suggestion.title}"

Current code:
\`\`\`${file.type}
${file.content}
\`\`\`

Issue: ${suggestion.description}
Category: ${suggestion.category}

Provide ONLY the refactored code without any explanation. Keep all functionality the same, just improve the code.
    `;

    return this.callOpenAI(
      prompt,
      "You are a code refactoring expert. Improve the code quality.",
    );
  }

  /**
   * Gets suggestions filtered by category
   */
  getSuggestionsByCategory(
    suggestions: CodeSuggestion[],
    category: CodeSuggestion["category"],
  ): CodeSuggestion[] {
    return suggestions.filter((s) => s.category === category);
  }

  /**
   * Gets suggestions filtered by severity
   */
  getSuggestionsBySeverity(
    suggestions: CodeSuggestion[],
    severity: CodeSuggestion["severity"],
  ): CodeSuggestion[] {
    return suggestions.filter((s) => s.severity === severity);
  }

  /**
   * Gets actionable suggestions (high impact, low effort)
   */
  getQuickWins(suggestions: CodeSuggestion[]): CodeSuggestion[] {
    return suggestions.filter((s) => s.impact === "high" && s.effort === "low");
  }

  /**
   * Calculates total refactoring effort
   */
  calculateTotalEffort(suggestions: CodeSuggestion[]): {
    total: number;
    breakdown: Record<"low" | "medium" | "high", number>;
  } {
    const effortHours = { low: 0.5, medium: 2, high: 8 };
    const breakdown = { low: 0, medium: 0, high: 0 };

    let total = 0;
    suggestions.forEach((s) => {
      const hours = effortHours[s.effort];
      total += hours;
      breakdown[s.effort] += hours;
    });

    return { total, breakdown };
  }

  /**
   * Generates a refactoring roadmap
   */
  generateRoadmap(suggestions: CodeSuggestion[]): string {
    const byCategory: Record<string, CodeSuggestion[]> = {};

    suggestions.forEach((s) => {
      if (!byCategory[s.category]) {
        byCategory[s.category] = [];
      }
      byCategory[s.category].push(s);
    });

    const effort = this.calculateTotalEffort(suggestions);
    const quickWins = this.getQuickWins(suggestions);

    let roadmap = `# Code Improvement Roadmap

## Summary
- Total Suggestions: ${suggestions.length}
- Estimated Effort: ${effort.total.toFixed(1)} hours
- Quick Wins: ${quickWins.length} items (< 30 min each)

## Effort Breakdown
- Low Effort (0.5h): ${effort.breakdown.low.toFixed(1)} hours total
- Medium Effort (2h): ${effort.breakdown.medium.toFixed(1)} hours total
- High Effort (8h): ${effort.breakdown.high.toFixed(1)} hours total

## Phase 1: Quick Wins (${effort.breakdown.low.toFixed(1)}h)
Start with these for immediate improvements:
${quickWins.map((s) => `- **${s.title}** (${s.filePath})`).join("\n")}

## Phases by Category
`;

    Object.entries(byCategory).forEach(([category, items]) => {
      const categoryEffort = this.calculateTotalEffort(items);
      roadmap += `\n### ${category.charAt(0).toUpperCase() + category.slice(1)} (${categoryEffort.total.toFixed(1)}h)\n`;
      items.forEach((s) => {
        roadmap += `- ${s.title} (${s.effort} effort, ${s.impact} impact)\n`;
      });
    });

    roadmap += `

## Recommended Order
1. Fix critical security issues
2. Apply quick wins
3. Improve test coverage
4. Refactor complex functions
5. Enhance documentation
6. Optimize performance

## Expected Outcomes
- Improved code maintainability
- Better test coverage
- Reduced technical debt
- Enhanced security posture
- Easier onboarding for new developers
    `;

    return roadmap;
  }

  private async generateAISuggestion(
    file: GeneratedFile,
    suggestion: CodeSuggestion,
  ): Promise<Partial<CodeSuggestion> | null> {
    const prompt = `
Provide a specific code improvement for this issue:

File: ${file.path}
Issue: ${suggestion.title}
Description: ${suggestion.description}

Code snippet:
\`\`\`${file.type}
${file.content.slice(0, 500)}
\`\`\`

Provide:
1. A brief explanation of why this matters
2. The specific improvement (if code-based)
3. Expected benefits

Format your response as JSON:
{
  "suggestedCode": "improved code snippet",
  "explanation": "why this is better"
}

If not code-related, provide empty suggestedCode.
    `;

    try {
      const response = await this.callOpenAI(
        prompt,
        "You are a code improvement expert. Provide specific, actionable improvements.",
      );

      const parsed = JSON.parse(response);
      return {
        suggestedCode: parsed.suggestedCode || undefined,
        explanation: parsed.explanation || suggestion.explanation,
      };
    } catch (error) {
      console.error("Failed to parse AI suggestion:", error);
      return null;
    }
  }

  private async callOpenAI(
    prompt: string,
    systemPrompt: string,
  ): Promise<string> {
    // SECURITY: All calls proxied through secure /api/openai endpoint
    // The API key is stored server-side and never exposed to client
    const { chatCompletion } = await import("./secureOpenAIService");
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort("Code suggestions request timeout"), 90000); // 90 seconds

    try {
      const response = await chatCompletion({
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        model: "gpt-4",
        temperature: 0.7,
        maxTokens: 2000,
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      if (error instanceof Error && error.name === "AbortError") {
        console.error("Suggestions request timed out");
        throw new Error("Suggestions request timed out. Please try again.");
      }
      console.error("OpenAI API call failed:", error);
      throw error;
    }
  }
}

export const codeSuggestionsService = new CodeSuggestionsService();
