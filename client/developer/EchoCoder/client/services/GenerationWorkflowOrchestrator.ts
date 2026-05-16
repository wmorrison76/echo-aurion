import { DialogUnderstanding } from "./RealAIConversationService";
import { codeGenerationEngine, GeneratedFile, GenerationResult } from "./CodeGenerationEngine";
import { fileGenerationService } from "./FileGenerationService";
import { codeFileAnalyzer } from "./CodeFileAnalyzer";
import { codeSuggestionsService, CodeSuggestion } from "./CodeSuggestionsService";

export interface WorkflowResult {
  understanding: DialogUnderstanding;
  generation: GenerationResult;
  files: GeneratedFile[];
  qualityScore: {
    overallScore: number;
    codeHealthScore: number;
    maintainabilityScore: number;
    complexityScore: number;
    testCoverageScore: number;
    recommendations: string[];
  };
  suggestions: CodeSuggestion[];
  roadmap: string;
  totalTimeMs: number;
}

interface WorkflowCallbacks {
  onPhaseChange?: (phase: string) => void;
  onProgress?: (message: string, progress: number) => void;
  onGenerationComplete?: (files: GeneratedFile[]) => void;
  onAnalysisComplete?: (score: any) => void;
  onSuggestionsComplete?: (suggestions: CodeSuggestion[]) => void;
}

class GenerationWorkflowOrchestrator {
  private callbacks: WorkflowCallbacks = {};

  setCallbacks(callbacks: WorkflowCallbacks) {
    this.callbacks = callbacks;
  }

  private notify(phase: string, progress: number = 0) {
    this.callbacks.onPhaseChange?.(phase);
    this.callbacks.onProgress?.(phase, progress);
  }

  async executeFullWorkflow(understanding: DialogUnderstanding): Promise<WorkflowResult> {
    const startTime = Date.now();

    try {
      // Phase 1: Generate code
      this.notify("Generating code system...", 10);
      const generation = await codeGenerationEngine.generateCompleteSystem(understanding);

      if (!generation.success) {
        throw new Error("Code generation failed");
      }

      this.notify("Code generation complete", 30);
      this.callbacks.onGenerationComplete?.(generation.files);

      // Store generated files
      fileGenerationService.storeFiles(generation.files);

      // Phase 2: Analyze code quality
      this.notify("Analyzing code quality...", 40);
      const qualityScore = codeFileAnalyzer.calculateQualityScore(generation.files);

      this.notify("Quality analysis complete", 60);
      this.callbacks.onAnalysisComplete?.(qualityScore);

      // Phase 3: Generate improvement suggestions
      this.notify("Generating improvement suggestions...", 70);
      const suggestions = await codeSuggestionsService.generateSuggestions(generation.files);

      this.notify("Generating improvement roadmap...", 85);
      const roadmap = codeSuggestionsService.generateRoadmap(suggestions);

      this.notify("Workflow complete", 100);
      this.callbacks.onSuggestionsComplete?.(suggestions);

      const totalTimeMs = Date.now() - startTime;

      return {
        understanding,
        generation,
        files: generation.files,
        qualityScore,
        suggestions,
        roadmap,
        totalTimeMs,
      };
    } catch (error) {
      console.error("Workflow execution failed:", error);
      this.notify(`Error: ${error instanceof Error ? error.message : "Unknown error"}`, 0);
      throw error;
    }
  }

  /**
   * Apply a suggestion and generate refactored code
   */
  async applySuggestion(
    suggestion: CodeSuggestion,
    files: GeneratedFile[]
  ): Promise<GeneratedFile | null> {
    const file = files.find((f) => f.path === suggestion.filePath);
    if (!file) return null;

    try {
      const refactoredCode = await codeSuggestionsService.refactorCode(file, suggestion);

      const refactoredFile: GeneratedFile = {
        ...file,
        content: refactoredCode,
      };

      // Update in service
      fileGenerationService.storeFiles(
        files.map((f) => (f.path === file.path ? refactoredFile : f))
      );

      return refactoredFile;
    } catch (error) {
      console.error("Failed to apply suggestion:", error);
      return null;
    }
  }

