import { Workflow, WorkflowStep } from "@/components/studio/WorkflowCenter";

export type WorkflowMode = "auto" | "guided" | "manual";
export type StepStatus = "pending" | "in-progress" | "completed" | "error";

interface WorkflowDefinition {
  id: string;
  name: string;
  description: string;
  steps: WorkflowStep[];
}

export interface AutoWorkflowState {
  workflow: Workflow | null;
  isPaused: boolean;
  currentMode: WorkflowMode;
}

// Workflow Definitions
const WORKFLOW_DEFINITIONS: Record<string, WorkflowDefinition> = {
  batch_publish: {
    id: "batch_publish",
    name: "Batch Publishing",
    description: "Publish multiple content items with AI validation",
    steps: [
      {
        id: "prescan",
        title: "Pre-Scan Content",
        description: "AI checks for missing images, metadata, and other issues",
        status: "pending",
        requiresConfirmation: false,
        duration: "2-3 seconds",
      },
      {
        id: "seo_gen",
        title: "Generate SEO Metadata",
        description: "AI creates optimized titles, descriptions, and keywords",
        status: "pending",
        requiresConfirmation: true,
        duration: "3-5 seconds",
      },
      {
        id: "compliance_check",
        title: "Compliance Check",
        description: "Verify GDPR/SOC2 requirements are met",
        status: "pending",
        requiresConfirmation: false,
        duration: "1-2 seconds",
      },
      {
        id: "publish",
        title: "Publish Content",
        description: "Push content to production",
        status: "pending",
        requiresConfirmation: true,
        duration: "2-4 seconds",
      },
      {
        id: "notify",
        title: "Notify Team",
        description: "Send notifications to stakeholders",
        status: "pending",
        requiresConfirmation: false,
        duration: "1 second",
      },
    ],
  },

  seo_optimization: {
    id: "seo_optimization",
    name: "SEO Optimization",
    description: "Optimize content for search engines",
    steps: [
      {
        id: "analyze",
        title: "Analyze Content",
        description: "Check readability, keyword density, and structure",
        status: "pending",
        requiresConfirmation: false,
        duration: "2 seconds",
      },
      {
        id: "generate_metadata",
        title: "Generate Metadata",
        description: "Create title, description, and keywords",
        status: "pending",
        requiresConfirmation: true,
        duration: "3 seconds",
      },
      {
        id: "optimize_content",
        title: "Optimize Content",
        description: "Suggest improvements for better ranking",
        status: "pending",
        requiresConfirmation: true,
        duration: "4 seconds",
      },
      {
        id: "generate_sitemap",
        title: "Generate Sitemap",
        description: "Update XML sitemap for search engines",
        status: "pending",
        requiresConfirmation: false,
        duration: "1 second",
      },
    ],
  },

  compliance_audit: {
    id: "compliance_audit",
    name: "Compliance Audit",
    description: "Verify GDPR, SOC2, and HIPAA compliance",
    steps: [
      {
        id: "scan_data",
        title: "Scan Data",
        description: "Check for sensitive information",
        status: "pending",
        requiresConfirmation: false,
        duration: "3-5 seconds",
      },
      {
        id: "check_policies",
        title: "Check Policies",
        description: "Verify policies match requirements",
        status: "pending",
        requiresConfirmation: false,
        duration: "2 seconds",
      },
      {
        id: "generate_report",
        title: "Generate Report",
        description: "Create compliance report",
        status: "pending",
        requiresConfirmation: false,
        duration: "3 seconds",
      },
      {
        id: "remediation",
        title: "Recommend Fixes",
        description: "Suggest remediation for issues",
        status: "pending",
        requiresConfirmation: true,
        duration: "2 seconds",
      },
    ],
  },

  team_setup: {
    id: "team_setup",
    name: "Team Setup",
    description: "Configure team workspaces and permissions",
    steps: [
      {
        id: "create_workspace",
        title: "Create Workspace",
        description: "Set up isolated workspace for team",
        status: "pending",
        requiresConfirmation: true,
        duration: "2 seconds",
      },
      {
        id: "define_roles",
        title: "Define Roles",
        description: "Create custom roles with granular permissions",
        status: "pending",
        requiresConfirmation: true,
        duration: "3 seconds",
      },
      {
        id: "invite_members",
        title: "Invite Team Members",
        description: "Send invitations to team",
        status: "pending",
        requiresConfirmation: true,
        duration: "1-2 seconds",
      },
      {
        id: "setup_webhooks",
        title: "Setup Webhooks",
        description: "Configure event-driven automation",
        status: "pending",
        requiresConfirmation: false,
        duration: "2 seconds",
      },
    ],
  },
};

export class AutoWorkflowEngine {
  private currentWorkflow: Workflow | null = null;
  private isPaused = false;
  private currentMode: WorkflowMode = "auto";
  private stepIndex = 0;
  private progressInterval: NodeJS.Timeout | null = null;

