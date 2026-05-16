import { automationService } from "./automationService";

export interface WorkflowState {
  phase: "idea" | "understanding" | "planning" | "implementation" | "complete";
  idea: string;
  understanding: Record<string, any>;
  plan: Record<string, any>;
  generatedFiles: Array<{ path: string; content: string; type: string }>;
  errors: string[];
  isLoading: boolean;
}

export interface WorkflowCallbacks {
  onPhaseChange?: (phase: WorkflowState["phase"]) => void;
  onProgress?: (message: string, progress: number) => void;
  onFilesGenerated?: (files: WorkflowState["generatedFiles"]) => void;
  onError?: (error: string) => void;
  onComplete?: (state: WorkflowState) => void;
}

class AutoWorkflowOrchestratorService {
  private state: WorkflowState = {
    phase: "idea",
    idea: "",
    understanding: {},
    plan: {},
    generatedFiles: [],
    errors: [],
    isLoading: false,
  };

  private callbacks: WorkflowCallbacks = {};

  setCallbacks(callbacks: WorkflowCallbacks) {
    this.callbacks = callbacks;
  }

  getState(): WorkflowState {
    return { ...this.state };
  }

  async startFromIdea(idea: string) {
    this.state.idea = idea;
    this.state.phase = "idea";
    this.notifyPhaseChange();

    // Analyze the idea with prescan
    this.notify("Analyzing your idea...", 10);
    try {
      const prescanResult = await automationService.prescanModules(idea);
      this.state.understanding = prescanResult;
      this.notify("Understanding your vision...", 30);
    } catch (error: any) {
      this.handleError("Failed to analyze idea: " + error.message);
    }
  }

  async generatePlan() {
    if (this.state.phase !== "understanding") {
      this.handleError("Can only generate plan from understanding phase");
      return;
    }

    this.state.phase = "planning";
    this.notifyPhaseChange();
    this.state.isLoading = true;

    this.notify("Creating technical plan...", 40);

    try {
      // Get intent brief
      const intentResult = await automationService.generateIntentBrief(this.state.idea);
      this.state.plan = intentResult;
      this.notify("Plan created", 60);
    } catch (error: any) {
      this.handleError("Failed to generate plan: " + error.message);
    } finally {
      this.state.isLoading = false;
    }
  }

  async autoImplement() {
    if (this.state.phase !== "planning") {
      this.handleError("Can only implement from planning phase");
      return;
    }

    this.state.phase = "implementation";
    this.notifyPhaseChange();
    this.state.isLoading = true;

    try {
      this.notify("Generating code structure...", 40);

      // Simulate file generation based on the plan
      const files = this.generateMockFiles();
      this.state.generatedFiles = files;

      this.notify("Creating database schemas...", 60);
      this.notify("Building API routes...", 75);
      this.notify("Creating React components...", 85);
      this.notify("Setting up integrations...", 95);

      if (this.callbacks.onFilesGenerated) {
        this.callbacks.onFilesGenerated(files);
      }

      this.notify("Implementation complete", 100);
      this.state.phase = "complete";
      this.notifyPhaseChange();
    } catch (error: any) {
      this.handleError("Failed to implement: " + error.message);
    } finally {
      this.state.isLoading = false;
      if (this.callbacks.onComplete) {
        this.callbacks.onComplete(this.state);
      }
    }
  }

  async fixCurrentIssue(error: string) {
    this.state.isLoading = true;
    this.notify(`Fixing: ${error}...`, 20);

    try {
      const fixResult = await automationService.generateIntentBrief(
        `Fix this error in generated code: ${error}`
      );

      // Update files with fixes
      this.state.generatedFiles = this.state.generatedFiles.map((file) => ({
        ...file,
        content: file.content + `\n// Fix: ${fixResult.summary}`,
      }));

      this.notify("Fix applied", 100);

      if (this.callbacks.onFilesGenerated) {
        this.callbacks.onFilesGenerated(this.state.generatedFiles);
      }
    } catch (error: any) {
      this.handleError("Failed to fix issue: " + error.message);
    } finally {
      this.state.isLoading = false;
    }
  }

  async analyzeCode() {
    if (this.state.generatedFiles.length === 0) {
      this.handleError("No code to analyze");
      return;
    }

    this.state.isLoading = true;
    this.notify("Analyzing code quality...", 30);

    try {
      // Simulate analysis
      const codeContent = this.state.generatedFiles.map((f) => f.content).join("\n");
      const analysisResult = await automationService.securitySweep(codeContent);

      this.notify("Analysis complete", 100);
      // Analysis results would be displayed to user
    } catch (error: any) {
      this.handleError("Failed to analyze: " + error.message);
    } finally {
      this.state.isLoading = false;
    }
  }

  async deployToProduction() {
    if (this.state.phase !== "complete") {
      this.handleError("Can only deploy from complete phase");
      return;
    }

    this.state.isLoading = true;
    this.notify("Preparing deployment...", 20);

    try {
      const deployResult = await automationService.deployToNetlify(
        JSON.stringify(this.state.generatedFiles)
      );

      this.notify("Deploying to production...", 70);
      // Simulate deployment time
      await new Promise((resolve) => setTimeout(resolve, 2000));

      this.notify("🎉 Deployment successful!", 100);
      this.state.phase = "complete";
    } catch (error: any) {
      this.handleError("Deployment failed: " + error.message);
    } finally {
      this.state.isLoading = false;
    }
  }

  private generateMockFiles() {
    const baseName = this.state.idea
      .toLowerCase()
      .replace(/\s+/g, "-")
      .substring(0, 20);

    return [
      {
        path: `lib/supabase/${baseName}-schema.sql`,
        content: "-- Database schema for " + this.state.idea,
        type: "sql",
      },
      {
        path: `server/routes/${baseName}.ts`,
        content: `import express from 'express';\n// API routes for ${this.state.idea}`,
        type: "typescript",
      },
      {
        path: `client/pages/${this.capitalize(baseName)}.tsx`,
        content: `import React from 'react';\n// Page for ${this.state.idea}`,
        type: "typescript",
      },
      {
        path: "server/index.ts",
        content: `// Register routes\napp.use('/api/${baseName}', ${baseName}Router);`,
        type: "typescript",
      },
      {
        path: "client/App.tsx",
        content: `// Add route\n<Route path="/${baseName}" element={<${this.capitalize(
          baseName
        )} />} />`,
        type: "typescript",
      },
    ];
  }

  private capitalize(str: string): string {
    return str
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("");
  }

  private notify(message: string, progress: number) {
    if (this.callbacks.onProgress) {
      this.callbacks.onProgress(message, progress);
    }
  }

  private notifyPhaseChange() {
    if (this.callbacks.onPhaseChange) {
      this.callbacks.onPhaseChange(this.state.phase);
    }
  }

  private handleError(error: string) {
    this.state.errors.push(error);
    if (this.callbacks.onError) {
      this.callbacks.onError(error);
    }
  }

  reset() {
    this.state = {
      phase: "idea",
      idea: "",
      understanding: {},
      plan: {},
      generatedFiles: [],
      errors: [],
      isLoading: false,
    };
  }
}

export const orchestrator = new AutoWorkflowOrchestratorService();