  /**
   * Export full workflow results as markdown report
   */
  exportAsReport(result: WorkflowResult): string {
    const effort = codeSuggestionsService.calculateTotalEffort(result.suggestions);
    const quickWins = codeSuggestionsService.getQuickWins(result.suggestions);

    let report = `# Code Generation Report

## Executive Summary
- **Complexity**: ${result.understanding.complexity}
- **Total Files Generated**: ${result.files.length}
- **Overall Code Quality**: ${result.qualityScore.overallScore}/100
- **Suggestions**: ${result.suggestions.length}
- **Estimated Refactoring Effort**: ${effort.total.toFixed(1)} hours

---

## System Overview

### Core Idea
${result.understanding.coreIdea}

### Target Users
${result.understanding.targetUsers}

### Main Problem Solved
${result.understanding.mainProblem}

### Key Features (${result.understanding.keyFeatures.length})
${result.understanding.keyFeatures.map((f) => `- ${f}`).join("\n")}

### Data Entities (${result.understanding.dataEntities.length})
${result.understanding.dataEntities.map((e) => `- ${e}`).join("\n")}

### Integrations (${result.understanding.integrations.length})
${result.understanding.integrations.length > 0 ? result.understanding.integrations.map((i) => `- ${i}`).join("\n") : "- None specified"}

---

## Code Quality Analysis

### Scores
| Metric | Score |
|--------|-------|
| Overall | ${result.qualityScore.overallScore}/100 |
| Code Health | ${result.qualityScore.codeHealthScore}/100 |
| Maintainability | ${result.qualityScore.maintainabilityScore}/100 |
| Complexity | ${result.qualityScore.complexityScore}/100 |
| Test Coverage | ${result.qualityScore.testCoverageScore}/100 |

### Recommendations
${result.qualityScore.recommendations.map((r) => `- ${r}`).join("\n")}

---

## Generated Files

### Summary
- **Total Files**: ${result.files.length}
- **TypeScript Files**: ${result.files.filter((f) => f.type === "typescript").length}
- **SQL Schemas**: ${result.files.filter((f) => f.type === "sql").length}
- **Configuration**: ${result.files.filter((f) => f.type === "json").length}
- **Documentation**: ${result.files.filter((f) => f.type === "markdown").length}

### Files List
${result.files
  .map((f) => `- **${f.path}**: ${f.description}`)
  .join("\n")}

---

## Improvement Roadmap

### Quick Wins (${quickWins.length} items - ${effort.breakdown.low.toFixed(1)}h total)
${quickWins.length > 0 ? quickWins.map((s) => `- **${s.title}** (${s.filePath})`).join("\n") : "- None available"}

### Full Roadmap
${result.roadmap}

---

## Architecture Overview

${result.generation.architecture}

---

## Data Flow

${result.generation.dataFlow}

---

## Generation Summary

${result.generation.summary}

---

## Performance Metrics

- **Total Generation Time**: ${result.totalTimeMs}ms (${(result.totalTimeMs / 1000).toFixed(2)}s)
- **Files Generated**: ${result.files.length} files
- **Average File Size**: ${(result.files.reduce((sum, f) => sum + f.content.length, 0) / result.files.length / 1024).toFixed(1)} KB
- **Total Code Size**: ${(result.files.reduce((sum, f) => sum + f.content.length, 0) / 1024).toFixed(1)} KB

---

## Next Steps

1. **Review Generated Code**
   - Examine all generated files
   - Check database schema for your domain
   - Review API routes for completeness

2. **Apply Quick Wins** (${effort.breakdown.low.toFixed(1)}h)
   - One-click apply high-impact, low-effort improvements
   - Improves code quality immediately

3. **Plan Refactoring** (${effort.total.toFixed(1)}h total)
   - Prioritize medium and high effort improvements
   - Schedule refactoring sprints

4. **Deploy to Database**
   - Run SQL schemas in Supabase/PostgreSQL
   - Verify table creation

5. **Install Dependencies**
   - Extract and install npm packages
   - Configure environment variables

6. **Start Development**
   - Run development server
   - Begin testing and customization

---

**Generated**: ${new Date().toISOString()}
**Quality Score**: ${result.qualityScore.overallScore}/100 ${this.getQualityBadge(result.qualityScore.overallScore)}
    `;

    return report;
  }

  private getQualityBadge(score: number): string {
    if (score >= 80) return "✅ Excellent";
    if (score >= 60) return "⚠️ Good";
    if (score >= 40) return "⚠️ Fair";
    return "❌ Needs Work";
  }
}

export const generationWorkflowOrchestrator = new GenerationWorkflowOrchestrator();