  /**
   * Start a workflow
   */
  startWorkflow(workflowId: string, mode: WorkflowMode = "auto"): Workflow {
    const definition = WORKFLOW_DEFINITIONS[workflowId];
    if (!definition) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    this.currentWorkflow = {
      id: definition.id,
      name: definition.name,
      description: definition.description,
      mode,
      steps: definition.steps,
      currentStepIndex: 0,
      progress: 0,
      startedAt: new Date(),
      estimatedCompletionTime: this.estimateCompletionTime(definition.steps),
      canSwitchMode: mode !== "manual",
    };

    this.currentMode = mode;
    this.stepIndex = 0;
    this.isPaused = false;

    // Auto-advance if in auto mode
    if (mode === "auto") {
      this.autoAdvanceWorkflow();
    }

    return this.currentWorkflow;
  }

  /**
   * Get current workflow state
   */
  getWorkflow(): Workflow | null {
    return this.currentWorkflow;
  }

  /**
   * Advance to next step
   */
  nextStep(): void {
    if (!this.currentWorkflow) return;

    if (this.stepIndex < this.currentWorkflow.steps.length - 1) {
      this.stepIndex++;
      this.currentWorkflow.currentStepIndex = this.stepIndex;
      this.updateProgress();

      if (this.currentMode === "auto") {
        this.autoAdvanceWorkflow();
      }
    } else {
      this.completeWorkflow();
    }
  }

  /**
   * Confirm current step
   */
  confirmStep(): void {
    if (!this.currentWorkflow) return;

    const step = this.currentWorkflow.steps[this.stepIndex];
    if (step) {
      step.status = "completed";
      this.nextStep();
    }
  }

  /**
   * Switch workflow mode
   */
  switchMode(newMode: WorkflowMode): void {
    if (!this.currentWorkflow || !this.currentWorkflow.canSwitchMode) return;

    this.currentMode = newMode;
    this.currentWorkflow.mode = newMode;

    if (newMode === "auto") {
      this.autoAdvanceWorkflow();
    }
  }

  /**
   * Pause workflow
   */
  pause(): void {
    this.isPaused = true;
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }

  /**
   * Resume workflow
   */
  resume(): void {
    this.isPaused = false;
    if (this.currentMode === "auto") {
      this.autoAdvanceWorkflow();
    }
  }

  /**
   * Cancel workflow
   */
  cancel(): void {
    this.currentWorkflow = null;
    this.stepIndex = 0;
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
  }

  /**
   * Auto-advance workflow in auto mode
   */
  private autoAdvanceWorkflow(): void {
    if (!this.currentWorkflow || this.isPaused) return;

    const step = this.currentWorkflow.steps[this.stepIndex];
    if (!step) return;

    step.status = "in-progress";

    // Simulate step execution
    const duration = this.parseDuration(step.duration || "2 seconds");
    setTimeout(() => {
      if (this.currentWorkflow && !this.isPaused) {
        step.status = "completed";
        this.nextStep();
      }
    }, duration);
  }

  /**
   * Update progress percentage
   */
  private updateProgress(): void {
    if (!this.currentWorkflow) return;
    this.currentWorkflow.progress = Math.round(
      ((this.stepIndex + 1) / this.currentWorkflow.steps.length) * 100
    );
  }

  /**
   * Complete workflow
   */
  private completeWorkflow(): void {
    if (!this.currentWorkflow) return;
    this.currentWorkflow.progress = 100;
    // Keep workflow visible but mark as complete
  }

  /**
   * Estimate completion time
   */
  private estimateCompletionTime(steps: WorkflowStep[]): string {
    const totalSeconds = steps.reduce((sum, step) => {
      const duration = this.parseDuration(step.duration || "2 seconds");
      return sum + duration;
    }, 0);

    const minutes = Math.ceil(totalSeconds / 1000 / 60);
    if (minutes === 1) return "~1 minute";
    return `~${minutes} minutes`;
  }

  /**
   * Parse duration string like "2 seconds" or "3-5 seconds"
   */
  private parseDuration(durationStr: string): number {
    const match = durationStr.match(/(\d+)/);
    const seconds = match ? parseInt(match[1]) : 2;
    return seconds * 1000;
  }
}

// Singleton instance
let engineInstance: AutoWorkflowEngine | null = null;

export function getWorkflowEngine(): AutoWorkflowEngine {
  if (!engineInstance) {
    engineInstance = new AutoWorkflowEngine();
  }
  return engineInstance;
}

// Export available workflows
export function getAvailableWorkflows(): Array<{
  id: string;
  name: string;
  description: string;
}> {
  return Object.values(WORKFLOW_DEFINITIONS).map((def) => ({
    id: def.id,
    name: def.name,
    description: def.description,
  }));
}
